# Deja el respaldo del Excel programado: lunes a viernes a las 12.
#
# Se corre UNA sola vez. Despues Windows se encarga.
#
# No hace falta ser administrador ni escribir ninguna contrasena: la tarea
# corre con la sesion del usuario que la crea.
#
# Para ver como quedo:      Get-ScheduledTask "Registro de tareas - Excel diario"
# Para probarla al toque:   Start-ScheduledTask "Registro de tareas - Excel diario"
# Para sacarla:             Unregister-ScheduledTask "Registro de tareas - Excel diario"

$ErrorActionPreference = "Stop"

$Nombre   = "Registro de tareas - Excel diario"
$Proyecto = Split-Path -Parent $PSScriptRoot
$Script   = Join-Path $PSScriptRoot "respaldo-xlsx.ps1"

if (-not (Test-Path $Script)) { throw "No encuentro $Script" }

# -WindowStyle Hidden para que a las 12 no aparezca una ventana negra en la
# cara de quien este usando la PC.
$accion = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Script`"" `
  -WorkingDirectory $Proyecto

$disparador = New-ScheduledTaskTrigger `
  -Weekly -DaysOfWeek Monday, Tuesday, Wednesday, Thursday, Friday `
  -At "12:00"

$opciones = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -DontStopIfGoingOnBatteries `
  -AllowStartIfOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
  -MultipleInstances IgnoreNew

# StartWhenAvailable es la clave: si a las 12 la PC estaba apagada, la tarea
# corre en cuanto se prende en vez de saltearse el dia.

$quien = New-ScheduledTaskPrincipal `
  -UserId "$env:USERDOMAIN\$env:USERNAME" `
  -LogonType Interactive `
  -RunLevel Limited

Register-ScheduledTask `
  -TaskName $Nombre `
  -Action $accion `
  -Trigger $disparador `
  -Settings $opciones `
  -Principal $quien `
  -Description "Genera el Excel de Registro de tareas y lo deja en la carpeta de la nube. Lunes a viernes a las 12." `
  -Force | Out-Null

Write-Host ""
Write-Host "Listo. La tarea quedo programada:" -ForegroundColor Green
Get-ScheduledTask -TaskName $Nombre |
  Select-Object TaskName, State |
  Format-Table -AutoSize
(Get-ScheduledTask -TaskName $Nombre).Triggers |
  Select-Object @{n = 'Dias'; e = { $_.DaysOfWeek } }, StartBoundary |
  Format-Table -AutoSize
