// ═════════════════════════════════════════════════════
// StatinSite  –  Match Intelligence Page
// FotMob-style  /match/:fixtureId
// ═════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MatchLineups from "../components/MatchLineups.jsx";
const BACKEND = "https://football-stats-lw4b.onrender.com";

const TABS = [
  { id: "facts",      label: "Facts"      },
  { id: "commentary", label: "Commentary" },
  { id: "lineups",    label: "Lineups"    },
  { id: "stats",      label: "Stats"      },
  { id: "h2h",        label: "H2H"        },
  { id: "model",      label: "Model"      },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function pct(v) { return v != null ? `${v}%` : "—"; }

function FormDot({ result }) {
  const colors = { W: "#34d399", D: "#f59e0b", L: "#ff5252" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 22, height: 22, borderRadius: "50%",
      background: colors[result] || "rgba(255,255,255,0.08)",
      fontSize: 9, fontWeight: 900, color: "#fff",
    }}>
      {result}
    </span>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 900, letterSpacing: "0.14em",
      color: "#3a5070", textTransform: "uppercase",
      marginBottom: 12, marginTop: 24,
    }}>
      {children}
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: "linear-gradient(160deg,#0d1525,#080e1a)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 14,
      padding: 16,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// Stat Bar
// ─────────────────────────────────────────────

