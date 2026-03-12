// ═════════════════════════════════════════════════════
// StatinSite  –  Live Centre
// Shows upcoming + live matches for the next 7 days
// ═════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND = "https://football-stats-lw4b.onrender.com";

// ─────────────────────────────────────────────
// League config
// ─────────────────────────────────────────────

const LEAGUES = {
  epl:        { label: "Premier League", color: "#60a5fa" },
  laliga:     { label: "La Liga",        color: "#f97316" },
  seriea:     { label: "Serie A",        color: "#34d399" },
  bundesliga: { label: "Bundesliga",     color: "#f59e0b" },
  ligue1:     { label: "Ligue 1",        color: "#a78bfa" },
};

const LEAGUE_FILTER = ["all", "epl", "laliga", "seriea", "bundesliga", "ligue1"];

// ─────────────────────────────────────────────
// Normalise league ids coming from the backend
// ─────────────────────────────────────────────

function normalizeLeague(l) {
  if (!l) return "";
  const v = String(l).toLowerCase();
  if (v === "39"  || v.includes("premier"))               return "epl";
  if (v === "140" || (v.includes("liga") && !v.includes("bundes"))) return "laliga";
  if (v === "135" || v.includes("serie"))                 return "seriea";
  if (v === "78"  || v.includes("bundes"))                return "bundesliga";
  if (v === "61"  || v.includes("ligue"))                 return "ligue1";
  return v;
}

// ─────────────────────────────────────────────
// Format kickoff time
// ─────────────────────────────────────────────

function formatKickoff(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const today    = new Date();
  const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);

  const sameDay = (a, b) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (sameDay(d, today))    return `Today  ${timeStr}`;
  if (sameDay(d, tomorrow)) return `Tomorrow  ${timeStr}`;

  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) + `  ${timeStr}`;
}

// ─────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────

function StatusBadge({ status, minute }) {
  const isLive = status === "1H" || status === "2H" || status === "HT" || status === "ET" || status === "BT" || status === "P";
  const isHT   = status === "HT";

  if (isHT) {
    return (
      <span style={{
        fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
        color: "#f59e0b",
        background: "rgba(245,158,11,0.12)",
        padding: "2px 7px", borderRadius: 999,
      }}>HT</span>
    );
  }

  if (isLive) {
    return (
      <span style={{
        fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
        color: "#ff5252",
        background: "rgba(255,82,82,0.12)",
        padding: "2px 7px", borderRadius: 999,
        display: "flex", alignItems: "center", gap: 4,
      }}>
        <span style={{
          width: 5, height: 5, borderRadius: "50%",
          background: "#ff5252",
          animation: "pulse 1.2s ease-in-out infinite",
        }} />
        {minute ? `${minute}'` : "LIVE"}
      </span>
    );
  }

  if (status === "FT") {
    return (
      <span style={{
        fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
        color: "#6b7fa3",
        background: "rgba(107,127,163,0.1)",
        padding: "2px 7px", borderRadius: 999,
      }}>FT</span>
    );
  }

  return null;
}

// ─────────────────────────────────────────────
// Team display
// ─────────────────────────────────────────────

