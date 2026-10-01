@echo off
setlocal
cd /d "%~dp0"
title Night Atlas - PC Edition
where node >nul 2>nul
if errorlevel 1 (
 echo Please install Node.js LTS from https://nodejs.org/
 echo After installation, close this window and double-click this launcher again.
 pause
 exit /b 1
)
node server.cjs --open
pause
