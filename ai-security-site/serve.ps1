# Serve the site locally on port 3000
$port = 3000
$root = $PSScriptRoot

if (Get-Command npx -ErrorAction SilentlyContinue) {
    Write-Host "Starting server at http://localhost:$port"
    Set-Location $root
    npx --yes serve -l $port
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "Starting server at http://localhost:$port"
    Set-Location $root
    python -m http.server $port
} else {
    Write-Host "Install Node (npx serve) or Python to run a local server."
    Write-Host "Or open index.html in a browser (some features may not work)."
}
