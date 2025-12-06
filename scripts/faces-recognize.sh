#!/bin/bash

# Script to test POST /faces/recognize endpoint
# Usage: ./scripts/faces-recognize.sh <face_id> [api_url]

set -euo pipefail

FACE_ID="${1:-}"
API_URL="${2:-http://localhost:3000}"

if [ -z "$FACE_ID" ]; then
  echo "Usage: $0 <face_id> [api_url]"
  echo "Example: $0 abc123-def456-ghi789"
  exit 1
fi

echo "Recognizing face: $FACE_ID"
echo "API: $API_URL/api/faces/recognize"
echo ""

# Build JSON payload
PAYLOAD=$(jq -n \
  --arg face_id "$FACE_ID" \
  '{face_id: $face_id}')

# Send recognition request
curl -X POST "$API_URL/api/faces/recognize" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  | jq .

echo ""
echo "✓ Recognition complete"
