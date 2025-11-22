#!/bin/bash

# Usage: ./scripts/detect-faces.sh <image_path> [save_crops] [confidence_threshold] [api_url]
# Examples:
#   ./scripts/detect-faces.sh examples/face1.jpeg
#   ./scripts/detect-faces.sh examples/face1.jpeg true
#   ./scripts/detect-faces.sh examples/face1.jpeg true 0.7
#   ./scripts/detect-faces.sh examples/face1.jpeg false 0.6 http://localhost:3000

if [ -z "$1" ]; then
  echo "Usage: $0 <image_path> [save_crops] [confidence_threshold] [api_url]"
  echo ""
  echo "Arguments:"
  echo "  image_path            Path to image file (required)"
  echo "  save_crops            Save cropped faces to output/cropped_faces/ (default: false)"
  echo "  confidence_threshold  Minimum confidence threshold 0-1 (default: 0.6)"
  echo "  api_url               API base URL (default: http://localhost:3000)"
  echo ""
  echo "Examples:"
  echo "  $0 examples/face1.jpeg"
  echo "  $0 examples/face1.jpeg true"
  echo "  $0 examples/face1.jpeg true 0.7"
  exit 1
fi

IMAGE_PATH="$1"
SAVE_CROPS="${2:-false}"
CONFIDENCE="${3:-0.6}"
API_URL="${4:-http://localhost:3000}"

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

curl -s -X POST "$API_URL/api/detect-faces" \
  -H "Content-Type: application/json" \
  -d "{
    \"image_base64\": \"$IMAGE_BASE64\",
    \"save_crops\": $SAVE_CROPS,
    \"confidence_threshold\": $CONFIDENCE
  }" | jq -C '.'
