# Inicia o Stroop Color na porta 3000
$ErrorActionPreference = "Stop"
try {
    $rootDir = Resolve-Path "$PSScriptRoot\.."
    Set-Location "$rootDir\apps\stroop-color"
    $env:PORT = "3000"

    # Detecta o IP da rede local (Wi-Fi / Ethernet real)
    $ip = $null
    try {
        $ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { 
            $_.InterfaceAlias -notmatch "vEthernet|Loopback|Virtual|WSL" -and 
            $_.IPAddress -notlike "127.*" -and 
            $_.IPAddress -notlike "169.254.*" 
        } | Sort-Object { if ($_.InterfaceAlias -match "Wi-Fi|Ethernet") { 0 } else { 1 } } | Select-Object -First 1).IPAddress
    } catch {}

    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host " WIZARD GAMES -- STROOP COLOR EFFECT" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host " [PROFESSOR] Painel Admin:      http://localhost:3000/" -ForegroundColor White
    if ($ip) {
        Write-Host " [PROJETOR]  Tela / Alunos:     http://$($ip):3000/display" -ForegroundColor Yellow
    } else {
        Write-Host " [PROJETOR]  Tela / Alunos:     http://localhost:3000/display" -ForegroundColor Yellow
    }
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""

    # Verifica se node esta disponivel
    if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
        Write-Host ""
        Write-Host "============================================================" -ForegroundColor Red
        Write-Host " ATENCAO: Node.js nao esta instalado neste computador!" -ForegroundColor Red
        Write-Host "============================================================" -ForegroundColor Red
        Write-Host "Para rodar o Stroop Color no Windows 11, instale com um comando:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  winget install OpenJS.NodeJS.LTS" -ForegroundColor Green
        Write-Host "  (ou baixe o instalador em: https://nodejs.org/)" -ForegroundColor Gray
        Write-Host "============================================================" -ForegroundColor Red
        throw "Node.js nao foi encontrado no PATH do sistema."
    }

    # Se faltar node_modules, instala dependencias de producao automaticamente
    if (-not (Test-Path "node_modules")) {
        Write-Host "Instalando dependencias basicas (express, ws)..." -ForegroundColor Cyan
        npm install --omit=dev --no-audit --no-fund
    }

    # Inicia com limite de memoria de 512MB para preservar os 4GB de RAM da maquina
    node --max-old-space-size=512 server.js
} catch {
    Write-Host ""
    Write-Host "ERRO ao iniciar Stroop Color:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    try {
        if ([Environment]::UserInteractive -and -not [Console]::IsInputRedirected) {
            Write-Host "Pressione Enter para fechar..."
            Read-Host
        }
    } catch {}
    exit 1
}
