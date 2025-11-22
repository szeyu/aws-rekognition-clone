#!/bin/bash
# Search for similar faces
# Usage: ./scripts/search.sh <image_path> <top_k> [api_url]

IMAGE_PATH="$1"
TOP_K="$2"
API_URL="${3:-http://localhost:3000}"

if [ -z "$IMAGE_PATH" ] || [ -z "$TOP_K" ]; then
  echo "Usage: ./scripts/search.sh <image_path> <top_k> [api_url]"
  exit 1
fi

if [ ! -f "$IMAGE_PATH" ]; then
  echo "Error: Image file not found: $IMAGE_PATH"
  exit 1
fi

# Convert image to base64
if command -v base64 > /dev/null 2>&1; then
  IMAGE_BASE64=$(base64 < "$IMAGE_PATH" | tr -d '\n')
else
  echo "Error: base64 command not found"
  exit 1
fi

curl -X POST "${API_URL}/api/search" \
  -H "Content-Type: application/json" \
  -d "{\"image_base64\": \"${IMAGE_BASE64}\", \"top_k\": ${TOP_K}}" | jq '.'

echo ""