function StatBar({ label, home, away }) {
  const total = (Number(home) || 0) + (Number(away) || 0);
  const homePct = total > 0 ? Math.round((Number(home) / total) * 100) : 50;
  const awayPct = 100 - homePct;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        fontSize: 11, fontWeight: 700, color: "#9fb4d6",
        marginBottom: 5,
      }}>
        <span style={{ color: "#60a5fa" }}>{home ?? "—"}</span>
        <span style={{ color: "#4a6080", fontSize: 9, letterSpacing: "0.06em" }}>{label}</span>
        <span style={{ color: "#f97316" }}>{away ?? "—"}</span>
      </div>
      <div style={{
        display: "flex", height: 5, borderRadius: 999, overflow: "hidden",
        background: "rgba(255,255,255,0.04)",
        gap: 1,
      }}>
        <div style={{
          width: `${homePct}%`, height: "100%",
          background: "linear-gradient(90deg,#1d4ed8,#60a5fa)",
          borderRadius: "999px 0 0 999px", transition: "width 0.8s ease",
        }} />
        <div style={{
          width: `${awayPct}%`, height: "100%",
          background: "linear-gradient(90deg,#ea6c1a,#f97316)",
          borderRadius: "0 999px 999px 0", transition: "width 0.8s ease",
        }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FACTS TAB
// ─────────────────────────────────────────────

function FactsTab({ data }) {
  const { header, insights = [], home_recent_form = [], away_recent_form = [] } = data;

  return (
    <div>
      <SectionTitle>Recent Form</SectionTitle>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7fa3", marginBottom: 8 }}>
              {header?.home_team}
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {home_recent_form.slice(0, 5).map((r, i) => <FormDot key={i} result={r} />)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7fa3", marginBottom: 8 }}>
              {header?.away_team}
            </div>
            <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
              {away_recent_form.slice(0, 5).map((r, i) => <FormDot key={i} result={r} />)}
            </div>
          </div>
        </div>
      </Card>

      {insights.length > 0 && (
        <>
          <SectionTitle>Key Insights</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {insights.map((insight, i) => (
              <Card key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{
                  fontSize: 16, lineHeight: 1, marginTop: 1,
                }}>
                  {["⚡","📊","🎯","🔥","💡"][i % 5]}
                </span>
                <span style={{ fontSize: 13, color: "#c8d8f0", lineHeight: 1.5 }}>
                  {insight}
                </span>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// EVENT ICON
// ─────────────────────────────────────────────

function EventIcon({ type, detail }) {
  const t = (type || "").toLowerCase();
  const d = (detail || "").toLowerCase();

  if (t === "goal" && d.includes("own"))    return <span title="Own Goal">⚽🔴</span>;
  if (t === "goal" && d.includes("pen"))    return <span title="Penalty">⚽🎯</span>;
  if (t === "goal")                          return <span title="Goal">⚽</span>;
  if (t === "card" && d.includes("yellow")) return <span title="Yellow Card">🟨</span>;
  if (t === "card" && d.includes("red"))    return <span title="Red Card">🟥</span>;
  if (t === "card" && d.includes("yellow red")) return <span title="Second Yellow">🟨🟥</span>;
  if (t === "subst")                         return <span title="Substitution">🔄</span>;
  if (t === "var")                           return <span title="VAR">📺</span>;
  return <span>•</span>;
}

// ─────────────────────────────────────────────
// COMMENTARY TAB
// ─────────────────────────────────────────────

function CommentaryTab({ data }) {
  const events = [...(data.events || [])].sort((a, b) => (b.minute || 0) - (a.minute || 0));

  if (events.length === 0) {
    return (
      <div style={{ color: "#3a5070", fontSize: 13, textAlign: "center", paddingTop: 40 }}>
        No events recorded yet.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {events.map((e, i) => {
        const isHome = e.team === data.header?.home_team || e.team_id === data.header?.home_id;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            {/* minute */}
            <span style={{
              fontSize: 11, fontWeight: 900,
              color: "#3a5070",
              minWidth: 32, flexShrink: 0,
              paddingTop: 1,
            }}>
              {e.minute}{e.extra_minute ? `+${e.extra_minute}` : ""}'
            </span>

            {/* icon */}
            <span style={{ fontSize: 15, flexShrink: 0 }}>
              <EventIcon type={e.type} detail={e.detail} />
            </span>

            {/* detail */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 12, fontWeight: 700,
                color: isHome ? "#60a5fa" : "#f97316",
              }}>
                {e.player}
              </div>
              {e.assist && (
                <div style={{ fontSize: 10, color: "#3a5070", marginTop: 2 }}>
                  Assist: {e.assist}
                </div>
              )}
              {e.detail && (
                <div style={{ fontSize: 10, color: "#4a6080", marginTop: 1 }}>
                  {e.detail}
                </div>
              )}
            </div>

            {/* team side */}
            <span style={{
              fontSize: 9, fontWeight: 800,
              color: isHome ? "#1d4ed8" : "#c2510a",
              opacity: 0.7,
              letterSpacing: "0.06em",
              flexShrink: 0,
            }}>
              {isHome ? "HOME" : "AWAY"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// PITCH + LINEUPS TAB
// ─────────────────────────────────────────────

function PlayerMarker({ player, isHome }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: isHome
          ? "linear-gradient(135deg,#1d4ed8,#3b82f6)"
          : "linear-gradient(135deg,#c2410c,#f97316)",
        border: "2px solid rgba(255,255,255,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 900, color: "#fff",
      }}>
        {player.number || "?"}
      </div>
      <span style={{
        fontSize: 9, fontWeight: 700,
        color: "#c8d8f0",
        maxWidth: 60, textAlign: "center",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {player.name?.split(" ").pop()}
      </span>
    </div>
  );
}
function LineupsTab({ data }) {
  const { lineups = {} } = data;
  const home = lineups.home || {};
  const away = lineups.away || {};

  const homePlayers  = home.startXI  || [];
  const awayPlayers  = away.startXI  || [];
  const homeBench    = home.bench    || [];
  const awayBench    = away.bench    || [];

  // Group by row for basic pitch layout
  function groupByRow(players) {
    const rows = {};
    players.forEach(p => {
      const row = p.grid?.split(":")[0] || "1";
      if (!rows[row]) rows[row] = [];
      rows[row].push(p);
    });
    return Object.values(rows);
  }

  const homeRows = groupByRow(homePlayers);
  const awayRows = groupByRow(awayPlayers);

  return (
    <div>
      {/* Pitch */}
      <div style={{
        background: "linear-gradient(180deg,#0a2010 0%,#0d2c14 50%,#0a2010 100%)",
        borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)",
        padding: "20px 16px",
        position: "relative", overflow: "hidden",
        marginBottom: 20,
      }}>
        {/* pitch lines */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.12,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }} />
        <div style={{
          position: "absolute", top: "50%", left: "5%", right: "5%",
          height: 1, background: "rgba(255,255,255,0.12)",
        }} />

        {/* Formation labels */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, position: "relative" }}>
          <span style={{ fontSize: 10, fontWeight: 900, color: "#3b82f6", opacity: 0.7 }}>
            {home.formation || "—"}  {home.team_name}
          </span>
          <span style={{ fontSize: 10, fontWeight: 900, color: "#f97316", opacity: 0.7 }}>
            {away.team_name}  {away.formation || "—"}
          </span>
        </div>

        {homePlayers.length === 0 && awayPlayers.length === 0 ? (
          <div style={{ color: "#3a5070", fontSize: 13, textAlign: "center", padding: "40px 0" }}>
            Lineups not yet announced.
          </div>
        ) : (
          <div style={{ display: "flex", gap: 12 }}>
            {/* Home XI */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
              {homeRows.map((row, ri) => (
                <div key={ri} style={{ display: "flex", justifyContent: "space-around" }}>
                  {row.map((p, pi) => <PlayerMarker key={pi} player={p} isHome={true} />)}
                </div>
              ))}
            </div>
            {/* divider */}
            <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />
            {/* Away XI */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column-reverse", gap: 12 }}>
              {awayRows.map((row, ri) => (
                <div key={ri} style={{ display: "flex", justifyContent: "space-around" }}>
                  {row.map((p, pi) => <PlayerMarker key={pi} player={p} isHome={false} />)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bench */}
      {(homeBench.length > 0 || awayBench.length > 0) && (
        <>
          <SectionTitle>Bench</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Card>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#3b82f6", marginBottom: 10 }}>
                {home.team_name}
              </div>
              {homeBench.map((p, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "5px 0",
                  borderBottom: i < homeBench.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700,
                    color: "#3a5070", minWidth: 18,
                  }}>{p.number}</span>
                  <span style={{ fontSize: 11, color: "#9fb4d6" }}>{p.name}</span>
                </div>
              ))}
            </Card>
            <Card>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#f97316", marginBottom: 10 }}>
                {away.team_name}
              </div>
              {awayBench.map((p, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "5px 0",
                  borderBottom: i < awayBench.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700,
                    color: "#3a5070", minWidth: 18,
                  }}>{p.number}</span>
                  <span style={{ fontSize: 11, color: "#9fb4d6" }}>{p.name}</span>
                </div>
              ))}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// STATS TAB
// ─────────────────────────────────────────────

const STAT_LABELS = {
  "Ball Possession":          "Possession %",
  "expected_goals":           "Expected Goals (xG)",
  "Total Shots":              "Total Shots",
  "Shots on Goal":            "Shots on Target",
  "Shots off Goal":           "Shots off Target",
  "Blocked Shots":            "Blocked Shots",
  "Corner Kicks":             "Corners",
  "Fouls":                    "Fouls",
  "Yellow Cards":             "Yellow Cards",
  "Red Cards":                "Red Cards",
  "Total passes":             "Total Passes",
  "Passes accurate":          "Accurate Passes",
  "Passes %":                 "Pass Accuracy %",
  "Goalkeeper Saves":         "Saves",
  "Offsides":                 "Offsides",
};

function StatsTab({ data }) {
  const stats = data.statistics || {};
  const homeStats = stats.home || [];
  const awayStats = stats.away || [];

  // Merge into { label: { home, away } }
  const merged = {};
  homeStats.forEach(s => {
    const key = s.type;
    if (!merged[key]) merged[key] = {};
    merged[key].home = s.value;
  });
  awayStats.forEach(s => {
    const key = s.type;
    if (!merged[key]) merged[key] = {};
    merged[key].away = s.value;
  });

  const entries = Object.entries(merged);

  if (entries.length === 0) {
    return (
      <div style={{ color: "#3a5070", fontSize: 13, textAlign: "center", paddingTop: 40 }}>
        Statistics not yet available.
      </div>
    );
  }

  return (
    <div>
      {/* Team labels */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        marginBottom: 16,
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: "#60a5fa" }}>
          {data.header?.home_team}
        </span>
        <span style={{ fontSize: 10, fontWeight: 800, color: "#f97316" }}>
          {data.header?.away_team}
        </span>
      </div>

      <Card>
        {entries.map(([key, val]) => (
          <StatBar
            key={key}
            label={STAT_LABELS[key] || key}
            home={val.home}
            away={val.away}
          />
        ))}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// H2H TAB
// ─────────────────────────────────────────────

function H2HTab({ data }) {
  const h2h = data.h2h || {};
  const matches = h2h.matches || [];
  const summary = h2h.summary || {};

  return (
    <div>
      {/* Summary */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#60a5fa" }}>
              {summary.home_wins ?? "—"}
            </div>
            <div style={{ fontSize: 9, color: "#3a5070", marginTop: 4, fontWeight: 700 }}>
              {data.header?.home_team} Wins
            </div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#f0f6ff" }}>
              {summary.draws ?? "—"}
            </div>
            <div style={{ fontSize: 9, color: "#3a5070", marginTop: 4, fontWeight: 700 }}>Draws</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#f97316" }}>
              {summary.away_wins ?? "—"}
            </div>
            <div style={{ fontSize: 9, color: "#3a5070", marginTop: 4, fontWeight: 700 }}>
              {data.header?.away_team} Wins
            </div>
          </div>
        </div>
      </Card>

      {/* Match list */}
      <SectionTitle>Previous Meetings</SectionTitle>
      {matches.length === 0 ? (
        <div style={{ color: "#3a5070", fontSize: 13, textAlign: "center" }}>No H2H data.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {matches.map((m, i) => (
            <Card key={i} style={{ padding: "10px 14px" }}>
              <div style={{
                display: "flex", alignItems: "center",
                gap: 8, fontSize: 11,
              }}>
                <span style={{ fontSize: 9, color: "#3a5070", minWidth: 72 }}>
                  {m.date ? new Date(m.date).toLocaleDateString([], { year: "2-digit", month: "short", day: "numeric" }) : "—"}
                </span>
                <span style={{ flex: 1, color: "#9fb4d6", textAlign: "right" }}>
                  {m.home_team}
                </span>
                <span style={{
                  fontWeight: 900, color: "#f0f6ff",
                  padding: "2px 10px",
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 6, fontSize: 13,
                  minWidth: 48, textAlign: "center",
                }}>
                  {m.home_score} – {m.away_score}
                </span>
                <span style={{ flex: 1, color: "#9fb4d6" }}>
                  {m.away_team}
                </span>
                <span style={{ fontSize: 9, color: "#3a5070", minWidth: 60, textAlign: "right" }}>
                  {m.league}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Probability Gauge
// ─────────────────────────────────────────────

function ProbGauge({ label, value, color }) {
  return (
    <div style={{
      flex: 1,
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 6,
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: "50%",
        background: `conic-gradient(${color} ${value * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: "50%",
          background: "#080e1a",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: 900, color: color,
        }}>
          {value}%
        </div>
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#3a5070", textAlign: "center" }}>
        {label}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MODEL TAB
// ─────────────────────────────────────────────

function ModelTab({ data }) {
  const pred = data.prediction || {};

  return (
    <div>
      {/* Win probabilities */}
      <SectionTitle>Win Probabilities</SectionTitle>
      <Card>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <ProbGauge label={`${data.header?.home_team} Win`} value={pred.home_win ?? 0} color="#60a5fa" />
          <ProbGauge label="Draw"                            value={pred.draw      ?? 0} color="#f0f6ff" />
          <ProbGauge label={`${data.header?.away_team} Win`} value={pred.away_win ?? 0} color="#f97316" />
        </div>
      </Card>

      {/* xG */}
      {(pred.xg_home != null || pred.xg_away != null) && (
        <>
          <SectionTitle>Expected Goals</SectionTitle>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#60a5fa" }}>
                  {pred.xg_home}
                </div>
                <div style={{ fontSize: 9, color: "#3a5070", marginTop: 4, fontWeight: 700 }}>
                  {data.header?.home_team}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#3a5070", fontWeight: 700 }}>xG</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#f97316" }}>
                  {pred.xg_away}
                </div>
                <div style={{ fontSize: 9, color: "#3a5070", marginTop: 4, fontWeight: 700 }}>
                  {data.header?.away_team}
                </div>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Markets */}
      <SectionTitle>Markets</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          { label: "Over 2.5 Goals",  value: pred.over25 },
          { label: "BTTS",            value: pred.btts   },
          { label: "Under 2.5 Goals", value: pred.under25 != null ? pred.under25 : pred.over25 != null ? 100 - pred.over25 : null },
          { label: "Clean Sheet (H)", value: pred.clean_sheet_home },
        ].filter(m => m.value != null).map((m, i) => (
          <Card key={i} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#34d399" }}>{m.value}%</div>
            <div style={{ fontSize: 9, color: "#3a5070", marginTop: 4, fontWeight: 700 }}>{m.label}</div>
          </Card>
        ))}
      </div>

      {/* Top scorelines */}
      {pred.scorelines?.length > 0 && (
        <>
          <SectionTitle>Top Predicted Scorelines</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {pred.scorelines.slice(0, 5).map((s, i) => (
              <Card key={i} style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", padding: "8px 14px",
              }}>
                <span style={{ fontSize: 14, fontWeight: 900, color: "#f0f6ff" }}>
                  {s.score}
                </span>
                <div style={{
                  height: 4, flex: 1, margin: "0 14px",
                  background: "rgba(255,255,255,0.04)", borderRadius: 999, overflow: "hidden",
                }}>
                  <div style={{
                    width: `${s.probability}%`, height: "100%",
                    background: "linear-gradient(90deg,#34d399,#60a5fa)",
                  }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#34d399" }}>
                  {s.probability}%
                </span>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// RIGHT SIDEBAR
// ─────────────────────────────────────────────

function Sidebar({ data }) {
  const { venue, prediction, home_season_stats, away_season_stats, insights = [], header } = data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Venue */}
      {venue && (
        <Card>
          <SectionTitle>Venue</SectionTitle>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#c8d8f0", marginBottom: 6 }}>
            {venue.name}
          </div>
          <div style={{ fontSize: 11, color: "#4a6080", lineHeight: 1.8 }}>
            {venue.city && <div>📍 {venue.city}</div>}
            {venue.capacity && <div>🏟 {Number(venue.capacity).toLocaleString()} capacity</div>}
            {venue.surface && <div>🌿 {venue.surface}</div>}
          </div>
        </Card>
      )}

      {/* Quick probabilities */}
      {prediction && (
        <Card>
          <SectionTitle>Probabilities</SectionTitle>
          {[
            { label: header?.home_team + " Win", val: prediction.home_win, color: "#60a5fa" },
            { label: "Draw",                     val: prediction.draw,     color: "#f0f6ff" },
            { label: header?.away_team + " Win", val: prediction.away_win, color: "#f97316" },
          ].map((p, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                fontSize: 10, fontWeight: 700, color: "#6b7fa3", marginBottom: 4,
              }}>
                <span>{p.label}</span>
                <span style={{ color: p.color }}>{p.val ?? "—"}%</span>
              </div>
              <div style={{
                height: 4, background: "rgba(255,255,255,0.04)",
                borderRadius: 999, overflow: "hidden",
              }}>
                <div style={{
                  width: `${p.val || 0}%`, height: "100%",
                  background: p.color, opacity: 0.7,
                  transition: "width 0.8s ease",
                }} />
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Season form */}
      {(home_season_stats || away_season_stats) && (
        <Card>
          <SectionTitle>Season Form</SectionTitle>
          {[
            { team: header?.home_team, stats: home_season_stats, color: "#60a5fa" },
            { team: header?.away_team, stats: away_season_stats, color: "#f97316" },
          ].map(({ team, stats, color }, i) => stats && (
            <div key={i} style={{ marginBottom: i === 0 ? 14 : 0 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color, marginBottom: 6 }}>{team}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4 }}>
                {[
                  { label: "P", val: stats.played },
                  { label: "W", val: stats.wins   },
                  { label: "D", val: stats.draws  },
                  { label: "L", val: stats.losses },
                ].map((s, j) => (
                  <div key={j} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#f0f6ff" }}>{s.val ?? "—"}</div>
                    <div style={{ fontSize: 8, color: "#3a5070", fontWeight: 700 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Top insights */}
      {insights.length > 0 && (
        <Card>
          <SectionTitle>Top Insights</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {insights.slice(0, 3).map((ins, i) => (
              <div key={i} style={{
                fontSize: 11, color: "#7a9bc0", lineHeight: 1.5,
                paddingLeft: 10,
                borderLeft: "2px solid rgba(96,165,250,0.3)",
              }}>
                {ins}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

export default function MatchIntelligencePage() {
  const { fixtureId } = useParams();
  const navigate      = useNavigate();

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [tab,     setTab]     = useState("facts");

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`${BACKEND}/api/match-intelligence/${fixtureId}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [fixtureId]);

  if (loading) {
    return (
      <div style={{
        background: "#060a12", minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 16,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          border: "2px solid rgba(96,165,250,0.2)",
          borderTopColor: "#60a5fa",
          animation: "spin 0.8s linear infinite",
        }} />
        <div style={{ color: "#4a6080", fontSize: 13 }}>Loading match intelligence…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: "#060a12", minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 16, padding: 24,
      }}>
        <div style={{ color: "#ff5252", fontSize: 14 }}>Failed to load: {error}</div>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#9fb4d6", borderRadius: 8, padding: "8px 18px",
            cursor: "pointer", fontSize: 12,
          }}
        >
          ← Back
        </button>
      </div>
    );
  }

  const header = data?.header || {};
  const isLive = ["1H","2H","HT","ET","BT","P"].includes(header.status);

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%,100% { opacity: 1; } 50% { opacity: 0.3; }
        }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{
        background: "#060a12", minHeight: "100vh",
        fontFamily: "'Inter', sans-serif",
      }}>

        {/* ── Hero header ── */}
        <div style={{
          background: "linear-gradient(180deg,#0d1a2e 0%,#060a12 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          padding: "24px 24px 0",
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>

            {/* back button */}
            <button
              onClick={() => navigate(-1)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#3a5070", fontSize: 12, padding: 0, marginBottom: 20,
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              ← Live Centre
            </button>

            {/* match scoreline */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 16, marginBottom: 20,
            }}>

              {/* home */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1, maxWidth: 160 }}>
                {header.home_logo && (
                  <img src={header.home_logo} style={{ width: 48, height: 48, objectFit: "contain" }}
                    onError={e => (e.currentTarget.style.display = "none")} />
                )}
                <span style={{ fontSize: 13, fontWeight: 800, color: "#c8d8f0", textAlign: "center" }}>
                  {header.home_team}
                </span>
              </div>

              {/* score / kickoff */}
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                {header.home_score != null ? (
                  <div style={{ fontSize: 40, fontWeight: 900, color: "#f0f6ff", letterSpacing: "-0.02em" }}>
                    {header.home_score} – {header.away_score}
                  </div>
                ) : (
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#4a6080" }}>
                    {header.kickoff
                      ? new Date(header.kickoff).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "vs"}
                  </div>
                )}

                {/* live badge */}
                {isLive && (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    gap: 5, marginTop: 6,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff5252", animation: "pulse 1.2s infinite" }} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#ff5252" }}>
                      {header.status === "HT" ? "Half Time" : `${header.minute}'`}
                    </span>
                  </div>
                )}

                {header.status === "FT" && (
                  <div style={{ fontSize: 10, color: "#3a5070", marginTop: 4, fontWeight: 800, letterSpacing: "0.08em" }}>
                    FULL TIME
                  </div>
                )}

                {header.league_name && (
                  <div style={{ fontSize: 9, color: "#2e3d52", marginTop: 8, letterSpacing: "0.1em", fontWeight: 700 }}>
                    {header.league_name}
                  </div>
                )}
              </div>

              {/* away */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1, maxWidth: 160 }}>
                {header.away_logo && (
                  <img src={header.away_logo} style={{ width: 48, height: 48, objectFit: "contain" }}
                    onError={e => (e.currentTarget.style.display = "none")} />
                )}
                <span style={{ fontSize: 13, fontWeight: 800, color: "#c8d8f0", textAlign: "center" }}>
                  {header.away_team}
                </span>
              </div>

            </div>

            {/* ── Tab bar ── */}
            <div style={{
              display: "flex", gap: 0,
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              overflowX: "auto",
            }}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: "10px 16px",
                    fontSize: 12, fontWeight: 700,
                    color: tab === t.id ? "#60a5fa" : "#3a5070",
                    borderBottom: `2px solid ${tab === t.id ? "#60a5fa" : "transparent"}`,
                    transition: "color 0.15s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 24px" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 300px",
            gap: 20,
          }}>

            {/* Main content */}
            <div>
              {tab === "facts"      && <FactsTab      data={data} />}
              {tab === "commentary" && <CommentaryTab data={data} />}
{tab === "lineups" && <MatchLineups fixtureId={fixtureId} />}
              {tab === "stats"      && <StatsTab      data={data} />}
              {tab === "h2h"        && <H2HTab        data={data} />}
              {tab === "model"      && <ModelTab      data={data} />}
            </div>

            {/* Sidebar */}
            <div>
              <Sidebar data={data} />
            </div>

          </div>
        </div>

      </div>
    </>
  );
}