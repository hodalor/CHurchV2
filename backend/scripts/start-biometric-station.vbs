Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptFolder = fso.GetParentFolderName(WScript.ScriptFullName)
powerShellScript = scriptFolder & "\start-biometric-station.ps1"

shell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & powerShellScript & """", 0, False
