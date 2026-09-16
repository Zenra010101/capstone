# Upload accessories-catalog.csv to production and print server import command.
#
# Usage:
#   .\scripts\upload-accessories-catalog.ps1
#   .\scripts\upload-accessories-catalog.ps1 -Server root@157.245.144.237

param(
    [string]$Server = "root@157.245.144.237"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$csv = Join-Path $root "backend\data\accessories-catalog.csv"

if (-not (Test-Path $csv)) {
    Write-Error "Missing $csv — run: node backend\data\generate-accessories-catalog.mjs"
}

$remoteDir = "/var/lib/gensanpos/catalog"
$remoteFile = "$remoteDir/accessories-catalog.csv"

Write-Host "Uploading accessories catalog to $Server ..."
ssh $Server "mkdir -p $remoteDir; chown www-data:www-data $remoteDir"
scp $csv "${Server}:${remoteFile}"
ssh $Server "chown www-data:www-data $remoteFile"

Write-Host ""
Write-Host "Uploaded to $remoteFile"
Write-Host ""
Write-Host "On the server, run:"
Write-Host "  bash /opt/gensanpos/deploy/scripts/import-catalog.sh $remoteFile --no-archive"
Write-Host ""
Write-Host "See deploy/DEPLOY-IP.md section 9 if import-catalog.sh is not on the server yet."
