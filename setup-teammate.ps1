param(
    [switch]$DryRun,
    [switch]$InstallScanner,
    [switch]$ForceEnvRefresh
)

$ErrorActionPreference = "Stop"

function Run-Step {
    param(
        [Parameter(Mandatory = $true)][string]$Message,
        [Parameter(Mandatory = $true)][scriptblock]$Action
    )

    Write-Host "`n==> $Message" -ForegroundColor Cyan
    if ($DryRun) {
        Write-Host "[dry-run] skipped" -ForegroundColor Yellow
        return
    }

    & $Action
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"
$scannerDir = Join-Path $root "scanner"
$venvDir = Join-Path $root ".venv"
$venvPython = Join-Path $venvDir "Scripts\python.exe"
$venvPip = Join-Path $venvDir "Scripts\pip.exe"
$envFile = Join-Path $root ".env"
$envExample = Join-Path $root ".env.example"

Write-Host "CrowdFlow teammate setup" -ForegroundColor Green
Write-Host "Project root: $root"

Run-Step -Message "Checking Python installation" -Action {
    $null = Get-Command python -ErrorAction Stop
    python --version
}

Run-Step -Message "Checking Node.js installation" -Action {
    $null = Get-Command node -ErrorAction Stop
    $null = Get-Command npm -ErrorAction Stop
    node --version
    npm --version
}

Run-Step -Message "Creating virtual environment (.venv) if missing" -Action {
    if (-not (Test-Path $venvPython)) {
        python -m venv $venvDir
        Write-Host "Created virtual environment at $venvDir"
    } else {
        Write-Host "Virtual environment already exists"
    }
}

Run-Step -Message "Upgrading pip in virtual environment" -Action {
    & $venvPython -m pip install --upgrade pip
}

Run-Step -Message "Installing backend requirements" -Action {
    & $venvPip install -r (Join-Path $backendDir "requirements.txt")
}

Run-Step -Message "Installing frontend dependencies" -Action {
    Push-Location $frontendDir
    try {
        npm install
    } finally {
        Pop-Location
    }
}

if ($InstallScanner -and (Test-Path (Join-Path $scannerDir "requirements.txt"))) {
    Run-Step -Message "Installing scanner requirements" -Action {
        & $venvPip install -r (Join-Path $scannerDir "requirements.txt")
    }
}

Run-Step -Message "Preparing .env file" -Action {
    if ($ForceEnvRefresh -or -not (Test-Path $envFile)) {
        if (-not (Test-Path $envExample)) {
            throw ".env.example not found at $envExample"
        }
        Copy-Item -Force $envExample $envFile
        Write-Host "Created .env from .env.example"
    } else {
        Write-Host ".env already exists (left unchanged)"
    }
}

Write-Host "`nSetup complete." -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1) Start backend:" -ForegroundColor White
Write-Host "   Set-Location '$backendDir'"
Write-Host "   & '$venvPython' -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"
Write-Host "2) Start frontend (new terminal):" -ForegroundColor White
Write-Host "   Set-Location '$frontendDir'"
Write-Host "   npm run dev"
Write-Host "3) Open app: http://localhost:5174" -ForegroundColor White
Write-Host "4) API docs: http://localhost:8000/docs" -ForegroundColor White

if (-not $DryRun) {
    Write-Host "`nTip: share this exact command with teammates:" -ForegroundColor Yellow
    Write-Host "   powershell -ExecutionPolicy Bypass -File .\setup-teammate.ps1"
}
