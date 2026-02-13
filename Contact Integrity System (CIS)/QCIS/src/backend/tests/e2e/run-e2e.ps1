# QwickServices CIS — E2E Test Runner (PowerShell)
# Orchestrates Docker services, runs E2E tests, and tears down cleanly

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Resolve-Path (Join-Path $ScriptDir "../..")

Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  QwickServices CIS — E2E Test Runner" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend directory: $BackendDir"
Write-Host ""

Set-Location $BackendDir

# ─── 1. Start Docker Compose services ────────────────────────────

Write-Host "[1/5] Starting Docker Compose services..." -ForegroundColor Yellow
docker-compose -f docker-compose.test.yml up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to start Docker Compose services" -ForegroundColor Red
    exit 1
}

# ─── 2. Wait for PostgreSQL ───────────────────────────────────────

Write-Host "[2/5] Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
$retryCount = 0
$maxRetries = 30
$pgReady = $false

while (-not $pgReady -and $retryCount -lt $maxRetries) {
    try {
        $result = docker-compose -f docker-compose.test.yml exec -T test-postgres pg_isready -U cis_test_user -d qwick_cis_test 2>&1
        if ($LASTEXITCODE -eq 0) {
            $pgReady = $true
            Write-Host "  ✓ PostgreSQL is ready" -ForegroundColor Green
        }
        else {
            throw "Not ready"
        }
    }
    catch {
        $retryCount++
        Write-Host "  Waiting... (attempt $retryCount/$maxRetries)"
        Start-Sleep -Seconds 1
    }
}

if (-not $pgReady) {
    Write-Host "✗ PostgreSQL did not become ready in time" -ForegroundColor Red
    docker-compose -f docker-compose.test.yml down -v
    exit 1
}

# ─── 3. Wait for Redis ────────────────────────────────────────────

Write-Host "[3/5] Waiting for Redis to be ready..." -ForegroundColor Yellow
$retryCount = 0
$redisReady = $false

while (-not $redisReady -and $retryCount -lt $maxRetries) {
    try {
        $result = docker-compose -f docker-compose.test.yml exec -T test-redis redis-cli ping 2>&1
        if ($result -match "PONG") {
            $redisReady = $true
            Write-Host "  ✓ Redis is ready" -ForegroundColor Green
        }
        else {
            throw "Not ready"
        }
    }
    catch {
        $retryCount++
        Write-Host "  Waiting... (attempt $retryCount/$maxRetries)"
        Start-Sleep -Seconds 1
    }
}

if (-not $redisReady) {
    Write-Host "✗ Redis did not become ready in time" -ForegroundColor Red
    docker-compose -f docker-compose.test.yml down -v
    exit 1
}

# ─── 4. Run E2E tests ─────────────────────────────────────────────

Write-Host "[4/5] Running E2E tests..." -ForegroundColor Yellow
Write-Host ""

npx vitest run tests/e2e/ --config vitest.e2e.config.ts

$exitCode = $LASTEXITCODE

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "✓ All E2E tests passed" -ForegroundColor Green
}
else {
    Write-Host "✗ Some E2E tests failed (exit code: $exitCode)" -ForegroundColor Red
}

# ─── 5. Teardown ──────────────────────────────────────────────────

Write-Host "[5/5] Tearing down Docker Compose services..." -ForegroundColor Yellow
docker-compose -f docker-compose.test.yml down -v

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
if ($exitCode -eq 0) {
    Write-Host "  ✓ E2E Test Suite Complete — All Passed" -ForegroundColor Green
}
else {
    Write-Host "  ✗ E2E Test Suite Complete — Some Failed" -ForegroundColor Red
}
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

exit $exitCode
