import { useEffect, useMemo, useState, useCallback } from "react";
import { getFplPredictorTable } from "../api/api";

/* ─────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────── */
const TEAM_COLORS = {
  ARS: "#ef0107", AVL: "#95bfe5", BOU: "#da291c", BRE: "#e30613",
  BHA: "#0057b8", BUR: "#6c1d45", CHE: "#034694", CRY: "#1b458f",
  EVE: "#003399", FUL: "#ffffff", LIV: "#c8102e", MCI: "#6cabdd",
  MUN: "#da291c", NEW: "#241f20", NFO: "#dd0000", SUN: "#eb172b",
  TOT: "#132257", WHU: "#7a263a", WOL: "#fdb913",
};

const TEAM_BADGES = {
  ARS: "https://resources.premierleague.com/premierleague/badges/50/t3.png",
  AVL: "https://resources.premierleague.com/premierleague/badges/50/t7.png",
  BOU: "https://resources.premierleague.com/premierleague/badges/50/t91.png",
  BRE: "https://resources.premierleague.com/premierleague/badges/50/t94.png",
  BHA: "https://resources.premierleague.com/premierleague/badges/50/t36.png",
  BUR: "https://resources.premierleague.com/premierleague/badges/50/t90.png",
  CHE: "https://resources.premierleague.com/premierleague/badges/50/t8.png",
  CRY: "https://resources.premierleague.com/premierleague/badges/50/t31.png",
  EVE: "https://resources.premierleague.com/premierleague/badges/50/t11.png",
  FUL: "https://resources.premierleague.com/premierleague/badges/50/t54.png",
  LIV: "https://resources.premierleague.com/premierleague/badges/50/t14.png",
  MCI: "https://resources.premierleague.com/premierleague/badges/50/t43.png",
  MUN: "https://resources.premierleague.com/premierleague/badges/50/t1.png",
  NEW: "https://resources.premierleague.com/premierleague/badges/50/t4.png",
  NFO: "https://resources.premierleague.com/premierleague/badges/50/t17.png",
  SUN: "https://resources.premierleague.com/premierleague/badges/50/t56.png",
  TOT: "https://resources.premierleague.com/premierleague/badges/50/t6.png",
  WHU: "https://resources.premierleague.com/premierleague/badges/50/t21.png",
  WOL: "https://resources.premierleague.com/premierleague/badges/50/t39.png",
};

const METRIC_TOOLTIPS = {
  merit: "Overall player ranking based on form, projections, and attacking profile.",
  form: "Recent FPL output trend.",
  goal_threat: "How much goal-scoring threat the player is showing in the current projection model.",
  chance_creation: "How much chance creation and assist potential the player is showing.",
  attack_involvement: "Combined attacking involvement from Goal Threat and Chance Creation.",
  captain_score: "Captain suitability score based on projected points, attacking involvement, and reliability.",
  fixture_difficulty: "How difficult the next fixture is expected to be.",
  fixture_run_score: "How strong the player's next run of fixtures looks across the next few gameweeks.",
  safe_pick_score: "How reliable the player looks based on minutes, availability, form, and short-term projection stability.",
  ppc: "Projected points relative to player cost.",
  next5: "Expected total points across the next 5 gameweeks.",
  prob_appear: "Probability that the player appears in the next round.",
  availability_status: "Combined official availability information and injury news.",
  minutes_security: "Estimate of how secure the player's minutes are for the next round.",
  transfer_momentum: "Net transfer movement this gameweek. Positive means more managers are buying than selling.",
};

/* ─────────────────────────────────────────────────────────────────
   TABLE MODES
───────────────────────────────────────────────────────────────── */
const TABLE_MODES = [
  { id: "overall",      label: "Overall",      icon: "⬡", sortKey: "next5_points",    desc: "Best all-round players ranked by projected points" },
  { id: "captaincy",   label: "Captaincy",    icon: "©", sortKey: "captain_score",   desc: "Best captaincy options based on ceiling & fixture" },
  { id: "transfers",   label: "Transfers",    icon: "⇄", sortKey: "transfer_momentum", desc: "Hottest transfer targets and players being sold" },
  { id: "differentials", label: "Differentials", icon: "◈", sortKey: "captain_score", desc: "High-value low-ownership picks (< 15% owned)" },
  { id: "budget",      label: "Budget Picks", icon: "£", sortKey: "points_per_cost",  desc: "Best value players under £7.0m" },
];

const MODE_HIGHLIGHT = {
  overall:      ["merit", "form", "next5_points"],
  captaincy:    ["captain_score", "attack_involvement", "pts_gw_1"],
  transfers:    ["transfer_momentum", "safe_pick_score", "form"],
  differentials:["captain_score", "merit", "attack_involvement"],
  budget:       ["points_per_cost", "next5_points", "safe_pick_score"],
};

