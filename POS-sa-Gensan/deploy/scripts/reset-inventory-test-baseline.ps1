# Run inventory test reset dry-run or execute on the server via SSH.
# Scripts are uploaded to /tmp/gensanpos-reset-scripts (no /opt/gensanpos repo required).
#
# Usage:
#   .\deploy\scripts\reset-inventory-test-baseline.ps1 -Mode dry-run
#   .\deploy\scripts\reset-inventory-test-baseline.ps1 -Mode execute
#
# execute opens an interactive SSH session (you must type RESET-TEST on the server).
param(
  [ValidateSet("dry-run", "execute")]
  [string]$Mode = "dry-run",
  [string]$Server = "root@157.245.144.237",
  [string]$RemoteScriptsDir = "/tmp/gensanpos-reset-scripts"
)

$ErrorActionPreference = "Stop"
$ScpSshOpts = @(
  "-o", "ConnectTimeout=30",
  "-o", "ServerAliveInterval=15",
  "-o", "ServerAliveCountMax=8",
  "-o", "TCPKeepAlive=yes"
)

$files = @(
  "reset-inventory-dry-run.sql",
  "reset-inventory-wipe-transactional.sql",
  "reset-inventory-seed-test-opening.sql",
  "reset-inventory-test-baseline.sh",
  "reset-inventory-go-live-wipe.sh"
)

function ConvertTo-UnixLineEndings {
  param([string]$Path)
  $bytes = [System.IO.File]::ReadAllBytes($Path)
  $text = [System.Text.Encoding]::UTF8.GetString($bytes)
  $text = $text -replace "`r`n", "`n" -replace "`r", "`n"
  $temp = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), [System.IO.Path]::GetRandomFileName())
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($temp, $text, $utf8NoBom)
  return $temp
}

Write-Host "==> Preparing remote directory ${Server}:${RemoteScriptsDir}"
& ssh @ScpSshOpts $Server "mkdir -p '${RemoteScriptsDir}'"
if ($LASTEXITCODE -ne 0) { throw "ssh mkdir failed" }

Write-Host "==> Uploading reset scripts (Unix line endings for .sh)"
$tempFiles = @()
try {
  foreach ($name in $files) {
    $local = Join-Path $PSScriptRoot $name
    if (-not (Test-Path $local)) { throw "Missing $local" }

    $uploadPath = $local
    if ($name -like "*.sh") {
      $uploadPath = ConvertTo-UnixLineEndings -Path $local
      $tempFiles += $uploadPath
    }

    & scp @ScpSshOpts $uploadPath "${Server}:${RemoteScriptsDir}/${name}"
    if ($LASTEXITCODE -ne 0) { throw "scp failed for $name" }
  }
} finally {
  foreach ($t in $tempFiles) {
    if (Test-Path $t) { Remove-Item -Force $t }
  }
}

Write-Host "==> Normalizing shell scripts on server"
& ssh @ScpSshOpts $Server "sed -i 's/\r$//' '${RemoteScriptsDir}'/*.sh && chmod +x '${RemoteScriptsDir}'/*.sh"
if ($LASTEXITCODE -ne 0) { throw "remote sed/chmod failed" }

$remoteScript = "${RemoteScriptsDir}/reset-inventory-test-baseline.sh"
$remoteCmd = "sudo bash '${remoteScript}' ${Mode}"

Write-Host "==> Running on server: $Mode"
if ($Mode -eq "execute") {
  Write-Host "    Interactive session - type RESET-TEST when prompted."
  & ssh -t @ScpSshOpts $Server $remoteCmd
} else {
  & ssh @ScpSshOpts $Server $remoteCmd
}
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
