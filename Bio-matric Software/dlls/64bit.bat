ECHO OFF 
setlocal
cd /d %~dp0
XCOPY /s/y/o/r "64bit" "%windir%\sysWOW64"
cd %windir%\sysWOW64
regsvr32 zkemkeeper.dll 
