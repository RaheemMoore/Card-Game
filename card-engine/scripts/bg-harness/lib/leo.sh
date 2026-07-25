#!/usr/bin/env bash
# Leonardo generation helper. Usage:
#   leo.sh "<prompt>" "<outfile>" [styleRefInitImageId]
set -euo pipefail

ENVFILE="/Users/rdmoore/Claude Projects/Card Game/card-engine/.env.local"
KEY=$(awk -F= '/^LEONARDO_API_KEY=/{v=substr($0,index($0,"=")+1); gsub(/["'"'"' \r]/,"",v); print v}' "$ENVFILE")
BASE="https://cloud.leonardo.ai/api/rest/v1"
PHOENIX="de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3"

PROMPT="$1"
OUT="$2"
STYLEREF="${3:-}"

NEG="cel-shaded, flat vector art, comic outlines, graphic novel, cartoon, 3d render, cgi, photorealistic, characters, people, humans, creatures, text, letters, signature, watermark, logo, ui, frame, border"

REFTYPE="${4:-GENERATED}"
STRENGTH="${5:-High}"
CONTROLNETS=""
if [ -n "$STYLEREF" ]; then
  CONTROLNETS=", \"controlnets\": [{\"initImageId\": \"$STYLEREF\", \"initImageType\": \"$REFTYPE\", \"preprocessorId\": 166, \"strengthType\": \"$STRENGTH\"}]"
fi

BODY=$(cat <<JSON
{
  "modelId": "$PHOENIX",
  "prompt": $(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "$PROMPT"),
  "negative_prompt": $(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "$NEG"),
  "width": 768,
  "height": 1024,
  "num_images": 1,
  "alchemy": true,
  "public": false $CONTROLNETS
}
JSON
)

RESP=$(curl -s -X POST "$BASE/generations" -H "authorization: Bearer $KEY" -H "content-type: application/json" -H "accept: application/json" -d "$BODY")
GENID=$(echo "$RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('sdGenerationJob',{}).get('generationId',''))" 2>/dev/null || true)
if [ -z "$GENID" ]; then echo "SUBMIT FAILED: $RESP"; exit 1; fi
echo "gen $GENID submitted, polling..."

for i in $(seq 1 60); do
  sleep 4
  D=$(curl -s "$BASE/generations/$GENID" -H "authorization: Bearer $KEY" -H "accept: application/json")
  STATUS=$(echo "$D" | python3 -c "import json,sys; d=json.load(sys.stdin); print((d.get('generations_by_pk') or {}).get('status',''))" 2>/dev/null || true)
  if [ "$STATUS" = "COMPLETE" ]; then
    URL=$(echo "$D" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['generations_by_pk']['generated_images'][0]['url'])")
    IMGID=$(echo "$D" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['generations_by_pk']['generated_images'][0]['id'])")
    curl -s "$URL" -o "$OUT"
    echo "DONE -> $OUT (image id: $IMGID)"
    exit 0
  fi
  if [ "$STATUS" = "FAILED" ]; then echo "GEN FAILED: $D"; exit 1; fi
done
echo "TIMEOUT waiting for $GENID"; exit 1
