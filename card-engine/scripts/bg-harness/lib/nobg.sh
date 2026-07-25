#!/usr/bin/env bash
# Background-removal cutout. Usage: nobg.sh <generatedImageId> <outfile>
set -euo pipefail
ENVFILE="/Users/rdmoore/Claude Projects/Card Game/card-engine/.env.local"
KEY=$(awk -F= '/^LEONARDO_API_KEY=/{v=substr($0,index($0,"=")+1); gsub(/["'"'"' \r]/,"",v); print v}' "$ENVFILE")
BASE="https://cloud.leonardo.ai/api/rest/v1"
IMGID="$1"; OUT="$2"
VID=$(curl -s -X POST "$BASE/variations/nobg" -H "authorization: Bearer $KEY" -H "content-type: application/json" -d "{\"id\":\"$IMGID\"}" | python3 -c "import json,sys;print(json.load(sys.stdin).get('sdNobgJob',{}).get('id',''))")
echo "nobg job: $VID"
for i in $(seq 1 25); do
  sleep 3
  D=$(curl -s "$BASE/variations/$VID" -H "authorization: Bearer $KEY")
  URL=$(echo "$D" | python3 -c "import json,sys;v=(json.load(sys.stdin).get('generated_image_variation_generic') or [{}]);print(v[0].get('url','') if v else '')" 2>/dev/null || true)
  if [ -n "$URL" ]; then curl -s "$URL" -o "$OUT"; echo "downloaded -> $OUT"; sips -g hasAlpha -g pixelWidth -g pixelHeight "$OUT" 2>/dev/null; exit 0; fi
done
echo "timeout"; exit 1
