Set WshShell = CreateObject("WScript.Shell")
Dim dir
dir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = dir
WshShell.Run "node server.js --background", 0, False
