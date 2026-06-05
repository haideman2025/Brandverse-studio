# Smart Link Router — 1 link FB Ad → tự xoay & A/B test nhiều landing page

Giải quyết đúng nhu cầu: chạy **1 quảng cáo Facebook với 1 link duy nhất**, nhưng
link đó **tự động chia traffic cho 5–10 landing page (Ladipage) khác nhau**, đo
landing page nào có **tỉ lệ chuyển đổi (CR)** tốt nhất, và **tự dồn traffic** về
landing page thắng — mà **không đụng vào bài quảng cáo** nên giữ nguyên
like / comment / share.

```
   Facebook Ad (1 bài, 1 link)
            │
            ▼
   https://worker/go/sale-thang-6      ← Smart Link Router (Cloudflare Worker)
            │  chia traffic + tự tối ưu
            ├─► LDP A (Ladipage)   CR 3.1%
            ├─► LDP B (Ladipage)   CR 5.8%  🏆  ← bandit tự dồn traffic về đây
            ├─► LDP C ...
            └─► LDP E ...
            │
   conversion (form/đơn) ─► /api/convert ─► +1 cho LDP đúng ─► bắn Meta CAPI
```

## Vì sao phải có link trung gian này?

Facebook **không** cho 1 quảng cáo tự xoay nhiều URL đích trong cùng 1 bài. Nếu
tạo nhiều ad nhiều URL → bài bị tách, mất social proof. Link trung gian giúp:

- **Giữ nguyên 1 bài đăng** (1 link) → tích lũy tương tác.
- **Bạn toàn quyền** đổi danh sách LDP / tỉ lệ chia mà không sửa quảng cáo.
- **Đo CR từng LDP** và **tự tối ưu** bằng thuật toán multi-armed bandit.

## Cách hoạt động (tóm tắt kỹ thuật)

- Mỗi khách được gán 1 LDP và **dính (sticky)** bằng cookie `slr_vid` — lần sau
  vào vẫn ra đúng LDP đó (UX nhất quán + quy kết conversion chính xác).
- Khách mới được chọn LDP bằng **Thompson Sampling** (mặc định `mode: auto`):
  1. **Warmup**: mỗi LDP được đảm bảo đủ `min_per_variant` click trước đã.
  2. **Epsilon**: luôn để `epsilon` (vd 10%) traffic khám phá ngẫu nhiên.
  3. Còn lại: lấy mẫu từ phân phối Beta(conv+1, click−conv+1) của từng LDP,
     chọn LDP có mẫu cao nhất → LDP tốt thắng dần, LDP yếu vẫn có cơ hội.
- Xếp hạng winner dùng **cận dưới Wilson 95%** để không vội chốt khi click ít.
- Có thể chuyển `mode: manual` để **tự chia theo `weight`** nếu muốn kiểm soát tay.

---

## Cài đặt & deploy

> Yêu cầu: Node.js + tài khoản Cloudflare. Worker + D1 đủ chạy trên gói **miễn phí**.

```bash
cd smart-link-router
npm install

# 1) Tạo D1 database, rồi dán database_id vào wrangler.toml
npx wrangler d1 create slr-db

# 2) Tạo bảng (local để test, remote để chạy thật)
npm run db:init:local      # cho `wrangler dev`
npm run db:init:remote     # cho production

# 3) Đặt các bí mật
npx wrangler secret put ADMIN_TOKEN       # token tự đặt, để gọi API quản trị
npx wrangler secret put META_PIXEL_ID     # (tùy chọn) bật Conversions API
npx wrangler secret put META_CAPI_TOKEN   # (tùy chọn) system-user token CAPI

# 4) Chạy thử / deploy
npm run dev
npm run deploy
```

Chạy local với secret: tạo file `.dev.vars` (đã được .gitignore):

```
ADMIN_TOKEN=test123
META_PIXEL_ID=
META_CAPI_TOKEN=
```

---

## Tạo 1 smart link (5–10 LDP)

```bash
curl -X POST https://<worker-url>/api/links \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "sale-thang-6",
    "mode": "auto",
    "variants": [
      {"label":"LDP A","url":"https://trang.com/ldp-a"},
      {"label":"LDP B","url":"https://trang.com/ldp-b"},
      {"label":"LDP C","url":"https://trang.com/ldp-c"},
      {"label":"LDP D","url":"https://trang.com/ldp-d"},
      {"label":"LDP E","url":"https://trang.com/ldp-e"}
    ]
  }'
```

(Có sẵn script mẫu: `examples/create-link.sh`.)

Kết quả trả về **link để dán vào quảng cáo**: `https://<worker-url>/go/sale-thang-6`
và **dashboard**: `https://<worker-url>/dash/sale-thang-6`.

