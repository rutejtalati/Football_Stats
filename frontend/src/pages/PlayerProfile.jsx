// pages/PlayerProfile.jsx — StatinSite Player Analytics
import { useState, useEffect, useRef } from "react";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "https://football-stats-lw4b.onrender.com";

// ── Design tokens ─────────────────────────────────────────────
const C = {
  bg: "#000810", card: "rgba(9,15,28,0.98)", border: "rgba(255,255,255,0.065)",
  accent: "#38bdf8", green: "#34d399", amber: "#f59e0b", red: "#f87171", purple: "#a78bfa",
  text: "#f0f6ff", muted: "#5a7a9a", dim: "#1a3a5a",
};

const POSITIONS = ["", "Goalkeeper", "Defender", "Midfielder", "Attacker"];
const LEAGUES   = [
  { key: "", label: "All Leagues" },
  { key: "epl",        label: "Premier League" },
  { key: "laliga",     label: "La Liga" },
  { key: "seriea",     label: "Serie A" },
  { key: "bundesliga", label: "Bundesliga" },
  { key: "ligue1",     label: "Ligue 1" },
];

// ── Helpers ───────────────────────────────────────────────────
function posColor(pos = "") {
  const p = pos.toLowerCase();
  if (p.includes("goal"))   return C.amber;
  if (p.includes("defend")) return C.green;
  if (p.includes("mid"))    return C.accent;
  if (p.includes("attack") || p.includes("forward")) return C.red;
  return C.muted;
}

function StatPill({ label, value, accent = C.accent }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.025)",
      border: `1px solid ${accent}20`, minWidth: 72 }}>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 900, color: accent }}>
        {value ?? "—"}
      </span>
      <span style={{ fontSize: 8, fontWeight: 800, color: C.dim, letterSpacing: "0.1em",
        textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

// Simple horizontal bar (no canvas)
function Bar({ value = 0, max = 1, color = C.accent, label, right }) {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {!right && <span style={{ fontSize: 11, color: C.muted, width: 110, textAlign: "right" }}>{label}</span>}
      <div style={{ flex: 1, height: 6, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color,
          borderRadius: 999, transition: "width 0.6s ease" }} />
      </div>
      {right && <span style={{ fontSize: 11, color: C.muted, width: 110 }}>{label}</span>}
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color, width: 28,
        textAlign: "right", fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function Skeleton({ h = 140 }) {
  return <div style={{ borderRadius: 16, height: h, background: "rgba(255,255,255,0.035)",
    animation: "shimmer 1.5s ease-in-out infinite", backgroundSize: "400% 100%" }} />;
}

// ── Player Card (search result) ───────────────────────────────
function PlayerCard({ player, onClick, compareMode, onCompare, comparing }) {
  const [hov, setHov] = useState(false);
  const accent = posColor(player.position);
  const selected = comparing?.some(p => p.id === player.id);
  return (
    <div onClick={() => compareMode ? onCompare(player) : onClick(player)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ borderRadius: 16, overflow: "hidden", cursor: "pointer",
        background: selected ? `${accent}14` : hov ? "rgba(12,20,38,0.99)" : C.card,
        border: selected ? `1.5px solid ${accent}60` : hov ? `1px solid ${accent}40` : `1px solid ${C.border}`,
        boxShadow: hov ? `0 0 24px ${accent}12, 0 12px 32px rgba(0,0,0,0.4)` : "0 4px 16px rgba(0,0,0,0.25)",
        transform: hov ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.2s cubic-bezier(.22,1,.36,1)" }}>
      <div style={{ height: 3, background: `linear-gradient(90deg,${accent},transparent)` }} />
      <div style={{ padding: "14px 16px", display: "flex", gap: 12, alignItems: "center" }}>
        {/* Photo */}
        <div style={{ width: 52, height: 52, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
          background: `${accent}12`, border: `2px solid ${accent}30` }}>
          {player.photo
            ? <img src={player.photo} alt={player.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={e => e.currentTarget.style.display = "none"} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 20, color: accent, fontWeight: 900 }}>
                {player.name[0]}
              </div>
          }
        </div>
        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.12em",
              textTransform: "uppercase", color: accent, background: `${accent}10`,
              border: `1px solid ${accent}25`, borderRadius: 4, padding: "1px 6px" }}>
              {player.position || "—"}
            </span>
            {player.rating && (
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9,
                color: C.green, fontWeight: 700 }}>{Number(player.rating).toFixed(1)}</span>
            )}
          </div>
          <p style={{ fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 800,
            color: hov ? C.text : "#d0e8ff", margin: 0, overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player.name}</p>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3 }}>
            {player.team_logo && (
              <img src={player.team_logo} alt="" style={{ width: 14, height: 14, objectFit: "contain" }}
                onError={e => e.currentTarget.style.display = "none"} />
            )}
            <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, color: C.muted,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player.team}</span>
          </div>
        </div>
        {/* Key stats */}
        <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 900, color: C.text }}>{player.goals}</div>
            <div style={{ fontSize: 8, color: C.dim, fontWeight: 700, letterSpacing: "0.08em" }}>G</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 900, color: C.muted }}>{player.assists}</div>
            <div style={{ fontSize: 8, color: C.dim, fontWeight: 700, letterSpacing: "0.08em" }}>A</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Full Player Profile Panel ──────────────────────────────────
