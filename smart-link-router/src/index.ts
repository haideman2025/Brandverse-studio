// =====================================================================
// Smart Link Router — Cloudflare Worker
//
// 1 link duy nhất trong quảng cáo Facebook  ->  tự xoay 5-10 landing page
// (Ladipage), gắn UTM, đo click + conversion, và TỰ TỐI ƯU dồn traffic về
// LDP có tỉ lệ chuyển đổi tốt nhất. Bài quảng cáo KHÔNG bị đụng vào nên
// giữ nguyên like/comment/share.
//
// Các route:
//   GET  /go/:slug          -> redirect khách sang 1 LDP (dán link NÀY vào FB ad)
//   GET  /px/:slug.gif      -> beacon ảnh 1x1 để LDP báo conversion (cách đơn giản)
//   POST /api/convert       -> webhook báo conversion (form/đơn hàng từ Ladipage)
//   GET  /api/stats/:slug   -> số liệu JSON (CR từng LDP + đề xuất winner)
//   GET  /dash/:slug        -> dashboard HTML xem trực quan
//   POST /api/links         -> (admin) tạo/cập nhật link + danh sách URL LDP
//   GET  /api/links/:slug   -> (admin) xem cấu hình link
//   GET  /                  -> trang trợ giúp
// =====================================================================

import { pickVariant, summarize, type LinkConfig, type VariantStat } from './bandit';
import { renderDashboard } from './dashboard';

export interface Env {
  DB: D1Database;
  DEFAULT_CURRENCY: string;
  FB_GRAPH_VERSION: string;
  ADMIN_TOKEN?: string;
  META_PIXEL_ID?: string;
  META_CAPI_TOKEN?: string;
}

const COOKIE = 'slr_vid';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 ngày

// 1x1 GIF trong suốt.
const PIXEL_GIF = Uint8Array.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
  0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
]);

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const method = req.method.toUpperCase();

    try {
      // --- Redirect (link chính trong quảng cáo) ---
      const goMatch = path.match(/^\/go\/([A-Za-z0-9_-]+)$/);
      if (method === 'GET' && goMatch) {
        return handleRedirect(req, env, ctx, goMatch[1], url);
      }

      // --- Pixel beacon báo conversion (GET ảnh) ---
      const pxMatch = path.match(/^\/px\/([A-Za-z0-9_-]+)\.gif$/);
      if (method === 'GET' && pxMatch) {
        return handlePixelConversion(req, env, ctx, pxMatch[1], url);
      }

      // --- Webhook báo conversion (POST JSON) ---
      if (method === 'POST' && path === '/api/convert') {
        return handleConvert(req, env, ctx);
      }

      // --- Stats JSON ---
      const statMatch = path.match(/^\/api\/stats\/([A-Za-z0-9_-]+)$/);
      if (method === 'GET' && statMatch) {
        return handleStats(env, statMatch[1]);
      }

      // --- Dashboard HTML ---
      const dashMatch = path.match(/^\/dash\/([A-Za-z0-9_-]+)$/);
      if (method === 'GET' && dashMatch) {
        return handleDashboard(req, env, dashMatch[1]);
      }

      // --- Admin: tạo/cập nhật link ---
      if (method === 'POST' && path === '/api/links') {
        return handleUpsertLink(req, env);
      }
      const linkMatch = path.match(/^\/api\/links\/([A-Za-z0-9_-]+)$/);
      if (method === 'GET' && linkMatch) {
        return handleGetLink(req, env, linkMatch[1]);
      }

      if (path === '/' || path === '/health') {
        return new Response(HELP_TEXT, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
      }

      return json({ error: 'not_found', path }, 404);
    } catch (err) {
      return json({ error: 'internal', message: String((err as Error)?.message || err) }, 500);
    }
  },
};

// =====================================================================
// REDIRECT
// =====================================================================

