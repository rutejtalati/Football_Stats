// ═════════════════════════════════════════════════════
// MatchLineups.jsx  –  FotMob-style Lineups tab
// Handles predicted + official modes
// ═════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import Pitch from "./Pitch";
import { posColor } from "../utils/formationMap";

const BACKEND = "https://football-stats-lw4b.onrender.com";

// ─────────────────────────────────────────────
// Injury / Doubt row
// ─────────────────────────────────────────────

function InjuryRow({ player }) {
  const isInjured   = player.status === "injured"   || player.type === "Injury";
  const isSuspended = player.status === "suspended";
  const isDoubtful  = player.status === "doubtful";

  const icon  = isInjured ? "❌" : isSuspended ? "🟥" : "❓";
  const color = isInjured ? "#ff5252" : isSuspended ? "#f59e0b" : "#9fb4d6";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 12px",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
    }}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      {player.photo && (
        <img src={player.photo} style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }}
          onError={e => e.currentTarget.style.display = "none"} />
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color }}>
          {player.name}
        </div>
        {player.reason && (
          <div style={{ fontSize: 10, color: "#3a5070", marginTop: 1 }}>
            {player.reason}
          </div>
        )}
      </div>
      <span style={{
        fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
        color: color,
        opacity: 0.7,
        textTransform: "uppercase",
      }}>
        {isInjured ? "Injured" : isSuspended ? "Suspended" : "Doubtful"}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Bench player row
// ─────────────────────────────────────────────

