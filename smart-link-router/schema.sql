-- =====================================================================
-- Smart Link Router — D1 (SQLite) schema
-- =====================================================================

-- Một "smart link" = 1 đường dẫn duy nhất bạn dán vào quảng cáo Facebook.
CREATE TABLE IF NOT EXISTS links (
  slug             TEXT PRIMARY KEY,            -- vd: "sale-thang-6" -> https://your-worker/go/sale-thang-6
  name             TEXT,
  mode             TEXT NOT NULL DEFAULT 'auto',-- 'auto' (bandit tự tối ưu) | 'manual' (chia theo weight)
  epsilon          REAL NOT NULL DEFAULT 0.10,  -- % traffic luôn để khám phá (tránh chốt sớm vào LDP sai)
  min_per_variant  INTEGER NOT NULL DEFAULT 50, -- mỗi LDP phải đủ số click này trước khi bandit tin dữ liệu (warmup)
  default_event    TEXT NOT NULL DEFAULT 'Lead',-- tên event gửi về Meta CAPI khi có conversion
  active           INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Mỗi smart link có nhiều variant = các landing page (Ladipage) khác nhau.
CREATE TABLE IF NOT EXISTS variants (
  id           TEXT PRIMARY KEY,           -- vd: "sale-thang-6:1"
  slug         TEXT NOT NULL,
  label        TEXT,                       -- tên gợi nhớ: "LDP đỏ", "LDP video"...
  url          TEXT NOT NULL,              -- URL Ladipage đích
  weight       REAL NOT NULL DEFAULT 1,    -- dùng khi mode='manual'
  active       INTEGER NOT NULL DEFAULT 1, -- tắt 1 LDP mà không xóa dữ liệu
  clicks       INTEGER NOT NULL DEFAULT 0,
  conversions  INTEGER NOT NULL DEFAULT 0,
  revenue      REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (slug) REFERENCES links(slug)
);
CREATE INDEX IF NOT EXISTS idx_variants_slug ON variants(slug);

-- Gán dính (sticky): 1 khách (vid) vào slug nào thì lần sau vẫn ra đúng LDP đó.
CREATE TABLE IF NOT EXISTS assignments (
  vid         TEXT NOT NULL,
  slug        TEXT NOT NULL,
  variant_id  TEXT NOT NULL,
  fbclid      TEXT,                        -- lưu để dựng fbc cho Conversions API
  converted   INTEGER NOT NULL DEFAULT 0,  -- chống đếm trùng 1 khách convert nhiều lần
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (vid, slug)
);

-- Log thô từng sự kiện (để vẽ biểu đồ theo thời gian, đối soát).
CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL,
  variant_id  TEXT,
  vid         TEXT,
  type        TEXT NOT NULL,               -- 'click' | 'conversion'
  value       REAL NOT NULL DEFAULT 0,
  ts          TEXT NOT NULL DEFAULT (datetime('now')),
  meta        TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_slug_ts ON events(slug, ts);

-- Cấu hình chung (mật khẩu quản trị, Pixel/CAPI...) — quản lý qua /admin.
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