> Gọi lại API cùng `slug` để **thêm/sửa/tắt LDP** bất cứ lúc nào — số liệu cũ
> được giữ nguyên (id variant ổn định). Đặt `"active": false` để tắt 1 LDP.

---

## Gắn vào Facebook Ads

1. Tạo/giữ **1 bài đăng** quảng cáo như bình thường.
2. Ở ô **Website URL / Liên kết**, dán: `https://<worker-url>/go/sale-thang-6`
3. Đăng ad. Xong — mọi tối ưu LDP diễn ra phía sau, **không cần sửa ad nữa**.

Worker tự truyền tiếp `fbclid` và gắn `utm_campaign=<slug>`, `utm_content=<variant_id>`
sang LDP, nên báo cáo Ladipage/GA cũng tách được theo từng LDP.

---

## Báo conversion về (đo CR từng LDP) — chọn 1 hoặc cả 2 cách

Khi Worker redirect sang LDP, nó thêm `?slr_vid=...&slr_slug=...` vào URL. LDP chỉ
cần gửi lại 2 giá trị này khi có chuyển đổi.

### Cách 1 — Pixel ảnh (đơn giản nhất, không cần code backend)
Chèn vào trang "cảm ơn / đặt hàng thành công" của Ladipage 1 ảnh ẩn:

```html
<img src="https://<worker-url>/px/sale-thang-6.gif?vid=VID_O_DAY&value=299000"
     width="1" height="1" style="display:none" alt="">
```

Lấy `VID_O_DAY` từ query `slr_vid` trên URL (đa số builder cho chèn JS nhỏ):

```html
<script>
  var vid = new URLSearchParams(location.search).get('slr_vid') || '';
  var img = new Image();
  img.src = 'https://<worker-url>/px/sale-thang-6.gif?vid=' + encodeURIComponent(vid) + '&value=299000';
</script>
```

### Cách 2 — Webhook (chuẩn hơn, gửi kèm email/SĐT/giá trị đơn)
Khi form Ladipage submit thành công hoặc đơn được tạo, POST về:

```js
fetch('https://<worker-url>/api/convert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    slug: 'sale-thang-6',
    vid:  new URLSearchParams(location.search).get('slr_vid'),
    value: 299000,            // doanh thu (tùy chọn)
    event: 'Lead',            // hoặc 'Purchase'
    email: 'kh@example.com',  // tùy chọn -> được hash gửi Meta CAPI
    phone: '0901234567'       // tùy chọn -> được hash gửi Meta CAPI
  })
});
```

> Nếu Ladipage có webhook "đẩy lead", trỏ thẳng vào `/api/convert` và map field
> `slr_vid` → `vid`. Mỗi khách chỉ tính **1** conversion / link (chống đếm trùng).

### Meta Conversions API (song song)
Nếu đã set `META_PIXEL_ID` + `META_CAPI_TOKEN`, mỗi conversion sẽ **tự bắn về Meta**
(server-side, kèm `fbc` dựng từ `fbclid`, email/SĐT đã hash) để Facebook học và tối ưu
phân phối tốt hơn — bổ sung cho Pixel đặt trực tiếp trên LDP.

---

## Xem kết quả

- **Dashboard**: `https://<worker-url>/dash/<slug>` (tự refresh 15s, đánh dấu 🏆 LDP dẫn đầu).
- **JSON**: `https://<worker-url>/api/stats/<slug>`

```json
{
  "slug": "sale-thang-6",
  "mode": "auto",
  "winner": "sale-thang-6:2",
  "totals": { "clicks": 1840, "conversions": 96, "cr": 5.22, "revenue": 28704000 },
  "rows": [ { "id": "sale-thang-6:2", "label": "LDP B", "clicks": 700,
             "conversions": 48, "crPct": 6.86, "wilsonLower": 5.21 } ]
}
```

---

## Các route

| Route | Method | Mô tả |
|---|---|---|
| `/go/:slug` | GET | Link dán vào FB ad — redirect sang 1 LDP (sticky) |
| `/px/:slug.gif` | GET | Beacon ảnh báo conversion |
| `/api/convert` | POST | Webhook báo conversion (JSON hoặc form) |
| `/api/stats/:slug` | GET | Số liệu JSON + winner |
| `/dash/:slug` | GET | Dashboard HTML |
| `/api/links` | POST | (admin) tạo/cập nhật link + danh sách LDP |
| `/api/links/:slug` | GET | (admin) xem cấu hình |

## Chỉnh hành vi tối ưu

Trong payload tạo link:
- `mode`: `"auto"` (bandit tự tối ưu) hoặc `"manual"` (chia theo `weight`).
- `epsilon`: tỉ lệ traffic luôn khám phá (mặc định `0.10`).
- `min_per_variant`: số click warmup tối thiểu mỗi LDP trước khi bandit tin dữ liệu
  (mặc định `50`). LDP traffic thấp nên để cao hơn để tránh kết luận sớm.
