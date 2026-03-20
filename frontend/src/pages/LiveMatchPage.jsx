// ═══════════════════════════════════════════════════════════════════
// StatinSite — Match Detail Page
// Mode-driven: prematch / live / fulltime
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

const BACKEND = "https://football-stats-lw4b.onrender.com";

// ─── Mode derivation ─────────────────────────────────────────────────────────

const LIVE_STATUSES = new Set(["1H","2H","HT","ET","BT","P"]);
const FT_STATUSES   = new Set(["FT","AET","PEN","AWD","WO"]);

function deriveMode(statusShort) {
  if (!statusShort || statusShort === "NS" || statusShort === "TBD") return "prematch";
  if (LIVE_STATUSES.has(statusShort)) return "live";
  if (FT_STATUSES.has(statusShort))   return "fulltime";
  return "prematch";
}

// ─── Utility helpers ─────────────────────────────────────────────────────────

function fmtMin(elapsed, extra) {
  if (!elapsed) return "";
  return extra ? `${elapsed}+${extra}'` : `${elapsed}'`;
}

function getStat(statsArr, teamId, key) {
  return statsArr?.find(s => s.team?.id === teamId)
    ?.statistics?.find(s => s.type === key)?.value ?? null;
}

function fmtKickoff(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(); tomorrow.setDate(now.getDate() + 1);
  const sameDay = (a, b) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (sameDay(d, now))       return `Today · ${timeStr}`;
  if (sameDay(d, tomorrow))  return `Tomorrow · ${timeStr}`;
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" }) + ` · ${timeStr}`;
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 900, letterSpacing: "0.12em",
      color: "rgba(255,255,255,0.96)", textTransform: "uppercase",
      marginBottom: 14,
    }}>
      {children}
    </div>
  );
}

function Pill({ children, color = "rgba(255,255,255,0.07)", textColor = "rgba(255,255,255,0.82)" }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
      background: color, color: textColor,
      padding: "3px 8px", borderRadius: 999,
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      {children}
    </span>
  );
}

function LiveDot() {
  return (
    <span style={{
      width: 5, height: 5, borderRadius: "50%",
      background: "#ff4444",
      animation: "livePulse 1.5s ease-in-out infinite",
      display: "inline-block",
    }} />
  );
}

function EventIcon({ type, detail }) {
  const t = (type   || "").toLowerCase();
  const d = (detail || "").toLowerCase();
  const base = { width: 10, height: 10, borderRadius: "50%", display: "inline-block", flexShrink: 0 };

  if (t === "goal" && d.includes("own"))
    return <span style={{ ...base, background: "#ef4444" }} title="Own Goal" />;
  if (t === "goal" && d.includes("penalty"))
    return <span style={{ ...base, background: "#facc15" }} title="Penalty Goal" />;
  if (t === "goal")
    return <span style={{ ...base, background: "#34d399" }} title="Goal" />;
  if (t === "card" && d.includes("red"))
    return <span style={{ ...base, borderRadius: 2, background: "#ef4444" }} title="Red Card" />;
  if (t === "card" && d.includes("yellow"))
    return <span style={{ ...base, borderRadius: 2, background: "#fbbf24" }} title="Yellow Card" />;
  if (t === "subst")
    return <span style={{ fontSize: 9, color: "#4ade80", fontWeight: 900 }}>SUB</span>;
  if (t === "var")
    return <span style={{ fontSize: 9, color: "#a78bfa", fontWeight: 900 }}>VAR</span>;
  return <span style={{ fontSize: 9, color: "rgba(255,255,255,0.6)" }}>–</span>;
}

function StatBar({ label, home, away, homeColor = "#3b82f6", awayColor = "#ef4444" }) {
  const hNum  = parseFloat(String(home ?? "0").replace("%","")) || 0;
  const aNum  = parseFloat(String(away ?? "0").replace("%","")) || 0;
  const total = hNum + aNum || 1;
  const hPct  = (hNum / total) * 100;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:13, fontWeight:800, color:"#e2e8f0", fontFamily:"'JetBrains Mono',monospace", minWidth:40 }}>{home ?? "–"}</span>
        <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.6)", letterSpacing:"0.06em", textTransform:"uppercase", textAlign:"center", flex:1 }}>{label}</span>
        <span style={{ fontSize:13, fontWeight:800, color:"#e2e8f0", fontFamily:"'JetBrains Mono',monospace", minWidth:40, textAlign:"right" }}>{away ?? "–"}</span>
      </div>
      <div style={{ display:"flex", height:4, borderRadius:3, overflow:"hidden", background:"rgba(255,255,255,0.06)" }}>
        <div style={{ width:`${hPct}%`, background:homeColor, transition:"width 0.6s ease" }} />
        <div style={{ width:`${100-hPct}%`, background:awayColor, transition:"width 0.6s ease" }} />
      </div>
    </div>
  );
}

function PitchSvg() {
  return (
    <svg viewBox="0 0 340 220" style={{ position:"absolute", inset:0, width:"100%", height:"100%" }}>
      <rect x="0" y="0" width="340" height="220" fill="#142a1d" rx="4" />
      {[...Array(8)].map((_,i) => (
        <rect key={i} x={i*42.5} y="0" width="21.25" height="220" fill="rgba(255,255,255,0.018)" />
      ))}
      <rect x="8" y="8" width="324" height="204" fill="none" stroke="rgba(255,255,255,0.82)" strokeWidth="1.5" />
      <line x1="170" y1="8" x2="170" y2="212" stroke="rgba(255,255,255,0.82)" strokeWidth="1.5" />
      <circle cx="170" cy="110" r="34" fill="none" stroke="rgba(255,255,255,0.82)" strokeWidth="1.5" />
      <circle cx="170" cy="110" r="2" fill="#fff" />
      <rect x="8"   y="62" width="54" height="96" fill="none" stroke="rgba(255,255,255,0.82)" strokeWidth="1.5" />
      <rect x="8"   y="86" width="22" height="48" fill="none" stroke="rgba(255,255,255,0.82)" strokeWidth="1.5" />
      <circle cx="62"  cy="110" r="1.5" fill="#fff" />
      <rect x="278" y="62" width="54" height="96" fill="none" stroke="rgba(255,255,255,0.82)" strokeWidth="1.5" />
      <rect x="310" y="86" width="22" height="48" fill="none" stroke="rgba(255,255,255,0.82)" strokeWidth="1.5" />
      <circle cx="278" cy="110" r="1.5" fill="#fff" />
    </svg>
  );
}

// ─── PREMATCH components ──────────────────────────────────────────────────────

