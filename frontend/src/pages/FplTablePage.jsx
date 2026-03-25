// pages/FplTablePage.jsx — upgraded columns, better algorithms, full names
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getFplPredictorTable } from "../api/api";

/* ── Responsive hook ── */
function useIsMobile(bp = 768) {
  const [m, setM] = useState(typeof window !== "undefined" ? window.innerWidth < bp : false);
  useEffect(() => {
    const h = () => setM(window.innerWidth < bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return m;
}

/* ── Club colours ── */
const TEAM_COLORS = {
  ARS:"#ef0107",AVL:"#95bfe5",BOU:"#da291c",BRE:"#e30613",
  BHA:"#0057b8",CHE:"#034694",CRY:"#1b458f",EVE:"#003399",
  FUL:"#ffffff",IPS:"#3A64A3",LEI:"#0053A0",LIV:"#c8102e",
  MCI:"#6cabdd",MUN:"#da291c",NEW:"#241f20",NFO:"#dd0000",
  SOU:"#D71920",TOT:"#132257",WHU:"#7a263a",WOL:"#fdb913",
};
const TEAM_BADGES = {
  ARS:"https://resources.premierleague.com/premierleague/badges/50/t3.png",
  AVL:"https://resources.premierleague.com/premierleague/badges/50/t7.png",
  BOU:"https://resources.premierleague.com/premierleague/badges/50/t91.png",
  BRE:"https://resources.premierleague.com/premierleague/badges/50/t94.png",
  BHA:"https://resources.premierleague.com/premierleague/badges/50/t36.png",
  CHE:"https://resources.premierleague.com/premierleague/badges/50/t8.png",
  CRY:"https://resources.premierleague.com/premierleague/badges/50/t31.png",
  EVE:"https://resources.premierleague.com/premierleague/badges/50/t11.png",
  FUL:"https://resources.premierleague.com/premierleague/badges/50/t54.png",
  IPS:"https://resources.premierleague.com/premierleague/badges/50/t40.png",
  LEI:"https://resources.premierleague.com/premierleague/badges/50/t13.png",
  LIV:"https://resources.premierleague.com/premierleague/badges/50/t14.png",
  MCI:"https://resources.premierleague.com/premierleague/badges/50/t43.png",
  MUN:"https://resources.premierleague.com/premierleague/badges/50/t1.png",
  NEW:"https://resources.premierleague.com/premierleague/badges/50/t4.png",
  NFO:"https://resources.premierleague.com/premierleague/badges/50/t17.png",
  SOU:"https://resources.premierleague.com/premierleague/badges/50/t20.png",
  TOT:"https://resources.premierleague.com/premierleague/badges/50/t6.png",
  WHU:"https://resources.premierleague.com/premierleague/badges/50/t21.png",
  WOL:"https://resources.premierleague.com/premierleague/badges/50/t39.png",
};

/* ── Column tooltip definitions ── */
const TIPS = {
  form:            "FPL rolling form score (avg points over last 4 gameweeks). Higher = hotter player.",
  threat:          "FPL Threat score derived from shots and shot quality. Higher = more likely to score.",
  creativity:      "FPL Creativity score derived from chances created and key passes. Higher = more assists potential.",
  attack:          "Combined attacking involvement = Threat + Creativity. Best single number for all-round attack.",
  c_score:         "Captain Score: EP×2 adjusted for form trajectory, differential value, and ownership. Higher = better armband pick.",
  fdr:             "Fixture Difficulty Rating for next gameweek (1=very easy, 5=very hard). From official FPL data.",
  fixture_run:     "Fixture Run Score 0–10 for next 5 gameweeks. Weighted so the upcoming GW counts more. 10 = easiest run.",
  minutes:         "Minutes Security 0–100. Combines injury status (45%), season minutes rate (35%), and recent form presence (20%).",
  reliability:     "Reliability Score 0–100. Combines Minutes Security, availability chance, projected points and form. Best overall 'safe pick' indicator.",
  start_pct:       "Official FPL probability of playing next round (from Premier League). 100% = fully fit, 75%/50%/25% = varying doubt.",
  status:          "Player availability: ✓ Available · ? Doubtful · ✗ Injured · ⊘ Suspended",
  gw:              "Model-projected FPL points for this specific gameweek (form × FDR multiplier).",
  next5:           "Total projected FPL points across the next 5 gameweeks.",
  season_total:    "Projected total FPL points for the remainder of the season.",
  pts_per_million: "Expected Points per £1m of cost, scaled by position so GK/DEF/MID/FWD are comparable.",
  season_pts:      "Actual FPL points accumulated so far this season.",
  owned:           "Percentage of FPL managers who own this player.",
  transfers_in:    "Number of times this player was transferred IN this gameweek.",
  transfers_out:   "Number of times this player was transferred OUT this gameweek.",
  goals:           "Goals scored this season.",
  assists:         "Assists recorded this season.",
  clean_sheets:    "Clean sheets kept this season.",
  bonus:           "Average FPL bonus points per game this season.",
  xg90:            "Expected goals per 90 minutes (goals ÷ 90-minute appearances). Better than raw goals for predicting future scoring.",
  xa90:            "Expected assists per 90 minutes (assists ÷ 90-minute appearances). Better than raw assists for predicting future creativity.",
  yellow_cards:    "Yellow cards this season. High number = suspension risk.",
};

/* ── Helpers ── */
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

function formatPlayerName(name) {
  if (!name) return "-";
  const clean = String(name).replace(/\s+/g, " ").trim();
  const parts = clean.split(" ").filter(Boolean);
  if (parts.length <= 2) return clean;
  const conn = ["van","von","de","da","del","di","la","le"];
  const sl = parts[parts.length - 2]?.toLowerCase();
  if (conn.includes(sl)) return `${parts[parts.length - 2]} ${parts[parts.length - 1]}`;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function getTeamTextColor(team) {
  return ["FUL","WOL","AVL","MCI"].includes(team) ? "#050505" : "#ffffff";
}

/* ── Availability parsing from FPL news string ──
   FPL news examples:
     "Knock - 75% chance of playing"
     "Calf injury - Expected back 01 Mar"
     "Suspended for 1 match"
     ""  (fully available)
*/
function parseAvailability(row) {
  const status  = row?.status || "a";          // a/d/i/s/u/n from FPL
  const chance  = row?.chance_next_round;       // 0/25/50/75/100/null
  const news    = String(row?.news || "").trim();

  // Extract injury type from news: everything before the first " - " or "injury"
  let injuryType = "";
  if (news) {
    // "Calf injury - Expected back..."  → "Calf injury"
    // "Knock - 75% chance..."           → "Knock"
    // "Suspended for 1 match"           → "Suspended"
    const dashIdx = news.indexOf(" - ");
    const raw = dashIdx > -1 ? news.slice(0, dashIdx) : news;
    // Capitalise first letter, truncate if very long
    injuryType = raw.length > 30 ? raw.slice(0, 28) + "…" : raw;
  }

  // Determine display chance %
  let pct = 100;
  if (status === "s") pct = 0;
  else if (status === "u") pct = 0;
  else if (chance !== null && chance !== undefined) pct = Number(chance);
  else if (status === "i") pct = 25;
  else if (status === "d") pct = 75;

  // Build display string
  let display;
  if (pct === 100 && !injuryType) {
    display = "100%";
  } else if (status === "s") {
    display = `Suspended${injuryType ? ` (${injuryType})` : ""}`;
  } else if (injuryType) {
    display = `${pct}% (${injuryType})`;
  } else {
    display = `${pct}%`;
  }

  // Colour
  const color = pct === 100 ? "#22c55e"
    : pct >= 75  ? "#a3e635"
    : pct >= 50  ? "#f59e0b"
    : pct >= 25  ? "#ef4444"
    : "#9333ea";   // suspended = purple

  return { display, color, pct, injuryType };
}

function formatSigned(v) {
  const n = Number(v);
  if (isNaN(n) || n === 0) return "0";
  return n > 0 ? `+${n.toLocaleString()}` : n.toLocaleString();
}

/* ── Heat-map colour scale ── */
function heatColor(value, min, max) {
  const num = Number(value);
  if (isNaN(num) || max <= min) return "transparent";
  const ratio = clamp((num - min) / (max - min), 0, 1);
  if (ratio <= 0.20) return "#4b0f13";
  if (ratio <= 0.40) return "#8e1b1b";
  if (ratio <= 0.60) return "#c26519";
  if (ratio <= 0.75) return "#d8b53e";
  if (ratio <= 0.90) return "#8ccf6d";
  return "#19b45a";
}
function heatText(bg) {
  return ["#d8b53e","#8ccf6d","#19b45a"].includes(bg) ? "#06110a" : "#ffffff";
}

/* ── Components ── */
function SortArrow({ active, dir }) {
  if (!active) return <span style={{opacity:0.2,marginLeft:4,fontSize:10}}>↕</span>;
  return <span style={{marginLeft:4,fontSize:10,color:"rgba(0,255,240,.7)"}}>{dir==="asc"?"↑":"↓"}</span>;
}
function RankBadge({ rank }) {
  const gold=rank===1, silver=rank===2, bronze=rank===3;
  const bg = gold?"#c8972a":silver?"#8a9aaa":bronze?"#9b6840":"rgba(255,255,255,0.06)";
  const fg = gold||silver||bronze ? "#fff" : "#5a7a9a";
  return (
    <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",
      width:22,height:22,borderRadius:5,background:bg,color:fg,fontSize:10,fontWeight:800,
      flexShrink:0,boxShadow:gold?"0 0 8px rgba(200,151,42,0.5)":"none"}}>{rank}</span>
  );
}
function DiffPill({ label }) {
  const cfg = {
    Easy:{bg:"#1f7d3d",fg:"#eafff1"},
    Medium:{bg:"#a87d1b",fg:"#fff7df"},
    Hard:{bg:"#8f2424",fg:"#fff0f0"},
  }[label] || {bg:"#2d2d2d",fg:"#fff"};
  return (
    <span style={{display:"inline-block",marginLeft:6,padding:"2px 7px",
      background:cfg.bg,color:cfg.fg,fontSize:10,fontWeight:700}}>{label}</span>
  );
}

function HeatCell({ value, min, max, title, display, onMouseEnter, onMouseLeave }) {
  const bg = heatColor(Number(value), min, max);
  return (
    <td title={title}
      style={{background:bg,color:heatText(bg),fontWeight:700,fontSize:13}}
      onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {display ?? value}
    </td>
  );
}

/* ── Main export ── */
export default function FplTablePage() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [rows,       setRows]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [team,       setTeam]       = useState("ALL");
  const [position,   setPosition]   = useState("ALL");
  const [maxCost,    setMaxCost]    = useState(15.5);
  const [minProb,    setMinProb]    = useState(0);
  const [startGw,    setStartGw]    = useState(30);
  const [search,     setSearch]     = useState("");
  const [sortKey,    setSortKey]    = useState("next5_points");
  const [sortDir,    setSortDir]    = useState("desc");
  const [showFilters,setShowFilters]= useState(!isMobile);
  const [tooltip,    setTooltip]    = useState(null);
  const [modal,      setModal]      = useState(null);

  /* ── Fetch ── */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getFplPredictorTable({ start_gw:startGw, max_cost:maxCost, min_prob:minProb, team, position })
      .then(d => { if (!cancelled) { setRows(d.rows || []); setLoading(false); } })
      .catch(e => { console.error(e); if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [team, position, maxCost, minProb, startGw]);

  /* ── Enrich rows: resolve field aliases + compute derived metrics ── */
  const enriched = useMemo(() => rows.map(r => {
    // ── Field resolution (backend field names → frontend names) ──────────
    const playerName    = r.player || r.name || r.web_name || "";
    const appearance    = Number(r.appearance_prob ?? r.prob_appear ?? 0);
    const totalPts      = Number(r.points_so_far   ?? r.total_points  ?? 0);
    const projSeason    = Number(r.pts_rest_season  ?? r.projected_points ?? 0);
    const valueScore    = Number(r.value_rest_season ?? r.value_score ?? 0);

    // ── Raw FPL ICT components ───────────────────────────────────────────
    const creativity = Number(r.creativity   || 0);
    const threat     = Number(r.threat       || 0);
    const influence  = Number(r.influence    || 0);
    const ict        = Number(r.ict_index    || 0);
    const form       = Number(r.form         || 0);

    // ── Per-GW projected points ──────────────────────────────────────────
    const p1 = Number(r.pts_gw_1 || 0);
    const p2 = Number(r.pts_gw_2 || 0);
    const p3 = Number(r.pts_gw_3 || 0);
    const p4 = Number(r.pts_gw_4 || 0);
    const p5 = Number(r.pts_gw_5 || 0);
    const next5 = p1 + p2 + p3 + p4 + p5;

    // ── Attacking profile (normalised 0-10 scale) ────────────────────────
    // Threat: FPL raw scale ~0–900, normalise to 0–10
    const threatNorm = Number(clamp(threat / 90, 0, 10).toFixed(2));
    // Creativity: FPL raw scale ~0–1500, normalise to 0–10
    const creativityNorm = Number(clamp(creativity / 150, 0, 10).toFixed(2));
    // Attack: weighted sum (goals matter more than assists in FPL)
    const attack = Number((threatNorm * 0.55 + creativityNorm * 0.45).toFixed(2));

    // ── Captain Score — from backend if available, else local formula ───
    const captainScore = Number(
      r.captain_score ??
      (p1 * 0.58 + attack * 1.2 + appearance * 2.4 + valueScore * 0.42).toFixed(2)
    );

    // ── Fixture difficulty (from backend or derived) ──────────────────
    const fdr         = Number(r.fixture_difficulty ?? 3);
    const fixRun      = Number(r.fixture_run_score  ?? clamp((next5 / 35) * 10, 0, 10).toFixed(1));
    const difLabel    = fdr <= 2 ? "Easy" : fdr >= 4 ? "Hard" : "Medium";

    // ── Minutes Security from backend (upgraded algorithm) ───────────
    const minsecurity = Number(
      r.minutes_security ??
      clamp(appearance * 65 + (appearance * 100) * 0.3 + clamp(form / 8, 0, 1) * 5, 0, 100).toFixed(1)
    );

    // ── Reliability (safe pick) — composite score ──────────────────────
    const reliability = Number(clamp(
      minsecurity * 0.40 +
      (appearance * 100) * 0.25 +
      clamp((next5 / 30) * 100, 0, 100) * 0.20 +
      clamp((form / 8) * 100, 0, 100) * 0.15,
      0, 100
    ).toFixed(1));

    // ── Pts per £m (backend upgraded, position-scaled) ────────────────
    const ptsPerMillion = Number(r.value_score ?? valueScore ?? (p1 / Math.max(r.cost, 1)).toFixed(2));

    // ── Availability ─────────────────────────────────────────────────
    const avail = parseAvailability(r);

    // ── Transfer data ─────────────────────────────────────────────────
    const xfersIn  = Number(r.transfers_in_gw  || 0);
    const xfersOut = Number(r.transfers_out_gw || 0);

    // ── Season stats ─────────────────────────────────────────────────
    const goals   = Number(r.goals_this_season ?? r.goals   ?? 0);
    const assists = Number(r.assists_this_season ?? r.assists ?? 0);
    const cs      = Number(r.clean_sheets_season ?? r.clean_sheets ?? 0);
    const bonusPg = Number(r.bonus_per_game ?? (Number(r.bonus || 0) / Math.max(Number(r.minutes || 90) / 90, 1)).toFixed(2));
    const xg90    = Number(r.xg_per90 ?? (goals / Math.max(Number(r.minutes || 90) / 90, 1)).toFixed(2));
    const xa90    = Number(r.xa90 ?? r.xa_per90 ?? (assists / Math.max(Number(r.minutes || 90) / 90, 1)).toFixed(2));
    const yellows = Number(r.yellow_cards || 0);

    // ── Merit: ep_next is the cleanest single-GW quality signal ──────
    const merit = Number(r.merit ?? r.ep_next ?? p1);

    return {
      ...r,
      // Resolved fields
      player:           playerName,
      player_display:   formatPlayerName(playerName),
      _posColor:        {GK:"#f2c94c",DEF:"#4f9eff",MID:"#00e09e",FWD:"#ff6b6b"}[r.position] || "#4f9eff",
      prob_appear:      appearance,
      value_rest_season: valueScore,
      pts_rest_season:  projSeason,
      points_so_far:    totalPts,
      // Computed
      merit,
      threat_norm:      threatNorm,
      creativity_norm:  creativityNorm,
      attack,
      captain_score:    captainScore,
      fixture_label:    difLabel,
      fixture_run_score: fixRun,
      minutes_security:  minsecurity,
      reliability,
      pts_per_million:   ptsPerMillion,
      next5_points:     Number(next5.toFixed(1)),
      avail_display:    avail.display,
      avail_color:      avail.color,
      avail_pct:        avail.pct,
      transfers_in_gw:  xfersIn,
      transfers_out_gw: xfersOut,
      // Season stats
      goals, assists, clean_sheets: cs, bonus_per_game: bonusPg,
      xg_per90: xg90, xa_per90: xa90, yellow_cards: yellows,
    };
  }), [rows]);

  /* ── Filter + sort ── */
  const allTeams = useMemo(() =>
    ["ALL", ...Array.from(new Set(enriched.map(r => r.team))).sort()],
    [enriched]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter(r => {
      if (q && !String(r.player || "").toLowerCase().includes(q) &&
               !String(r.player_display || "").toLowerCase().includes(q) &&
               !String(r.team || "").toLowerCase().includes(q) &&
               !String(r.position || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [enriched, search]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (!sortKey) return copy;
    copy.sort((a, b) => {
      const n1 = Number(a[sortKey]), n2 = Number(b[sortKey]);
      if (!isNaN(n1) && !isNaN(n2)) return sortDir === "asc" ? n1-n2 : n2-n1;
      const s1 = String(a[sortKey] ?? "").toLowerCase();
      const s2 = String(b[sortKey] ?? "").toLowerCase();
      return sortDir === "asc" ? s1.localeCompare(s2) : s2.localeCompare(s1);
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  /* ── Heat-map ranges (computed on sorted rows for relative colouring) ── */
  const ranges = useMemo(() => {
    const rng = key => ({
      min: Math.min(...sorted.map(r => Number(r[key] || 0)), 0),
      max: Math.max(...sorted.map(r => Number(r[key] || 0)), 0.01),
    });
    return {
      merit:          rng("merit"),
      form:           rng("form"),
      threat_norm:    rng("threat_norm"),
      creativity_norm:rng("creativity_norm"),
      attack:         rng("attack"),
      captain_score:  rng("captain_score"),
      fixture_difficulty: rng("fixture_difficulty"),
      fixture_run_score:  rng("fixture_run_score"),
      minutes_security:   rng("minutes_security"),
      reliability:        rng("reliability"),
      avail_pct:          { min:0, max:100 },
      pts_gw_1:  rng("pts_gw_1"), pts_gw_2: rng("pts_gw_2"), pts_gw_3: rng("pts_gw_3"),
      next5_points:    rng("next5_points"),
      pts_rest_season: rng("pts_rest_season"),
      pts_per_million: rng("pts_per_million"),
      points_so_far:   rng("points_so_far"),
      selected_by_pct: rng("selected_by_pct"),
      transfers_in_gw: rng("transfers_in_gw"),
      transfers_out_gw:rng("transfers_out_gw"),
      goals:           rng("goals"),
      assists:         rng("assists"),
      clean_sheets:    rng("clean_sheets"),
      bonus_per_game:  rng("bonus_per_game"),
      xg_per90:        rng("xg_per90"),
      xa_per90:        rng("xa_per90"),
      yellow_cards:    rng("yellow_cards"),
    };
  }, [sorted]);

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function Th({ col, children, tip, style }) {
    const active = sortKey === col;
    return (
      <th onClick={() => handleSort(col)} title={tip}
        style={{ cursor:"pointer", whiteSpace:"nowrap", ...style }}>
        {children}<SortArrow active={active} dir={sortDir}/>
      </th>
    );
  }

  /* ── Loading ── */
  if (loading) return (
    <div className="page-shell" style={{ color:"rgba(0,255,240,.35)", padding:24 }}>
      Loading FPL table…
    </div>
  );

  /* ── Render ── */
  return (
    <>
    <div className="page-shell" style={{ paddingBottom: isMobile ? 80 : 40 }}>
      <style>{`
        .fpl-tbl-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; border-radius:12px; }
        .fpl-tbl-wrap::-webkit-scrollbar { height:4px; }
        .fpl-tbl-wrap::-webkit-scrollbar-thumb { background:rgba(0,255,240,0.2); border-radius:4px; }
        .fpl-tbl { border-collapse:collapse; width:100%; min-width:${isMobile ? "900px" : "1400px"}; }
        .fpl-tbl th {
          background:#040408; color:rgba(0,255,240,.4); font-size:11px; font-weight:800;
          padding:8px 10px; border-bottom:1px solid rgba(255,255,255,0.07);
          position:sticky; top:0; z-index:2; white-space:nowrap; letter-spacing:0.04em;
        }
        .fpl-tbl td { padding:6px 10px; border-bottom:1px solid rgba(0,255,240,.04); font-size:12px; color:rgba(0,255,240,.7); }
        .fpl-tbl tr:hover td { background:rgba(0,255,240,0.07); }
        .fpl-tbl tbody tr { transition:transform 160ms cubic-bezier(0.22,1,0.36,1),box-shadow 160ms ease; cursor:pointer; }
        .fpl-tbl tbody tr:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(0,0,0,0.4); position:relative; z-index:1; }
        .sticky-player { position:sticky; left:0; z-index:1; background:#000; min-width:${isMobile ? "140px" : "190px"}; }
        .sticky-player-head { background:#040408 !important; z-index:3 !important; }
        .team-badge-cell { font-size:11px; font-weight:800; text-align:center; padding:4px 6px !important; }
        /* col group separators */
        .fpl-tbl th.col-sep, .fpl-tbl td.col-sep { border-left:1px solid rgba(0,255,240,0.12); }
        /* filter pills */
        .fpl-pill { padding:5px 12px; border-radius:0; font-size:10px; font-weight:500;
          cursor:pointer; border:1px solid rgba(0,255,240,.12);
          background:transparent; color:rgba(0,255,240,.35); font-family:"DM Mono",monospace; letter-spacing:.1em; font-family:inherit; white-space:nowrap; min-height:36px; transition:all 0.15s; }
        .fpl-pill.active { background:rgba(0,255,240,0.18); border-color:rgba(0,255,240,0.45); color:#67b1ff; }
        .fpl-pill:hover { background:rgba(0,255,240,.06); color:#00fff0; }
        /* tooltip */
        .fpl-tip { position:fixed; z-index:9999; pointer-events:none; background:rgba(6,13,24,0.97);
          border:1px solid rgba(0,255,240,0.3); border-radius:12px; padding:12px 16px;
          min-width:220px; box-shadow:0 8px 32px rgba(0,0,0,0.7);
          animation:fplTipIn 140ms cubic-bezier(0.22,1,0.36,1); }
        @keyframes fplTipIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        /* modal */
        .fpl-modal-bg { position:fixed; inset:0; z-index:10000; background:rgba(0,0,0,0.72);
          backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; }
        .fpl-modal { background:#08101e; border:1px solid rgba(0,255,240,0.2); border-radius:20px;
          padding:28px 28px 24px; width:min(560px,94vw); max-height:88vh; overflow-y:auto; position:relative; }
        .fpl-modal::-webkit-scrollbar{width:4px}
        .fpl-modal::-webkit-scrollbar-thumb{background:rgba(0,255,240,0.2);border-radius:4px}
      `}</style>

      <div className="page-content-wide">

        {/* ── Header ── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          flexWrap:"wrap", gap:10, marginBottom:12 }}>
          <div>
            <h1 className="page-title-left" style={{ marginBottom:2, fontSize:isMobile?20:26 }}>
              FPL Analytics Table
            </h1>
            <div style={{ fontSize:10, color:"rgba(0,255,240,.18)", fontWeight:700 }}>
              {sorted.length} players · click headers to sort · hover cells for tooltips · click rows for full analytics
            </div>
          </div>
          {isMobile && (
            <button onClick={() => setShowFilters(v => !v)} style={{
              padding:"7px 14px", borderRadius:10, fontSize:11, fontWeight:800,
              background:showFilters?"rgba(0,255,240,0.15)":"rgba(255,255,255,0.05)",
              border:"1px solid rgba(0,255,240,0.3)", color:"rgba(0,255,240,.7)", cursor:"pointer", fontFamily:"inherit",
            }}>
              {showFilters ? "▲ Filters" : "▼ Filters"}
            </button>
          )}
        </div>

        {/* ── Filters ── */}
        {(showFilters || !isMobile) && (
          <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
             padding:isMobile?"12px":"16px 20px", marginBottom:12 }}>
            {/* Position + Team pills */}
            <div style={{ display:"flex", gap:5, flexWrap:"nowrap", overflowX:"auto",
              WebkitOverflowScrolling:"touch", scrollbarWidth:"none", marginBottom:10, paddingBottom:2 }}>
              {["ALL","GK","DEF","MID","FWD"].map(p => (
                <button key={p} className={`fpl-pill${position===p?" active":""}`}
                  onClick={() => setPosition(p)}>{p}</button>
              ))}
              <div style={{ width:1, height:28, background:"rgba(255,255,255,0.08)", flexShrink:0, alignSelf:"center" }}/>
              {allTeams.slice(0, isMobile ? 8 : allTeams.length).map(t => (
                <button key={t} className={`fpl-pill${team===t?" active":""}`}
                  onClick={() => setTeam(t)}>{t}</button>
              ))}
            </div>
            {/* Inputs */}
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr 1fr auto", gap:8 }}>
              {[
                { label:"MAX COST",  val:maxCost,  set:setMaxCost,  type:"number", step:0.1 },
                { label:"START GW",  val:startGw,  set:setStartGw,  type:"number" },
                { label:"MIN PROB",  val:minProb,  set:setMinProb,  type:"number", step:0.01, min:0, max:1 },
              ].map(({ label, val, set, type, step, min, max }) => (
                <div key={label} style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:9, fontWeight:800, color:"rgba(0,255,240,.18)", letterSpacing:"0.08em" }}>{label}</label>
                  <input type={type} step={step} min={min} max={max} value={val}
                    onChange={e => set(Number(e.target.value))}
                    style={{ padding:"7px 10px", borderRadius:8, fontSize:13, background:"rgba(255,255,255,0.05)",
                      border:"1px solid rgba(255,255,255,0.1)", color:"rgba(0,255,240,.85)", outline:"none", minHeight:36 }}/>
                </div>
              ))}
              <div style={{ display:"flex", flexDirection:"column", gap:3, gridColumn:isMobile?"1/-1":"auto" }}>
                <label style={{ fontSize:9, fontWeight:800, color:"rgba(0,255,240,.18)", letterSpacing:"0.08em" }}>SEARCH</label>
                <input type="text" placeholder="Player, team, position…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ padding:"7px 10px", borderRadius:8, fontSize:14, background:"rgba(255,255,255,0.05)",
                    border:"1px solid rgba(255,255,255,0.1)", color:"rgba(0,255,240,.85)", outline:"none", minHeight:36 }}/>
              </div>
              <button onClick={() => { setTeam("ALL"); setPosition("ALL"); setMaxCost(15.5); setMinProb(0); setStartGw(30); setSearch(""); }}
                style={{ padding:"7px 14px", borderRadius:8, fontSize:11, fontWeight:800,
                  background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
                  color:"rgba(0,255,240,.35)", cursor:"pointer", fontFamily:"inherit", alignSelf:"flex-end",
                  minHeight:36, gridColumn:isMobile?"1/-1":"auto" }}>
                Clear
              </button>
            </div>
          </div>
        )}

        {/* ── Table ── */}
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)",
           overflow:"hidden" }}>
          <div className="fpl-tbl-wrap">
            <table className="fpl-tbl">
              <thead>
                <tr>
                  {/* Identity */}
                  <th className="sticky-player sticky-player-head"># &nbsp; Player</th>
                  <Th col="team">Team</Th>
                  <Th col="position">Pos</Th>
                  <Th col="cost">Cost</Th>
                  {/* Attacking profile */}
                  <Th col="form"           tip={TIPS.form}       style={{}} className="col-sep">Form</Th>
                  <Th col="threat_norm"    tip={TIPS.threat}>Threat</Th>
                  <Th col="creativity_norm"tip={TIPS.creativity}>Creativity</Th>
                  <Th col="attack"         tip={TIPS.attack}>Attack</Th>
                  <Th col="captain_score"  tip={TIPS.c_score}>Captain Score</Th>
                  {/* Fixtures */}
                  <th className="col-sep">Next Opponent</th>
                  <Th col="fixture_difficulty" tip={TIPS.fdr}>FDR</Th>
                  <Th col="fixture_run_score"  tip={TIPS.fixture_run}>Fixture Run (5)</Th>
                  {/* Availability */}
                  <Th col="minutes_security"tip={TIPS.minutes} className="col-sep">Minutes</Th>
                  <Th col="reliability"    tip={TIPS.reliability}>Reliability</Th>
                  <Th col="avail_pct"      tip={TIPS.start_pct}>Start %</Th>
                  <th title={TIPS.status}>Status</th>
                  {/* GW projections */}
                  <Th col="pts_gw_1"   tip={TIPS.gw} className="col-sep">GW{startGw}</Th>
                  <Th col="pts_gw_2"   tip={TIPS.gw}>GW{startGw+1}</Th>
                  <Th col="pts_gw_3"   tip={TIPS.gw}>GW{startGw+2}</Th>
                  <Th col="next5_points" tip={TIPS.next5}>Next 5 GWs</Th>
                  <Th col="pts_rest_season" tip={TIPS.season_total}>Season Total Pts</Th>
                  <Th col="pts_per_million" tip={TIPS.pts_per_million}>Pts per £m</Th>
                  <Th col="points_so_far"   tip={TIPS.season_pts}>Season Points So Far</Th>
                  {/* Ownership + transfers */}
                  <Th col="selected_by_pct" tip={TIPS.owned} className="col-sep">Owned %</Th>
                  <Th col="transfers_in_gw" tip={TIPS.transfers_in}>Transferred In</Th>
                  <Th col="transfers_out_gw"tip={TIPS.transfers_out}>Transferred Out</Th>
                  {/* Season stats */}
                  <Th col="goals"          tip={TIPS.goals}  className="col-sep">Goals</Th>
                  <Th col="assists"        tip={TIPS.assists}>Assists</Th>
                  <Th col="clean_sheets"   tip={TIPS.clean_sheets}>Clean Sheets</Th>
                  <Th col="bonus_per_game" tip={TIPS.bonus}>Bonus / Game</Th>
                  <Th col="xg_per90"       tip={TIPS.xg90}>xG / 90</Th>
                  <Th col="xa_per90"       tip={TIPS.xa90}>xA / 90</Th>
                  <Th col="yellow_cards"   tip={TIPS.yellow_cards}>Yellow Cards</Th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, idx) => (
                  <tr key={r.player_id} onClick={() => setModal(r)}>
                    {/* ── Identity ── */}
                    <td className="sticky-player">
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <RankBadge rank={idx+1}/>
                        <img src={TEAM_BADGES[r.team]} alt={r.team}
                          style={{ width:16, height:16, objectFit:"contain", flexShrink:0 }}
                          onError={e => { e.currentTarget.style.display="none"; }}/>
                        <span style={{ fontWeight:700, fontSize:isMobile?12:13, color:"rgba(0,255,240,.9)",
                          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:isMobile?90:150 }}>
                          {r.player_display}
                        </span>
                      </div>
                    </td>
                    <td className="team-badge-cell"
                      style={{ background:TEAM_COLORS[r.team]||"#222", color:getTeamTextColor(r.team) }}>
                      {r.team}
                    </td>
                    <td style={{ fontWeight:700, color:"#8ab8e0", fontSize:11, letterSpacing:"0.06em" }}>{r.position}</td>
                    <td style={{ fontWeight:700 }}>£{r.cost}m</td>

                    {/* ── Attacking profile ── */}
                    <HeatCell value={r.form}            min={ranges.form.min}            max={ranges.form.max}            tip={TIPS.form}       className="col-sep"/>
                    <HeatCell value={r.threat_norm}     min={ranges.threat_norm.min}     max={ranges.threat_norm.max}     tip={TIPS.threat}
                      onMouseEnter={e => setTooltip({ key:"threat",      x:e.clientX+12, y:e.clientY-8 })}
                      onMouseLeave={() => setTooltip(null)}/>
                    <HeatCell value={r.creativity_norm} min={ranges.creativity_norm.min} max={ranges.creativity_norm.max} tip={TIPS.creativity}
                      onMouseEnter={e => setTooltip({ key:"creativity",  x:e.clientX+12, y:e.clientY-8 })}
                      onMouseLeave={() => setTooltip(null)}/>
                    <HeatCell value={r.attack}          min={ranges.attack.min}          max={ranges.attack.max}          tip={TIPS.attack}
                      onMouseEnter={e => setTooltip({ key:"attack",      x:e.clientX+12, y:e.clientY-8 })}
                      onMouseLeave={() => setTooltip(null)}/>
                    <HeatCell value={r.captain_score}   min={ranges.captain_score.min}   max={ranges.captain_score.max}   tip={TIPS.c_score}/>

                    {/* ── Fixtures ── */}
                    <td className="col-sep" style={{ whiteSpace:"nowrap", fontSize:11 }}>
                      {r.next_opp}<DiffPill label={r.fixture_label}/>
                    </td>
                    <HeatCell value={r.fixture_difficulty}  min={ranges.fixture_difficulty.min}  max={ranges.fixture_difficulty.max}  tip={TIPS.fdr}/>
                    <HeatCell value={r.fixture_run_score}   min={ranges.fixture_run_score.min}   max={ranges.fixture_run_score.max}   tip={TIPS.fixture_run}/>

                    {/* ── Availability ── */}
                    <HeatCell value={r.minutes_security} min={ranges.minutes_security.min} max={ranges.minutes_security.max}
                      tip={TIPS.minutes} display={`${r.minutes_security}`} className="col-sep"/>
                    <HeatCell value={r.reliability}      min={ranges.reliability.min}      max={ranges.reliability.max}      tip={TIPS.reliability}/>
                    <HeatCell value={r.avail_pct}        min={0}                           max={100}                         tip={TIPS.start_pct}
                      display={`${r.avail_pct}%`}/>
                    <td title={r.avail_display} style={{ fontSize:11, color:r.avail_color, whiteSpace:"nowrap", fontWeight:600 }}>
                      {r.avail_display}
                    </td>

                    {/* ── GW projections ── */}
                    <HeatCell value={r.pts_gw_1} min={ranges.pts_gw_1.min} max={ranges.pts_gw_1.max} tip={TIPS.gw} className="col-sep"/>
                    <HeatCell value={r.pts_gw_2} min={ranges.pts_gw_2.min} max={ranges.pts_gw_2.max} tip={TIPS.gw}/>
                    <HeatCell value={r.pts_gw_3} min={ranges.pts_gw_3.min} max={ranges.pts_gw_3.max} tip={TIPS.gw}/>
                    <HeatCell value={r.next5_points}    min={ranges.next5_points.min}    max={ranges.next5_points.max}    tip={TIPS.next5}/>
                    <HeatCell value={r.pts_rest_season} min={ranges.pts_rest_season.min} max={ranges.pts_rest_season.max} tip={TIPS.season_total}/>
                    <HeatCell value={r.pts_per_million} min={ranges.pts_per_million.min} max={ranges.pts_per_million.max} tip={TIPS.pts_per_million}/>
                    <HeatCell value={r.points_so_far}   min={ranges.points_so_far.min}   max={ranges.points_so_far.max}   tip={TIPS.season_pts}/>

                    {/* ── Ownership + transfers ── */}
                    <HeatCell value={r.selected_by_pct}  min={ranges.selected_by_pct.min}  max={ranges.selected_by_pct.max}
                      display={`${Number(r.selected_by_pct).toFixed(1)}%`} tip={TIPS.owned} className="col-sep"/>
                    <HeatCell value={r.transfers_in_gw}  min={ranges.transfers_in_gw.min}  max={ranges.transfers_in_gw.max}
                      display={r.transfers_in_gw.toLocaleString()} tip={TIPS.transfers_in}/>
                    <HeatCell value={r.transfers_out_gw} min={0} max={ranges.transfers_out_gw.max}
                      display={r.transfers_out_gw.toLocaleString()} tip={TIPS.transfers_out}/>

                    {/* ── Season stats ── */}
                    <HeatCell value={r.goals}         min={ranges.goals.min}         max={ranges.goals.max}         tip={TIPS.goals}        className="col-sep"/>
                    <HeatCell value={r.assists}       min={ranges.assists.min}       max={ranges.assists.max}       tip={TIPS.assists}/>
                    <HeatCell value={r.clean_sheets}  min={ranges.clean_sheets.min}  max={ranges.clean_sheets.max}  tip={TIPS.clean_sheets}/>
                    <HeatCell value={r.bonus_per_game}min={ranges.bonus_per_game.min}max={ranges.bonus_per_game.max}tip={TIPS.bonus}
                      display={r.bonus_per_game.toFixed(2)}/>
                    <HeatCell value={r.xg_per90}      min={ranges.xg_per90.min}      max={ranges.xg_per90.max}      tip={TIPS.xg90}
                      display={r.xg_per90.toFixed(2)}/>
                    <HeatCell value={r.xa_per90}      min={ranges.xa_per90.min}      max={ranges.xa_per90.max}      tip={TIPS.xa90}
                      display={r.xa_per90.toFixed(2)}/>
                    <HeatCell value={r.yellow_cards}  min={0}                        max={Math.max(ranges.yellow_cards.max,1)}
                      tip={TIPS.yellow_cards}/>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    {/* ── Tooltip ── */}
    {tooltip && (
      <div className="fpl-tip" style={{ left:tooltip.x, top:tooltip.y }}>
        <div style={{ fontSize:9, fontWeight:800, color:"rgba(0,255,240,.35)", letterSpacing:"0.1em", marginBottom:6, textTransform:"uppercase" }}>
          {tooltip.key.replace(/_/g," ")}
        </div>
        <div style={{ fontSize:12, color:"rgba(0,255,240,.8)", lineHeight:1.65 }}>
          {TIPS[tooltip.key] || ""}
        </div>
      </div>
    )}

    {/* ── Player Modal ── */}
    {modal && (
      <div className="fpl-modal-bg" onClick={() => setModal(null)}>
        <div className="fpl-modal" onClick={e => e.stopPropagation()}>
          <button onClick={() => setModal(null)} style={{
            position:"absolute", top:16, right:16, width:32, height:32, borderRadius:8,
            background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
            color:"#8ab8e0", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center",
          }}>×</button>

          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
            <div style={{ width:52, height:52, borderRadius:"50%", overflow:"hidden",
              border:`2px solid ${modal._posColor}33`, background:"rgba(255,255,255,0.05)", flexShrink:0 }}>
              <img src={`https://resources.premierleague.com/premierleague/photos/players/110x140/p${modal.code||0}.png`}
                alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}
                onError={e => { e.target.style.display="none"; }}/>
            </div>
            <div>
              <div style={{ fontSize:18, fontWeight:900, color:"rgba(0,255,240,.9)", fontFamily:"'Sora',sans-serif", marginBottom:2 }}>
                {modal.player}
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ fontSize:10, fontWeight:800, color:"rgba(0,255,240,.35)" }}>{modal.team}</span>
                <span style={{ fontSize:10, fontWeight:700, padding:"1px 7px", 
                  background:`${modal._posColor}18`, border:`1px solid ${modal._posColor}33`, color:modal._posColor }}>
                  {modal.position}
                </span>
                <span style={{ fontSize:10, color:"#3a5a7a", fontFamily:"DM Mono,monospace" }}>£{modal.cost}m</span>
              </div>
            </div>
          </div>

          {/* Availability status */}
          <div style={{ marginBottom:16, padding:"8px 12px", borderRadius:8,
            background:`${modal.avail_color}14`, border:`1px solid ${modal.avail_color}33` }}>
            <span style={{ fontSize:12, fontWeight:700, color:modal.avail_color }}>{modal.avail_display}</span>
            {modal.news && <span style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginLeft:8 }}>{modal.news}</span>}
          </div>

          {/* Key metrics grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
            {[
              { label:"Next GW",       val:(modal.pts_gw_1||0).toFixed(1),      color:"rgba(0,255,240,.7)" },
              { label:"Next 5 GWs",    val:(modal.next5_points||0).toFixed(1),  color:"#9ff1b4" },
              { label:"Form",          val:(modal.form||0).toFixed(1),           color:"#f2c94c" },
              { label:"Captain Score", val:(modal.captain_score||0).toFixed(1), color:"#ffa94d" },
              { label:"Start %",       val:`${modal.avail_pct}%`,               color:modal.avail_color },
              { label:"Owned",         val:`${Number(modal.selected_by_pct||0).toFixed(1)}%`, color:"#b388ff" },
            ].map(m => (
              <div key={m.label} style={{ padding:"10px 12px", borderRadius:10,
                background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize:8, fontWeight:800, color:"rgba(0,255,240,.18)", letterSpacing:"0.1em", marginBottom:4, textTransform:"uppercase" }}>
                  {m.label}
                </div>
                <div style={{ fontSize:20, fontWeight:800, color:m.color, fontFamily:"DM Mono,monospace", lineHeight:1 }}>
                  {m.val}
                </div>
              </div>
            ))}
          </div>

          {/* Season stats */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:16 }}>
            {[
              { label:"Goals",    val:modal.goals },
              { label:"Assists",  val:modal.assists },
              { label:"CS",       val:modal.clean_sheets },
              { label:"Bonus/G",  val:modal.bonus_per_game?.toFixed(2) },
              { label:"xG/90",    val:modal.xg_per90?.toFixed(2) },
              { label:"xA/90",    val:modal.xa_per90?.toFixed(2) },
              { label:"Yellows",  val:modal.yellow_cards },
              { label:"Season Pts",val:modal.points_so_far },
            ].map(m => (
              <div key={m.label} style={{ padding:"8px 10px", borderRadius:8,
                background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", textAlign:"center" }}>
                <div style={{ fontSize:8, fontWeight:700, color:"rgba(0,255,240,.18)", marginBottom:3, textTransform:"uppercase" }}>{m.label}</div>
                <div style={{ fontSize:15, fontWeight:800, color:"rgba(0,255,240,.8)", fontFamily:"DM Mono,monospace" }}>{m.val ?? "—"}</div>
              </div>
            ))}
          </div>

          {/* Action */}
          <button onClick={() => { setModal(null); navigate(`/player/${modal.player_id}`); }}
            style={{ width:"100%", padding:"10px 16px", borderRadius:10,
              background:"rgba(0,255,240,0.15)", border:"1px solid rgba(0,255,240,0.35)",
              color:"rgba(0,255,240,.7)", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            Full Player Analysis →
          </button>
        </div>
      </div>
    )}
    </>
  );
}