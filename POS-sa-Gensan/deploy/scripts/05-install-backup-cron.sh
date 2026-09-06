#!/usr/bin/env bash
# Install daily PostgreSQL backup cron (02:00 UTC).
set -euo pipefail

if [[ "${EUID:-0}" -ne 0 ]]; then
  echo "Run as root"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
install -m 755 "${SCRIPT_DIR}/backup-database.sh" /usr/local/bin/gensanpos-backup

cat > /etc/cron.d/gensanpos-backup <<'EOF'
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
0 2 * * * root /usr/local/bin/gensanpos-backup >> /var/log/gensanpos-backup.log 2>&1
EOF

chmod 644 /etc/cron.d/gensanpos-backup
touch /var/log/gensanpos-backup.log
chmod 640 /var/log/gensanpos-backup.log

echo "Backup cron installed (daily 02:00 UTC)."
echo "Test now: /usr/local/bin/gensanpos-backup"
