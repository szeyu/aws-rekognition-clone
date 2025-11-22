#!/bin/bash
# Visualize faces with bounding boxes drawn on the image
#
# Returns an image with bounding boxes and landmarks drawn on detected faces
# Image is saved to output/visualized-faces.jpg by the API
#
# Usage: ./scripts/visualize-faces.sh <image_path> [show_landmarks] [show_confidence] [api_url]

IMAGE_PATH="$1"
SHOW_LANDMARKS="${2:-true}"
SHOW_CONFIDENCE="${3:-true}"
API_URL="${4:-http://localhost:3000}"

if [ -z "$IMAGE_PATH" ] || [ "$IMAGE_PATH" = "--help" ]; then
  echo "Usage: $0 <image_path> [show_landmarks] [show_confidence] [api_url]"
  echo ""
  echo "Visualize detected faces with bounding boxes and landmarks."
  echo ""
  echo "Arguments:"
  echo "  image_path       Path to image file (required)"
  echo "  show_landmarks   Show facial landmarks: true or false (default: true)"
  echo "  show_confidence  Show confidence percentage: true or false (default: true)"
  echo "  api_url          API base URL (default: http://localhost:3000)"
  echo ""
  echo "Examples:"
  echo "  $0 examples/face1.jpeg"
  echo "  $0 examples/face1.jpeg false"
  echo "  $0 examples/face1.jpeg true false"
  echo ""
  echo "The visualized image will be saved to output/visualized-faces.jpg"
  exit 0
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

echo "Detecting faces and generating visualization..."

# Call API
RESPONSE=$(curl -s -X POST "${API_URL}/api/visualize-faces" \
  -H "Content-Type: application/json" \
  -d "{\"image_base64\": \"${IMAGE_BASE64}\", \"show_landmarks\": ${SHOW_LANDMARKS}, \"show_confidence\": ${SHOW_CONFIDENCE}}")

# Check for errors
if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
  echo "Error: $(echo "$RESPONSE" | jq -r '.error')"
  if echo "$RESPONSE" | jq -e '.message' > /dev/null 2>&1; then
    echo "$(echo "$RESPONSE" | jq -r '.message')"
  fi
  exit 1
fi

# Extract response data
FACE_COUNT=$(echo "$RESPONSE" | jq -r '.face_count')
OUTPUT_PATH=$(echo "$RESPONSE" | jq -r '.output_path')

if [ -z "$OUTPUT_PATH" ] || [ "$OUTPUT_PATH" = "null" ]; then
  echo "Error: Failed to get output path from API"
  exit 1
fi

echo "✓ Detected $FACE_COUNT face(s)"
echo "✓ Visualized image saved to: $OUTPUT_PATH"
echo ""
echo "Response:"
echo "$RESPONSE" | jq '{
  faces: [.faces[] | {
    confidence: .Confidence,
    boundingBox: .PixelBoundingBox,
    landmarks: .Landmarks
  }],
  faceCount: .face_count,
  imageWidth: .ImageWidth,
  imageHeight: .ImageHeight,
  outputPath: .output_path
}'