function BenchRow({ player, color }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "7px 12px",
      borderBottom: "1px solid rgba(255,255,255,0.03)",
      transition: "background 0.15s",
      borderRadius: 6,
    }}
    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      {/* Jersey number */}
      <div style={{
        width: 22, height: 22, borderRadius: "50%",
        background: color + "22",
        border: `1.5px solid ${color}55`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 900, color,
        flexShrink: 0,
      }}>
        {player.number || "—"}
      </div>

      {/* Photo */}
      {player.photo && (
        <img src={player.photo} style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
          onError={e => e.currentTarget.style.display = "none"} />
      )}

      {/* Name + pos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#c8d8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {player.name}
        </div>
        <div style={{ fontSize: 9, color: "#3a5070", fontWeight: 700, marginTop: 1 }}>
          {player.pos}
        </div>
      </div>

      {/* Rating */}
      {player.rating && (
        <div style={{
          fontSize: 11, fontWeight: 900,
          color: player.rating >= 7.5 ? "#34d399" : player.rating >= 6.5 ? "#f59e0b" : "#6b7fa3",
        }}>
          {Number(player.rating).toFixed(1)}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Team panel (bench + injuries)
// ─────────────────────────────────────────────

function TeamPanel({ team, color, mode }) {
  const injuries    = team?.injuries      || [];
  const doubts      = team?.doubts        || [];
  const bench       = team?.bench         || [];
  const coach       = team?.coach;

  return (
    <div style={{
      background: "linear-gradient(160deg,#0d1525,#080e1a)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 14,
      overflow: "hidden",
    }}>
      {/* Coach */}
      {coach && (
        <div style={{
          padding: "10px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 10, color: "#3a5070", fontWeight: 700 }}>COACH</span>
          {team.coach_photo && (
            <img src={team.coach_photo} style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }}
              onError={e => e.currentTarget.style.display = "none"} />
          )}
          <span style={{ fontSize: 12, fontWeight: 800, color: "#9fb4d6" }}>{coach}</span>
        </div>
      )}

      {/* Injuries/doubts — shown in predicted mode */}
      {mode === "predicted" && (injuries.length > 0 || doubts.length > 0) && (
        <div>
          <div style={{
            padding: "8px 12px 4px",
            fontSize: 9, fontWeight: 900, letterSpacing: "0.1em",
            color: "#3a5070", textTransform: "uppercase",
          }}>
            Injuries / Doubts
          </div>
          {injuries.map((p, i) => <InjuryRow key={i} player={{ ...p, status: "injured" }} />)}
          {doubts.map((p, i) => <InjuryRow key={i} player={{ ...p, status: "doubtful" }} />)}
        </div>
      )}

      {/* Bench */}
      {bench.length > 0 && (
        <div>
          <div style={{
            padding: "8px 12px 4px",
            fontSize: 9, fontWeight: 900, letterSpacing: "0.1em",
            color: "#3a5070", textTransform: "uppercase",
          }}>
            {mode === "predicted" ? "Expected Bench" : "Bench"}
          </div>
          {bench.map((p, i) => (
            <BenchRow key={i} player={p} color={color} />
          ))}
        </div>
      )}

      {bench.length === 0 && injuries.length === 0 && doubts.length === 0 && (
        <div style={{ padding: "16px 12px", color: "#2e3d52", fontSize: 12, textAlign: "center" }}>
          No data available.
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Mode banner
// ─────────────────────────────────────────────

function ModeBanner({ mode, announcedAt }) {
  if (mode === "official") {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 14px",
        background: "rgba(52,211,153,0.08)",
        border: "1px solid rgba(52,211,153,0.15)",
        borderRadius: 10, marginBottom: 14,
      }}>
        <span style={{ color: "#34d399", fontSize: 14 }}>✓</span>
        <div>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#34d399" }}>
            Official Lineups Confirmed
          </span>
          {announcedAt && (
            <span style={{ fontSize: 10, color: "#4a6080", marginLeft: 8 }}>
              {new Date(announcedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 14px",
      background: "rgba(245,158,11,0.06)",
      border: "1px solid rgba(245,158,11,0.15)",
      borderRadius: 10, marginBottom: 14,
    }}>
      <span style={{ color: "#f59e0b", fontSize: 14 }}>⏳</span>
      <div>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#f59e0b" }}>
          Predicted Lineup
        </span>
        <span style={{ fontSize: 10, color: "#4a6080", marginLeft: 8 }}>
          Official XI announced ~45 min before kickoff
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main MatchLineups component
// ─────────────────────────────────────────────

export default function MatchLineups({ fixtureId, headerData }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [view,    setView]    = useState("pitch"); // "pitch" | "home" | "away"

  useEffect(() => {
    if (!fixtureId) return;
    setLoading(true);
    setError(null);

    fetch(`${BACKEND}/api/match-lineup/${fixtureId}`)
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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0", gap: 14 }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          border: "2px solid rgba(96,165,250,0.2)", borderTopColor: "#60a5fa",
          animation: "spin 0.8s linear infinite",
        }} />
        <div style={{ color: "#3a5070", fontSize: 12 }}>Loading lineups…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        color: "#ff5252", fontSize: 12,
        background: "rgba(255,82,82,0.06)",
        border: "1px solid rgba(255,82,82,0.15)",
        borderRadius: 10, padding: "12px 16px",
      }}>
        Failed to load lineups: {error}
      </div>
    );
  }

  if (!data) return null;

  const { mode, home, away } = data;

  // Tab styles
  const tabStyle = (active) => ({
    padding: "6px 16px",
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    fontSize: 11, fontWeight: 700,
    background: active ? "rgba(96,165,250,0.12)" : "transparent",
    color: active ? "#60a5fa" : "#3a5070",
    transition: "all 0.15s",
  });

  return (
    <div>
      <ModeBanner mode={mode} announcedAt={data.announced_at} />

      {/* View tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[
          { id: "pitch", label: "Pitch View" },
          { id: "home",  label: home?.team_name || "Home" },
          { id: "away",  label: away?.team_name || "Away" },
        ].map(t => (
          <button key={t.id} style={tabStyle(view === t.id)} onClick={() => setView(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Pitch view */}
      {view === "pitch" && (
        <div>
          <Pitch home={home} away={away} mode={mode} />

          {/* Both benches below pitch */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
            <TeamPanel team={home} color="#60a5fa" mode={mode} />
            <TeamPanel team={away} color="#f97316" mode={mode} />
          </div>
        </div>
      )}

      {/* Home detail view */}
      {view === "home" && (
        <TeamDetailView team={home} color="#60a5fa" mode={mode} />
      )}

      {/* Away detail view */}
      {view === "away" && (
        <TeamDetailView team={away} color="#f97316" mode={mode} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Full team detail view (starting XI list)
// ─────────────────────────────────────────────

function TeamDetailView({ team, color, mode }) {
  const xi       = team?.starting_xi || [];
  const bench    = team?.bench       || [];
  const injuries = team?.injuries    || [];
  const doubts   = team?.doubts      || [];

  const byPos = (arr, posGroup) => arr.filter(p => {
    const pos = (p.pos || "").toUpperCase();
    if (posGroup === "GK")  return pos === "GK";
    if (posGroup === "DEF") return ["CB","LB","RB","LWB","RWB","DEF"].includes(pos);
    if (posGroup === "MID") return ["CM","CDM","CAM","LM","RM","MID","DM","AM"].includes(pos);
    if (posGroup === "FWD") return ["ST","LW","RW","CF","SS","FWD","ATT"].includes(pos);
    return false;
  });

  const sections = [
    { label: "Goalkeeper",  group: "GK"  },
    { label: "Defenders",   group: "DEF" },
    { label: "Midfielders", group: "MID" },
    { label: "Forwards",    group: "FWD" },
  ];

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
      }}>
        {team?.logo && (
          <img src={team.logo} style={{ width: 28, height: 28, objectFit: "contain" }}
            onError={e => e.currentTarget.style.display = "none"} />
        )}
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, color: color }}>{team?.team_name}</div>
          <div style={{ fontSize: 10, color: "#3a5070", marginTop: 2 }}>
            {mode === "predicted" ? "Predicted" : "Official"} · {team?.formation || "—"}
            {team?.coach ? ` · ${team.coach}` : ""}
          </div>
        </div>
      </div>

      {/* Starting XI by position */}
      {sections.map(({ label, group }) => {
        const players = byPos(xi, group);
        if (players.length === 0) return null;
        return (
          <div key={group} style={{ marginBottom: 12 }}>
            <div style={{
              fontSize: 9, fontWeight: 900, letterSpacing: "0.1em",
              color: "#3a5070", textTransform: "uppercase",
              marginBottom: 4,
            }}>
              {label}
            </div>
            {players.map((p, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px",
                background: "linear-gradient(160deg,#0d1525,#080e1a)",
                border: "1px solid rgba(255,255,255,0.04)",
                borderRadius: 10, marginBottom: 4,
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: color + "22", border: `1.5px solid ${color}55`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 900, color,
                  flexShrink: 0,
                }}>
                  {p.number || "—"}
                </div>
                {p.photo && (
                  <img src={p.photo} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }}
                    onError={e => e.currentTarget.style.display = "none"} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#c8d8f0" }}>{p.name}</div>
                  <div style={{ fontSize: 9, color: posColor(p.pos), marginTop: 1 }}>{p.pos}</div>
                </div>
                {p.rating && (
                  <div style={{
                    fontSize: 14, fontWeight: 900,
                    color: p.rating >= 7.5 ? "#34d399" : p.rating >= 6.5 ? "#f59e0b" : "#6b7fa3",
                  }}>
                    {Number(p.rating).toFixed(1)}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {/* Bench */}
      {bench.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{
            fontSize: 9, fontWeight: 900, letterSpacing: "0.1em",
            color: "#3a5070", textTransform: "uppercase", marginBottom: 4,
          }}>
            {mode === "predicted" ? "Expected Bench" : "Bench"}
          </div>
          {bench.map((p, i) => (
            <BenchRow key={i} player={p} color={color} />
          ))}
        </div>
      )}

      {/* Injuries / Doubts */}
      {mode === "predicted" && (injuries.length > 0 || doubts.length > 0) && (
        <div style={{ marginBottom: 12 }}>
          <div style={{
            fontSize: 9, fontWeight: 900, letterSpacing: "0.1em",
            color: "#3a5070", textTransform: "uppercase", marginBottom: 4,
          }}>
            Injuries / Doubts
          </div>
          <div style={{
            background: "linear-gradient(160deg,#0d1525,#080e1a)",
            border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, overflow: "hidden",
          }}>
            {injuries.map((p, i) => <InjuryRow key={i} player={{ ...p, status: "injured" }} />)}
            {doubts.map((p, i) => <InjuryRow key={i} player={{ ...p, status: "doubtful" }} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// Re-export BenchRow for use in TeamDetailView
function BenchRow({ player, color }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "7px 12px",
      background: "linear-gradient(160deg,#0d1525,#080e1a)",
      border: "1px solid rgba(255,255,255,0.04)",
      borderRadius: 8, marginBottom: 4,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: "50%",
        background: color + "22", border: `1.5px solid ${color}55`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 900, color,
        flexShrink: 0,
      }}>
        {player.number || "—"}
      </div>
      {player.photo && (
        <img src={player.photo} style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }}
          onError={e => e.currentTarget.style.display = "none"} />
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#c8d8f0" }}>{player.name}</div>
        <div style={{ fontSize: 9, color: "#3a5070", fontWeight: 700 }}>{player.pos}</div>
      </div>
      {player.rating && (
        <div style={{
          fontSize: 11, fontWeight: 900,
          color: player.rating >= 7.5 ? "#34d399" : player.rating >= 6.5 ? "#f59e0b" : "#6b7fa3",
        }}>
          {Number(player.rating).toFixed(1)}
        </div>
      )}
    </div>
  );
}