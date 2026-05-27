param(
  [switch]$UseNpx
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path "$PSScriptRoot\..\..\.."
Set-Location $repoRoot

$runnerPath = "governance/automation/scripts/runPilotCertification.ts"

if ($UseNpx -or -not (Get-Command tsx -ErrorAction SilentlyContinue)) {
  Write-Host "Running Sprint 008 pilot certification with npx tsx..."
  npx tsx $runnerPath
  exit $LASTEXITCODE
}

Write-Host "Running Sprint 008 pilot certification with tsx..."
tsx $runnerPath
exit $LASTEXITCODE
