# Helper: build release and print exact commands for IP deploy.
# Usage: .\deploy-ip-from-windows.ps1
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Ip = "157.245.144.237"

Write-Host "==> Building release..." -ForegroundColor Cyan
& (Join-Path $PSScriptRoot "build-release.ps1")

$tarball = Join-Path $Root "dist\gensanpos-release.tar.gz"
if (-not (Test-Path $tarball)) {
  Write-Host "Build failed — tarball missing." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "==> Upload tarball:" -ForegroundColor Green
Write-Host "scp `"$tarball`" root@${Ip}:/tmp/"
Write-Host ""
Write-Host "==> SSH and run (copy/paste):" -ForegroundColor Green
@"

ssh root@${Ip}

# If repo not on server yet:
# git clone <YOUR_REPO_URL> /opt/gensanpos && cd /opt/gensanpos && chmod +x deploy/scripts/*.sh

cd /opt/gensanpos
bash deploy/scripts/01-server-bootstrap.sh
bash deploy/scripts/00-generate-env.sh ${Ip}
bash deploy/scripts/02-setup-postgresql.sh
bash deploy/scripts/03-deploy-release.sh /tmp/gensanpos-release.tar.gz
bash deploy/scripts/04-configure-nginx-ip.sh
bash deploy/scripts/05-install-backup-cron.sh
bash deploy/scripts/07-harden-accounts.sh

"@ | Write-Host

Write-Host "Open: http://${Ip}/" -ForegroundColor Cyan
