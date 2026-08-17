@echo off
cd /d "%~dp0"
echo =========================================
echo   Building EventEditor (Tauri App)
echo =========================================

echo.
echo [1/2] Installing dependencies...
call npm install

echo.
echo [2/2] Building the application...
call npm run tauri build

echo.
if %errorlevel% neq 0 (
    echo =========================================
    echo   Build Failed! Please check the errors.
    echo =========================================
    pause
    exit /b %errorlevel%
)

echo =========================================
echo   Build Successful! 
echo   Executables are located in:
echo   src-tauri\target\release\
echo =========================================
pause
