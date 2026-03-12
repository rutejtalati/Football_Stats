import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const BACKEND = "https://football-stats-lw4b.onrender.com";

const LEAGUES = [
  {
    id: "epl",
    name: "Premier League",
    country: "England",
    shortName: "EPL",
    color: "#3d0099",
    accent: "#00d4aa",
    logo: "https://media.api-sports.io/football/leagues/39.png",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  },
  {
    id: "laliga",
    name: "La Liga",
    country: "Spain",
    shortName: "LAL",
    color: "#c8102e",
    accent: "#ffd700",
    logo: "https://media.api-sports.io/football/leagues/140.png",
    flag: "🇪🇸",
  },
  {
    id: "seriea",
    name: "Serie A",
    country: "Italy",
    shortName: "SA",
    color: "#003f8c",
    accent: "#009246",
    logo: "https://media.api-sports.io/football/leagues/135.png",
    flag: "🇮🇹",
  },
  {
    id: "bundesliga",
    name: "Bundesliga",
    country: "Germany",
    shortName: "BUN",
    color: "#d20515",
    accent: "#ffd700",
    logo: "https://media.api-sports.io/football/leagues/78.png",
    flag: "🇩🇪",
  },
  {
    id: "ligue1",
    name: "Ligue 1",
    country: "France",
    shortName: "L1",
    color: "#0055a4",
    accent: "#ef4135",
    logo: "https://media.api-sports.io/football/leagues/61.png",
    flag: "🇫🇷",
  },
];

