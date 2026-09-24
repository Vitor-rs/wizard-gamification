param(
    [switch]$Elevated,
    [switch]$Silent
)

# Configura titulo da janela se interativo
if (-not $Silent) {
    try {
        $host.UI.RawUI.WindowTitle = "Wizard Games - Liberar Portas no Firewall do Windows"
    } catch {}
}

# Verifica se esta rodando como Administrador
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    if ($Elevated) {
        if (-not $Silent) {
            Write-Host ""
            Write-Host " [!] Permissao de Administrador nao concedida." -ForegroundColor Red
            Write-Host "     O firewall nao pode ser alterado sem privilegios de Administrador." -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Pressione qualquer tecla para sair..."
            try { $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") } catch { Start-Sleep -Seconds 3 }
        }
        exit 1
    }

    if (-not $Silent) {
        Write-Host ""
        Write-Host " [i] Solicitando permissao de Administrador ao Windows (UAC)..." -ForegroundColor Cyan
        Write-Host "     Por favor, clique em 'Sim' na janela do Windows que acabou de aparecer." -ForegroundColor Yellow
        Write-Host ""
    }

    $silentArg = if ($Silent) { " -Silent" } else { "" }
    $windowStyle = if ($Silent) { "Hidden" } else { "Normal" }

    try {
        Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Elevated$silentArg" -WindowStyle $windowStyle
        exit 0
    } catch {
        if (-not $Silent) {
            Write-Host ""
            Write-Host " [!] A permissao de Administrador foi cancelada pelo usuario." -ForegroundColor Yellow
            Write-Host "     Nenhuma alteracao foi realizada no Firewall." -ForegroundColor Gray
            Write-Host ""
            Start-Sleep -Seconds 2
        }
        exit 1
    }
}

# --- EXECUCAO ELEVADA (ADMINISTRADOR) ---
if (-not $Silent) {
    try { Clear-Host } catch {}
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "   WIZARD GAMES - CONFIGURACAO DO FIREWALL DO WINDOWS" -ForegroundColor White
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Liberando portas para acesso dos celulares na rede Wi-Fi..." -ForegroundColor White
    Write-Host ""
}

$rules = @(
    @{ Port = 8000; Name = "Two Truths & A Lie" },
    @{ Port = 3000; Name = "Stroop Color Effect" },
    @{ Port = 7000; Name = "Wizard Games Hub" },
    @{ Port = 4000; Name = "Doot Games" },
    @{ Port = 4500; Name = "PaperClickers Web" },
    @{ Port = 5000; Name = "Quizzle" },
    @{ Port = 8181; Name = "Darkhold" }
)

foreach ($r in $rules) {
    $port = $r.Port
    $name = $r.Name
    $ruleName = "Wizard Games - $name (Porta $port)"
    
    # Remove regra antiga se existir para evitar duplicatas
    netsh advfirewall firewall delete rule name="$ruleName" > $null 2>&1
    
    # Adiciona regra de entrada permitindo conexoes TCP na porta
    $res = netsh advfirewall firewall add rule name="$ruleName" dir=in action=allow protocol=TCP localport=$port profile=any > $null 2>&1
    if (-not $Silent) {
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] Porta $port liberada" -ForegroundColor Green -NoNewline
            Write-Host " ($name)" -ForegroundColor Gray
        } else {
            Write-Host "  [!] Falha ao liberar porta $port ($name)" -ForegroundColor Red
        }
    }
}

if (-not $Silent) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "  Sucesso! O firewall do Windows foi configurado." -ForegroundColor Green
    Write-Host "  Os celulares dos alunos agora podem acessar via Wi-Fi." -ForegroundColor White
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Pressione qualquer tecla para fechar esta janela..."
    try { $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") } catch { Start-Sleep -Seconds 3 }
}
