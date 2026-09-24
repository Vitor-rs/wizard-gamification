@echo off
chcp 65001 >nul
title Darkhold - Wizard Games
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\..\scripts\start-darkhold.ps1"
if %ERRORLEVEL% neq 0 (
    echo.
    echo Ocorreu um erro ao executar Darkhold.
    pause
)
