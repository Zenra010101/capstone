# Re-run server deploy only (tarball already in /tmp). No re-upload.
$ErrorActionPreference = "Stop"
$Ip = "157.245.144.237"
$ServerScript = Join-Path $PSScriptRoot "phase1-server-deploy.sh"

Write-Host "==> Upload fixed server script only"
scp $ServerScript ("root@{0}:/tmp/phase1-server-deploy.sh" -f $Ip)

Write-Host "==> Run deploy on server"
$remoteCmd = "sed -i 's/\r$//' /tmp/phase1-server-deploy.sh && chmod +x /tmp/phase1-server-deploy.sh && bash /tmp/phase1-server-deploy.sh"
ssh ("root@{0}" -f $Ip) $remoteCmd
if ($LASTEXITCODE -ne 0) {
  Write-Host "ERROR: Remote deploy failed (exit $LASTEXITCODE)."
  exit $LASTEXITCODE
}

Write-Host "OK. Check health and legacy smoke tests."
