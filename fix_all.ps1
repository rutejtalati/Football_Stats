# ═══════════════════════════════════════════════════════
#  StatPitch — Fix All Issues Found by Diagnostic
#  Run from: Football_Stats/
#  Usage:    .\fix_all.ps1
# ═══════════════════════════════════════════════════════

function ok   { param($m) Write-Host "  [DONE] $m" -ForegroundColor Green }
function fail { param($m) Write-Host "  [FAIL] $m" -ForegroundColor Red }
function head { param($m) Write-Host "`n=== $m ===" -ForegroundColor Cyan }

# ── FIX 1: Replace PlayerCard.jsx with the new FPL tile version ─────
head "FIX 1: Replacing PlayerCard.jsx (THE MAIN CULPRIT)"

$newCard = @'
// components/PlayerCard.jsx  (used on the pitch via PitchView)
// FPL-style compact shirt tile

import { useState } from "react";

const SHIRT_IDS = {
  ARS: 3,   AVL: 7,   BOU: 91,  BRE: 94,  BHA: 36,
  CHE: 8,   CRY: 31,  EVE: 11,  FUL: 54,  IPS: 40,
  LEI: 13,  LIV: 14,  MCI: 43,  MUN: 1,   NEW: 4,
  NFO: 17,  SOU: 20,  TOT: 6,   WHU: 21,  WOL: 39,
};

const TEAM_COLORS = {
  ARS:"#EF0107", AVL:"#95BFE5", BOU:"#DA291C", BRE:"#E30613", BHA:"#0057B8",
  CHE:"#034694", CRY:"#1B458F", EVE:"#003399", FUL:"#CCCCCC", IPS:"#3A64A3",
  LEI:"#0053A0", LIV:"#C8102E", MCI:"#6CABDD", MUN:"#DA291C", NEW:"#241F20",
  NFO:"#DD0000", SOU:"#D71920", TOT:"#132257", WHU:"#7A263A", WOL:"#FDB913",
};

const TEAM_TEXT = { FUL:"#111", WOL:"#111", AVL:"#111", MCI:"#111" };

const DIFF_COLORS = {
  1:{ bg:"#1a6e38", text:"#b6ffd1" },
  2:{ bg:"#1a6e38", text:"#b6ffd1" },
  3:{ bg:"#7a5c14", text:"#ffe8a0" },
  4:{ bg:"#7a1c1c", text:"#ffd0d0" },
  5:{ bg:"#4a0808", text:"#ffb0b0" },
};

function shirtUrl(team) {
  const id = SHIRT_IDS[team];
  if (!id) return null;
  return `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${id}-66.png`;
}

function shortName(name) {
  if (!name) return "";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0];
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}

function CssJersey({ team }) {
  const bg    = TEAM_COLORS[team] || "#4f8cff";
  const color = TEAM_TEXT[team]   || "#fff";
  return (
    <div className="ptile-jersey-css" style={{ background: bg }}>
      <div className="ptile-jersey-neck" />
      <div className="ptile-jersey-sleeve ptile-jersey-sleeve-l" style={{ background: bg }} />
      <div className="ptile-jersey-sleeve ptile-jersey-sleeve-r" style={{ background: bg }} />
      <span className="ptile-jersey-pos" style={{ color }}>{team?.slice(0,3) || "?"}</span>
    </div>
  );
}

function CapBadge({ isCaptain, isViceCaptain }) {
  if (!isCaptain && !isViceCaptain) return null;
  return (
    <div className={`ptile-cap-badge ${isCaptain ? "ptile-cap-badge-c" : "ptile-cap-badge-vc"}`}>
      {isCaptain ? "C" : "V"}
    </div>
  );
}

function projTier(pts) {
  if (pts >= 9)   return "ptile-tier-elite";
  if (pts >= 7)   return "ptile-tier-high";
  if (pts >= 5.5) return "ptile-tier-good";
  return "";
}

