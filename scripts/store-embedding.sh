#!/bin/bash
# Store a face embedding from an image file
# Usage: ./scripts/store-embedding.sh <image_path> [api_url]

IMAGE_PATH="$1"
API_URL="${2:-http://localhost:3000}"

if [ -z "$IMAGE_PATH" ]; then
  echo "Usage: ./scripts/store-embedding.sh <image_path> [api_url]"
  exit 1
fi

if [ ! -f "$IMAGE_PATH" ]; then
  echo "Error: Image file not found: $IMAGE_PATH"
  exit 1
fi

# Convert to absolute path
ABS_PATH=$(cd "$(dirname "$IMAGE_PATH")" && pwd)/$(basename "$IMAGE_PATH")

curl -X POST "${API_URL}/api/store_embedding" \
  -H "Content-Type: application/json" \
  -d "{\"image_path\": \"${ABS_PATH}\"}"

echo ""

