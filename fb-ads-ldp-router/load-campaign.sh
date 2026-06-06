#!/usr/bin/env bash
# Nạp / cập nhật 1 campaign (danh sách 5-10 link Ladipage) vào LDP Router.
#
# Cách dùng:
#   1) Sửa file JSON (vd campaign.example.json) -> thay link Ladipage thật của bạn.
#   2) Chạy:
#        WORKER_URL=https://ldp-router.<ban>.workers.dev \
#        ADMIN_TOKEN=<token-cua-ban> \
#        ./load-campaign.sh campaign.example.json
#
# Chạy lại bất cứ lúc nào để cập nhật (thêm LDP, đổi link, bật/tắt 'active').
set -euo pipefail

FILE="${1:-campaign.example.json}"
: "${WORKER_URL:?Thiếu WORKER_URL, vd: https://ldp-router.ban.workers.dev}"
: "${ADMIN_TOKEN:?Thiếu ADMIN_TOKEN}"

if [ ! -f "$FILE" ]; then echo "Khong tim thay file: $FILE" >&2; exit 1; fi

echo "→ Nạp '$FILE' vào ${WORKER_URL}/admin/campaigns ..."
curl -fsS -X POST "${WORKER_URL%/}/admin/campaigns" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  --data-binary @"$FILE"
echo

CID=$(grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' "$FILE" | head -1 | sed -E 's/.*"id"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/')
echo "✓ Xong."
echo "  Link quảng cáo : ${WORKER_URL%/}/r/${CID}"
echo "  Dashboard      : ${WORKER_URL%/}/dashboard/${CID}?token=${ADMIN_TOKEN}"
