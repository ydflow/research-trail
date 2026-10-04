@echo off
setlocal
cd /d "%~dp0"
where bun >nul 2>nul
if errorlevel 1 (
  echo Bun is required. Follow README.md to prepare dependencies first.
  exit /b 1
)
call bun run verify
exit /b %errorlevel%