async function handleRedirect(
  req: Request,
  env: Env,
  ctx: ExecutionContext,
  slug: string,
  url: URL,
): Promise<Response> {
  const cfg = await getLinkConfig(env, slug);
  if (!cfg || cfg.active !== 1) {
    return new Response('Link không tồn tại hoặc đã tắt.', { status: 404 });
  }

  const variants = await getVariants(env, slug);
  if (variants.filter((v) => v.active === 1).length === 0) {
    return new Response('Link chưa có landing page nào đang bật.', { status: 503 });
  }

  // vid: định danh khách trong cookie (sticky).
  let vid = readCookie(req, COOKIE);
  const isNew = !vid;
  if (!vid) vid = crypto.randomUUID();

  const fbclid = url.searchParams.get('fbclid') || undefined;

  // Đã từng vào slug này -> giữ nguyên LDP cũ (sticky), không tính click mới.
  let chosen: VariantStat | undefined;
  let reused = false;
  const existing = await env.DB.prepare(
    'SELECT variant_id FROM assignments WHERE vid = ? AND slug = ?',
  )
    .bind(vid, slug)
    .first<{ variant_id: string }>();

  if (existing) {
    chosen = variants.find((v) => v.id === existing.variant_id && v.active === 1);
    reused = !!chosen;
  }

  if (!chosen) {
    chosen = pickVariant(cfg, variants);
    // Ghi gán + tăng click + log (chạy nền để redirect nhanh).
    ctx.waitUntil(recordAssignment(env, vid, slug, chosen.id, fbclid));
  }

  const dest = buildDestUrl(chosen.url, { slug, variantId: chosen.id, vid, url });

  const headers = new Headers({ Location: dest, 'cache-control': 'no-store' });
  if (isNew || !reused) {
    headers.append('Set-Cookie', cookieHeader(COOKIE, vid));
  }
  return new Response(null, { status: 302, headers });
}

