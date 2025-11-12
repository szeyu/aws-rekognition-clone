#!/bin/bash
# List stored embeddings
# Usage: ./scripts/list.sh [limit] [api_url]

LIMIT="${1:-10}"
API_URL="${2:-http://localhost:3000}"

curl -X GET "${API_URL}/api/list?limit=${LIMIT}" | jq '.'

echo ""

