# Generate GensanPOS production catalog CSV from client price-list tables.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$outCsv = Join-Path $root "backend\data\client-production-catalog.csv"

$script:BarcodeSeq = [long]8903000000001
$script:SkuCounts = @{}
$rows = New-Object System.Collections.Generic.List[object]

function Get-Price([object]$Value) {
    if ($null -eq $Value) { return $null }
    $text = ($Value.ToString()).Trim().Replace(",", "")
    if ([string]::IsNullOrWhiteSpace($text)) { return $null }
    $price = 0
    if (-not [int]::TryParse([math]::Floor([decimal]$text), [ref]$price)) { return $null }
    if ($price -le 0) { return $null }
    return $price
}

function Get-Slug([string]$Text) {
    $slug = $Text.ToUpper().Replace('"', '').Replace(' ', '').Replace('/', '-').Replace('.', 'P')
    $slug = ($slug -replace '[^A-Z0-9\-]', '')
    if ([string]::IsNullOrWhiteSpace($slug)) { return 'NA' }
    return $slug
}

function Get-UniqueSku([string]$Prefix) {
    $base = $Prefix
    if ($base.Length -gt 48) { $base = $base.Substring(0, 48) }
    if (-not $script:SkuCounts.ContainsKey($base)) { $script:SkuCounts[$base] = 0 }
    $script:SkuCounts[$base]++
    $count = $script:SkuCounts[$base]
    if ($count -eq 1) { return $base }
    return "$base-$count"
}

function Get-NextBarcode() {
    $code = $script:BarcodeSeq.ToString()
    $script:BarcodeSeq++
    return $code
}

function Add-Product {
    param(
        [string]$SkuPrefix,
        [string]$Name,
        [string]$Category,
        [string]$Unit,
        [object]$Price,
        [string]$Grade,
        [string]$Size = '',
        [string]$Thickness = '',
        [string]$MaterialType = '',
        [string]$Description = ''
    )
    $unitPrice = Get-Price $Price
    if ($null -eq $unitPrice) { return }
    $rows.Add([pscustomobject]@{
        SKU          = Get-UniqueSku $SkuPrefix
        Name         = $Name
        Category     = $Category
        Unit         = $Unit
        UnitPrice    = $unitPrice
        Barcode      = Get-NextBarcode
        Grade        = $Grade
        Size         = $Size
        Thickness    = $Thickness
        MaterialType = $MaterialType
        Description  = $(if ($Description) { $Description } else { $Name })
        StockQuantity = 0
    }) | Out-Null
}

