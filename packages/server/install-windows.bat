@echo off
REM Airgapped installation script for Windows
REM This script installs Memorizer without any network calls

echo ================================================
echo Memorizer Airgapped Installation for Windows
echo ================================================
echo.

REM Check if package file exists
if not exist "%~1" (
    echo Error: Package file not found!
    echo.
    echo Usage: install-windows.bat path\to\leon4s4-memorizer-server-2.1.x.tgz
    exit /b 1
)

echo Installing package: %~1
echo.

REM Install without running ANY scripts (prevents sharp from downloading)
echo Step 1: Installing package without scripts...
call npm install --ignore-scripts -g "%~1"

if errorlevel 1 (
    echo.
    echo Installation failed!
    exit /b 1
)

echo.
echo Step 2: Setting up models...

REM Find npm global directory
for /f "tokens=*" %%i in ('npm root -g') do set NPM_ROOT=%%i

REM Run our postinstall script manually
call node "%NPM_ROOT%\@leon4s4\memorizer-server\scripts\postinstall-bundled.js"

echo.
echo ================================================
echo Installation complete!
echo ================================================
echo.
echo You can now run:
echo   memorizer start
echo.

exit /b 0
