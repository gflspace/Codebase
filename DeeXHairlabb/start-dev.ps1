# DeeXHairlabb Development Startup Script
# This script checks prerequisites and starts the development servers

Write-Host "=== DeeXHairlabb Development Startup ===" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "ERROR: Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js 18+ from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}
Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green

# Check npm
Write-Host "Checking npm..." -ForegroundColor Yellow
$npmVersion = npm --version 2>$null
if (-not $npmVersion) {
    Write-Host "ERROR: npm is not installed!" -ForegroundColor Red
    exit 1
}
Write-Host "npm found: v$npmVersion" -ForegroundColor Green

# Check PostgreSQL
Write-Host "Checking PostgreSQL..." -ForegroundColor Yellow
$pgService = Get-Service | Where-Object {$_.Name -like "*postgres*" -and $_.Status -eq "Running"}
if (-not $pgService) {
    Write-Host "WARNING: PostgreSQL service not found or not running!" -ForegroundColor Yellow
    Write-Host "Please ensure PostgreSQL is installed and running." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To start PostgreSQL service:" -ForegroundColor Cyan
    Write-Host "  Get-Service | Where-Object {`$_.Name -like '*postgres*'}" -ForegroundColor White
    Write-Host "  Start-Service postgresql-x64-XX  # Replace XX with your version" -ForegroundColor White
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
} else {
    Write-Host "PostgreSQL service is running!" -ForegroundColor Green
}

# Check .env files
Write-Host ""
Write-Host "Checking environment files..." -ForegroundColor Yellow

$backendEnv = Join-Path $PSScriptRoot "backend\.env"
$frontendEnv = Join-Path $PSScriptRoot "frontend\.env.local"

if (-not (Test-Path $backendEnv)) {
    Write-Host "WARNING: backend/.env not found!" -ForegroundColor Yellow
    Write-Host "Creating default .env file..." -ForegroundColor Yellow
    
    $defaultEnv = @"
# Server
PORT=3001
NODE_ENV=development

# Database - UPDATE THIS WITH YOUR POSTGRESQL CREDENTIALS
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/deexhairlabb?schema=public"

# JWT
JWT_SECRET=deexhairlabb-super-secret-jwt-key-change-in-production-2024
JWT_EXPIRES_IN=7d

# Google Sheets API (for exports) - Optional
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEETS_FOLDER_ID=

# AI/LLM (if using external API) - Optional
AI_API_KEY=
AI_API_URL=

# CORS
FRONTEND_URL=http://localhost:3000
"@
    
    $defaultEnv | Out-File -FilePath $backendEnv -Encoding UTF8
    Write-Host "Created $backendEnv - PLEASE UPDATE DATABASE_URL!" -ForegroundColor Yellow
} else {
    Write-Host "backend/.env found" -ForegroundColor Green
}

if (-not (Test-Path $frontendEnv)) {
    Write-Host "Creating frontend/.env.local..." -ForegroundColor Yellow
    
    $frontendEnvContent = @"
NEXT_PUBLIC_API_URL=http://localhost:3001
"@
    
    $frontendEnvContent | Out-File -FilePath $frontendEnv -Encoding UTF8
    Write-Host "Created $frontendEnv" -ForegroundColor Green
} else {
    Write-Host "frontend/.env.local found" -ForegroundColor Green
}

# Check if node_modules exist
Write-Host ""
Write-Host "Checking dependencies..." -ForegroundColor Yellow

$backendNodeModules = Join-Path $PSScriptRoot "backend\node_modules"
$frontendNodeModules = Join-Path $PSScriptRoot "frontend\node_modules"

if (-not (Test-Path $backendNodeModules)) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location (Join-Path $PSScriptRoot "backend")
    npm install
    Set-Location $PSScriptRoot
}

if (-not (Test-Path $frontendNodeModules)) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location (Join-Path $PSScriptRoot "frontend")
    npm install
    Set-Location $PSScriptRoot
}

Write-Host "Dependencies checked!" -ForegroundColor Green

# Check database
Write-Host ""
Write-Host "Checking database setup..." -ForegroundColor Yellow

Set-Location (Join-Path $PSScriptRoot "backend")

# Try to connect to database
$envContent = Get-Content $backendEnv | Where-Object {$_ -match "DATABASE_URL"}
if ($envContent) {
    $dbUrl = ($envContent -split "=")[1].Trim().Trim('"')
    Write-Host "Database URL configured" -ForegroundColor Green
    
    # Check if migrations have been run
    $migrationsPath = Join-Path $PSScriptRoot "backend\prisma\migrations"
    if (-not (Test-Path (Join-Path $migrationsPath "*"))) {
        Write-Host ""
        Write-Host "Database migrations not found!" -ForegroundColor Yellow
        Write-Host "Would you like to run migrations now? (y/n)" -ForegroundColor Cyan
        $runMigrations = Read-Host
        
        if ($runMigrations -eq "y") {
            Write-Host "Generating Prisma client..." -ForegroundColor Yellow
            npm run db:generate
            
            Write-Host "Running migrations..." -ForegroundColor Yellow
            npm run db:migrate
            
            Write-Host "Seeding database..." -ForegroundColor Yellow
            npm run db:seed
        }
    } else {
        Write-Host "Database migrations found" -ForegroundColor Green
    }
} else {
    Write-Host "WARNING: DATABASE_URL not found in .env!" -ForegroundColor Yellow
}

Set-Location $PSScriptRoot

# Start servers
Write-Host ""
Write-Host "=== Starting Development Servers ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend will start on: http://localhost:3001" -ForegroundColor Green
Write-Host "Frontend will start on: http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop all servers" -ForegroundColor Yellow
Write-Host ""

# Start both servers
npm run dev