function PlayerProfilePanel({ player, onClose }) {
  const accent = posColor(player.position);
  const app = player.appearances || 1;

  const stats = [
    { label: "Goals",      value: player.goals,       max: 30,  color: C.text  },
    { label: "Assists",    value: player.assists,      max: 20,  color: C.green },
    { label: "Shots",      value: player.shots_total,  max: 150, color: C.accent },
    { label: "On Target",  value: player.shots_on,     max: 80,  color: C.accent },
    { label: "Key Passes", value: player.key_passes,   max: 80,  color: C.amber },
    { label: "Dribbles",   value: player.dribbles,     max: 100, color: C.purple },
    { label: "Duels Won",  value: player.duels_won,    max: 300, color: C.red },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1100, display: "flex", alignItems: "flex-start",
      justifyContent: "flex-end", padding: 20, pointerEvents: "none" }}>
      <div style={{ width: 380, maxHeight: "calc(100vh - 40px)", overflowY: "auto", pointerEvents: "auto",
        borderRadius: 20, background: "rgba(5,10,22,0.99)", border: `1px solid ${accent}30`,
        boxShadow: `0 0 48px ${accent}12, 0 32px 80px rgba(0,0,0,0.7)`,
        animation: "slideIn 0.25s cubic-bezier(.22,1,.36,1)",
        scrollbarWidth: "thin", scrollbarColor: `${accent}20 transparent` }}>
        <div style={{ height: 2, background: `linear-gradient(90deg,${accent},transparent)` }} />

        {/* Header */}
        <div style={{ padding: "20px 20px 0", display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
            border: `2px solid ${accent}40`, background: `${accent}10` }}>
            {player.photo
              ? <img src={player.photo} alt={player.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={e => e.currentTarget.style.display = "none"} />
              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 28, color: accent, fontWeight: 900 }}>
                  {player.name[0]}
                </div>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 900,
              color: C.text, margin: "0 0 4px", lineHeight: 1.2 }}>{player.name}</h2>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase",
                color: accent, background: `${accent}10`, border: `1px solid ${accent}25`,
                borderRadius: 4, padding: "2px 6px" }}>{player.position}</span>
              <span style={{ fontSize: 10, color: C.muted }}>{player.nationality}</span>
              {player.age && <span style={{ fontSize: 10, color: C.dim }}>Age {player.age}</span>}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6 }}>
              {player.team_logo && (
                <img src={player.team_logo} alt="" style={{ width: 18, height: 18, objectFit: "contain" }}
                  onError={e => e.currentTarget.style.display = "none"} />
              )}
              <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 11, fontWeight: 700,
                color: C.muted }}>{player.team}</span>
            </div>
          </div>
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)", color: C.muted, cursor: "pointer",
              fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = C.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = C.muted; }}>
            ✕
          </button>
        </div>

        {/* Key stats row */}
        <div style={{ padding: "16px 20px", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <StatPill label="Goals"    value={player.goals}    accent={C.text} />
          <StatPill label="Assists"  value={player.assists}  accent={C.green} />
          <StatPill label="Apps"     value={player.appearances} accent={C.accent} />
          <StatPill label="Mins"     value={player.minutes}  accent={C.muted} />
          {player.rating && <StatPill label="Rating" value={Number(player.rating).toFixed(1)} accent={C.amber} />}
        </div>

        {/* Bar chart stats */}
        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: accent, letterSpacing: "0.12em",
            textTransform: "uppercase", marginBottom: 4 }}>Season Statistics</div>
          {stats.map(s => (
            <Bar key={s.label} label={s.label} value={s.value} max={s.max} color={s.color} />
          ))}
        </div>

        {/* Per 90 */}
        {player.minutes > 0 && (
          <div style={{ margin: "0 20px 20px", padding: "14px 16px", borderRadius: 12,
            background: "rgba(255,255,255,0.018)", border: `1px solid ${accent}14` }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: accent, letterSpacing: "0.12em",
              textTransform: "uppercase", marginBottom: 12 }}>Per 90 Minutes</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[
                { l: "Goals",    v: ((player.goals   / player.minutes) * 90).toFixed(2) },
                { l: "Assists",  v: ((player.assists  / player.minutes) * 90).toFixed(2) },
                { l: "Shots",    v: ((player.shots_total / player.minutes) * 90).toFixed(2) },
                { l: "Key Pass", v: ((player.key_passes / player.minutes) * 90).toFixed(2) },
              ].map(s => (
                <div key={s.l}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15,
                    fontWeight: 900, color: accent }}>{s.v}</div>
                  <div style={{ fontSize: 8, fontWeight: 800, color: C.dim,
                    letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* League */}
        <div style={{ padding: "0 20px 20px" }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: C.dim }}>{player.league}</span>
        </div>
      </div>
    </div>
  );
}

