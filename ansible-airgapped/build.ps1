# Build ansible-airgapped image and save to tarball.
# Uses Podman if available, otherwise Docker.

$ErrorActionPreference = "Stop"
$image = "ansible-airgapped:latest"
$tar  = "ansible-airgapped.tar"

$builder = $null
if (Get-Command podman -ErrorAction SilentlyContinue) {
    $builder = "podman"
} elseif (Get-Command docker -ErrorAction SilentlyContinue) {
    $builder = "docker"
}

if (-not $builder) {
    Write-Error "Neither Podman nor Docker found. Install Podman: winget install RedHat.Podman"
}

$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $dir

Write-Host "Using $builder to build $image ..."
& $builder build -t $image .
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Saving to $tar ..."
if ($builder -eq "podman") {
    & $builder save -o $tar $image
} else {
    & $builder save $image -o $tar
}
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Done. Transfer $tar to the air-gapped environment and load with: $builder load -i $tar"
