# ═══════════════════════════════════════════════════════
#  StatPitch — Full Project Diagnostic (PowerShell)
#  Run from: Football_Stats/
#  Usage:    .\diagnose.ps1 | Tee-Object diagnostic_output.txt
# ═══════════════════════════════════════════════════════

function ok   { param($m) Write-Host "  [OK]  $m" -ForegroundColor Green }
function warn { param($m) Write-Host "  [!!]  $m" -ForegroundColor Yellow }
function fail { param($m) Write-Host "  [XX]  $m" -ForegroundColor Red }
function head { param($m) Write-Host "`n=== $m ===" -ForegroundColor Cyan }
function sub  { param($m) Write-Host "`n-- $m --" -ForegroundColor Blue }

# ── 1. FULL FILE TREE ───────────────────────────────────
head "1. FULL FILE TREE"
Get-ChildItem -Recurse -Force |
  Where-Object { $_.FullName -notmatch 'node_modules|__pycache__|\.git|\\dist\\|\.vite' } |
  Sort-Object FullName |
  ForEach-Object {
    $depth = ($_.FullName -split '\\').Count - ($PWD.Path -split '\\').Count - 1
    $indent = "  " * $depth
    Write-Host "$indent$($_.Name)"
  }

# ── 2. CRITICAL FILE CHECKS ─────────────────────────────
head "2. CRITICAL FILE CHECKS"

$frontendFiles = @(
  "frontend\src\components\PlayerCard.jsx",
  "frontend\src\components\PitchView.jsx",
  "frontend\src\components\Navbar.jsx",
  "frontend\src\pages\BestTeamPage.jsx",
  "frontend\src\pages\FplTablePage.jsx",
  "frontend\src\pages\PredictionsPage.jsx",
  "frontend\src\api\api.js",
  "frontend\src\App.jsx",
  "frontend\src\index.css",
  "frontend\src\main.jsx"
)

$backendFiles = @(
  "backend\app\main.py",
  "backend\app\models\elo_model.py",
  "backend\app\models\poisson_model.py",
  "backend\app\models\season_simulator.py",
  "backend\requirements.txt"
)

sub "Frontend files"
foreach ($f in $frontendFiles) {
  if (Test-Path $f) { ok $f } else { fail "$f  <-- MISSING" }
}

sub "Backend files"
foreach ($f in $backendFiles) {
  if (Test-Path $f) { ok $f } else { fail "$f  <-- MISSING" }
}

# ── 3. PLAYERCARD IMPORT AUDIT ──────────────────────────
head "3. PLAYERCARD IMPORT AUDIT"

sub "Who imports PlayerCard?"
Get-ChildItem -Recurse -Path frontend\src -Include "*.jsx","*.js" |
  Select-String -Pattern "import.*PlayerCard" |
  ForEach-Object { Write-Host "  $($_.Filename) --> $($_.Line.Trim())" }

sub "Exact import in PitchView.jsx"
$pvPath = "frontend\src\components\PitchView.jsx"
if (Test-Path $pvPath) {
  $importLine = Get-Content $pvPath | Select-String "import.*PlayerCard" | Select-Object -First 1
  if ($importLine) {
    Write-Host "  $($importLine.Line.Trim())"
    # Extract path
    $match = [regex]::Match($importLine.Line, 'from\s+"([^"]+)"')
    if ($match.Success) {
      $importedPath = $match.Groups[1].Value
      $resolved = "frontend\src\components\$importedPath.jsx" -replace '/','\'
      $resolved = $resolved -replace '\\\.\\','\'
      if (Test-Path $resolved) { ok "Resolves OK: $resolved" }
      else { fail "BROKEN: $resolved does not exist!" }
    }
  } else { warn "No PlayerCard import found in PitchView.jsx" }
} else { fail "PitchView.jsx not found" }

