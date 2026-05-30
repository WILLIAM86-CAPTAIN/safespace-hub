$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $DesktopPath "Safe Space.lnk"
$TargetPath = "C:\Users\SAGE WILLIAMZ\Desktop\TH SAFE SPACE HUB\start-safe-space.bat"
$WorkingDirectory = "C:\Users\SAGE WILLIAMZ\Desktop\TH SAFE SPACE HUB"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetPath
$Shortcut.WorkingDirectory = $WorkingDirectory
$Shortcut.Description = "Launch Safe Space Hub - Mental Wellness Support"
$Shortcut.Save()

Write-Host "Shortcut created successfully at: $ShortcutPath"