/* ─────────────────────────────────────────────────────────────────
   COLUMN GROUPS
───────────────────────────────────────────────────────────────── */
const COL_GROUPS = [
  { label: "Player Info",        cols: ["position", "cost"],                                          color: "rgba(100,149,237,0.12)" },
  { label: "Performance",        cols: ["merit", "form", "captain_score"],                            color: "rgba(255,165,0,0.08)"   },
  { label: "Underlying Stats",   cols: ["goal_threat", "chance_creation", "attack_involvement"],      color: "rgba(144,238,144,0.08)" },
  { label: "Fixture",            cols: ["next_opp_col", "fixture_difficulty"],                        color: "rgba(147,112,219,0.08)" },
  { label: "Projections",        cols: ["pts_gw_1", "pts_gw_2", "pts_gw_4", "next5_points", "pts_rest_season"], color: "rgba(64,224,208,0.07)" },
  { label: "Value & Ownership",  cols: ["points_per_cost", "value_rest_season", "points_so_far", "selected_by_pct", "transfer_momentum"], color: "rgba(255,100,100,0.07)" },
  { label: "Reliability",        cols: ["minutes_security", "fixture_run_score", "safe_pick_score", "prob_appear", "availability_status"], color: "rgba(200,160,255,0.07)" },
];

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */
function clamp(num, min, max) { return Math.max(min, Math.min(max, num)); }

// Softer heatmap — reduced saturation/intensity
function getGradientColor(value, minValue, maxValue) {
  const num = Number(value);
  if (Number.isNaN(num) || maxValue <= minValue) return "transparent";
  const ratio = clamp((num - minValue) / (maxValue - minValue), 0, 1);
  if (ratio <= 0.2)  return "rgba(120,30,35,0.55)";
  if (ratio <= 0.4)  return "rgba(160,60,40,0.55)";
  if (ratio <= 0.6)  return "rgba(180,120,30,0.50)";
  if (ratio <= 0.75) return "rgba(160,170,40,0.50)";
  if (ratio <= 0.9)  return "rgba(80,170,90,0.55)";
  return "rgba(20,160,80,0.60)";
}

function getTextColor(bg) {
  if (!bg || bg === "transparent") return "#c0cfe0";
  return "#f0f6ff";
}

function formatPlayerName(name) {
  if (!name) return "-";
  const clean = String(name).replace(/\s+/g, " ").trim();
  const parts = clean.split(" ").filter(Boolean);
  if (parts.length <= 2) return clean;
  const lowerParts = parts.map(p => p.toLowerCase());
  const connectors = ["van", "von", "de", "da", "del", "di", "la", "le"];
  const secondLast = lowerParts[parts.length - 2];
  if (connectors.includes(secondLast)) return `${parts[parts.length - 2]} ${parts[parts.length - 1]}`;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function getTeamTextColor(team) {
  return ["FUL", "WOL", "AVL", "MCI"].includes(team) ? "#050505" : "#ffffff";
}

function extractInjuryNote(row) {
  const candidates = [row?.news, row?.status_text, row?.injury_note, row?.injury, row?.availability_note];
  const note = candidates.find(item =>
    typeof item === "string" && item.trim() &&
    !["none", "available", "fit"].includes(item.trim().toLowerCase())
  );
  return note ? note.trim() : "";
}

function formatAvailabilityStatus(row) {
  const availabilityPct    = Number(row?.availability_pct);
  const officialChance     = Number(row?.official_chance);
  const officialAvailability = String(row?.official_availability || "").trim();
  const note = extractInjuryNote(row);
  if (!Number.isNaN(officialChance)) {
    if (officialChance >= 100 && !note) return "100%";
    return note ? `${officialChance}% · ${note}` : `${officialChance}%`;
  }
  if (!Number.isNaN(availabilityPct)) {
    if (availabilityPct >= 100 && !note) return "100%";
    return note ? `${availabilityPct}% · ${note}` : `${availabilityPct}%`;
  }
  if (officialAvailability) {
    const lower = officialAvailability.toLowerCase();
    if (lower === "available" && !note) return "100%";
    return note ? `${officialAvailability} · ${note}` : officialAvailability;
  }
  return note || "-";
}

function formatSignedNumber(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "-";
  if (n > 0) return `+${n.toLocaleString()}`;
  return n.toLocaleString();
}

function getScoreLabel(score) {
  if (score >= 80) return "High";
  if (score >= 60) return "Good";
  if (score >= 40) return "Med";
  return "Low";
}

function getDifficultyLabel(score) {
  if (score >= 0.72) return "Easy";
  if (score >= 0.45) return "Med";
  return "Hard";
}

function getFixtureDifficultyNumber(score) {
  const label = getDifficultyLabel(score);
  if (label === "Easy") return 2;
  if (label === "Med")  return 3;
  return 5;
}

/* ─────────────────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────────────────── */

function HeatCell({ value, minValue, maxValue, title, displayValue, highlighted }) {
  const bg = getGradientColor(Number(value), minValue, maxValue);
  return (
    <td title={title} style={{
      background: bg,
      color: getTextColor(bg),
      fontWeight: 600,
      fontSize: 13,
      outline: highlighted ? "2px solid rgba(103,177,255,0.6)" : "none",
      outlineOffset: -2,
      transition: "background 0.2s",
    }}>
      {displayValue ?? value}
    </td>
  );
}

function NextOppCell({ row }) {
  const opp = row.next_opp || "-";
  const isHome = String(row.is_home || row.home_away || "").toLowerCase() === "home" ||
                 String(row.next_opp || "").includes("(H)");
  const haScore = isHome ? "(H)" : "(A)";
  const fdr = row.fixture_difficulty || 3;
  const xg = Number(row.pts_gw_1 || 0) > 0
    ? Number(((Number(row.pts_gw_1) - 2) * 0.4).toFixed(1))
    : null;

  const fdrColor = fdr <= 2 ? "#3db86c" : fdr <= 3 ? "#d4aa30" : "#d14040";

  return (
    <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>
      <span style={{ fontWeight: 700, color: "#f0f6ff" }}>{opp}</span>
      {" "}
      <span style={{
        color: isHome ? "#67d5b5" : "#a0b8d8",
        fontWeight: 600,
      }}>{haScore}</span>
      <span style={{ color: "#4a6a8a", margin: "0 4px" }}>·</span>
      <span style={{ color: fdrColor, fontWeight: 700 }}>FDR {fdr}</span>
      {xg !== null && (
        <>
          <span style={{ color: "#4a6a8a", margin: "0 4px" }}>·</span>
          <span style={{ color: "#a0c4e8" }}>xG {xg}</span>
        </>
      )}
    </td>
  );
}

function DifficultyPill({ label }) {
  const colors = {
    Easy: { bg: "rgba(31,125,61,0.35)", fg: "#6dffaa", border: "rgba(31,125,61,0.6)" },
    Med:  { bg: "rgba(168,125,27,0.35)", fg: "#ffd96a", border: "rgba(168,125,27,0.6)" },
    Hard: { bg: "rgba(143,36,36,0.35)", fg: "#ff9090", border: "rgba(143,36,36,0.6)" },
  };
  const c = colors[label] || { bg: "#2d2d2d", fg: "#fff", border: "#555" };
  return (
    <span style={{
      display: "inline-block", padding: "2px 7px",
      borderRadius: 999, background: c.bg, color: c.fg,
      fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
      border: `1px solid ${c.border}`,
    }}>
      {label}
    </span>
  );
}

function SortArrow({ active, dir }) {
  if (!active) return <span style={{ opacity: 0.2, marginLeft: 4, fontSize: 10 }}>↕</span>;
  return (
    <span style={{ marginLeft: 4, fontSize: 10, color: "#67b1ff", filter: "drop-shadow(0 0 4px rgba(103,177,255,0.6))" }}>
      {dir === "asc" ? "↑" : "↓"}
    </span>
  );
}

function RankBadge({ rank }) {
  const gold   = rank === 1;
  const silver = rank === 2;
  const bronze = rank === 3;
  const bg = gold ? "#c8972a" : silver ? "#8a9aaa" : bronze ? "#9b6840" : "rgba(255,255,255,0.06)";
  const fg = gold || silver || bronze ? "#fff" : "#5a7a9a";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 22, height: 22, borderRadius: 5,
      background: bg, color: fg,
      fontSize: 10, fontWeight: 800, flexShrink: 0,
      boxShadow: gold ? "0 0 8px rgba(200,151,42,0.5)" : "none",
    }}>
      {rank}
    </span>
  );
}