# ── 4. PLAYERCARD CONTENT CHECK ─────────────────────────
head "4. PLAYERCARD CONTENT CHECK"
$pc = "frontend\src\components\PlayerCard.jsx"
if (Test-Path $pc) {
  $lines     = (Get-Content $pc).Count
  $ptileRefs = (Select-String -Path $pc -Pattern "ptile").Count
  $hasExport = (Select-String -Path $pc -Pattern "export default").Count -gt 0
  $hasFplUrl = (Select-String -Path $pc -Pattern "fantasy.premierleague.com").Count -gt 0

  Write-Host "  Lines: $lines"
  if ($ptileRefs -gt 0) { ok "ptile classes found ($ptileRefs refs) -- NEW version" }
  else                  { fail "NO ptile classes -- this is the OLD PlayerCard. Replace it!" }
  if ($hasFplUrl)       { ok "FPL shirt URLs present" }
  else                  { warn "No FPL shirt URL -- CSS jersey fallback only" }
  if ($hasExport)       { ok "Has default export" }
  else                  { fail "No default export -- import will be undefined!" }

  sub "First 8 lines"
  Get-Content $pc | Select-Object -First 8 | ForEach-Object { Write-Host "  $_" }
} else {
  fail "PlayerCard.jsx MISSING -- pitch will be 100% empty"
}

# ── 5. PITCHVIEW CONTENT CHECK ──────────────────────────
head "5. PITCHVIEW CONTENT CHECK"
$pv = "frontend\src\components\PitchView.jsx"
if (Test-Path $pv) {
  $lines = (Get-Content $pv).Count
  Write-Host "  Lines: $lines"
  if ((Select-String $pv -Pattern "vertical-pitch-player-anchor").Count -gt 0) { ok "Anchor class present" }
  else { fail "No anchor class -- players won't be positioned" }
  if ((Select-String $pv -Pattern "FORMATION_X_MAP|xMap").Count -gt 0) { ok "Formation position map present" }
  else { fail "No formation map -- players won't know where to go" }
  if ((Select-String $pv -Pattern "hideInsights").Count -gt 0) { ok "hideInsights prop present" }
  else { warn "No hideInsights prop" }
} else { fail "PitchView.jsx MISSING" }

# ── 6. BESTTEAMPAGE CHECK ───────────────────────────────
head "6. BESTTEAMPAGE CHECK"
$bt = "frontend\src\pages\BestTeamPage.jsx"
if (Test-Path $bt) {
  $lines = (Get-Content $bt).Count
  Write-Host "  Lines: $lines"
  if ((Select-String $bt -Pattern "chooseBestXI").Count -gt 0)           { ok "chooseBestXI present" }
  else { fail "No chooseBestXI -- lineup never built" }
  if ((Select-String $bt -Pattern "normalizePlayer").Count -gt 0)         { ok "normalizePlayer present" }
  else { fail "No normalizePlayer -- data never mapped" }
  if ((Select-String $bt -Pattern "getFplPredictorTable|getFplBootstrap").Count -gt 0) { ok "API imports present" }
  else { fail "No API imports -- no data will load" }
  if ((Select-String $bt -Pattern "merit|form").Count -gt 0)              { ok "Fallback scoring (merit/form) present" }
  else { warn "No fallback scoring -- pitch may be empty when ep_next=null" }
} else { fail "BestTeamPage.jsx MISSING" }

# ── 7. API.JS CHECK ─────────────────────────────────────
head "7. API.JS CHECK"
$api = "frontend\src\api\api.js"
if (Test-Path $api) {
  sub "Exported functions"
  Select-String -Path $api -Pattern "^export async function" |
    ForEach-Object { Write-Host "  [OK]  $($_.Line.Trim())" -ForegroundColor Green }
  sub "API_BASE line"
  Select-String -Path $api -Pattern "API_BASE|VITE_API_BASE" |
    Select-Object -First 2 |
    ForEach-Object { Write-Host "  $($_.Line.Trim())" }
} else { fail "api.js MISSING" }

# ── 8. CSS PITCH CLASSES ────────────────────────────────
head "8. CSS PITCH TILE CLASSES"
$css = "frontend\src\index.css"
if (Test-Path $css) {
  $classes = @(".ptile",".ptile-starter",".ptile-bench",".ptile-shirt-wrap",
               ".ptile-shirt-img",".ptile-name",".ptile-pts",
               ".vertical-pitch-player-anchor",".vertical-pitch",
               ".nb2-bar",".nb2-row-primary",".nb2-row-secondary",".pp-page")
  foreach ($cls in $classes) {
    if ((Select-String -Path $css -Pattern [regex]::Escape($cls)).Count -gt 0) { ok $cls }
    else { fail "$cls  <-- NOT IN CSS" }
  }
  $totalLines = (Get-Content $css).Count
  Write-Host "`n  Total CSS lines: $totalLines"
} else { fail "index.css MISSING" }

