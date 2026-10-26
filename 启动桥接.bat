@echo off
chcp 65001 >nul
title 启动桥接（自动认 DSH 端口）
cd /d "%~dp0"
for /f "delims=" %%p in ('node dsh-port.mjs --patch') do set DSH_PORT=%%p
if "%DSH_PORT%"=="0" (
  echo 没找到正在运行的 DSH，先把 DeepSeek Harness 打开。
  pause
  exit /b 1
)
echo DSH 端口: %DSH_PORT%  （已写进 config.json）
call start.bat
