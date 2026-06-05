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
 *   GET  /stats/:campaign        Báo cáo CR từng LDP (?token=ADMIN_TOKEN).
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
async function handleStats(req: Request, env: Env, campaignId: string): Promise<Response> {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') || bearer(req);
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) return json({ error: 'unauthorized' }, 401);

  const campaign = await getCampaign(env, campaignId);
  if (!campaign) return json({ error: 'campaign_not_found' }, 404);

  const variants = await getAllVariants(env, campaignId);
  const totalClicks = variants.reduce((s, v) => s + v.clicks, 0);

  const rows = variants
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

  return json({
    campaign: { id: campaign.id, name: campaign.name, mode: campaign.mode, min_explore: campaign.min_explore },
    total_clicks: totalClicks,
    total_conversions: variants.reduce((s, v) => s + v.conversions, 0),
    winner,
    note: winner
      ? `LDP tốt nhất hiện tại: ${winner.variant_id} (CR ${winner.cr_pct}%).`
      : 'Chưa đủ dữ liệu để chốt (cần mỗi LDP đạt min_explore click).',
    variants: rows,
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
