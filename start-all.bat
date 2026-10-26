@echo off
echo ========================================================
echo       Starting InsureChain Complete System Stack
echo ========================================================
echo.

echo [1/4] Starting Hardhat Local Blockchain Node...
start "InsureChain Blockchain Node" cmd /k "cd blockchain && npx hardhat node"

echo Waiting for blockchain node to initialize...
timeout /t 5 /nobreak > nul

echo [2/4] Deploying Smart Contract to Local Node...
cd blockchain
call npx hardhat run scripts/deploy.js --network localhost
cd ..

echo.
echo [3/4] Starting Express Backend Service (Port 5000)...
start "InsureChain Backend API" cmd /k "cd backend && npm start"

echo.
echo [4/4] Starting React Frontend Client (Port 3000)...
start "InsureChain Web UI" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo  All services started!
echo  Open your browser at: http://localhost:3000
echo ========================================================
pause
