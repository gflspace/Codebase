# DeeXHairlabb Database Setup Script
# This script helps set up the PostgreSQL database

Write-Host "=== DeeXHairlabb Database Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if PostgreSQL is installed
Write-Host "Checking PostgreSQL installation..." -ForegroundColor Yellow
$pgPath = Get-Command psql -ErrorAction SilentlyContinue

if (-not $pgPath) {
    Write-Host "ERROR: PostgreSQL is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install PostgreSQL from: https://www.postgresql.org/download/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "After installation, make sure PostgreSQL service is running:" -ForegroundColor Yellow
    Write-Host "  - Windows: Check Services app for 'postgresql-x64-XX' service" -ForegroundColor Yellow
    Write-Host "  - Or run: net start postgresql-x64-XX" -ForegroundColor Yellow
    exit 1
}

Write-Host "PostgreSQL found!" -ForegroundColor Green
Write-Host ""

# Prompt for database credentials
Write-Host "Enter PostgreSQL connection details:" -ForegroundColor Cyan
$dbUser = Read-Host "Database User (default: postgres)"
if ([string]::IsNullOrWhiteSpace($dbUser)) { $dbUser = "postgres" }

$dbPassword = Read-Host "Database Password" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
)

$dbHost = Read-Host "Database Host (default: localhost)"
if ([string]::IsNullOrWhiteSpace($dbHost)) { $dbHost = "localhost" }

$dbPort = Read-Host "Database Port (default: 5432)"
if ([string]::IsNullOrWhiteSpace($dbPort)) { $dbPort = "5432" }

$dbName = Read-Host "Database Name (default: deexhairlabb)"
if ([string]::IsNullOrWhiteSpace($dbName)) { $dbName = "deexhairlabb" }

# Create .env file
Write-Host ""
Write-Host "Creating .env file..." -ForegroundColor Yellow

$envContent = @"
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL="postgresql://$dbUser`:$dbPasswordPlain@$dbHost`:$dbPort/$dbName?schema=public"

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

$envPath = Join-Path $PSScriptRoot "backend\.env"
$envContent | Out-File -FilePath $envPath -Encoding UTF8 -NoNewline

Write-Host ".env file created at: $envPath" -ForegroundColor Green
Write-Host ""

# Try to create database
Write-Host "Attempting to create database '$dbName'..." -ForegroundColor Yellow

$env:PGPASSWORD = $dbPasswordPlain
$createDbCommand = "CREATE DATABASE $dbName;"

try {
    $result = echo $createDbCommand | psql -h $dbHost -p $dbPort -U $dbUser -d postgres 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database '$dbName' created successfully!" -ForegroundColor Green
    } else {
        if ($result -match "already exists") {
            Write-Host "Database '$dbName' already exists. Continuing..." -ForegroundColor Yellow
        } else {
            Write-Host "Note: Could not create database automatically." -ForegroundColor Yellow
            Write-Host "You may need to create it manually:" -ForegroundColor Yellow
            Write-Host "  psql -U $dbUser -c `"CREATE DATABASE $dbName;`"" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host "Could not create database automatically. Please create it manually." -ForegroundColor Yellow
    Write-Host "Run: psql -U $dbUser -c `"CREATE DATABASE $dbName;`"" -ForegroundColor Cyan
}

$env:PGPASSWORD = ""

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Make sure PostgreSQL service is running" -ForegroundColor White
Write-Host "2. Run database migrations:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Cyan
Write-Host "   npm run db:migrate" -ForegroundColor Cyan
Write-Host "3. Seed the database:" -ForegroundColor White
Write-Host "   npm run db:seed" -ForegroundColor Cyan
Write-Host "4. Start the backend server:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host ""
