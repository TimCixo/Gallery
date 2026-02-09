param(
    [ValidateSet("machine", "network")]
    [string]$Mode = "machine"
)

$ErrorActionPreference = "Stop"

function Resolve-FfmpegExecutable {
    $ffmpegCommand = Get-Command ffmpeg -ErrorAction SilentlyContinue
    if ($null -ne $ffmpegCommand -and (Test-Path $ffmpegCommand.Source)) {
        return $ffmpegCommand.Source
    }

    $candidates = @()
    $addCandidate = {
        param([string]$root, [string]$child)
        if (-not [string]::IsNullOrWhiteSpace($root)) {
            $candidates += (Join-Path $root $child)
        }
    }

    & $addCandidate $env:LOCALAPPDATA "Microsoft\WinGet\Links\ffmpeg.exe"
    & $addCandidate $env:ProgramFiles "ffmpeg\bin\ffmpeg.exe"
    & $addCandidate $env:ProgramFiles "FFmpeg\bin\ffmpeg.exe"
    & $addCandidate $env:ChocolateyInstall "bin\ffmpeg.exe"

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    $wingetPackagesPath = $null
    if (-not [string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) {
        $wingetPackagesPath = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages"
    }

    if ($wingetPackagesPath -and (Test-Path $wingetPackagesPath)) {
        $fromWinget = Get-ChildItem -Path $wingetPackagesPath -Recurse -Filter "ffmpeg.exe" -ErrorAction SilentlyContinue |
            Select-Object -First 1 -ExpandProperty FullName
        if ($fromWinget) {
            return $fromWinget
        }
    }

    return $null
}

function Ensure-FfmpegExecutable {
    $resolved = Resolve-FfmpegExecutable
    if ($resolved) {
        return $resolved
    }

    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($null -eq $winget) {
        return $null
    }

    Write-Host "ffmpeg was not found. Trying to install via winget..."
    try {
        & winget install --id Gyan.FFmpeg --accept-package-agreements --accept-source-agreements --silent
    }
    catch {
        Write-Warning "winget install ffmpeg failed: $($_.Exception.Message)"
    }

    return Resolve-FfmpegExecutable
}

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

$ffmpegPath = Ensure-FfmpegExecutable
if ($ffmpegPath) {
    $env:FFMPEG_PATH = $ffmpegPath
    $ffmpegDir = Split-Path -Parent $ffmpegPath
    if (-not [string]::IsNullOrWhiteSpace($ffmpegDir) -and -not ($env:PATH -split ';' | Where-Object { $_ -eq $ffmpegDir })) {
        $env:PATH = "$ffmpegDir;$env:PATH"
    }
    Write-Host "ffmpeg: $ffmpegPath"
}
else {
    Write-Warning "ffmpeg is not available. Video preview for mp4/gif will not work."
    Write-Host "Install command: winget install --id Gyan.FFmpeg"
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
    $backendPublicUrl = "http://${localIp}:5000"
    $frontendHost = "0.0.0.0"
    $frontendPublicUrl = "http://${localIp}:5173"
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
