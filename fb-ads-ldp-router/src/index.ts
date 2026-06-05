/**
 * FB Ads Dynamic LDP Router
 * ----------------------------------------------------------------------------
 * 1 link quảng cáo (giữ nguyên 1 post FB) -> tự xoay 5–10 landing page.
 * Tự đo CR từng LDP và tự dồn traffic về LDP thắng bằng multi-armed bandit
 * (Thompson Sampling). Chạy trên Cloudflare Workers + D1.
 *
 * Endpoints:
 *   GET  /r/:campaign            Link để dán vào quảng cáo FB. Chọn LDP -> 302 redirect.
 *   GET  /c/:campaign            Pixel/postback ghi nhận chuyển đổi (1x1 gif).
 *   POST /c/:campaign            Ghi nhận chuyển đổi qua JSON (server-side, kèm revenue).
 *   GET  /stats/:campaign        Báo cáo CR từng LDP, JSON (?token=ADMIN_TOKEN).
 *   GET  /dashboard/:campaign    Dashboard HTML trực quan (?token=ADMIN_TOKEN).
 *   POST /admin/campaigns        Tạo/cập nhật campaign + danh sách LDP (Bearer ADMIN_TOKEN).
 *   GET  /healthz                Health check.
 */

export interface Env {
  DB: D1Database;
  ADMIN_TOKEN?: string;
  DEFAULT_UTM_SOURCE?: string;
}

interface Campaign {
  id: string;
  name: string | null;
  mode: 'even' | 'weighted' | 'bandit';
  utm_source: string | null;
  min_explore: number;
  sticky: number;
  active: number;
}

interface Variant {
  campaign_id: string;
  variant_id: string;
  label: string | null;
  url: string;
  weight: number;
  active: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

const GIF_1x1 = Uint8Array.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
  0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00,
  0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02,
  0x44, 0x01, 0x00, 0x3b,
]);

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean);

    try {
      if (parts.length === 0 || url.pathname === '/healthz') {
        return json({ ok: true, service: 'ldp-router' });
      }

      const [root, campaignId] = parts;

      if (root === 'r' && campaignId) return handleRedirect(req, env, ctx, campaignId);
      if (root === 'c' && campaignId) return handleConversion(req, env, ctx, campaignId);
      if (root === 'stats' && campaignId) return handleStats(req, env, campaignId);
      if (root === 'dashboard' && campaignId) return handleDashboard(req, env, campaignId);
      if (root === 'admin' && parts[1] === 'campaigns') return handleAdminUpsert(req, env);

      return json({ error: 'not_found' }, 404);
    } catch (err: any) {
      return json({ error: 'internal', detail: String(err?.message || err) }, 500);
    }
  },
};

/* ------------------------------------------------------------------ */
/*  /r/:campaign  — chọn LDP và redirect                               */
/* ------------------------------------------------------------------ */
async function handleRedirect(
  req: Request,
  env: Env,
  ctx: ExecutionContext,
  campaignId: string,
): Promise<Response> {
  const campaign = await getCampaign(env, campaignId);
  if (!campaign || !campaign.active) return json({ error: 'campaign_not_found' }, 404);

  const variants = await getActiveVariants(env, campaignId);
  if (variants.length === 0) return json({ error: 'no_active_variants' }, 404);

  const cookies = parseCookies(req.headers.get('Cookie'));
  const url = new URL(req.url);

  // Sticky: nếu người này đã được gán LDP trước đó -> giữ nguyên (đo chuẩn, đúng policy).
  let chosen: Variant | undefined;
  let cid = cookies[`_cid_${campaignId}`];
  const stickyVid = cookies[`_ldp_${campaignId}`];
  if (campaign.sticky && stickyVid) {
    chosen = variants.find((v) => v.variant_id === stickyVid);
  }

  const isNewAssignment = !chosen;
  if (!chosen) chosen = pickVariant(variants, campaign);
  if (!cid) cid = crypto.randomUUID();

  // Build link đích: giữ lại mọi query gốc (fbclid...) + thêm UTM + cid để gán chuyển đổi.
  const fbclid = url.searchParams.get('fbclid') || '';
  const target = buildTargetUrl(chosen.url, url.searchParams, {
    utm_source: campaign.utm_source || env.DEFAULT_UTM_SOURCE || 'facebook',
    utm_medium: 'cpc',
    utm_campaign: campaignId,
    utm_content: chosen.variant_id,
    cid,
  });

  // Ghi log + tăng click (async, không chặn redirect).
  if (isNewAssignment) {
    ctx.waitUntil(recordClick(env, campaignId, chosen.variant_id, cid, fbclid));
  }

  const headers = new Headers({ Location: target, 'Cache-Control': 'no-store' });
  // Cookie trên domain router -> conversion pixel (third-party) đọc lại được.
  appendCookie(headers, `_ldp_${campaignId}`, chosen.variant_id);
  appendCookie(headers, `_cid_${campaignId}`, cid);
  return new Response(null, { status: 302, headers });
}

