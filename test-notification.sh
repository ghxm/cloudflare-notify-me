#!/bin/bash

# Test script for the notification endpoint
# Usage: ./test-notification.sh [worker-url] [auth-token]

WORKER_URL=${1:-"http://localhost:8787"}
AUTH_TOKEN=${2:-"tiger"}

echo "Testing notification endpoint at: $WORKER_URL"

# Test 1: Basic notification without auth
echo "Test 1: Basic notification (no auth)..."
curl -X POST "$WORKER_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Another Test Alert",
    "message": "This is a test notification from the test script.",
    "recipients": ["personal"]
  }' \
  -w "\nHTTP Status: %{http_code}\n\n"

# Test 2: Notification with auth (if token provided)
if [ ! -z "$AUTH_TOKEN" ]; then
  echo "Test 2: Authenticated notification..."
  curl -X POST "$WORKER_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: $AUTH_TOKEN" \
    -d '{
      "subject": "Authenticated Test",
      "message": "This notification was sent with authentication.",
      "recipients": ["work", "personal"]
    }' \
    -w "\nHTTP Status: %{http_code}\n\n"
fi

# Test 3: Group notification
echo "Test 3: Group notification..."
curl -X POST "$WORKER_URL" \
  -H "Content-Type: application/json" \
  $([ ! -z "$AUTH_TOKEN" ] && echo "-H \"Authorization: $AUTH_TOKEN\"") \
  -d '{
    "subject": "Another Group Alert",
    "message": "This alert is being sent to the \"all\" group.",
    "recipients": ["all"]
  }' \
  -w "\nHTTP Status: %{http_code}\n\n"

# Test 4: Invalid request (missing subject)
echo "Test 4: Invalid request (missing subject)..."
curl -X POST "$WORKER_URL" \
  -H "Content-Type: application/json" \
  $([ ! -z "$AUTH_TOKEN" ] && echo "-H \"Authorization: $AUTH_TOKEN\"") \
  -d '{
    "message": "This request is missing a subject.",
    "recipients": ["personal"]
  }' \
  -w "\nHTTP Status: %{http_code}\n\n"

# Test 5: OPTIONS request (CORS preflight)
echo "Test 5: CORS preflight (OPTIONS)..."
curl -X OPTIONS "$WORKER_URL" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n\n"

echo "Testing complete!"