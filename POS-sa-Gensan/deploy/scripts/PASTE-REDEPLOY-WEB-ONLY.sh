#!/usr/bin/env bash
# Fix login: redeploy frontend only (same-origin API).
# Requires: /tmp/gensanpos-release.tar.gz on server
set -euo pipefail
TARBALL="/tmp/gensanpos-release.tar.gz"
[[ -f "${TARBALL}" ]] || { echo "Missing ${TARBALL} - upload new tarball from PC first"; exit 1; }
TMP="$(mktemp -d)"
tar -xzf "${TARBALL}" -C "${TMP}"
rsync -a --delete "${TMP}/gensanpos-release/web/" /var/www/gensanpos/web/
chown -R www-data:www-data /var/www/gensanpos/web
rm -rf "${TMP}"
systemctl restart gensanpos-web
sleep 2
curl -sf -o /dev/null -w "Web: %{http_code}\n" http://127.0.0.1:3000/
echo "Done. Hard-refresh browser (Ctrl+Shift+R): http://157.245.144.237/login"
