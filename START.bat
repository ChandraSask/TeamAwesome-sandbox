@echo off
setlocal
cd /d "%~dp0"
if not exist "backend\.venv\Scripts\python.exe" goto setup
if not exist "frontend\node_modules\vite\bin\vite.js" goto setup
backend\.venv\Scripts\python.exe scripts\dev.py
if errorlevel 1 pause
exit /b
:setup
echo Please double-click SETUP.bat first. Then open START.bat again.
pause
exit /b 1
