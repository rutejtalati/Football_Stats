// ═══════════════════════════════════════════════════════
// MatchLineups.jsx  —  StatinSite v2
//
// Fetches /api/match-lineup/{fixture_id} and renders:
//   • Pitch (both teams)
//   • Not Available panel (injured / suspended / doubtful)
//   • Right-side analytics panel:
//       - Formation Matchup
//       - Squad Strength
//       - Player Availability
//       - Recent Form
//       - Tactical Battle
// ═══════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import Pitch from "./Pitch";

const API = import.meta.env.VITE_API_URL || "https://football-stats-lw4b.onrender.com";

// ── Helpers ──────────────────────────────────────────────

function avg(arr, key) {
  const vals = arr.map(p => Number(p[key] || 0)).filter(v => v > 0);
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
}

function midfielderCount(formation) {
  if (!formation) return 0;
  const parts = formation.split("-").map(Number);
  return parts.length >= 3 ? parts[parts.length - 2] : 0;
}

function tacticalBattle(home, away) {
  const hf = home?.formation || "?";
  const af = away?.formation || "?";
  const hMid = midfielderCount(hf);
  const aMid = midfielderCount(af);

  const lines = [];

  // Midfield edge
  if (hMid > aMid) lines.push(`${home?.team_name || "Home"} have midfield numerical edge (${hMid} vs ${aMid})`);
  else if (aMid > hMid) lines.push(`${away?.team_name || "Away"} press with midfield overload (${aMid} vs ${hMid})`);
  else lines.push("Balanced midfield battle expected");

  // Structural matchup
  if (hf === "4-2-3-1") lines.push(`${home?.team_name || "Home"} double pivot shelters against ${af} attack`);
  else if (hf === "4-3-3") lines.push(`${home?.team_name || "Home"} high press could expose ${af} fullbacks`);
  else if (hf.startsWith("3")) lines.push(`${home?.team_name || "Home"} three-back offers width in buildup`);

  return lines.slice(0, 2).join(" · ");
}

// ── Sub-components ───────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize:      9,
      fontWeight:    900,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color:         "rgba(255,255,255,0.3)",
      marginBottom:  8,
      fontFamily:    "monospace",
    }}>
      {children}
    </div>
  );
}

function Panel({ children, style }) {
  return (
    <div style={{
      background:   "rgba(255,255,255,0.03)",
      border:       "1px solid rgba(255,255,255,0.07)",
      borderRadius: 10,
      padding:      "12px 14px",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Formation Matchup ────────────────────────────────────
function FormationMatchup({ home, away }) {
  if (!home?.formation && !away?.formation) return null;
  const hMid = midfielderCount(home?.formation || "");
  const aMid = midfielderCount(away?.formation || "");
  const midWinner = hMid > aMid ? home?.team_name : aMid > hMid ? away?.team_name : "Even";

  return (
    <Panel>
      <SectionLabel>Formation Matchup</SectionLabel>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)", marginBottom:3 }}>{home?.team_name}</div>
          <div style={{ fontSize:20, fontWeight:900, color:"#60a5fa", fontFamily:"monospace" }}>
            {home?.formation || "—"}
          </div>
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.15)", fontWeight:700 }}>vs</div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)", marginBottom:3 }}>{away?.team_name}</div>
          <div style={{ fontSize:20, fontWeight:900, color:"#fb923c", fontFamily:"monospace" }}>
            {away?.formation || "—"}
          </div>
        </div>
      </div>
      <div style={{
        fontSize:9, color:"rgba(255,255,255,0.4)",
        borderTop:"1px solid rgba(255,255,255,0.06)",
        paddingTop:8,
      }}>
        Midfield Control Edge:{" "}
        <span style={{ color:"#34d399", fontWeight:700 }}>{midWinner}</span>
      </div>
    </Panel>
  );
}

// ── Squad Strength ───────────────────────────────────────
function SquadStrength({ home, away }) {
  const hRating = avg(home?.starting_xi || [], "rating");
  const aRating = avg(away?.starting_xi || [], "rating");
  if (!hRating && !aRating) return null;

  return (
    <Panel>
      <SectionLabel>Squad Strength</SectionLabel>
      <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)", marginBottom:6 }}>
        Avg Starting XI Rating
      </div>
      {[
        { label: home?.team_name, val: hRating, color:"#60a5fa" },
        { label: away?.team_name, val: aRating, color:"#fb923c" },
      ].map(({ label, val, color }) => val ? (
        <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
          <span style={{ fontSize:10, color:"rgba(200,215,240,0.7)" }}>{label}</span>
          <span style={{ fontSize:13, fontWeight:900, color, fontFamily:"monospace" }}>
            {val.toFixed(2)}
          </span>
        </div>
      ) : null)}
    </Panel>
  );
}

