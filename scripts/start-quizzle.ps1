# Inicia o Quizzle na porta 5000
$rootDir = Resolve-Path "$PSScriptRoot\.."
Set-Location "$rootDir\apps\quizzle"
$env:PORT = "5000"
$env:NODE_ENV = "production"

Write-Host "Iniciando Quizzle em http://localhost:5000..." -ForegroundColor Cyan
node server/index.js
