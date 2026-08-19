@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo =========================================
echo   Building EventStudio (Tauri App)
echo =========================================

echo.
echo [1/3] Installing dependencies...
call npm install

echo.
echo [2/3] Building the application...
call npm run tauri build

if !errorlevel! neq 0 (
    echo =========================================
    echo   Build Failed! Please check the errors.
    echo =========================================
    pause
    exit /b !errorlevel!
)

echo.
echo [3/3] Organizing output files into target\release\Win64...
set "OUT_DIR=src-tauri\target\release\Win64"
if not exist "%OUT_DIR%" mkdir "%OUT_DIR%"

REM 1. Copy EXE file
copy /y "src-tauri\target\release\event-studio.exe" "%OUT_DIR%\Event Studio.exe" >nul

REM 2. Copy MSI installer
for %%f in ("src-tauri\target\release\bundle\msi\*.msi") do (
    copy /y "%%f" "%OUT_DIR%\" >nul
)

REM 3. Package Portable ZIP
powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Test-Path '%OUT_DIR%\Event Studio_Win64.zip') { Remove-Item '%OUT_DIR%\Event Studio_Win64.zip' -Force }; Compress-Archive -Path '%OUT_DIR%\Event Studio.exe' -DestinationPath '%OUT_DIR%\Event Studio_Win64.zip' -Force"

echo =========================================
echo   Build Successful! 
echo   Generated files in target\release\Win64:
echo =========================================
dir /b "%OUT_DIR%"
echo.
pause
