@echo off
chcp 65001 >nul
title Stroop Color - Wizard Games
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-stroop.ps1"
if %ERRORLEVEL% neq 0 (
    echo.
    echo Ocorreu um erro ao executar Stroop Color.
    pause
)
