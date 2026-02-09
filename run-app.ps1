param(
    [ValidateSet("machine", "network")]
    [string]$Mode = "machine"
)

$ErrorActionPreference = "Stop"

function Get-PreferredIPv4 {
    $ip = $null

    try {
        $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
            Where-Object {
                $_.IPAddress -ne "127.0.0.1" -and
                $_.IPAddress -notlike "169.254.*" -and
                $_.PrefixOrigin -ne "WellKnown"
            } |
            Sort-Object -Property InterfaceMetric |
            Select-Object -First 1 -ExpandProperty IPAddress
    }
    catch {
    }

    if (-not $ip) {
        $ip = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
            Where-Object { $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork } |
            ForEach-Object { $_.IPAddressToString } |
            Where-Object { $_ -ne "127.0.0.1" -and $_ -notlike "169.254.*" } |
            Select-Object -First 1
    }

    return $ip
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $root "GalleryApp\backend"
$frontendPath = Join-Path $root "GalleryApp\frontend"

if (-not (Test-Path $backendPath)) {
    throw "Backend folder not found: $backendPath"
}

if (-not (Test-Path $frontendPath)) {
    throw "Frontend folder not found: $frontendPath"
}

$localIp = Get-PreferredIPv4
if ($Mode -eq "network" -and -not $localIp) {
    throw "Cannot detect local IPv4 address for network mode."
}

if ($Mode -eq "machine") {
    $backendBindUrl = "http://localhost:5000"
    $backendPublicUrl = "http://localhost:5000"
    $frontendHost = "localhost"
    $frontendPublicUrl = "http://localhost:5173"
    $modeLabel = "Local Machine"
}
else {
    $backendBindUrl = "http://0.0.0.0:5000"
    $backendPublicUrl = "http://$localIp:5000"
    $frontendHost = "0.0.0.0"
    $frontendPublicUrl = "http://$localIp:5173"
    $modeLabel = "Local Network"
}

Write-Host "Run mode: $modeLabel"
Write-Host "Frontend URL: $frontendPublicUrl"
Write-Host "Backend URL:  $backendPublicUrl"
if ($Mode -eq "network") {
    Write-Host "How to connect from another device in your LAN:"
    Write-Host "1. Open $frontendPublicUrl in a browser."
    Write-Host "2. Ensure firewall allows incoming TCP connections on ports 5173 and 5000."
}

Write-Host "Restoring backend dependencies..."
dotnet restore $backendPath

if (-not (Test-Path (Join-Path $frontendPath "node_modules"))) {
    Write-Host "Installing frontend dependencies..."
    Push-Location $frontendPath
    npm install
    Pop-Location
}

Write-Host "Starting backend at $backendBindUrl ..."
$backendProcess = Start-Process -FilePath "dotnet" -ArgumentList @("run", "--urls", $backendBindUrl) -WorkingDirectory $backendPath -NoNewWindow -PassThru

Write-Host "Starting frontend at $frontendPublicUrl ..."
$frontendProcess = Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev", "--", "--host", $frontendHost, "--port", "5173") -WorkingDirectory $frontendPath -NoNewWindow -PassThru

Start-Sleep -Seconds 4
Start-Process $frontendPublicUrl

Write-Host "App is running in '$modeLabel' mode. Press Ctrl+C to stop both processes."

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
