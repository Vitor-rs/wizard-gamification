# Inicia o Wizard Games como Aplicativo Desktop Silencioso (Zero Terminais)
$ErrorActionPreference = "Stop"

try {
    $rootDir = Resolve-Path "$PSScriptRoot\.."
    $desktopDir = [Environment]::GetFolderPath("Desktop")
    $shortcutPath = Join-Path $desktopDir "Wizard Games.lnk"
    $vbsLauncher = Join-Path $rootDir "scripts\start-app.vbs"
    $iconPath = Join-Path $rootDir "apps\hub\static\favicon.ico"

    # 1. Cria ou atualiza o atalho silencioso na Area de Trabalho
    try {
        if (Test-Path $iconPath) {
            $ws = New-Object -ComObject WScript.Shell
            $shortcut = $ws.CreateShortcut($shortcutPath)
            $shortcut.TargetPath = "wscript.exe"
            $shortcut.Arguments = "//b //nologo `"$vbsLauncher`""
            $shortcut.WorkingDirectory = $rootDir.Path
            $shortcut.IconLocation = "$iconPath,0"
            $shortcut.Description = "Wizard Games - Central de Gamificacao (Desktop App)"
            $shortcut.Save()
        }
    } catch {}

    # 2. Se a porta 7000 ja estiver rodando, apenas abre a janela do app
    $isAlreadyRunning = $false
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("127.0.0.1", 7000)
        $tcp.Close()
        $isAlreadyRunning = $true
    } catch {}

    # Localiza executavel Chromium (Edge, Chrome) para abrir a janela do App
    $browserExe = $null
    $browserCandidates = @(
        "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
        "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    )
    foreach ($b in $browserCandidates) {
        if (Test-Path $b) {
            $browserExe = $b
            break
        }
    }

    $profileDir = "$env:LOCALAPPDATA\WizardGames\AppData"
    if (-not (Test-Path $profileDir)) {
        New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
    }

    if ($isAlreadyRunning) {
        if ($browserExe) {
            Start-Process $browserExe -ArgumentList "--app=http://localhost:7000", "--user-data-dir=`"$profileDir`"", "--window-size=1280,820", "--no-first-run", "--no-default-browser-check" -WindowStyle Hidden
        } else {
            Start-Process "http://localhost:7000"
        }
        exit 0
    }

    # 3. Detecta pythonw.exe ou python.exe para execucao 100% oculta
    $pythonExe = $null
    $pythonCandidates = @(
        "C:\Python314\pythonw.exe",
        "pythonw.exe",
        "pyw.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python312\pythonw.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python311\pythonw.exe",
        "C:\Python314\python.exe",
        "python.exe",
        "py.exe"
    )

    foreach ($py in $pythonCandidates) {
        if (Test-Path $py) {
            $pythonExe = $py
            break
        } elseif (Get-Command $py -ErrorAction SilentlyContinue) {
            $pythonExe = (Get-Command $py).Source
            break
        }
    }

    if (-not $pythonExe) {
        $venvPy = Join-Path $rootDir "apps\two-truths\.venv\Scripts\pythonw.exe"
        if (Test-Path $venvPy) {
            $pythonExe = $venvPy
        } else {
            $venvPy = Join-Path $rootDir "apps\two-truths\.venv\Scripts\python.exe"
            if (Test-Path $venvPy) {
                $pythonExe = $venvPy
            }
        }
    }

    if (-not $pythonExe) {
        throw "Python nao encontrado no sistema."
    }

    $hubApp = Join-Path $rootDir "apps\hub\app.py"

    # Inicia app.py como processo de fundo sem janela visivel de console
    Start-Process -FilePath $pythonExe -ArgumentList "`"$hubApp`"" -WorkingDirectory "$rootDir\apps\hub" -WindowStyle Hidden
    exit 0

} catch {
    # Em caso de falha grave, registra log
    $logFile = "$env:TEMP\wizard_games_launch.log"
    Set-Content -Path $logFile -Value "Erro ao iniciar Wizard Games: $($_.Exception.Message)"
}
