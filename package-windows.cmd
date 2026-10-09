@echo off
setlocal
cd /d "%~dp0"
set "RT_PACKAGE_VERSION=%~1"
if not defined RT_PACKAGE_VERSION set "RT_PACKAGE_VERSION=1.0.0-internal.24"
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
node scripts\package-windows.mjs "%RT_PACKAGE_VERSION%"
exit /b %errorlevel%
