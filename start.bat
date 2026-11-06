@echo off
setlocal
title MeetingActionLog - Meeting Decisions and Follow-Up Ledger
set "PATH=%PATH%;C:\Program Files\nodejs;C:\Users\THUNDERX\AppData\Roaming\npm"
cd /d "%~dp0"

echo ============================================================================
echo   MEETINGACTIONLOG -- Meeting Decisions and Follow-Up Ledger (Signal Ledger v2)
echo   Backend Development (CIA-II)
echo   Student : NITHIN KUMAR U
echo   USN     : 2102508611
echo ============================================================================
echo.

netstat -ano | findstr ":5000" | findstr "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo [1/3] Starting Express + MongoDB Backend API on http://localhost:5000 ...
    start "MeetingActionLog Backend API" /D "%~dp0" cmd /k "npm run dev -w @mal/server"
) else (
    echo [1/3] Express Backend API is already running on http://localhost:5000
)

netstat -ano | findstr ":5173" | findstr "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo [2/3] Starting React + Vite Web Application on http://localhost:5173 ...
    start "MeetingActionLog Web App" /D "%~dp0" cmd /k "npm run dev -w @mal/client"
) else (
    echo [2/3] React Web Application is already running on http://localhost:5173
)

echo [3/3] Waiting for Backend API (http://localhost:5000/api/health) and Web App (http://localhost:5173) to become ready...
powershell -NoProfile -ExecutionPolicy Bypass -Command "for ($i=0; $i -lt 45; $i++) { try { $a = Invoke-WebRequest -Uri 'http://localhost:5000/api/health' -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop; $b = Invoke-WebRequest -Uri 'http://localhost:5173' -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop; if ($a.StatusCode -eq 200 -and $b.StatusCode -eq 200) { break } } catch {} Start-Sleep -Seconds 1 }"

echo.
echo Opening http://localhost:5173 in your default browser...
start "" "http://localhost:5173"

echo.
echo ============================================================================
echo   Web App         : http://localhost:5173
echo   Intro Showcase  : http://localhost:5173/intro
echo   Customer Portal : http://localhost:5173/login
echo   Profile Page    : http://localhost:5173/profile
echo   Tutorials       : http://localhost:5173/tutorials
echo   About           : http://localhost:5173/about
echo   Backend API     : http://localhost:5000/api
echo   Health Check    : http://localhost:5000/api/health
echo ============================================================================
echo.
echo Both servers are running and http://localhost:5173 has been opened in your browser.
echo Run stop.bat at any time to stop all servers.
echo.
pause
