// pages/TeamPage.jsx  ·  Part 3 refactor
// Changes:
//   • const BACKEND (hardcoded URL) → API_BASE from @/api/api
//   • useIsMobile → imported from @/hooks
//   • LEAGUE_COLORS → derived from compColor() from @/constants
//   • LEAGUE_SLUGS  → derived from SLUG_BY_CODE from @/constants
//   • FORM_COLOR kept (local UI data, not in shared constants)
//   • All components and layout — 100% preserved

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useIsMobile } from "@/hooks";
import { API_BASE as BACKEND } from "@/api/api";
import { compColor, SLUG_BY_CODE } from "@/constants";

// LEAGUE_COLORS: used as accent color per league — derived from constants
const LEAGUE_COLORS = {
  epl: compColor("epl"),
  laliga: compColor("laliga"),
  seriea: compColor("seriea"),
  ligue1: compColor("ligue1"),
  bundesliga: compColor("bundesliga"),
};

// LEAGUE_SLUGS: used for the predictions link — derived from constants
const LEAGUE_SLUGS = SLUG_BY_CODE;

// FORM_COLOR: local UI colours, not in shared design system
const FORM_COLOR = { W: "#00c896", D: "#888", L: "#e84040" };


function StatBar({ label, value, max, color = "#3d8ce8" }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
        <span style={{ fontSize: 12, color: "#e8e8e8", fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

function GoalMinuteChart({ data, color, label }) {
  if (!data) return null;
  const buckets = ["0-15","16-30","31-45","46-60","61-75","76-90","91-105"];
  const values = buckets.map(b => {
    const entry = data[b];
    return entry ? (entry.total || 0) : 0;
  });
  const maxVal = Math.max(...values, 1);
  return (
    <div>
      <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{label}</div>
      <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 60 }}>
        {values.map((v, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{
              width: "100%", height: `${(v / maxVal) * 48}px`, minHeight: v > 0 ? 4 : 0,
              background: color, borderRadius: "2px 2px 0 0", opacity: 0.85, transition: "height 0.6s ease"
            }} />
            <span style={{ fontSize: 9, color: "#555", whiteSpace: "nowrap" }}>{buckets[i].split("-")[0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormBadge({ result }) {
  return (
    <span style={{
      width: 24, height: 24, borderRadius: 4,
      background: FORM_COLOR[result] || "#444",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, fontWeight: 700, color: "#000", flexShrink: 0,
    }}>{result}</span>
  );
}

function SectionCard({ title, children, accent }) {
  return (
    <div style={{
      background: "#0d1117", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 12, padding: "20px 24px", marginBottom: 16,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: accent || "#888",
        textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16,
        paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>{title}</div>
      {children}
    </div>
  );
}

export default function TeamPage() {
  const { teamId, league = "epl" } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const accent = LEAGUE_COLORS[league] || "#3d8ce8";

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    fetch(`${BACKEND}/api/team/${teamId}/profile?league=${league}`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [teamId, league]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#444", fontSize: 13, letterSpacing: "0.1em" }}>LOADING</div>
    </div>
  );

  if (error || !data) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#e84040", fontSize: 13 }}>Failed to load team data</div>
    </div>
  );

  const { standing, stats, injuries, top_scorers, top_assists, upcoming_fixtures, league_name } = data;
  const teamName = standing?.team_name || "Team";
  const teamLogo = standing?.logo || "";
  const form = (standing?.form || "").slice(-5).split("");
  const rank = standing?.rank;
  const pts = standing?.points;
  const played = standing?.played || 0;
  const gd = standing?.goal_diff || 0;

  // Attack/defence derived stats
  const totalScored = (stats?.scored_home || 0) + (stats?.scored_away || 0);
  const totalConceded = (stats?.conceded_home || 0) + (stats?.conceded_away || 0);
  const totalPlayed = (stats?.played_home || 0) + (stats?.played_away || 0);
  const gpg = totalPlayed ? (totalScored / totalPlayed).toFixed(2) : "—";
  const cpg = totalPlayed ? (totalConceded / totalPlayed).toFixed(2) : "—";

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e8e8e8", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* Back nav */}
      <div style={{ padding: "16px 24px 0" }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: "none", border: "none", color: "#555", fontSize: 12, cursor: "pointer", padding: 0, letterSpacing: "0.06em" }}
        >
          ← BACK
        </button>
      </div>

      {/* Hero header */}
      <div style={{
        padding: isMobile ? "24px 20px 20px" : "32px 40px 28px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: `linear-gradient(135deg, rgba(${accent === "#3d8ce8" ? "61,140,232" : accent === "#e84040" ? "232,64,64" : "26,26,255"},0.08) 0%, transparent 60%)`,
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          {teamLogo && (
            <img src={teamLogo} alt={teamName} style={{ width: 64, height: 64, objectFit: "contain", flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: accent, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
              {league_name}
            </div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 26 : 34, fontWeight: 700, letterSpacing: "-0.02em" }}>{teamName}</h1>
            <div style={{ marginTop: 10, display: "flex", gap: 20, flexWrap: "wrap" }}>
              {rank && (
                <div>
                  <span style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>Rank </span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: accent }}>{rank}</span>
                </div>
              )}
              {pts !== undefined && (
                <div>
                  <span style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>Points </span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "#e8e8e8" }}>{pts}</span>
                </div>
              )}
              {played > 0 && (
                <div>
                  <span style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>Played </span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "#e8e8e8" }}>{played}</span>
                </div>
              )}
              <div>
                <span style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>GD </span>
                <span style={{ fontSize: 18, fontWeight: 700, color: gd >= 0 ? "#00c896" : "#e84040" }}>
                  {gd >= 0 ? "+" : ""}{gd}
                </span>
              </div>
            </div>
          </div>
          {/* Form strip */}
          {form.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: isMobile ? "flex-start" : "flex-end" }}>
              <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>Recent form</div>
              <div style={{ display: "flex", gap: 4 }}>
                {form.map((r, i) => <FormBadge key={i} result={r} />)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "20px 16px" : "28px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>

          {/* LEFT COLUMN */}
          <div>

            {/* Attack profile */}
            <SectionCard title="Attack Profile" accent={accent}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#00c896" }}>{gpg}</div>
                  <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>Goals/Game</div>
                </div>
                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#e8e8e8" }}>{totalScored}</div>
                  <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>Total Scored</div>
                </div>
              </div>
              <StatBar label="Home scored" value={stats?.scored_home || 0} max={Math.max(totalScored, 1)} color="#00c896" />
              <StatBar label="Away scored" value={stats?.scored_away || 0} max={Math.max(totalScored, 1)} color="#00c896" />
              <StatBar label="Shots / game" value={stats?.shots_pg || 0} max={20} color={accent} />
              <StatBar label="Shot accuracy %" value={stats?.shots_on_target_pct || 0} max={100} color={accent} />
              <div style={{ marginTop: 16 }}>
                <GoalMinuteChart data={stats?.goals_by_minute} color="#00c896" label="Goals scored by minute" />
              </div>
            </SectionCard>

            {/* Defence profile */}
            <SectionCard title="Defence Profile" accent="#e84040">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#e84040" }}>{cpg}</div>
                  <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>Conceded/Game</div>
                </div>
                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#e8e8e8" }}>{stats?.clean_sheets || 0}</div>
                  <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>Clean Sheets</div>
                </div>
              </div>
              <StatBar label="Home conceded" value={stats?.conceded_home || 0} max={Math.max(totalConceded, 1)} color="#e84040" />
              <StatBar label="Away conceded" value={stats?.conceded_away || 0} max={Math.max(totalConceded, 1)} color="#e84040" />
              <StatBar label="Failed to score" value={stats?.failed_to_score || 0} max={Math.max(played, 1)} color="#888" />
              <div style={{ marginTop: 16 }}>
                <GoalMinuteChart data={stats?.conceded_by_minute} color="#e84040" label="Goals conceded by minute" />
              </div>
            </SectionCard>

          </div>

          {/* RIGHT COLUMN */}
          <div>

            {/* Home vs Away split */}
            <SectionCard title="Home vs Away Split" accent={accent}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Home", played: stats?.played_home, scored: stats?.scored_home, conceded: stats?.conceded_home },
                  { label: "Away", played: stats?.played_away, scored: stats?.scored_away, conceded: stats?.conceded_away },
                ].map(side => (
                  <div key={side.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "14px 16px" }}>
                    <div style={{ fontSize: 11, color: accent, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>{side.label}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {[
                        { l: "Played", v: side.played },
                        { l: "Scored", v: side.scored },
                        { l: "Conceded", v: side.conceded },
                      ].map(row => (
                        <div key={row.l} style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 12, color: "#666" }}>{row.l}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#e8e8e8" }}>{row.v ?? "—"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { l: "Possession", v: `${stats?.possession_avg || 50}%` },
                  { l: "Pass accuracy", v: `${stats?.pass_accuracy || "—"}%` },
                  { l: "Formation", v: stats?.formation || "—" },
                  { l: "Shots/game", v: stats?.shots_pg || "—" },
                ].map(item => (
                  <div key={item.l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize: 12, color: "#666" }}>{item.l}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#e8e8e8" }}>{item.v}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Upcoming fixtures */}
            {upcoming_fixtures?.length > 0 && (
              <SectionCard title="Next Fixtures" accent={accent}>
                {upcoming_fixtures.map((fx, i) => {
                  const isHome = fx.home_team === teamName;
                  const opp = isHome ? fx.away_team : fx.home_team;
                  const oppLogo = isHome ? fx.away_logo : fx.home_logo;
                  const prob = isHome ? fx.home_win_prob : fx.away_win_prob;
                  const probPct = Math.round((prob || 0) * 100);
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                      borderBottom: i < upcoming_fixtures.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    }}>
                      {oppLogo && <img src={oppLogo} alt={opp} style={{ width: 24, height: 24, objectFit: "contain", flexShrink: 0 }} />}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>
                          <span style={{ color: isHome ? accent : "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", marginRight: 6 }}>
                            {isHome ? "H" : "A"}
                          </span>
                          {opp}
                        </div>
                        <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{fx.fixture_date}</div>
                      </div>
                      {probPct > 0 && (
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: probPct >= 50 ? "#00c896" : "#888" }}>{probPct}%</div>
                          <div style={{ fontSize: 10, color: "#444" }}>win prob</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </SectionCard>
            )}

            {/* Top scorers */}
            {top_scorers?.length > 0 && (
              <SectionCard title="Top Scorers" accent={accent}>
                {top_scorers.slice(0, 5).map((p, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                    borderBottom: i < Math.min(top_scorers.length, 5) - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}>
                    {p.photo && <img src={p.photo} alt={p.name} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: "#555" }}>{p.played} apps</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#00c896" }}>{p.goals}</span>
                      <span style={{ fontSize: 11, color: "#555", marginLeft: 4 }}>goals</span>
                    </div>
                  </div>
                ))}
              </SectionCard>
            )}

            {/* Top assists */}
            {top_assists?.length > 0 && (
              <SectionCard title="Top Creators" accent={accent}>
                {top_assists.slice(0, 5).map((p, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                    borderBottom: i < Math.min(top_assists.length, 5) - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}>
                    {p.photo && <img src={p.photo} alt={p.name} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: accent }}>{p.assists}</span>
                      <span style={{ fontSize: 11, color: "#555", marginLeft: 4 }}>assists</span>
                    </div>
                  </div>
                ))}
              </SectionCard>
            )}

            {/* Injuries */}
            {injuries?.length > 0 && (
              <SectionCard title={`Injuries (${injuries.length})`} accent="#e84040">
                {injuries.slice(0, 6).map((inj, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                    borderBottom: i < Math.min(injuries.length, 6) - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}>
                    {inj.player_photo && <img src={inj.player_photo} alt={inj.player_name} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{inj.player_name}</div>
                      <div style={{ fontSize: 11, color: "#e84040", marginTop: 1 }}>{inj.reason || inj.type}</div>
                    </div>
                  </div>
                ))}
              </SectionCard>
            )}

          </div>
        </div>

        {/* Link to predictions */}
        <div style={{ textAlign: "center", marginTop: 8, paddingBottom: 40 }}>
          <Link
            to={`/predictions/${LEAGUE_SLUGS[league] || league}`}
            style={{ fontSize: 12, color: accent, textDecoration: "none", letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            View {league_name} Predictions →
          </Link>
        </div>
      </div>
    </div>
  );