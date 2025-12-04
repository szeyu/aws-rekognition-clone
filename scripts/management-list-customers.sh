#!/bin/bash
# List all enrolled customers with pagination

LIMIT=${1:-50}
OFFSET=${2:-0}
API_URL=${3:-"http://localhost:3000"}

echo "Listing enrolled customers..."
echo "Limit: $LIMIT, Offset: $OFFSET"
echo "API: $API_URL/api/management/customers"
echo ""

curl -s "$API_URL/api/management/customers?limit=$LIMIT&offset=$OFFSET" | jq '.'

echo ""
echo "✓ Customer list retrieved"
