@echo off
setlocal
cd /d "%~dp0"
where bun >nul 2>nul
if errorlevel 1 goto missing_bun
where uv >nul 2>nul
if errorlevel 1 goto missing_uv
where node >nul 2>nul
if errorlevel 1 goto missing_node
set NODE_USE_ENV_PROXY=1
set INSTALL_OFFLINE=
if "%RESEARCH_TRAIL_OFFLINE%"=="1" set INSTALL_OFFLINE=--offline
call bun install --frozen-lockfile %INSTALL_OFFLINE%
if errorlevel 1 goto failed
uv sync --project services\backend --frozen %INSTALL_OFFLINE%
if errorlevel 1 goto failed
if "%RESEARCH_TRAIL_OFFLINE%"=="1" node scripts\prepare-electron.mjs --check
if errorlevel 1 goto failed
call bun run dev
if errorlevel 1 goto failed
exit /b 0
:missing_bun
echo Bun is required. Install Bun, then run start-dev.cmd again.
exit /b 1
:missing_uv
echo uv is required. Install uv, then run start-dev.cmd again.
exit /b 1
:missing_node
echo Node.js 24 or newer is required. Install Node.js, then try again.
exit /b 1
:failed
echo ResearchTrail startup failed. Review the error above.
exit /b 1
