// ═════════════════════════════════════════════════════
// MatchLineups.jsx  –  FotMob-style Lineups tab
// Crash-proof · backend-agnostic · debug-ready
// ═════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import Pitch from "./Pitch";
import { posColor } from "../utils/formationMap";

const BACKEND = "https://football-stats-lw4b.onrender.com";


// ═════════════════════════════════════════════════════
// NORMALISATION HELPERS
// ═════════════════════════════════════════════════════

function normalizePlayer(entry) {
  if (!entry) return {};
  const p = entry.player ?? entry;
  const id     = p.id          ?? p.player_id    ?? null;
  const name   = p.name        ?? "";
  const number = p.number      ?? p.shirt_number ?? null;
  const pos    = p.pos         ?? p.position     ?? "";
  const photo  = p.photo       ?? p.image        ?? "";
  const grid   = p.grid        ?? null;
  const rating = p.rating != null ? Number(p.rating) : null;
  if (!grid) console.warn(`[MatchLineups] Player missing grid position: "${name || id}"`);
  return { id, name, number, pos, photo, grid, rating };
}

function normalizeTeam(raw) {
  if (!raw) return null;

  const team_name =
    raw.team_name  ??
    raw.team?.name ??
    raw.name       ??
    "";

  const logo =
    raw.logo       ??
    raw.team?.logo ??
    "";

  const rawXI =
    raw.starting_xi ??
    raw.startXI     ??
    raw.start_xi    ??
    [];

  const starting_xi = Array.isArray(rawXI) ? rawXI.map(normalizePlayer) : [];

  const rawBench =
    raw.bench       ??
    raw.substitutes ??
    raw.subs        ??
    [];

  const bench = Array.isArray(rawBench) ? rawBench.map(normalizePlayer) : [];

  return {
    team_name,
    logo,
    formation:   raw.formation   ?? "",
    coach:       raw.coach       ?? "",
    coach_photo: raw.coach_photo ?? "",
    starting_xi,
    bench,
    injuries:    Array.isArray(raw.injuries)    ? raw.injuries    : [],
    doubts:      Array.isArray(raw.doubts)      ? raw.doubts      : [],
    recent_form: Array.isArray(raw.recent_form) ? raw.recent_form : [],
  };
}


// ═════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═════════════════════════════════════════════════════

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
        <span style={{ fontSize: 11, fontWeight: 800, color: "#f59e0b" }}>Predicted Lineup</span>
        <span style={{ fontSize: 10, color: "#4a6080", marginLeft: 8 }}>
          Official XI announced ~45 min before kickoff
        </span>
      </div>
    </div>
  );
}

function InjuryRow({ player }) {
  if (!player) return null;
  const s     = player.status ?? "injured";
  const isInj = s === "injured" || player.type === "Injury";
  const isSusp = s === "suspended";
  const icon  = isInj ? "❌" : isSusp ? "🟥" : "❓";
  const color = isInj ? "#ff5252" : isSusp ? "#f59e0b" : "#9fb4d6";
  const label = isInj ? "Injured" : isSusp ? "Suspended" : "Doubtful";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 12px",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
    }}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      {player.photo && (
        <img src={player.photo}
          style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }}
          onError={e => (e.currentTarget.style.display = "none")} />
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color }}>{player.name ?? "—"}</div>
        {player.reason && (
          <div style={{ fontSize: 10, color: "#3a5070", marginTop: 1 }}>{player.reason}</div>
        )}
      </div>
      <span style={{ fontSize: 9, fontWeight: 800, color, opacity: 0.7, textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
  );
}

function BenchRow({ player, color }) {
  if (!player) return null;
  const rating = player.rating;
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "7px 12px",
        background: "linear-gradient(160deg,#0d1525,#080e1a)",
        border: "1px solid rgba(255,255,255,0.04)",
        borderRadius: 8, marginBottom: 4,
        transition: "filter 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.15)")}
      onMouseLeave={e => (e.currentTarget.style.filter = "none")}
    >
      <div style={{
        width: 22, height: 22, borderRadius: "50%",
        background: color + "22", border: `1.5px solid ${color}55`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 900, color, flexShrink: 0,
      }}>
        {player.number ?? "—"}
      </div>
      {player.photo && (
        <img src={player.photo}
          style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
          onError={e => (e.currentTarget.style.display = "none")} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: "#c8d8f0",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {player.name || "—"}
        </div>
        <div style={{ fontSize: 9, color: posColor(player.pos ?? ""), fontWeight: 700, marginTop: 1 }}>
          {player.pos ?? ""}
        </div>
      </div>
      {rating != null && (
        <div style={{
          fontSize: 11, fontWeight: 900,
          color: rating >= 7.5 ? "#34d399" : rating >= 6.5 ? "#f59e0b" : "#6b7fa3",
        }}>
          {rating.toFixed(1)}
        </div>
      )}
    </div>
  );
}

