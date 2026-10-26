# InsureChain One-Click Local Startup Script for PowerShell
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "      Starting InsureChain Complete System Stack        " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Start Hardhat Node
Write-Host "`n[1/4] Starting Hardhat Local Blockchain Node..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location d:\InsureChain\blockchain; npx hardhat node"

Start-Sleep -Seconds 5

# 2. Deploy Smart Contract
Write-Host "`n[2/4] Deploying Smart Contract to Local Node..." -ForegroundColor Yellow
Set-Location d:\InsureChain\blockchain
npx hardhat run scripts/deploy.js --network localhost
Set-Location d:\InsureChain

# 3. Start Express Backend API
Write-Host "`n[3/4] Starting Express Backend Service (Port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location d:\InsureChain\backend; npm start"

# 4. Start React Frontend
Write-Host "`n[4/4] Starting React Frontend Client (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location d:\InsureChain\frontend; npm run dev"

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host " All services started successfully!" -ForegroundColor Green
Write-Host " Open your browser at: http://localhost:3000" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