/* ------------------------------------------------------------------ */
/*  /c/:campaign  — ghi nhận chuyển đổi                                */
/* ------------------------------------------------------------------ */
async function handleConversion(
  req: Request,
  env: Env,
  ctx: ExecutionContext,
  campaignId: string,
): Promise<Response> {
  const url = new URL(req.url);
  const cookies = parseCookies(req.headers.get('Cookie'));

  let cid = url.searchParams.get('cid') || cookies[`_cid_${campaignId}`] || '';
  let vid = url.searchParams.get('v') || cookies[`_ldp_${campaignId}`] || '';
  let revenue = parseFloat(url.searchParams.get('revenue') || '0') || 0;

  if (req.method === 'POST') {
    const body = await req.json<any>().catch(() => ({}));
    cid = body.cid || cid;
    vid = body.variant_id || vid;
    if (typeof body.revenue === 'number') revenue = body.revenue;
  }

  ctx.waitUntil(recordConversion(env, campaignId, cid, vid, revenue));

  // Trả về gif 1x1 cho pixel <img>, hoặc JSON cho gọi server-side.
  if (req.method === 'POST') return json({ ok: true });
  return new Response(GIF_1x1, {
    headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' },
  });
}

/* ------------------------------------------------------------------ */
/*  /stats/:campaign  — báo cáo                                        */
/* ------------------------------------------------------------------ */
interface StatRow {
  variant_id: string;
  label: string | null;
  url: string;
  active: boolean;
  clicks: number;
  conversions: number;
  cr: number;
  cr_pct: number;
  revenue: number;
  traffic_share_pct: number;
}

interface Stats {
  campaign: { id: string; name: string | null; mode: string; min_explore: number };
  total_clicks: number;
  total_conversions: number;
  winner: StatRow | null;
  note: string;
  variants: StatRow[];
}

async function computeStats(env: Env, campaignId: string): Promise<Stats | null> {
  const campaign = await getCampaign(env, campaignId);
  if (!campaign) return null;

  const variants = await getAllVariants(env, campaignId);
  const totalClicks = variants.reduce((s, v) => s + v.clicks, 0);

  const rows: StatRow[] = variants
    .map((v) => {
      const cr = v.clicks > 0 ? v.conversions / v.clicks : 0;
      return {
        variant_id: v.variant_id,
        label: v.label,
        url: v.url,
        active: !!v.active,
        clicks: v.clicks,
        conversions: v.conversions,
        cr: round(cr, 4),
        cr_pct: round(cr * 100, 2),
        revenue: round(v.revenue, 2),
        traffic_share_pct: totalClicks ? round((v.clicks / totalClicks) * 100, 1) : 0,
      };
    })
    .sort((a, b) => b.cr - a.cr);

  const ranked = rows.filter((r) => r.active && r.clicks >= campaign.min_explore);
  const winner = ranked.length ? ranked[0] : null;

  return {
    campaign: { id: campaign.id, name: campaign.name, mode: campaign.mode, min_explore: campaign.min_explore },
    total_clicks: totalClicks,
    total_conversions: variants.reduce((s, v) => s + v.conversions, 0),
    winner,
    note: winner
      ? `LDP tốt nhất hiện tại: ${winner.variant_id} (CR ${winner.cr_pct}%).`
      : 'Chưa đủ dữ liệu để chốt (cần mỗi LDP đạt min_explore click).',
    variants: rows,
  };
}

