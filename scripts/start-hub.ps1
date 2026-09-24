# Inicia o Wizard Games Hub na porta 7000 e cria o atalho na Area de Trabalho
$ErrorActionPreference = "Stop"

try {
    $rootDir = Resolve-Path "$PSScriptRoot\.."
    $desktopDir = [Environment]::GetFolderPath("Desktop")
    $shortcutPath = Join-Path $desktopDir "Wizard Games.lnk"
    $targetBat = Join-Path $rootDir "Wizard Games.bat"
    $iconPath = Join-Path $rootDir "apps\hub\static\favicon.ico"

    # 1. Cria ou atualiza o atalho na Area de Trabalho
    try {
        if (Test-Path $iconPath) {
            $ws = New-Object -ComObject WScript.Shell
            $shortcut = $ws.CreateShortcut($shortcutPath)
            $shortcut.TargetPath = $targetBat
            $shortcut.WorkingDirectory = $rootDir.Path
            $shortcut.IconLocation = "$iconPath,0"
            $shortcut.Description = "Wizard Games - Central de Gamificacao"
            $shortcut.Save()
            Write-Host " [OK] Atalho 'Wizard Games' verificado na Area de Trabalho!" -ForegroundColor Green
        }
    } catch {
        Write-Host " (Aviso ao criar atalho: $($_.Exception.Message))" -ForegroundColor Gray
    }

    # 2. Se a porta 7000 ja estiver rodando, apenas abre o navegador
    $isAlreadyRunning = $false
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("127.0.0.1", 7000)
        $tcp.Close()
        $isAlreadyRunning = $true
    } catch {}

    if ($isAlreadyRunning) {
        Write-Host " O Wizard Games Hub ja esta em execucao! Abrindo navegador..." -ForegroundColor Cyan
        Start-Process "http://localhost:7000"
        exit 0
    }

    # 3. Detecta comando Python
    $pythonCmd = $null
    if (Get-Command "python" -ErrorAction SilentlyContinue) {
        $pythonCmd = "python"
    } elseif (Get-Command "py" -ErrorAction SilentlyContinue) {
        $pythonCmd = "py"
    } elseif (Get-Command "uv" -ErrorAction SilentlyContinue) {
        $pythonCmd = "uv"
    }

    if (-not $pythonCmd) {
        $venvPy = Join-Path $rootDir "apps\two-truths\.venv\Scripts\python.exe"
        if (Test-Path $venvPy) {
            $pythonCmd = $venvPy
        }
    }

    if (-not $pythonCmd) {
        Write-Host ""
        Write-Host "============================================================" -ForegroundColor Red
        Write-Host " ATENCAO: Python nao foi encontrado no sistema!" -ForegroundColor Red
        Write-Host "============================================================" -ForegroundColor Red
        Write-Host "Para executar o Wizard Games Hub no Windows, instale:" -ForegroundColor Yellow
        Write-Host "  winget install Python.Python.3.12" -ForegroundColor Green
        Write-Host "============================================================" -ForegroundColor Red
        throw "Python nao encontrado no PATH."
    }

    Set-Location "$rootDir\apps\hub"

    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host " WIZARD GAMES -- CENTRAL DE GAMIFICACAO (HUB UNIVERSAL)" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host " Abrindo painel interativo no seu navegador padrao..." -ForegroundColor White
    Write-Host " URL: http://localhost:7000" -ForegroundColor Yellow
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""

    if ($pythonCmd -eq "uv") {
        uv run python server.py
    } else {
        & $pythonCmd server.py
    }
} catch {
    Write-Host ""
    Write-Host "ERRO ao iniciar Wizard Games Hub:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Pressione Enter para fechar..."
    Read-Host
}
