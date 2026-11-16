#!/usr/bin/env bash
#
# End-to-end smoke test for the nextjs-multivendor-marketplace API.
#
# Walks through the full flow this API is built around: signup → login →
# vendor registration → product creation → order creation → delivery
# update — using real HTTP calls (curl) against a running instance, plus a
# couple of negative checks (no token, wrong role) that confirm the
# authorization rules are actually being enforced.
#
# Usage:
#   ./scripts/smoke-test.sh
#   BASE_URL=http://localhost:3001 ./scripts/smoke-test.sh
#   ADMIN_EMAIL=admin@x.test ADMIN_PASSWORD=secret ./scripts/smoke-test.sh
#
# ADMIN_EMAIL/ADMIN_PASSWORD are optional: signup only allows CUSTOMER/VENDOR
# roles, so an admin account has to already exist (created directly in the
# DB) — and it must be role SUPERADMIN, not ADMIN: by the authorization
# rules, ADMIN can only GET/POST, so the DELETE steps below need SUPERADMIN.
# When not provided, the admin-only steps are skipped rather than failing.
#
# Requires: curl, node (used only to parse JSON responses — no extra deps).

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3001}"
LOG_TOKEN_SECRET="${LOG_TOKEN_SECRET:-}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

# Unique-ish suffix so re-running the script doesn't collide on emails/refs
# that must be unique (email, product reference, vendor name).
SUFFIX="$(date +%s)-$RANDOM"
CUSTOMER_EMAIL="customer.${SUFFIX}@smoketest.local"
VENDOR_EMAIL="vendor.${SUFFIX}@smoketest.local"
PASSWORD="smoketestpass"
PRODUCT_REF="SMOKE-${SUFFIX}"

PASS=0
FAIL=0

# These print to stderr, not stdout: several call sites capture a request's
# JSON body via $(request ...), and stdout is that capture channel — any
# diagnostic noise written there would corrupt the JSON being parsed.
step() { printf '\n\033[1;34m==> %s\033[0m\n' "$1" >&2; }
ok()   { PASS=$((PASS + 1)); printf '  \033[0;32m✓ %s\033[0m\n' "$1" >&2; }
bad()  { FAIL=$((FAIL + 1)); printf '  \033[0;31m✗ %s\033[0m\n' "$1" >&2; }

# Extracts a JSON field from the last response body (read via stdin).
# Usage: json <<<"$body" .token   (dot-path, simple top-level/nested keys)
json() {
  node -e '
    const path = process.argv[1].replace(/^\./, "").split(".").filter(Boolean);
    let data;
    try { data = JSON.parse(require("fs").readFileSync(0, "utf8")); }
    catch { process.exit(1); }
    let v = data;
    for (const key of path) { v = v == null ? undefined : v[key]; }
    if (v === undefined) process.exit(1);
    process.stdout.write(typeof v === "string" ? v : JSON.stringify(v));
  ' "$1"
}

# Performs a request, printing status + body, and asserting the expected
# status code. Prints the response body to stdout so it can be captured.
#   request METHOD PATH EXPECTED_STATUS [TOKEN] [JSON_BODY]
request() {
  local method="$1" path="$2" expected="$3" token="${4:-}" body="${5:-}"
  local args=(-s -o /tmp/smoke_body.$$ -w '%{http_code}' -X "$method" "${BASE_URL}${path}")
  [[ -n "$token" ]] && args+=(-H "authorization: Bearer: TOKEN ${token}")
  [[ -n "$body" ]] && args+=(-H "Content-Type: application/json" -d "$body")

  local status
  status="$(curl "${args[@]}")"
  local resp
  resp="$(cat /tmp/smoke_body.$$)"
  rm -f /tmp/smoke_body.$$

  if [[ "$status" == "$expected" ]]; then
    ok "$method $path -> $status"
  else
    bad "$method $path -> $status (expected $expected): $resp"
  fi
  echo "$resp"
}

step "Health check"
request GET /api/auth 200 >/dev/null

step "Signup"
request POST /api/auth/newaccount 200 "" \
  "{\"email\":\"${CUSTOMER_EMAIL}\",\"password\":\"${PASSWORD}\"}" >/dev/null
request POST /api/auth/newaccount 200 "" \
  "{\"email\":\"${VENDOR_EMAIL}\",\"password\":\"${PASSWORD}\",\"role\":\"VENDOR\"}" >/dev/null

step "Signup rejects a duplicate email"
request POST /api/auth/newaccount 400 "" \
  "{\"email\":\"${CUSTOMER_EMAIL}\",\"password\":\"${PASSWORD}\"}" >/dev/null

step "Login"
CUSTOMER_LOGIN="$(request POST /api/auth 200 "" \
  "{\"email\":\"${CUSTOMER_EMAIL}\",\"password\":\"${PASSWORD}\"}")"
CUSTOMER_TOKEN="$(json .token <<<"$CUSTOMER_LOGIN")"

VENDOR_LOGIN="$(request POST /api/auth 200 "" \
  "{\"email\":\"${VENDOR_EMAIL}\",\"password\":\"${PASSWORD}\"}")"
VENDOR_TOKEN="$(json .token <<<"$VENDOR_LOGIN")"

