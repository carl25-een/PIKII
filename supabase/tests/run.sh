#!/usr/bin/env bash
# Applies the migrations and seed to a throwaway local Postgres and runs the parcel journey test.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
bin="$(ls -d /usr/lib/postgresql/*/bin | tail -1)"
dir="$(mktemp -d)"
trap '"$bin/pg_ctl" -D "$dir" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$dir"' EXIT
"$bin/initdb" -D "$dir" -U postgres >/dev/null
"$bin/pg_ctl" -D "$dir" -o "-k $dir -p 54329 -c listen_addresses=''" -l "$dir/log" start >/dev/null
psql=(psql -h "$dir" -p 54329 -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${psql[@]}" -f "$here/stub_auth.sql"
for f in "$here"/../migrations/*.sql; do "${psql[@]}" -f "$f"; done
"${psql[@]}" -f "$here/../seed.sql"
"${psql[@]}" -f "$here/flow.sql"
echo "db flow test passed"
