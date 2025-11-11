#!/bin/bash

# Test script for ArcFace API endpoints
# Usage: ./test-api.sh [base_url]
# Example: ./test-api.sh http://localhost:3000

BASE_URL="${1:-http://localhost:3000}"
API_URL="${BASE_URL}/api"

echo "Testing ArcFace API at ${API_URL}"
echo "=================================="
echo ""

# Helper function to convert image to base64
# Usage: image_to_base64 <image_path>
image_to_base64() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    base64 -i "$1"
  else
    # Linux
    base64 -w 0 "$1"
  fi
}

# Create a simple 1x1 pixel PNG for testing (if no image provided)
create_test_image() {
  # This creates a minimal valid PNG (1x1 red pixel)
  # In production, you'd use an actual face image
  echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
}

# Get base64 image (from file or use test image)
if [ -f "$2" ]; then
  IMAGE_BASE64=$(image_to_base64 "$2")
  echo "Using image: $2"
else
  IMAGE_BASE64=$(create_test_image)
  echo "Using test 1x1 pixel image (for real testing, provide a face image as 2nd argument)"
fi

echo ""
echo "1. Testing POST /api/store_embedding"
echo "-------------------------------------"
STORE_RESPONSE=$(curl -s -X POST "${API_URL}/store_embedding" \
  -H "Content-Type: application/json" \
  -d "{\"image_base64\": \"${IMAGE_BASE64}\"}")
echo "Response: $STORE_RESPONSE"
STORED_ID=$(echo "$STORE_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "Stored ID: $STORED_ID"
echo ""

if [ -z "$STORED_ID" ]; then
  echo "ERROR: Failed to store embedding. Check if the API is running."
  exit 1
fi

echo "2. Testing GET /api/list"
echo "------------------------"
curl -s -X GET "${API_URL}/list?limit=5" | jq '.' || curl -s -X GET "${API_URL}/list?limit=5"
echo ""
echo ""

echo "3. Testing GET /api/image/:id"
echo "-----------------------------"
curl -s -X GET "${API_URL}/image/${STORED_ID}" | jq '.' || curl -s -X GET "${API_URL}/image/${STORED_ID}"
echo ""
echo ""

echo "4. Testing POST /api/compare"
echo "-----------------------------"
COMPARE_RESPONSE=$(curl -s -X POST "${API_URL}/compare" \
  -H "Content-Type: application/json" \
  -d "{\"image_base64_A\": \"${IMAGE_BASE64}\", \"image_base64_B\": \"${IMAGE_BASE64}\"}")
echo "Response: $COMPARE_RESPONSE"
echo ""

echo "5. Testing POST /api/search"
echo "---------------------------"
SEARCH_RESPONSE=$(curl -s -X POST "${API_URL}/search" \
  -H "Content-Type: application/json" \
  -d "{\"image_base64\": \"${IMAGE_BASE64}\", \"top_k\": 5}")
echo "Response: $SEARCH_RESPONSE"
echo ""

echo "6. Testing DELETE /api/item/:id"
echo "--------------------------------"
DELETE_RESPONSE=$(curl -s -X DELETE "${API_URL}/item/${STORED_ID}")
echo "Response: $DELETE_RESPONSE"
echo ""

echo "=================================="
echo "All tests completed!"
echo ""
echo "To test with your own image:"
echo "  ./test-api.sh http://localhost:3000 /path/to/your/image.jpg"

