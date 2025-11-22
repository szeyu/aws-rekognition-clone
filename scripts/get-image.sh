#!/bin/bash
# Get an image path by ID
# Usage: ./scripts/get-image.sh <id> [api_url]

ID="$1"
API_URL="${2:-http://localhost:3000}"

if [ -z "$ID" ]; then
  echo "Usage: ./scripts/get-image.sh <id> [api_url]"
  exit 1
fi

curl -X GET "${API_URL}/api/image/${ID}" | jq '.'

echo ""

