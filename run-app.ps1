$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $root "GalleryApp\backend"
$frontendPath = Join-Path $root "GalleryApp\frontend"

if (-not (Test-Path $backendPath)) {
    throw "Backend folder not found: $backendPath"
}

if (-not (Test-Path $frontendPath)) {
    throw "Frontend folder not found: $frontendPath"
}

Write-Host "Restoring backend dependencies..."
dotnet restore $backendPath

if (-not (Test-Path (Join-Path $frontendPath "node_modules"))) {
    Write-Host "Installing frontend dependencies..."
    Push-Location $frontendPath
    npm install
    Pop-Location
}

Write-Host "Starting backend at http://localhost:5000 ..."
$backendProcess = Start-Process -FilePath "dotnet" -ArgumentList "run --urls http://localhost:5000" -WorkingDirectory $backendPath -NoNewWindow -PassThru

Write-Host "Starting frontend at http://localhost:5173 ..."
$frontendProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run dev -- --host localhost --port 5173" -WorkingDirectory $frontendPath -NoNewWindow -PassThru

Start-Sleep -Seconds 4
Start-Process "http://localhost:5173"

Write-Host "App is running. Press Ctrl+C to stop both processes."

try {
    while ($true) {
        Start-Sleep -Seconds 1
        if ($backendProcess.HasExited) {
            throw "Backend process stopped."
        }
        if ($frontendProcess.HasExited) {
            throw "Frontend process stopped."
        }
    }
}
finally {
    foreach ($process in @($backendProcess, $frontendProcess)) {
        if ($null -ne $process -and -not $process.HasExited) {
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        }
    }
}
