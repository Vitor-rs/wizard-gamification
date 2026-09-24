# Inicia o Two Truths & A Lie na porta 8000
$ErrorActionPreference = "Stop"
try {
    $rootDir = Resolve-Path "$PSScriptRoot\.."
    Set-Location "$rootDir\apps\two-truths"
    $env:PORT = "8000"
    $env:HOST = "0.0.0.0"

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
    Write-Host " WIZARD GAMES -- TWO TRUTHS & A LIE" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host " [PROFESSOR] Painel Admin:      http://localhost:8000/admin" -ForegroundColor White
    Write-Host " [PROJETOR]  Tela Display:      http://localhost:8000/display" -ForegroundColor White
    if ($ip) {
        Write-Host " [ALUNOS]    Celulares (Wi-Fi): http://$($ip):8000/student" -ForegroundColor Yellow
        Write-Host " [QR CODE]   Imagem direta:     http://$($ip):8000/qr" -ForegroundColor Yellow
    } else {
        Write-Host " [ALUNOS]    Celulares (Local): http://localhost:8000/student" -ForegroundColor Yellow
    }
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""

    # Identificacao das ferramentas Python disponiveis
    $hasUv = [bool](Get-Command "uv" -ErrorAction SilentlyContinue)
    $pythonCmd = $null
    if (Get-Command "python" -ErrorAction SilentlyContinue) {
        $pythonCmd = "python"
    } elseif (Get-Command "py" -ErrorAction SilentlyContinue) {
        $pythonCmd = "py"
    }

    if ($hasUv) {
        Write-Host "Executando com Astral UV..." -ForegroundColor Gray
        
        # Se copiado de outro PC/usuario, valida se o venv aponta para um Python inexistente
        if (Test-Path ".venv\pyvenv.cfg") {
            $venvContent = Get-Content ".venv\pyvenv.cfg" -Raw -ErrorAction SilentlyContinue
            if ($venvContent -and ($venvContent -notmatch [regex]::Escape($env:USERNAME))) {
                Write-Host "Ajustando ambiente virtual para este computador..." -ForegroundColor Yellow
                uv sync
            }
        }
        uv run python main.py
    } elseif ($pythonCmd) {
        Write-Host "UV nao encontrado no PATH. Usando Python padrao ($pythonCmd)..." -ForegroundColor Yellow
        
        $venvPython = "$PWD\.venv\Scripts\python.exe"
        $venvPip = "$PWD\.venv\Scripts\pip.exe"
        $venvReady = $false

        if (Test-Path $venvPython) {
            try {
                $test = & $venvPython -c "import fastapi, uvicorn, jinja2, qrcode, websockets; print('READY')" 2>$null
                if ($test -match "READY") {
                    $venvReady = $true
                }
            } catch {}
        }

        if (-not $venvReady) {
            Write-Host "Configurando ambiente Python local (.venv)..." -ForegroundColor Cyan
            if (Test-Path ".venv") {
                Remove-Item -Recurse -Force ".venv" -ErrorAction SilentlyContinue
            }
            & $pythonCmd -m venv .venv
            if (Test-Path $venvPip) {
                Write-Host "Instalando dependencias basicas..." -ForegroundColor Cyan
                & $venvPip install -r requirements.txt --quiet
            }
        }

        if (Test-Path $venvPython) {
            & $venvPython main.py
        } else {
            & $pythonCmd main.py
        }
    } else {
        Write-Host ""
        Write-Host "============================================================" -ForegroundColor Red
        Write-Host " ATENCAO: Python ou UV nao estao instalados neste computador!" -ForegroundColor Red
        Write-Host "============================================================" -ForegroundColor Red
        Write-Host "Para rodar o Two Truths no Windows 11, instale com um comando:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  winget install Python.Python.3.12" -ForegroundColor Green
        Write-Host "  (ou baixe o instalador em: https://www.python.org/downloads/)" -ForegroundColor Gray
        Write-Host "============================================================" -ForegroundColor Red
        throw "Python nao encontrado no PATH do sistema."
    }
} catch {
    Write-Host ""
    Write-Host "ERRO ao iniciar Two Truths & A Lie:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    try {
        if ([Environment]::UserInteractive -and -not [Console]::IsInputRedirected) {
            Write-Host "Pressione Enter para fechar..."
            Read-Host
        }
    } catch {}
    exit 1
}
