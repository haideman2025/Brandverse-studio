#!/usr/bin/env bash
# Ví dụ: tạo 1 smart link với 5 landing page Ladipage.
# Sửa WORKER_URL, ADMIN_TOKEN và danh sách URL cho đúng của bạn.

set -euo pipefail

WORKER_URL="${WORKER_URL:-https://smart-link-router.<your-subdomain>.workers.dev}"
ADMIN_TOKEN="${ADMIN_TOKEN:-dan-admin-token-cua-ban-vao-day}"

curl -sS -X POST "$WORKER_URL/api/links" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "sale-thang-6",
    "name": "Sale tháng 6 - test 5 LDP",
    "mode": "auto",
    "epsilon": 0.10,
    "min_per_variant": 50,
    "default_event": "Lead",
    "variants": [
      { "label": "LDP A - tiêu đề giảm giá", "url": "https://trang-cua-ban.com/ldp-a" },
      { "label": "LDP B - video review",      "url": "https://trang-cua-ban.com/ldp-b" },
      { "label": "LDP C - so sánh giá",       "url": "https://trang-cua-ban.com/ldp-c" },
      { "label": "LDP D - bảo hành",          "url": "https://trang-cua-ban.com/ldp-d" },
      { "label": "LDP E - flash sale",        "url": "https://trang-cua-ban.com/ldp-e" }
    ]
  }' | python3 -m json.tool
