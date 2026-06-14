# Kill UStud dev listeners, then start API + Vite fresh (project root = parent of scripts/)
$ErrorActionPreference = "SilentlyContinue"
Set-Location (Split-Path -Parent $PSScriptRoot)

$ports = @(8765, 5173)
foreach ($port in $ports) {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

Start-Sleep -Milliseconds 400
Write-Host "Starting UStud (API :8765, Vite :5173)..." -ForegroundColor Cyan
npm run dev:all
