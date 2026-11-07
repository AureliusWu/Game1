param([Parameter(Mandatory=$true)][string]$Executable,[Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$result = Join-Path $OutputDirectory 'windows-smoke.json'
$process = Start-Process -FilePath (Resolve-Path $Executable) -ArgumentList @('--smoke-test','--smoke-result',('"' + $result + '"'),'--disable-gpu') -PassThru
$deadline = (Get-Date).AddSeconds(120)
while (!(Test-Path $result) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 300 }
if (!(Test-Path $result)) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue; throw 'Packaged Windows EXE did not complete its actual renderer smoke test' }
$report = Get-Content $result -Raw | ConvertFrom-Json
if ($report.status -ne 'passed') { throw ('Windows smoke failed: ' + $report.error) }
Write-Output ('Windows EXE verified: ' + $report.version + ', ' + $report.origin + ', landscape + save/resume + sandbox')
