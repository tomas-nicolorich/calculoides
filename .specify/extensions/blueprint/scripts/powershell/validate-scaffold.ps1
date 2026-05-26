# validate-scaffold.ps1

param (
    [string]$FeatureDir
)

$global:PASS = 0
$global:WARN = 0
$global:FAIL = 0

function Pass-Check($msg) { $global:PASS++; Write-Host "  [PASS] $msg" -ForegroundColor Green }
function Warn-Check($msg) { $global:WARN++; Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function Fail-Check($msg) { $global:FAIL++; Write-Host "  [FAIL] $msg" -ForegroundColor Red }
function Header($msg) { Write-Host "" ; Write-Host "[$msg]" -ForegroundColor Cyan }

# === Resolve feature directory ===
$RepoRoot = (git rev-parse --show-toplevel 2>$null)
if (-not $RepoRoot) { $RepoRoot = Get-Location }

if (-not $FeatureDir) {
    $Branch = (git rev-parse --abbrev-ref HEAD 2>$null)
    if ($Branch -match '^([0-9]{3})-') {
        $Prefix = $Matches[1]
        $FeatureDir = Get-ChildItem -Path "$RepoRoot/specs" -Directory -Filter "$Prefix-*" | Select-Object -First 1 | ForEach-Object { $_.FullName }
    } elseif ($Branch -match '^([0-9]{8}-)') {
        $Prefix = $Matches[1]
        $FeatureDir = Get-ChildItem -Path "$RepoRoot/specs" -Directory -Filter "$Prefix*" | Select-Object -First 1 | ForEach-Object { $_.FullName }
    }
}

if (-not $FeatureDir -or -not (Test-Path $FeatureDir)) {
    $SpecDirs = Get-ChildItem -Path "$RepoRoot/specs" -Directory
    if ($SpecDirs.Count -eq 1) {
        $FeatureDir = $SpecDirs[0].FullName
        Write-Host "Auto-detected feature directory: $FeatureDir"
    } else {
        Write-Host "ERROR: Feature directory not found." -ForegroundColor Red
        exit 1
    }
}

$Guide = Join-Path $FeatureDir "blueprint.md"

Write-Host "=== Blueprint Scaffold Validator ===" -ForegroundColor Cyan
Write-Host "Feature: $FeatureDir"
Write-Host "Blueprint: $Guide"

# CHECK 1
Header "1. Blueprint Document"
if (Test-Path $Guide) {
    Pass-Check "blueprint.md exists"
} else {
    Fail-Check "blueprint.md not found"
    exit 1
}

# CHECK 2
Header "2. File Existence"
$NewFiles = @()
$Content = Get-Content $Guide
foreach ($line in $Content) {
    if ($line -match '\*\*File\*\*:\s+`([^`]+)`.*\(new') { $NewFiles += $Matches[1] }
    elseif ($line -match '\|[\s]*`?([a-zA-Z][^`\|]+\.[a-zA-Z]+)`?[\s]*\|.*[Nn]ew') { $NewFiles += $Matches[1] }
    elseif ($line -match '\|[\s]*`([a-zA-Z][^`]*\/[^`]*\.[a-zA-Z]+)`[\s]*\|') { $NewFiles += $Matches[1] }
}
$UniqueNewFiles = $NewFiles | Select-Object -Unique
if ($UniqueNewFiles.Count -eq 0) {
    Warn-Check "No NEW files detected"
} else {
    foreach ($f in $UniqueNewFiles) {
        $FullPath = Join-Path $RepoRoot $f
        if (Test-Path $FullPath) { Pass-Check "$f exists" }
        else { Fail-Check "$f MISSING" }
    }
}

# CHECK 3
Header "3. TODO Markers"
$ServiceFiles = @()
$TestFiles = @()
foreach ($f in $UniqueNewFiles) {
    $FullPath = Join-Path $RepoRoot $f
    if (-not (Test-Path $FullPath)) { continue }
    $BaseName = Split-Path $f -Leaf
    $BaseNameLower = $BaseName.ToLower()
    if ($BaseNameLower -match "service|handler|usecase|interactor") { $ServiceFiles += $FullPath }
    elseif ($BaseNameLower -match "test|spec\.|test_|_test\.") { $TestFiles += $FullPath }
}

function Check-File($file, $label) {
    $RelPath = $file.Replace("$RepoRoot\", "")
    $FileContent = Get-Content $file
    $HasTodo = @($FileContent | Select-String "TODO").Count
    $HasNotImpl = @($FileContent | Select-String "NotImplemented|not_implemented|throw.*NotImplemented").Count
    if ($HasTodo -gt 0 -or $HasNotImpl -gt 0) { Pass-Check "$RelPath ($HasTodo TODOs) [$label]" }
    else { Warn-Check "$RelPath (NO TODOs) [$label]" }
}

Write-Host "  Services:"
foreach ($f in $ServiceFiles) { Check-File $f "Service" }
Write-Host "  Tests:"
foreach ($f in $TestFiles) { Check-File $f "Test" }

# CHECK 4
Header "4. Over-Implementation"
$OverImplFound = $false
$AllCheckFiles = $ServiceFiles + $TestFiles
foreach ($f in $AllCheckFiles) {
    $RelPath = $f.Replace("$RepoRoot\", "")
    $FileContent = Get-Content $f
    $HasTodo = @($FileContent | Select-String "TODO").Count
    $HasNotImpl = @($FileContent | Select-String "NotImplemented|not_implemented|throw.*NotImplemented").Count
    if ($HasTodo -eq 0 -and $HasNotImpl -eq 0) {
        $Methods = @($FileContent | Select-String "^\s*(def |fun |func |function |public |private |protected |async )").Count
        if ($Methods -gt 1 -and $FileContent.Length -gt 30) {
            Fail-Check "$RelPath over-implemented?"
            $OverImplFound = $true
        }
    }
}
if (-not $OverImplFound) { Pass-Check "No over-implementation detected" }

# SUMMARY
Write-Host ""
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "  PASS: $global:PASS"
Write-Host "  WARN: $global:WARN"
Write-Host "  FAIL: $global:FAIL"

if ($global:FAIL -gt 0) { exit 1 }
exit 0
