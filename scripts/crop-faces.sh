#!/bin/bash
# Crop all faces from an image and save to output/cropped_faces/
# Usage: ./scripts/crop-faces.sh <image_path> [api_url]

IMAGE_PATH="$1"
API_URL="${2:-http://localhost:3000}"

if [ -z "$IMAGE_PATH" ]; then
  echo "Usage: ./scripts/crop-faces.sh <image_path> [api_url]"
  exit 1
fi

curl -X POST "${API_URL}/api/crop-faces" \
  -H "Content-Type: application/json" \
  -d "{\"image_path\": \"$IMAGE_PATH\"}" | jq '.'

echo ""