function useLeagueData(leagueId) {
  const [standings, setStandings] = useState([]);
  const [scorers, setScorers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${BACKEND}/api/standings/${leagueId}`).then(r => r.json()).catch(() => []),
      fetch(`${BACKEND}/api/topscorers/${leagueId}`).then(r => r.json()).catch(() => []),
    ]).then(([s, sc]) => {
      setStandings(Array.isArray(s) ? s.slice(0, 5) : []);
      setScorers(Array.isArray(sc) ? sc.slice(0, 3) : []);
      setLoading(false);
    });
  }, [leagueId]);

  return { standings, scorers, loading };
}

function FormPip({ result }) {
  const colors = { W: "#22c55e", D: "#6b7280", L: "#ef4444" };
  return (
    <span style={{
      width: 16, height: 16, borderRadius: 4,
      background: colors[result] || "rgba(255,255,255,0.1)",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: 8, fontWeight: 900, color: "#fff",
      flexShrink: 0,
    }}>{result}</span>
  );
}

function MiniStandings({ standings, leagueId, accent }) {
  if (!standings.length) return (
    <div style={{ padding: "20px 0", textAlign: "center", color: "rgba(255,255,255,0.15)", fontSize: 11 }}>
      Loading table...
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Header */}
      <div style={{
        display: "grid", gridTemplateColumns: "20px 1fr 28px 28px 28px 36px",
        gap: 4, padding: "4px 6px",
        fontSize: 8, fontWeight: 800, letterSpacing: "0.1em",
        color: "rgba(255,255,255,0.2)", textTransform: "uppercase",
      }}>
        <span>#</span>
        <span>Club</span>
        <span style={{ textAlign: "center" }}>W</span>
        <span style={{ textAlign: "center" }}>D</span>
        <span style={{ textAlign: "center" }}>L</span>
        <span style={{ textAlign: "center" }}>Pts</span>
      </div>

      {standings.map((row, i) => (
        <Link
          key={row.team_id || i}
          to={`/team/${row.team_id}/${leagueId}`}
          style={{ textDecoration: "none" }}
        >
          <div style={{
            display: "grid", gridTemplateColumns: "20px 1fr 28px 28px 28px 36px",
            gap: 4, padding: "6px 6px",
            borderRadius: 8,
            background: i === 0 ? `rgba(${hexToRgb(accent)}, 0.07)` : "rgba(255,255,255,0.02)",
            border: i === 0 ? `1px solid rgba(${hexToRgb(accent)}, 0.15)` : "1px solid transparent",
            alignItems: "center",
            transition: "background 0.15s",
            cursor: "pointer",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
          onMouseLeave={e => e.currentTarget.style.background = i === 0 ? `rgba(${hexToRgb(accent)}, 0.07)` : "rgba(255,255,255,0.02)"}
          >
            <span style={{ fontSize: 10, fontWeight: 800, color: i === 0 ? accent : "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>{row.rank || i + 1}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              {row.team_logo && <img src={row.team_logo} alt="" width={14} height={14} style={{ objectFit: "contain", flexShrink: 0 }} onError={e => e.currentTarget.style.display = "none"} />}
              <span style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? "#fff" : "rgba(255,255,255,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {row.team_name || row.team}
              </span>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>{row.win ?? row.wins ?? "–"}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>{row.draw ?? row.draws ?? "–"}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>{row.lose ?? row.losses ?? "–"}</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: i === 0 ? accent : "#fff", textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>{row.points ?? row.pts ?? "–"}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function MiniScorers({ scorers, accent }) {
  if (!scorers.length) return (
    <div style={{ padding: "20px 0", textAlign: "center", color: "rgba(255,255,255,0.15)", fontSize: 11 }}>
      Loading scorers...
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {scorers.map((p, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 6px", borderRadius: 8,
          background: "rgba(255,255,255,0.02)",
        }}>
          <span style={{
            width: 18, height: 18, borderRadius: 5,
            background: i === 0 ? accent : "rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 900,
            color: i === 0 ? "#000" : "rgba(255,255,255,0.4)",
            flexShrink: 0,
          }}>{i + 1}</span>
          {p.photo && <img src={p.photo} alt="" width={22} height={22} style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} onError={e => e.currentTarget.style.display = "none"} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.player_name || p.name}
            </div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>
              {p.team_name || p.team}
            </div>
          </div>
          <span style={{
            fontSize: 14, fontWeight: 900,
            color: i === 0 ? accent : "#94a3b8",
            fontFamily: "'JetBrains Mono', monospace",
          }}>{p.goals ?? p.total ?? "–"}</span>
        </div>
      ))}
    </div>
  );
}

function LeagueCard({ league }) {
  const { standings, scorers, loading } = useLeagueData(league.id);
  const [tab, setTab] = useState("table");

  return (
    <div style={{
      background: "rgba(8,10,16,0.95)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 20,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      transition: "border-color 0.2s, transform 0.2s",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = `rgba(${hexToRgb(league.accent)}, 0.3)`; e.currentTarget.style.transform = "translateY(-2px)"; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {/* Header */}
      <div style={{
        padding: "16px 18px 14px",
        background: `linear-gradient(135deg, rgba(${hexToRgb(league.color)}, 0.25) 0%, rgba(0,0,0,0) 60%)`,
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <img src={league.logo} alt={league.name} width={36} height={36} style={{ objectFit: "contain", flexShrink: 0 }} onError={e => e.currentTarget.style.display = "none"} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: "#f0f6ff", letterSpacing: "-0.01em" }}>{league.name}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>{league.flag} {league.country}</div>
        </div>
        <Link
          to={`/league/${league.id}`}
          style={{
            padding: "5px 12px", borderRadius: 999,
            background: `rgba(${hexToRgb(league.accent)}, 0.12)`,
            border: `1px solid rgba(${hexToRgb(league.accent)}, 0.25)`,
            color: league.accent,
            fontSize: 10, fontWeight: 800, letterSpacing: "0.04em",
            textDecoration: "none", flexShrink: 0,
            transition: "background 0.15s",
          }}
        >
          Full View →
        </Link>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 0,
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        {["table", "scorers"].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "9px 0",
              background: "none", border: "none",
              borderBottom: tab === t ? `2px solid ${league.accent}` : "2px solid transparent",
              color: tab === t ? league.accent : "rgba(255,255,255,0.3)",
              fontSize: 10, fontWeight: 800, letterSpacing: "0.06em",
              textTransform: "uppercase", cursor: "pointer",
              transition: "color 0.15s",
              fontFamily: "'Inter', sans-serif",
              marginBottom: -1,
            }}
          >
            {t === "table" ? "Table" : "Top Scorers"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "12px 12px 16px", flex: 1 }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ height: 28, borderRadius: 8, background: "rgba(255,255,255,0.04)", animation: "shimmer 1.3s ease infinite" }} />
            ))}
          </div>
        ) : tab === "table" ? (
          <MiniStandings standings={standings} leagueId={league.id} accent={league.accent} />
        ) : (
          <MiniScorers scorers={scorers} accent={league.accent} />
        )}
      </div>

      {/* Footer CTA */}
      <div style={{ padding: "10px 12px 14px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <Link
          to={`/predictions/${league.id === "epl" ? "premier-league" : league.id === "laliga" ? "la-liga" : league.id === "seriea" ? "serie-a" : league.id === "ligue1" ? "ligue-1" : league.id}`}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 6, padding: "8px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.4)",
            fontSize: 10, fontWeight: 700,
            textDecoration: "none",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = `rgba(${hexToRgb(league.accent)}, 0.08)`; e.currentTarget.style.color = league.accent; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
        >
          ⚡ View Predictions
        </Link>
      </div>
    </div>
  );
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export default function LeaguesPage() {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 20px 60px" }}>
      <style>{`
        @keyframes shimmer {
          0% { opacity: 0.4; }
          50% { opacity: 0.8; }
          100% { opacity: 0.4; }
        }
      `}</style>

      {/* Page header */}
      <div style={{ padding: "28px 0 24px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 4, height: 48, borderRadius: 4, background: "linear-gradient(180deg, #60a5fa, #34d399)" }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: "#f0f6ff", letterSpacing: "-0.02em", fontFamily: "'Sora', sans-serif" }}>
              Leagues
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 600, marginTop: 2 }}>
              Live standings · Top scorers · Predictions
            </p>
          </div>
        </div>

        {/* League quick-jump */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {LEAGUES.map(l => (
            <a key={l.id} href={`#league-${l.id}`} style={{
              padding: "5px 12px", borderRadius: 999,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.5)",
              fontSize: 10, fontWeight: 800,
              textDecoration: "none", letterSpacing: "0.04em",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `rgba(${hexToRgb(l.accent)}, 0.1)`; e.currentTarget.style.color = l.accent; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
            >
              {l.flag} {l.shortName}
            </a>
          ))}
        </div>
      </div>

      {/* League grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
        gap: 18,
      }}>
        {LEAGUES.map(league => (
          <div key={league.id} id={`league-${league.id}`}>
            <LeagueCard league={league} />
          </div>
        ))}
      </div>
    </div>
  );
}