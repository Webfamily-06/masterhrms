@echo off
setlocal
cd /d %~dp0

set CSC="C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
if not exist %CSC% (
  echo ERROR: .NET Framework 4.x C# compiler not found at %CSC%
  exit /b 1
)

if not exist dist mkdir dist

%CSC% /nologo /target:winexe /platform:x86 /optimize+ ^
  /out:dist\MasterHRMS-Device-Manager.exe ^
  /reference:System.dll ^
  /reference:System.Core.dll ^
  /reference:System.Configuration.dll ^
  /reference:System.Drawing.dll ^
  /reference:System.Windows.Forms.dll ^
  /reference:dlls\Interop.zkemkeeper.dll ^
  src\Program.cs src\ZkDeviceClient.cs src\MasterHrmsApiClient.cs src\MainForm.cs src\ExtrasForm.cs src\SyncUsersLogsForm.cs

if errorlevel 1 (
  echo BUILD FAILED!
  exit /b 1
)

copy /Y MasterHRMS-Device-Manager.exe.config dist\MasterHRMS-Device-Manager.exe.config >nul
copy /Y dlls\Interop.zkemkeeper.dll dist\Interop.zkemkeeper.dll >nul
xcopy /E /I /Y /Q dlls dist\dlls >nul

echo BUILD SUCCESS: dist\MasterHRMS-Device-Manager.exe
endlocal
