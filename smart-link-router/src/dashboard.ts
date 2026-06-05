// =====================================================================
// Dashboard HTML — xem nhanh LDP nào đang thắng. Tự refresh 15s.
// =====================================================================

import type { summarize } from './bandit';

type Summary = ReturnType<typeof summarize>;

export function renderDashboard(slug: string, mode: string, origin: string, sum: Summary): string {
  const adLink = `${origin}/go/${slug}`;
  const rows = sum.rows
    .map((r, i) => {
      const isWinner = r.id === sum.winner;
      const bar = Math.min(100, r.crPct * 4); // scale cho dễ nhìn
      return `
      <tr class="${isWinner ? 'winner' : ''} ${r.active ? '' : 'off'}">
        <td>${i + 1}</td>
        <td>
          <div class="lbl">${esc(r.label || r.id)} ${isWinner ? '<span class="tag">🏆 dẫn đầu</span>' : ''} ${
            r.active ? '' : '<span class="tag off">tắt</span>'
          }</div>
          <a class="url" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.url)}</a>
        </td>
        <td class="num">${r.clicks.toLocaleString()}</td>
        <td class="num">${r.conversions.toLocaleString()}</td>
        <td class="num">
          <div class="crwrap"><span>${r.crPct}%</span><div class="track"><div class="fill" style="width:${bar}%"></div></div></div>
          <div class="sub">tin cậy: ${r.wilsonLower}%</div>
        </td>
        <td class="num">${r.revenue.toLocaleString()}</td>
      </tr>`;
    })
    .join('');

  return `<!doctype html>
<html lang="vi"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>A/B Landing Pages — ${esc(slug)}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
         background:#0b0f1a; color:#e6e9ef; padding:24px; }
  h1 { font-size:20px; margin:0 0 4px; }
  .meta { color:#8b93a7; font-size:13px; margin-bottom:20px; }
  .cards { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:20px; }
  .card { background:#141a2b; border:1px solid #222b44; border-radius:12px; padding:14px 18px; min-width:140px; }
  .card .k { color:#8b93a7; font-size:12px; }
  .card .v { font-size:22px; font-weight:700; margin-top:4px; }
  .linkbox { background:#141a2b; border:1px solid #222b44; border-radius:10px; padding:10px 14px;
             font-family:monospace; font-size:13px; display:flex; gap:10px; align-items:center; margin-bottom:20px; }
  .linkbox code { color:#7dd3fc; word-break:break-all; }
  table { width:100%; border-collapse:collapse; background:#141a2b; border-radius:12px; overflow:hidden; }
  th, td { padding:12px 14px; text-align:left; border-bottom:1px solid #1e2740; font-size:14px; }
  th { color:#8b93a7; font-weight:600; font-size:12px; text-transform:uppercase; letter-spacing:.04em; }
  td.num, th.num { text-align:right; font-variant-numeric: tabular-nums; }
  tr.winner { background:linear-gradient(90deg, rgba(34,197,94,.10), transparent); }
  tr.off { opacity:.45; }
  .lbl { font-weight:600; }
  .url { color:#6b7a99; font-size:12px; text-decoration:none; }
  .url:hover { color:#7dd3fc; }
  .tag { font-size:11px; background:#16351f; color:#4ade80; padding:2px 7px; border-radius:20px; margin-left:6px; }
  .tag.off { background:#3a1f22; color:#f87171; }
  .crwrap { display:flex; flex-direction:column; align-items:flex-end; gap:3px; }
  .track { width:90px; height:6px; background:#222b44; border-radius:4px; overflow:hidden; }
  .fill { height:100%; background:#4ade80; }
  .sub { color:#6b7a99; font-size:11px; }
  .foot { color:#6b7a99; font-size:12px; margin-top:16px; }
  a.dash { color:#7dd3fc; }
</style>
</head><body>
  <h1>A/B Landing Pages — <span style="color:#7dd3fc">${esc(slug)}</span></h1>
  <div class="meta">Chế độ: <b>${mode === 'auto' ? 'Tự tối ưu (bandit)' : 'Chia tay (manual)'}</b> · tự cập nhật mỗi 15 giây</div>

  <div class="cards">
    <div class="card"><div class="k">Tổng click</div><div class="v">${sum.totals.clicks.toLocaleString()}</div></div>
    <div class="card"><div class="k">Tổng conversion</div><div class="v">${sum.totals.conversions.toLocaleString()}</div></div>
    <div class="card"><div class="k">CR trung bình</div><div class="v">${sum.totals.cr}%</div></div>
    <div class="card"><div class="k">Doanh thu</div><div class="v">${sum.totals.revenue.toLocaleString()}</div></div>
  </div>

  <div class="linkbox">📣 Link dán vào FB Ad: <code>${esc(adLink)}</code></div>

  <table>
    <thead><tr>
      <th>#</th><th>Landing page</th><th class="num">Click</th>
      <th class="num">Conv.</th><th class="num">CR</th><th class="num">Doanh thu</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#6b7a99">Chưa có dữ liệu</td></tr>'}</tbody>
  </table>

  <div class="foot">
    "Tin cậy" = cận dưới khoảng Wilson 95% — dùng để xếp hạng công bằng khi click còn ít
    (LDP có CR cao nhưng mới vài click sẽ chưa vội được coi là winner).
    Số liệu JSON: <a class="dash" href="${esc(origin)}/api/stats/${esc(slug)}">/api/stats/${esc(slug)}</a>
  </div>

  <script>setTimeout(() => location.reload(), 15000);</script>
</body></html>`;
}

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