// ── Comparison Panel ──────────────────────────────────────────
function ComparePanel({ players, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (players.length < 2) return;
    setLoading(true);
    fetch(`${BACKEND}/api/players/compare?a=${players[0].id}&b=${players[1].id}`)
      .then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [players]);

  const KEYS = [
    { k: "goals",       l: "Goals",      color: C.text   },
    { k: "assists",     l: "Assists",     color: C.green  },
    { k: "appearances", l: "Apps",        color: C.accent },
    { k: "shots_total", l: "Shots",       color: C.accent },
    { k: "shots_on",    l: "On Target",   color: C.accent },
    { k: "key_passes",  l: "Key Passes",  color: C.amber  },
    { k: "dribbles",    l: "Dribbles",    color: C.purple },
    { k: "duels_won",   l: "Duels Won",   color: C.red    },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.88)",
      backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, animation: "fadeIn 0.2s ease" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 700, maxHeight: "90vh", overflowY: "auto",
          borderRadius: 24, background: "rgba(5,10,22,0.99)", border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)", scrollbarWidth: "thin" }}>
        <div style={{ height: 2, background: "linear-gradient(90deg,#38bdf8,#34d399,transparent)" }} />
        <div style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 900,
              color: C.text, margin: 0 }}>Player Comparison</h2>
            <button onClick={onClose}
              style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)", color: C.muted, cursor: "pointer",
                fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>

          {/* Player headers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr", gap: 12, marginBottom: 28, alignItems: "center" }}>
            {[players[0], players[1]].map((p, i) => (
              <div key={i} style={{ textAlign: i === 0 ? "left" : "right" }}>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 900,
                  color: C.text }}>{p?.name}</div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.muted }}>{p?.team}</div>
                <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase",
                  color: posColor(p?.position), marginTop: 4 }}>{p?.position}</div>
              </div>
            ))}
            <div style={{ textAlign: "center", fontFamily: "'JetBrains Mono',monospace",
              fontSize: 11, fontWeight: 900, color: "rgba(255,255,255,0.2)" }}>VS</div>
          </div>

          {loading && <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2,3,4,5].map(i => <Skeleton key={i} h={28} />)}
          </div>}

          {!loading && data && KEYS.map(({ k, l, color }) => {
            const a = data.comparison?.[k]?.a ?? 0;
            const b = data.comparison?.[k]?.b ?? 0;
            const mx = Math.max(a, b, 1);
            const wA = a >= b;
            return (
              <div key={k} style={{ display: "grid", gridTemplateColumns: "1fr 64px 1fr",
                gap: 8, alignItems: "center", marginBottom: 10 }}>
                {/* Left bar */}
                <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 900,
                    color: wA ? color : C.muted }}>{a}</span>
                  <div style={{ width: `${Math.round((a / mx) * 80)}px`, height: 6, borderRadius: 999,
                    background: wA ? color : "rgba(255,255,255,0.06)", minWidth: 4, transition: "width 0.5s ease" }} />
                </div>
                <div style={{ textAlign: "center", fontSize: 9, fontWeight: 800, color: C.dim,
                  letterSpacing: "0.08em", textTransform: "uppercase" }}>{l}</div>
                {/* Right bar */}
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <div style={{ width: `${Math.round((b / mx) * 80)}px`, height: 6, borderRadius: 999,
                    background: !wA ? color : "rgba(255,255,255,0.06)", minWidth: 4, transition: "width 0.5s ease" }} />
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 900,
                    color: !wA ? color : C.muted }}>{b}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function PlayerProfilePage() {
  const [search,      setSearch]      = useState("");
  const [league,      setLeague]      = useState("");
  const [position,    setPosition]    = useState("");
  const [players,     setPlayers]     = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [selected,    setSelected]    = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [comparing,   setComparing]   = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const [topScorers,  setTopScorers]  = useState([]);
  const debounce = useRef(null);

  // Load top scorers on mount
  useEffect(() => {
    fetch(`${BACKEND}/api/players/top-scorers?limit=10`)
      .then(r => r.json()).then(setTopScorers).catch(() => {});
  }, []);

  // Search with debounce
  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      const params = new URLSearchParams({ limit: 40, offset: 0 });
      if (search)   params.set("search",   search);
      if (league)   params.set("league",   league);
      if (position) params.set("position", position);
      setLoading(true);
      fetch(`${BACKEND}/api/players/?${params}`)
        .then(r => r.json())
        .then(d => setPlayers(d.players || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 350);
  }, [search, league, position]);

  function handleCompare(player) {
    setComparing(prev => {
      if (prev.some(p => p.id === player.id)) return prev.filter(p => p.id !== player.id);
      if (prev.length >= 2) return [prev[1], player];
      return [...prev, player];
    });
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Sora',sans-serif" }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes slideIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        *::-webkit-scrollbar { width: 4px; } *::-webkit-scrollbar-track { background: transparent; }
        *::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 999px; }
      `}</style>

      {/* Profile panel */}
      {selected && <PlayerProfilePanel player={selected} onClose={() => setSelected(null)} />}
      {/* Comparison modal */}
      {showCompare && comparing.length === 2 && (
        <ComparePanel players={comparing} onClose={() => setShowCompare(false)} />
      )}

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px 80px" }}>

        {/* Header */}
        <div style={{ padding: "30px 0 24px", borderBottom: `1px solid rgba(255,255,255,0.045)`, marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 4, height: 48, borderRadius: 2,
                background: "linear-gradient(180deg,#38bdf8,#34d399)", flexShrink: 0 }} />
              <div>
                <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 900,
                  color: C.text, margin: 0, letterSpacing: "-0.03em" }}>Player Analytics</h1>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.dim,
                  margin: "4px 0 0", fontWeight: 600 }}>
                  Search · Compare · Analyse across Europe's top 5 leagues
                </p>
              </div>
            </div>
            {/* Compare button */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={() => setCompareMode(m => !m)}
                style={{ padding: "8px 16px", borderRadius: 20, cursor: "pointer", fontSize: 11,
                  fontWeight: 800, fontFamily: "'Inter',sans-serif",
                  background: compareMode ? `${C.accent}15` : "rgba(255,255,255,0.04)",
                  border: compareMode ? `1.5px solid ${C.accent}50` : "1.5px solid rgba(255,255,255,0.1)",
                  color: compareMode ? C.accent : C.muted, transition: "all 0.15s",
                  boxShadow: compareMode ? `0 0 14px ${C.accent}18` : "none" }}>
                {compareMode ? "Cancel Compare" : "Compare Players"}
              </button>
              {compareMode && comparing.length === 2 && (
                <button onClick={() => setShowCompare(true)}
                  style={{ padding: "8px 18px", borderRadius: 20, cursor: "pointer", fontSize: 11,
                    fontWeight: 800, background: C.accent, color: "#000", border: "none",
                    fontFamily: "'Inter',sans-serif" }}>
                  Compare →
                </button>
              )}
              {compareMode && comparing.length > 0 && (
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10,
                  color: C.accent }}>{comparing.length}/2 selected</span>
              )}
            </div>
          </div>
        </div>

        {/* Search + filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
            <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              pointerEvents: "none" }} width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke={C.muted} strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search player name…"
              style={{ width: "100%", padding: "10px 12px 10px 34px", borderRadius: 12, boxSizing: "border-box",
                background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.08)`,
                color: C.text, fontFamily: "'Inter',sans-serif", fontSize: 13, outline: "none",
                transition: "border 0.15s" }}
              onFocus={e => e.target.style.borderColor = `${C.accent}50`}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
            />
          </div>
          {/* League select */}
          <select value={league} onChange={e => setLeague(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)", color: C.muted, fontSize: 12,
              fontFamily: "'Inter',sans-serif", cursor: "pointer", outline: "none" }}>
            {LEAGUES.map(l => <option key={l.key} value={l.key} style={{ background: "#0a1020" }}>{l.label}</option>)}
          </select>
          {/* Position select */}
          <select value={position} onChange={e => setPosition(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)", color: C.muted, fontSize: 12,
              fontFamily: "'Inter',sans-serif", cursor: "pointer", outline: "none" }}>
            {POSITIONS.map(p => <option key={p} value={p} style={{ background: "#0a1020" }}>{p || "All Positions"}</option>)}
          </select>
        </div>

        {/* Main layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, alignItems: "start" }}>

          {/* Player grid */}
          <div>
            {loading && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[1,2,3,4,5,6].map(i => <Skeleton key={i} h={82} />)}
              </div>
            )}
            {!loading && players.length === 0 && (
              <div style={{ padding: "48px 20px", textAlign: "center", color: C.dim,
                fontFamily: "'Inter',sans-serif", fontSize: 13 }}>
                No players found. Try a different search.
              </div>
            )}
            {!loading && players.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {players.map(p => (
                  <PlayerCard key={p.id} player={p}
                    onClick={setSelected}
                    compareMode={compareMode}
                    onCompare={handleCompare}
                    comparing={comparing} />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar — top scorers */}
          <div style={{ position: "sticky", top: 20 }}>
            <div style={{ borderRadius: 16, overflow: "hidden", background: C.card,
              border: "1px solid rgba(255,255,255,0.065)" }}>
              <div style={{ height: 2, background: "linear-gradient(90deg,#f87171,transparent)" }} />
              <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 3, height: 18, borderRadius: 2,
                  background: "linear-gradient(180deg,#f87171,transparent)" }} />
                <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 900, color: C.text }}>
                  Top Scorers
                </span>
              </div>
              {topScorers.map((p, i) => (
                <div key={p.id} onClick={() => setSelected(p)}
                  style={{ display: "flex", gap: 10, padding: "10px 14px", cursor: "pointer",
                    borderBottom: i < topScorers.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
                    fontWeight: 900, color: C.dim, width: 20, flexShrink: 0 }}>{i + 1}</span>
                  {p.photo && <img src={p.photo} alt={p.name}
                    style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                    onError={e => e.currentTarget.style.display = "none"} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "'Sora',sans-serif", fontSize: 11, fontWeight: 700,
                      color: C.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis",
                      whiteSpace: "nowrap" }}>{p.name}</p>
                    <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 9, color: C.muted,
                      margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.team}</p>
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14,
                    fontWeight: 900, color: C.red, flexShrink: 0 }}>{p.goals}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}