function Add-SheetRows {
    param([string]$Grade, [string]$Finish, [array]$Items, [switch]$Plate)
    $category = if ($Plate) { 'Stainless Plates' } else { 'Stainless Sheets' }
    foreach ($item in $Items) {
        $spec = $item[0]
        $price = $item[1]
        $thickness = ($spec -replace '/ 1B', '').Trim()
        $finishForRow = if ($spec -match '/ 1B' -or $Finish -eq '1B') { '1B' } else { $Finish }
        $mm = $thickness
        Add-Product `
            -SkuPrefix "SS-SHT$Grade-$(Get-Slug $finishForRow)-$(Get-Slug $mm)" `
            -Name "SS Sheet $Grade $finishForRow ${mm}mm" `
            -Category $category -Unit sheet -Price $price -Grade $Grade `
            -Size '4ft x 8ft' -Thickness "${mm}mm" -MaterialType $finishForRow `
            -Description "Stainless sheet $Grade $finishForRow ${mm}mm"
    }
}

function Add-TubeRows {
    param([string]$Kind, [string]$Grade, [string]$Finish, [array]$Items)
    $map = @{
        round      = @{ Code = 'RT'; Label = 'Round Tube' }
        square     = @{ Code = 'SQT'; Label = 'Square Tube' }
        rect       = @{ Code = 'RCT'; Label = 'Rectangular Tube' }
        decorative = @{ Code = 'DEC'; Label = 'Decorative Tube' }
        twisted    = @{ Code = 'TWS'; Label = 'Twisted Tube' }
    }
    $info = $map[$Kind]
    foreach ($item in $Items) {
        $spec = $item[0].ToLower().Replace('×', 'x')
        $price = $item[1]
        $parts = $spec -split 'x' | ForEach-Object { $_.Trim() }
        if ($Kind -in @('round', 'decorative', 'twisted')) {
            $sizeLabel = "$($parts[0])`" x $($parts[1])mm"
            $thickness = "$($parts[1])mm"
        }
        elseif ($Kind -eq 'square') {
            $sizeLabel = "$($parts[0])`" x $($parts[1])`" x $($parts[2])mm"
            $thickness = "$($parts[2])mm"
        }
        else {
            $sizeLabel = "$($parts[0])`" x $($parts[1])`" x $($parts[2])mm"
            $thickness = "$($parts[2])mm"
        }
        Add-Product `
            -SkuPrefix "SS-$($info.Code)$Grade-$(Get-Slug $spec)" `
            -Name "SS $($info.Label) $Grade $sizeLabel" `
            -Category 'Stainless Tubes' -Unit pc -Price $price -Grade $Grade `
            -Size $sizeLabel -Thickness $thickness -MaterialType $Finish `
            -Description "Stainless $($info.Label.ToLower()) $Grade $sizeLabel $Finish"
    }
}

function Add-ShaftingRows {
    param([string]$Grade, [array]$Items)
    foreach ($item in $Items) {
        $diameter = $item[0]
        $price = $item[1]
        $sizeLabel = "$diameter`""
        Add-Product `
            -SkuPrefix "SS-SHF$Grade-$(Get-Slug $diameter)" `
            -Name "SS Shafting $Grade $sizeLabel" `
            -Category 'Stainless Bars' -Unit pc -Price $price -Grade $Grade `
            -Size $sizeLabel -MaterialType Shafting `
            -Description "Stainless shafting $Grade $sizeLabel"
    }
}

function Add-BarRows {
    param([string]$Kind, [string]$Grade, [array]$Items)
    $code = if ($Kind -eq 'angle') { 'AB' } else { 'FB' }
    $label = if ($Kind -eq 'angle') { 'Angle Bar' } else { 'Flat Bar' }
    foreach ($item in $Items) {
        $spec = $item[0]
        $price = $item[1]
        $parts = $spec.ToLower() -split 'x', 2
        $sizeLabel = "$($parts[0].Trim()) x $($parts[1].Trim())"
        Add-Product `
            -SkuPrefix "SS-$code$Grade-$(Get-Slug $spec)" `
            -Name "SS $label $Grade $sizeLabel" `
            -Category 'Stainless Bars' -Unit pc -Price $price -Grade $Grade `
            -Size $sizeLabel -Thickness $parts[0].Trim() -MaterialType $label `
            -Description "Stainless $($label.ToLower()) $Grade $sizeLabel"
    }
}

# Sheets 202
Add-SheetRows '202' '2B' @(
    @('0.4',759),@('0.5',999),@('0.6',1164),@('0.7',1387),@('0.8',1616),@('0.9',1808),
    @('1.0',2017),@('1.2',2470),@('1.5',3143),@('2.0',4287),@('3.0',6528),@('4.0 / 1B',8752)
)
Add-SheetRows '202' 'MIR' @(
    @('0.4',981),@('0.5',1221),@('0.6',1386),@('0.7',1609),@('0.8',1837),@('0.9',2030),
    @('1.0',2239),@('1.2',2744),@('1.5',3418),@('3.0',4904)
)
Add-SheetRows '202' 'HL' @(
    @('0.6',1344),@('0.7',1535),@('0.8',1763),@('0.9',1945),@('1.0',2155),@('1.2',2597),
    @('1.5',3259),@('2.0',4403),@('3.0',6647)
)
Add-SheetRows '202' '2B CHK' @(@('1.0',2155),@('1.2',2597),@('1.5',3259),@('2.0',4403),@('3.0',6647))
Add-SheetRows '202' 'MIR CHK' @(
    @('0.6',1386),@('0.7',1609),@('0.8',1837),@('0.9',2030),@('1.0',2303),@('1.2',2755),@('1.5',3534)
)