# ── 9. APP.JSX ROUTES ───────────────────────────────────
head "9. APP.JSX ROUTES"
$app = "frontend\src\App.jsx"
if (Test-Path $app) {
  sub "Route paths"
  Select-String -Path $app -Pattern 'path=' |
    ForEach-Object {
      $m = [regex]::Match($_.Line, 'path="([^"]+)"')
      if ($m.Success) { Write-Host "  $($m.Groups[1].Value)" }
    }
  sub "Imported pages"
  Select-String -Path $app -Pattern "^import" |
    ForEach-Object { Write-Host "  $($_.Line.Trim())" }
} else { fail "App.jsx MISSING" }

# ── 10. ENV FILES ───────────────────────────────────────
head "10. ENVIRONMENT FILES"
foreach ($env in @("backend\.env",".env","frontend\.env","frontend\.env.local")) {
  if (Test-Path $env) {
    ok "Found: $env"
    $content = Get-Content $env
    if ($content -match "API_FOOTBALL_KEY")  { ok "  API_FOOTBALL_KEY set" }
    else                                      { warn "  API_FOOTBALL_KEY not found" }
    if ($content -match "VITE_API_BASE")     { ok "  VITE_API_BASE set" }
  }
}
if (-not (Test-Path "backend\.env") -and -not (Test-Path ".env")) {
  warn "No .env file -- API_FOOTBALL_KEY not set, standings will fail"
}
if (-not (Test-Path "frontend\.env") -and -not (Test-Path "frontend\.env.local")) {
  warn "No frontend .env -- defaulting to http://127.0.0.1:8003"
}

# ── 11. REDUNDANT FILES ─────────────────────────────────
head "11. REDUNDANT / MISPLACED FILES"

sub "FixturesTable duplicate"
$ft1 = Test-Path "frontend\src\components\FixturesTable.jsx"
$ft2 = Test-Path "frontend\src\components\FixtureTable.jsx"
if ($ft1) { warn "FixturesTable.jsx exists" }
if ($ft2) { warn "FixtureTable.jsx exists" }
if ($ft1 -and $ft2) { fail "BOTH exist -- delete one!" }

sub "SquadBuilderPage location"
Get-ChildItem -Recurse -Filter "SquadBuilderPage.jsx" frontend\src |
  ForEach-Object { Write-Host "  Found at: $($_.FullName)" }
if (Test-Path "frontend\src\components\squad\SquadBuilderPage.jsx") {
  warn "SquadBuilderPage.jsx inside components/squad/ -- should be in pages/"
}

sub "StandingsWidget location"
Get-ChildItem -Recurse -Filter "StandingsWidget.jsx" frontend\src |
  ForEach-Object { Write-Host "  Found at: $($_.FullName)" }

sub "PlayerCard_pitch.jsx still present? (should be renamed)"
if (Test-Path "frontend\src\components\PlayerCard_pitch.jsx") {
  fail "PlayerCard_pitch.jsx still exists -- rename to PlayerCard.jsx !"
} else { ok "No leftover PlayerCard_pitch.jsx" }

# ── 12. VERDICT ─────────────────────────────────────────
head "12. VERDICT"
$pcExists   = Test-Path "frontend\src\components\PlayerCard.jsx"
$pcHasPtile = $false
if ($pcExists) {
  $pcHasPtile = (Select-String "frontend\src\components\PlayerCard.jsx" -Pattern "ptile").Count -gt 0
}

Write-Host ""
if (-not $pcExists) {
  Write-Host "  [CULPRIT] PlayerCard.jsx is MISSING" -ForegroundColor Red
  Write-Host "  Copy outputs\PlayerCard_pitch.jsx -> frontend\src\components\PlayerCard.jsx" -ForegroundColor Red
} elseif (-not $pcHasPtile) {
  Write-Host "  [CULPRIT] PlayerCard.jsx is the OLD version (no ptile classes)" -ForegroundColor Red
  Write-Host "  Replace with the new FPL tile version from outputs\PlayerCard_pitch.jsx" -ForegroundColor Red
} else {
  Write-Host "  PlayerCard.jsx looks correct" -ForegroundColor Green
  Write-Host "  If pitch still empty, check browser DevTools > Console for JS errors" -ForegroundColor Yellow
  Write-Host "  Or check Network tab to confirm /api/fpl/predictor-table returns data" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " Diagnostic complete. Paste the output above to debug." -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════`n" -ForegroundColor Cyan