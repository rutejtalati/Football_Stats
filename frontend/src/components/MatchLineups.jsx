// ═══════════════════════════════════════════════════════════════════════
// MatchLineups.jsx
//
// Fetches /api/match-lineup/{fixture_id} and renders:
//   • Pitch (both teams on same pitch)
//   • Bench lists
//   • Injury / doubt panels
//   • Coach info
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import Pitch from "./Pitch";

const API = import.meta.env.VITE_API_URL || "https://football-stats-lw4b.onrender.com";

// ── helpers ──────────────────────────────────────────────────────────

function FormBadge({ result }) {
  const cfg = {
    W: { bg: "#16a34a", color: "#fff" },
    D: { bg: "#ca8a04", color: "#fff" },
    L: { bg: "#dc2626", color: "#fff" },
  };
  const s = cfg[result] || { bg: "#334155", color: "#94a3b8" };
  return (
    <span style={{
      display:        "inline-flex",
      alignItems:     "center",
      justifyContent: "center",
      width:          18, height: 18,
      borderRadius:   4,
      background:     s.bg,
      color:          s.color,
      fontSize:       9, fontWeight: 900,
    }}>
      {result}
    </span>
  );
}

function InjuryItem({ player, isLast }) {
  const [imgErr, setImgErr] = useState(false);
  const icon = player.status === "suspended" ? "🟨" : "❌";
  return (
    <div style={{
      display:       "flex",
      alignItems:    "center",
      gap:           8,
      padding:       "6px 0",
      borderBottom:  isLast ? "none" : "1px solid rgba(255,255,255,0.05)",
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: "50%",
        background: "rgba(255,255,255,0.06)",
        overflow: "hidden", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, color: "rgba(255,255,255,0.4)",
      }}>
        {player.photo && !imgErr ? (
          <img src={player.photo} alt={player.name}
            style={{ width:"100%", height:"100%", objectFit:"cover" }}
            onError={() => setImgErr(true)} />
        ) : "?"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize:10, fontWeight:700, color:"#c8d8f0",
          overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
          {icon} {player.name}
        </div>
        {player.reason && (
          <div style={{ fontSize:8, color:"rgba(200,210,230,0.45)", marginTop:1 }}>
            {player.reason}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamInjuries({ team, injuries, doubts }) {
  const all = [
    ...(injuries || []),
    ...(doubts   || []),
  ];
  if (all.length === 0) return null;

  return (
    <div style={{
      background:   "rgba(255,255,255,0.03)",
      border:       "1px solid rgba(255,255,255,0.07)",
      borderRadius: 10,
      padding:      "10px 12px",
      flex:         1,
      minWidth:     0,
    }}>
      <div style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,0.4)",
        letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>
        {team} — Unavailable
      </div>
      {all.map((p, i) => (
        <InjuryItem key={p.id ?? i} player={p} isLast={i === all.length - 1} />
      ))}
    </div>
  );
}

function CoachCard({ name, photo, teamName, color }) {
  const [imgErr, setImgErr] = useState(false);
  if (!name) return null;
  return (
    <div style={{
      display:      "flex",
      alignItems:   "center",
      gap:          8,
      padding:      "6px 10px",
      background:   "rgba(255,255,255,0.04)",
      borderRadius: 8,
      border:       `1px solid ${color}22`,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        border: `1.5px solid ${color}55`,
        overflow: "hidden", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.4)", fontSize: 11, color,
      }}>
        {photo && !imgErr ? (
          <img src={photo} alt={name}
            style={{ width:"100%", height:"100%", objectFit:"cover" }}
            onError={() => setImgErr(true)} />
        ) : "👔"}
      </div>
      <div>
        <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)", letterSpacing:"0.08em" }}>
          MANAGER
        </div>
        <div style={{ fontSize:11, fontWeight:800, color }}>
          {name}
        </div>
      </div>
    </div>
  );
}

function LineupColumn({ team, color }) {
  if (!team) return null;
  return (
    <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:8 }}>
      {/* Coach */}
      <CoachCard
        name={team.coach}
        photo={team.coach_photo}
        teamName={team.team_name}
        color={color}
      />

      {/* Recent form */}
      {team.recent_form?.length > 0 && (
        <div style={{ display:"flex", gap:3, alignItems:"center" }}>
          <span style={{ fontSize:8, color:"rgba(255,255,255,0.3)", marginRight:2 }}>FORM</span>
          {team.recent_form.map((r, i) => <FormBadge key={i} result={r} />)}
        </div>
      )}

      {/* Starting XI list */}
      <div style={{
        background:   "rgba(255,255,255,0.03)",
        border:       "1px solid rgba(255,255,255,0.07)",
        borderRadius: 10,
        overflow:     "hidden",
      }}>
        <div style={{
          padding:     "7px 12px",
          fontSize:    9, fontWeight:800,
          color:       "rgba(255,255,255,0.4)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          Starting XI
        </div>
        {(team.starting_xi || []).map((p, i) => (
          <PlayerRow key={p.id ?? i} player={p} color={color}
            isLast={i === (team.starting_xi?.length ?? 1) - 1} />
        ))}
      </div>

      {/* Bench list */}
      {(team.bench || []).length > 0 && (
        <div style={{
          background:   "rgba(255,255,255,0.02)",
          border:       "1px solid rgba(255,255,255,0.05)",
          borderRadius: 10,
          overflow:     "hidden",
        }}>
          <div style={{
            padding:     "7px 12px",
            fontSize:    9, fontWeight:800,
            color:       "rgba(255,255,255,0.3)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}>
            Bench
          </div>
          {(team.bench || []).map((p, i) => (
            <PlayerRow key={p.id ?? i} player={p} color={color}
              isLast={i === (team.bench?.length ?? 1) - 1}
              isBench />
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerRow({ player, color, isLast, isBench }) {
  const [imgErr, setImgErr] = useState(false);
  const rating = player.rating ? Number(player.rating) : null;
  const ratingColor = rating
    ? rating >= 7.5 ? "#34d399" : rating >= 6.5 ? "#f59e0b" : "#64748b"
    : null;

  return (
    <div style={{
      display:      "flex",
      alignItems:   "center",
      gap:          8,
      padding:      "5px 12px",
      borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.04)",
      opacity:      isBench ? 0.7 : 1,
    }}>
      {/* Number */}
      <div style={{
        width: 18, fontSize:9, fontWeight:800,
        color: `${color}99`, textAlign:"right", flexShrink:0,
      }}>
        {player.number ?? ""}
      </div>

      {/* Photo */}
      <div style={{
        width:24, height:24, borderRadius:"50%",
        border:`1.5px solid ${color}44`,
        background:"rgba(0,0,0,0.5)",
        overflow:"hidden", flexShrink:0,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:9, color,
      }}>
        {player.photo && !imgErr ? (
          <img src={player.photo} alt={player.name}
            style={{ width:"100%", height:"100%", objectFit:"cover" }}
            onError={() => setImgErr(true)} />
        ) : (player.name?.[0] || "?")}
      </div>

      {/* Name */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{
          fontSize:10, fontWeight:isBench ? 600 : 800,
          color: isBench ? "rgba(200,215,240,0.6)" : "#deeeff",
          overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis",
        }}>
          {player.name}
        </div>
        <div style={{ fontSize:8, color:"rgba(150,170,200,0.4)", marginTop:1 }}>
          {player.pos}
        </div>
      </div>

      {/* Rating */}
      {rating && (
        <div style={{
          fontSize:10, fontWeight:900, color: ratingColor, flexShrink:0,
        }}>
          {rating.toFixed(1)}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

export default function MatchLineups({ fixtureId }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!fixtureId) return;
    setLoading(true);
    setError(null);
    fetch(`${API}/api/match-lineup/${fixtureId}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [fixtureId]);

  if (loading) return (
    <div style={{
      padding:        40,
      textAlign:      "center",
      color:          "rgba(255,255,255,0.3)",
      fontSize:       13,
    }}>
      Loading lineups…
    </div>
  );

  if (error) return (
    <div style={{
      padding:      20, borderRadius:10,
      background:   "rgba(220,38,38,0.1)",
      border:       "1px solid rgba(220,38,38,0.2)",
      color:        "#f87171", fontSize:12,
    }}>
      Failed to load lineups: {error}
    </div>
  );

  if (!data) return null;

  const { home, away, mode } = data;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* ── Mode badge ── */}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{
          fontSize:   9, fontWeight:900, letterSpacing:"0.1em",
          textTransform:"uppercase",
          color:      mode === "official" ? "#34d399" : "#f59e0b",
          background: mode === "official" ? "rgba(52,211,153,0.12)" : "rgba(245,158,11,0.12)",
          padding:    "2px 8px", borderRadius:999,
        }}>
          {mode === "official" ? "✓ Official Lineup" : "⚡ AI Predicted Lineup"}
        </span>
      </div>

      {/* ── Pitch (both teams) ── */}
      <Pitch home={home} away={away} mode={mode} />

      {/* ── Player lists side by side ── */}
      <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
        <LineupColumn team={home} color="#60a5fa" />
        <LineupColumn team={away} color="#fb923c" />
      </div>

      {/* ── Injuries / doubts ── */}
      {((home?.injuries?.length > 0 || home?.doubts?.length > 0) ||
        (away?.injuries?.length > 0 || away?.doubts?.length > 0)) && (
        <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
          <TeamInjuries
            team={home?.team_name}
            injuries={home?.injuries}
            doubts={home?.doubts}
          />
          <TeamInjuries
            team={away?.team_name}
            injuries={away?.injuries}
            doubts={away?.doubts}
          />
        </div>
      )}
    </div>
  );
}