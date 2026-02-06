$source = 'D:\Codebase\VIOE\extracted_app'
$zipPath = 'D:\Codebase\VIOE\VIOE_UAT.zip'

# Remove existing zip if present
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

# Get all files excluding node_modules and .env (but keep .env.example)
$files = Get-ChildItem -Path $source -Recurse -File | Where-Object {
    $_.FullName -notmatch '\\node_modules\\' -and
    $_.Name -ne '.env'
}

Write-Host "Found $($files.Count) files to package"

# Create a temporary staging directory
$staging = 'D:\Codebase\VIOE\_staging_VIOE_UAT'
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging -Force | Out-Null

# Copy files preserving structure
foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($source.Length + 1)
    $destPath = Join-Path $staging $relativePath
    $destDir = Split-Path $destPath -Parent
    if (!(Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    Copy-Item $file.FullName $destPath
}

# Create the ZIP
Write-Host "Creating ZIP archive..."
Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zipPath -CompressionLevel Optimal

# Cleanup staging
Remove-Item $staging -Recurse -Force

# Output result
$zipInfo = Get-Item $zipPath
Write-Host "ZIP created: $($zipInfo.FullName)"
Write-Host "Size: $([math]::Round($zipInfo.Length / 1MB, 2)) MB"

# Verify contents
Write-Host ""
Write-Host "=== ZIP Contents Summary ==="
$shell = New-Object -ComObject Shell.Application
$zip = $shell.NameSpace($zipPath)
function Count-Items($folder) {
    $count = 0
    foreach ($item in $folder.Items()) {
        $count++
        if ($item.IsFolder) {
            $count += Count-Items($item.GetFolder)
        }
    }
    return $count
}
$topItems = $zip.Items()
Write-Host "Top-level items: $($topItems.Count)"
foreach ($item in $topItems) {
    Write-Host "  - $($item.Name)"
}
