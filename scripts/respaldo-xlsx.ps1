# Respaldo diario del Excel a la nube.
#
# Genera el .xlsx leyendo la base y lo deja en la carpeta de Google Drive (o
# de OneDrive), que se encarga de subirlo sola.
#
# Corre solo de lunes a viernes a las 12, sin que nadie apriete nada. Por eso
# esta escrito para que no se cuelgue esperando a nadie y para que deje
# constancia de todo en respaldo.log: si un dia falla, tiene que poder verse
# despues, porque en el momento no hay nadie mirando.
#
# La carpeta de destino se configura en respaldo.config.json, en la raiz del
# proyecto.
#
# Para probarlo a mano:
#     .\scripts\respaldo-xlsx.ps1

[CmdletBinding()]
param(
  # Sobrescribe lo que diga el archivo de configuracion. Para probar.
  [string]$Destino,
  [int]$Conservar = 0
)

$ErrorActionPreference = "Stop"

$Proyecto = Split-Path -Parent $PSScriptRoot
$Registro = Join-Path $Proyecto "respaldo.log"

# ---------------------------------------------------------------------------
# Anotar todo lo que pasa
# ---------------------------------------------------------------------------

function Anotar($texto, $nivel = "INFO") {
  $linea = "{0}  {1,-5}  {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $nivel, $texto
  Add-Content -Path $Registro -Value $linea -Encoding utf8
  if ($nivel -eq "ERROR") { Write-Host $linea -ForegroundColor Red }
  elseif ($nivel -eq "AVISO") { Write-Host $linea -ForegroundColor Yellow }
  else { Write-Host $linea }
}

# Que el registro no crezca para siempre: cuando pasa el medio mega, se corta
# y se deja solo la mitad mas nueva.
if ((Test-Path $Registro) -and ((Get-Item $Registro).Length -gt 512KB)) {
  $lineas = Get-Content $Registro
  $lineas | Select-Object -Last ([int]($lineas.Count / 2)) |
    Set-Content $Registro -Encoding utf8
}

Anotar "--- inicio ---"

