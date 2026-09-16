# Client production catalog — regenerate and import
#
# 1) Regenerate CSV from price-list source data:
#    .\scripts\generate-client-catalog.ps1
#
# 2) Preview import (no DB writes):
#    .\scripts\import-product-catalog.ps1 -File "backend\data\client-production-catalog.csv" -DryRun
#
# 3) Go-live import (archives all active products, loads real catalog):
#    .\scripts\import-product-catalog.ps1 -File "backend\data\client-production-catalog.csv"
#
# PostgreSQL: set ConnectionStrings:DefaultConnection in appsettings before import.

param(
    [switch]$RegenerateOnly,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$catalog = Join-Path $root "backend\data\client-production-catalog.csv"

& (Join-Path $PSScriptRoot "generate-client-catalog.ps1")

if ($RegenerateOnly) { exit 0 }

$importArgs = @("-File", $catalog)
if ($DryRun) { $importArgs += "-DryRun" }

& (Join-Path $PSScriptRoot "import-product-catalog.ps1") @importArgs
