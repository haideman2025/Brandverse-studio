# FB Ads Dynamic LDP Router 🎯

Chạy **1 quảng cáo Facebook / giữ nguyên 1 bài post** (giữ like, comment, share) nhưng cái link
trong post **tự xoay vòng 5–10 landing page (Ladipage) khác nhau**, **tự đo** LDP nào chuyển đổi
tốt nhất và **tự dồn traffic** về LDP thắng bằng thuật toán **multi-armed bandit (Thompson Sampling)**.

Chạy trên **Cloudflare Workers + D1** — free tier dư xài, độ trễ ~vài ms, không cần server riêng.

```
FB Ad (1 post, 1 link: https://go.domain/r/serum-t6)
        │
        ▼
   [ LDP Router (Worker này) ]  ── chọn LDP (bandit) + sticky cookie + log
        ├──► Ladipage 1   (?utm_content=ldp_01&cid=...)
        ├──► Ladipage 2
        └──► ... tối đa 10
                 │ khi có lead/mua -> bắn pixel /c/serum-t6
                 ▼
        Đếm CR từng LDP -> tự dồn traffic về LDP CR cao nhất
```

---

## 1. Deploy (chỉ còn 3 lệnh — D1 đã tạo & seed sẵn)

> ✅ D1 database `ldp_router` (id `8a48aa02-ecd6-4bc0-9db4-f500c80c4cdf`, region APAC) đã được
> tạo sẵn, đã có bảng và 1 campaign demo `demo` với 3 LDP. `wrangler.toml` đã trỏ đúng id.
> Vì deploy Worker cần đăng nhập Cloudflare của bạn nên 3 lệnh cuối bạn tự chạy trên máy:

```bash
cd fb-ads-ldp-router
npm install
npx wrangler login                    # mở trình duyệt, đăng nhập Cloudflare của bạn
npx wrangler secret put ADMIN_TOKEN   # gõ 1 chuỗi bí mật bất kỳ (để xem báo cáo)
npm run deploy                        # -> in ra URL: https://ldp-router.<bạn>.workers.dev
```

Xong là chạy được ngay. Thử liền:
```bash
# Mở link router vài lần -> mỗi lần có thể vào 1 LDP khác (xem JSON echo của httpbin)
open https://ldp-router.<bạn>.workers.dev/r/demo

# Xem báo cáo CR
open "https://ldp-router.<bạn>.workers.dev/stats/demo?token=<ADMIN_TOKEN>"
```

<details><summary>Nếu muốn tự tạo D1 từ đầu (bỏ qua nếu dùng cái đã tạo sẵn)</summary>

```bash
npx wrangler d1 create ldp_router      # dán database_id vào wrangler.toml
npm run db:init:remote                 # tạo bảng + seed demo
```
</details>

Sau khi deploy, Worker chạy ở `https://ldp-router.<tài-khoản>.workers.dev`.
👉 Khuyến nghị gắn **domain riêng** (vd `go.domain-cua-ban.com`) cho link đẹp + uy tín:
mở `wrangler.toml`, bỏ comment block `routes`, sửa domain, rồi `npm run deploy` lại.

---

## 2. Khai báo campaign + danh sách LDP

Cách A — gọi API (khuyên dùng, sửa nhanh):

```bash
curl -X POST https://go.domain-cua-ban.com/admin/campaigns \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "serum-t6",
    "name": "Serum tháng 6",
    "mode": "bandit",
    "min_explore": 30,
    "variants": [
      { "variant_id": "ldp_01", "label": "Bản review",   "url": "https://ladi.cua-ban.com/lp-review" },
      { "variant_id": "ldp_02", "label": "Bản giảm giá", "url": "https://ladi.cua-ban.com/lp-sale" },
      { "variant_id": "ldp_03", "label": "Bản cam kết",  "url": "https://ladi.cua-ban.com/lp-guarantee" }
    ]
  }'
```

Cách B — dùng script + file JSON (khuyên dùng cho 5–10 link, sửa/chạy lại dễ):

```bash
# Sửa link thật trong campaign.example.json rồi:
WORKER_URL=https://ldp-router.<ban>.workers.dev \
ADMIN_TOKEN=<token-cua-ban> \
./load-campaign.sh campaign.example.json
```
Script in ra luôn link quảng cáo và link dashboard sau khi nạp.

Cách C — sửa `schema.sql` (phần seed) rồi `npm run db:init:remote`.

**`mode`:**
- `bandit` *(mặc định)* — tự tối ưu: thăm dò đều cho tới khi mỗi LDP đủ `min_explore` click, rồi dồn dần về LDP CR cao.
- `weighted` — tự chia theo `weight` mình đặt.
- `even` — chia đều 100% để test thuần A/B.

