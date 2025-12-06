#!/bin/bash
# Get database statistics

API_URL=${1:-"http://localhost:3000"}

echo "Getting database statistics..."
echo "API: $API_URL/api/management/stats"
echo ""

curl -s "$API_URL/api/management/stats" | jq '.'

echo ""
echo "✓ Statistics retrieved"
