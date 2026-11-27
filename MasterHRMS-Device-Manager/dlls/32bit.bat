ECHO OFF 
setlocal
cd /d %~dp0
XCOPY /s/y/o/r "32bit" "%windir%\system32"
cd %windir%\system32
regsvr32 zkemkeeper.dll