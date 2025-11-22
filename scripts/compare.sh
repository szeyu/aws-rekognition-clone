#!/bin/bash
# Compare two face images
# Usage: ./scripts/compare.sh <image_path_A> <image_path_B> [api_url]

IMAGE_A="$1"
IMAGE_B="$2"
API_URL="${3:-http://localhost:3000}"

if [ -z "$IMAGE_A" ] || [ -z "$IMAGE_B" ]; then
  echo "Usage: ./scripts/compare.sh <image_path_A> <image_path_B> [api_url]"
  exit 1
fi

if [ ! -f "$IMAGE_A" ] || [ ! -f "$IMAGE_B" ]; then
  echo "Error: One or both image files not found"
  exit 1
fi

# Convert images to base64
if command -v base64 > /dev/null 2>&1; then
  IMAGE_BASE64_A=$(base64 < "$IMAGE_A" | tr -d '\n')
  IMAGE_BASE64_B=$(base64 < "$IMAGE_B" | tr -d '\n')
else
  echo "Error: base64 command not found"
  exit 1
fi

curl -X POST "${API_URL}/api/compare" \
  -H "Content-Type: application/json" \
  -d "{\"image_base64_A\": \"${IMAGE_BASE64_A}\", \"image_base64_B\": \"${IMAGE_BASE64_B}\"}" | jq '.'

echo ""