// ── Availability Counts ──────────────────────────────────
function AvailabilityCount({ home, away }) {
  const hMissing = (home?.injuries?.length || 0) + (home?.doubts?.length || 0);
  const aMissing = (away?.injuries?.length || 0) + (away?.doubts?.length || 0);

  return (
    <Panel>
      <SectionLabel>Player Availability</SectionLabel>
      <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)", marginBottom:6 }}>
        Players Missing
      </div>
      {[
        { label: home?.team_name, val: hMissing, color:"#60a5fa" },
        { label: away?.team_name, val: aMissing, color:"#fb923c" },
      ].map(({ label, val, color }) => (
        <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
          <span style={{ fontSize:10, color:"rgba(200,215,240,0.7)" }}>{label}</span>
          <span style={{
            fontSize:13, fontWeight:900, fontFamily:"monospace",
            color: val >= 3 ? "#f87171" : val >= 1 ? "#fbbf24" : "#34d399",
          }}>
            {val}
          </span>
        </div>
      ))}
    </Panel>
  );
}

// ── Recent Form ──────────────────────────────────────────
const FORM_COLORS = { W:"#16a34a", D:"#ca8a04", L:"#dc2626" };

function FormBadge({ r }) {
  return (
    <span style={{
      display:        "inline-flex",
      alignItems:     "center",
      justifyContent: "center",
      width:          18,
      height:         18,
      borderRadius:   4,
      background:     FORM_COLORS[r] || "#334155",
      color:          "#fff",
      fontSize:       9,
      fontWeight:     900,
      flexShrink:     0,
    }}>
      {r}
    </span>
  );
}

function RecentForm({ home, away }) {
  const hForm = home?.recent_form || [];
  const aForm = away?.recent_form || [];
  if (!hForm.length && !aForm.length) return null;

  return (
    <Panel>
      <SectionLabel>Recent Form</SectionLabel>
      <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)", marginBottom:8 }}>Last 5 Matches</div>
      {[
        { label: home?.team_name, form: hForm },
        { label: away?.team_name, form: aForm },
      ].map(({ label, form }) => (
        <div key={label} style={{ marginBottom:8 }}>
          <div style={{ fontSize:9, color:"rgba(200,215,240,0.5)", marginBottom:4 }}>{label}</div>
          <div style={{ display:"flex", gap:3 }}>
            {form.slice(0, 5).map((r, i) => <FormBadge key={i} r={r} />)}
            {form.length === 0 && <span style={{ fontSize:9, color:"rgba(255,255,255,0.2)" }}>No data</span>}
          </div>
        </div>
      ))}
    </Panel>
  );
}

// ── Tactical Battle ──────────────────────────────────────
function TacticalBattle({ home, away }) {
  const insight = tacticalBattle(home, away);
  return (
    <Panel>
      <SectionLabel>Tactical Battle</SectionLabel>
      <div style={{ fontSize:11, lineHeight:1.5, color:"rgba(200,220,255,0.7)", fontStyle:"italic" }}>
        "{insight}"
      </div>
    </Panel>
  );
}

