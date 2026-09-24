@echo off
chcp 65001 >nul
title Wizard Games Hub
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\..\scripts\start-hub.ps1"
if %ERRORLEVEL% neq 0 (
    pause
)
