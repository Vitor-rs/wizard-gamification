' ============================================================
' WIZARD GAMES — INICIALIZADOR DESKTOP SILENCIOSO
' Zero Janelas de Terminal • Wrapper Nativo Desktop
' ============================================================

Set oShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
rootDir = fso.GetParentFolderName(scriptDir)
hubDir = rootDir & "\apps\hub"
hubApp = hubDir & "\app.py"
iconPath = hubDir & "\static\favicon.ico"

' 1. Cria ou atualiza o atalho na Area de Trabalho com o icone oficial
On Error Resume Next
desktopPath = oShell.SpecialFolders("Desktop")
shortcutPath = desktopPath & "\Wizard Games.lnk"

If fso.FileExists(iconPath) Then
    Set sc = oShell.CreateShortcut(shortcutPath)
    sc.TargetPath = "wscript.exe"
    sc.Arguments = "//b //nologo """ & WScript.ScriptFullName & """"
    sc.WorkingDirectory = rootDir
    sc.IconLocation = iconPath & ",0"
    sc.Description = "Wizard Games - Central de Gamificacao (Desktop App)"
    sc.Save
End If
On Error GoTo 0

' 2. Localiza o executavel do Python
python = "python.exe"
If fso.FileExists("C:\Python314\python.exe") Then
    python = "C:\Python314\python.exe"
ElseIf fso.FileExists(oShell.ExpandEnvironmentStrings("%LOCALAPPDATA%\Programs\Python\Python312\python.exe")) Then
    python = oShell.ExpandEnvironmentStrings("%LOCALAPPDATA%\Programs\Python\Python312\python.exe")
ElseIf fso.FileExists(rootDir & "\apps\two-truths\.venv\Scripts\python.exe") Then
    python = rootDir & "\apps\two-truths\.venv\Scripts\python.exe"
End If

' 3. Executa o app.py 100% invisivel (SW_HIDE = 0 oculta totalmente a janela do console)
cmd = """" & python & """ """ & hubApp & """"
oShell.CurrentDirectory = hubDir
oShell.Run cmd, 0, False
