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

# Convert to absolute path
ABS_PATH=$(cd "$(dirname "$IMAGE_PATH")" && pwd)/$(basename "$IMAGE_PATH")

curl -X POST "${API_URL}/api/search" \
  -H "Content-Type: application/json" \
  -d "{\"image_path\": \"${ABS_PATH}\", \"top_k\": ${TOP_K}}"

echo ""

