$rootDir = Resolve-Path "$PSScriptRoot\.."
$topcodesPath = "$rootDir\apps\paperclickers\topcodes\pt-BR\A4_1_porPágina"
$outputPath = "$rootDir\packages\ai-quiz-engine\output"

Write-Host "Abrindo cartões imprimíveis em Português e folhas de teste..." -ForegroundColor Cyan
if (Test-Path $outputPath) {
    Start-Process explorer.exe $outputPath
}
if (Test-Path $topcodesPath) {
    Start-Process explorer.exe $topcodesPath
}