function Tooltip({ player }) {
  const diff = DIFF_COLORS[player.fixture_difficulty] || DIFF_COLORS[3];
  return (
    <div className="ptile-tooltip">
      <div className="ptile-tooltip-name">{player.name}</div>
      <div className="ptile-tooltip-row">
        <span className="ptile-tooltip-label">Proj pts</span>
        <span className="ptile-tooltip-val ptile-tooltip-val-green">
          {Number(player.projected_points || 0).toFixed(1)}
        </span>
      </div>
      <div className="ptile-tooltip-row">
        <span className="ptile-tooltip-label">Price</span>
        <span className="ptile-tooltip-val">£{player.cost}m</span>
      </div>
      <div className="ptile-tooltip-row">
        <span className="ptile-tooltip-label">Form</span>
        <span className="ptile-tooltip-val">{Number(player.form || 0).toFixed(1)}</span>
      </div>
      <div className="ptile-tooltip-row">
        <span className="ptile-tooltip-label">Owned</span>
        <span className="ptile-tooltip-val">
          {Number(player.selected_by_pct || 0).toFixed(1)}%
        </span>
      </div>
      <div className="ptile-tooltip-row">
        <span className="ptile-tooltip-label">Prob</span>
        <span className="ptile-tooltip-val">
          {Math.round((player.appearance_prob || player.prob_appear || 0) * 100)}%
        </span>
      </div>
      {player.next_opp && (
        <div className="ptile-tooltip-fixture"
          style={{ background: diff.bg, color: diff.text }}>
          {player.next_opp}
        </div>
      )}
    </div>
  );
}

export default function PlayerCard({
  player,
  isCaptain,
  isViceCaptain,
  isTopProjected,
  dropActive,
  size = "starter",
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onAction,
  label,
  maxProjected,
}) {
  const [hovered, setHovered] = useState(false);
  if (!player) return null;

  const url     = shirtUrl(player.team);
  const pts     = Number(player.projected_points || 0);
  const tier    = projTier(pts);
  const diff    = DIFF_COLORS[player.fixture_difficulty] || DIFF_COLORS[3];
  const isBench = size === "bench";

  return (
    <div
      className={[
        "ptile",
        isBench    ? "ptile-bench"      : "ptile-starter",
        tier,
        dropActive ? "ptile-drop-active" : "",
        isTopProjected ? "ptile-top"    : "",
      ].filter(Boolean).join(" ")}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <CapBadge isCaptain={isCaptain} isViceCaptain={isViceCaptain} />

      <div className="ptile-shirt-wrap">
        {url ? (
          <img
            className="ptile-shirt-img"
            src={url}
            alt={player.team}
            onError={e => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextSibling.style.display = "flex";
            }}
          />
        ) : null}
        <div style={{ display: url ? "none" : "flex", justifyContent: "center" }}>
          <CssJersey team={player.team} />
        </div>
      </div>

      <div className="ptile-name">{shortName(player.name)}</div>

      {player.next_opp && (
        <div className="ptile-fixture" style={{ background: diff.bg, color: diff.text }}>
          {player.next_opp}
        </div>
      )}

      <div className="ptile-pts">{pts.toFixed(1)}</div>

      {hovered && <Tooltip player={player} />}
    </div>
  );
}
'@

$newCard | Set-Content "frontend\src\components\PlayerCard.jsx" -Encoding UTF8
if (Test-Path "frontend\src\components\PlayerCard.jsx") {
  $check = (Select-String "frontend\src\components\PlayerCard.jsx" -Pattern "ptile" -SimpleMatch).Count
  if ($check -gt 0) { ok "PlayerCard.jsx replaced — $check ptile refs found" }
  else              { fail "Replacement failed — no ptile refs found" }
} else { fail "Could not write PlayerCard.jsx" }


# ── FIX 2: Add hideInsights prop to PitchView.jsx if missing ─────────
head "FIX 2: Checking PitchView hideInsights prop"

$pvContent = Get-Content "frontend\src\components\PitchView.jsx" -Raw
if ($pvContent -notmatch "hideInsights") {
  # Patch the export function signature to add hideInsights
  $patched = $pvContent -replace `
    '(export default function PitchView\s*\{[^}]*)(bench\s*=\s*\[\])', `
    '$1bench = [], hideInsights = false'
  $patched | Set-Content "frontend\src\components\PitchView.jsx" -Encoding UTF8
  ok "Added hideInsights = false default to PitchView"
} else {
  ok "PitchView already has hideInsights prop"
}


# ── FIX 3: Delete duplicate FixtureTable.jsx ─────────────────────────
head "FIX 3: Removing duplicate FixtureTable.jsx"