Muốn **loại 1 LDP thua** khỏi vòng xoay: set `active: false` cho variant đó (gọi lại API hoặc update DB).

---

## 3. Dán link vào quảng cáo Facebook

Link đích của ad / nút trong post:

```
https://go.domain-cua-ban.com/r/serum-t6
```

Chỉ vậy thôi. 1 post, 1 link, social proof giữ nguyên. Router lo phần xoay LDP.
`fbclid` từ FB được **giữ nguyên và chuyển tiếp** sang Ladipage để FB vẫn attribution đúng.

---

## 4. Gắn pixel chuyển đổi vào Ladipage (bắt buộc để đo CR)

Vào trang **cảm ơn / sau khi mua / sau khi điền form** trên Ladipage → chèn đoạn HTML:

```html
<!-- Báo chuyển đổi về LDP Router -->
<img src="https://go.domain-cua-ban.com/c/serum-t6" width="1" height="1" style="display:none" alt="">
```

Cookie `cid` được lưu trên domain router nên pixel tự gán đúng LDP đã đưa khách vào — **không sợ đếm trùng**.

> Trình duyệt chặn cookie third-party (Safari ITP)? Truyền `cid` qua URL cho chắc:
> `...<đường dẫn>?cid={{cid}}` — Ladipage giữ query string, rồi pixel gọi
> `https://go.domain-cua-ban.com/c/serum-t6?cid=<cid>`.

**Có đơn hàng kèm doanh thu (server-side, chính xác nhất):**

```bash
curl -X POST https://go.domain-cua-ban.com/c/serum-t6 \
  -H "Content-Type: application/json" \
  -d '{ "cid": "<cid của khách>", "revenue": 350000 }'
```

> 💡 Nên gắn thêm **Meta Pixel + Conversion API (CAPI)** trên Ladipage như bình thường để
> chính Facebook cũng học chuyển đổi. Router này là lớp **đo & tối ưu LDP**, chạy song song chứ
> không thay thế pixel của Meta.

---

## 5. Xem báo cáo & chốt LDP thắng

**Dashboard trực quan (HTML, có biểu đồ, tự refresh 20s):**
```
https://go.domain-cua-ban.com/dashboard/serum-t6?token=<ADMIN_TOKEN>
```
Mở không kèm token sẽ hiện ô nhập token. Dashboard hiển thị KPI tổng, LDP thắng (gắn 🏆),
thanh CR từng LDP, % traffic đang nhận và doanh thu.

**Hoặc JSON (để tích hợp/automation):**
```
https://go.domain-cua-ban.com/stats/serum-t6?token=<ADMIN_TOKEN>
```

Trả về CR từng LDP, % traffic đang nhận, doanh thu, và **winner** hiện tại. Ví dụ:

```json
{
  "winner": { "variant_id": "ldp_02", "cr_pct": 8.4, "clicks": 1200, "conversions": 101 },
  "variants": [
    { "variant_id": "ldp_02", "cr_pct": 8.4, "traffic_share_pct": 46.1 },
    { "variant_id": "ldp_01", "cr_pct": 5.1, "traffic_share_pct": 31.0 },
    { "variant_id": "ldp_03", "cr_pct": 3.2, "traffic_share_pct": 22.9 }
  ]
}
```

---

## ⚠️ Lưu ý chính sách Facebook (đọc để không bay tài khoản)

- **KHÔNG cloaking.** Tất cả 5–10 LDP phải là **biến thể cùng 1 sản phẩm/offer** với nội dung
  quảng cáo. Redirect chỉ được sang các phiên bản layout/nội dung của **cùng offer** mà FB đã duyệt.
- Dùng **subdomain riêng, HTTPS, uy tín** cho link router.
- `sticky=1` (mặc định) giữ 1 người luôn vào 1 LDP → vừa đo chuẩn, vừa tránh trải nghiệm nhảy trang.

---

## Tham chiếu API

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/r/:campaign` | Link dán vào FB. Chọn LDP → 302 redirect. |
| GET | `/c/:campaign` | Pixel chuyển đổi (1x1 gif). |
| POST | `/c/:campaign` | Chuyển đổi server-side (`{cid, revenue}`). |
| GET | `/stats/:campaign?token=` | Báo cáo CR + winner (JSON). |
| GET | `/dashboard/:campaign?token=` | Dashboard HTML trực quan. |
| POST | `/admin/campaigns` | Tạo/sửa campaign + LDP (Bearer token). |
| GET | `/healthz` | Health check. |
