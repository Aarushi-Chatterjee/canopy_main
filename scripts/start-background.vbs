Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)
strProjectRoot = fso.GetParentFolderName(strPath)

' Run node scripts/dev.js with hidden window (0) and asynchronous (False)
WshShell.CurrentDirectory = strProjectRoot
WshShell.Run "node scripts/dev.js", 0, False
