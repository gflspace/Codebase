Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('D:\Codebase\VIOE\VIOE_UAT.zip')
$entries = $zip.Entries

Write-Host "=== File Count by Directory ==="
$dirs = @{}
foreach ($e in $entries) {
    $parts = $e.FullName -split '/'
    if ($parts.Length -gt 1) {
        $dir = $parts[0]
    } else {
        $dir = "(root)"
    }
    if ($dirs.ContainsKey($dir)) { $dirs[$dir]++ } else { $dirs[$dir] = 1 }
}
$dirs.GetEnumerator() | Sort-Object Name | ForEach-Object {
    Write-Host ("  {0}: {1} files" -f $_.Key, $_.Value)
}

Write-Host ""
Write-Host ("Total entries: " + $entries.Count)
Write-Host ""

Write-Host "=== Key Files Verification ==="
$keyFiles = @(
    'package.json',
    'package-lock.json',
    'vite.config.js',
    'vitest.config.js',
    'tailwind.config.js',
    '.env.example',
    '.gitignore',
    'index.html',
    'dist/index.html',
    'src/App.jsx',
    'src/pages/index.jsx',
    'src/pages/Login.jsx',
    'src/pages/Layout.jsx',
    'src/contexts/AuthContext.jsx',
    'src/components/UserMenu.jsx',
    'src/components/ProtectedRoute.jsx',
    'src/components/ErrorBoundary.jsx',
    'src/api/mockClient.js',
    'src/api/mockData.js',
    'src/api/base44Client.js'
)
foreach ($kf in $keyFiles) {
    $found = $entries | Where-Object { $_.FullName -eq $kf }
    if ($found) {
        Write-Host ("  [OK] " + $kf)
    } else {
        Write-Host ("  [MISSING] " + $kf)
    }
}

Write-Host ""
Write-Host "=== Exclusion Verification ==="
$nodeModules = @($entries | Where-Object { $_.FullName -match 'node_modules' })
$envFile = @($entries | Where-Object { $_.FullName -eq '.env' })
Write-Host ("  node_modules excluded: " + ($nodeModules.Count -eq 0))
Write-Host ("  .env excluded: " + ($envFile.Count -eq 0))

# Check dist files
Write-Host ""
Write-Host "=== Build Output (dist/) ==="
$distFiles = @($entries | Where-Object { $_.FullName -match '^dist/' })
foreach ($df in $distFiles) {
    Write-Host ("  " + $df.FullName + " (" + [math]::Round($df.Length / 1KB, 1) + " KB)")
}

$zip.Dispose()
