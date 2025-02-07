@echo off
echo Modbus TCP Simulator baslatiliyor...
start "" "modbus-simulator.exe"
timeout /t 2
start "" "http://localhost:3000" 