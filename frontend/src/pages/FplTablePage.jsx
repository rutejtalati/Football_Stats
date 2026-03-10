import { useEffect, useMemo, useState } from "react";
import { getFplPredictorTable } from "../api/api";

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

function clamp(num, min, max) { return Math.max(min, Math.min(max, num)); }

function getGradientColor(value, minValue, maxValue) {
  const num = Number(value);
  if (Number.isNaN(num) || maxValue <= minValue) return "transparent";
  const ratio = clamp((num - minValue) / (maxValue - minValue), 0, 1);
  if (ratio <= 0.2)  return "#4b0f13";
  if (ratio <= 0.4)  return "#8e1b1b";
  if (ratio <= 0.6)  return "#c26519";
  if (ratio <= 0.75) return "#d8b53e";
  if (ratio <= 0.9)  return "#8ccf6d";
  return "#19b45a";
}

function getTextColor(bg) {
  return ["#d8b53e", "#8ccf6d", "#19b45a"].includes(bg) ? "#06110a" : "#ffffff";
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
  const availabilityPct   = Number(row?.availability_pct);
  const officialChance    = Number(row?.official_chance);
  const officialAvailability = String(row?.official_availability || "").trim();
  const note = extractInjuryNote(row);

  if (!Number.isNaN(officialChance)) {
    if (officialChance >= 100 && !note) return "100%";
    return note ? `${officialChance}% • ${note}` : `${officialChance}%`;
  }
  if (!Number.isNaN(availabilityPct)) {
    if (availabilityPct >= 100 && !note) return "100%";
    return note ? `${availabilityPct}% • ${note}` : `${availabilityPct}%`;
  }
  if (officialAvailability) {
    const lower = officialAvailability.toLowerCase();
    if (lower === "available" && !note) return "100%";
    return note ? `${officialAvailability} • ${note}` : officialAvailability;
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
  if (score >= 0.45) return "Medium";
  return "Hard";
}

function getFixtureDifficultyNumber(score) {
  const label = getDifficultyLabel(score);
  if (label === "Easy")   return 2;
  if (label === "Medium") return 3;
  return 5;
}

/* ── Heat cell ── */
function HeatCell({ value, minValue, maxValue, title, displayValue }) {
  const bg = getGradientColor(Number(value), minValue, maxValue);
  return (
    <td title={title} style={{
      background: bg,
      color: getTextColor(bg),
      fontWeight: 700,
      fontSize: 13,
    }}>
      {displayValue ?? value}
    </td>
  );
}

/* ── Difficulty pill ── */
function DifficultyPill({ label }) {
  const colors = {
    Easy:   { bg: "#1f7d3d", fg: "#eafff1" },
    Medium: { bg: "#a87d1b", fg: "#fff7df" },
    Hard:   { bg: "#8f2424", fg: "#fff0f0" },
  };
  const c = colors[label] || { bg: "#2d2d2d", fg: "#fff" };
  return (
    <span style={{
      display: "inline-block", marginLeft: 8, padding: "2px 8px",
      borderRadius: 999, background: c.bg, color: c.fg,
      fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
    }}>
      {label}
    </span>
  );
}

/* ── Sort arrow ── */
function SortArrow({ active, dir }) {
  if (!active) return <span style={{ opacity: 0.2, marginLeft: 4, fontSize: 10 }}>↕</span>;
  return (
    <span style={{
      marginLeft: 4, fontSize: 10,
      color: "#67b1ff",
      filter: "drop-shadow(0 0 4px rgba(103,177,255,0.6))",
    }}>
      {dir === "asc" ? "↑" : "↓"}
    </span>
  );
}

/* ── Team badge ── */
function TeamBadge({ team }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <img src={TEAM_BADGES[team]} alt={team}
        style={{ width: 20, height: 20, objectFit: "contain" }}
        onError={e => { e.currentTarget.style.display = "none"; }}
      />
      <span style={{ fontWeight: 700, fontSize: 13 }}>{team}</span>
    </div>
  );
}

/* ── Rank badge (row number) ── */
function RankBadge({ rank }) {
  const gold   = rank === 1;
  const silver = rank === 2;
  const bronze = rank === 3;
  const bg = gold ? "#c8972a" : silver ? "#8a9aaa" : bronze ? "#9b6840" : "rgba(255,255,255,0.06)";
  const fg = gold || silver || bronze ? "#fff" : "#5a7a9a";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 24, height: 24, borderRadius: 6,
      background: bg, color: fg,
      fontSize: 11, fontWeight: 800, flexShrink: 0,
      boxShadow: gold ? "0 0 8px rgba(200,151,42,0.5)" : "none",
    }}>
      {rank}
    </span>
  );
}

