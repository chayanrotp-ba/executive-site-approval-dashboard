$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$baseUrl = 'http://127.0.0.1:4184'
function Test-ExecutiveReady {
    try {
        $health = Invoke-RestMethod -Uri "$baseUrl/api/executive/health" -TimeoutSec 2
        return $health.service -eq 'executive-84-local'
    } catch { return $false }
}
try {
    if (-not (Test-ExecutiveReady)) {
        $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
        $nodePath = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
        if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Node.js was not found on this computer.' }
        $logRoot = Join-Path $projectRoot '.runtime'
        New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
        $process = Start-Process -FilePath $nodePath -ArgumentList 'scripts/executive-server.cjs' -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logRoot 'executive-local.log') -RedirectStandardError (Join-Path $logRoot 'executive-local-error.log') -PassThru
        $ready = $false
        for ($attempt = 0; $attempt -lt 30; $attempt++) {
            if (Test-ExecutiveReady) { $ready = $true; break }
            if ($process.HasExited) { break }
            Start-Sleep -Milliseconds 300
        }
        if (-not $ready) { throw 'Unable to start Executive Dashboard. Check .runtime/executive-local-error.log (port 4184 may already be in use).' }
    }
    Start-Process "$baseUrl/"
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    Read-Host 'Press Enter to close'
    exit 1
}
