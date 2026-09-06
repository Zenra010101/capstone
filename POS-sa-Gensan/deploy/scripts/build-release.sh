#!/usr/bin/env bash
# Build production release tarball (run on dev machine or CI — not on 1GB droplet if possible).
# Output: dist/gensanpos-release.tar.gz
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIST="${ROOT}/dist"
STAGE="${DIST}/gensanpos-release"
rm -rf "${STAGE}"
mkdir -p "${STAGE}/api" "${STAGE}/web"

echo "==> Publish API"
dotnet publish "${ROOT}/backend/GensanPOS.API/GensanPOS.API.csproj" \
  -c Release -o "${STAGE}/api" \
  /p:UseAppHost=false

echo "==> Build frontend (standalone)"
cd "${ROOT}/frontend"
export NEXT_PUBLIC_API_URL=""
npm ci
npm run build

cp -a .next/standalone/. "${STAGE}/web/"
mkdir -p "${STAGE}/web/.next"
cp -a .next/static "${STAGE}/web/.next/static"
[[ -d public ]] && cp -a public "${STAGE}/web/public"

echo "==> Package"
mkdir -p "${DIST}"
tar -czf "${DIST}/gensanpos-release.tar.gz" -C "${DIST}" gensanpos-release
echo "Created ${DIST}/gensanpos-release.tar.gz"
echo "Upload to server: scp dist/gensanpos-release.tar.gz root@157.245.144.237:/tmp/"
