import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE || "https://football-stats-lw4b.onrender.com";

const TABS = [
  { id: "preview",    label: "Preview"    },
  { id: "commentary", label: "Commentary" },
  { id: "lineups",    label: "Lineups"    },
  { id: "stats",      label: "Stats"      },
  { id: "h2h",        label: "H2H"        },
  { id: "injuries",   label: "Injuries"   },
  { id: "model",      label: "Model"      },
];

const LIVE_STATUSES = ["1H", "2H", "HT", "ET", "BT", "P", "INT", "LIVE"];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function pct(v) { return `${Math.round((v || 0) * 100)}%`; }
function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function fmtCountdown(iso) {
  if (!iso) return null;
  const diff = new Date(iso) - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 48) return `${Math.floor(h / 24)}d`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
function resultColor(r) {
  if (r === "W") return "#10b981";
  if (r === "L") return "#ef4444";
  return "#6b7280";
}
function severityColor(s) {
  if (s === "positive") return "#10b981";
  if (s === "warning")  return "#f59e0b";
  if (s === "info")     return "#60a5fa";
  return "#9ca3af";
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────
function Skeleton({ w = "100%", h = 16, r = 6 }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg,#1a1a1a 25%,#242424 50%,#1a1a1a 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PITCH LINEUP COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function PitchPlayer({ player, side }) {
  const col = side === "home" ? "#10b981" : "#60a5fa";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "default" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: col, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#000", border: "2px solid rgba(255,255,255,0.15)", position: "relative" }}>
        {player.number || "?"}
        {player.confidence && (
          <div style={{ position: "absolute", bottom: -2, right: -2, width: 12, height: 12, borderRadius: "50%", background: player.confidence >= 80 ? "#10b981" : player.confidence >= 60 ? "#f59e0b" : "#6b7280", border: "1px solid #111", fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff" }}>
            {player.confidence >= 80 ? "✓" : "~"}
          </div>
        )}
      </div>
      <span style={{ fontSize: 10, color: "#e2e8f0", fontWeight: 600, maxWidth: 64, textAlign: "center", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {(player.name || "").split(" ").pop()}
      </span>
    </div>
  );
}

function PitchFormation({ lineup, side }) {
  const xi = lineup?.start_xi || [];
  // Group by grid row
  const rows = {};
  xi.forEach(p => {
    const row = (p.grid || "1:1").split(":")[0];
    if (!rows[row]) rows[row] = [];
    rows[row].push(p);
  });

  const rowKeys = Object.keys(rows).sort((a, b) => {
    // home team: GK at bottom (row 1 = bottom), away: GK at top
    return side === "home" ? b - a : a - b;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "16px 8px" }}>
      <div style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: side === "home" ? "#10b981" : "#60a5fa", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
        {lineup?.team_name}
        {lineup?.formation && <span style={{ marginLeft: 8, opacity: 0.7 }}>{lineup.formation}</span>}
        {lineup?.predicted && <span style={{ marginLeft: 6, fontSize: 9, background: "rgba(245,158,11,0.15)", color: "#f59e0b", padding: "1px 5px", borderRadius: 3 }}>PREDICTED</span>}
      </div>
      {rowKeys.map(row => (
        <div key={row} style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
          {(rows[row] || []).map(p => <PitchPlayer key={p.id || p.player_id || p.name} player={p} side={side} />)}
        </div>
      ))}
    </div>
  );
}

function LineupsTab({ lineups, header }) {
  const home = lineups?.find(l => l.team_id === header?.home?.id) || lineups?.[0];
  const away = lineups?.find(l => l.team_id === header?.away?.id) || lineups?.[1];

  if (!home && !away) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "#6b7280" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
        <p style={{ margin: 0 }}>Lineups not yet announced</p>
      </div>
    );
  }

  return (
    <div>
      {/* Pitch */}
      <div style={{ background: "linear-gradient(180deg,#0d2b1a 0%,#0f3320 50%,#0d2b1a 100%)", borderRadius: 12, overflow: "hidden", marginBottom: 20, border: "1px solid #1a3a28", position: "relative" }}>
        {/* Pitch markings */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ width: "80%", height: "1px", background: "rgba(255,255,255,0.06)" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <PitchFormation lineup={home} side="home" />
          <PitchFormation lineup={away} side="away" />
        </div>
      </div>

      {/* Bench */}
      {(home?.subs?.length > 0 || away?.subs?.length > 0) && (
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ color: "#9ca3af", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 12px" }}>Substitutes</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[home, away].map((lu, idx) => (
              <div key={idx}>
                <div style={{ fontSize: 11, fontWeight: 700, color: idx === 0 ? "#10b981" : "#60a5fa", marginBottom: 8 }}>{lu?.team_name}</div>
                {(lu?.subs || []).map(p => (
                  <div key={p.id || p.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid #1a1a1a" }}>
                    <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#9ca3af", flexShrink: 0 }}>{p.number || "—"}</span>
                    <span style={{ fontSize: 12, color: "#e2e8f0" }}>{p.name}</span>
                    <span style={{ marginLeft: "auto", fontSize: 10, color: "#4b5563" }}>{p.pos}</span>
                    {p.confidence && <span style={{ fontSize: 9, color: "#f59e0b" }}>{p.confidence}%</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unavailable */}
      {[home, away].some(l => l?.unavailable?.length > 0) && (
        <div>
          <h4 style={{ color: "#9ca3af", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 12px" }}>Unavailable</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[home, away].map((lu, idx) => (
              <div key={idx}>
                {(lu?.unavailable || []).map(p => (
                  <div key={p.player_id || p.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid #1a1a1a" }}>
                    <span style={{ fontSize: 14 }}>🏥</span>
                    <div>
                      <div style={{ fontSize: 12, color: "#e2e8f0" }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: "#ef4444" }}>{p.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS TAB
// ─────────────────────────────────────────────────────────────────────────────
function StatBar({ label, home, away }) {
  const h = parseFloat(String(home || "0").replace("%", "")) || 0;
  const a = parseFloat(String(away || "0").replace("%", "")) || 0;
  const total = h + a || 1;
  const hPct = h / total * 100;
  const aPct = a / total * 100;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{home ?? "—"}</span>
        <span style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{away ?? "—"}</span>
      </div>
      <div style={{ display: "flex", height: 4, borderRadius: 2, overflow: "hidden", background: "#1a1a1a" }}>
        <div style={{ width: `${hPct}%`, background: "#10b981", transition: "width 0.6s ease" }} />
        <div style={{ width: `${aPct}%`, background: "#60a5fa", transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

function StatsTab({ statistics, header }) {
  const st = statistics;
  if (!st || Object.keys(st).length === 0) {
    return <div style={{ textAlign: "center", padding: "40px 0", color: "#6b7280" }}>No statistics available yet</div>;
  }

  const rows = [
    { key: "possession",       label: "Possession" },
    { key: "shots_total",      label: "Total Shots" },
    { key: "shots_on_target",  label: "Shots on Target" },
    { key: "shots_inside_box", label: "Shots Inside Box" },
    { key: "expected_goals",   label: "xG" },
    { key: "corner_kicks",     label: "Corners" },
    { key: "fouls",            label: "Fouls" },
    { key: "offsides",         label: "Offsides" },
    { key: "yellow_cards",     label: "Yellow Cards" },
    { key: "red_cards",        label: "Red Cards" },
    { key: "goalkeeper_saves", label: "Saves" },
    { key: "pass_accuracy",    label: "Pass Accuracy" },
    { key: "total_passes",     label: "Total Passes" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#10b981" }} />
          <span style={{ fontSize: 12, color: "#9ca3af" }}>{header?.home?.name}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#60a5fa" }} />
          <span style={{ fontSize: 12, color: "#9ca3af" }}>{header?.away?.name}</span>
        </div>
      </div>
      {rows.filter(r => st[r.key]?.home != null || st[r.key]?.away != null).map(r => (
        <StatBar key={r.key} label={r.label} home={st[r.key]?.home} away={st[r.key]?.away} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// H2H TAB
// ─────────────────────────────────────────────────────────────────────────────
function H2HTab({ h2h, header }) {
  if (!h2h || h2h.count === 0) {
    return <div style={{ textAlign: "center", padding: "40px 0", color: "#6b7280" }}>No head-to-head history found</div>;
  }
  const total = (h2h.home_wins + h2h.draws + h2h.away_wins) || 1;
  return (
    <div>
      {/* Summary */}
      <div style={{ background: "#111", borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          {[
            { label: header?.home?.name, val: h2h.home_wins, col: "#10b981" },
            { label: "Draws", val: h2h.draws, col: "#6b7280" },
            { label: header?.away?.name, val: h2h.away_wins, col: "#60a5fa" },
          ].map(({ label, val, col }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: col }}>{val}</div>
              <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", height: 5, borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: `${h2h.home_wins / total * 100}%`, background: "#10b981" }} />
          <div style={{ width: `${h2h.draws / total * 100}%`, background: "#374151" }} />
          <div style={{ width: `${h2h.away_wins / total * 100}%`, background: "#60a5fa" }} />
        </div>
      </div>

      {/* Results list */}
      {(h2h.results || []).map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #111" }}>
          <div style={{ fontSize: 10, color: "#4b5563", width: 52, flexShrink: 0 }}>{r.date}</div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
            <span style={{ fontSize: 12, color: "#e2e8f0", textAlign: "right" }}>{r.home_team}</span>
          </div>
          <div style={{ background: "#1a1a1a", borderRadius: 6, padding: "4px 10px", fontWeight: 800, fontSize: 13, color: "#fff", flexShrink: 0 }}>
            {r.home_goals} – {r.away_goals}
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, color: "#e2e8f0" }}>{r.away_team}</span>
          </div>
          <div style={{ fontSize: 9, color: "#4b5563", width: 60, textAlign: "right", flexShrink: 0, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{r.league}</div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INJURIES TAB
// ─────────────────────────────────────────────────────────────────────────────
function InjuriesTab({ injuries, header }) {
  const home = injuries?.home || [];
  const away = injuries?.away || [];
  if (home.length === 0 && away.length === 0) {
    return <div style={{ textAlign: "center", padding: "40px 0", color: "#6b7280" }}>No injury report available</div>;
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {[{ name: header?.home?.name, list: home, col: "#10b981" }, { name: header?.away?.name, list: away, col: "#60a5fa" }].map(({ name, list, col }) => (
        <div key={name}>
          <h4 style={{ fontSize: 12, fontWeight: 700, color: col, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{name}</h4>
          {list.length === 0 && <p style={{ fontSize: 12, color: "#4b5563", margin: 0 }}>No injuries reported</p>}
          {list.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid #111" }}>
              {p.player_photo ? <img src={p.player_photo} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", background: "#1a1a1a" }} /> : <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🏥</div>}
              <div>
                <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600 }}>{p.player_name}</div>
                <div style={{ fontSize: 10, color: "#ef4444" }}>{p.type || p.reason || "Injured"}</div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODEL TAB
// ─────────────────────────────────────────────────────────────────────────────
function ProbBar({ label, prob, color }) {
  const p = Math.round((prob || 0) * 100);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>{label}</span>
        <span style={{ fontSize: 16, fontWeight: 800, color }}>{p}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "#1a1a1a", overflow: "hidden" }}>
        <div style={{ width: `${p}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

function ModelTab({ prediction, header }) {
  const pred = prediction || {};
  if (!pred.p_home_win && !pred.home_win_prob) {
    return <div style={{ textAlign: "center", padding: "40px 0", color: "#6b7280" }}>No model prediction available for this fixture</div>;
  }
  const hp = pred.p_home_win || pred.home_win_prob || 0;
  const dp = pred.p_draw    || pred.draw_prob    || 0;
  const ap = pred.p_away_win|| pred.away_win_prob|| 0;

  return (
    <div>
      <div style={{ background: "#111", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <h4 style={{ margin: "0 0 16px", fontSize: 11, color: "#6b7280", letterSpacing: "0.1em", textTransform: "uppercase" }}>Win Probability</h4>
        <ProbBar label={header?.home?.name} prob={hp} color="#10b981" />
        <ProbBar label="Draw" prob={dp} color="#6b7280" />
        <ProbBar label={header?.away?.name} prob={ap} color="#60a5fa" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { label: "xG Home",     val: pred.xg_home || pred.expected_home_goals, fmt: v => Number(v).toFixed(2), col: "#10b981" },
          { label: "xG Away",     val: pred.xg_away || pred.expected_away_goals, fmt: v => Number(v).toFixed(2), col: "#60a5fa" },
          { label: "Over 2.5",    val: pred.over_2_5,   fmt: v => pct(v), col: "#f59e0b" },
          { label: "Over 3.5",    val: pred.over_3_5,   fmt: v => pct(v), col: "#f59e0b" },
          { label: "BTTS",        val: pred.btts,        fmt: v => pct(v), col: "#a78bfa" },
          { label: "Home Clean Sheet", val: pred.home_clean_sheet, fmt: v => pct(v), col: "#34d399" },
          { label: "Away Clean Sheet", val: pred.away_clean_sheet, fmt: v => pct(v), col: "#93c5fd" },
          { label: "Confidence",  val: pred.confidence,  fmt: v => `${v}%`, col: "#fbbf24" },
        ].filter(x => x.val != null).map(({ label, val, fmt, col }) => (
          <div key={label} style={{ background: "#111", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: col }}>{fmt(val)}</div>
          </div>
        ))}
      </div>

      {pred.top_scores && (
        <div style={{ background: "#111", borderRadius: 12, padding: 16 }}>
          <h4 style={{ margin: "0 0 12px", fontSize: 11, color: "#6b7280", letterSpacing: "0.1em", textTransform: "uppercase" }}>Most Likely Scores</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {pred.top_scores.slice(0, 9).map((s, i) => (
              <div key={i} style={{ background: i === 0 ? "rgba(16,185,129,0.12)" : "#0d0d0d", borderRadius: 6, padding: "8px 4px", textAlign: "center", border: i === 0 ? "1px solid rgba(16,185,129,0.3)" : "1px solid #1a1a1a" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: i === 0 ? "#10b981" : "#e2e8f0" }}>{s.score}</div>
                <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>{Math.round(s.prob * 100)}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMENTARY / EVENTS TAB
// ─────────────────────────────────────────────────────────────────────────────
function EventIcon({ type, detail }) {
  if (type === "Goal") return "⚽";
  if (type === "Card" && detail?.includes("Red")) return "🟥";
  if (type === "Card") return "🟨";
  if (type === "subst") return "🔄";
  if (type === "Var") return "📺";
  return "•";
}

function CommentaryTab({ events, header }) {
  if (!events || events.length === 0) {
    return <div style={{ textAlign: "center", padding: "40px 0", color: "#6b7280" }}>No match events yet</div>;
  }
  return (
    <div>
      {[...events].reverse().map((e, i) => {
        const isHome = e.team_id === header?.home?.id;
        return (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid #0d0d0d" }}>
            <div style={{ width: 36, flexShrink: 0, textAlign: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>{e.minute}{e.extra ? `+${e.extra}` : ""}′</span>
            </div>
            {isHome && <div style={{ flex: 1 }} />}
            <div style={{ flex: 1, textAlign: isHome ? "right" : "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: isHome ? "flex-end" : "flex-start" }}>
                <span style={{ fontSize: 16 }}><EventIcon type={e.type} detail={e.detail} /></span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{e.player_name}</div>
                  {e.assist_name && <div style={{ fontSize: 10, color: "#6b7280" }}>Assist: {e.assist_name}</div>}
                  {e.detail && <div style={{ fontSize: 10, color: "#4b5563" }}>{e.detail}</div>}
                </div>
              </div>
            </div>
            {!isHome && <div style={{ flex: 1 }} />}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW TAB
// ─────────────────────────────────────────────────────────────────────────────
function FormPill({ result }) {
  return (
    <div style={{ width: 22, height: 22, borderRadius: "50%", background: resultColor(result), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: result === "D" ? "#fff" : "#000" }}>
      {result}
    </div>
  );
}

function PreviewTab({ data }) {
  const { home_recent_form, away_recent_form, insights, header } = data;

  return (
    <div>
      {/* Insights */}
      {insights?.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 12px" }}>Key Insights</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {insights.map((ins, i) => (
              <div key={i} style={{ background: "#0d0d0d", borderRadius: 10, padding: "12px 14px", borderLeft: `3px solid ${severityColor(ins.severity)}` }}>
                <div style={{ display: "flex", align: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14 }}>{ins.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{ins.title}</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>{ins.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent form */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {[
          { name: header?.home?.name, form: home_recent_form, col: "#10b981" },
          { name: header?.away?.name, form: away_recent_form, col: "#60a5fa" },
        ].map(({ name, form, col }) => (
          <div key={name} style={{ background: "#0d0d0d", borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: col, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{name}</div>
            <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
              {(form || []).slice(0, 5).map((r, i) => <FormPill key={i} result={r.result} />)}
            </div>
            {(form || []).slice(0, 5).map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #111", fontSize: 11 }}>
                <span style={{ color: "#4b5563" }}>{r.home_away} {r.opponent}</span>
                <span style={{ fontWeight: 700, color: resultColor(r.result) }}>{r.goals_for}–{r.goals_against}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RIGHT RAIL
// ─────────────────────────────────────────────────────────────────────────────
function RightRail({ data }) {
  const { prediction, venue, header, home_season_stats, away_season_stats, insights } = data;
  const pred = prediction || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Win probabilities */}
      {(pred.p_home_win || pred.home_win_prob) && (
        <div style={{ background: "#0d0d0d", borderRadius: 10, padding: 14, border: "1px solid #1a1a1a" }}>
          <h5 style={{ margin: "0 0 10px", fontSize: 10, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.08em" }}>Model Probability</h5>
          {[
            { label: header?.home?.name, val: pred.p_home_win || pred.home_win_prob || 0, col: "#10b981" },
            { label: "Draw",             val: pred.p_draw || pred.draw_prob || 0, col: "#6b7280" },
            { label: header?.away?.name, val: pred.p_away_win || pred.away_win_prob || 0, col: "#60a5fa" },
          ].map(({ label, val, col }) => (
            <div key={label} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100 }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: col }}>{Math.round(val * 100)}%</span>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: "#1a1a1a" }}>
                <div style={{ width: `${Math.round(val * 100)}%`, height: "100%", background: col, borderRadius: 2 }} />
              </div>
            </div>
          ))}
          {pred.confidence && <div style={{ marginTop: 8, fontSize: 10, color: "#4b5563", textAlign: "right" }}>Confidence: <span style={{ color: "#f59e0b" }}>{pred.confidence}%</span></div>}
        </div>
      )}

      {/* Quick markets */}
      {pred.btts != null && (
        <div style={{ background: "#0d0d0d", borderRadius: 10, padding: 14, border: "1px solid #1a1a1a" }}>
          <h5 style={{ margin: "0 0 10px", fontSize: 10, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.08em" }}>Markets</h5>
          {[
            { label: "Over 2.5", val: pred.over_2_5 },
            { label: "BTTS",     val: pred.btts },
            { label: "Over 3.5", val: pred.over_3_5 },
          ].filter(x => x.val != null).map(({ label, val }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #111", fontSize: 12 }}>
              <span style={{ color: "#9ca3af" }}>{label}</span>
              <span style={{ fontWeight: 700, color: val >= 0.6 ? "#10b981" : val >= 0.4 ? "#f59e0b" : "#9ca3af" }}>{pct(val)}</span>
            </div>
          ))}
          {pred.most_likely_score && (
            <div style={{ marginTop: 10, textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Most Likely Score</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#e2e8f0" }}>{pred.most_likely_score}</div>
            </div>
          )}
        </div>
      )}

      {/* Venue */}
      {venue?.name && (
        <div style={{ background: "#0d0d0d", borderRadius: 10, padding: 14, border: "1px solid #1a1a1a" }}>
          <h5 style={{ margin: "0 0 10px", fontSize: 10, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.08em" }}>Venue</h5>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>{venue.name}</div>
          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>{venue.city}{venue.country ? `, ${venue.country}` : ""}</div>
          {[
            { label: "Capacity", val: venue.capacity?.toLocaleString() },
            { label: "Surface",  val: venue.surface },
          ].filter(x => x.val).map(({ label, val }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "3px 0" }}>
              <span style={{ color: "#4b5563" }}>{label}</span>
              <span style={{ color: "#9ca3af", textTransform: "capitalize" }}>{val}</span>
            </div>
          ))}
        </div>
      )}

      {/* Season stats snapshot */}
      {(home_season_stats?.played || away_season_stats?.played) && (
        <div style={{ background: "#0d0d0d", borderRadius: 10, padding: 14, border: "1px solid #1a1a1a" }}>
          <h5 style={{ margin: "0 0 10px", fontSize: 10, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.08em" }}>Season Form</h5>
          {[
            { name: header?.home?.name, stats: home_season_stats, col: "#10b981" },
            { name: header?.away?.name, stats: away_season_stats, col: "#60a5fa" },
          ].map(({ name, stats, col }) => (
            <div key={name} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: col, marginBottom: 4 }}>{name}</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { label: "P", val: stats?.played },
                  { label: "W", val: stats?.wins },
                  { label: "D", val: stats?.draws },
                  { label: "L", val: stats?.losses },
                ].filter(x => x.val != null).map(({ label, val }) => (
                  <div key={label} style={{ textAlign: "center", flex: 1, background: "#111", borderRadius: 5, padding: "4px 0" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#e2e8f0" }}>{val}</div>
                    <div style={{ fontSize: 9, color: "#4b5563" }}>{label}</div>
                  </div>
                ))}
              </div>
              {stats?.goals_for_avg && (
                <div style={{ fontSize: 10, color: "#4b5563", marginTop: 4 }}>
                  Avg goals: <span style={{ color: "#9ca3af" }}>{stats.goals_for_avg} scored / {stats.goals_against_avg} conceded</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Top 3 insights */}
      {insights?.length > 0 && (
        <div style={{ background: "#0d0d0d", borderRadius: 10, padding: 14, border: "1px solid #1a1a1a" }}>
          <h5 style={{ margin: "0 0 10px", fontSize: 10, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.08em" }}>Insights</h5>
          {insights.slice(0, 3).map((ins, i) => (
            <div key={i} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: i < 2 ? "1px solid #111" : "none" }}>
              <span style={{ fontSize: 12 }}>{ins.icon}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0" }}>{ins.title}</div>
                <div style={{ fontSize: 10, color: "#4b5563", lineHeight: 1.4 }}>{ins.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO HEADER
// ─────────────────────────────────────────────────────────────────────────────
function MatchHero({ header, isLive, elapsed }) {
  const score = header?.score || {};
  const countdown = fmtCountdown(header?.date);

  return (
    <div style={{ background: "linear-gradient(180deg,#0a0a0a 0%,#111 100%)", padding: "28px 24px 20px", borderBottom: "1px solid #1a1a1a" }}>
      {/* League + round */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
        {header?.league?.logo && <img src={header.league.logo} alt="" style={{ height: 16, objectFit: "contain" }} />}
        <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {header?.league?.name}
          {header?.league?.round && <span style={{ color: "#4b5563" }}> · {header.league.round}</span>}
        </span>
        {isLive && (
          <span style={{ background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4, letterSpacing: "0.06em", animation: "pulse 1.5s infinite" }}>LIVE</span>
        )}
      </div>

      {/* Teams + score */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, maxWidth: 560, margin: "0 auto" }}>
        {/* Home */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          {header?.home?.logo && <img src={header.home.logo} alt="" style={{ height: 52, objectFit: "contain" }} />}
          <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", textAlign: "center", lineHeight: 1.3 }}>{header?.home?.name}</span>
        </div>

        {/* Score block */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
          {(isLive || score.home != null) ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 42, fontWeight: 900, color: "#fff", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{score.home ?? "—"}</span>
                <span style={{ fontSize: 28, color: "#374151", fontWeight: 300 }}>–</span>
                <span style={{ fontSize: 42, fontWeight: 900, color: "#fff", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{score.away ?? "—"}</span>
              </div>
              {isLive && elapsed && (
                <div style={{ fontSize: 12, color: "#10b981", fontWeight: 700, marginTop: 4 }}>{elapsed}′</div>
              )}
              {score.ht_home != null && (
                <div style={{ fontSize: 10, color: "#4b5563", marginTop: 4 }}>HT: {score.ht_home}–{score.ht_away}</div>
              )}
            </>
          ) : countdown ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Kicks off in</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#f59e0b" }}>{countdown}</div>
              <div style={{ fontSize: 11, color: "#4b5563", marginTop: 4 }}>{fmtDate(header?.date)} · {fmtTime(header?.date)}</div>
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, color: "#4b5563" }}>vs</div>
              <div style={{ fontSize: 11, color: "#4b5563", marginTop: 6 }}>{fmtDate(header?.date)}</div>
              <div style={{ fontSize: 13, color: "#9ca3af", fontWeight: 600 }}>{fmtTime(header?.date)}</div>
            </div>
          )}
        </div>

        {/* Away */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          {header?.away?.logo && <img src={header.away.logo} alt="" style={{ height: 52, objectFit: "contain" }} />}
          <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", textAlign: "center", lineHeight: 1.3 }}>{header?.away?.name}</span>
        </div>
      </div>

      {/* Venue + referee */}
      <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
        {header?.venue_name && (
          <span style={{ fontSize: 11, color: "#4b5563" }}>📍 {header.venue_name}{header.venue_city ? `, ${header.venue_city}` : ""}</span>
        )}
        {header?.referee && (
          <span style={{ fontSize: 11, color: "#4b5563" }}>🧑‍⚖️ {header.referee}</span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
const SESSION_CACHE: Record<string, { data: any; ts: number }> = {};
const CACHE_TTL = 5 * 60 * 1000;

export default function MatchIntelligencePage() {
  const { fixtureId } = useParams();
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [activeTab, setActiveTab] = useState("preview");
  const tabBarRef = useRef(null);

  useEffect(() => {
    if (!fixtureId) return;
    const cacheKey = `mi_v2_${fixtureId}`;
    const cached = SESSION_CACHE[cacheKey];
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setData(cached.data); setLoading(false); return;
    }
    setLoading(true); setError(null);
    fetch(`${API_BASE}/api/match-intelligence/${fixtureId}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => {
        SESSION_CACHE[cacheKey] = { data: d, ts: Date.now() };
        setData(d); setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [fixtureId]);

  // Auto-switch to commentary for live matches
  useEffect(() => {
    if (data && LIVE_STATUSES.includes(data.header?.status_short)) {
      setActiveTab("commentary");
    }
  }, [data]);

  const isLive = data && LIVE_STATUSES.includes(data.header?.status_short);

  // Available tabs based on data
  const availableTabs = TABS.filter(t => {
    if (t.id === "commentary") return data?.events?.length > 0;
    if (t.id === "stats")      return data?.statistics && Object.values(data.statistics).some(v => v?.home != null);
    if (t.id === "model")      return data?.prediction && Object.keys(data.prediction).length > 0;
    return true;
  });

  function renderTabContent() {
    if (!data) return null;
    switch (activeTab) {
      case "preview":    return <PreviewTab data={data} />;
      case "commentary": return <CommentaryTab events={data.events} header={data.header} />;
      case "lineups":    return <LineupsTab lineups={data.lineups} header={data.header} />;
      case "stats":      return <StatsTab statistics={data.statistics} header={data.header} />;
      case "h2h":        return <H2HTab h2h={data.h2h} header={data.header} />;
      case "injuries":   return <InjuriesTab injuries={data.injuries} header={data.header} />;
      case "model":      return <ModelTab prediction={data.prediction} header={data.header} />;
      default:           return null;
    }
  }

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .mi-tab { background: none; border: none; cursor: pointer; padding: 10px 14px; font-size: 12px; font-weight: 600; color: #4b5563; transition: color 0.2s; white-space: nowrap; border-bottom: 2px solid transparent; }
        .mi-tab:hover { color: #9ca3af; }
        .mi-tab.active { color: #e2e8f0; border-bottom-color: #10b981; }
        .mi-content { animation: fadeIn 0.2s ease; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#000", paddingTop: 86, color: "#e2e8f0", fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif" }}>

        {/* Back button */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 16px 0" }}>
          <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6, padding: 0 }}>
            ← Back
          </button>
        </div>

        {loading && (
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px" }}>
            {/* Header skeleton */}
            <div style={{ padding: "28px 24px 20px", borderBottom: "1px solid #1a1a1a" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><Skeleton w={120} h={14} /></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 560, margin: "0 auto" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}><Skeleton w={52} h={52} r={50} /><Skeleton w={90} h={14} /></div>
                <Skeleton w={120} h={40} />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}><Skeleton w={52} h={52} r={50} /><Skeleton w={90} h={14} /></div>
              </div>
            </div>
            <div style={{ padding: 24, display: "flex", gap: 24 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                {[1,2,3,4].map(i => <Skeleton key={i} h={80} />)}
              </div>
              <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 12 }}>
                {[1,2,3].map(i => <Skeleton key={i} h={100} />)}
              </div>
            </div>
          </div>
        )}

        {error && !loading && (
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <p style={{ color: "#6b7280" }}>Failed to load match data: {error}</p>
            <button onClick={() => window.location.reload()} style={{ marginTop: 12, background: "#10b981", border: "none", borderRadius: 8, padding: "10px 20px", color: "#000", fontWeight: 700, cursor: "pointer" }}>Retry</button>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Hero */}
            <MatchHero header={data.header} isLive={isLive} elapsed={data.header?.elapsed} />

            {/* Tab bar */}
            <div ref={tabBarRef} style={{ background: "#0a0a0a", borderBottom: "1px solid #1a1a1a", position: "sticky", top: 48, zIndex: 40 }}>
              <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px", overflowX: "auto", display: "flex", scrollbarWidth: "none" }}>
                {availableTabs.map(t => (
                  <button key={t.id} className={`mi-tab${activeTab === t.id ? " active" : ""}`} onClick={() => setActiveTab(t.id)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px" }}>
              <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>

                {/* Main content */}
                <div className="mi-content" key={activeTab} style={{ flex: 1, minWidth: 0 }}>
                  {renderTabContent()}
                </div>

                {/* Right rail (desktop only) */}
                <div style={{ width: 280, flexShrink: 0, display: "none" }} className="mi-rail">
                  <RightRail data={data} />
                </div>
              </div>

              {/* Mobile right rail */}
              <div style={{ marginTop: 24 }} className="mi-rail-mobile">
                <h3 style={{ fontSize: 11, fontWeight: 700, color: "#4b5563", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 14px" }}>Match Info</h3>
                <RightRail data={data} />
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @media (min-width: 900px) {
          .mi-rail { display: flex !important; flex-direction: column; }
          .mi-rail-mobile { display: none !important; }
        }
      `}</style>
    </>
  );
}