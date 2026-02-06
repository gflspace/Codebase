# Create Environment Files with Pre-configured Supabase Credentials
# This script creates the .env files with your Supabase credentials

Write-Host "=== Creating Environment Files ===" -ForegroundColor Cyan
Write-Host ""

# Backend .env
$backendEnvPath = Join-Path $PSScriptRoot "backend\.env"
$backendEnvContent = @"
# Server
PORT=3001
NODE_ENV=development

# Supabase Database Connection
DATABASE_URL="postgresql://postgres:DeeXHairlabb@db.pqaixgefahswjoatmxsg.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"

# Supabase API
SUPABASE_URL=https://pqaixgefahswjoatmxsg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_kV9qj6-ll26lNncu_pF6mg_KU3lIjVT

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

try {
    $backendEnvContent | Out-File -FilePath $backendEnvPath -Encoding UTF8 -NoNewline
    Write-Host "[OK] Created backend/.env" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Could not create backend/.env: $_" -ForegroundColor Red
}

# Frontend .env.local
$frontendEnvPath = Join-Path $PSScriptRoot "frontend\.env.local"
$frontendEnvContent = @"
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://pqaixgefahswjoatmxsg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_YcbdMn7JTe74MJz7zl9f4Q_8Ox5Kdsa
"@

try {
    $frontendEnvContent | Out-File -FilePath $frontendEnvPath -Encoding UTF8 -NoNewline
    Write-Host "[OK] Created frontend/.env.local" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Could not create frontend/.env.local: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Environment Files Created ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. cd backend" -ForegroundColor White
Write-Host "  2. npm run db:generate" -ForegroundColor White
Write-Host "  3. npm run db:migrate" -ForegroundColor White
Write-Host "  4. npm run db:seed" -ForegroundColor White
Write-Host "  5. cd .. && npm run dev" -ForegroundColor White
Write-Host ""
