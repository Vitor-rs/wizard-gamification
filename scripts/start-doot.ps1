# Inicia o Doot Games na porta 4000
$ErrorActionPreference = "Stop"
try {
    $rootDir = Resolve-Path "$PSScriptRoot\.."
    Set-Location "$rootDir\apps\doot"
    $env:PORT = "4000"
    $env:HOST = "0.0.0.0"

    # Detecta o IP da rede local (Wi-Fi / Ethernet)
    $ip = $null
    try {
        $ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.InterfaceAlias -notmatch "vEthernet|Loopback|Virtual|WSL" -and $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Sort-Object { if ($_.InterfaceAlias -match "Wi-Fi|Ethernet") { 0 } else { 1 } } | Select-Object -First 1).IPAddress
    } catch {}

    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host " INICIANDO DOOT GAMES (SALA DE AULA / MULTIPLAYER)" -ForegroundColor Green
    Write-Host " Tela do Professor (Projetor/Notebook): http://localhost:4000" -ForegroundColor White
    if ($ip) {
        Write-Host " Celulares e Tablets dos Alunos (Wi-Fi): http://$($ip):4000" -ForegroundColor Yellow
    }
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""

    # Verifica se pnpm esta disponivel
    if (-not (Get-Command "pnpm" -ErrorAction SilentlyContinue)) {
        throw "pnpm nao foi encontrado no PATH do sistema."
    }

    pnpm run dev
} catch {
    Write-Host ""
    Write-Host "ERRO ao iniciar o Doot:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Pressione Enter para fechar esta janela..."
    Read-Host
}
