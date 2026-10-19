@echo off
REM =========================================================
REM  Clifton Apparels Ltd. - Dyeing & Finishing Dashboard
REM  Author : Ikramul Hasan Rakib
REM           Executive, Central IE Department, Clifton Group
REM  (c) 2026 Ikramul Hasan Rakib. All rights reserved.
REM =========================================================
setlocal EnableExtensions
cd /d "%~dp0"

echo =========================================================
echo   Clifton Apparels Ltd. - Dyeing ^& Finishing Dashboard
echo   Launcher: builds the data, opens the dashboard, watches
echo             the workbooks and rebuilds on every save.
echo   .
echo   Author: Ikramul Hasan Rakib - Executive, Central IE Dept.
echo =========================================================
echo.

where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Python was not found on PATH.
  echo         Install Python 3.9+ from https://www.python.org/downloads/
  echo         and tick "Add python.exe to PATH" during setup, then retry.
  echo.
  pause
  exit /b 1
)

python -c "import openpyxl" >nul 2>nul
if errorlevel 1 (
  echo Installing required packages ...
  python -m pip install --disable-pip-version-check -r requirements.txt
  if errorlevel 1 (
    echo.
    echo [ERROR] Could not install dependencies ^(is the machine online?^).
    echo         Run "python -m pip install -r requirements.txt" manually.
    echo.
    pause
    exit /b 1
  )
  echo.
)

echo Building dashboard data from the workbooks ...
python scripts\build.py
if errorlevel 1 (
  echo.
  echo [WARNING] The initial build failed. The watcher will retry whenever
  echo           a workbook is saved ^(close the file in Excel if it is open^).
  echo.
)

echo.
echo Opening the dashboard in your default browser ...
start "" "dashboard\index.html"

echo.
echo Close this window (or press Ctrl+C) to stop watching.
echo.
python scripts\watch.py --no-build

echo.
echo Watcher stopped.
pause
endlocal