// ── Not Available Panel ──────────────────────────────────
function NotAvailableTable({ team, injuries, doubts }) {
  const all = [
    ...(injuries || []).map(p => ({ ...p, status: "Not Available" })),
    ...(doubts   || []).map(p => ({ ...p, status: "Doubtful" })),
  ];
  if (all.length === 0) return null;

  return (
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{
        fontSize:9, fontWeight:900, letterSpacing:"0.1em",
        textTransform:"uppercase", color:"rgba(255,255,255,0.35)",
        marginBottom:6,
      }}>
        {team}
      </div>
      <div style={{
        background:   "rgba(255,255,255,0.02)",
        border:       "1px solid rgba(255,255,255,0.06)",
        borderRadius: 8,
        overflow:     "hidden",
      }}>
        {/* Header */}
        <div style={{
          display:"flex", padding:"5px 10px",
          borderBottom:"1px solid rgba(255,255,255,0.05)",
          fontSize:8, fontWeight:800, letterSpacing:"0.08em",
          color:"rgba(255,255,255,0.25)",
        }}>
          <div style={{ flex:1 }}>PLAYER</div>
          <div>STATUS</div>
        </div>
        {all.map((p, i) => (
          <div key={p.id ?? i} style={{
            display:      "flex",
            alignItems:   "center",
            padding:      "5px 10px",
            borderBottom: i < all.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
          }}>
            <div style={{
              flex:1, fontSize:10, fontWeight:700,
              color:"rgba(200,215,240,0.75)",
              overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis",
            }}>
              {p.name || p.player_name || "Unknown"}
            </div>
            <div style={{
              fontSize:8, fontWeight:800,
              color: p.status === "Doubtful" ? "#fbbf24" : "rgba(200,215,240,0.4)",
              letterSpacing:"0.06em",
            }}>
              {p.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Bench List ───────────────────────────────────────────
function BenchList({ team, players, color }) {
  if (!players?.length) return null;
  return (
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{
        fontSize:9, fontWeight:900, letterSpacing:"0.1em",
        textTransform:"uppercase", color:"rgba(255,255,255,0.25)",
        marginBottom:6,
      }}>
        {team} Bench
      </div>
      <div style={{
        display:"flex", flexDirection:"column", gap:2,
        background:"rgba(255,255,255,0.02)",
        border:"1px solid rgba(255,255,255,0.05)",
        borderRadius:8, padding:"6px 10px",
      }}>
        {players.slice(0, 9).map((p, i) => (
          <div key={p.id ?? i} style={{
            fontSize:10, fontWeight:600,
            color:"rgba(180,200,230,0.6)",
            display:"flex", alignItems:"center", gap:6,
          }}>
            <span style={{ fontSize:8, color:`${color}66`, width:12, textAlign:"right" }}>
              {p.number ?? ""}
            </span>
            {p.name}
            <span style={{ fontSize:8, color:"rgba(255,255,255,0.2)", marginLeft:"auto" }}>
              {p.pos}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Coach Card ───────────────────────────────────────────
function CoachRow({ name, photo, color }) {
  const [imgErr, setImgErr] = useState(false);
  if (!name) return null;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
      <div style={{
        width:24, height:24, borderRadius:"50%",
        border:`1.5px solid ${color}55`,
        background:"rgba(0,0,0,0.5)",
        overflow:"hidden", flexShrink:0,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:10, color,
      }}>
        {photo && !imgErr
          ? <img src={photo} alt={name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={() => setImgErr(true)}/>
          : "👔"
        }
      </div>
      <div>
        <div style={{ fontSize:8, color:"rgba(255,255,255,0.3)", letterSpacing:"0.08em" }}>MANAGER</div>
        <div style={{ fontSize:11, fontWeight:800, color }}>{name}</div>
      </div>
    </div>
  );
}

// ── Mode Badge ───────────────────────────────────────────
function ModeBadge({ mode }) {
  const isOfficial = mode === "official";
  return (
    <span style={{
      fontSize:9, fontWeight:900, letterSpacing:"0.1em",
      textTransform:"uppercase",
      color:      isOfficial ? "#34d399" : "#f59e0b",
      background: isOfficial ? "rgba(52,211,153,0.12)" : "rgba(245,158,11,0.12)",
      padding:    "2px 8px", borderRadius:999,
      border:     `1px solid ${isOfficial ? "rgba(52,211,153,0.25)" : "rgba(245,158,11,0.25)"}`,
    }}>
      {isOfficial ? "✓ Official Lineup" : "⚡ AI Predicted Lineup"}
    </span>
  );
}

// ── Main Component ───────────────────────────────────────
export default function MatchLineups({ fixtureId }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!fixtureId) return;
    setLoading(true); setError(null);
    fetch(`${API}/api/match-lineup/${fixtureId}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d  => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [fixtureId]);

  if (loading) return (
    <div style={{ padding:40, textAlign:"center", color:"rgba(255,255,255,0.3)", fontSize:13 }}>
      Loading lineups…
    </div>
  );
  if (error) return (
    <div style={{
      padding:20, borderRadius:10,
      background:"rgba(220,38,38,0.1)", border:"1px solid rgba(220,38,38,0.2)",
      color:"#f87171", fontSize:12,
    }}>
      Failed to load lineups: {error}
    </div>
  );
  if (!data) return null;

  const { home, away, mode } = data;

  const hasUnavailable =
    (home?.injuries?.length || 0) + (home?.doubts?.length || 0) +
    (away?.injuries?.length || 0) + (away?.doubts?.length || 0) > 0;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* Mode badge */}
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <ModeBadge mode={mode} />
      </div>

      {/* Main layout: pitch + analytics */}
      <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>

        {/* Left: pitch */}
        <div style={{ flex:"0 0 auto", width:"min(380px, 100%)" }}>
          <Pitch home={home} away={away} mode={mode} />
        </div>

        {/* Right: analytics */}
        <div style={{
          flex:1, minWidth:0,
          display:"flex", flexDirection:"column", gap:10,
        }}>
          {/* Coach row */}
          <div style={{ display:"flex", gap:16 }}>
            {home?.coach && (
              <div style={{ flex:1 }}>
                <CoachRow name={home.coach} photo={home.coach_photo} color="#60a5fa" />
              </div>
            )}
            {away?.coach && (
              <div style={{ flex:1 }}>
                <CoachRow name={away.coach} photo={away.coach_photo} color="#fb923c" />
              </div>
            )}
          </div>

          <FormationMatchup home={home} away={away} />
          <SquadStrength    home={home} away={away} />
          <AvailabilityCount home={home} away={away} />
          <RecentForm       home={home} away={away} />
          <TacticalBattle   home={home} away={away} />
        </div>
      </div>

      {/* Bench rows */}
      <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
        <BenchList team={home?.team_name} players={home?.bench} color="#60a5fa" />
        <BenchList team={away?.team_name} players={away?.bench} color="#fb923c" />
      </div>

      {/* Not Available */}
      {hasUnavailable && (
        <div>
          <div style={{
            fontSize:10, fontWeight:800, letterSpacing:"0.12em",
            textTransform:"uppercase", color:"rgba(255,255,255,0.25)",
            marginBottom:8,
          }}>
            Not Available
          </div>
          <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
            <NotAvailableTable
              team={home?.team_name}
              injuries={home?.injuries}
              doubts={home?.doubts}
            />
            <NotAvailableTable
              team={away?.team_name}
              injuries={away?.injuries}
              doubts={away?.doubts}
            />
          </div>
        </div>
      )}
    </div>
  );
}