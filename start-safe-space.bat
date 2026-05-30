@echo off
REM Safe Space Hub - Startup Script
REM This script starts the Node.js server and opens the application in your browser

cd /d "%~dp0"

REM Check if Node exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

REM Start the server
echo Starting Safe Space Hub server...
start "" http://localhost:3000
timeout /t 2 /nobreak
node server.js
