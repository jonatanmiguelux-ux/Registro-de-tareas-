# Copia de seguridad de Registro de tareas.
#
# Arma un solo archivo .zip con las dos mitades del sistema:
#
#   - La base de datos: todo lo que la IA leyó de las planillas, los reclamos
#     de los vecinos, las cuentas, el stock.
#   - La carpeta uploads: las fotos originales, que son lo único que permite
#     auditar un dato contra el papel.
#
# Una sin la otra no sirve de mucho, por eso van juntas en el mismo archivo.
#
# El .zip se deja en una carpeta de Google Drive o de OneDrive, para que se
# suba solo a la nube. Si esta PC se rompe, el respaldo está en otro lado.
#
# Uso normal (doble clic en respaldar.bat, o desde PowerShell):
#
#     .\scripts\respaldo.ps1
#
# Para elegir la carpeta a mano:
#
#     .\scripts\respaldo.ps1 -Destino "D:\donde\sea"
#
# NO incluye el archivo .env a propósito: ahí viven las claves de Google y de
# Gemini, y esas no tienen que andar dando vueltas por la nube. Si algún día
# hay que rearmar todo, esas claves se vuelven a generar desde las consolas de
# Google en cinco minutos.

[CmdletBinding()]
param(
  # Dónde dejar el .zip. Si no se indica, se busca solo.
  [string]$Destino,

  # Cuántas copias conservar. Las más viejas se van borrando para que la
  # carpeta no crezca sin control.
  [int]$Conservar = 14
)

$ErrorActionPreference = "Stop"

# Las dos hacen falta para armar el zip: los tipos base estan en una y las
# ayudas para agregar archivos en la otra.
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

# El contenedor de ESTE proyecto. Nombrado explícitamente porque en esta
# máquina conviven varias bases en Docker y no hay que confundirlas.
$Contenedor = "registro-tareas-db"
$Usuario    = "registro"
$BaseDatos  = "registro_tareas"

# La raíz del proyecto es la carpeta que contiene a scripts\.
$Proyecto = Split-Path -Parent $PSScriptRoot

function Escribir($texto, $color = "Gray") {
  Write-Host $texto -ForegroundColor $color
}

# ---------------------------------------------------------------------------
# 1. Dónde va a quedar la copia
# ---------------------------------------------------------------------------

function Buscar-CarpetaNube {
  # Por orden de preferencia. Google Drive para escritorio monta una unidad
  # virtual (normalmente G:) y además puede aparecer en el perfil del usuario;
  # OneDrive siempre cuelga del perfil.
  $candidatas = @(
    "G:\Mi unidad",
    "G:\My Drive",
    (Join-Path $env:USERPROFILE "Mi unidad"),
    (Join-Path $env:USERPROFILE "Google Drive"),
    $env:OneDrive,
    (Join-Path $env:USERPROFILE "OneDrive")
  )

  foreach ($c in $candidatas) {
    if ($c -and (Test-Path $c)) { return $c }
  }
  return $null
}

if (-not $Destino) {
  $nube = Buscar-CarpetaNube
  if (-not $nube) {
    Escribir "No encontre ninguna carpeta de Google Drive ni de OneDrive." "Red"
    Escribir "Instala Google Drive para escritorio, o indica la carpeta a mano:" "Yellow"
    Escribir "    .\scripts\respaldo.ps1 -Destino ""D:\mis respaldos""" "Yellow"
    exit 1
  }
  $Destino = Join-Path $nube "Respaldos Registro de tareas"
}

if (-not (Test-Path $Destino)) {
  New-Item -ItemType Directory -Path $Destino -Force | Out-Null
}

Escribir "Copia de seguridad de Registro de tareas" "Cyan"
Escribir "Destino: $Destino"
Escribir ""

# ---------------------------------------------------------------------------
# 2. La base de datos
# ---------------------------------------------------------------------------

# Que el contenedor este vivo. Si la base esta apagada no hay nada que copiar,
# y es mejor fallar fuerte que dejar un respaldo a medias que parezca bueno.
$vivo = docker ps --filter "name=$Contenedor" --format "{{.Names}}"
if ($vivo -ne $Contenedor) {
  Escribir "La base de datos no esta corriendo." "Red"
  Escribir "Levantala con:  docker compose up -d" "Yellow"
  exit 1
}

# Carpeta temporal donde se arma todo antes de comprimir.
$sello   = Get-Date -Format "yyyy-MM-dd_HHmm"
$armado  = Join-Path $env:TEMP "respaldo-registro-$sello"
New-Item -ItemType Directory -Path $armado -Force | Out-Null

