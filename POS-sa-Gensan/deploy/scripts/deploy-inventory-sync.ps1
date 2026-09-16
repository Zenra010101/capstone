# Build + deploy inventory sync fix + run reconcile on production.
# Requires SSH access to root@157.245.144.237 (password or key).
# Usage: .\deploy\scripts\deploy-inventory-sync.ps1 [-SkipBuild]
param([switch]$SkipBuild)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Ip = "157.245.144.237"
$Tarball = Join-Path $Root "dist\gensanpos-release.tar.gz"
$ReconcileSql = Join-Path $Root "deploy\scripts\reconcile-product-stock-from-batches.sql"
$ReleaseScript = Join-Path $PSScriptRoot "phase1-server-release-only.sh"
$ReconcileScript = Join-Path $PSScriptRoot "phase1-server-inventory-reconcile.sh"

$ScpSshOpts = @(
  "-o", "ConnectTimeout=30",
  "-o", "ServerAliveInterval=15",
  "-o", "ServerAliveCountMax=8",
  "-o", "TCPKeepAlive=yes"
)

if (-not $SkipBuild) {
  Write-Host "==> Build release (API includes ProductBatchStockHelper fix)"
  & (Join-Path $PSScriptRoot "build-release.ps1")
}
if (-not (Test-Path $Tarball)) { Write-Error "Build failed - tarball missing" }

Write-Host "==> Upload tarball"
& scp @ScpSshOpts $Tarball "root@${Ip}:/tmp/gensanpos-release.tar.gz"
if ($LASTEXITCODE -ne 0) { Write-Error "scp tarball failed" }

Write-Host "==> Upload deploy + reconcile scripts"
& scp @ScpSshOpts $ReleaseScript "root@${Ip}:/tmp/phase1-server-release-only.sh"
& scp @ScpSshOpts $ReconcileScript "root@${Ip}:/tmp/phase1-server-inventory-reconcile.sh"
& scp @ScpSshOpts $ReconcileSql "root@${Ip}:/tmp/reconcile-product-stock-from-batches.sql"
if ($LASTEXITCODE -ne 0) { Write-Error "scp scripts failed" }

Write-Host "==> Deploy API + web on server"
$deployCmd = 'sed -i ''s/\r$//'' /tmp/phase1-server-release-only.sh /tmp/phase1-server-inventory-reconcile.sh && chmod +x /tmp/phase1-server-release-only.sh /tmp/phase1-server-inventory-reconcile.sh && bash /tmp/phase1-server-release-only.sh'
& ssh @ScpSshOpts "root@$Ip" $deployCmd
if ($LASTEXITCODE -ne 0) { Write-Error "API deploy failed" }

Write-Host "==> Backup DB + reconcile stock + verify SS Angle Bar"
$reconcileCmd = 'bash /tmp/phase1-server-inventory-reconcile.sh'
& ssh @ScpSshOpts "root@$Ip" $reconcileCmd
if ($LASTEXITCODE -ne 0) { Write-Error "Reconcile failed" }

Write-Host ""
Write-Host "DONE. Inventory sync fix deployed and stock reconciled."
Write-Host "Hard-refresh http://${Ip}/ and verify SS Angle Bar in Products."