step "No token / wrong role are actually rejected"
request GET /api/product 401 >/dev/null
request GET /api/user 403 "$CUSTOMER_TOKEN" >/dev/null

step "Vendor registration"
VENDOR_REG="$(request POST /api/vendor/register 200 "$VENDOR_TOKEN" \
  "{\"name\":\"Smoke Test Vendor ${SUFFIX}\",\"description\":\"created by smoke-test.sh\"}")"
VENDOR_ID="$(json .id <<<"$VENDOR_REG")"
echo "  vendor_id=${VENDOR_ID}"

step "Product creation"
PRODUCT_CREATE="$(request POST /api/product 200 "$VENDOR_TOKEN" \
  "{\"reference\":\"${PRODUCT_REF}\",\"title\":\"Smoke Test Product\",\"price\":9.99,\"vendorId\":\"${VENDOR_ID}\"}")"
PRODUCT_ID="$(json .id <<<"$PRODUCT_CREATE")"
echo "  product_id=${PRODUCT_ID}"

step "Product creation rejects a non-existent vendor"
request POST /api/product 404 "$VENDOR_TOKEN" \
  "{\"reference\":\"${PRODUCT_REF}-bad\",\"title\":\"Should fail\",\"price\":1,\"vendorId\":\"does-not-exist\"}" >/dev/null

step "Order creation"
ORDER_CREATE="$(request POST /api/order 200 "$CUSTOMER_TOKEN" \
  "{\"product_list\":[\"${PRODUCT_REF}\"]}")"
ORDER_ID="$(json '0.orderId' <<<"$ORDER_CREATE")"
echo "  order_id=${ORDER_ID}"

step "Order lists are scoped by role"
CUSTOMER_ORDERS="$(request GET /api/order 200 "$CUSTOMER_TOKEN")"
VENDOR_ORDERS="$(request GET /api/order 200 "$VENDOR_TOKEN")"
if [[ "$(json length <<<"$CUSTOMER_ORDERS")" -ge 1 ]]; then ok "customer sees their order"; else bad "customer order list is empty"; fi
if [[ "$(json length <<<"$VENDOR_ORDERS")" -ge 1 ]]; then ok "vendor sees the order against their vendor"; else bad "vendor order list is empty"; fi

step "Vendor updates delivery status"
request PUT "/api/order/${ORDER_ID}/updateDelivery" 200 "$VENDOR_TOKEN" \
  "{\"status\":\"shipped\",\"deliveryDate\":\"2026-12-01\"}" >/dev/null

if [[ -n "$LOG_TOKEN_SECRET" ]]; then
  step "Log entry (LOG_TOKEN_SECRET provided)"
  request POST /api/logs 200 "$LOG_TOKEN_SECRET" \
    "{\"level\":\"debug\",\"message\":\"smoke-test.sh run ${SUFFIX}\",\"timestamp\":\"$(date -Iseconds)\"}" >/dev/null
else
  step "Log entry — skipped (set LOG_TOKEN_SECRET to exercise /api/logs)"
fi

if [[ -n "$ADMIN_EMAIL" && -n "$ADMIN_PASSWORD" ]]; then
  step "Admin-only steps (ADMIN_EMAIL/ADMIN_PASSWORD provided — must be role SUPERADMIN)"
  ADMIN_LOGIN="$(request POST /api/auth 200 "" \
    "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")"
  ADMIN_TOKEN="$(json .token <<<"$ADMIN_LOGIN")"
  request GET /api/user 200 "$ADMIN_TOKEN" >/dev/null
  # Only ADMIN/SUPERADMIN can reach the detail-view endpoints below: the
  # CUSTOMER/VENDOR permission rules only match the collection paths
  # ("/api/vendor", "/api/product", "/api/order") exactly, not "/{id}".
  request GET "/api/vendor/${VENDOR_ID}" 200 "$ADMIN_TOKEN" >/dev/null
  request GET "/api/product/${PRODUCT_ID}" 200 "$ADMIN_TOKEN" >/dev/null
  request GET "/api/order/${ORDER_ID}" 200 "$ADMIN_TOKEN" >/dev/null
  # Cleanup order matters: Vendor is referenced by both Order and Product
  # (RESTRICT FK), so those have to go first or the vendor delete 400s with
  # a foreign-key ValidationError.
  request DELETE "/api/order/${ORDER_ID}" 200 "$ADMIN_TOKEN" >/dev/null
  request DELETE "/api/product/${PRODUCT_ID}" 200 "$ADMIN_TOKEN" >/dev/null
  request DELETE "/api/vendor/${VENDOR_ID}" 200 "$ADMIN_TOKEN" >/dev/null
else
  step "Admin-only steps — skipped (set ADMIN_EMAIL/ADMIN_PASSWORD to exercise them)"
  echo "  Note: by the current authorization rules, GET/DELETE on /api/{vendor,product,order}/{id}"
  echo "  is only reachable by ADMIN/SUPERADMIN — CUSTOMER/VENDOR rules match the collection"
  echo "  path exactly, not the /{id} detail path. Not exercised here without an admin account."
fi

echo
printf 'Results: \033[0;32m%d passed\033[0m, \033[0;31m%d failed\033[0m\n' "$PASS" "$FAIL"
[[ "$FAIL" -eq 0 ]]