async function recordAssignment(
  env: Env,
  vid: string,
  slug: string,
  variantId: string,
  fbclid?: string,
): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO assignments (vid, slug, variant_id, fbclid)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(vid, slug) DO UPDATE SET variant_id = excluded.variant_id`,
    ).bind(vid, slug, variantId, fbclid ?? null),
    env.DB.prepare('UPDATE variants SET clicks = clicks + 1 WHERE id = ?').bind(variantId),
    env.DB.prepare(
      `INSERT INTO events (slug, variant_id, vid, type, meta)
       VALUES (?, ?, ?, 'click', ?)`,
    ).bind(slug, variantId, vid, fbclid ? JSON.stringify({ fbclid }) : null),
  ]);
}

function buildDestUrl(
  base: string,
  args: { slug: string; variantId: string; vid: string; url: URL },
): string {
  let dest: URL;
  try {
    dest = new URL(base);
  } catch {
    return base;
  }
  // Truyền tiếp các tham số tracking sẵn có của Facebook (fbclid...).
  for (const [k, v] of args.url.searchParams) {
    if (!dest.searchParams.has(k)) dest.searchParams.set(k, v);
  }
  // Gắn UTM để biết khách đến từ LDP nào + vid để LDP báo conversion ngược lại.
  dest.searchParams.set('utm_source', dest.searchParams.get('utm_source') || 'facebook');
  dest.searchParams.set('utm_medium', dest.searchParams.get('utm_medium') || 'paid');
  dest.searchParams.set('utm_campaign', args.slug);
  dest.searchParams.set('utm_content', args.variantId);
  dest.searchParams.set('slr_vid', args.vid);
  dest.searchParams.set('slr_slug', args.slug);
  return dest.toString();
}

// =====================================================================
// CONVERSION
// =====================================================================

async function handleConvert(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  let body: Record<string, unknown> = {};
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  } else {
    const form = await req.formData().catch(() => null);
    if (form) for (const [k, v] of form) body[k] = v;
  }

  const slug = String(body.slug || body.slr_slug || '');
  const vid = String(body.vid || body.slr_vid || readCookie(req, COOKIE) || '');
  const value = num(body.value);
  const eventName = body.event ? String(body.event) : undefined;

  const result = await recordConversion(env, ctx, { slug, vid, value, eventName, req, body });
  const status = result.ok ? 200 : 400;
  return json(result, status, corsHeaders(req));
}

async function handlePixelConversion(
  req: Request,
  env: Env,
  ctx: ExecutionContext,
  slug: string,
  url: URL,
): Promise<Response> {
  const vid = url.searchParams.get('vid') || url.searchParams.get('slr_vid') || readCookie(req, COOKIE) || '';
  const value = num(url.searchParams.get('value'));
  const eventName = url.searchParams.get('event') || undefined;
  ctx.waitUntil(
    recordConversion(env, ctx, { slug, vid, value, eventName, req, body: {} }).then(() => undefined),
  );
  return new Response(PIXEL_GIF, {
    headers: {
      'content-type': 'image/gif',
      'cache-control': 'no-store, no-cache, must-revalidate',
    },
  });
}

async function recordConversion(
  env: Env,
  ctx: ExecutionContext,
  p: {
    slug: string;
    vid: string;
    value: number;
    eventName?: string;
    req: Request;
    body: Record<string, unknown>;
  },
): Promise<{ ok: boolean; reason?: string; variant_id?: string; deduped?: boolean }> {
  if (!p.slug || !p.vid) return { ok: false, reason: 'missing_slug_or_vid' };

  const assign = await env.DB.prepare(
    'SELECT variant_id, converted, fbclid FROM assignments WHERE vid = ? AND slug = ?',
  )
    .bind(p.vid, p.slug)
    .first<{ variant_id: string; converted: number; fbclid: string | null }>();

  if (!assign) return { ok: false, reason: 'no_assignment_for_vid' };

  // Chống đếm trùng: 1 khách chỉ tính 1 conversion cho mỗi link.
  if (assign.converted === 1) {
    return { ok: true, deduped: true, variant_id: assign.variant_id };
  }

  await env.DB.batch([
    env.DB.prepare('UPDATE assignments SET converted = 1 WHERE vid = ? AND slug = ?').bind(
      p.vid,
      p.slug,
    ),
    env.DB.prepare(
      'UPDATE variants SET conversions = conversions + 1, revenue = revenue + ? WHERE id = ?',
    ).bind(p.value, assign.variant_id),
    env.DB.prepare(
      `INSERT INTO events (slug, variant_id, vid, type, value, meta)
       VALUES (?, ?, ?, 'conversion', ?, ?)`,
    ).bind(p.slug, assign.variant_id, p.vid, p.value, JSON.stringify({ src: 'webhook' })),
  ]);

  // Bắn về Meta Conversions API (nếu đã cấu hình secret) — chạy nền.
  ctx.waitUntil(
    forwardToMetaCAPI(env, {
      slug: p.slug,
      variantUrl: await variantUrl(env, assign.variant_id),
      value: p.value,
      eventName: p.eventName,
      fbclid: assign.fbclid,
      req: p.req,
      body: p.body,
    }).catch(() => undefined),
  );

  return { ok: true, variant_id: assign.variant_id };
}

// =====================================================================
// META CONVERSIONS API (server-side, song song với Pixel trên LDP)
// =====================================================================

async function forwardToMetaCAPI(
  env: Env,
  p: {
    slug: string;
    variantUrl: string | null;
    value: number;
    eventName?: string;
    fbclid: string | null;
    req: Request;
    body: Record<string, unknown>;
  },
): Promise<void> {
  if (!env.META_PIXEL_ID || !env.META_CAPI_TOKEN) return;

  const link = await getLinkConfig(env, p.slug);
  const eventName = p.eventName || (await defaultEvent(env, p.slug)) || 'Lead';

  const userData: Record<string, unknown> = {};
  // fbc dựng từ fbclid (chuẩn Meta: fb.1.<timestamp_ms>.<fbclid>).
  if (p.fbclid) userData.fbc = `fb.1.${Date.now()}.${p.fbclid}`;
  const ip = p.req.headers.get('cf-connecting-ip');
  const ua = p.req.headers.get('user-agent');
  if (ip) userData.client_ip_address = ip;
  if (ua) userData.client_user_agent = ua;
  // Email/phone nếu LDP có gửi -> hash SHA-256 theo yêu cầu của Meta.
  const em = p.body.email ? await sha256(String(p.body.email).trim().toLowerCase()) : undefined;
  const ph = p.body.phone ? await sha256(normalizePhone(String(p.body.phone))) : undefined;
  if (em) userData.em = [em];
  if (ph) userData.ph = [ph];

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        event_source_url: p.variantUrl || undefined,
        user_data: userData,
        custom_data: {
          value: p.value || 0,
          currency: env.DEFAULT_CURRENCY || 'VND',
          content_name: p.slug,
        },
      },
    ],
  };

  const ver = env.FB_GRAPH_VERSION || 'v21.0';
  const endpoint = `https://graph.facebook.com/${ver}/${env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(
    env.META_CAPI_TOKEN,
  )}`;
  await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  void link;
}

// =====================================================================
// STATS / DASHBOARD
// =====================================================================

async function handleStats(env: Env, slug: string): Promise<Response> {
  const cfg = await getLinkConfig(env, slug);
  if (!cfg) return json({ error: 'not_found' }, 404);
  const variants = await getVariants(env, slug);
  const sum = summarize(variants);
  return json({ slug, mode: cfg.mode, ...sum });
}

async function handleDashboard(req: Request, env: Env, slug: string): Promise<Response> {
  const cfg = await getLinkConfig(env, slug);
  if (!cfg) return new Response('Link không tồn tại.', { status: 404 });
  const variants = await getVariants(env, slug);
  const sum = summarize(variants);
  const origin = new URL(req.url).origin;
  return new Response(renderDashboard(slug, cfg.mode, origin, sum), {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

// =====================================================================
// ADMIN API
// =====================================================================

function checkAdmin(req: Request, env: Env): boolean {
  if (!env.ADMIN_TOKEN) return false;
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  return token === env.ADMIN_TOKEN;
}

async function handleUpsertLink(req: Request, env: Env): Promise<Response> {
  if (!checkAdmin(req, env)) return json({ error: 'unauthorized' }, 401);
  const b = (await req.json().catch(() => null)) as any;
  if (!b || !b.slug || !Array.isArray(b.variants) || b.variants.length === 0) {
    return json(
      { error: 'bad_request', hint: 'cần { slug, variants: [{url, label?}], mode?, epsilon?, min_per_variant? }' },
      400,
    );
  }
  const slug = String(b.slug);
  if (!/^[A-Za-z0-9_-]+$/.test(slug)) return json({ error: 'invalid_slug' }, 400);

  const mode = b.mode === 'manual' ? 'manual' : 'auto';
  const epsilon = clamp(num(b.epsilon, 0.1), 0, 0.9);
  const minPer = Math.max(0, Math.floor(num(b.min_per_variant, 50)));
  const defaultEvent = b.default_event ? String(b.default_event) : 'Lead';

  const stmts: D1PreparedStatement[] = [];
  stmts.push(
    env.DB.prepare(
      `INSERT INTO links (slug, name, mode, epsilon, min_per_variant, default_event, active)
       VALUES (?, ?, ?, ?, ?, ?, 1)
       ON CONFLICT(slug) DO UPDATE SET
         name=excluded.name, mode=excluded.mode, epsilon=excluded.epsilon,
         min_per_variant=excluded.min_per_variant, default_event=excluded.default_event, active=1`,
    ).bind(slug, b.name ? String(b.name) : slug, mode, epsilon, minPer, defaultEvent),
  );

  // Upsert variant theo thứ tự. id = slug:index để ổn định, không reset số liệu.
  b.variants.forEach((v: any, i: number) => {
    const id = v.id ? String(v.id) : `${slug}:${i + 1}`;
    const url = String(v.url || '');
    if (!url) return;
    const label = v.label ? String(v.label) : `LDP ${i + 1}`;
    const weight = num(v.weight, 1);
    const active = v.active === false ? 0 : 1;
    stmts.push(
      env.DB.prepare(
        `INSERT INTO variants (id, slug, label, url, weight, active)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           label=excluded.label, url=excluded.url, weight=excluded.weight, active=excluded.active`,
      ).bind(id, slug, label, url, weight, active),
    );
  });

  await env.DB.batch(stmts);
  const variants = await getVariants(env, slug);
  const origin = new URL(req.url).origin;
  return json({
    ok: true,
    slug,
    ad_link: `${origin}/go/${slug}`,
    dashboard: `${origin}/dash/${slug}`,
    variants: variants.map((v) => ({ id: v.id, label: v.label, url: v.url, active: v.active === 1 })),
  });
}

async function handleGetLink(req: Request, env: Env, slug: string): Promise<Response> {
  if (!checkAdmin(req, env)) return json({ error: 'unauthorized' }, 401);
  const cfg = await getLinkConfig(env, slug);
  if (!cfg) return json({ error: 'not_found' }, 404);
  const variants = await getVariants(env, slug);
  return json({ link: cfg, variants });
}

// =====================================================================
// DB helpers
// =====================================================================

async function getLinkConfig(
  env: Env,
  slug: string,
): Promise<(LinkConfig & { active: number; default_event: string }) | null> {
  const row = await env.DB.prepare(
    'SELECT slug, mode, epsilon, min_per_variant, active, default_event FROM links WHERE slug = ?',
  )
    .bind(slug)
    .first<{
      slug: string;
      mode: string;
      epsilon: number;
      min_per_variant: number;
      active: number;
      default_event: string;
    }>();
  return row ?? null;
}

async function getVariants(env: Env, slug: string): Promise<VariantStat[]> {
  const { results } = await env.DB.prepare(
    'SELECT id, url, label, weight, active, clicks, conversions, revenue FROM variants WHERE slug = ? ORDER BY id',
  )
    .bind(slug)
    .all<VariantStat>();
  return results ?? [];
}

async function variantUrl(env: Env, variantId: string): Promise<string | null> {
  const r = await env.DB.prepare('SELECT url FROM variants WHERE id = ?')
    .bind(variantId)
    .first<{ url: string }>();
  return r?.url ?? null;
}

async function defaultEvent(env: Env, slug: string): Promise<string | null> {
  const r = await env.DB.prepare('SELECT default_event FROM links WHERE slug = ?')
    .bind(slug)
    .first<{ default_event: string }>();
  return r?.default_event ?? null;
}

// =====================================================================
// tiện ích
// =====================================================================

function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.get('cookie');
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

function cookieHeader(name: string, value: string): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax; Secure; HttpOnly`;
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '*';
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
  };
}

function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra },
  });
}

function num(v: unknown, def = 0): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : def;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function normalizePhone(p: string): string {
  return p.replace(/[^0-9]/g, '');
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const HELP_TEXT = `Smart Link Router — đang chạy ✅

Cách dùng:
  • Dán link quảng cáo:   /go/<slug>
  • Dashboard A/B:        /dash/<slug>
  • Số liệu JSON:         /api/stats/<slug>
  • Báo conversion:       POST /api/convert  { slug, vid, value? }
                          hoặc beacon ảnh: /px/<slug>.gif?vid=...&value=...

Tạo link (cần ADMIN_TOKEN):
  POST /api/links
  Authorization: Bearer <ADMIN_TOKEN>
  { "slug": "sale-thang-6",
    "variants": [ {"url":"https://ldp1...","label":"LDP A"}, {"url":"https://ldp2..."} ] }

Xem README.md để biết cách gắn vào Ladipage + Facebook.
`;
