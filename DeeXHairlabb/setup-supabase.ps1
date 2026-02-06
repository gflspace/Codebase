# DeeXHairlabb Supabase Setup Script
# This script helps configure the project for Supabase

Write-Host "=== DeeXHairlabb Supabase Setup ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "This script will help you configure DeeXHairlabb to use Supabase." -ForegroundColor Yellow
Write-Host ""

# Check if Supabase credentials are provided
Write-Host "Step 1: Supabase Credentials" -ForegroundColor Cyan
Write-Host ""
Write-Host "You need to get these from your Supabase project:" -ForegroundColor Yellow
Write-Host "  1. Go to: https://supabase.com/dashboard" -ForegroundColor White
Write-Host "  2. Select your project (or create a new one)" -ForegroundColor White
Write-Host "  3. Go to Settings > API" -ForegroundColor White
Write-Host "  4. Copy: Project URL, anon key, service_role key" -ForegroundColor White
Write-Host "  5. Go to Settings > Database" -ForegroundColor White
Write-Host "  6. Copy: Connection string (URI format)" -ForegroundColor White
Write-Host ""

$continue = Read-Host "Have you created a Supabase project and have the credentials ready? (y/n)"
if ($continue -ne "y") {
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "  1. Go to https://supabase.com and create an account" -ForegroundColor White
    Write-Host "  2. Create a new project" -ForegroundColor White
    Write-Host "  3. Wait for project to be created (2-3 minutes)" -ForegroundColor White
    Write-Host "  4. Get your credentials from Settings > API and Settings > Database" -ForegroundColor White
    Write-Host "  5. Run this script again" -ForegroundColor White
    exit 0
}

Write-Host ""
Write-Host "Enter your Supabase credentials:" -ForegroundColor Cyan
Write-Host ""

# Get Supabase URL
$supabaseUrl = Read-Host "Supabase Project URL (e.g., https://xxxxx.supabase.co)"
if ([string]::IsNullOrWhiteSpace($supabaseUrl)) {
    Write-Host "ERROR: Supabase URL is required!" -ForegroundColor Red
    exit 1
}

# Get anon key
$anonKey = Read-Host "Supabase Anon Key (public key)"
if ([string]::IsNullOrWhiteSpace($anonKey)) {
    Write-Host "ERROR: Anon key is required!" -ForegroundColor Red
    exit 1
}

# Get service role key
$serviceRoleKey = Read-Host "Supabase Service Role Key (keep this secret!)"
if ([string]::IsNullOrWhiteSpace($serviceRoleKey)) {
    Write-Host "ERROR: Service role key is required!" -ForegroundColor Red
    exit 1
}

# Get database connection string
Write-Host ""
Write-Host "Database Connection String:" -ForegroundColor Cyan
Write-Host "  Format: postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres" -ForegroundColor Gray
$dbPassword = Read-Host "Database Password" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
)

# Extract database host from URL
$dbHost = $supabaseUrl -replace "https://", "" -replace ".supabase.co", ""
# Use provided credentials if available, otherwise use user input
if ($supabaseUrl -eq "https://pqaixgefahswjoatmxsg.supabase.co") {
    $databaseUrl = "postgresql://postgres:DeeXHairlabb@db.pqaixgefahswjoatmxsg.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"
} else {
    $databaseUrl = "postgresql://postgres:$dbPasswordPlain@db.$dbHost.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"
}

# Create backend .env
Write-Host ""
Write-Host "Creating backend/.env..." -ForegroundColor Yellow

$backendEnvPath = Join-Path $PSScriptRoot "backend\.env"
$backendEnvContent = @"
# Server
PORT=3001
NODE_ENV=development

# Supabase Database Connection
DATABASE_URL="$databaseUrl"

# Supabase API
SUPABASE_URL=$supabaseUrl
SUPABASE_SERVICE_ROLE_KEY=$serviceRoleKey

# JWT (for our own authentication system)
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

$backendEnvContent | Out-File -FilePath $backendEnvPath -Encoding UTF8 -NoNewline
Write-Host "[OK] Created backend/.env" -ForegroundColor Green

# Create frontend .env.local
Write-Host "Creating frontend/.env.local..." -ForegroundColor Yellow

$frontendEnvPath = Join-Path $PSScriptRoot "frontend\.env.local"
$frontendEnvContent = @"
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=$supabaseUrl
NEXT_PUBLIC_SUPABASE_ANON_KEY=$anonKey
"@

$frontendEnvContent | Out-File -FilePath $frontendEnvPath -Encoding UTF8 -NoNewline
Write-Host "[OK] Created frontend/.env.local" -ForegroundColor Green

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Install dependencies (if not already done):" -ForegroundColor White
Write-Host "   npm run install:all" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Generate Prisma client:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Cyan
Write-Host "   npm run db:generate" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Run database migrations:" -ForegroundColor White
Write-Host "   npm run db:migrate" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Seed the database:" -ForegroundColor White
Write-Host "   npm run db:seed" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Start development servers:" -ForegroundColor White
Write-Host "   cd .." -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your application will be available at:" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:  http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "Default login credentials (after seeding):" -ForegroundColor Yellow
Write-Host "  Admin:  admin@deexhairlabb.com / admin123" -ForegroundColor White
Write-Host "  Client: client@example.com / client123" -ForegroundColor White
Write-Host ""
