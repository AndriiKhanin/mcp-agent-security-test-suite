# Windows PowerShell 5.1+; reviewed local checkout only. No downloads.
param([switch]$Quick)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Push-Location $root
try {
  $v=(& node --version)
  if($LASTEXITCODE -ne 0 -or $v -notmatch '^v(20|22)\.') { throw 'Node.js 20 or 22 is required.' }
  $dir=Join-Path ([IO.Path]::GetTempPath()) ('mcp-local-ci-'+[guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $dir | Out-Null
  $commit=(& git rev-parse HEAD)
  $dirty=((& git status --porcelain --untracked-files=no) -join '').Length -gt 0
  $env:npm_config_offline='true'
  $env:npm_config_ignore_scripts='true'
  $log=Join-Path $dir 'console.log'
  Start-Transcript -Path $log | Out-Null
  $failed=$false
  try {
    if($Quick){ & node --test test/cli.test.mjs test/cli-discovery.test.mjs test/demo.test.mjs }
    else{ & node --test }
    if($LASTEXITCODE -ne 0){$failed=$true}
    if(-not $failed){& node examples/offline-ci-check.mjs; if($LASTEXITCODE -ne 0){$failed=$true}}
  } finally { Stop-Transcript | Out-Null }
  $receipt=[ordered]@{status=$(if($failed){'FAIL'}else{'PASS'});mode=$(if($Quick){'QUICK'}else{'FULL'});node=$v;commit=$commit;dirty=$dirty;log=$log}
  $receipt | ConvertTo-Json | Set-Content -Path (Join-Path $dir 'receipt.json') -Encoding UTF8
  Write-Host ('LOCAL_CI '+$receipt.status+' receipt='+ (Join-Path $dir 'receipt.json'))
  if($failed){exit 1}
} finally {Pop-Location}
