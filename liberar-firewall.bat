@echo off
chcp 65001 >nul
title Liberar Portas no Firewall do Windows - Wizard Games

:: Verifica se está rodando como Administrador
net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Solicitando permissões de Administrador...
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

echo ============================================================
echo   WIZARD GAMES -- CONFIGURACAO DO FIREWALL DO WINDOWS
echo ============================================================
echo.
echo Liberando portas para acesso dos celulares na rede Wi-Fi...
echo.

:: Porta 8000 (Two Truths & A Lie)
netsh advfirewall firewall delete rule name="Wizard Games - Two Truths (Porta 8000)" >nul 2>&1
netsh advfirewall firewall add rule name="Wizard Games - Two Truths (Porta 8000)" dir=in action=allow protocol=TCP localport=8000 profile=any >nul
echo  [OK] Porta 8000 liberada (Two Truths ^& A Lie)

:: Porta 3000 (Stroop Color)
netsh advfirewall firewall delete rule name="Wizard Games - Stroop Color (Porta 3000)" >nul 2>&1
netsh advfirewall firewall add rule name="Wizard Games - Stroop Color (Porta 3000)" dir=in action=allow protocol=TCP localport=3000 profile=any >nul
echo  [OK] Porta 3000 liberada (Stroop Color Effect)

:: Porta 4000 (Doot Games)
netsh advfirewall firewall delete rule name="Wizard Games - Doot (Porta 4000)" >nul 2>&1
netsh advfirewall firewall add rule name="Wizard Games - Doot (Porta 4000)" dir=in action=allow protocol=TCP localport=4000 profile=any >nul
echo  [OK] Porta 4000 liberada (Doot Games)

echo.
echo ============================================================
echo  Sucesso! O firewall foi configurado com perfeicao.
echo  Os alunos agora poderao acessar os jogos pelo Wi-Fi.
echo ============================================================
echo.
pause
