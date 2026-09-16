# Import the client's real product catalog into GensanPOS.
# Archives existing products by default, then imports from CSV or Excel.
#
# Usage:
#   .\scripts\import-product-catalog.ps1 -File "D:\client\products.csv"
#   .\scripts\import-product-catalog.ps1 -File ".\products.xlsx" -DryRun
#   .\scripts\import-product-catalog.ps1 -File ".\products.csv" -ArchiveDemoOnly

param(
    [Parameter(Mandatory = $true)]
    [string]$File,

    [switch]$DryRun,
    [switch]$ArchiveDemoOnly,
    [switch]$NoArchive,
    [switch]$NoUpsert,
    [switch]$UpdateStock
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

$apiProject = Join-Path $root "backend\GensanPOS.API\GensanPOS.API.csproj"
if (-not (Test-Path $apiProject)) {
    Write-Error "API project not found at $apiProject"
}

$resolvedFile = Resolve-Path -LiteralPath $File
$args = @("run", "--project", $apiProject, "--", "catalog-import", "--file", $resolvedFile)

if ($DryRun) { $args += "--dry-run" }
if ($ArchiveDemoOnly) { $args += "--archive-demo" }
elseif (-not $NoArchive) { $args += "--archive-all" }
if ($NoArchive) { $args += "--no-archive" }
if ($NoUpsert) { $args += "--no-upsert" }
if ($UpdateStock) { $args += "--update-stock" }

Write-Host "Running catalog import..."
Write-Host "  File: $resolvedFile"
Write-Host ""

Push-Location (Join-Path $root "backend\GensanPOS.API")
try {
    dotnet @args
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
