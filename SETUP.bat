@echo off
setlocal
cd /d "%~dp0"
echo Preparing your hackathon workspace...
where node >nul 2>nul
if errorlevel 1 goto missing_node
where py >nul 2>nul
if errorlevel 1 goto missing_python
py -3.12 --version >nul 2>nul
if errorlevel 1 goto missing_python
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a<20||(a===20&&b<18)?1:0)"
if errorlevel 1 goto missing_node
if not exist "backend\.venv\Scripts\python.exe" py -3.12 -m venv backend\.venv
if errorlevel 1 goto failed
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
if errorlevel 1 goto failed
pushd frontend
call npm ci
if errorlevel 1 (popd & goto failed)
popd
echo.
echo Ready! Double-click START.bat to open your app.
pause
exit /b 0
:missing_node
echo Ask your facilitator to install Node.js 22 LTS, then try again.
goto failed
:missing_python
echo Ask your facilitator to install Python 3.12 with the Python launcher, then try again.
:failed
echo Setup stopped. Keep this window open and show the message above to your facilitator.
pause
exit /b 1
