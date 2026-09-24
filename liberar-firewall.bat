@echo off
chcp 65001 >nul
title Liberar Portas no Firewall do Windows - Wizard Games

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\liberar-firewall.ps1"
