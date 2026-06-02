@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Abrindo o Bible Study em http://localhost:3000 ...
start "" http://localhost:3000
node server.js