async function handleStats(req: Request, env: Env, campaignId: string): Promise<Response> {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') || bearer(req);
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) return json({ error: 'unauthorized' }, 401);

  const stats = await computeStats(env, campaignId);
  if (!stats) return json({ error: 'campaign_not_found' }, 404);
  return json(stats);
}

/* ------------------------------------------------------------------ */
/*  /dashboard/:campaign  — báo cáo HTML trực quan                     */
/* ------------------------------------------------------------------ */
async function handleDashboard(req: Request, env: Env, campaignId: string): Promise<Response> {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') || bearer(req);
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return html(loginPage(campaignId), 401);
  }
  const stats = await computeStats(env, campaignId);
  if (!stats) return html(`<p style="color:#fff;font-family:sans-serif">campaign_not_found</p>`, 404);
  return html(dashboardPage(stats, token));
}

function dashboardPage(s: Stats, token: string): string {
  const best = s.variants.reduce((m, v) => Math.max(m, v.cr_pct), 0) || 1;
  const winId = s.winner?.variant_id;

  const cards = s.variants
    .map((v) => {
      const isWin = v.variant_id === winId;
      const crBar = Math.min(100, (v.cr_pct / best) * 100);
      const color = isWin ? '#22c55e' : v.active ? '#3b82f6' : '#6b7280';
      return `
      <tr class="${isWin ? 'win' : ''} ${v.active ? '' : 'off'}">
        <td>
          <div class="vid">${esc(v.variant_id)} ${isWin ? '<span class="badge">🏆 WIN</span>' : ''} ${v.active ? '' : '<span class="badge off">tắt</span>'}</div>
          <div class="label">${esc(v.label ?? '')}</div>
          <a class="url" href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.url)}</a>
        </td>
        <td class="num">${v.clicks.toLocaleString()}</td>
        <td class="num">${v.conversions.toLocaleString()}</td>
        <td class="num strong" style="color:${color}">${v.cr_pct}%</td>
        <td class="barcell">
          <div class="bar"><span style="width:${crBar}%;background:${color}"></span></div>
        </td>
        <td class="num">${v.traffic_share_pct}%</td>
        <td class="num">${v.revenue ? v.revenue.toLocaleString() : '-'}</td>
      </tr>`;
    })
    .join('');

  return `<!doctype html><html lang="vi"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="20">
<title>LDP A/B • ${esc(s.campaign.id)}</title>
<style>
  :root{color-scheme:dark}
  *{box-sizing:border-box}
  body{margin:0;background:#0b0f17;color:#e5e7eb;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  .wrap{max-width:980px;margin:0 auto;padding:24px 16px 48px}
  h1{font-size:20px;margin:0 0 2px} .sub{color:#94a3b8;font-size:13px;margin-bottom:20px}
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}
  .kpi{background:#111827;border:1px solid #1f2937;border-radius:12px;padding:14px}
  .kpi .v{font-size:22px;font-weight:700} .kpi .k{color:#94a3b8;font-size:12px;margin-top:2px}
  .note{background:#0f1d12;border:1px solid #1d4a2a;color:#86efac;border-radius:12px;padding:12px 14px;font-size:14px;margin-bottom:18px}
  .note.wait{background:#1d1a0f;border-color:#4a3f1d;color:#fde68a}
  table{width:100%;border-collapse:collapse;background:#111827;border:1px solid #1f2937;border-radius:12px;overflow:hidden}
  th,td{padding:12px 12px;text-align:left;border-bottom:1px solid #1f2937;font-size:14px;vertical-align:top}
  th{color:#94a3b8;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
  td.num{text-align:right;white-space:nowrap} td.strong{font-weight:700}
  tr.win td{background:#0e1a10} tr.off{opacity:.5}
  .vid{font-weight:700;font-size:15px} .label{color:#94a3b8;font-size:12px;margin:2px 0}
  .url{color:#60a5fa;font-size:11px;text-decoration:none;word-break:break-all} .url:hover{text-decoration:underline}
  .badge{font-size:10px;background:#14532d;color:#86efac;padding:2px 6px;border-radius:6px;vertical-align:middle}
  .badge.off{background:#374151;color:#cbd5e1}
  .barcell{width:160px} .bar{background:#1f2937;border-radius:6px;height:10px;overflow:hidden}
  .bar span{display:block;height:100%;border-radius:6px}
  .foot{color:#64748b;font-size:12px;margin-top:16px}
  .foot code{background:#111827;padding:2px 6px;border-radius:6px;border:1px solid #1f2937}
</style></head><body><div class="wrap">
  <h1>🎯 ${esc(s.campaign.name ?? s.campaign.id)}</h1>
  <div class="sub">campaign <code>${esc(s.campaign.id)}</code> • chế độ <b>${esc(s.campaign.mode)}</b> • min_explore ${s.campaign.min_explore} • tự refresh 20s</div>

  <div class="kpis">
    <div class="kpi"><div class="v">${s.total_clicks.toLocaleString()}</div><div class="k">Tổng click</div></div>
    <div class="kpi"><div class="v">${s.total_conversions.toLocaleString()}</div><div class="k">Tổng chuyển đổi</div></div>
    <div class="kpi"><div class="v">${s.total_clicks ? round((s.total_conversions / s.total_clicks) * 100, 2) : 0}%</div><div class="k">CR trung bình</div></div>
    <div class="kpi"><div class="v">${s.winner ? esc(s.winner.variant_id) : '—'}</div><div class="k">LDP thắng</div></div>
  </div>

  <div class="note ${s.winner ? '' : 'wait'}">${esc(s.note)}</div>

  <table>
    <thead><tr>
      <th>Landing page</th><th class="num">Click</th><th class="num">Conv</th>
      <th class="num">CR</th><th>CR (bar)</th><th class="num">% traffic</th><th class="num">Doanh thu</th>
    </tr></thead>
    <tbody>${cards || '<tr><td colspan="7" style="color:#94a3b8">Chưa có LDP nào</td></tr>'}</tbody>
  </table>

  <div class="foot">JSON: <code>/stats/${esc(s.campaign.id)}?token=…</code> • Link quảng cáo: <code>/r/${esc(s.campaign.id)}</code></div>
</div></body></html>`;
}

