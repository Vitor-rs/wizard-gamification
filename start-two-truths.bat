@echo off
chcp 65001 >nul
title Two Truths ^& A Lie - Wizard Games
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-two-truths.ps1"
if %ERRORLEVEL% neq 0 (
    echo.
    echo Ocorreu um erro ao executar Two Truths ^& A Lie.
    pause
)
