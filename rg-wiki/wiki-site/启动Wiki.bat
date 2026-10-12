@echo off
node "%~dp0scripts\toggle.mjs" %*
if errorlevel 1 pause
