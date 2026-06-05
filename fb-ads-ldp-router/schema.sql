-- ============================================================
--  FB Ads Dynamic LDP Router — D1 schema
--  Áp dụng: wrangler d1 execute ldp_router --file=./schema.sql
-- ============================================================

-- Mỗi "campaign" = 1 link quảng cáo. 1 post FB chỉ cần trỏ tới /r/<id>.
CREATE TABLE IF NOT EXISTS campaigns (
  id          TEXT PRIMARY KEY,             -- vd: 'serum-t6'  -> link: https://go.domain/r/serum-t6
  name        TEXT,
  mode        TEXT    DEFAULT 'bandit',      -- 'even' | 'weighted' | 'bandit'
  utm_source  TEXT    DEFAULT 'facebook',
  min_explore INTEGER DEFAULT 30,            -- mỗi LDP phải đủ N click trước khi bandit "dồn" traffic
  sticky      INTEGER DEFAULT 1,             -- 1 = cùng 1 người luôn vào cùng 1 LDP (đo chuẩn + đúng policy)
  active      INTEGER DEFAULT 1,
  created_at  TEXT    DEFAULT (datetime('now'))
);

-- 5–10 landing page (đã có link sẵn) thuộc 1 campaign.
CREATE TABLE IF NOT EXISTS variants (
  campaign_id TEXT    NOT NULL,
  variant_id  TEXT    NOT NULL,             -- vd: 'ldp_01'
  label       TEXT,                          -- tên gợi nhớ: 'Bản review', 'Bản giảm giá'...
  url         TEXT    NOT NULL,             -- link Ladipage thật
  weight      REAL    DEFAULT 1,            -- chỉ dùng khi mode='weighted'
  active      INTEGER DEFAULT 1,            -- tắt = 0 để loại LDP thua khỏi vòng xoay
  clicks      INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue     REAL    DEFAULT 0,
  PRIMARY KEY (campaign_id, variant_id)
);

-- Log từng click để gán chuyển đổi chính xác (theo cid) + chống đếm trùng.
CREATE TABLE IF NOT EXISTS clicks (
  cid         TEXT PRIMARY KEY,             -- click id (uuid) sinh khi redirect
  campaign_id TEXT,
  variant_id  TEXT,
  fbclid      TEXT,
  ts          TEXT DEFAULT (datetime('now')),
  converted   INTEGER DEFAULT 0,
  revenue     REAL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_clicks_campaign ON clicks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_clicks_variant  ON clicks(campaign_id, variant_id);

-- ------------------------------------------------------------
-- VÍ DỤ seed: 1 campaign + 3 LDP (sửa lại link cho đúng của T)
-- ------------------------------------------------------------
INSERT OR REPLACE INTO campaigns (id, name, mode, min_explore)
VALUES ('demo', 'Demo campaign', 'bandit', 30);

INSERT OR REPLACE INTO variants (campaign_id, variant_id, label, url) VALUES
  ('demo', 'ldp_01', 'Bản review',     'https://ladipage-cua-ban.com/lp-review'),
  ('demo', 'ldp_02', 'Bản giảm giá',   'https://ladipage-cua-ban.com/lp-sale'),
  ('demo', 'ldp_03', 'Bản cam kết',    'https://ladipage-cua-ban.com/lp-guarantee');
