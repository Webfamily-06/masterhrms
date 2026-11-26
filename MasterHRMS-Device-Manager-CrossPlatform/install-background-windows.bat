@echo off
setlocal
cd /d %~dp0
set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
copy /Y "%~dp0run-background-windows.vbs" "%STARTUP%\MasterHRMS-Biometric-AutoSync.vbs" >nul
wscript "%~dp0run-background-windows.vbs"
echo.
echo [OK] Master HRMS Biometric Background Auto-Sync installed!
echo      - Runs silently in background (no terminal window)
echo      - Auto-starts automatically on every Windows login/reboot
echo      - Open UI anytime at: http://127.0.0.1:4375
echo.
pause