try {
  # -------------------------------------------------------------------------
  # 1. Leer la configuracion
  # -------------------------------------------------------------------------

  $config = $null
  $rutaConfig = Join-Path $Proyecto "respaldo.config.json"
  if (Test-Path $rutaConfig) {
    try {
      $config = Get-Content $rutaConfig -Raw -Encoding utf8 | ConvertFrom-Json
    } catch {
      Anotar "respaldo.config.json esta mal escrito, se usan los valores por defecto: $($_.Exception.Message)" "AVISO"
    }
  }

  if (-not $Destino -and $config -and $config.destino) { $Destino = $config.destino }
  if ($Conservar -le 0 -and $config -and $config.conservar) { $Conservar = [int]$config.conservar }
  if ($Conservar -le 0) { $Conservar = 60 }

  # -------------------------------------------------------------------------
  # 2. Decidir a donde va
  # -------------------------------------------------------------------------

  function Buscar-CarpetaNube {
    # Google Drive para escritorio monta una unidad virtual (normalmente G:).
    # OneDrive siempre cuelga del perfil del usuario.
    $candidatas = @(
      "G:\Mi unidad", "G:\My Drive",
      (Join-Path $env:USERPROFILE "Mi unidad"),
      (Join-Path $env:USERPROFILE "Google Drive"),
      $env:OneDrive,
      (Join-Path $env:USERPROFILE "OneDrive")
    )
    foreach ($c in $candidatas) { if ($c -and (Test-Path $c)) { return $c } }
    return $null
  }

  $enLaNube = $true

  if (-not $Destino) {
    $nube = Buscar-CarpetaNube
    if ($nube) {
      $Destino = Join-Path $nube "Registro de tareas - Excel"
    } else {
      # Sin nube disponible NO se aborta: se guarda igual en el disco. Perder
      # el archivo del dia seria peor que guardarlo en un lugar imperfecto.
      $Destino = Join-Path $Proyecto "respaldos"
      $enLaNube = $false
      Anotar "No encontre carpeta de Google Drive ni de OneDrive. Guardo local en $Destino" "AVISO"
    }
  }

  if (-not (Test-Path $Destino)) {
    New-Item -ItemType Directory -Path $Destino -Force | Out-Null
  }

  # -------------------------------------------------------------------------
  # 3. Generar el Excel
  # -------------------------------------------------------------------------

  # Node tiene que existir. En una tarea programada el PATH puede venir
  # distinto, asi que si no aparece se busca donde se instala por defecto.
  $npx = (Get-Command npx.cmd -ErrorAction SilentlyContinue).Source
  if (-not $npx) { $npx = (Get-Command npx -ErrorAction SilentlyContinue).Source }
  if (-not $npx -and (Test-Path "C:\Program Files\nodejs\npx.cmd")) {
    $npx = "C:\Program Files\nodejs\npx.cmd"
  }
  if (-not $npx) { throw "No encuentro npx (Node.js). Sin eso no se puede generar el Excel." }

  # Se escribe primero en un archivo temporal y recien despues se mueve al
  # destino. Asi en la carpeta de Drive nunca aparece un .xlsx a medio
  # escribir, que Drive subiria roto.
  $temporal = Join-Path $env:TEMP ("registro-" + [guid]::NewGuid().ToString("N") + ".xlsx")

  # Start-Process con la salida redirigida a archivos, y NO "& npx ... 2>&1".
  # En PowerShell 5.1 esa segunda forma envuelve cada linea de error del
  # programa en un objeto de error de PowerShell: el mensaje se pierde y, peor,
  # un aviso inofensivo de Node haria fracasar el respaldo aunque el Excel
  # haya salido bien.
  $archSalida = [System.IO.Path]::GetTempFileName()
  $archError  = [System.IO.Path]::GetTempFileName()

  try {
    $proceso = Start-Process -FilePath $npx `
      -ArgumentList @("tsx", "scripts/exportar.ts", "--salida", $temporal) `
      -WorkingDirectory $Proyecto `
      -NoNewWindow -Wait -PassThru `
      -RedirectStandardOutput $archSalida `
      -RedirectStandardError $archError

    $codigo = $proceso.ExitCode
    # UTF8 explicito: Node escribe en UTF-8 y sin esto los acentos y las
    # flechas de los mensajes de Prisma quedan ilegibles en el registro.
    $lineas = @()
    if (Test-Path $archSalida) { $lineas += Get-Content $archSalida -Encoding UTF8 }
    if (Test-Path $archError)  { $lineas += Get-Content $archError -Encoding UTF8 }
  } finally {
    Remove-Item $archSalida, $archError -Force -ErrorAction SilentlyContinue
  }

  if ($codigo -ne 0 -or -not (Test-Path $temporal)) {
    # Prisma escupe el mismo error repetido por cada consulta que fallo, y lo
    # rodea de un fragmento del codigo fuente. Lo unico que sirve para saber
    # que paso es la frase final; todo lo demas se descarta para que el
    # registro se pueda leer de un vistazo dentro de seis meses.
    # Ojo: este archivo se mantiene sin acentos ni simbolos raros a proposito.
    # PowerShell 5.1 lee los .ps1 en la codificacion vieja de Windows, y un
    # solo caracter fuera del alfabeto ingles le parte el script al medio.
    $ruido = '^prisma:error|^\s*\d+\s|^\s*$|^[A-Za-z]:\\|invocation in\s*$'
    $utiles = @($lineas |
      Where-Object { $_ -and $_.Trim() -and $_ -notmatch $ruido } |
      ForEach-Object { $_.Trim() } |
      Select-Object -Unique)
    $detalle = ($utiles | Select-Object -First 2) -join " | "
    if ($detalle.Length -gt 300) { $detalle = $detalle.Substring(0, 300) + "..." }
    if (-not $detalle) { $detalle = "sin detalle (codigo $codigo)" }
    throw "Fallo la generacion del Excel: $detalle"
  }

  $peso = (Get-Item $temporal).Length
  if ($peso -lt 2KB) {
    Remove-Item $temporal -Force -ErrorAction SilentlyContinue
    throw "El Excel salio demasiado chico ($peso bytes). No se guarda un archivo sospechoso."
  }

  # El script informa cuantos reclamos entraron; queda anotado para poder
  # mirar despues si un dia el numero baja de golpe. Si no se pudo leer, no se
  # aborta: el archivo ya esta bien y el dato es solo informativo.
  $reclamos = "?"
  $marca = $lineas | Where-Object { $_ -match '^reclamos=(\d+)$' } | Select-Object -First 1
  if ($marca -and $marca -match '^reclamos=(\d+)$') { $reclamos = $Matches[1] }

  # -------------------------------------------------------------------------
  # 4. Guardarlo
  # -------------------------------------------------------------------------

  $nombre = "registro-de-tareas-{0}.xlsx" -f (Get-Date -Format "yyyy-MM-dd")
  $final = Join-Path $Destino $nombre

  Move-Item $temporal $final -Force

  $donde = if ($enLaNube) { "en la nube" } else { "LOCAL (sin nube)" }
  Anotar ("Guardado {0}: {1}  ({2:N0} KB, {3} reclamos)" -f $donde, $nombre, ($peso / 1KB), $reclamos)

  # -------------------------------------------------------------------------
  # 5. Tirar los viejos
  # -------------------------------------------------------------------------

  $viejos = @(Get-ChildItem $Destino -Filter "registro-de-tareas-*.xlsx" |
              Sort-Object LastWriteTime -Descending |
              Select-Object -Skip $Conservar)
  if ($viejos.Count -gt 0) {
    $viejos | Remove-Item -Force
    Anotar "Borrados $($viejos.Count) archivos viejos (se conservan $Conservar)."
  }

  Anotar "--- fin ok ---"
  exit 0
}
catch {
  Anotar $_.Exception.Message "ERROR"
  Anotar "--- fin con error ---"
  exit 1
}
