# Post-sprint local automation: full verification suite, then (only if every check passes) a
# Vercel PREVIEW deploy and a final supabase:verify. Never runs `vercel --prod` and never runs a
# Supabase migration push against a live database -- this script is preview/read-only by design.
#
# Runs independently of GitHub/GitLab: it only touches the local repo working tree and the
# already-authenticated local Vercel/Supabase CLIs. It does not fetch, pull, push, or otherwise
# depend on any git remote being reachable.
#
# Invoked on a schedule by a Windows Task Scheduler entry (see docs/LOCAL_AUTOMATION.md). Can also
# be run manually: powershell -ExecutionPolicy Bypass -File scripts\post-sprint-verify-and-preview-deploy.ps1

# Native (non-cmdlet) commands like corepack.cmd/tsc/eslint write routine progress to stderr; with
# $ErrorActionPreference = "Stop" and a merged 2>&1 stream, PowerShell 5.1 turns that stderr output
# into a terminating NativeCommandError even on a zero exit code. Keep this at "Continue" and rely
# on $LASTEXITCODE (checked explicitly below) to decide pass/fail, not on stderr output existing.
$ErrorActionPreference = "Continue"

$repoRoot = "C:\Users\Sudipta Sarmah\OneDrive - State Bank of India\Documents\AXXESS-TRIAXIS"
$logDir = Join-Path $repoRoot ".cache\post-sprint-automation"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$logFile = Join-Path $logDir "$timestamp.log"

function Write-Log {
    param([string]$Message)
    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Add-Content -Path $logFile -Value $line
    Write-Output $line
}

function Invoke-Step {
    param(
        [string]$Name,
        [string]$Command,
        [string[]]$CommandArgs
    )
    Write-Log "START  $Name -- $Command $($CommandArgs -join ' ')"
    # Redirect both streams straight to a temp file (not through a PowerShell 2>&1 pipe) so native
    # stderr output is never reinterpreted as a terminating PowerShell error.
    $stepLog = [System.IO.Path]::GetTempFileName()
    $process = Start-Process -FilePath $Command -ArgumentList $CommandArgs -NoNewWindow -Wait -PassThru `
        -RedirectStandardOutput $stepLog -RedirectStandardError "$stepLog.err"
    $output = (Get-Content -Path $stepLog -Raw -ErrorAction SilentlyContinue) + (Get-Content -Path "$stepLog.err" -Raw -ErrorAction SilentlyContinue)
    Add-Content -Path $logFile -Value $output
    Remove-Item -Path $stepLog, "$stepLog.err" -ErrorAction SilentlyContinue
    if ($process.ExitCode -ne 0) {
        Write-Log "FAIL   $Name (exit $($process.ExitCode))"
        return $false
    }
    Write-Log "PASS   $Name"
    return $true
}

Set-Location $repoRoot
Write-Log "=== Post-sprint verification run starting ==="
Write-Log "Repo: $repoRoot"
Write-Log "Git branch: $(git rev-parse --abbrev-ref HEAD 2>&1)"
Write-Log "Git HEAD: $(git rev-parse HEAD 2>&1)"
Write-Log "NOTE: this run does not fetch/pull/push any git remote -- it only reads local working-tree state."

$steps = @(
    @{ Name = "typecheck";        Command = "corepack"; Args = @("pnpm", "run", "typecheck") },
    @{ Name = "mobile-typecheck"; Command = "corepack"; Args = @("pnpm", "--dir", "apps/mobile", "run", "typecheck") },
    @{ Name = "lint";             Command = "corepack"; Args = @("pnpm", "run", "lint") },
    @{ Name = "test";             Command = "corepack"; Args = @("pnpm", "run", "test") },
    @{ Name = "build";            Command = "corepack"; Args = @("pnpm", "run", "build") },
    @{ Name = "supabase-verify";  Command = "corepack"; Args = @("pnpm", "run", "supabase:verify") }
)

$allPassed = $true
foreach ($step in $steps) {
    $passed = Invoke-Step -Name $step.Name -Command $step.Command -CommandArgs $step.Args
    if (-not $passed) {
        $allPassed = $false
        break
    }
}

if (-not $allPassed) {
    Write-Log "=== Verification suite FAILED -- skipping preview deploy. No production or database action taken. ==="
    exit 1
}

Write-Log "=== Full verification suite passed. Proceeding to Vercel PREVIEW deploy (never production). ==="

# `vercel deploy` with no --prod flag always creates a preview deployment. --yes skips the
# interactive confirmation prompt; this is the only non-interactive flag used, no production flag
# is ever passed.
$deployPassed = Invoke-Step -Name "vercel-preview-deploy" -Command "corepack" -CommandArgs @("pnpm", "exec", "vercel", "deploy", "--yes")

Write-Log "=== Final reported check: supabase:verify ==="
$finalVerifyPassed = Invoke-Step -Name "supabase-verify-final" -Command "corepack" -CommandArgs @("pnpm", "run", "supabase:verify")

Write-Log "=== Summary ==="
Write-Log "Verification suite: PASSED (typecheck, mobile-typecheck, lint, test, build, supabase:verify)"
Write-Log "Vercel preview deploy: $(if ($deployPassed) { 'PASSED' } else { 'FAILED' })"
Write-Log "Final supabase:verify: $(if ($finalVerifyPassed) { 'PASSED' } else { 'FAILED' })"
Write-Log "No production deploy and no live Supabase migration push were performed by this script."
Write-Log "=== Post-sprint verification run finished ==="

if (-not $deployPassed -or -not $finalVerifyPassed) { exit 1 }
exit 0
