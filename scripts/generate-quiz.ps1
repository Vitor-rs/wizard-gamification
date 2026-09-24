param(
    [string]$book = "W4",
    [string]$unit = "Unit 5",
    [string]$level = "Teens",
    [string]$target = "all"
)

$rootDir = Resolve-Path "$PSScriptRoot\.."
Set-Location "$rootDir\packages\ai-quiz-engine"

Write-Host "Gerando Quiz com o AI Quiz Engine..." -ForegroundColor Magenta
python generator.py --book $book --unit $unit --level $level --target $target
