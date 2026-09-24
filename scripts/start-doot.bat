@echo off
chcp 65001 >nul
title Doot Games - Servidor
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-doot.ps1"
if %ERRORLEVEL% neq 0 (
    echo.
    echo Ocorreu um erro ao executar o Doot.
    pause
)
