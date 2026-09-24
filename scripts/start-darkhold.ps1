# Inicia o Darkhold na porta 8181
$rootDir = Resolve-Path "$PSScriptRoot\.."
Set-Location "$rootDir\apps\darkhold"

Write-Host "Iniciando Darkhold (Spring Boot / H2) em http://localhost:8181..." -ForegroundColor Yellow
.\gradlew.bat bootRun