export default function FplTablePage() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);

  const [team, setTeam]         = useState("ALL");
  const [position, setPosition] = useState("ALL");
  const [maxCost, setMaxCost]   = useState(15.5);
  const [minProb, setMinProb]   = useState(0);
  const [startGw, setStartGw]   = useState(30);
  const [search, setSearch]     = useState("");

  const [sortKey, setSortKey]     = useState("next5_points");
  const [sortOrder, setSortOrder] = useState("desc");

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
    const q = search.trim().toLowerCase();
    if (!q) return enrichedRows;
    return enrichedRows.filter(r =>
      String(r.player || "").toLowerCase().includes(q) ||
      String(r.player_display || "").toLowerCase().includes(q) ||
      String(r.team || "").toLowerCase().includes(q) ||
      String(r.position || "").toLowerCase().includes(q)
    );
  }, [enrichedRows, search]);

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

  const resetFilters = () => { setTeam("ALL"); setPosition("ALL"); setMaxCost(15.5); setMinProb(0); setStartGw(30); setSearch(""); };

  function Th({ sortable, col, children, title, style }) {
    const active = sortKey === col;
    return (
      <th onClick={sortable ? () => handleSort(col) : undefined} title={title}
        style={{ cursor: sortable ? "pointer" : "default", ...style }}>
        {children}
        {sortable && <SortArrow active={active} dir={sortOrder} />}
      </th>
    );
  }

  if (loading) return <div className="page-shell">Loading FPL table...</div>;

  return (
    <div className="page-shell">
      <div className="page-content-wide">
        <div className="panel-dark">
          <h1 className="page-title-left" style={{ marginBottom: 18 }}>FPL Analytics Table</h1>

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

          <div className="table-toolbar">
            <input className="search-input" type="text"
              placeholder="Search player, team, or position..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <div className="mini-metric">
              <span style={{ color: "#67b1ff", fontWeight: 800 }}>{sortedRows.length}</span>
              <span style={{ color: "#4a6a8a", marginLeft: 6 }}>players</span>
            </div>
          </div>
        </div>

        <div className="panel-dark" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-scroll-x">
            <table className="fpl-table">
              <thead>
                <tr>
                  <th className="sticky-player sticky-player-head" style={{ cursor: "default" }}>
                    #&nbsp;&nbsp;Player
                  </th>
                  <Th sortable col="team">Team</Th>
                  <Th sortable col="position">Pos</Th>
                  <Th sortable col="cost">Cost</Th>
                  <Th sortable col="merit" title={METRIC_TOOLTIPS.merit}>Merit</Th>
                  <Th sortable col="form" title={METRIC_TOOLTIPS.form}>Form</Th>
                  <Th sortable col="goal_threat" title={METRIC_TOOLTIPS.goal_threat}>Goal Threat</Th>
                  <Th sortable col="chance_creation" title={METRIC_TOOLTIPS.chance_creation}>Chance Creation</Th>
                  <Th sortable col="attack_involvement" title={METRIC_TOOLTIPS.attack_involvement}>Atk Involvement</Th>
                  <Th sortable col="captain_score" title={METRIC_TOOLTIPS.captain_score}>Captain Score</Th>
                  <th>Next Opp</th>
                  <Th sortable col="fixture_difficulty" title={METRIC_TOOLTIPS.fixture_difficulty}>Fixture Diff</Th>
                  <Th sortable col="minutes_security" title={METRIC_TOOLTIPS.minutes_security}>Mins Security</Th>
                  <Th sortable col="fixture_run_score" title={METRIC_TOOLTIPS.fixture_run_score}>Fixture Run</Th>
                  <Th sortable col="safe_pick_score" title={METRIC_TOOLTIPS.safe_pick_score}>Safe Pick</Th>
                  <Th sortable col="prob_appear" title={METRIC_TOOLTIPS.prob_appear}>Prob Appear</Th>
                  <th title={METRIC_TOOLTIPS.availability_status}>Availability</th>
                  <Th sortable col="pts_gw_1">GW{startGw}</Th>
                  <Th sortable col="pts_gw_2">GW{startGw + 1}</Th>
                  <Th sortable col="pts_gw_4">GW{startGw + 3}</Th>
                  <Th sortable col="next5_points" title={METRIC_TOOLTIPS.next5}>Next 5 Pts</Th>
                  <Th sortable col="pts_rest_season">Pts Season</Th>
                  <Th sortable col="points_per_cost" title={METRIC_TOOLTIPS.ppc}>Pts / Cost</Th>
                  <Th sortable col="value_rest_season">Value</Th>
                  <Th sortable col="points_so_far">Pts So Far</Th>
                  <Th sortable col="selected_by_pct">Own %</Th>
                  <Th sortable col="transfer_momentum" title={METRIC_TOOLTIPS.transfer_momentum}>Transfers</Th>
                </tr>
              </thead>

              <tbody>
                {sortedRows.map((r, idx) => (
                  <tr key={r.player_id} className="player-row">
                    <td className="sticky-player">
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <RankBadge rank={idx + 1} />
                        <img src={TEAM_BADGES[r.team]} alt={r.team}
                          style={{ width: 20, height: 20, objectFit: "contain" }}
                          onError={e => { e.currentTarget.style.display = "none"; }} />
                        <span style={{ fontWeight: 700, fontSize: 13.5, color: "#f0f6ff" }}>
                          {r.player_display}
                        </span>
                      </div>
                    </td>

                    <td className="team-badge-cell"
                      style={{ background: TEAM_COLORS[r.team] || "#222", color: getTeamTextColor(r.team) }}>
                      {r.team}
                    </td>

                    <td style={{ fontWeight: 700, color: "#8ab8e0", fontSize: 12, letterSpacing: "0.06em" }}>
                      {r.position}
                    </td>
                    <td style={{ fontWeight: 700 }}>£{r.cost}</td>

                    <HeatCell value={r.merit} minValue={metricRanges.merit.min} maxValue={metricRanges.merit.max} title={METRIC_TOOLTIPS.merit} />
                    <HeatCell value={r.form} minValue={metricRanges.form.min} maxValue={metricRanges.form.max} title={METRIC_TOOLTIPS.form} />
                    <HeatCell value={r.goal_threat} minValue={metricRanges.goal_threat.min} maxValue={metricRanges.goal_threat.max} title={METRIC_TOOLTIPS.goal_threat} />
                    <HeatCell value={r.chance_creation} minValue={metricRanges.chance_creation.min} maxValue={metricRanges.chance_creation.max} title={METRIC_TOOLTIPS.chance_creation} />
                    <HeatCell value={r.attack_involvement} minValue={metricRanges.attack_involvement.min} maxValue={metricRanges.attack_involvement.max} title={METRIC_TOOLTIPS.attack_involvement} />
                    <HeatCell value={r.captain_score} minValue={metricRanges.captain_score.min} maxValue={metricRanges.captain_score.max} title={METRIC_TOOLTIPS.captain_score} />

                    <td>
                      {r.next_opp}
                      <DifficultyPill label={r.fixture_label} />
                    </td>

                    <HeatCell value={r.fixture_difficulty} minValue={metricRanges.fixture_difficulty.min} maxValue={metricRanges.fixture_difficulty.max} title={METRIC_TOOLTIPS.fixture_difficulty} />

                    <HeatCell value={r.minutes_security} minValue={metricRanges.minutes_security.min} maxValue={metricRanges.minutes_security.max} title={METRIC_TOOLTIPS.minutes_security}
                      displayValue={`${r.minutes_security} · ${getScoreLabel(r.minutes_security)}`} />

                    <HeatCell value={r.fixture_run_score} minValue={metricRanges.fixture_run_score.min} maxValue={metricRanges.fixture_run_score.max} title={METRIC_TOOLTIPS.fixture_run_score} />
                    <HeatCell value={r.safe_pick_score} minValue={metricRanges.safe_pick_score.min} maxValue={metricRanges.safe_pick_score.max} title={METRIC_TOOLTIPS.safe_pick_score} />
                    <HeatCell value={r.prob_appear} minValue={metricRanges.prob_appear.min} maxValue={metricRanges.prob_appear.max} title={METRIC_TOOLTIPS.prob_appear} />

                    <td title={extractInjuryNote(r) || undefined}
                      style={{ fontSize: 12, color: extractInjuryNote(r) ? "#ffb347" : "#8ab8e0" }}>
                      {r.availability_status}
                    </td>

                    <HeatCell value={r.pts_gw_1} minValue={metricRanges.pts_gw_1.min} maxValue={metricRanges.pts_gw_1.max} title={`Projected GW${startGw} points`} />
                    <HeatCell value={r.pts_gw_2} minValue={metricRanges.pts_gw_2.min} maxValue={metricRanges.pts_gw_2.max} title={`Projected GW${startGw + 1} points`} />
                    <HeatCell value={r.pts_gw_4} minValue={metricRanges.pts_gw_4.min} maxValue={metricRanges.pts_gw_4.max} title={`Projected GW${startGw + 3} points`} />
                    <HeatCell value={r.next5_points} minValue={metricRanges.next5_points.min} maxValue={metricRanges.next5_points.max} title={METRIC_TOOLTIPS.next5} />
                    <HeatCell value={r.pts_rest_season} minValue={metricRanges.pts_rest_season.min} maxValue={metricRanges.pts_rest_season.max} title="Projected rest of season points" />
                    <HeatCell value={r.points_per_cost} minValue={metricRanges.points_per_cost.min} maxValue={metricRanges.points_per_cost.max} title={METRIC_TOOLTIPS.ppc} />
                    <HeatCell value={r.value_rest_season} minValue={metricRanges.value_rest_season.min} maxValue={metricRanges.value_rest_season.max} title="Value rating over the rest of the season" />
                    <HeatCell value={r.points_so_far} minValue={metricRanges.points_so_far.min} maxValue={metricRanges.points_so_far.max} title="Total points so far" />
                    <HeatCell value={r.selected_by_pct} minValue={metricRanges.selected_by_pct.min} maxValue={metricRanges.selected_by_pct.max} title="Ownership percentage" />
                    <HeatCell value={r.transfer_momentum} minValue={metricRanges.transfer_momentum.min} maxValue={metricRanges.transfer_momentum.max} title={METRIC_TOOLTIPS.transfer_momentum}
                      displayValue={formatSignedNumber(r.transfer_momentum)} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}