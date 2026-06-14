# UStud Setup Script - Run after installing Ollama manually
# 1. Install Ollama from https://ollama.com/download
# 2. Run this script: .\setup.ps1

Write-Host "UStud Setup" -ForegroundColor Cyan
Write-Host "===========" -ForegroundColor Cyan

# Python packages
Write-Host "`nInstalling Python packages..." -ForegroundColor Yellow
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "pip install failed" -ForegroundColor Red
    exit 1
}

# Ollama model (requires Ollama to be installed)
Write-Host "`nPulling Ollama model (smollm2:135m)..." -ForegroundColor Yellow
$ollama = Get-Command ollama -ErrorAction SilentlyContinue
if ($ollama) {
    ollama pull smollm2:135m
    Write-Host "Model ready." -ForegroundColor Green
} else {
    Write-Host "Ollama not found. Install from https://ollama.com/download then run: ollama pull smollm2:135m" -ForegroundColor Yellow
}

# Wikipedia ZIM
$zimDir = "$env:APPDATA\UStud\content\zim"
if (-not (Test-Path $zimDir)) {
    New-Item -ItemType Directory -Path $zimDir -Force | Out-Null
}
$zimPath = Join-Path $zimDir "wikipedia_en_simple_all_mini.zim"
if (Test-Path $zimPath) {
    Write-Host "`nWikipedia ZIM already exists at $zimPath" -ForegroundColor Green
} else {
    Write-Host "`nDownloading Simple English Wikipedia mini (~441MB)..." -ForegroundColor Yellow
    $url = "https://download.kiwix.org/zim/wikipedia/wikipedia_en_simple_all_mini_2026-02.zim"
    try {
        Invoke-WebRequest -Uri $url -OutFile $zimPath -UseBasicParsing
        Write-Host "Download complete: $zimPath" -ForegroundColor Green
    } catch {
        Write-Host "Download failed. Manually download from: $url" -ForegroundColor Yellow
        Write-Host "Place in: $zimDir" -ForegroundColor Yellow
    }
}

Write-Host "`nSetup complete. Run: python run.py" -ForegroundColor Green
