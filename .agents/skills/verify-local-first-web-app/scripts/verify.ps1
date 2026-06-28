param(
  [string]$ProjectRoot = ""
)

$ErrorActionPreference = "Stop"

if (-not $ProjectRoot) {
  $ProjectRoot = Join-Path $PSScriptRoot "..\..\..\.."
}

$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$packagePath = Join-Path $ProjectRoot "package.json"

if (-not (Test-Path -LiteralPath $packagePath)) {
  throw "package.json not found at $ProjectRoot"
}

function Invoke-CheckedStep {
  param(
    [string]$Name,
    [scriptblock]$Action
  )

  Write-Host "`n== $Name =="
  & $Action
  if ($LASTEXITCODE -ne 0) {
    throw "$Name failed with exit code $LASTEXITCODE"
  }
}

Push-Location $ProjectRoot
try {
  Invoke-CheckedStep "Automated tests" { npm test }
  Invoke-CheckedStep "Production build" { npm run build }

  $scanFiles = @(
    Get-ChildItem -LiteralPath (Join-Path $ProjectRoot "src") -Recurse -File
    Get-ChildItem -LiteralPath (Join-Path $ProjectRoot "tests") -Recurse -File
    Get-ChildItem -LiteralPath (Join-Path $ProjectRoot "dist") -Recurse -File
    Get-Item -LiteralPath (Join-Path $ProjectRoot "index.html")
    Get-Item -LiteralPath (Join-Path $ProjectRoot "README.md")
    Get-Item -LiteralPath $packagePath
  )

  Write-Host "`n== Private-data reference scan =="
  $privatePattern = "app-data-v2|app-data\.js|window\.LINKDSIGHT_DATA|window\.OWNGRAPH_DATA|Henry Flowers"
  $privateHits = $scanFiles | Select-String -Pattern $privatePattern -CaseSensitive:$false
  if ($privateHits) {
    $privateHits | ForEach-Object { Write-Host "$($_.Path):$($_.LineNumber): $($_.Line.Trim())" }
    throw "Private-data references found."
  }
  Write-Host "PASS: no private dataset references or hardcoded owner name."

  Write-Host "`n== Credential scan =="
  $credentialPattern = "sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----"
  $credentialHits = $scanFiles | Select-String -Pattern $credentialPattern -CaseSensitive
  if ($credentialHits) {
    $credentialHits | ForEach-Object { Write-Host "$($_.Path):$($_.LineNumber): potential credential" }
    throw "Potential credentials found."
  }
  Write-Host "PASS: no credential-shaped strings found."

  Write-Host "`n== Local-first architecture checks =="
  $advisorPath = Join-Path $ProjectRoot "src\advisor.js"
  $advisorText = Get-Content -Raw -LiteralPath $advisorPath
  if ($advisorText -notmatch "sessionStorage") {
    throw "AI settings are not stored in sessionStorage."
  }
  if ($advisorText -match "localStorage\.(getItem|setItem|removeItem|clear)") {
    throw "AI advisor calls the localStorage API."
  }

  $indexText = Get-Content -Raw -LiteralPath (Join-Path $ProjectRoot "index.html")
  if ($indexText -match "(?i)(src|href)\s*=\s*['""]https?://") {
    throw "Runtime CDN or remote asset reference found in index.html."
  }

  if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot "dist\index.html"))) {
    throw "Production build did not create dist/index.html."
  }

  Write-Host "PASS: session-only AI secrets, no runtime CDN assets, and build artifact present."
  Write-Host "`nDETERMINISTIC VERIFICATION: PASS"
}
finally {
  Pop-Location
}
