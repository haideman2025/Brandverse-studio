# Auto-deploy từ GitHub bằng Cloudflare Workers Builds

Mỗi lần push code → Cloudflare tự build & deploy. Không cần chạy `wrangler deploy` tay nữa.
Mọi thứ đã chuẩn bị sẵn (code, `wrangler.toml` đã trỏ đúng D1, lockfile). Bạn chỉ bấm vài cú.

> ⚠️ Repo này là **monorepo**: gốc repo là app React khác, còn router nằm trong thư mục con
> `fb-ads-ldp-router/`. Vì vậy bước **Root directory** bên dưới là bắt buộc, đừng bỏ.

---

## Bước 1 — Nối repo (làm 1 lần)

1. Vào **Cloudflare Dashboard** → **Workers & Pages** → **Create** → tab **Workers** →
   **Import a repository** (Connect to Git).
2. Chọn GitHub, cấp quyền, chọn repo **`haideman2025/brandverse-studio`**.
3. Cấu hình build:
   | Mục | Giá trị |
   |---|---|
   | **Production branch** | `claude/fb-ads-dynamic-ab-testing-cSbfG` (hoặc `main` nếu bạn merge vào main) |
   | **Root directory** | `fb-ads-ldp-router`  ← **bắt buộc** |
   | **Build command** | `npm install` |
   | **Deploy command** | `npx wrangler deploy` |
4. Bấm **Save and Deploy**. Lần đầu sẽ tạo Worker `ldp-router` + nối sẵn D1 (theo `wrangler.toml`).

Sau đó: cứ **push lên branch đó là tự deploy**. Xong.

---

## Bước 2 — Đặt mật khẩu xem báo cáo (ADMIN_TOKEN, làm 1 lần)

Git deploy không tự chạy được `wrangler secret put`, nên set thủ công 1 lần (secret này **giữ
nguyên qua các lần deploy sau**):

- **Cách A (dashboard):** Worker `ldp-router` → **Settings** → **Variables and Secrets** →
  **Add** → loại **Secret** → tên `ADMIN_TOKEN`, giá trị = mật khẩu bí mật của bạn → Save →
  **Retry deployment**.
- **Cách B (terminal, 1 lệnh):**
  ```bash
  cd fb-ads-ldp-router && npx wrangler login && npx wrangler secret put ADMIN_TOKEN
  ```

---

## Xong! Kiểm tra

Sau khi deploy, Worker chạy ở `https://ldp-router.<tài-khoản>.workers.dev`:

```
…/r/demo                          # mở vài lần -> xoay LDP demo
…/c/demo                          # giả lập 1 chuyển đổi
…/dashboard/demo?token=<ADMIN_TOKEN>   # dashboard trực quan
```

Muốn link đẹp (vd `go.domain-cua-ban.com`): mở `wrangler.toml`, bỏ comment block `routes`,
sửa domain, commit & push → tự deploy lại với domain mới.

---

## Lưu ý nhỏ
- **Đổi DB / binding?** Sửa trong `wrangler.toml` rồi push — build tự áp dụng.
- **Build fail "no wrangler.toml"?** Gần như chắc do quên đặt **Root directory = `fb-ads-ldp-router`**.
- Secret `ADMIN_TOKEN` **không** nằm trong code/git (đúng chuẩn bảo mật) → phải set ở Bước 2.
