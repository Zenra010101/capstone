# Upload and run backup verification on the production server.
#
# Usage:
#   .\deploy\scripts\verify-backup.ps1
#   .\deploy\scripts\verify-backup.ps1 -Create
#   .\deploy\scripts\verify-backup.ps1 -Create -RestoreTest

param(
  [switch]$Create,
  [switch]$RestoreTest,
  [string]$Server = "root@157.245.144.237",
  [string]$RemoteDir = "/tmp/gensanpos-reset-scripts"
)

$ErrorActionPreference = "Stop"
$ScpSshOpts = @(
  "-o", "ConnectTimeout=30",
  "-o", "ServerAliveInterval=15",
  "-o", "ServerAliveCountMax=8",
  "-o", "TCPKeepAlive=yes"
)

$local = Join-Path $PSScriptRoot "verify-backup.sh"
if (-not (Test-Path $local)) { throw "Missing $local" }

$bytes = [System.IO.File]::ReadAllBytes($local)
$text = [System.Text.Encoding]::UTF8.GetString($bytes) -replace "`r`n", "`n" -replace "`r", "`n"
$temp = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "verify-backup.sh")
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($temp, $text, $utf8NoBom)

try {
  & ssh @ScpSshOpts $Server "mkdir -p '${RemoteDir}'"
  if ($LASTEXITCODE -ne 0) { throw "ssh mkdir failed" }
  & scp @ScpSshOpts $temp "${Server}:${RemoteDir}/verify-backup.sh"
  if ($LASTEXITCODE -ne 0) { throw "scp failed" }
  & ssh @ScpSshOpts $Server "sed -i 's/\r$//' '${RemoteDir}/verify-backup.sh' && chmod +x '${RemoteDir}/verify-backup.sh'"

  $flags = @()
  if ($Create) { $flags += "--create" }
  if ($RestoreTest) { $flags += "--restore-test" }
  $flagStr = ($flags -join " ")

  & ssh @ScpSshOpts $Server "sudo bash '${RemoteDir}/verify-backup.sh' ${flagStr}"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  if (Test-Path $temp) { Remove-Item -Force $temp }
}
