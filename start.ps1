param (
    [string]$Mode = "dev",
    [switch]$Build
)

$ValidModes = "dev", "prod"

if ($ValidModes -notcontains $Mode) {
    Write-Host "Error: Invalid mode '$Mode'. Please use 'dev' or 'prod'." -ForegroundColor Red
    exit 1
}

Write-Host "Starting AnimaFlow in '$Mode' mode..." -ForegroundColor Cyan

$ComposeFiles = "-f deploy/docker-compose.yml -f deploy/docker-compose.$Mode.yml"
$Cmd = "docker-compose $ComposeFiles up -d"

if ($Build) {
    $Cmd += " --build"
}

Write-Host "Executing: $Cmd" -ForegroundColor Gray
Invoke-Expression $Cmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "AnimaFlow started successfully!" -ForegroundColor Green
    if ($Mode -eq "dev") {
        Write-Host "Hot reloading is enabled. Source code is mounted."
    }
} else {
    Write-Host "Failed to start AnimaFlow." -ForegroundColor Red
}