function loginPage(campaignId: string): string {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Đăng nhập</title>
<style>body{margin:0;background:#0b0f17;color:#e5e7eb;font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh}
.box{background:#111827;border:1px solid #1f2937;border-radius:12px;padding:24px;width:320px;max-width:90vw}
input{width:100%;padding:10px;margin:10px 0;border-radius:8px;border:1px solid #374151;background:#0b0f17;color:#fff}
button{width:100%;padding:10px;border:0;border-radius:8px;background:#3b82f6;color:#fff;font-weight:600;cursor:pointer}
h2{margin:0 0 4px;font-size:18px}.s{color:#94a3b8;font-size:13px}</style></head><body>
<form class="box" onsubmit="location.href='/dashboard/${esc(campaignId)}?token='+encodeURIComponent(t.value);return false">
<h2>🔒 Dashboard A/B</h2><div class="s">Nhập ADMIN_TOKEN để xem campaign <b>${esc(campaignId)}</b></div>
<input id="t" type="password" placeholder="ADMIN_TOKEN" autofocus><button>Xem báo cáo</button></form></body></html>`;
}

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/* ------------------------------------------------------------------ */
/*  POST /admin/campaigns  — tạo/cập nhật campaign + LDP               */
/* ------------------------------------------------------------------ */
async function handleAdminUpsert(req: Request, env: Env): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!env.ADMIN_TOKEN || bearer(req) !== env.ADMIN_TOKEN) return json({ error: 'unauthorized' }, 401);

  const body = await req.json<any>().catch(() => null);
  if (!body?.id || !Array.isArray(body.variants)) {
    return json({ error: 'bad_request', hint: 'cần {id, variants:[{variant_id,url,...}]}' }, 400);
  }

  const stmts: D1PreparedStatement[] = [];
  stmts.push(
    env.DB.prepare(
      `INSERT INTO campaigns (id, name, mode, utm_source, min_explore, sticky, active)
       VALUES (?, ?, ?, ?, ?, ?, 1)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name, mode=excluded.mode, utm_source=excluded.utm_source,
         min_explore=excluded.min_explore, sticky=excluded.sticky, active=1`,
    ).bind(
      body.id,
      body.name ?? body.id,
      body.mode ?? 'bandit',
      body.utm_source ?? 'facebook',
      Number(body.min_explore ?? 30),
      body.sticky === false ? 0 : 1,
    ),
  );

  for (const v of body.variants) {
    if (!v.variant_id || !v.url) continue;
    stmts.push(
      env.DB.prepare(
        `INSERT INTO variants (campaign_id, variant_id, label, url, weight, active)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(campaign_id, variant_id) DO UPDATE SET
           label=excluded.label, url=excluded.url, weight=excluded.weight, active=excluded.active`,
      ).bind(body.id, v.variant_id, v.label ?? null, v.url, Number(v.weight ?? 1), v.active === false ? 0 : 1),
    );
  }

  await env.DB.batch(stmts);
  return json({ ok: true, campaign: body.id, variants: body.variants.length });
}

/* ------------------------------------------------------------------ */
/*  Bandit / chọn LDP                                                  */
/* ------------------------------------------------------------------ */
function pickVariant(variants: Variant[], campaign: Campaign): Variant {
  if (campaign.mode === 'even') {
    return variants[Math.floor(Math.random() * variants.length)];
  }

  if (campaign.mode === 'weighted') {
    const total = variants.reduce((s, v) => s + Math.max(0, v.weight), 0) || 1;
    let r = Math.random() * total;
    for (const v of variants) {
      r -= Math.max(0, v.weight);
      if (r <= 0) return v;
    }
    return variants[variants.length - 1];
  }

  // mode === 'bandit' (Thompson Sampling trên Beta)
  // Giai đoạn khám phá: LDP nào chưa đủ min_explore click thì ưu tiên cào bằng.
  const underExplored = variants.filter((v) => v.clicks < campaign.min_explore);
  if (underExplored.length) {
    return underExplored[Math.floor(Math.random() * underExplored.length)];
  }

  // Giai đoạn khai thác: lấy mẫu Beta(conv+1, fail+1), chọn LDP có điểm cao nhất.
  let best = variants[0];
  let bestScore = -1;
  for (const v of variants) {
    const score = sampleBeta(v.conversions + 1, v.clicks - v.conversions + 1);
    if (score > bestScore) {
      bestScore = score;
      best = v;
    }
  }
  return best;
}

// Beta(a,b) = Gamma(a) / (Gamma(a)+Gamma(b))
function sampleBeta(a: number, b: number): number {
  const x = sampleGamma(a);
  const y = sampleGamma(b);
  return x / (x + y);
}

// Marsaglia–Tsang sampler cho Gamma(shape k, scale 1).
function sampleGamma(k: number): number {
  if (k < 1) {
    const u = Math.random();
    return sampleGamma(1 + k) * Math.pow(u, 1 / k);
  }
  const d = k - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x: number, v: number;
    do {
      x = gaussian();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function gaussian(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ------------------------------------------------------------------ */
/*  D1 helpers                                                         */
/* ------------------------------------------------------------------ */
async function getCampaign(env: Env, id: string): Promise<Campaign | null> {
  return env.DB.prepare('SELECT * FROM campaigns WHERE id = ?').bind(id).first<Campaign>();
}

async function getActiveVariants(env: Env, campaignId: string): Promise<Variant[]> {
  const res = await env.DB.prepare(
    'SELECT * FROM variants WHERE campaign_id = ? AND active = 1',
  )
    .bind(campaignId)
    .all<Variant>();
  return res.results ?? [];
}

async function getAllVariants(env: Env, campaignId: string): Promise<Variant[]> {
  const res = await env.DB.prepare('SELECT * FROM variants WHERE campaign_id = ?')
    .bind(campaignId)
    .all<Variant>();
  return res.results ?? [];
}

async function recordClick(
  env: Env,
  campaignId: string,
  variantId: string,
  cid: string,
  fbclid: string,
): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(
      'INSERT OR IGNORE INTO clicks (cid, campaign_id, variant_id, fbclid) VALUES (?, ?, ?, ?)',
    ).bind(cid, campaignId, variantId, fbclid || null),
    env.DB.prepare(
      'UPDATE variants SET clicks = clicks + 1 WHERE campaign_id = ? AND variant_id = ?',
    ).bind(campaignId, variantId),
  ]);
}

async function recordConversion(
  env: Env,
  campaignId: string,
  cid: string,
  vid: string,
  revenue: number,
): Promise<void> {
  // Ưu tiên gán theo cid (chống đếm trùng: 1 click chỉ tính 1 conversion).
  if (cid) {
    const click = await env.DB.prepare(
      'SELECT variant_id, converted FROM clicks WHERE cid = ? AND campaign_id = ?',
    )
      .bind(cid, campaignId)
      .first<{ variant_id: string; converted: number }>();
    if (click && !click.converted) {
      await env.DB.batch([
        env.DB.prepare('UPDATE clicks SET converted = 1, revenue = ? WHERE cid = ?').bind(revenue, cid),
        env.DB.prepare(
          'UPDATE variants SET conversions = conversions + 1, revenue = revenue + ? WHERE campaign_id = ? AND variant_id = ?',
        ).bind(revenue, campaignId, click.variant_id),
      ]);
      return;
    }
    if (click && click.converted) return; // đã tính rồi
  }

  // Fallback: không có cid hợp lệ nhưng biết variant (kém chính xác hơn, có thể đếm trùng).
  if (vid) {
    await env.DB.prepare(
      'UPDATE variants SET conversions = conversions + 1, revenue = revenue + ? WHERE campaign_id = ? AND variant_id = ?',
    )
      .bind(revenue, campaignId, vid)
      .run();
  }
}

/* ------------------------------------------------------------------ */
/*  Utils                                                              */
/* ------------------------------------------------------------------ */
function buildTargetUrl(
  base: string,
  incoming: URLSearchParams,
  extra: Record<string, string>,
): string {
  const u = new URL(base);
  // Giữ lại param gốc từ click (fbclid, ref...) trừ những cái ta tự set.
  incoming.forEach((val, key) => {
    if (!(key in extra)) u.searchParams.set(key, val);
  });
  for (const [k, v] of Object.entries(extra)) u.searchParams.set(k, v);
  return u.toString();
}

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function appendCookie(headers: Headers, name: string, value: string): void {
  // SameSite=None;Secure -> gửi được cả khi pixel chạy third-party trên trang Ladipage.
  headers.append(
    'Set-Cookie',
    `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=2592000; Secure; SameSite=None; HttpOnly`,
  );
}

function bearer(req: Request): string {
  const h = req.headers.get('Authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7) : '';
}

function round(n: number, d: number): number {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
