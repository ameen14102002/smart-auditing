@echo off
title Smart Auditing portal helper
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Install it from https://nodejs.org ^(LTS^), then run this again. & pause & exit /b 1)
if not exist node_modules\playwright (echo First run: installing the helper, one minute... & call npm install --omit=dev || (pause & exit /b 1))
node server.js
pause
