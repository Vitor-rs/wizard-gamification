@echo off
chcp 65001 >nul
title Wizard Games - Central de Gamificacao

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-hub.ps1"
if %ERRORLEVEL% neq 0 (
    echo.
    echo Ocorreu um erro ao iniciar o Wizard Games Hub.
    pause
)
