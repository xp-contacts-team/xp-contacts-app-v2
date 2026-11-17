# Deploy the built static site to an Alibaba Cloud ECS instance over SSH.
#
# Prerequisites:
#   - ECS security group allows inbound 22 and 80
#   - SSH key (recommended) or an already configured SSH agent
#   - pnpm available locally for the build
#
# Example:
#   .\scripts\deploy_ecs.ps1 -HostName 47.96.1.23 -User root -KeyPath .deploy\aliyun.pem
#   .\scripts\deploy_ecs.ps1 -HostName 47.96.1.23 -User ecs-user -KeyPath .deploy\aliyun.pem -SkipBuild

param(
  [Parameter(Mandatory = $true)]
  [string]$HostName,

  [string]$User = 'root',
  [int]$Port = 22,
  [string]$KeyPath = '',
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path (Join-Path $root 'dist\index.html'))) {
  throw 'dist/index.html not found. Run `pnpm build` first, or omit -SkipBuild.'
}

if (-not $SkipBuild) {
  Write-Host '[local] Building production bundle...'
  Push-Location $root
  try {
    pnpm build
    if ($LASTEXITCODE -ne 0) { throw 'pnpm build failed.' }
  }
  finally {
    Pop-Location
  }
}

$releaseDir = Join-Path $root 'release'
New-Item -ItemType Directory -Force $releaseDir | Out-Null
$bundle = Join-Path $releaseDir 'ecs-bundle.tar.gz'
$remoteScript = Join-Path $root 'scripts\ecs_bootstrap.sh'

Write-Host '[local] Packing API, Docker Compose, Nginx and dist...'
Push-Location $root
try {
  tar -czf $bundle Dockerfile.runtime nginx.conf docker-compose.yml server dist
  if ($LASTEXITCODE -ne 0) { throw 'tar failed.' }
}
finally {
  Pop-Location
}

$sshOptions = @('-p', "$Port", '-o', 'StrictHostKeyChecking=accept-new')
$scpOptions = @('-P', "$Port", '-o', 'StrictHostKeyChecking=accept-new')
if ($KeyPath) {
  $resolvedKey = (Resolve-Path $KeyPath).Path
  $sshOptions += @('-i', $resolvedKey)
  $scpOptions += @('-i', $resolvedKey)
}

Write-Host "[local] Uploading bundle to ${User}@${HostName}..."
& scp @scpOptions $bundle "${User}@${HostName}:/tmp/atlas-bundle.tar.gz"
if ($LASTEXITCODE -ne 0) { throw 'scp upload failed.' }

& scp @scpOptions $remoteScript "${User}@${HostName}:/tmp/ecs_bootstrap.sh"
if ($LASTEXITCODE -ne 0) { throw 'scp script upload failed.' }

Write-Host '[remote] Installing Docker (if needed) and starting Nginx container...'
& ssh @sshOptions "${User}@${HostName}" 'bash /tmp/ecs_bootstrap.sh'
if ($LASTEXITCODE -ne 0) { throw 'Remote deployment failed.' }

Write-Host ''
Write-Host "Deployment requested: http://${HostName}/"
Write-Host 'If it does not open, check the ECS security group inbound rule for TCP 80.'
