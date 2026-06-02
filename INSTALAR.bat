@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Instalando o Bible Study...
node setup.js
echo.
echo Pressione qualquer tecla para fechar.
pause >nul
