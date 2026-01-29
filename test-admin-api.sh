#!/bin/bash

# Admin API 테스트 스크립트
# Usage: ./test-admin-api.sh

API_URL="http://localhost:3001/api/admin/shop-content"

# 예제 1: 158번 샵, 50% 유저, 1위로 변경
echo "📝 Example 1: 158번 샵, 50% 유저를 1위로 변경"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": 158,
    "percentage": 50,
    "rank": 1,
    "satisfaction": "good"
  }' | jq

echo -e "\n\n"

# 예제 2: 5043번 샵, 100% 유저, 1위로 변경
echo "📝 Example 2: 5043번 샵, 100% 유저를 1위로 변경"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": 5043,
    "percentage": 100,
    "rank": 1,
    "satisfaction": "good"
  }' | jq

echo -e "\n\n"

# 예제 3: 특정 샵, 30% 유저, 5위로 변경
echo "📝 Example 3: 특정 샵, 30% 유저를 5위로 변경"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": 209,
    "percentage": 30,
    "rank": 5,
    "satisfaction": "good"
  }' | jq
