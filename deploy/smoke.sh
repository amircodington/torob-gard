#!/bin/sh
# Exit non-zero unless both health checks answer 2xx. Usage: deploy/smoke.sh [base-url]
# SMOKE_INSECURE=1 accepts a self-signed certificate (local prod compose).
base="${1:-https://localhost}"
k=""; [ "${SMOKE_INSECURE:-0}" = 1 ] && k="-k"
fail=0
for path in /api/health /agent/health; do
  if curl -fsS $k --max-time 10 -o /dev/null "$base$path"; then echo "ok   $path"; else echo "FAIL $path"; fail=1; fi
done
exit $fail
