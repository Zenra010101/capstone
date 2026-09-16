# Build production release tarball on Windows.
# Output: dist\gensanpos-release.tar.gz
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Dist = Join-Path $Root "dist"
$Stage = Join-Path $Dist "gensanpos-release"

if (Test-Path $Stage) { Remove-Item -Recurse -Force $Stage }
New-Item -ItemType Directory -Path (Join-Path $Stage "api"), (Join-Path $Stage "web") -Force | Out-Null

Write-Host "==> Publish API"
dotnet publish (Join-Path $Root "backend\GensanPOS.API\GensanPOS.API.csproj") `
  -c Release -o (Join-Path $Stage "api") `
  /p:UseAppHost=false

Write-Host "==> Build frontend (production - same-origin API)"
$frontend = Join-Path $Root "frontend"
Push-Location $frontend
$envLocal = Join-Path $frontend ".env.local"
$envLocalBak = Join-Path $frontend ".env.local.buildbak"
if (Test-Path $envLocal) {
  Move-Item -Force $envLocal $envLocalBak
}
$env:NEXT_PUBLIC_API_URL = ""
try {
  if (Test-Path "node_modules\next") {
    npm run build
  } else {
    npm install
    npm run build
  }
} finally {
  if (Test-Path $envLocalBak) {
    Move-Item -Force $envLocalBak $envLocal
  }
}

$standalone = Join-Path $frontend ".next\standalone"
Copy-Item -Path (Join-Path $standalone "*") -Destination (Join-Path $Stage "web") -Recurse -Force
New-Item -ItemType Directory -Path (Join-Path $Stage "web\.next") -Force | Out-Null
Copy-Item -Path (Join-Path $frontend ".next\static") -Destination (Join-Path $Stage "web\.next\static") -Recurse -Force
if (Test-Path (Join-Path $frontend "public")) {
  Copy-Item -Path (Join-Path $frontend "public") -Destination (Join-Path $Stage "web\public") -Recurse -Force
}
Pop-Location

Write-Host "==> Package (requires tar)"
New-Item -ItemType Directory -Path $Dist -Force | Out-Null
$tarball = Join-Path $Dist "gensanpos-release.tar.gz"
if (Get-Command tar -ErrorAction SilentlyContinue) {
  tar -czf $tarball -C $Dist gensanpos-release
  Write-Host "Created $tarball"
  Write-Host "Upload: scp $tarball root@157.245.144.237:/tmp/"
} else {
  Write-Host "tar not found - zip the folder manually or use WSL: bash deploy/scripts/build-release.sh"
}
