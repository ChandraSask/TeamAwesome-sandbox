# Create a clean source zip for upload to Cloud Shell. Run from any directory.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$stage = Join-Path ([System.IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $stage | Out-Null
try {
    foreach ($folder in @('frontend', 'backend', 'deployment')) {
        & robocopy (Join-Path $root $folder) (Join-Path $stage $folder) /E /XD node_modules .venv __pycache__ .pytest_cache dist /XF '.env' '.env.*' /NFL /NDL /NJH /NJS | Out-Null
        if ($LASTEXITCODE -ge 8) { throw "Could not copy $folder" }
    }
    Copy-Item (Join-Path $root '.dockerignore') $stage
    $destination = Join-Path $root 'hackathon-source.zip'
    Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $destination -Force
    Write-Host "Ready to upload: $destination"
} finally {
    Remove-Item -Recurse -Force $stage
}
