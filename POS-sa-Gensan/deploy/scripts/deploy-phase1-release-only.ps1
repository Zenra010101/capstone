# Build with build-release.ps1 first, then run this script.
# Uploads the local tarball + deploy script, then deploys on the server.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Tarball = Join-Path $Root "dist\gensanpos-release.tar.gz"
$Ip = "157.245.144.237"
$ServerScript = Join-Path $PSScriptRoot "phase1-server-release-only.sh"

# Keep SSH alive during large uploads; retry transient "Connection closed" drops.
$ScpSshOpts = @(
  "-o", "ConnectTimeout=30",
  "-o", "ServerAliveInterval=15",
  "-o", "ServerAliveCountMax=8",
  "-o", "TCPKeepAlive=yes"
)

function Invoke-ScpWithRetry {
  param(
    [string]$LocalPath,
    [string]$RemoteDest,
    [int]$MaxAttempts = 5
  )
  for ($i = 1; $i -le $MaxAttempts; $i++) {
    Write-Host "    attempt $i/$MaxAttempts ..."
    & scp @ScpSshOpts $LocalPath $RemoteDest
    if ($LASTEXITCODE -eq 0) { return }
    if ($i -lt $MaxAttempts) {
      $wait = [Math]::Min(30, 5 * $i)
      Write-Host "    scp failed (exit $LASTEXITCODE). Waiting ${wait}s before retry ..."
      Start-Sleep -Seconds $wait
    }
  }
  return $LASTEXITCODE
}

if (-not (Test-Path $Tarball)) {
  Write-Error "Missing $Tarball - run .\deploy\scripts\build-release.ps1 first"
}

$localSize = (Get-Item $Tarball).Length
$localTime = (Get-Item $Tarball).LastWriteTime
Write-Host "==> Local tarball: $Tarball"
Write-Host "    Size: $([math]::Round($localSize / 1MB, 2)) MB  Modified: $localTime"

Write-Host "==> Upload tarball (required - deploy uses /tmp/gensanpos-release.tar.gz)"
$tarDest = "root@{0}:/tmp/gensanpos-release.tar.gz" -f $Ip
Invoke-ScpWithRetry -LocalPath $Tarball -RemoteDest $tarDest
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "TROUBLESHOOTING (scp Connection closed):"
  Write-Host "  1. Test SSH:  ssh root@$Ip echo ok"
  Write-Host "  2. Retry in 1-2 minutes (droplet SSH rate limit or brief network drop)"
  Write-Host "  3. Use another network (mobile hotspot) or VPN off/on"
  Write-Host "  4. Upload only, then deploy when scp succeeds:"
  Write-Host "       scp @ScpSshOpts `"$Tarball`" $tarDest"
  Write-Host "       .\deploy\scripts\deploy-phase1-release-only.ps1"
  Write-Host "  5. DigitalOcean web console: upload via SFTP client (WinSCP) to /tmp/gensanpos-release.tar.gz"
  Write-Error "scp failed after retries - server still has the OLD bundle."
}

Write-Host "==> Upload release-only script"
$scriptDest = "root@{0}:/tmp/phase1-server-release-only.sh" -f $Ip
Invoke-ScpWithRetry -LocalPath $ServerScript -RemoteDest $scriptDest -MaxAttempts 3
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Deploy on server"
$remoteCmd = 'sed -i ''s/\r$//'' /tmp/phase1-server-release-only.sh && chmod +x /tmp/phase1-server-release-only.sh && bash /tmp/phase1-server-release-only.sh'
& ssh @ScpSshOpts ("root@{0}" -f $Ip) $remoteCmd
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "OK. Hard-refresh http://$Ip/ (Ctrl+F5)."