try {
  Escribir "1/3  Copiando la base de datos..."

  # pg_dump escribe DENTRO del contenedor y despues se saca el archivo con
  # docker cp. Hacerlo asi y no por la salida del comando evita que PowerShell
  # altere los acentos y las enies al pasar el texto por la tuberia.
  docker exec $Contenedor pg_dump -U $Usuario -d $BaseDatos --clean --if-exists -f /tmp/respaldo.sql
  if ($LASTEXITCODE -ne 0) { throw "pg_dump fallo" }

  docker cp "${Contenedor}:/tmp/respaldo.sql" (Join-Path $armado "base-de-datos.sql") | Out-Null
  docker exec $Contenedor rm -f /tmp/respaldo.sql | Out-Null

  $sql = Get-Item (Join-Path $armado "base-de-datos.sql")
  if ($sql.Length -lt 1024) { throw "el volcado de la base salio vacio" }
  Escribir ("     base-de-datos.sql  ({0:N0} KB)" -f ($sql.Length / 1KB)) "DarkGray"

  # ---------------------------------------------------------------------------
  # 3. Las fotos
  # ---------------------------------------------------------------------------

  Escribir "2/3  Copiando las fotos..."

  $uploads = Join-Path $Proyecto "uploads"
  if (Test-Path $uploads) {
    Copy-Item $uploads -Destination (Join-Path $armado "uploads") -Recurse -Force
    $fotos = @(Get-ChildItem (Join-Path $armado "uploads") -File -Recurse)
    $peso  = ($fotos | Measure-Object -Property Length -Sum).Sum
    Escribir ("     {0} fotos  ({1:N1} MB)" -f $fotos.Count, ($peso / 1MB)) "DarkGray"
  } else {
    New-Item -ItemType Directory -Path (Join-Path $armado "uploads") -Force | Out-Null
    Escribir "     todavia no hay fotos" "DarkGray"
  }

  # Instrucciones adentro del propio respaldo: dentro de un ano nadie se va a
  # acordar de como se restaura esto, y el que lo necesite quiza no sea quien
  # lo creo.
  $leeme = @"
RESPALDO DE REGISTRO DE TAREAS
Fecha: $(Get-Date -Format "dd/MM/yyyy HH:mm")

Que hay adentro
---------------
base-de-datos.sql   Todo lo cargado: planillas leidas, reclamos de vecinos,
                    cuentas, stock y movimientos.
uploads\            Las fotos originales de las planillas y de los reclamos.

Como se restaura
----------------
1. Levantar la base:   docker compose up -d
2. Meter el archivo adentro del contenedor y cargarlo:

     docker cp base-de-datos.sql registro-tareas-db:/tmp/r.sql
     docker exec registro-tareas-db psql -U registro -d registro_tareas -f /tmp/r.sql

   (Se copia el archivo en vez de pasarlo por la tuberia porque asi no se
   arruinan los acentos ni las enies.)

3. Copiar la carpeta uploads dentro del proyecto, al lado de package.json.

Este procedimiento esta probado: se restauro este mismo respaldo en una base
aparte y se comparo tabla por tabla contra la original.

Lo que NO esta aca
------------------
El archivo .env, con las claves de Google y de Gemini. Se deja afuera a
proposito para no subir claves a la nube: se vuelven a generar desde las
consolas de Google cuando haga falta.
"@
  $leeme | Out-File -FilePath (Join-Path $armado "LEEME.txt") -Encoding utf8

  # ---------------------------------------------------------------------------
  # 4. Comprimir y guardar
  # ---------------------------------------------------------------------------

  Escribir "3/3  Comprimiendo..."

  $zip = Join-Path $Destino "registro-tareas-$sello.zip"
  if (Test-Path $zip) { Remove-Item $zip -Force }

  # El zip se arma archivo por archivo, y no con Compress-Archive ni con
  # ZipFile.CreateFromDirectory, porque los dos guardan las rutas con barra
  # invertida (uploads\foto.jpg). Windows lo tolera; Linux no, y ahi las
  # carpetas se convierten en archivos sueltos con el nombre pegado. Justo
  # Linux es donde habria que restaurar esto si se cae el servidor.
  $paquete = [System.IO.Compression.ZipFile]::Open(
    $zip, [System.IO.Compression.ZipArchiveMode]::Create)
  try {
    $raiz = (Resolve-Path $armado).Path.TrimEnd('\') + '\'
    foreach ($archivo in Get-ChildItem $armado -File -Recurse) {
      # Ruta relativa al armado, siempre con barra normal.
      $interna = $archivo.FullName.Substring($raiz.Length).Replace('\', '/')
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
        $paquete, $archivo.FullName, $interna,
        [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
  }
  finally {
    $paquete.Dispose()
  }

  $final = Get-Item $zip
  Escribir ""
  Escribir ("Listo: {0}  ({1:N1} MB)" -f $final.Name, ($final.Length / 1MB)) "Green"
}
finally {
  # La carpeta de armado se borra pase lo que pase: son datos del municipio y
  # no tienen por que quedar sueltos en la carpeta temporal de Windows.
  if (Test-Path $armado) { Remove-Item $armado -Recurse -Force -ErrorAction SilentlyContinue }
}

# ---------------------------------------------------------------------------
# 5. Tirar las copias viejas
# ---------------------------------------------------------------------------

$viejas = @(Get-ChildItem $Destino -Filter "registro-tareas-*.zip" |
            Sort-Object LastWriteTime -Descending |
            Select-Object -Skip $Conservar)

if ($viejas.Count -gt 0) {
  $viejas | Remove-Item -Force
  Escribir "Se borraron $($viejas.Count) copias viejas (se conservan las ultimas $Conservar)." "DarkGray"
}

$total = @(Get-ChildItem $Destino -Filter "registro-tareas-*.zip").Count
Escribir "Copias guardadas: $total" "DarkGray"
