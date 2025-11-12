#!/bin/bash
# Delete an embedding by ID
# Usage: ./scripts/delete.sh <id> [api_url]

ID="$1"
API_URL="${2:-http://localhost:3000}"

if [ -z "$ID" ]; then
  echo "Usage: ./scripts/delete.sh <id> [api_url]"
  exit 1
fi

curl -X DELETE "${API_URL}/api/item/${ID}" | jq '.'

echo ""