function PreMatchHero({ fixture, homeTeam, awayTeam, status }) {
  const kickoff = fmtKickoff(fixture?.date);
  return (
    <div style={{
      position:"relative",
      background:"linear-gradient(160deg,#0d1b2a 0%,#080f1a 60%,#050c14 100%)",
      borderBottom:"1px solid rgba(255,255,255,0.06)",
      overflow:"hidden",
      padding:"28px 24px 24px",
    }}>
      <div style={{ position:"absolute", top:-80, left:"10%",  width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(96,165,250,0.06),transparent 70%)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", top:-80, right:"10%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(239,68,68,0.06),transparent 70%)",  pointerEvents:"none" }} />

      {/* Competition */}
      <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:8, marginBottom:22 }}>
        {fixture?.league?.logo && (
          <img src={fixture.league.logo} alt="" width={16} height={16} style={{ objectFit:"contain" }} />
        )}
        <span style={{ fontSize:10, fontWeight:700, color:"#fff", letterSpacing:"0.1em", textTransform:"uppercase" }}>
          {fixture?.league?.name}{fixture?.league?.round ? ` · ${fixture.league.round}` : ""}
        </span>
      </div>

      {/* Teams */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, maxWidth:600, margin:"0 auto" }}>
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
          <img src={homeTeam?.logo} alt={homeTeam?.name} width={60} height={60}
            style={{ objectFit:"contain" }} onError={e => e.currentTarget.style.opacity="0"} />
          <span style={{ fontSize:14, fontWeight:900, color:"#f0f6ff", textAlign:"center" }}>{homeTeam?.name}</span>
          <Pill textColor="#94a3b8">Home</Pill>
        </div>

        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, flexShrink:0 }}>
          {kickoff ? (
            <>
              <span style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.6)", letterSpacing:"0.06em" }}>KICK OFF</span>
              <span style={{ fontSize:18, fontWeight:900, color:"#f0f6ff", letterSpacing:"-0.01em" }}>{kickoff}</span>
            </>
          ) : (
            <span style={{ fontSize:16, fontWeight:700, color:"rgba(255,255,255,0.96)" }}>VS</span>
          )}
          {fixture?.venue?.name && (
            <span style={{ fontSize:10, color:"rgba(255,255,255,0.96)", textAlign:"center", maxWidth:160 }}>
              {fixture.venue.name}{fixture?.venue?.city ? `, ${fixture.venue.city}` : ""}
            </span>
          )}
        </div>

        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
          <img src={awayTeam?.logo} alt={awayTeam?.name} width={60} height={60}
            style={{ objectFit:"contain" }} onError={e => e.currentTarget.style.opacity="0"} />
          <span style={{ fontSize:14, fontWeight:900, color:"#f0f6ff", textAlign:"center" }}>{awayTeam?.name}</span>
          <Pill textColor="#94a3b8">Away</Pill>
        </div>
      </div>
    </div>
  );
}

