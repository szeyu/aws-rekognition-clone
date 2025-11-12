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

# Convert to absolute paths
ABS_A=$(cd "$(dirname "$IMAGE_A")" && pwd)/$(basename "$IMAGE_A")
ABS_B=$(cd "$(dirname "$IMAGE_B")" && pwd)/$(basename "$IMAGE_B")

curl -X POST "${API_URL}/api/compare" \
  -H "Content-Type: application/json" \
  -d "{\"image_path_A\": \"${ABS_A}\", \"image_path_B\": \"${ABS_B}\"}"

echo ""

