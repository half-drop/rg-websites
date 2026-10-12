@echo off
node "%~dp0wiki-site\scripts\toggle.mjs" %*
if errorlevel 1 pause
