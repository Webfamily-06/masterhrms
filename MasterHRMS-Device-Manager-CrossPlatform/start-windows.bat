@echo off
cd /d %~dp0
echo Starting Master HRMS Biometric Device Manager (Windows)...
node server.js
if errorlevel 1 pause