function PredictionStrip({ winProb, homeTeam, awayTeam }) {
  if (!winProb) return null;
  const { pre_match, markets } = winProb;
  if (!pre_match) return null;

  const { p_home_win, p_draw, p_away_win, xg_home, xg_away, top_scorelines } = pre_match;

  const Edge = ({ label, value, highlight }) => (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center", gap:4,
      padding:"10px 16px",
      background: highlight ? "rgba(96,165,250,0.08)" : "rgba(255,255,255,0.025)",
      border: `1px solid ${highlight ? "rgba(96,165,250,0.2)" : "rgba(255,255,255,0.05)"}`,
      borderRadius:12, flex:1, minWidth:80,
    }}>
      <span style={{ fontSize:18, fontWeight:900, color: highlight ? "#60a5fa" : "#f0f6ff", fontFamily:"'JetBrains Mono',monospace" }}>{value}</span>
      <span style={{ fontSize:9, fontWeight:700, color:"#fff", letterSpacing:"0.08em", textTransform:"uppercase", textAlign:"center" }}>{label}</span>
    </div>
  );

  return (
    <div style={{ padding:"20px 24px", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
      <SectionLabel>Model Prediction</SectionLabel>

      {/* Win prob bar */}
      <div style={{ marginBottom:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, fontSize:11, fontWeight:800 }}>
          <span style={{ color:"#60a5fa" }}>{homeTeam?.name?.split(" ").pop()} {p_home_win}%</span>
          <span style={{ color:"#fff" }}>Draw {p_draw}%</span>
          <span style={{ color:"#f87171" }}>{awayTeam?.name?.split(" ").pop()} {p_away_win}%</span>
        </div>
        <div style={{ display:"flex", height:8, borderRadius:999, overflow:"hidden", gap:2 }}>
          <div style={{ width:`${p_home_win}%`, background:"linear-gradient(90deg,#3b82f688,#3b82f6)", boxShadow: p_home_win > p_away_win ? "0 0 10px #3b82f699" : "none", borderRadius:"999px 0 0 999px", transition:"width 0.8s ease" }} />
          <div style={{ width:`${p_draw}%`,     background:"rgba(255,255,255,0.82)" }} />
          <div style={{ width:`${p_away_win}%`, background:"linear-gradient(90deg,#ef444488,#ef4444)", boxShadow: p_away_win > p_home_win ? "0 0 10px #ef444499" : "none", borderRadius:"0 999px 999px 0", transition:"width 0.8s ease" }} />
        </div>
      </div>

      {/* Key metrics */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {xg_home != null && <Edge label={`${homeTeam?.name?.split(" ").pop()} xG`} value={xg_home} />}
        {xg_away != null && <Edge label={`${awayTeam?.name?.split(" ").pop()} xG`} value={xg_away} />}
        {markets?.over_2_5 != null && <Edge label="Over 2.5" value={`${Math.round((markets.over_2_5 > 1 ? markets.over_2_5 : markets.over_2_5 * 100))}%`} highlight />}
        {markets?.btts     != null && <Edge label="BTTS"     value={`${Math.round((markets.btts > 1 ? markets.btts : markets.btts * 100))}%`} />}
      </div>

      {/* Top scorelines */}
      {top_scorelines?.length > 0 && (
        <div style={{ marginTop:14 }}>
          <div style={{ fontSize:9, fontWeight:800, color:"rgba(255,255,255,0.96)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>
            Likely Scorelines
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {top_scorelines.slice(0,5).map(s => (
              <div key={s.score} style={{
                padding:"4px 10px", borderRadius:8,
                background:"rgba(255,255,255,0.04)",
                border:"1px solid rgba(255,255,255,0.07)",
                fontSize:11, fontWeight:800, color:"#e2e8f0",
                fontFamily:"'JetBrains Mono',monospace",
              }}>
                {s.score} <span style={{ color:"#fff", fontSize:9 }}>{s.probability}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FormRow({ label, form }) {
  if (!form) return null;
  const results = form.slice(-5).split("");
  const color = r => r === "W" ? "#34d399" : r === "L" ? "#f87171" : "#94a3b8";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <span style={{ fontSize:10, fontWeight:700, color:"#fff", width:80 }}>{label}</span>
      <div style={{ display:"flex", gap:4 }}>
        {results.map((r,i) => (
          <div key={i} style={{
            width:22, height:22, borderRadius:4,
            background:`${color(r)}22`,
            border:`1px solid ${color(r)}55`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:9, fontWeight:900, color:color(r),
          }}>{r}</div>
        ))}
      </div>
    </div>
  );
}

function MatchupPanel({ homeStats, awayStats, homeTeam, awayTeam }) {
  if (!homeStats && !awayStats) return null;

  const rows = [
    { label:"Avg Goals For",     h: homeStats?.scored_home,   a: awayStats?.scored_away   },
    { label:"Avg Goals Against", h: homeStats?.conceded_home, a: awayStats?.conceded_away  },
  ].filter(r => r.h != null || r.a != null);

  return (
    <div style={{ padding:"20px 24px", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
      <SectionLabel>Recent Form</SectionLabel>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <FormRow label={homeTeam?.name?.split(" ").pop()} form={homeStats?.form} />
        <FormRow label={awayTeam?.name?.split(" ").pop()} form={awayStats?.form} />
      </div>
      {rows.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:16 }}>
          {rows.map(r => (
            <StatBar key={r.label} label={r.label} home={r.h} away={r.a} />
          ))}
        </div>
      )}
    </div>
  );
}

function InjuryPanel({ injuries, homeTeam, awayTeam }) {
  if (!injuries?.length) return null;

  const homeInj = injuries.filter(i => (i.team?.id ?? i.player?.team?.id) === homeTeam?.id);
  const awayInj = injuries.filter(i => (i.team?.id ?? i.player?.team?.id) === awayTeam?.id);
  if (!homeInj.length && !awayInj.length) return null;

  const InjRow = ({ inj }) => {
    const player = inj.player || {};
    const type   = inj.player?.type || inj.type || "Injury";
    return (
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.03)" }}>
        <div style={{
          width:6, height:6, borderRadius:"50%",
          background: type.toLowerCase().includes("suspend") ? "#fbbf24" : "#f87171",
          flexShrink:0,
        }} />
        <span style={{ fontSize:12, fontWeight:600, color:"#fff", flex:1 }}>{player.name || "Unknown"}</span>
        <span style={{ fontSize:10, color:"#fff", fontWeight:600 }}>{type}</span>
      </div>
    );
  };

  return (
    <div style={{ padding:"20px 24px", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
      <SectionLabel>Availability</SectionLabel>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        {[{ team:homeTeam, list:homeInj },{ team:awayTeam, list:awayInj }].map(({ team, list }) => (
          <div key={team?.id}>
            <div style={{ fontSize:10, fontWeight:800, color:"#fff", marginBottom:8 }}>
              {team?.name}
              <span style={{ marginLeft:6, fontSize:9, color:"#f87171", fontWeight:700 }}>
                {list.length > 0 ? `${list.length} doubt${list.length > 1 ? "s" : ""}` : ""}
              </span>
            </div>
            {list.length === 0
              ? <span style={{ fontSize:11, color:"rgba(255,255,255,0.96)" }}>No known issues</span>
              : list.slice(0,6).map((inj,i) => <InjRow key={i} inj={inj} />)
            }
          </div>
        ))}
      </div>
    </div>
  );
}

function PredictedLineupsPanel({ predictedHome, predictedAway, homeTeam, awayTeam }) {
  const hasAny = predictedHome?.start_xi?.length || predictedAway?.start_xi?.length;
  if (!hasAny) return null;

  function PlayerChip({ player, color }) {
    const [hov, setHov] = useState(false);
    const conf = player.confidence;
    return (
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center", gap:3, cursor:"default" }}
      >
        <div style={{
          width:28, height:28, borderRadius:"50%",
          background:color,
          border:`2px solid ${conf > 75 ? "rgba(255,255,255,0.94)" : "rgba(255,255,255,0.15)"}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:9, fontWeight:900, color:"#fff",
          boxShadow: hov ? `0 0 12px ${color}` : "none",
          transition:"box-shadow 0.2s",
        }}>
          {player.number || "?"}
        </div>
        <span style={{ fontSize:8, fontWeight:700, color:"#c8d8e8", whiteSpace:"nowrap", maxWidth:52, overflow:"hidden", textOverflow:"ellipsis", textAlign:"center" }}>
          {player.name?.split(" ").pop()}
        </span>
        {conf && (
          <span style={{ fontSize:7, color: conf > 80 ? "#34d399" : conf > 60 ? "#fbbf24" : "#fff", fontWeight:700 }}>
            {conf}%
          </span>
        )}
        {hov && (
          <div style={{ position:"absolute", bottom:"105%", left:"50%", transform:"translateX(-50%)", background:"#0d1b2a", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"6px 10px", zIndex:20, whiteSpace:"nowrap", marginBottom:6 }}>
            <div style={{ fontSize:11, fontWeight:800, color:"#f0f6ff" }}>{player.name}</div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.94)" }}>{player.pos} · {conf}% confidence</div>
          </div>
        )}
      </div>
    );
  }

  function FormationLayout({ prediction, color }) {
    if (!prediction?.start_xi?.length) return null;
    const formation = prediction.formation || "4-3-3";
    const players   = prediction.start_xi;
    const rows      = [players.filter(p => p.group === "GK")];
    const formParts = formation.split("-");
    let idx = 0;
    formParts.forEach(n => {
      const count = parseInt(n);
      const group = idx === 0 ? "DEF" : idx === formParts.length - 1 ? "FWD" : "MID";
      rows.push(players.filter(p => p.group === group).slice(0, count));
      idx++;
    });
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"center", width:"100%" }}>
        <div style={{ fontSize:10, color:"#fff", fontWeight:700, marginBottom:4 }}>
          {formation}
          {prediction.predicted && (
            <span style={{ marginLeft:6, fontSize:8, color:"#fbbf24", fontWeight:800 }}>PREDICTED</span>
          )}
        </div>
        {rows.map((row, i) => (
          <div key={i} style={{ display:"flex", justifyContent:"space-around", width:"100%", gap:4 }}>
            {row.map((p, j) => <PlayerChip key={j} player={p} color={color} />)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding:"20px 24px", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
      <SectionLabel>Expected Lineups</SectionLabel>
      <div style={{ position:"relative", width:"100%", paddingBottom:"64%", borderRadius:12, overflow:"hidden", marginBottom:16 }}>
        <PitchSvg />
        <div style={{ position:"absolute", inset:0, display:"flex", padding:"12px 8px" }}>
          <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"space-around" }}>
            <FormationLayout prediction={predictedHome} color="rgba(59,130,246,0.85)" />
          </div>
          <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"space-around" }}>
            <FormationLayout prediction={predictedAway} color="rgba(239,68,68,0.8)" />
          </div>
        </div>
      </div>
      {(predictedHome?.confidence || predictedAway?.confidence) && (
        <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
          {predictedHome && (
            <Pill color="rgba(59,130,246,0.1)" textColor="#93c5fd">
              {homeTeam?.name} lineup confidence: {predictedHome.confidence}%
            </Pill>
          )}
          {predictedAway && (
            <Pill color="rgba(239,68,68,0.1)" textColor="#fca5a5">
              {awayTeam?.name} lineup confidence: {predictedAway.confidence}%
            </Pill>
          )}
        </div>
      )}
    </div>
  );
}

// ─── LIVE / FULLTIME shared components ──────────────────────────────────────

function ScoreHero({ fixture, homeTeam, awayTeam, score, status, mode, stats }) {
  const isLive  = mode === "live";
  const isFT    = mode === "fulltime";
  const hGoals  = score?.fulltime?.home  ?? score?.halftime?.home  ?? 0;
  const aGoals  = score?.fulltime?.away  ?? score?.halftime?.away  ?? 0;
  const homeWin = hGoals > aGoals;
  const awayWin = aGoals > hGoals;

  const hXG   = getStat(stats, homeTeam?.id, "expected_goals");
  const aXG   = getStat(stats, awayTeam?.id, "expected_goals");
  const hPoss = getStat(stats, homeTeam?.id, "Ball Possession");
  const aPoss = getStat(stats, awayTeam?.id, "Ball Possession");
  const hShots = getStat(stats, homeTeam?.id, "Total Shots");
  const aShots = getStat(stats, awayTeam?.id, "Total Shots");

  return (
    <div style={{
      position:"relative",
      background:"linear-gradient(160deg,#0d1b2a 0%,#080f1a 60%,#050c14 100%)",
      borderBottom:"1px solid rgba(255,255,255,0.07)",
      overflow:"hidden",
      padding:"28px 24px 22px",
    }}>
      <div style={{ position:"absolute", top:-80, left:"15%",  width:340, height:340, borderRadius:"50%", background:"radial-gradient(circle,rgba(59,130,246,0.08),transparent 70%)",  pointerEvents:"none" }} />
      <div style={{ position:"absolute", top:-80, right:"15%", width:340, height:340, borderRadius:"50%", background:"radial-gradient(circle,rgba(239,68,68,0.08),transparent 70%)", pointerEvents:"none" }} />

      {/* Competition + status */}
      <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:10, marginBottom:20 }}>
        {fixture?.league?.logo && <img src={fixture.league.logo} alt="" width={16} height={16} style={{ objectFit:"contain" }} />}
        <span style={{ fontSize:10, fontWeight:700, color:"#fff", letterSpacing:"0.1em", textTransform:"uppercase" }}>
          {fixture?.league?.name}{fixture?.league?.round ? ` · ${fixture.league.round}` : ""}
        </span>
        {isLive && (
          <span style={{ display:"flex", alignItems:"center", gap:5, background:"rgba(255,68,68,0.12)", border:"1px solid rgba(255,68,68,0.25)", borderRadius:999, padding:"2px 9px" }}>
            <LiveDot />
            <span style={{ fontSize:9, fontWeight:900, color:"#ff6666", letterSpacing:"0.1em" }}>
              {fmtMin(status?.elapsed, status?.extra) || "LIVE"}
            </span>
          </span>
        )}
        {isFT && (
          <span style={{ fontSize:9, fontWeight:900, color:"#fff", background:"rgba(255,255,255,0.05)", borderRadius:999, padding:"2px 9px", letterSpacing:"0.1em" }}>
            FULL TIME
          </span>
        )}
        {status?.short === "HT" && (
          <Pill color="rgba(245,158,11,0.12)" textColor="#f59e0b">HALF TIME</Pill>
        )}
      </div>

      {/* Score row */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, maxWidth:680, margin:"0 auto" }}>
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
          <img src={homeTeam?.logo} alt={homeTeam?.name} width={56} height={56}
            style={{ objectFit:"contain", filter: homeWin ? "drop-shadow(0 0 14px rgba(59,130,246,0.5))" : "none" }}
            onError={e => e.currentTarget.style.opacity="0"} />
          <span style={{ fontSize:14, fontWeight:900, color:"#f0f6ff", textAlign:"center" }}>{homeTeam?.name}</span>
        </div>

        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{
              fontSize:54, fontWeight:900, lineHeight:1,
              color: homeWin ? "#60a5fa" : awayWin ? "#fff" : "#f0f6ff",
              fontFamily:"'JetBrains Mono',monospace",
              textShadow: homeWin ? "0 0 30px rgba(96,165,250,0.4)" : "none",
            }}>{hGoals}</span>
            <span style={{ fontSize:26, fontWeight:300, color:"rgba(255,255,255,0.82)", lineHeight:1 }}>–</span>
            <span style={{
              fontSize:54, fontWeight:900, lineHeight:1,
              color: awayWin ? "#f87171" : homeWin ? "#fff" : "#f0f6ff",
              fontFamily:"'JetBrains Mono',monospace",
              textShadow: awayWin ? "0 0 30px rgba(248,113,113,0.4)" : "none",
            }}>{aGoals}</span>
          </div>
          {score?.halftime && isFT && (
            <span style={{ fontSize:10, color:"rgba(255,255,255,0.96)", fontFamily:"'JetBrains Mono',monospace" }}>
              HT {score.halftime.home}–{score.halftime.away}
            </span>
          )}
          {fixture?.venue?.name && (
            <span style={{ fontSize:10, color:"rgba(255,255,255,0.82)", marginTop:2 }}>
              {fixture.venue.name}
            </span>
          )}
        </div>

        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
          <img src={awayTeam?.logo} alt={awayTeam?.name} width={56} height={56}
            style={{ objectFit:"contain", filter: awayWin ? "drop-shadow(0 0 14px rgba(239,68,68,0.5))" : "none" }}
            onError={e => e.currentTarget.style.opacity="0"} />
          <span style={{ fontSize:14, fontWeight:900, color:"#f0f6ff", textAlign:"center" }}>{awayTeam?.name}</span>
        </div>
      </div>

      {/* Stat strip */}
      {(hXG || hPoss || hShots) && (
        <div style={{ display:"flex", justifyContent:"center", gap:20, marginTop:18, flexWrap:"wrap" }}>
          {[
            { label:"xG",   h:hXG,   a:aXG   },
            { label:"Shots", h:hShots, a:aShots },
            { label:"Poss",  h:hPoss,  a:aPoss  },
          ].filter(s => s.h || s.a).map(({ label, h, a }) => (
            <div key={label} style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:12, fontWeight:800, color:"#60a5fa", fontFamily:"'JetBrains Mono',monospace" }}>{h ?? "–"}</span>
              <span style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.96)", letterSpacing:"0.08em", textTransform:"uppercase" }}>{label}</span>
              <span style={{ fontSize:12, fontWeight:800, color:"#f87171", fontFamily:"'JetBrains Mono',monospace" }}>{a ?? "–"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MomentumGraph({ momentumData, events }) {
  // Use backend momentum data if available, fall back to event-based
  const useBackend = !!momentumData?.home_momentum;

  const bins = useBackend ? null : (() => {
    const b = Array(18).fill(null).map(() => ({ home:0, away:0 }));
    (events || []).forEach(ev => {
      const min = ev?.time?.elapsed || 0;
      const bin = Math.min(Math.floor(min / 5), 17);
      if (ev?.team?.id === ev?.homeTeamId) b[bin].home++;
      else b[bin].away++;
    });
    return b;
  })();

  const home90 = useBackend ? momentumData.home_momentum : null;
  const away90 = useBackend ? momentumData.away_momentum : null;

  return (
    <div style={{ padding:"16px 24px", background:"rgba(255,255,255,0.012)", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <SectionLabel>Match Momentum</SectionLabel>
        {momentumData?.overall && (
          <div style={{ display:"flex", gap:12, fontSize:10, fontWeight:700 }}>
            <span style={{ color:"#60a5fa" }}>
              {momentumData.home_team?.split(" ").pop()} {momentumData.overall.home_pct}%
            </span>
            <span style={{ color:"#f87171" }}>
              {momentumData.away_team?.split(" ").pop()} {momentumData.overall.away_pct}%
            </span>
          </div>
        )}
      </div>

      {useBackend ? (
        <div style={{ display:"flex", height:48, gap:1, alignItems:"flex-end" }}>
          {home90.map((h, i) => {
            const a     = away90[i] || 0;
            const total = Math.max(h + a, 0.1);
            const hPct  = (h / total) * 100;
            const barH  = Math.min(100, (total / 2) * 100);
            return (
              <div key={i} style={{ flex:1, height:"100%", display:"flex", flexDirection:"column", justifyContent:"center", gap:1 }}>
                <div style={{ height:`${Math.max(hPct * barH / 100, 4)}%`, background:"rgba(59,130,246,0.55)", borderRadius:"2px 2px 0 0", transition:"height 0.4s" }} />
                <div style={{ height:`${Math.max((100-hPct) * barH / 100, 4)}%`, background:"rgba(239,68,68,0.55)", borderRadius:"0 0 2px 2px" }} />
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display:"flex", height:36, gap:1, alignItems:"center" }}>
          {(bins || []).map((b, i) => {
            const total = b.home + b.away || 1;
            const hPct  = (b.home / total) * 100;
            return (
              <div key={i} style={{ flex:1, height:"100%", display:"flex", flexDirection:"column", justifyContent:"center", gap:1 }}>
                <div style={{ height:`${Math.max(hPct, 8)}%`, background:"rgba(59,130,246,0.55)", borderRadius:"2px 2px 0 0" }} />
                <div style={{ height:`${Math.max(100-hPct, 8)}%`, background:"rgba(239,68,68,0.55)", borderRadius:"0 0 2px 2px" }} />
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
        {["0'","15'","30'","45'","60'","75'","90'"].map(l => (
          <span key={l} style={{ fontSize:8, color:"rgba(255,255,255,0.82)" }}>{l}</span>
        ))}
      </div>
    </div>
  );
}

function Timeline({ events, homeTeam, awayTeam }) {
  if (!events?.length) return null;
  return (
    <div style={{ padding:"20px 24px" }}>
      <SectionLabel>Match Events</SectionLabel>
      <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
        {events.map((ev, i) => {
          const isHome = ev.team?.id === homeTeam?.id;
          const min    = fmtMin(ev.time?.elapsed, ev.time?.extra);
          return (
            <div key={i} style={{
              display:"grid", gridTemplateColumns:"1fr 52px 1fr",
              gap:8, alignItems:"center",
              padding:"6px 0",
              borderBottom:"1px solid rgba(255,255,255,0.025)",
            }}>
              {isHome ? (
                <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"flex-end" }}>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#e2e8f0" }}>{ev.player?.name}</div>
                    {ev.assist?.name && <div style={{ fontSize:10, color:"rgba(255,255,255,0.6)" }}>assist: {ev.assist.name}</div>}
                    {ev.detail && <div style={{ fontSize:9, color:"rgba(255,255,255,0.96)", fontStyle:"italic" }}>{ev.detail}</div>}
                  </div>
                  <EventIcon type={ev.type} detail={ev.detail} />
                </div>
              ) : <div />}

              <div style={{ textAlign:"center" }}>
                <span style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,0.94)", fontFamily:"'JetBrains Mono',monospace", background:"rgba(255,255,255,0.06)", borderRadius:4, padding:"2px 6px" }}>
                  {min}
                </span>
              </div>

              {!isHome ? (
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <EventIcon type={ev.type} detail={ev.detail} />
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:"#e2e8f0" }}>{ev.player?.name}</div>
                    {ev.assist?.name && <div style={{ fontSize:10, color:"rgba(255,255,255,0.6)" }}>assist: {ev.assist.name}</div>}
                    {ev.detail && <div style={{ fontSize:9, color:"rgba(255,255,255,0.96)", fontStyle:"italic" }}>{ev.detail}</div>}
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
    "Ball Possession","Total Shots","Shots on Goal","Shots insidebox",
    "Corner Kicks","Fouls","Offsides","Yellow Cards","Red Cards",
    "Passes %","Blocked Shots","expected_goals",
  ];

  const rows = KEY_STATS.map(key => {
    const hVal = hStats.find(s => s.type === key)?.value ?? null;
    const aVal = aStats.find(s => s.type === key)?.value ?? null;
    if (hVal === null && aVal === null) return null;
    return {
      label: key === "expected_goals" ? "xG" : key.replace("insidebox","inside box"),
      home: hVal ?? 0, away: aVal ?? 0,
    };
  }).filter(Boolean);

  if (!rows.length) return null;
  return (
    <div style={{ padding:"20px 24px", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        {homeTeam?.logo && <img src={homeTeam.logo} alt="" width={14} height={14} style={{ objectFit:"contain" }} />}
        <SectionLabel>Match Statistics</SectionLabel>
        {awayTeam?.logo && <img src={awayTeam.logo} alt="" width={14} height={14} style={{ objectFit:"contain" }} />}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {rows.map(r => <StatBar key={r.label} label={r.label} home={r.home} away={r.away} />)}
      </div>
    </div>
  );
}

function LineupsPanel({ lineups, homeTeam, awayTeam }) {
  if (!lineups?.length) return null;
  const home = lineups.find(l => l.team?.id === homeTeam?.id);
  const away = lineups.find(l => l.team?.id === awayTeam?.id);
  if (!home && !away) return null;

  function PlayerChip({ player, color }) {
    const [hov, setHov] = useState(false);
    return (
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center", gap:3, cursor:"default" }}
      >
        <div style={{
          width:28, height:28, borderRadius:"50%", background:color,
          border:"2px solid rgba(255,255,255,0.25)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:9, fontWeight:900, color:"#fff",
          boxShadow: hov ? `0 0 10px ${color}` : "none", transition:"box-shadow 0.2s",
        }}>
          {player?.player?.number || "?"}
        </div>
        <span style={{ fontSize:8, fontWeight:700, color:"#c8d8e8", whiteSpace:"nowrap", maxWidth:52, overflow:"hidden", textOverflow:"ellipsis", textAlign:"center" }}>
          {player?.player?.name?.split(" ").pop()}
        </span>
        {hov && (
          <div style={{ position:"absolute", bottom:"105%", left:"50%", transform:"translateX(-50%)", background:"#0d1b2a", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"6px 10px", zIndex:20, whiteSpace:"nowrap", marginBottom:6 }}>
            <div style={{ fontSize:11, fontWeight:800, color:"#f0f6ff" }}>{player?.player?.name}</div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.94)" }}>#{player?.player?.number} · {player?.player?.pos}</div>
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
      [players[0]],
      ...formation.map(n => {
        const count = parseInt(n); const row = players.slice(idx, idx + count); idx += count; return row;
      }),
    ];
    if (flip) rows.reverse();
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:6, alignItems:"center", width:"100%" }}>
        {rows.map((row,i) => (
          <div key={i} style={{ display:"flex", justifyContent:"space-around", width:"100%", gap:4 }}>
            {row.map((p,j) => <PlayerChip key={j} player={p} color={color} />)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding:"20px 24px", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
      <SectionLabel>Lineups</SectionLabel>
      <div style={{ display:"flex", gap:12, marginBottom:10 }}>
        {home && <div style={{ flex:1, textAlign:"center" }}><span style={{ fontSize:10, color:"#fff", fontWeight:700 }}>{home.formation}</span></div>}
        {away && <div style={{ flex:1, textAlign:"center" }}><span style={{ fontSize:10, color:"#fff", fontWeight:700 }}>{away.formation}</span></div>}
      </div>
      <div style={{ position:"relative", width:"100%", paddingBottom:"64.7%", borderRadius:12, overflow:"hidden" }}>
        <PitchSvg />
        <div style={{ position:"absolute", inset:0, display:"flex" }}>
          <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"space-around", padding:"12px 8px" }}>
            {home && <Formation lineup={home} color="rgba(59,130,246,0.85)" flip={false} />}
          </div>
          <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"space-around", padding:"12px 8px" }}>
            {away && <Formation lineup={away} color="rgba(239,68,68,0.85)" flip={true} />}
          </div>
        </div>
      </div>
      {(home?.substitutes?.length > 0 || away?.substitutes?.length > 0) && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginTop:16 }}>
          {[home, away].map((lu, side) => lu && (
            <div key={side}>
              <div style={{ fontSize:8, fontWeight:800, color:"rgba(255,255,255,0.96)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>Substitutes</div>
              {lu.substitutes?.slice(0,7).map((p,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.025)" }}>
                  <span style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.96)", width:18, fontFamily:"'JetBrains Mono',monospace" }}>{p?.player?.number}</span>
                  <span style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.82)" }}>{p?.player?.name}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ShotMapPanel({ shotMapData, events, homeTeam, awayTeam }) {
  // Use backend shot map data if available
  if (shotMapData) {
    const { home, away } = shotMapData;
    const allShots = [
      ...(home?.shots || []).map(s => ({ ...s, side:"home" })),
      ...(away?.shots || []).map(s => ({ ...s, side:"away" })),
    ];
    if (!allShots.length) return null;
    return (
      <div style={{ padding:"20px 24px", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
        <SectionLabel>Shot Map</SectionLabel>
        <div style={{ display:"flex", gap:16, marginBottom:10, flexWrap:"wrap" }}>
          {[
            { label: homeTeam?.name, data: home?.summary, color:"#60a5fa" },
            { label: awayTeam?.name, data: away?.summary, color:"#f87171" },
          ].map(({ label, data, color }) => data && (
            <div key={label} style={{ display:"flex", gap:12, fontSize:10, color:"rgba(255,255,255,0.94)" }}>
              <span style={{ fontWeight:800, color }}>{label?.split(" ").pop()}</span>
              <span>{data.total} shots</span>
              <span style={{ color: "#34d399" }}>xG {data.total_xg}</span>
              <span>{data.on_target} on target</span>
            </div>
          ))}
        </div>
        <div style={{ position:"relative", width:"100%", paddingBottom:"64.7%", borderRadius:12, overflow:"hidden" }}>
          <PitchSvg />
          {allShots.map((s,i) => {
            const isGoal = s.is_goal;
            const isHome = s.side === "home";
            return (
              <div key={i} title={`${s.player || ""} ${s.minute ? s.minute+"'" : ""} xG:${s.xg}`}
                style={{
                  position:"absolute",
                  left:`${s.x}%`, top:`${s.y}%`,
                  width: isGoal ? 10 : 7, height: isGoal ? 10 : 7,
                  borderRadius:"50%",
                  background: isGoal ? (isHome ? "#60a5fa" : "#f87171") : "rgba(255,255,255,0.96)",
                  border: isGoal ? "2px solid rgba(255,255,255,0.8)" : "1px solid rgba(255,255,255,0.2)",
                  transform:"translate(-50%,-50%)",
                  boxShadow: isGoal ? "0 0 8px currentColor" : "none",
                  cursor:"default",
                }}
              />
            );
          })}
        </div>
        <div style={{ display:"flex", gap:16, marginTop:8, justifyContent:"center" }}>
          {[
            { color:"#60a5fa", label:"Goal (Home)", border:true },
            { color:"#f87171", label:"Goal (Away)", border:true },
            { color:"rgba(255,255,255,0.96)", label:"Shot", border:false },
          ].map(({ color, label, border }) => (
            <span key={label} style={{ display:"flex", alignItems:"center", gap:5, fontSize:9, color:"#fff" }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:color, border: border ? "1.5px solid rgba(255,255,255,0.6)" : "1px solid rgba(255,255,255,0.2)" }} />
              {label}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Fallback: goals only from events
  const goals = (events || []).filter(e => e.type === "Goal");
  if (!goals.length) return null;

  return (
    <div style={{ padding:"20px 24px", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
      <SectionLabel>Goals</SectionLabel>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {goals.map((g,i) => {
          const isHome = g.team?.id === homeTeam?.id;
          return (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.03)" }}>
              <span style={{ fontSize:10, fontWeight:800, color:"#fff", width:30, fontFamily:"'JetBrains Mono',monospace" }}>
                {fmtMin(g.time?.elapsed, g.time?.extra)}
              </span>
              <span style={{ width:8, height:8, borderRadius:"50%", background: isHome ? "#60a5fa" : "#f87171", flexShrink:0 }} />
              <span style={{ fontSize:12, fontWeight:700, color:"#e2e8f0", flex:1 }}>{g.player?.name}</span>
              <span style={{ fontSize:10, color:"#fff" }}>{isHome ? homeTeam?.name : awayTeam?.name}</span>
            </div>
          );
        })}
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

  const sortVal = (p) => {
    const stats = p.statistics?.[0];
    if (sort === "rating")  return parseFloat(stats?.games?.rating || 0);
    if (sort === "goals")   return parseInt(stats?.goals?.total || 0);
    if (sort === "assists") return parseInt(stats?.goals?.assists || 0);
    if (sort === "passes")  return parseFloat(stats?.passes?.accuracy || 0);
    return 0;
  };

  const sorted = [...all].sort((a,b) => sortVal(b) - sortVal(a));
  const cols = [
    { key:"rating",  label:"Rating" },
    { key:"goals",   label:"G" },
    { key:"assists", label:"A" },
    { key:"passes",  label:"Pass%" },
  ];

  return (
    <div style={{ padding:"20px 24px", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
      <SectionLabel>Player Ratings</SectionLabel>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
              <th style={{ padding:"6px 8px", textAlign:"left", fontSize:9, fontWeight:800, color:"rgba(255,255,255,0.6)", letterSpacing:"0.08em", textTransform:"uppercase" }}>Player</th>
              {cols.map(c => (
                <th key={c.key} onClick={() => setSort(c.key)} style={{
                  padding:"6px 8px", textAlign:"center", fontSize:9, fontWeight:800,
                  letterSpacing:"0.08em", textTransform:"uppercase", cursor:"pointer",
                  color: sort === c.key ? "#60a5fa" : "rgba(255,255,255,0.6)",
                }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0,18).map((p,i) => {
              const stats   = p.statistics?.[0];
              const rating  = stats?.games?.rating  || "–";
              const goals   = stats?.goals?.total   ?? "–";
              const assists = stats?.goals?.assists  ?? "–";
              const passes  = stats?.passes?.accuracy ? `${stats.passes.accuracy}%` : "–";
              return (
                <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,0.025)", transition:"background 0.12s" }}
                  onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.025)"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}
                >
                  <td style={{ padding:"7px 8px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      {p.teamLogo && <img src={p.teamLogo} alt="" width={13} height={13} style={{ objectFit:"contain" }} />}
                      <span style={{ fontSize:12, fontWeight:700, color: p.isHome ? "#93c5fd" : "#fca5a5" }}>{p.player?.name}</span>
                    </div>
                  </td>
                  <td style={{ padding:"7px 8px", textAlign:"center", fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:800, color: parseFloat(rating) >= 8 ? "#34d399" : "#e2e8f0" }}>{rating}</td>
                  <td style={{ padding:"7px 8px", textAlign:"center", fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:"#e2e8f0" }}>{goals}</td>
                  <td style={{ padding:"7px 8px", textAlign:"center", fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:"#e2e8f0" }}>{assists}</td>
                  <td style={{ padding:"7px 8px", textAlign:"center", fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:"#e2e8f0" }}>{passes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab configs by mode ──────────────────────────────────────────────────────

const TABS_BY_MODE = {
  prematch: ["Preview","Lineups","Odds"],
  live:     ["Overview","Events","Stats","Lineups","Players"],
  fulltime: ["Overview","Events","Stats","Players"],
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LiveMatchPage() {
  const { fixtureId } = useParams();
  const navigate = useNavigate();

  const [tab,           setTab]          = useState(null);
  const [fixture,       setFixture]      = useState(null);
  const [events,        setEvents]       = useState([]);
  const [stats,         setStats]        = useState([]);
  const [lineups,       setLineups]      = useState([]);
  const [players,       setPlayers]      = useState([]);
  const [winProb,       setWinProb]      = useState(null);
  const [momentumData,  setMomentumData] = useState(null);
  const [shotMapData,   setShotMapData]  = useState(null);
  const [predictedHome, setPredictedHome] = useState(null);
  const [predictedAway, setPredictedAway] = useState(null);
  const [injuries,      setInjuries]     = useState([]);
  // teamStats for prematch form/matchup — shape: { home: {form, scored_home,...}, away:{...} }
  const [teamStats,     setTeamStats]    = useState(null);
  const [loading,       setLoading]      = useState(true);
  const [error,         setError]        = useState(null);
  const pollRef = useRef(null);

  const mode = deriveMode(fixture?.fixture?.status?.short);

  // ── Core data fetch (always) ──────────────────────────────────────────────
  const loadCore = useCallback(async () => {
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

  // ── Enrichment fetches (non-blocking) ────────────────────────────────────
  const loadEnrichment = useCallback(async (currentMode) => {
    if (!fixtureId) return;

    // Win probability — useful for all modes
    fetch(`${BACKEND}/api/win-probability/${fixtureId}`)
      .then(r => r.ok ? r.json() : null).then(d => d && setWinProb(d)).catch(() => {});

    if (currentMode === "live" || currentMode === "fulltime") {
      // Momentum + shot map for live/FT
      fetch(`${BACKEND}/api/match-momentum/${fixtureId}`)
        .then(r => r.ok ? r.json() : null).then(d => d && setMomentumData(d)).catch(() => {});
      fetch(`${BACKEND}/api/shot-map/${fixtureId}`)
        .then(r => r.ok ? r.json() : null).then(d => d && setShotMapData(d)).catch(() => {});
    }

    // Predicted lineups + injuries for prematch
    // NOTE: These require new backend routes — see BACKEND ROUTES NEEDED below.
    // Gracefully no-ops if unavailable.
    if (currentMode === "prematch") {
      fetch(`${BACKEND}/api/predicted-lineup/${fixtureId}?side=home`)
        .then(r => r.ok ? r.json() : null).then(d => d && setPredictedHome(d)).catch(() => {});
      fetch(`${BACKEND}/api/predicted-lineup/${fixtureId}?side=away`)
        .then(r => r.ok ? r.json() : null).then(d => d && setPredictedAway(d)).catch(() => {});
      fetch(`${BACKEND}/api/injuries/${fixtureId}`)
        .then(r => r.ok ? r.json() : null).then(d => d?.injuries && setInjuries(d.injuries)).catch(() => {});
      fetch(`${BACKEND}/api/team-stats/${fixtureId}`)
        .then(r => r.ok ? r.json() : null).then(d => d && setTeamStats(d)).catch(() => {});
    }
  }, [fixtureId]);

  useEffect(() => {
    loadCore();
    pollRef.current = setInterval(loadCore, 30_000);
    return () => clearInterval(pollRef.current);
  }, [loadCore]);

  // Load enrichment once fixture mode is known
  useEffect(() => {
    if (fixture) loadEnrichment(mode);
  }, [fixture, mode, loadEnrichment]);

  // Set default tab when mode is resolved
  useEffect(() => {
    if (mode && !tab) {
      setTab(TABS_BY_MODE[mode][0]);
    }
  }, [mode]);

  // Reset tab if mode changes (shouldn't happen often, but safety net)
  const prevMode = useRef(null);
  useEffect(() => {
    if (prevMode.current && prevMode.current !== mode) {
      setTab(TABS_BY_MODE[mode][0]);
    }
    prevMode.current = mode;
  }, [mode]);

  const homeTeam = fixture?.teams?.home || stats?.[0]?.team;
  const awayTeam = fixture?.teams?.away || stats?.[1]?.team;
  const score    = fixture?.score;
  const status   = fixture?.fixture?.status;
  const fixtureInfo = fixture?.fixture;

  const tabs = TABS_BY_MODE[mode] || TABS_BY_MODE.prematch;

  return (
    <div style={{ background:"#07101a", minHeight:"100vh", color:"#f0f6ff" }}>
      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .lm-tab { background:none; border:none; cursor:pointer; font-family:'Inter','Sora',sans-serif; transition:all 0.15s; }
        .lm-tab:hover { color:rgba(255,255,255,0.8) !important; }
      `}</style>

      {/* Back nav */}
      <div style={{ padding:"14px 20px 0", display:"flex", alignItems:"center", gap:8 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer", fontSize:11, fontWeight:700, letterSpacing:"0.04em", padding:0, display:"flex", alignItems:"center", gap:5 }}
        >
          ← Live Centre
        </button>
      </div>

      {loading && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:280, color:"rgba(255,255,255,0.6)", fontSize:13 }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ width:28, height:28, borderRadius:"50%", border:"2px solid rgba(96,165,250,0.15)", borderTopColor:"#60a5fa", margin:"0 auto 14px", animation:"livePulse 0.8s linear infinite" }} />
            Loading match…
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding:24, color:"#f87171", textAlign:"center", fontSize:13 }}>{error}</div>
      )}

      {!loading && !error && (
        <div style={{ animation:"fadeUp 0.35s ease both" }}>

          {/* ── HERO — conditional by mode ── */}
          {mode === "prematch" ? (
            <PreMatchHero fixture={fixtureInfo} homeTeam={homeTeam} awayTeam={awayTeam} status={status} />
          ) : (
            <ScoreHero fixture={fixtureInfo} homeTeam={homeTeam} awayTeam={awayTeam} score={score} status={status} mode={mode} stats={stats} />
          )}

          {/* Momentum strip (live only, outside tabs for quick scan) */}
          {mode === "live" && (events.length > 0 || momentumData) && (
            <MomentumGraph momentumData={momentumData} events={events} />
          )}

          {/* ── Sticky tabs ── */}
          <div style={{
            position:"sticky", top:0, zIndex:100,
            background:"rgba(7,16,26,0.97)", backdropFilter:"blur(12px)",
            borderBottom:"1px solid rgba(255,255,255,0.06)",
            display:"flex", padding:"0 20px", overflowX:"auto",
          }}>
            {tabs.map(t => (
              <button key={t} className="lm-tab" onClick={() => setTab(t)} style={{
                padding:"12px 14px", fontSize:11, fontWeight:800,
                letterSpacing:"0.04em", textTransform:"uppercase",
                color: tab === t ? "#60a5fa" : "rgba(255,255,255,0.6)",
                borderBottom: tab === t ? "2px solid #60a5fa" : "2px solid transparent",
                marginBottom:-1, whiteSpace:"nowrap",
              }}>{t}</button>
            ))}
          </div>

          {/* ── Tab content ── */}
          <div style={{ maxWidth:900, margin:"0 auto", padding:"0 0 60px" }}>

            {/* ═══ PREMATCH TABS ═══ */}
            {mode === "prematch" && tab === "Preview" && (
              <>
                <PredictionStrip winProb={winProb} homeTeam={homeTeam} awayTeam={awayTeam} />
                <MatchupPanel homeStats={teamStats?.home} awayStats={teamStats?.away} homeTeam={homeTeam} awayTeam={awayTeam} />
                <InjuryPanel injuries={injuries} homeTeam={homeTeam} awayTeam={awayTeam} />
              </>
            )}
            {mode === "prematch" && tab === "Lineups" && (
              <>
                {lineups.length > 0
                  ? <LineupsPanel lineups={lineups} homeTeam={homeTeam} awayTeam={awayTeam} />
                  : <PredictedLineupsPanel predictedHome={predictedHome} predictedAway={predictedAway} homeTeam={homeTeam} awayTeam={awayTeam} />
                }
                <InjuryPanel injuries={injuries} homeTeam={homeTeam} awayTeam={awayTeam} />
              </>
            )}
            {mode === "prematch" && tab === "Odds" && (
              <PredictionStrip winProb={winProb} homeTeam={homeTeam} awayTeam={awayTeam} />
            )}

            {/* ═══ LIVE TABS ═══ */}
            {mode === "live" && tab === "Overview" && (
              <>
                {stats.length > 0 && <StatsPanel stats={stats} homeTeam={homeTeam} awayTeam={awayTeam} />}
                {events.length > 0 && <Timeline events={events} homeTeam={homeTeam} awayTeam={awayTeam} />}
              </>
            )}
            {mode === "live" && tab === "Events"   && <Timeline events={events} homeTeam={homeTeam} awayTeam={awayTeam} />}
            {mode === "live" && tab === "Stats"    && <StatsPanel stats={stats} homeTeam={homeTeam} awayTeam={awayTeam} />}
            {mode === "live" && tab === "Lineups"  && <LineupsPanel lineups={lineups} homeTeam={homeTeam} awayTeam={awayTeam} />}
            {mode === "live" && tab === "Players"  && <PlayerTable players={players} homeTeam={homeTeam} awayTeam={awayTeam} />}

            {/* ═══ FULLTIME TABS ═══ */}
            {mode === "fulltime" && tab === "Overview" && (
              <>
                {stats.length > 0 && <StatsPanel stats={stats} homeTeam={homeTeam} awayTeam={awayTeam} />}
                <ShotMapPanel shotMapData={shotMapData} events={events} homeTeam={homeTeam} awayTeam={awayTeam} />
                {events.length > 0 && <Timeline events={events} homeTeam={homeTeam} awayTeam={awayTeam} />}
              </>
            )}
            {mode === "fulltime" && tab === "Events"  && <Timeline events={events} homeTeam={homeTeam} awayTeam={awayTeam} />}
            {mode === "fulltime" && tab === "Stats"   && <StatsPanel stats={stats} homeTeam={homeTeam} awayTeam={awayTeam} />}
            {mode === "fulltime" && tab === "Players" && <PlayerTable players={players} homeTeam={homeTeam} awayTeam={awayTeam} />}

            {/* Empty state */}
            {!stats.length && !events.length && !lineups.length && !winProb && (
              <div style={{ padding:48, textAlign:"center", color:"rgba(255,255,255,0.82)", fontSize:13 }}>
                No detailed match data available for this fixture.
                <br /><br />
                <button onClick={() => navigate(-1)} style={{ color:"#60a5fa", fontWeight:700, background:"none", border:"none", cursor:"pointer", fontSize:13 }}>
                  ← Back to Live Centre
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}