@echo off
title Fast MCQ Practice - Local SQLite Server
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] Node.js is not installed.
  echo Please download and install Node.js v22 or newer from https://nodejs.org/
  pause
  exit /b 1
)

node start-local.mjs
if %errorlevel% neq 0 (
  echo.
  echo Server stopped with an error.
  pause
)
