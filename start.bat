@echo off
chcp 65001 >nul
title Web3D Platform — 母舰系统
echo.
echo  ==========================================
echo        Web3D Platform  v1.0
echo    API   →  http://localhost:3700
echo    UI    →  http://localhost:3701
echo  ==========================================
echo.

:: 安装依赖（首次运行）
if not exist "server\node_modules" (
  echo [1/2] 正在安装服务端依赖...
  pushd server && npm install && popd
)
if not exist "client\node_modules" (
  echo [2/2] 正在安装前端依赖...
  pushd client && npm install && popd
)

:: 启动后端 API
start "Web3D API Server" cmd /k "pushd server && node index.js"
timeout /t 2 /nobreak >nul

:: 启动前端 Vite
start "Web3D UI Client" cmd /k "pushd client && npm run dev"
timeout /t 3 /nobreak >nul

:: 打开浏览器
start http://localhost:3701

echo.
echo  两个服务窗口已启动，浏览器将自动打开。
echo  关闭此窗口不影响运行中的服务。
pause