# Sheets 304
Add-SheetRows '304' '2B' @(
    @('0.4',1372),@('0.5',1622),@('0.6',2009),@('0.7',2359),@('0.8',2714),@('0.9',3086),
    @('1.0',3464),@('1.2',4223),@('1.5',5361),@('2.0',7265),@('3.0',11103)
)
Add-SheetRows '304' 'MIR' @(
    @('0.4',1594),@('0.5',1844),@('0.6',2231),@('0.7',2580),@('0.8',2936),@('0.9',3308),
    @('1.0',3686),@('1.2',4497),@('1.5',5635),@('2.0',7571),@('3.0',11409)
)
Add-SheetRows '304' 'HL' @(
    @('0.6',2263),@('0.7',2612),@('0.8',2967),@('0.9',3339),@('1.0',3718),@('1.2',4497),
    @('1.5',5635),@('2.0',7872),@('3.0',11399)
)
Add-SheetRows '304' '2B CHK' @(@('0.9',3339),@('1.0',3718),@('1.2',4497),@('1.5',5635),@('2.0',7561),@('3.0',11399))
Add-SheetRows '304' '1B' @(@('4.0',13620),@('5.0',15799),@('6.0',18161)) -Plate
Add-Product -SkuPrefix 'SS-SHT304-PERF-1X4' -Name 'SS Perforated Sheet 304 1.0 x 4mm' `
    -Category 'Stainless Sheets' -Unit sheet -Price 3347 -Grade '304' `
    -Size '1.0 x 4mm' -Thickness '1.0mm' -MaterialType 'PERFORATED' `
    -Description 'Stainless perforated sheet 304 1.0 x 4mm hole'

# Tubes 202
Add-TubeRows round 202 Standard @(
    @('1/2x1.2',198),@('5/8x1.2',252),@('3/4x1.2',291),@('7/8x1.2',346),@('1x1.2',390),
    @('1 1/4x1.2',519),@('1 1/2x1.2',621),@('1 3/4x1.2',740),@('2x1.2',848),@('2 1/2x1.2',1028),
    @('3x1.2',1282),@('4x1.2',1715),@('1/2x1.5',238),@('5/8x1.5',304),@('3/4x1.5',371),
    @('7/8x1.5',432),@('1x1.5',492),@('1 1/4x1.5',632),@('1 1/2x1.5',768),@('1 3/4x1.5',903),
    @('2x1.5',1035),@('2 1/2x1.5',1292),@('3x1.5',1567),@('4x1.5',2099)
)
Add-TubeRows square 202 Standard @(
    @('1/2x1/2x1.2',264),@('3/4x3/4x1.2',365),@('1x1x1.2',492),@('1 1/4x1 1/4x1.2',599),
    @('1 1/2x1 1/2x1.2',789),@('2x2x1.2',1074),@('1/2x1/2x1.5',323),@('3/4x3/4x1.5',490),
    @('1x1x1.5',650),@('1 1/4x1 1/4x1.5',750),@('1 1/2x1 1/2x1.5',996),@('2x2x1.5',1319)
)
Add-TubeRows rect 202 Standard @(
    @('1/2x1x1.2',398),@('1/2x2x1.2',671),@('5/8x1 1/4x1.2',476),@('1x1 1/2x1.2',671),
    @('1x2x1.2',803),@('1x3x1.2',1072),@('2x3x1.2',1342),@('2x4x1.2',1615),
    @('1/2x1x1.5',486),@('1x1 1/2x1.5',807),@('1x2x1.5',983),@('1x3x1.5',1316),
    @('2x3x1.5',1649),@('2x4x1.5',1983)
)
Add-TubeRows decorative 202 Decorative @(@('3/4x1.2',362),@('1x1.2',460))
Add-TubeRows twisted 202 Twisted @(@('3/4x1.2',362),@('1x1.2',460))

# Tubes 304
Add-TubeRows round 304 Standard @(
    @('1/2x1.2',283),@('5/8x1.2',405),@('3/4x1.2',492),@('7/8x1.2',578),@('1x1.2',666),
    @('1 1/4x1.2',836),@('1 1/2x1.2',1014),@('1 3/4x1.2',1188),@('2x1.2',1362),@('2 1/2x1.2',1710),
    @('3x1.2',2058),@('4x1.2',2753),@('1/2x1.5',382),@('5/8x1.5',488),@('3/4x1.5',595),
    @('7/8x1.5',700),@('1x1.5',797),@('1 1/4x1.5',1018),@('1 1/2x1.5',1234),@('1 3/4x1.5',1449),
    @('2x1.5',1663),@('2 1/2x1.5',1874),@('3x1.5',2257),@('4x1.5',3023)
)
Add-TubeRows square 304 Standard @(
    @('1/2x1/2x1.2',424),@('3/4x3/4x1.2',644),@('1x1x1.2',852),@('1 1/4x1 1/4x1.2',1026),
    @('1 1/2x1 1/2x1.2',1305),@('2x2x1.2',1725),@('1/2x1/2x1.5',520),@('3/4x3/4x1.5',789),
    @('1x1x1.5',1044),@('1 1/4x1 1/4x1.5',1259),@('1 1/2x1 1/2x1.5',1601),@('2x2x1.5',2118)
)
Add-TubeRows rect 304 Standard @(
    @('1/2x1x1.2',639),@('1/2x2x1.2',1078),@('5/8x1 1/4x1.2',766),@('1x1 1/2x1.2',1078),
    @('1x2x1.2',1289),@('1x3x1.2',1723),@('2x3x1.2',1934),@('2x4x1.2',2327),
    @('1/2x1x1.5',783),@('1x1 1/2x1.5',1308),@('1x2x1.5',1580),@('1x3x1.5',2115),
    @('2x3x1.5',2376),@('2x4x1.5',2857)
)
Add-TubeRows decorative 304 Decorative @(@('3/4x1.2',562),@('1x1.2',736))
Add-TubeRows twisted 304 Twisted @(@('3/4x1.2',562),@('1x1.2',736))

# Shafting
Add-ShaftingRows '202' @(
    @('1/8',63),@('3/16',109),@('1/4',152),@('5/16',246),@('3/8',347),@('1/2',597),
    @('5/8',936),@('3/4',1417),@('1',2268),@('1 1/4',3937),@('1 1/2',5669),@('2 1/2',15747)
)
Add-ShaftingRows '304' @(
    @('1/8',79),@('3/16',156),@('1/4',231),@('5/16',388),@('3/8',540),@('1/2',951),
    @('5/8',1492),@('3/4',2218),@('1',3621),@('1 1/4',6162),@('1 1/2',8873),@('2',15774)
)

# Angle & flat bars
Add-BarRows angle '202' @(
    @('3mmx1',668),@('4mmx1',882),@('5mmx1',1191),@('6mmx1',1403),@('3mmx1 1/2',1155),
    @('4mmx1 1/2',1559),@('5mmx1 1/2',1909),@('6mmx1 1/2',2251),@('3mmx2',1471),
    @('4mmx2',1742),@('5mmx2',2165),@('6mmx2',2855)
)
Add-BarRows angle '304' @(
    @('3mmx1',1211),@('4mmx1',1690),@('5mmx1',2094),@('6mmx1',2248),@('3mmx1 1/2',1863),
    @('4mmx1 1/2',2477),@('5mmx1 1/2',3166),@('6mmx1 1/2',3593),@('3mmx2',2358),
    @('4mmx2',3078),@('5mmx2',3905),@('6mmx2',4513)
)
Add-BarRows flat '202' @(
    @('3mmx1',383),@('4mmx1',504),@('5mmx1',603),@('6mmx1',721),@('3mmx1 1/2',577),
    @('4mmx1 1/2',771),@('5mmx1 1/2',965),@('6mmx1 1/2',1143),@('3mmx2',722),
    @('4mmx2',963),@('5mmx2',1205),@('6mmx2',1443)
)
Add-BarRows flat '304' @(
    @('3mmx1',590),@('4mmx1',781),@('5mmx1',971),@('6mmx1',1159),@('3mmx1 1/2',938),
    @('4mmx1 1/2',1248),@('5mmx1 1/2',1548),@('6mmx1 1/2',1849),@('3mmx2',1167),
    @('4mmx2',1546),@('5mmx2',1947),@('6mmx2',2319)
)

$outDir = Split-Path $outCsv
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
$rows | Export-Csv -Path $outCsv -NoTypeInformation -Encoding UTF8

$xlsx = Join-Path $outDir 'client-production-catalog.xlsx'
$apiProject = Join-Path $root "backend\GensanPOS.API\GensanPOS.API.csproj"
dotnet run --project $apiProject -- catalog-to-xlsx --file $outCsv --out $xlsx | Out-Null

Write-Host "Wrote $($rows.Count) products to $outCsv"
Write-Host "Wrote Excel workbook to $xlsx"
