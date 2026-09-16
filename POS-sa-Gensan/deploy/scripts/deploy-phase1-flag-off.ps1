# Phase 1 production deploy - flag OFF (run from Windows in repo root)
# Requires: SSH access to droplet (password or key)
$ErrorActionPreference = "Stop"
$Ip = "157.245.144.237"
$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Tarball = Join-Path $Root "dist\gensanpos-release.tar.gz"
$ServerScript = Join-Path $PSScriptRoot "phase1-server-deploy.sh"

Write-Host "==> Build release (if missing)"
if (-not (Test-Path $Tarball)) {
  & (Join-Path $Root "deploy\scripts\build-release.ps1")
}

Write-Host "==> Upload tarball and server script (enter SSH password if prompted)"
scp $Tarball ("root@{0}:/tmp/gensanpos-release.tar.gz" -f $Ip)
scp $ServerScript ("root@{0}:/tmp/phase1-server-deploy.sh" -f $Ip)

Write-Host ""
Write-Host "==> Run deploy on server (enter SSH password again if prompted)"
$remoteCmd = "sed -i 's/\r$//' /tmp/phase1-server-deploy.sh && chmod +x /tmp/phase1-server-deploy.sh && bash /tmp/phase1-server-deploy.sh"
ssh ("root@{0}" -f $Ip) $remoteCmd

Write-Host ""
Write-Host "Done. Open http://$Ip/ and run legacy GRS smoke tests."
Write-Host "Checklist: docs/DEPLOY-PHASE1-PRODUCTION.md section 7"
