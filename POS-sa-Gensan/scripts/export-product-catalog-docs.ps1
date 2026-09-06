# Regenerate CSV/XLSX/MD exports for the production product catalog.
# Run after price-list changes or before go-live import.
#
# Usage:
#   .\scripts\export-product-catalog-docs.ps1
#   .\scripts\export-product-catalog-docs.ps1 -SkipRegenerate   # export MD/XLSX from existing CSV only

param(
    [switch]$SkipRegenerate
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dataDir = Join-Path $root "backend\data"
$csv = Join-Path $dataDir "client-production-catalog.csv"
$xlsx = Join-Path $dataDir "client-production-catalog.xlsx"
$md = Join-Path $dataDir "client-production-catalog.md"
$apiProject = Join-Path $root "backend\GensanPOS.API\GensanPOS.API.csproj"

if (-not $SkipRegenerate) {
    & (Join-Path $PSScriptRoot "generate-client-catalog.ps1")
}

if (-not (Test-Path $csv)) {
    Write-Error "Catalog CSV not found: $csv"
}

Write-Host "Exporting Excel workbook..."
dotnet run --project $apiProject -- catalog-to-xlsx --file $csv --out $xlsx | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Excel export failed. Stop the running API process and retry."
}

$rows = Import-Csv -LiteralPath $csv
$generated = (Get-Date).ToString("yyyy-MM-dd HH:mm")

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("# GensanPOS - Production Product Catalog")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("> **Master files for updates:** edit ``client-production-catalog.xlsx`` or ``client-production-catalog.csv``, then re-import.")
[void]$sb.AppendLine("> See [PRODUCT-CATALOG-README.md](./PRODUCT-CATALOG-README.md) for the full update workflow.")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("| | |")
[void]$sb.AppendLine("|---|---|")
[void]$sb.AppendLine("| **Generated** | $generated |")
[void]$sb.AppendLine("| **Total products** | $($rows.Count) |")
[void]$sb.AppendLine("| **Selling price column** | ``UnitPrice`` (SRP from client price lists) |")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("## Categories")
[void]$sb.AppendLine("")

$byCategory = $rows | Group-Object Category | Sort-Object Name
foreach ($group in $byCategory) {
    [void]$sb.AppendLine("- **$($group.Name)** - $($group.Count) products")
}
[void]$sb.AppendLine("")
[void]$sb.AppendLine("---")
[void]$sb.AppendLine("")

foreach ($group in $byCategory) {
    [void]$sb.AppendLine("## $($group.Name)")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("| SKU | Product name | Grade | Finish | Size / spec | Unit | SRP (PHP) | Barcode |")
    [void]$sb.AppendLine("|-----|--------------|-------|--------|-------------|------|-----------|---------|")

    foreach ($p in ($group.Group | Sort-Object SKU)) {
        $name = ($p.Name -replace '\|', '/')
        $size = if ($p.Size) { $p.Size -replace '\|', '/' } else { "-" }
        $finish = if ($p.MaterialType) { $p.MaterialType } else { "-" }
        $grade = if ($p.Grade) { $p.Grade } else { "-" }
        [void]$sb.AppendLine("| ``$($p.SKU)`` | $name | $grade | $finish | $size | $($p.Unit) | **$($p.UnitPrice)** | $($p.Barcode) |")
    }

    [void]$sb.AppendLine("")
}

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($md, $sb.ToString(), $utf8NoBom)

Write-Host ""
Write-Host "Production catalog files ready:"
Write-Host "  CSV   $csv"
Write-Host "  Excel $xlsx"
Write-Host "  MD    $md"
Write-Host "  Guide $(Join-Path $dataDir 'PRODUCT-CATALOG-README.md')"
