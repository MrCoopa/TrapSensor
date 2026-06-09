@echo off
title CatchSensor — NB-IoT MQTT Simulator
echo.
echo  Starte NB-IoT MQTT Simulator...
echo.

:: Node.js path
set NODE="D:\CatchSensor\NodeJS\node.exe"

:: Use backend's mqtt package
set NODE_PATH=D:\CatchSensor\CatchSensor\backend\node_modules

:: Run simulator (pass through any arguments, e.g. --host 192.168.1.100)
%NODE% "%~dp0nb-iot-simulator.js" %*

pause
