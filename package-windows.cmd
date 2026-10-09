@echo off
setlocal
cd /d "%~dp0"
uv sync --project services/backend --locked --group packaging
if errorlevel 1 exit /b 1
call bun.cmd install --frozen-lockfile
if errorlevel 1 exit /b 1
call bun.cmd run prepare:desktop
if errorlevel 1 exit /b 1
call bun.cmd run build
if errorlevel 1 exit /b 1
services\backend\.venv\Scripts\python.exe scripts\package-backend.py
if errorlevel 1 exit /b 1
node scripts\package-windows.mjs
exit /b %errorlevel%