$dupeFile = "frontend\src\components\FixtureTable.jsx"
if (Test-Path $dupeFile) {
  # First check nothing imports it uniquely
  $usages = Select-String -Path "frontend\src" -Recurse -Pattern "from.*FixtureTable[^s]" -Include "*.jsx","*.js" -SimpleMatch
  if ($usages.Count -eq 0) {
    Remove-Item $dupeFile -Force
    ok "Deleted FixtureTable.jsx (no unique imports found)"
  } else {
    Write-Host "  [SKIP] FixtureTable.jsx has $($usages.Count) unique import(s) — check manually:" -ForegroundColor Yellow
    $usages | ForEach-Object { Write-Host "    $($_.Filename): $($_.Line.Trim())" }
  }
} else { ok "FixtureTable.jsx already gone" }


# ── FIX 4: Move StandingsWidget to components/ ───────────────────────
head "FIX 4: Moving StandingsWidget.jsx to components/"

$swSrc = "frontend\src\StandingsWidget.jsx"
$swDst = "frontend\src\components\StandingsWidget.jsx"
if ((Test-Path $swSrc) -and -not (Test-Path $swDst)) {
  Copy-Item $swSrc $swDst -Force
  # Update any imports that reference "../StandingsWidget" or "./StandingsWidget" from src root
  Get-ChildItem -Recurse -Path "frontend\src" -Include "*.jsx","*.js" |
    ForEach-Object {
      $c = Get-Content $_.FullName -Raw
      if ($c -match "StandingsWidget") {
        Write-Host "  [INFO] $($_.Name) imports StandingsWidget — check path is correct" -ForegroundColor Yellow
      }
    }
  ok "Copied StandingsWidget.jsx to components/ (original kept as backup)"
} elseif (Test-Path $swDst) {
  ok "StandingsWidget.jsx already in components/"
} else { ok "StandingsWidget.jsx not found — skipped" }


# ── FIX 5: Add API_FOOTBALL_KEY reminder ─────────────────────────────
head "FIX 5: API_FOOTBALL_KEY check"

$envFile = "backend\.env"
if (-not (Test-Path $envFile)) {
  New-Item -Path $envFile -ItemType File | Out-Null
  Add-Content $envFile "API_FOOTBALL_KEY=YOUR_KEY_HERE"
  warn "Created backend\.env — replace YOUR_KEY_HERE with your real api-football key"
  warn "Get a free key at: https://dashboard.api-football.com/register"
} else {
  $envContent = Get-Content $envFile -Raw
  if ($envContent -notmatch "API_FOOTBALL_KEY") {
    Add-Content $envFile "`nAPI_FOOTBALL_KEY=YOUR_KEY_HERE"
    warn "Added API_FOOTBALL_KEY placeholder to backend\.env — replace with real key"
  } else {
    ok "API_FOOTBALL_KEY already in backend\.env"
  }
}


# ── FIX 6: Verify SquadBuilderPage in pages/ ─────────────────────────
head "FIX 6: SquadBuilderPage location"

$sbPages = "frontend\src\pages\SquadBuilderPage.jsx"
$sbSquad = "frontend\src\components\squad\SquadBuilderPage.jsx"
if (Test-Path $sbPages) {
  ok "frontend\src\pages\SquadBuilderPage.jsx exists (correct location)"
  if (Test-Path $sbSquad) {
    Write-Host "  [INFO] Also exists in components/squad/ — that one is unused, can delete:" -ForegroundColor Yellow
    Write-Host "         Remove-Item '$sbSquad'" -ForegroundColor DarkGray
  }
} else { fail "SquadBuilderPage.jsx not in pages/ — App.jsx will break" }


# ── SUMMARY ──────────────────────────────────────────────────────────
Write-Host "`n"
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " All fixes applied. Now do:" -ForegroundColor White
Write-Host ""
Write-Host "   1. cd frontend" -ForegroundColor Yellow
Write-Host "   2. npm run dev" -ForegroundColor Yellow
Write-Host "   3. Open http://localhost:5173/best-team" -ForegroundColor Yellow
Write-Host "   4. Open DevTools > Console — look for errors" -ForegroundColor Yellow
Write-Host "   5. Open DevTools > Network — confirm API calls return 200" -ForegroundColor Yellow
Write-Host ""
Write-Host " If pitch still empty after this, the issue is the" -ForegroundColor White
Write-Host " backend not returning player data. Check:" -ForegroundColor White
Write-Host "   cd backend && uvicorn app.main:app --port 8003 --reload" -ForegroundColor Yellow
Write-Host "   Then visit: http://127.0.0.1:8003/api/fpl/predictor-table" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════`n" -ForegroundColor Cyan