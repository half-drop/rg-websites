@echo off
chcp 65001 >nul
setlocal EnableExtensions

set "PROJECT_DIR=%~dp0wiki-site"
set "PID_FILE=%~dp0.wiki-server.pid"
set "WIKI_URL=http://127.0.0.1:3000"

if not exist "%PID_FILE%" goto start_server
set /p WIKI_PID=<"%PID_FILE%"
if not defined WIKI_PID goto stale_pid
powershell -NoProfile -Command "if (Get-Process -Id %WIKI_PID% -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if not errorlevel 1 goto stop_server

:stale_pid
del /q "%PID_FILE%" >nul 2>&1

:start_server

if not exist "%PROJECT_DIR%\package.json" (
    echo [ERROR] Project not found: %PROJECT_DIR%
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm was not found. Install Node.js 22.13 or newer first.
    pause
    exit /b 1
)

if not exist "%PROJECT_DIR%\node_modules" (
    echo First run: installing dependencies...
    pushd "%PROJECT_DIR%"
    call npm install
    if errorlevel 1 (
        popd
        echo [ERROR] Dependency installation failed.
        pause
        exit /b 1
    )
    popd
)

echo Starting Ravengard Wiki...
for /f %%P in ('powershell -NoProfile -Command "$p = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev','--','--host','127.0.0.1','--port','3000' -WorkingDirectory '%PROJECT_DIR%' -WindowStyle Minimized -PassThru; $p.Id"') do set "WIKI_PID=%%P"

if not defined WIKI_PID (
    echo [ERROR] Failed to start the server process.
    pause
    exit /b 1
)

>"%PID_FILE%" echo %WIKI_PID%

echo Waiting for the website...
powershell -NoProfile -Command "$url='%WIKI_URL%'; for($i=0; $i -lt 60; $i++){ try { $r=Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 1; if($r.StatusCode -lt 500){ Start-Process $url; exit 0 } } catch {}; Start-Sleep -Milliseconds 500 }; exit 1"

if errorlevel 1 (
    echo The server started but did not respond within 30 seconds.
    echo Open this address later: %WIKI_URL%
) else (
    echo Wiki started: %WIKI_URL%
)

powershell -NoProfile -Command "Start-Sleep -Seconds 3"
exit /b 0

:stop_server
echo Stopping Ravengard Wiki...
taskkill /PID %WIKI_PID% /T /F >nul 2>&1
del /q "%PID_FILE%" >nul 2>&1
echo Wiki stopped.
powershell -NoProfile -Command "Start-Sleep -Seconds 2"
exit /b 0
