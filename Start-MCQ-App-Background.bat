@echo off
title Fast MCQ Practice - Starting Background Server...
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] Node.js is not installed.
  echo Please install Node.js v22 or newer from https://nodejs.org/
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo First-time setup: Installing dependencies...
  call npm install
  if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

if not exist "data\" mkdir "data"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$url = 'http://127.0.0.1:3000/api/db/status'; $wd = (Get-Location).Path; $running = $false; try { $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 $url; if ($r.StatusCode -eq 200) { $running = $true } } catch {}; if (-not $running) { Start-Process -FilePath 'node' -ArgumentList '--experimental-strip-types', 'server.ts' -WorkingDirectory $wd -WindowStyle Hidden -RedirectStandardOutput 'data\server.log' -RedirectStandardError 'data\server-err.log'; for ($i = 0; $i -lt 60; $i++) { Start-Sleep -Milliseconds 500; try { $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 $url; if ($r.StatusCode -eq 200) { $running = $true; break } } catch {} } }; if ($running) { Start-Process 'http://localhost:3000' } else { Write-Host '[ERROR] Server failed to start.'; if (Test-Path 'data\server-err.log') { Get-Content 'data\server-err.log' -Tail 30 }; if (Test-Path 'data\server.log') { Get-Content 'data\server.log' -Tail 30 }; exit 1 }"

if %errorlevel% neq 0 (
  echo.
  echo Please check your Node.js version (v22+ required):
  node -v
  pause
)
