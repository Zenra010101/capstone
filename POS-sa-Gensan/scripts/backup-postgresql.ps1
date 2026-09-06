# PostgreSQL backup for GensanPOS (DigitalOcean droplet)
#
# Usage:
#   .\scripts\backup-postgresql.ps1
#   .\scripts\backup-postgresql.ps1 -ConnectionString "Host=...;Database=gensanpos;Username=...;Password=..."
#
# Requires: pg_dump on PATH (install postgresql-client on the droplet)
#
# Schedule daily via cron (Linux droplet):
#   0 2 * * * /usr/bin/pg_dump "$DATABASE_URL" -Fc -f /var/backups/gensanpos-$(date +\%F).dump

param(
    [string]$ConnectionString = $env:GENSANPOS_DB_CONNECTION,
    [string]$OutDir = "backups",
    [int]$KeepDays = 14
)

$ErrorActionPreference = "Stop"

if (-not $ConnectionString) {
    $appsettings = Join-Path $PSScriptRoot "..\backend\GensanPOS.API\appsettings.Production.json"
    if (Test-Path $appsettings) {
        $json = Get-Content $appsettings -Raw | ConvertFrom-Json
        $ConnectionString = $json.ConnectionStrings.DefaultConnection
    }
}

if (-not $ConnectionString) {
    Write-Error "Set -ConnectionString or GENSANPOS_DB_CONNECTION, or create appsettings.Production.json"
}

$root = Split-Path -Parent $PSScriptRoot
$backupDir = Join-Path $root $OutDir
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

$stamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
$outFile = Join-Path $backupDir "gensanpos-$stamp.dump"

Write-Host "Backing up to $outFile ..."
& pg_dump $ConnectionString -Fc -f $outFile
if ($LASTEXITCODE -ne 0) {
    Write-Error "pg_dump failed (exit $LASTEXITCODE)"
}

Write-Host "Backup complete: $outFile ($((Get-Item $outFile).Length / 1MB | ForEach-Object { '{0:N1}' -f $_ }) MB)"

Get-ChildItem $backupDir -Filter "gensanpos-*.dump" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays) } |
    ForEach-Object {
        Write-Host "Removing old backup $($_.Name)"
        Remove-Item $_.FullName -Force
    }

Write-Host ""
Write-Host "Restore example:"
Write-Host "  pg_restore -d `"`$DATABASE_URL`" --clean --if-exists $outFile"
