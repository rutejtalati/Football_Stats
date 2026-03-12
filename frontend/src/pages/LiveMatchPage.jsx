import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

const BACKEND = "https://football-stats-lw4b.onrender.com";
const API_KEY  = null; // pulled from backend proxy

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtMin(elapsed, extra) {
  if (!elapsed) return "";
  return extra ? `${elapsed}+${extra}'` : `${elapsed}'`;
}

function eventIcon(type, detail) {
  const t = (type || "").toLowerCase();
  const d = (detail || "").toLowerCase();
  if (t === "goal" && d.includes("own"))    return "🔴"; // own goal
  if (t === "goal" && d.includes("penalty"))return "⚽ P";
  if (t === "goal")                         return "⚽";
  if (t === "card" && d.includes("red"))    return "🟥";
  if (t === "card" && d.includes("yellow")) return "🟨";
  if (t === "subst")                        return "🔄";
  if (t === "var")                          return "📺";
  if (t === "missed_penalty")               return "❌";
  return "•";
}

function StatBar({ label, home, away, homeColor = "#3b82f6", awayColor = "#ef4444" }) {
  const hNum = parseFloat(home) || 0;
  const aNum = parseFloat(away) || 0;
  const total = hNum + aNum || 1;
  const hPct = (hNum / total) * 100;
  const aPct = (aNum / total) * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace", minWidth: 36 }}>{home}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center", flex: 1 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace", minWidth: 36, textAlign: "right" }}>{away}</span>
      </div>
      <div style={{ display: "flex", height: 5, borderRadius: 3, overflow: "hidden", background: "rgba(255,255,255,0.06)" }}>
        <div style={{ width: `${hPct}%`, background: homeColor, borderRadius: "3px 0 0 3px", transition: "width 0.6s ease" }} />
        <div style={{ width: `${aPct}%`, background: awayColor, borderRadius: "0 3px 3px 0", transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

function PitchSvg({ style }) {
  return (
    <svg viewBox="0 0 340 220" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", ...style }}>
      <rect x="0" y="0" width="340" height="220" fill="#1a4d2e" rx="4" />
      {/* stripes */}
      {[...Array(8)].map((_, i) => (
        <rect key={i} x={i * 42.5} y="0" width="21.25" height="220" fill="rgba(255,255,255,0.025)" />
      ))}
      {/* outline */}
      <rect x="8" y="8" width="324" height="204" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      {/* halfway */}
      <line x1="170" y1="8" x2="170" y2="212" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      {/* centre circle */}
      <circle cx="170" cy="110" r="34" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      <circle cx="170" cy="110" r="2" fill="rgba(255,255,255,0.5)" />
      {/* left penalty box */}
      <rect x="8" y="62" width="54" height="96" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      <rect x="8" y="86" width="22" height="48" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      <circle cx="62" cy="110" r="1.5" fill="rgba(255,255,255,0.5)" />
      {/* right penalty box */}
      <rect x="278" y="62" width="54" height="96" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      <rect x="310" y="86" width="22" height="48" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      <circle cx="278" cy="110" r="1.5" fill="rgba(255,255,255,0.5)" />
    </svg>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

function MatchHero({ fixture, homeTeam, awayTeam, score, status, stats }) {
  const isLive = status?.short === "1H" || status?.short === "2H" || status?.short === "ET" || status?.short === "BT";
  const hGoals = score?.fulltime?.home ?? score?.halftime?.home ?? 0;
  const aGoals = score?.fulltime?.away ?? score?.halftime?.away ?? 0;
  const homeWin = hGoals > aGoals;
  const awayWin = aGoals > hGoals;

  const hXG     = stats?.find(s => s.team?.id === homeTeam?.id)?.statistics?.find(s => s.type === "expected_goals")?.value || "–";
  const aXG     = stats?.find(s => s.team?.id === awayTeam?.id)?.statistics?.find(s => s.type === "expected_goals")?.value || "–";
  const hShots  = stats?.find(s => s.team?.id === homeTeam?.id)?.statistics?.find(s => s.type === "Total Shots")?.value || "–";
  const aShots  = stats?.find(s => s.team?.id === awayTeam?.id)?.statistics?.find(s => s.type === "Total Shots")?.value || "–";
  const hPoss   = stats?.find(s => s.team?.id === homeTeam?.id)?.statistics?.find(s => s.type === "Ball Possession")?.value || "–";
  const aPoss   = stats?.find(s => s.team?.id === awayTeam?.id)?.statistics?.find(s => s.type === "Ball Possession")?.value || "–";

  return (
    <div style={{
      position: "relative",
      background: "linear-gradient(160deg, #0d1b2a 0%, #0a1520 40%, #060e18 100%)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      overflow: "hidden",
      padding: "28px 24px 20px",
    }}>
      {/* bg glow */}
      <div style={{ position: "absolute", top: -60, left: "20%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.08), transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: -60, right: "20%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(239,68,68,0.08), transparent 70%)", pointerEvents: "none" }} />

      {/* Competition + status */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginBottom: 20 }}>
        {fixture?.league?.logo && <img src={fixture.league.logo} alt="" width={18} height={18} style={{ objectFit: "contain" }} />}
        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {fixture?.league?.name} · {fixture?.league?.round}
        </span>
        {isLive && (
          <span style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,68,68,0.15)", border: "1px solid rgba(255,68,68,0.3)", borderRadius: 999, padding: "2px 8px" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ff4444", animation: "livePulse 1.5s ease-in-out infinite" }} />
            <span style={{ fontSize: 9, fontWeight: 900, color: "#ff6666", letterSpacing: "0.1em" }}>LIVE {fmtMin(status?.elapsed, status?.extra)}</span>
          </span>
        )}
        {!isLive && status?.short === "FT" && (
          <span style={{ fontSize: 9, fontWeight: 900, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.05)", borderRadius: 999, padding: "2px 8px", letterSpacing: "0.1em" }}>FULL TIME</span>
        )}
      </div>

      {/* Score row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, maxWidth: 680, margin: "0 auto" }}>
        {/* Home */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <img src={homeTeam?.logo} alt={homeTeam?.name} width={56} height={56} style={{ objectFit: "contain", filter: homeWin ? "drop-shadow(0 0 14px rgba(59,130,246,0.5))" : "none" }} onError={e => e.currentTarget.style.opacity = "0"} />
          <span style={{ fontSize: 15, fontWeight: 900, color: "#f0f6ff", textAlign: "center", letterSpacing: "-0.01em" }}>{homeTeam?.name}</span>
        </div>

        {/* Score */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
              fontSize: 56, fontWeight: 900, color: homeWin ? "#60a5fa" : awayWin ? "rgba(255,255,255,0.35)" : "#f0f6ff",
              fontFamily: "'JetBrains Mono', monospace", lineHeight: 1,
              textShadow: homeWin ? "0 0 30px rgba(96,165,250,0.4)" : "none",
              transition: "color 0.3s, text-shadow 0.3s",
            }}>{hGoals}</span>
            <span style={{ fontSize: 28, fontWeight: 300, color: "rgba(255,255,255,0.2)", lineHeight: 1 }}>–</span>
            <span style={{
              fontSize: 56, fontWeight: 900, color: awayWin ? "#f87171" : homeWin ? "rgba(255,255,255,0.35)" : "#f0f6ff",
              fontFamily: "'JetBrains Mono', monospace", lineHeight: 1,
              textShadow: awayWin ? "0 0 30px rgba(248,113,113,0.4)" : "none",
              transition: "color 0.3s, text-shadow 0.3s",
            }}>{aGoals}</span>
          </div>
          {score?.halftime && (
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace" }}>
              HT {score.halftime.home}–{score.halftime.away}
            </span>
          )}
          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
            {fixture?.venue?.name && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>📍 {fixture.venue.name}</span>}
            {fixture?.referee && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>🏳 {fixture.referee}</span>}
          </div>
        </div>

        {/* Away */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <img src={awayTeam?.logo} alt={awayTeam?.name} width={56} height={56} style={{ objectFit: "contain", filter: awayWin ? "drop-shadow(0 0 14px rgba(239,68,68,0.5))" : "none" }} onError={e => e.currentTarget.style.opacity = "0"} />
          <span style={{ fontSize: 15, fontWeight: 900, color: "#f0f6ff", textAlign: "center", letterSpacing: "-0.01em" }}>{awayTeam?.name}</span>
        </div>
      </div>

      {/* Mini stat strip */}
      {(hXG !== "–" || hShots !== "–") && (
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 20, flexWrap: "wrap" }}>
          {[
            { label: "xG", h: hXG, a: aXG },
            { label: "Shots", h: hShots, a: aShots },
            { label: "Poss", h: hPoss, a: aPoss },
          ].map(({ label, h, a }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#60a5fa", fontFamily: "'JetBrains Mono', monospace" }}>{h}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#f87171", fontFamily: "'JetBrains Mono', monospace" }}>{a}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MomentumGraph({ events, totalMins = 90 }) {
  // Build per-minute dominance from events
  const bins = Array(18).fill(null).map(() => ({ home: 0, away: 0 }));
  (events || []).forEach(ev => {
    const min = ev?.time?.elapsed || 0;
    const bin = Math.min(Math.floor(min / 5), 17);
    if (ev.team?.id === ev.homeTeamId) bins[bin].home += 1;
    else bins[bin].away += 1;
  });

  return (
    <div style={{ padding: "16px 20px", background: "rgba(255,255,255,0.015)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", marginBottom: 8 }}>Match Momentum</div>
      <div style={{ display: "flex", height: 36, gap: 1, alignItems: "center" }}>
        {bins.map((b, i) => {
          const total = b.home + b.away || 1;
          const hPct  = (b.home / total) * 100;
          const minLabel = i * 5;
          return (
            <div key={i} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 1, position: "relative" }} title={`${minLabel}'`}>
              <div style={{ height: `${Math.max(hPct, 8)}%`, background: "rgba(59,130,246,0.6)", borderRadius: "2px 2px 0 0", minHeight: 3, transition: "height 0.4s" }} />
              <div style={{ height: `${Math.max(100 - hPct, 8)}%`, background: "rgba(239,68,68,0.6)", borderRadius: "0 0 2px 2px", minHeight: 3, transition: "height 0.4s" }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)" }}>0'</span>
        <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)" }}>45'</span>
        <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)" }}>90'</span>
      </div>
    </div>
  );
}

function Timeline({ events, homeTeam, awayTeam }) {
  if (!events?.length) return null;

  return (
    <div style={{ padding: "20px 20px" }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", marginBottom: 16 }}>Match Events</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {events.map((ev, i) => {
          const isHome = ev.team?.id === homeTeam?.id;
          const icon   = eventIcon(ev.type, ev.detail);
          const min    = fmtMin(ev.time?.elapsed, ev.time?.extra);

          return (
            <div key={i} style={{
              display: "grid",
              gridTemplateColumns: "1fr 52px 1fr",
              gap: 8, alignItems: "center",
              padding: "5px 0",
              borderBottom: "1px solid rgba(255,255,255,0.03)",
            }}>
              {/* Home side */}
              {isHome ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", textAlign: "right" }}>{ev.player?.name}</div>
                    {ev.assist?.name && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "right" }}>assist: {ev.assist.name}</div>}
                  </div>
                  <span style={{ fontSize: 16 }}>{icon}</span>
                </div>
              ) : <div />}

              {/* Minute */}
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.4)", fontFamily: "'JetBrains Mono', monospace", background: "rgba(255,255,255,0.06)", borderRadius: 4, padding: "2px 6px" }}>{min}</span>
              </div>

              {/* Away side */}
              {!isHome ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{ev.player?.name}</div>
                    {ev.assist?.name && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>assist: {ev.assist.name}</div>}
                  </div>
                </div>
              ) : <div />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatsPanel({ stats, homeTeam, awayTeam }) {
  if (!stats?.length) return null;

  const hStats = stats.find(s => s.team?.id === homeTeam?.id)?.statistics || [];
  const aStats = stats.find(s => s.team?.id === awayTeam?.id)?.statistics || [];

  const KEY_STATS = [
    "Ball Possession", "Total Shots", "Shots on Goal",
    "Corner Kicks", "Fouls", "Offsides",
    "Yellow Cards", "Red Cards", "Passes %",
    "Blocked Shots", "Shots insidebox", "expected_goals",
  ];

  const rows = KEY_STATS.map(key => {
    const hVal = hStats.find(s => s.type === key)?.value ?? null;
    const aVal = aStats.find(s => s.type === key)?.value ?? null;
    if (hVal === null && aVal === null) return null;
    return { label: key.replace("_", " ").replace("insidebox", "inside box"), home: hVal ?? 0, away: aVal ?? 0 };
  }).filter(Boolean);

  return (
    <div style={{ padding: "20px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        {homeTeam?.logo && <img src={homeTeam.logo} alt="" width={16} height={16} style={{ objectFit: "contain" }} />}
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", flex: 1 }}>Match Statistics</div>
        {awayTeam?.logo && <img src={awayTeam.logo} alt="" width={16} height={16} style={{ objectFit: "contain" }} />}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map(r => (
          <StatBar key={r.label} label={r.label} home={r.home} away={r.away} />
        ))}
      </div>
    </div>
  );
}

function LineupsPanel({ lineups, homeTeam, awayTeam }) {
  if (!lineups?.length) return null;

  const home = lineups.find(l => l.team?.id === homeTeam?.id);
  const away = lineups.find(l => l.team?.id === awayTeam?.id);

  function PlayerChip({ player, color }) {
    const [hov, setHov] = useState(false);
    return (
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "default" }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: color, border: "2px solid rgba(255,255,255,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 900, color: "#fff",
          boxShadow: hov ? `0 0 10px ${color}` : "none",
          transition: "box-shadow 0.2s",
        }}>
          {player?.player?.number || "?"}
        </div>
        <span style={{ fontSize: 8, fontWeight: 700, color: "#c8d8e8", whiteSpace: "nowrap", maxWidth: 52, overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>
          {player?.player?.name?.split(" ").pop()}
        </span>
        {hov && (
          <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", background: "#0d1b2a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 10px", zIndex: 10, whiteSpace: "nowrap", marginBottom: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#f0f6ff" }}>{player?.player?.name}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>#{player?.player?.number} · {player?.player?.pos}</div>
          </div>
        )}
      </div>
    );
  }

  function Formation({ lineup, color, flip }) {
    const formation = lineup?.formation?.split("-") || [];
    const players   = lineup?.startXI || [];
    let idx = 1;
    const rows = [
      [players[0]], // GK
      ...formation.map(n => {
        const count = parseInt(n);
        const row   = players.slice(idx, idx + count);
        idx += count;
        return row;
      }),
    ];
    if (flip) rows.reverse();

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", width: "100%" }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-around", width: "100%", gap: 4 }}>
            {row.map((p, j) => <PlayerChip key={j} player={p} color={color} />)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", marginBottom: 16 }}>Lineups</div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        {home && <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{home.formation}</span>
        </div>}
        {away && <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{away.formation}</span>
        </div>}
      </div>

      {/* Pitch */}
      <div style={{ position: "relative", width: "100%", paddingBottom: "64.7%", borderRadius: 12, overflow: "hidden" }}>
        <PitchSvg />
        {/* Players laid out on pitch */}
        <div style={{ position: "absolute", inset: 0, display: "flex" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-around", padding: "12px 8px" }}>
            {home && <Formation lineup={home} color="rgba(59,130,246,0.85)" flip={false} />}
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-around", padding: "12px 8px" }}>
            {away && <Formation lineup={away} color="rgba(239,68,68,0.85)" flip={true} />}
          </div>
        </div>
      </div>

      {/* Subs */}
      {(home?.substitutes?.length > 0 || away?.substitutes?.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
          {[home, away].map((lu, side) => lu && (
            <div key={side}>
              <div style={{ fontSize: 8, fontWeight: 800, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Subs</div>
              {lu.substitutes?.slice(0, 7).map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", width: 16, fontFamily: "'JetBrains Mono', monospace" }}>{p?.player?.number}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>{p?.player?.name}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ShotMap({ events, homeTeam, awayTeam }) {
  const shots = (events || []).filter(e => e.type === "Goal" || (e.type === "shot"));
  if (!shots.length) return null;

  return (
    <div style={{ padding: "20px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", marginBottom: 12 }}>Shot Map</div>
      <div style={{ position: "relative", width: "100%", paddingBottom: "64.7%", borderRadius: 12, overflow: "hidden" }}>
        <PitchSvg />
        {shots.map((s, i) => {
          const isHome = s.team?.id === homeTeam?.id;
          const isGoal = s.type === "Goal";
          const x = isHome
            ? 8 + Math.random() * 100 // rough shot placement left half
            : 60 + Math.random() * 32; // right half — ideally use real coords
          const y = 20 + Math.random() * 60;
          return (
            <div
              key={i}
              title={`${s.player?.name} ${fmtMin(s.time?.elapsed)}`}
              style={{
                position: "absolute",
                left: `${x}%`, top: `${y}%`,
                width: isGoal ? 10 : 7,
                height: isGoal ? 10 : 7,
                borderRadius: "50%",
                background: isGoal
                  ? (isHome ? "#60a5fa" : "#f87171")
                  : "rgba(255,255,255,0.25)",
                border: isGoal ? "2px solid #fff" : "1px solid rgba(255,255,255,0.3)",
                transform: "translate(-50%,-50%)",
                boxShadow: isGoal ? "0 0 8px currentColor" : "none",
                cursor: "default",
              }}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 8, justifyContent: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: "rgba(255,255,255,0.4)" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#60a5fa", border: "1.5px solid #fff" }} /> Goal (Home)
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: "rgba(255,255,255,0.4)" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f87171", border: "1.5px solid #fff" }} /> Goal (Away)
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: "rgba(255,255,255,0.4)" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.3)" }} /> Shot
        </span>
      </div>
    </div>
  );
}

function PlayerTable({ players, homeTeam, awayTeam }) {
  const [sort, setSort] = useState("rating");
  if (!players?.length) return null;

  const all = players.flatMap(t =>
    (t.players || []).map(p => ({
      ...p,
      teamName: t.team?.name,
      teamLogo: t.team?.logo,
      isHome: t.team?.id === homeTeam?.id,
    }))
  );

  const sorted = [...all].sort((a, b) => {
    const av = parseFloat(a.statistics?.[0]?.[sort] ?? a.statistics?.[0]?.games?.[sort] ?? 0);
    const bv = parseFloat(b.statistics?.[0]?.[sort] ?? b.statistics?.[0]?.games?.[sort] ?? 0);
    return bv - av;
  });

  const cols = ["rating", "goals", "assists", "passes"];

  return (
    <div style={{ padding: "20px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", marginBottom: 12 }}>Player Ratings</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <th style={{ padding: "6px 8px", textAlign: "left", fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Player</th>
              {cols.map(c => (
                <th
                  key={c}
                  onClick={() => setSort(c)}
                  style={{ padding: "6px 8px", textAlign: "center", fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", color: sort === c ? "#60a5fa" : "rgba(255,255,255,0.25)" }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 16).map((p, i) => {
              const stats = p.statistics?.[0];
              const rating = stats?.games?.rating || stats?.rating || "–";
              const goals  = stats?.goals?.total ?? "–";
              const assists= stats?.goals?.assists ?? "–";
              const passes = stats?.passes?.accuracy ? `${stats.passes.accuracy}%` : "–";

              return (
                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "background 0.12s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "7px 8px", display: "flex", alignItems: "center", gap: 8 }}>
                    {p.teamLogo && <img src={p.teamLogo} alt="" width={14} height={14} style={{ objectFit: "contain" }} />}
                    <span style={{ fontSize: 12, fontWeight: 700, color: p.isHome ? "#93c5fd" : "#fca5a5" }}>{p.player?.name}</span>
                  </td>
                  <td style={{ padding: "7px 8px", textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 800, color: parseFloat(rating) >= 8 ? "#34d399" : "#e2e8f0" }}>{rating}</td>
                  <td style={{ padding: "7px 8px", textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#e2e8f0" }}>{goals}</td>
                  <td style={{ padding: "7px 8px", textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#e2e8f0" }}>{assists}</td>
                  <td style={{ padding: "7px 8px", textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#e2e8f0" }}>{passes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

const TABS = ["Overview", "Stats", "Lineups", "Events", "Players"];

export default function LiveMatchPage() {
  const { fixtureId } = useParams();
  const navigate = useNavigate();

  const [tab,      setTab]      = useState("Overview");
  const [fixture,  setFixture]  = useState(null);
  const [events,   setEvents]   = useState([]);
  const [stats,    setStats]    = useState([]);
  const [lineups,  setLineups]  = useState([]);
  const [players,  setPlayers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    if (!fixtureId) return;
    try {
      const [fx, ev, st, lu, pl] = await Promise.all([
        fetch(`${BACKEND}/api/stats/${fixtureId}`).then(r => r.json()).catch(() => null),
        fetch(`${BACKEND}/api/stats/${fixtureId}?type=events`).then(r => r.json()).catch(() => []),
        fetch(`${BACKEND}/api/stats/${fixtureId}?type=statistics`).then(r => r.json()).catch(() => []),
        fetch(`${BACKEND}/api/stats/${fixtureId}?type=lineups`).then(r => r.json()).catch(() => []),
        fetch(`${BACKEND}/api/stats/${fixtureId}?type=players`).then(r => r.json()).catch(() => []),
      ]);
      if (fx) setFixture(fx);
      if (Array.isArray(ev)) setEvents(ev);
      if (Array.isArray(st)) setStats(st);
      if (Array.isArray(lu)) setLineups(lu);
      if (Array.isArray(pl)) setPlayers(pl);
      setError(null);
    } catch (e) {
      setError("Could not load match data.");
    } finally {
      setLoading(false);
    }
  }, [fixtureId]);

  useEffect(() => {
    load();
    // poll every 30s if live
    pollRef.current = setInterval(load, 30_000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  // Derive teams from fixture or stats
  const homeTeam  = fixture?.teams?.home  || stats?.[0]?.team;
  const awayTeam  = fixture?.teams?.away  || stats?.[1]?.team;
  const score     = fixture?.score;
  const status    = fixture?.fixture?.status;
  const fixtureInfo = fixture?.fixture;

  const isLive = status?.short === "1H" || status?.short === "2H" || status?.short === "ET";

  return (
    <div style={{ background: "#07101a", minHeight: "100vh", color: "#f0f6ff" }}>
      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .lm-tab { background:none; border:none; cursor:pointer; font-family:'Sora',sans-serif; transition: all 0.15s; }
        .lm-tab:hover { color: rgba(255,255,255,0.8) !important; }
      `}</style>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
          Loading match data…
        </div>
      )}

      {error && (
        <div style={{ padding: 24, color: "#f87171", textAlign: "center", fontSize: 13 }}>{error}</div>
      )}

      {!loading && !error && (
        <div style={{ animation: "fadeUp 0.4s ease both" }}>
          {/* Hero */}
          <MatchHero fixture={fixtureInfo} homeTeam={homeTeam} awayTeam={awayTeam} score={score} status={status} stats={stats} />

          {/* Momentum */}
          {events.length > 0 && <MomentumGraph events={events} />}

          {/* Sticky tabs */}
          <div style={{
            position: "sticky", top: 86, zIndex: 100,
            background: "rgba(7,16,26,0.97)", backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", padding: "0 20px",
          }}>
            {TABS.map(t => (
              <button key={t} className="lm-tab" onClick={() => setTab(t)} style={{
                padding: "12px 16px", fontSize: 11, fontWeight: 800,
                letterSpacing: "0.04em", textTransform: "uppercase",
                color: tab === t ? "#60a5fa" : "rgba(255,255,255,0.3)",
                borderBottom: tab === t ? "2px solid #60a5fa" : "2px solid transparent",
                marginBottom: -1,
              }}>{t}</button>
            ))}
          </div>

          {/* Content panels */}
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 0 48px" }}>
            {tab === "Overview" && (
              <>
                {stats.length > 0 && <StatsPanel stats={stats} homeTeam={homeTeam} awayTeam={awayTeam} />}
                {events.length > 0 && <Timeline events={events} homeTeam={homeTeam} awayTeam={awayTeam} />}
              </>
            )}
            {tab === "Stats" && <StatsPanel stats={stats} homeTeam={homeTeam} awayTeam={awayTeam} />}
            {tab === "Lineups" && (
              <>
                <LineupsPanel lineups={lineups} homeTeam={homeTeam} awayTeam={awayTeam} />
                <ShotMap events={events} homeTeam={homeTeam} awayTeam={awayTeam} />
              </>
            )}
            {tab === "Events" && <Timeline events={events} homeTeam={homeTeam} awayTeam={awayTeam} />}
            {tab === "Players" && <PlayerTable players={players} homeTeam={homeTeam} awayTeam={awayTeam} />}

            {!stats.length && !events.length && !lineups.length && (
              <div style={{ padding: 48, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
                No detailed match data available for this fixture.
                <br /><br />
                <Link to="/predictions/premier-league" style={{ color: "#60a5fa", fontWeight: 700 }}>← Back to Predictions</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}