/* ── Expanded row panel ── */
function ExpandedRow({ row, startGw, colSpan }) {
  const pts = [
    { gw: startGw,     val: Number(row.pts_gw_1 || 0) },
    { gw: startGw + 1, val: Number(row.pts_gw_2 || 0) },
    { gw: startGw + 2, val: Number(row.pts_gw_3 || 0) },
  ];
  const maxPts = Math.max(...pts.map(p => p.val), 0.1);

  const formArr = row._formArr || [];
  const formMax = Math.max(...formArr.map(Number).filter(n => !isNaN(n)), 0.1);

  const captainLabel = row.captain_score >= 70 ? "⭐ Strong captain option"
    : row.captain_score >= 50 ? "✓ Viable captain"
    : "— Not recommended";

  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: 0, background: "rgba(10,20,40,0.95)", borderBottom: "1px solid rgba(103,177,255,0.15)" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 0, padding: "16px 20px",
        }}>

          {/* Projected pts next 3 GWs */}
          <div style={expandSection}>
            <div style={expandLabel}>Projected Pts · Next 3 GWs</div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginTop: 8 }}>
              {pts.map(p => (
                <div key={p.gw} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{
                    width: 32, height: Math.max(8, (p.val / formMax) * 50),
                    background: `rgba(103,177,255,${0.3 + (p.val / maxPts) * 0.6})`,
                    borderRadius: 3, transition: "height 0.3s",
                  }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#f0f6ff" }}>{p.val.toFixed(1)}</span>
                  <span style={{ fontSize: 10, color: "#4a6a8a" }}>GW{p.gw}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Form trend */}
          <div style={expandSection}>
            <div style={expandLabel}>Form Trend</div>
            {formArr.length > 0 ? (
              <div style={{ display: "flex", gap: 4, alignItems: "flex-end", marginTop: 8 }}>
                {formArr.map((v, i) => {
                  const n = Number(v);
                  return (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                      <div style={{
                        width: 18, height: Math.max(4, (n / formMax) * 44),
                        background: n >= 8 ? "#3db86c" : n >= 4 ? "#d4aa30" : "#d14040",
                        borderRadius: 2,
                      }} />
                      <span style={{ fontSize: 9, color: "#4a6a8a" }}>{n}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ marginTop: 10, fontSize: 12, color: "#4a6a8a" }}>
                Form: <span style={{ color: "#f0f6ff", fontWeight: 700 }}>{Number(row.form || 0).toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Fixture run */}
          <div style={expandSection}>
            <div style={expandLabel}>Fixture Run</div>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
              {pts.map(p => (
                <div key={p.gw} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, color: "#4a6a8a", width: 28 }}>GW{p.gw}</span>
                  <div style={{
                    flex: 1, height: 6,
                    background: `rgba(103,177,255,${0.15 + (p.val / maxPts) * 0.55})`,
                    borderRadius: 3,
                  }} />
                  <span style={{ fontSize: 11, color: "#a0b8d8" }}>{p.val.toFixed(1)}</span>
                </div>
              ))}
              <div style={{ marginTop: 4 }}>
                <DifficultyPill label={row.fixture_label} />
                <span style={{ fontSize: 11, color: "#4a6a8a", marginLeft: 6 }}>
                  Run score: <span style={{ color: "#f0f6ff", fontWeight: 700 }}>{row.fixture_run_score}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Captain suitability */}
          <div style={expandSection}>
            <div style={expandLabel}>Captain Suitability</div>
            <div style={{ marginTop: 8 }}>
              <div style={{
                fontSize: 13, fontWeight: 700,
                color: row.captain_score >= 70 ? "#3db86c" : row.captain_score >= 50 ? "#d4aa30" : "#8a9aaa",
                marginBottom: 6,
              }}>
                {captainLabel}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${Math.min(row.captain_score, 100)}%`,
                    background: "linear-gradient(90deg, #2563eb, #67b1ff)",
                    borderRadius: 3, transition: "width 0.4s",
                  }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#f0f6ff" }}>
                  {Number(row.captain_score || 0).toFixed(0)}
                </span>
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: "#4a6a8a" }}>
                Ownership: <span style={{ color: "#a0b8d8" }}>{Number(row.selected_by_pct || 0).toFixed(1)}%</span>
                <span style={{ margin: "0 6px" }}>·</span>
                Prob: <span style={{ color: "#a0b8d8" }}>{Number(row.prob_appear || 0).toFixed(0)}%</span>
              </div>
            </div>
          </div>

        </div>
      </td>
    </tr>
  );
}

const expandSection = {
  padding: "0 16px",
  borderRight: "1px solid rgba(103,177,255,0.08)",
};
const expandLabel = {
  fontSize: 10,
  fontWeight: 700,
  color: "#4a6a8a",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

/* ─────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────── */
export default function FplTablePage() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);

  const [team, setTeam]         = useState("ALL");
  const [position, setPosition] = useState("ALL");
  const [maxCost, setMaxCost]   = useState(15.5);
  const [minProb, setMinProb]   = useState(0);
  const [startGw, setStartGw]   = useState(30);
  const [search, setSearch]     = useState("");

  const [tableMode, setTableMode] = useState("overall");
  const [sortKey, setSortKey]     = useState("next5_points");
  const [sortOrder, setSortOrder] = useState("desc");
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Apply mode: update sort key
  const applyMode = useCallback((modeId) => {
    setTableMode(modeId);
    const mode = TABLE_MODES.find(m => m.id === modeId);
    if (mode) { setSortKey(mode.sortKey); setSortOrder("desc"); }
    setExpandedRows(new Set());
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const tableData = await getFplPredictorTable({ start_gw: startGw, max_cost: maxCost, min_prob: minProb, team, position });
        if (cancelled) return;
        setRows(tableData.rows || []);
        setLoading(false);
      } catch (err) {
        console.error(err);
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [team, position, maxCost, minProb, startGw]);

  const enrichedRows = useMemo(() => rows.map(r => {
    const creativity = Number(r.creativity || 0);
    const threat     = Number(r.threat || 0);
    const influence  = Number(r.influence || 0);
    const ict        = Number(r.ict_index || 0);
    const form       = Number(r.form || 0);
    const ppc        = Number(r.value_rest_season || 0);

    const ptsGw1 = Number(r.pts_gw_1 || 0);
    const ptsGw2 = Number(r.pts_gw_2 || 0);
    const ptsGw3 = Number(r.pts_gw_3 || 0);
    const ptsGw4 = Number(r.pts_gw_4 || 0);
    const ptsGw5 = Number(r.pts_gw_5 || 0);
    const next5  = ptsGw1 + ptsGw2 + ptsGw3 + ptsGw4 + ptsGw5;

    const goalThreat        = Number((threat / 55 + ict / 24).toFixed(2));
    const chanceCreation    = Number((creativity / 70 + influence / 180).toFixed(2));
    const attackInvolvement = Number((goalThreat + chanceCreation).toFixed(2));

    const appearance       = Number(r.prob_appear || 0);
    const officialChance   = Number(r.official_chance);
    const availabilityPct  = Number(r.availability_pct);

    const captainScore = Number((ptsGw1 * 0.58 + attackInvolvement * 1.2 + appearance * 2.4 + ppc * 0.42).toFixed(2));

    const fixtureEaseScore = clamp(ptsGw1 / 8.5, 0, 1);
    const fixtureLabel     = getDifficultyLabel(fixtureEaseScore);
    const fixtureDifficulty = getFixtureDifficultyNumber(fixtureEaseScore);
    const ownership        = Number(r.selected_by_pct || 0);
    const injuryPenalty    = extractInjuryNote(r) ? 12 : 0;
    const availabilityRef  = !Number.isNaN(officialChance) ? officialChance
      : !Number.isNaN(availabilityPct) ? availabilityPct : appearance * 100;

    const minutesSecurity = Number(clamp(
      appearance * 65 + (availabilityRef / 100) * 30 + clamp(form / 8, 0, 1) * 5 - injuryPenalty, 0, 100
    ).toFixed(1));

    const fixtureRunScore = Number(clamp((next5 / 35) * 100, 0, 100).toFixed(1));
    const safePickScore   = Number(clamp(
      minutesSecurity * 0.45 + clamp(availabilityRef, 0, 100) * 0.2 +
      clamp((next5 / 30) * 100, 0, 100) * 0.2 + clamp((form / 8) * 100, 0, 100) * 0.15, 0, 100
    ).toFixed(1));

    const transferMomentum = Number((Number(r.transfers_in_gw || 0) - Number(r.transfers_out_gw || 0)).toFixed(0));

    // Build a mini form array from available gw data
    const _formArr = [ptsGw1, ptsGw2, ptsGw3, ptsGw4, ptsGw5].filter(v => v > 0);

    return {
      ...r,
      player_display: formatPlayerName(r.player),
      goal_threat: goalThreat, chance_creation: chanceCreation, attack_involvement: attackInvolvement,
      ownership_pct: ownership, fixture_ease_score: Number(fixtureEaseScore.toFixed(2)),
      fixture_difficulty: fixtureDifficulty, fixture_label: fixtureLabel,
      points_per_cost: Number(ppc.toFixed(2)), next5_points: Number(next5.toFixed(1)),
      captain_score: captainScore, availability_status: formatAvailabilityStatus(r),
      minutes_security: minutesSecurity, fixture_run_score: fixtureRunScore,
      safe_pick_score: safePickScore, transfer_momentum: transferMomentum,
      _formArr,
    };
  }), [rows]);

  const teams = useMemo(() => {
    const unique = Array.from(new Set(enrichedRows.map(r => r.team))).sort();
    return ["ALL", ...unique];
  }, [enrichedRows]);

  function handleSort(key) {
    if (sortKey === key) setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortOrder("desc"); }
  }

  const filteredRows = useMemo(() => {
    let result = enrichedRows;

    // Mode-specific filtering
    if (tableMode === "differentials") result = result.filter(r => Number(r.selected_by_pct || 0) < 15);
    if (tableMode === "budget") result = result.filter(r => Number(r.cost || 99) < 7.0);

    const q = search.trim().toLowerCase();
    if (q) result = result.filter(r =>
      String(r.player || "").toLowerCase().includes(q) ||
      String(r.player_display || "").toLowerCase().includes(q) ||
      String(r.team || "").toLowerCase().includes(q) ||
      String(r.position || "").toLowerCase().includes(q)
    );
    return result;
  }, [enrichedRows, search, tableMode]);

  const sortedRows = useMemo(() => {
    const copy = [...filteredRows];
    if (!sortKey) return copy;
    copy.sort((a, b) => {
      const n1 = Number(a?.[sortKey]), n2 = Number(b?.[sortKey]);
      if (!Number.isNaN(n1) && !Number.isNaN(n2)) return sortOrder === "asc" ? n1 - n2 : n2 - n1;
      const s1 = String(a?.[sortKey] ?? "").toLowerCase();
      const s2 = String(b?.[sortKey] ?? "").toLowerCase();
      if (s1 < s2) return sortOrder === "asc" ? -1 : 1;
      if (s1 > s2) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filteredRows, sortKey, sortOrder]);

  const metricRanges = useMemo(() => {
    const range = key => ({
      min: Math.min(...sortedRows.map(r => Number(r[key] || 0)), 0),
      max: Math.max(...sortedRows.map(r => Number(r[key] || 0)), 0),
    });
    return {
      merit: range("merit"), form: range("form"), prob_appear: range("prob_appear"),
      pts_gw_1: range("pts_gw_1"), pts_gw_2: range("pts_gw_2"), pts_gw_4: range("pts_gw_4"),
      pts_rest_season: range("pts_rest_season"), value_rest_season: range("value_rest_season"),
      points_so_far: range("points_so_far"), selected_by_pct: range("selected_by_pct"),
      goal_threat: range("goal_threat"), chance_creation: range("chance_creation"),
      attack_involvement: range("attack_involvement"), fixture_difficulty: range("fixture_difficulty"),
      points_per_cost: range("points_per_cost"), next5_points: range("next5_points"),
      captain_score: range("captain_score"), minutes_security: range("minutes_security"),
      fixture_run_score: range("fixture_run_score"), safe_pick_score: range("safe_pick_score"),
      transfer_momentum: range("transfer_momentum"),
    };
  }, [sortedRows]);

  const highlightedCols = MODE_HIGHLIGHT[tableMode] || [];

  const resetFilters = () => {
    setTeam("ALL"); setPosition("ALL"); setMaxCost(15.5);
    setMinProb(0); setStartGw(30); setSearch(""); applyMode("overall");
  };

  function toggleRow(id) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Total column count for expanded row colspan
  const TOTAL_COLS = 27;

  function Th({ sortable, col, children, title, style }) {
    const active = sortKey === col;
    const isHighlighted = highlightedCols.includes(col);
    return (
      <th onClick={sortable ? () => handleSort(col) : undefined} title={title}
        style={{
          cursor: sortable ? "pointer" : "default",
          color: isHighlighted ? "#67d5b5" : undefined,
          borderBottom: isHighlighted ? "2px solid rgba(103,215,181,0.5)" : undefined,
          ...style,
        }}>
        {children}
        {sortable && <SortArrow active={active} dir={sortOrder} />}
      </th>
    );
  }

  if (loading) return <div className="page-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
    <div style={{ color: "#67b1ff", fontSize: 15, fontWeight: 600 }}>Loading FPL table…</div>
  </div>;

  const currentMode = TABLE_MODES.find(m => m.id === tableMode);

  return (
    <div className="page-shell">
      <div className="page-content-wide">

        {/* ── Header ── */}
        <div className="panel-dark">
          <h1 className="page-title-left" style={{ marginBottom: 4 }}>FPL Analytics Table</h1>
          <p style={{ color: "#4a6a8a", fontSize: 13, marginBottom: 18 }}>
            A decision tool for FPL managers — sort, filter, and expand rows to analyse any player.
          </p>

          {/* ── Table Mode Selector ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#4a6a8a", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              View Mode
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {TABLE_MODES.map(m => {
                const active = tableMode === m.id;
                return (
                  <button key={m.id} onClick={() => applyMode(m.id)}
                    title={m.desc}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "7px 14px", borderRadius: 8,
                      border: active ? "1px solid rgba(103,177,255,0.5)" : "1px solid rgba(255,255,255,0.08)",
                      background: active ? "rgba(37,99,235,0.2)" : "rgba(255,255,255,0.04)",
                      color: active ? "#67b1ff" : "#5a7a9a",
                      fontSize: 13, fontWeight: active ? 700 : 500,
                      cursor: "pointer", transition: "all 0.15s",
                      boxShadow: active ? "0 0 10px rgba(103,177,255,0.15)" : "none",
                    }}>
                    <span style={{ fontSize: 14 }}>{m.icon}</span>
                    {m.label}
                  </button>
                );
              })}
            </div>
            {currentMode && (
              <p style={{ marginTop: 8, fontSize: 12, color: "#4a6a8a" }}>{currentMode.desc}</p>
            )}
          </div>

          {/* ── Filters ── */}
          <div className="filters-grid">
            <div className="filter-field">
              <label>Team</label>
              <select value={team} onChange={e => setTeam(e.target.value)}>
                {teams.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="filter-field">
              <label>Position</label>
              <select value={position} onChange={e => setPosition(e.target.value)}>
                <option value="ALL">ALL</option>
                <option value="GK">GK</option>
                <option value="DEF">DEF</option>
                <option value="MID">MID</option>
                <option value="FWD">FWD</option>
              </select>
            </div>
            <div className="filter-field">
              <label>Max Cost</label>
              <input type="number" step="0.1" value={maxCost} onChange={e => setMaxCost(Number(e.target.value))} />
            </div>
            <div className="filter-field">
              <label>Min Prob Appear</label>
              <input type="number" step="0.01" min="0" max="1" value={minProb} onChange={e => setMinProb(Number(e.target.value))} />
            </div>
            <div className="filter-field">
              <label>Start GW</label>
              <input type="number" value={startGw} onChange={e => setStartGw(Number(e.target.value))} />
            </div>
            <div className="filter-actions">
              <button className="clear-btn" onClick={resetFilters}>Clear Filters</button>
            </div>
          </div>

          {/* ── Search & count ── */}
          <div className="table-toolbar">
            <input className="search-input" type="text"
              placeholder="Search player, team, or position…"
              value={search} onChange={e => setSearch(e.target.value)} />
            <div className="mini-metric">
              <span style={{ color: "#67b1ff", fontWeight: 800 }}>{sortedRows.length}</span>
              <span style={{ color: "#4a6a8a", marginLeft: 6 }}>players</span>
              <span style={{ color: "#2a3a4a", marginLeft: 8, fontSize: 11 }}>· click any row to expand</span>
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="panel-dark" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-scroll-x">
            <table className="fpl-table">
              <thead>
                {/* Column group labels */}
                <tr style={{ borderBottom: "none" }}>
                  {/* Frozen cols: Rank+Player, Team, Pos, Cost — no group label */}
                  <th className="sticky-player sticky-player-head" rowSpan={1}
                    style={{ background: "transparent", border: "none", paddingBottom: 0 }} />
                  {COL_GROUPS.map(g => (
                    <th key={g.label} colSpan={g.cols.length}
                      style={{
                        background: g.color,
                        color: "#5a7a9a",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        textAlign: "center",
                        paddingBottom: 4,
                        paddingTop: 6,
                        borderLeft: "1px solid rgba(255,255,255,0.05)",
                        borderRight: "1px solid rgba(255,255,255,0.05)",
                      }}>
                      {g.label}
                    </th>
                  ))}
                </tr>

                {/* Column headers */}
                <tr>
                  <th className="sticky-player sticky-player-head" style={{ cursor: "default" }}>
                    #&nbsp;&nbsp;Player
                  </th>
                  <Th sortable col="position">Pos</Th>
                  <Th sortable col="cost">Cost</Th>
                  <Th sortable col="merit" title={METRIC_TOOLTIPS.merit}>Merit</Th>
                  <Th sortable col="form" title={METRIC_TOOLTIPS.form}>Form</Th>
                  <Th sortable col="captain_score" title={METRIC_TOOLTIPS.captain_score}>Cap Score</Th>
                  <Th sortable col="goal_threat" title={METRIC_TOOLTIPS.goal_threat}>Goal Threat</Th>
                  <Th sortable col="chance_creation" title={METRIC_TOOLTIPS.chance_creation}>Chance Cr.</Th>
                  <Th sortable col="attack_involvement" title={METRIC_TOOLTIPS.attack_involvement}>Atk Inv.</Th>
                  <th col="next_opp_col">Next Opp</th>
                  <Th sortable col="fixture_difficulty" title={METRIC_TOOLTIPS.fixture_difficulty}>Fix Diff</Th>
                  <Th sortable col="pts_gw_1">GW{startGw}</Th>
                  <Th sortable col="pts_gw_2">GW{startGw + 1}</Th>
                  <Th sortable col="pts_gw_4">GW{startGw + 3}</Th>
                  <Th sortable col="next5_points" title={METRIC_TOOLTIPS.next5}>Next 5</Th>
                  <Th sortable col="pts_rest_season">Pts Season</Th>
                  <Th sortable col="points_per_cost" title={METRIC_TOOLTIPS.ppc}>Pts/Cost</Th>
                  <Th sortable col="value_rest_season">Value</Th>
                  <Th sortable col="points_so_far">Pts So Far</Th>
                  <Th sortable col="selected_by_pct">Own %</Th>
                  <Th sortable col="transfer_momentum" title={METRIC_TOOLTIPS.transfer_momentum}>Transfers</Th>
                  <Th sortable col="minutes_security" title={METRIC_TOOLTIPS.minutes_security}>Mins</Th>
                  <Th sortable col="fixture_run_score" title={METRIC_TOOLTIPS.fixture_run_score}>Fix Run</Th>
                  <Th sortable col="safe_pick_score" title={METRIC_TOOLTIPS.safe_pick_score}>Safe Pick</Th>
                  <Th sortable col="prob_appear" title={METRIC_TOOLTIPS.prob_appear}>Prob</Th>
                  <th title={METRIC_TOOLTIPS.availability_status}>Availability</th>
                </tr>
              </thead>

              <tbody>
                {sortedRows.map((r, idx) => {
                  const isExpanded = expandedRows.has(r.player_id);
                  return [
                    <tr key={r.player_id} className="player-row"
                      onClick={() => toggleRow(r.player_id)}
                      style={{
                        cursor: "pointer",
                        background: isExpanded ? "rgba(37,99,235,0.08)" : undefined,
                        outline: isExpanded ? "1px solid rgba(103,177,255,0.2)" : "none",
                      }}>

                      {/* ── Frozen: Rank + Player ── */}
                      <td className="sticky-player">
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <RankBadge rank={idx + 1} />
                          <img src={TEAM_BADGES[r.team]} alt={r.team}
                            style={{ width: 18, height: 18, objectFit: "contain" }}
                            onError={e => { e.currentTarget.style.display = "none"; }} />
                          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: "#f0f6ff" }}>
                              {r.player_display}
                            </span>
                            <span style={{
                              fontSize: 10, fontWeight: 700,
                              color: TEAM_COLORS[r.team] ? "rgba(180,200,230,0.7)" : "#4a6a8a",
                            }}>
                              {r.team}
                            </span>
                          </div>
                          <span style={{ marginLeft: "auto", fontSize: 11, color: "#4a6a8a", opacity: isExpanded ? 1 : 0.4 }}>
                            {isExpanded ? "▲" : "▼"}
                          </span>
                        </div>
                      </td>

                      <td style={{ fontWeight: 700, color: "#8ab8e0", fontSize: 11, letterSpacing: "0.06em" }}>
                        {r.position}
                      </td>
                      <td style={{ fontWeight: 700, color: "#f0f6ff" }}>£{r.cost}</td>

                      <HeatCell value={r.merit} minValue={metricRanges.merit.min} maxValue={metricRanges.merit.max} title={METRIC_TOOLTIPS.merit} highlighted={highlightedCols.includes("merit")} />
                      <HeatCell value={r.form} minValue={metricRanges.form.min} maxValue={metricRanges.form.max} title={METRIC_TOOLTIPS.form} highlighted={highlightedCols.includes("form")} />
                      <HeatCell value={r.captain_score} minValue={metricRanges.captain_score.min} maxValue={metricRanges.captain_score.max} title={METRIC_TOOLTIPS.captain_score} highlighted={highlightedCols.includes("captain_score")} />
                      <HeatCell value={r.goal_threat} minValue={metricRanges.goal_threat.min} maxValue={metricRanges.goal_threat.max} title={METRIC_TOOLTIPS.goal_threat} highlighted={highlightedCols.includes("goal_threat")} />
                      <HeatCell value={r.chance_creation} minValue={metricRanges.chance_creation.min} maxValue={metricRanges.chance_creation.max} title={METRIC_TOOLTIPS.chance_creation} highlighted={highlightedCols.includes("chance_creation")} />
                      <HeatCell value={r.attack_involvement} minValue={metricRanges.attack_involvement.min} maxValue={metricRanges.attack_involvement.max} title={METRIC_TOOLTIPS.attack_involvement} highlighted={highlightedCols.includes("attack_involvement")} />

                      <NextOppCell row={r} />

                      <HeatCell value={r.fixture_difficulty} minValue={metricRanges.fixture_difficulty.min} maxValue={metricRanges.fixture_difficulty.max} title={METRIC_TOOLTIPS.fixture_difficulty} />

                      <HeatCell value={r.pts_gw_1} minValue={metricRanges.pts_gw_1.min} maxValue={metricRanges.pts_gw_1.max} title={`Projected GW${startGw} points`} highlighted={highlightedCols.includes("pts_gw_1")} />
                      <HeatCell value={r.pts_gw_2} minValue={metricRanges.pts_gw_2.min} maxValue={metricRanges.pts_gw_2.max} title={`Projected GW${startGw + 1} points`} />
                      <HeatCell value={r.pts_gw_4} minValue={metricRanges.pts_gw_4.min} maxValue={metricRanges.pts_gw_4.max} title={`Projected GW${startGw + 3} points`} />
                      <HeatCell value={r.next5_points} minValue={metricRanges.next5_points.min} maxValue={metricRanges.next5_points.max} title={METRIC_TOOLTIPS.next5} highlighted={highlightedCols.includes("next5_points")} />
                      <HeatCell value={r.pts_rest_season} minValue={metricRanges.pts_rest_season.min} maxValue={metricRanges.pts_rest_season.max} title="Projected rest of season points" />
                      <HeatCell value={r.points_per_cost} minValue={metricRanges.points_per_cost.min} maxValue={metricRanges.points_per_cost.max} title={METRIC_TOOLTIPS.ppc} highlighted={highlightedCols.includes("points_per_cost")} />
                      <HeatCell value={r.value_rest_season} minValue={metricRanges.value_rest_season.min} maxValue={metricRanges.value_rest_season.max} title="Value rating over the rest of the season" />
                      <HeatCell value={r.points_so_far} minValue={metricRanges.points_so_far.min} maxValue={metricRanges.points_so_far.max} title="Total points so far" />
                      <HeatCell value={r.selected_by_pct} minValue={metricRanges.selected_by_pct.min} maxValue={metricRanges.selected_by_pct.max} title="Ownership percentage" />
                      <HeatCell value={r.transfer_momentum} minValue={metricRanges.transfer_momentum.min} maxValue={metricRanges.transfer_momentum.max} title={METRIC_TOOLTIPS.transfer_momentum}
                        displayValue={formatSignedNumber(r.transfer_momentum)} highlighted={highlightedCols.includes("transfer_momentum")} />

                      <HeatCell value={r.minutes_security} minValue={metricRanges.minutes_security.min} maxValue={metricRanges.minutes_security.max} title={METRIC_TOOLTIPS.minutes_security}
                        displayValue={`${r.minutes_security} · ${getScoreLabel(r.minutes_security)}`} highlighted={highlightedCols.includes("minutes_security")} />
                      <HeatCell value={r.fixture_run_score} minValue={metricRanges.fixture_run_score.min} maxValue={metricRanges.fixture_run_score.max} title={METRIC_TOOLTIPS.fixture_run_score} />
                      <HeatCell value={r.safe_pick_score} minValue={metricRanges.safe_pick_score.min} maxValue={metricRanges.safe_pick_score.max} title={METRIC_TOOLTIPS.safe_pick_score} highlighted={highlightedCols.includes("safe_pick_score")} />
                      <HeatCell value={r.prob_appear} minValue={metricRanges.prob_appear.min} maxValue={metricRanges.prob_appear.max} title={METRIC_TOOLTIPS.prob_appear} />
                      <td title={extractInjuryNote(r) || undefined}
                        style={{ fontSize: 11, color: extractInjuryNote(r) ? "#ffb347" : "#8ab8e0" }}>
                        {r.availability_status}
                      </td>
                    </tr>,

                    // Expanded detail panel
                    isExpanded && (
                      <ExpandedRow key={`${r.player_id}-expanded`} row={r} startGw={startGw} colSpan={TOTAL_COLS} />
                    ),
                  ];
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}