function Team({ logo, name, score, isLive }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
      {logo && (
        <img
          src={logo}
          style={{ width: 24, height: 24, objectFit: "contain" }}
          onError={e => (e.currentTarget.style.display = "none")}
        />
      )}
      <span style={{
        fontSize: 12, fontWeight: 700,
        color: "#c8d8f0",
        flex: 1,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {name}
      </span>
      {score !== undefined && score !== null && (
        <span style={{
          fontSize: 16, fontWeight: 900,
          color: isLive ? "#f0f6ff" : "#8aa6d8",
          minWidth: 18, textAlign: "center",
        }}>
          {score}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Match Card
// ─────────────────────────────────────────────

function MatchCard({ fixture }) {
  const navigate = useNavigate();
  const league   = LEAGUES[fixture.league];
  const isLive   = ["1H","2H","HT","ET","BT","P"].includes(fixture.status);
  const hasScore = fixture.home_score !== null && fixture.home_score !== undefined;

  return (
    <div
      onClick={() => navigate(`/match/${fixture.fixture_id}`)}
      style={{
        padding: 16,
        borderRadius: 16,
        border: `1px solid ${isLive ? "rgba(255,82,82,0.18)" : "rgba(255,255,255,0.06)"}`,
        background: isLive
          ? "linear-gradient(160deg,#120a0a,#0a0808)"
          : "linear-gradient(160deg,#0b1220,#060a12)",
        cursor: "pointer",
        transition: "transform 0.15s, box-shadow 0.15s",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.4)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* left accent stripe */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        borderRadius: "3px 0 0 3px",
        background: league?.color || "transparent",
        opacity: 0.7,
      }} />

      {/* header row */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 12, paddingLeft: 8,
      }}>
        <span style={{
          fontSize: 9, letterSpacing: "0.1em", fontWeight: 900,
          color: league?.color || "#aaa",
        }}>
          {league?.label}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <StatusBadge status={fixture.status} minute={fixture.minute} />
          {!isLive && !hasScore && (
            <span style={{ fontSize: 10, color: "#6b7fa3", fontWeight: 600 }}>
              {formatKickoff(fixture.kickoff)}
            </span>
          )}
        </div>
      </div>

      {/* teams + scores */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 8 }}>
        <Team
          logo={fixture.home_logo}
          name={fixture.home_team}
          score={hasScore ? fixture.home_score : undefined}
          isLive={isLive}
        />
        <Team
          logo={fixture.away_logo}
          name={fixture.away_team}
          score={hasScore ? fixture.away_score : undefined}
          isLive={isLive}
        />
      </div>

      {/* xG row */}
      {fixture.xg_home != null && (
        <div style={{
          marginTop: 10, paddingLeft: 8,
          fontSize: 10, color: "#5a7a9e",
          display: "flex", gap: 4,
        }}>
          <span style={{ color: "#34d399", fontWeight: 700 }}>xG</span>
          {fixture.xg_home} – {fixture.xg_away}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Day group header
// ─────────────────────────────────────────────

function DayHeader({ label }) {
  return (
    <div style={{
      gridColumn: "1 / -1",
      fontSize: 10, fontWeight: 900,
      letterSpacing: "0.12em",
      color: "#4a6080",
      textTransform: "uppercase",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
      paddingBottom: 6,
      marginTop: 12,
    }}>
      {label}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export default function LivePage() {
  const [chips,   setChips]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [league,  setLeague]  = useState("all");
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchData = () => {
    fetch(`${BACKEND}/api/matches/upcoming`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => {
        setChips(d.matches || d.chips || []);
        setLoading(false);
        setLastRefresh(new Date());
        setError(null);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fixtures = useMemo(() => chips.map(c => ({
    fixture_id: c.fixture_id,
    league:     normalizeLeague(c.league || c.league_id),
    home_team:  c.home_team,
    away_team:  c.away_team,
    home_logo:  c.home_logo,
    away_logo:  c.away_logo,
    home_score: c.home_score,
    away_score: c.away_score,
    status:     c.status,
    minute:     c.minute,
    kickoff:    c.kickoff || c.date,
    xg_home:    c.xg_home,
    xg_away:    c.xg_away,
  })), [chips]);

  const filtered = fixtures.filter(f =>
    league === "all" || f.league === league
  );

  // Group by day
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(f => {
      const d = f.kickoff ? new Date(f.kickoff) : null;
      const today    = new Date();
      const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
      let key = "Upcoming";
      if (d) {
        const sameDay = (a, b) =>
          a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
        if (sameDay(d, today))    key = "Today";
        else if (sameDay(d, tomorrow)) key = "Tomorrow";
        else key = d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(f);
    });
    return groups;
  }, [filtered]);

  // live count
  const liveCount = fixtures.filter(f =>
    ["1H","2H","HT","ET","BT","P"].includes(f.status)
  ).length;

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>

      <div style={{
        background: "#060a12",
        minHeight: "100vh",
        padding: "30px 24px",
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          {/* ── Header ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: "#f0f6ff", margin: 0 }}>
                Live Centre
              </h1>
              <p style={{ color: "#4a6080", fontSize: 12, marginTop: 4, marginBottom: 0 }}>
                Next 7 days · Top 5 leagues
                {liveCount > 0 && (
                  <span style={{
                    marginLeft: 10,
                    color: "#ff5252",
                    fontWeight: 700,
                  }}>
                    {liveCount} live
                  </span>
                )}
              </p>
            </div>
            {lastRefresh && (
              <span style={{ fontSize: 10, color: "#2e3d52" }}>
                Updated {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>

          {/* ── League filters ── */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
            {LEAGUE_FILTER.map(l => (
              <button
                key={l}
                onClick={() => setLeague(l)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: `1px solid ${league === l
                    ? (LEAGUES[l]?.color || "#60a5fa") + "55"
                    : "rgba(255,255,255,0.06)"}`,
                  background: league === l
                    ? (LEAGUES[l]?.color || "#60a5fa") + "18"
                    : "rgba(255,255,255,0.02)",
                  color: league === l
                    ? (LEAGUES[l]?.color || "#60a5fa")
                    : "rgba(255,255,255,0.3)",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                  transition: "all 0.15s",
                  letterSpacing: "0.04em",
                }}
              >
                {l === "all" ? "All Leagues" : LEAGUES[l]?.label}
              </button>
            ))}
          </div>

          {/* ── Content ── */}
          {loading ? (
            <div style={{ color: "#4a6080", fontSize: 14, paddingTop: 40, textAlign: "center" }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                border: "2px solid rgba(96,165,250,0.2)",
                borderTopColor: "#60a5fa",
                margin: "0 auto 16px",
                animation: "spin 0.8s linear infinite",
              }} />
              Loading matches…
            </div>
          ) : error ? (
            <div style={{
              color: "#ff5252", fontSize: 13,
              background: "rgba(255,82,82,0.06)",
              border: "1px solid rgba(255,82,82,0.15)",
              borderRadius: 12, padding: "16px 20px",
            }}>
              Failed to load matches: {error}
              <button
                onClick={fetchData}
                style={{
                  marginLeft: 12, background: "none",
                  border: "1px solid rgba(255,82,82,0.3)",
                  color: "#ff5252", borderRadius: 6,
                  padding: "3px 10px", cursor: "pointer", fontSize: 11,
                }}
              >
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ color: "#2e3d52", fontSize: 14, textAlign: "center", paddingTop: 60 }}>
              No matches found for this filter.
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 12,
              alignItems: "start",
            }}>
              {Object.entries(grouped).map(([day, matches]) => (
                <>
                  <DayHeader key={`hdr-${day}`} label={day} />
                  {matches.map(f => (
                    <MatchCard key={f.fixture_id} fixture={f} />
                  ))}
                </>
              ))}
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}