# Inicia o PaperClickers Web na porta 4500
$rootDir = Resolve-Path "$PSScriptRoot\.."
Set-Location "$rootDir\apps\paperclickers\web"
$env:PORT = "4500"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " Iniciando Wizard PaperClickers Web (Porta 4500)..." -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

Start-Process "http://localhost:4500"
node server.js
