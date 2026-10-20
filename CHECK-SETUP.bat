@echo off
setlocal
cd /d "%~dp0"
if not exist "backend\.venv\Scripts\python.exe" goto missing
backend\.venv\Scripts\python.exe scripts\check_setup.py
pause
exit /b
:missing
echo Please run SETUP.bat first. If setup fails, keep that window open for your facilitator.
pause
exit /b 1
