@echo off
REM Copia de seguridad de Registro de tareas.
REM Doble clic aca y listo. La ventana queda abierta al final para que se
REM pueda leer si algo salio mal.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\respaldo.ps1"
echo.
pause