function TeamPanel({ team, color, mode }) {
  if (!team) return null;
  const { injuries = [], doubts = [], bench = [], coach, coach_photo } = team;
  return (
    <div style={{
      background: "linear-gradient(160deg,#0d1525,#080e1a)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 14, overflow: "hidden",
    }}>
      {coach && (
        <div style={{
          padding: "10px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 10, color: "#3a5070", fontWeight: 700 }}>COACH</span>
          {coach_photo && (
            <img src={coach_photo}
              style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }}
              onError={e => (e.currentTarget.style.display = "none")} />
          )}
          <span style={{ fontSize: 12, fontWeight: 800, color: "#9fb4d6" }}>{coach}</span>
        </div>
      )}

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

      {bench.length > 0 && (
        <div style={{ padding: "4px 8px 8px" }}>
          <div style={{
            padding: "8px 4px 4px",
            fontSize: 9, fontWeight: 900, letterSpacing: "0.1em",
            color: "#3a5070", textTransform: "uppercase",
          }}>
            {mode === "predicted" ? "Expected Bench" : "Bench"}
          </div>
          {bench.map((p, i) => <BenchRow key={p?.id ?? i} player={p} color={color} />)}
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

function TeamDetailView({ team, color, mode }) {
  if (!team) return null;
  const {
    starting_xi = [], bench = [], injuries = [], doubts = [],
    team_name, logo, formation, coach,
  } = team;

  const byGroup = (arr, grp) => (arr ?? []).filter(p => {
    const pos = (p?.pos ?? "").toUpperCase();
    if (grp === "GK")  return pos === "GK";
    if (grp === "DEF") return ["CB","LB","RB","LWB","RWB","DEF"].includes(pos);
    if (grp === "MID") return ["CM","CDM","CAM","LM","RM","MID","DM","AM"].includes(pos);
    return ["ST","LW","RW","CF","SS","FWD","ATT"].includes(pos);
  });

  const sections = [
    { label: "Goalkeeper",  grp: "GK"  },
    { label: "Defenders",   grp: "DEF" },
    { label: "Midfielders", grp: "MID" },
    { label: "Forwards",    grp: "FWD" },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        {logo && (
          <img src={logo} style={{ width: 28, height: 28, objectFit: "contain" }}
            onError={e => (e.currentTarget.style.display = "none")} />
        )}
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, color }}>{team_name}</div>
          <div style={{ fontSize: 10, color: "#3a5070", marginTop: 2 }}>
            {mode === "predicted" ? "Predicted" : "Official"} · {formation || "—"}
            {coach ? ` · ${coach}` : ""}
          </div>
        </div>
      </div>

      {sections.map(({ label, grp }) => {
        const players = byGroup(starting_xi, grp);
        if (!players.length) return null;
        return (
          <div key={grp} style={{ marginBottom: 12 }}>
            <div style={{
              fontSize: 9, fontWeight: 900, letterSpacing: "0.1em",
              color: "#3a5070", textTransform: "uppercase", marginBottom: 4,
            }}>
              {label}
            </div>
            {players.map((p, i) => (
              <div key={p?.id ?? i} style={{
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
                  fontSize: 9, fontWeight: 900, color, flexShrink: 0,
                }}>
                  {p?.number ?? "—"}
                </div>
                {p?.photo && (
                  <img src={p.photo}
                    style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }}
                    onError={e => (e.currentTarget.style.display = "none")} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#c8d8f0" }}>{p?.name ?? "—"}</div>
                  <div style={{ fontSize: 9, color: posColor(p?.pos ?? ""), marginTop: 1 }}>{p?.pos ?? ""}</div>
                </div>
                {p?.rating != null && (
                  <div style={{
                    fontSize: 14, fontWeight: 900,
                    color: p.rating >= 7.5 ? "#34d399" : p.rating >= 6.5 ? "#f59e0b" : "#6b7fa3",
                  }}>
                    {p.rating.toFixed(1)}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {bench.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{
            fontSize: 9, fontWeight: 900, letterSpacing: "0.1em",
            color: "#3a5070", textTransform: "uppercase", marginBottom: 4,
          }}>
            {mode === "predicted" ? "Expected Bench" : "Bench"}
          </div>
          {bench.map((p, i) => <BenchRow key={p?.id ?? i} player={p} color={color} />)}
        </div>
      )}

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
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 12, overflow: "hidden",
          }}>
            {injuries.map((p, i) => <InjuryRow key={i} player={{ ...p, status: "injured" }} />)}
            {doubts.map((p, i) => <InjuryRow key={i} player={{ ...p, status: "doubtful" }} />)}
          </div>
        </div>
      )}
    </div>
  );
}


// ═════════════════════════════════════════════════════
// MAIN COMPONENT  (single definition — no duplicates)
// ═════════════════════════════════════════════════════

export default function MatchLineups({ fixtureId }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [view,    setView]    = useState("pitch");

  // ── Fetch + normalize ─────────────────────
  useEffect(() => {
    if (!fixtureId) return;

    setLoading(true);
    setError(null);
    setData(null);

    fetch(`${BACKEND}/api/match-lineup/${fixtureId}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => {
        console.log("[MatchLineups] Raw API response:", d);

        // Support both endpoint shapes:
        //   /api/match-lineup        → { mode, home, away }
        //   /api/match-intelligence  → { lineups: { home, away }, ... }
        const rawHome = d?.home ?? d?.lineups?.home ?? null;
        const rawAway = d?.away ?? d?.lineups?.away ?? null;

        const normalizedHome = normalizeTeam(rawHome);
        const normalizedAway = normalizeTeam(rawAway);

        console.log("[MatchLineups] Normalized home lineup:", normalizedHome);
        console.log("[MatchLineups] Normalized away lineup:", normalizedAway);

        // Smart mode detection
        const homeHasXI = (normalizedHome?.starting_xi?.length ?? 0) > 0;
        const awayHasXI = (normalizedAway?.starting_xi?.length ?? 0) > 0;

        const mode =
          d?.mode === "official"  ? "official"  :
          d?.mode === "predicted" ? "predicted" :
          (homeHasXI || awayHasXI) ? "official"  :
          "predicted";

        setData({ mode, announced_at: d?.announced_at ?? null, home: normalizedHome, away: normalizedAway });
        setLoading(false);
      })
      .catch(err => {
        console.error("[MatchLineups] Fetch error:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [fixtureId]);

  // ── Loading ───────────────────────────────
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0", gap: 14 }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          border: "2px solid rgba(96,165,250,0.2)",
          borderTopColor: "#60a5fa",
          animation: "mi_spin 0.8s linear infinite",
        }} />
        <div style={{ color: "#3a5070", fontSize: 12 }}>Loading lineups…</div>
        <style>{`@keyframes mi_spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Error ─────────────────────────────────
  if (error) {
    return (
      <div style={{
        padding: "20px", borderRadius: 14,
        background: "rgba(255,82,82,0.06)",
        border: "1px solid rgba(255,82,82,0.15)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 20, marginBottom: 8 }}>⚠</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#ff5252", marginBottom: 4 }}>
          Unable to load lineups
        </div>
        <div style={{ fontSize: 11, color: "#3a5070" }}>Please refresh or try again later.</div>
      </div>
    );
  }

  // ── Not yet available ─────────────────────
  if (!data || (!data.home && !data.away)) {
    return (
      <div style={{
        padding: "32px 20px", borderRadius: 14,
        background: "linear-gradient(160deg,#0d1525,#080e1a)",
        border: "1px solid rgba(255,255,255,0.06)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 22, marginBottom: 10 }}>⏳</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7fa3", marginBottom: 6 }}>
          Lineups not available yet
        </div>
        <div style={{ fontSize: 11, color: "#3a5070" }}>
          Official lineups are released approximately 45 minutes before kickoff.
        </div>
      </div>
    );
  }

  const { mode, announced_at, home, away } = data;

  const tabBtn = (id, label) => (
    <button
      key={id}
      onClick={() => setView(id)}
      style={{
        padding: "6px 16px", borderRadius: 999, border: "none",
        cursor: "pointer", fontSize: 11, fontWeight: 700,
        background: view === id ? "rgba(96,165,250,0.12)" : "transparent",
        color: view === id ? "#60a5fa" : "#3a5070",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      <ModeBanner mode={mode} announcedAt={announced_at} />

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {tabBtn("pitch", "Pitch View")}
        {tabBtn("home",  home?.team_name || "Home")}
        {tabBtn("away",  away?.team_name || "Away")}
      </div>

      {view === "pitch" && (
        <>
          <Pitch
            home={home ?? { starting_xi: [], bench: [] }}
            away={away ?? { starting_xi: [], bench: [] }}
            mode={mode}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
            <TeamPanel team={home} color="#60a5fa" mode={mode} />
            <TeamPanel team={away} color="#f97316" mode={mode} />
          </div>
        </>
      )}

      {view === "home" && <TeamDetailView team={home} color="#60a5fa" mode={mode} />}
      {view === "away" && <TeamDetailView team={away} color="#f97316" mode={mode} />}
    </div>
  );
}