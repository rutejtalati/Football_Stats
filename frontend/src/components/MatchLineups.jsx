// ═════════════════════════════════════════════════════
// MatchLineups.jsx  –  polling built in, no external hook
// ═════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import Pitch from "./Pitch";
import { posColor } from "../utils/formationMap";

const BACKEND       = "https://football-stats-lw4b.onrender.com";
const POLL_INTERVAL = 60_000; // 60 s — stops once official lineups arrive


// ═════════════════════════════════════════════════════
// NORMALISATION
// ═════════════════════════════════════════════════════

// FIXED — grid warning only when explicitly needed (caller decides)
function normalizePlayer(entry, warnIfNoGrid = false) {
  if (!entry) return {};
  const p      = entry.player ?? entry;
  const rating = p.rating != null ? Number(p.rating) : null;
  if (warnIfNoGrid && !p.grid) console.warn(`[MatchLineups] Player missing grid: "${p.name || p.id}"`);
return {
    id:     p.id          ?? p.player_id    ?? null,
    name:   p.name        ?? "",
    number: p.number      ?? p.shirt_number ?? null,
    pos:    p.pos         ?? p.position     ?? "",
    photo:  p.photo       ?? p.image        ?? "",
    grid:   p.grid        ?? null,
    rating,
  };
}

function normalizeTeam(raw) {
  if (!raw) return null;
  const rawXI    = raw.starting_xi ?? raw.startXI ?? raw.start_xi ?? [];
  const rawBench = raw.bench       ?? raw.substitutes ?? raw.subs ?? [];
  return {
    team_name:   raw.team_name  ?? raw.team?.name ?? raw.name ?? "",
    logo:        raw.logo       ?? raw.team?.logo ?? "",
    formation:   raw.formation   ?? "",
    coach:       raw.coach       ?? "",
    coach_photo: raw.coach_photo ?? "",
    starting_xi: Array.isArray(rawXI)    ? rawXI.map(p => normalizePlayer(p, true))  : [],
bench:       Array.isArray(rawBench) ? rawBench.map(p => normalizePlayer(p, false)) : [],
    injuries:    Array.isArray(raw.injuries)    ? raw.injuries    : [],
    doubts:      Array.isArray(raw.doubts)      ? raw.doubts      : [],
    recent_form: Array.isArray(raw.recent_form) ? raw.recent_form : [],
  };
}

function normalizeResponse(d) {
  console.log("[MatchLineups] Raw API response:", d);
  const rawHome   = d?.home ?? d?.lineups?.home ?? null;
  const rawAway   = d?.away ?? d?.lineups?.away ?? null;
  const home      = normalizeTeam(rawHome);
  const away      = normalizeTeam(rawAway);
  console.log("[MatchLineups] Normalized home:", home);
  console.log("[MatchLineups] Normalized away:", away);
  const homeHasXI = (home?.starting_xi?.length ?? 0) > 0;
  const awayHasXI = (away?.starting_xi?.length ?? 0) > 0;
  const mode =
    d?.mode === "official"   ? "official"  :
    d?.mode === "predicted"  ? "predicted" :
    (homeHasXI || awayHasXI) ? "official"  :
    "predicted";
  return { mode, announced_at: d?.announced_at ?? null, home, away };
}


// ═════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═════════════════════════════════════════════════════

function ModeBanner({ mode, announcedAt, lastUpdated }) {
  if (mode === "official") {
    return (
      <div style={{
        display:"flex", alignItems:"center", gap:8,
        padding:"8px 14px",
        background:"rgba(52,211,153,0.08)",
        border:"1px solid rgba(52,211,153,0.15)",
        borderRadius:10, marginBottom:14,
      }}>
        <span style={{color:"#34d399",fontSize:14}}>✓</span>
        <span style={{fontSize:11,fontWeight:800,color:"#34d399"}}>Official Lineups Confirmed</span>
        {announcedAt && (
          <span style={{fontSize:10,color:"#4a6080",marginLeft:8}}>
            {new Date(announcedAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
          </span>
        )}
      </div>
    );
  }
  return (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"8px 14px",
      background:"rgba(245,158,11,0.06)",
      border:"1px solid rgba(245,158,11,0.15)",
      borderRadius:10, marginBottom:14,
    }}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{color:"#f59e0b",fontSize:14}}>⏳</span>
        <span style={{fontSize:11,fontWeight:800,color:"#f59e0b"}}>Predicted Lineup</span>
        <span style={{fontSize:10,color:"#4a6080",marginLeft:4}}>
          Official XI ~45 min before kickoff
        </span>
      </div>
      {lastUpdated && (
        <span style={{fontSize:9,color:"#3a5070"}}>
          Updated {lastUpdated.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
          {" · auto-refreshing"}
        </span>
      )}
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
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
      <span style={{fontSize:13}}>{icon}</span>
      {player.photo && <img src={player.photo} style={{width:26,height:26,borderRadius:"50%",objectFit:"cover"}} onError={e=>(e.currentTarget.style.display="none")}/>}
      <div style={{flex:1}}>
        <div style={{fontSize:12,fontWeight:700,color}}>{player.name ?? "—"}</div>
        {player.reason && <div style={{fontSize:10,color:"#3a5070",marginTop:1}}>{player.reason}</div>}
      </div>
      <span style={{fontSize:9,fontWeight:800,color,opacity:0.7,textTransform:"uppercase"}}>{label}</span>
    </div>
  );
}

function BenchRow({ player, color }) {
  if (!player) return null;
  const rating = player.rating;
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"7px 12px",background:"linear-gradient(160deg,#0d1525,#080e1a)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:8,marginBottom:4,transition:"filter 0.15s"}}
      onMouseEnter={e=>(e.currentTarget.style.filter="brightness(1.15)")}
      onMouseLeave={e=>(e.currentTarget.style.filter="none")}>
      <div style={{width:22,height:22,borderRadius:"50%",background:color+"22",border:`1.5px solid ${color}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color,flexShrink:0}}>
        {player.number ?? "—"}
      </div>
      {player.photo && <img src={player.photo} style={{width:24,height:24,borderRadius:"50%",objectFit:"cover",flexShrink:0}} onError={e=>(e.currentTarget.style.display="none")}/>}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:12,fontWeight:700,color:"#c8d8f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{player.name||"—"}</div>
        <div style={{fontSize:9,color:posColor(player.pos??""),fontWeight:700,marginTop:1}}>{player.pos??""}</div>
      </div>
      {rating!=null && <div style={{fontSize:11,fontWeight:900,color:rating>=7.5?"#34d399":rating>=6.5?"#f59e0b":"#6b7fa3"}}>{rating.toFixed(1)}</div>}
    </div>
  );
}

function TeamPanel({ team, color, mode }) {
  if (!team) return null;
  const { injuries=[], doubts=[], bench=[], coach, coach_photo } = team;
  return (
    <div style={{background:"linear-gradient(160deg,#0d1525,#080e1a)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,overflow:"hidden"}}>
      {coach && (
        <div style={{padding:"10px 12px",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,color:"#3a5070",fontWeight:700}}>COACH</span>
          {coach_photo && <img src={coach_photo} style={{width:22,height:22,borderRadius:"50%",objectFit:"cover"}} onError={e=>(e.currentTarget.style.display="none")}/>}
          <span style={{fontSize:12,fontWeight:800,color:"#9fb4d6"}}>{coach}</span>
        </div>
      )}
      {mode==="predicted" && (injuries.length>0||doubts.length>0) && (
        <div>
          <div style={{padding:"8px 12px 4px",fontSize:9,fontWeight:900,letterSpacing:"0.1em",color:"#3a5070",textTransform:"uppercase"}}>Injuries / Doubts</div>
          {injuries.map((p,i)=><InjuryRow key={i} player={{...p,status:"injured"}}/>)}
          {doubts.map((p,i)=><InjuryRow key={i} player={{...p,status:"doubtful"}}/>)}
        </div>
      )}
      {bench.length>0 && (
        <div style={{padding:"4px 8px 8px"}}>
          <div style={{padding:"8px 4px 4px",fontSize:9,fontWeight:900,letterSpacing:"0.1em",color:"#3a5070",textTransform:"uppercase"}}>{mode==="predicted"?"Expected Bench":"Bench"}</div>
          {bench.map((p,i)=><BenchRow key={p?.id??i} player={p} color={color}/>)}
        </div>
      )}
      {bench.length===0&&injuries.length===0&&doubts.length===0 && (
        <div style={{padding:"16px 12px",color:"#2e3d52",fontSize:12,textAlign:"center"}}>No data available.</div>
      )}
    </div>
  );
}

function TeamDetailView({ team, color, mode }) {
  if (!team) return null;
  const { starting_xi=[], bench=[], injuries=[], doubts=[], team_name, logo, formation, coach } = team;
  const byGrp = (arr,g) => (arr??[]).filter(p=>{
    const pos=(p?.pos??"").toUpperCase();
    if(g==="GK")  return pos==="GK";
    if(g==="DEF") return ["CB","LB","RB","LWB","RWB","DEF"].includes(pos);
    if(g==="MID") return ["CM","CDM","CAM","LM","RM","MID","DM","AM"].includes(pos);
    return ["ST","LW","RW","CF","SS","FWD","ATT"].includes(pos);
  });
  const sections=[{label:"Goalkeeper",g:"GK"},{label:"Defenders",g:"DEF"},{label:"Midfielders",g:"MID"},{label:"Forwards",g:"FWD"}];
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        {logo && <img src={logo} style={{width:28,height:28,objectFit:"contain"}} onError={e=>(e.currentTarget.style.display="none")}/>}
        <div>
          <div style={{fontSize:14,fontWeight:900,color}}>{team_name}</div>
          <div style={{fontSize:10,color:"#3a5070",marginTop:2}}>{mode==="predicted"?"Predicted":"Official"} · {formation||"—"}{coach?` · ${coach}`:""}</div>
        </div>
      </div>
      {sections.map(({label,g})=>{
        const players=byGrp(starting_xi,g);
        if(!players.length) return null;
        return (
          <div key={g} style={{marginBottom:12}}>
            <div style={{fontSize:9,fontWeight:900,letterSpacing:"0.1em",color:"#3a5070",textTransform:"uppercase",marginBottom:4}}>{label}</div>
            {players.map((p,i)=>(
              <div key={p?.id??i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"linear-gradient(160deg,#0d1525,#080e1a)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:10,marginBottom:4}}>
                <div style={{width:22,height:22,borderRadius:"50%",background:color+"22",border:`1.5px solid ${color}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color,flexShrink:0}}>{p?.number??"—"}</div>
                {p?.photo && <img src={p.photo} style={{width:28,height:28,borderRadius:"50%",objectFit:"cover"}} onError={e=>(e.currentTarget.style.display="none")}/>}
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#c8d8f0"}}>{p?.name??"—"}</div>
                  <div style={{fontSize:9,color:posColor(p?.pos??""),marginTop:1}}>{p?.pos??""}</div>
                </div>
                {p?.rating!=null && <div style={{fontSize:14,fontWeight:900,color:p.rating>=7.5?"#34d399":p.rating>=6.5?"#f59e0b":"#6b7fa3"}}>{p.rating.toFixed(1)}</div>}
              </div>
            ))}
          </div>
        );
      })}
      {bench.length>0 && (
        <div style={{marginBottom:12}}>
          <div style={{fontSize:9,fontWeight:900,letterSpacing:"0.1em",color:"#3a5070",textTransform:"uppercase",marginBottom:4}}>{mode==="predicted"?"Expected Bench":"Bench"}</div>
          {bench.map((p,i)=><BenchRow key={p?.id??i} player={p} color={color}/>)}
        </div>
      )}
      {mode==="predicted"&&(injuries.length>0||doubts.length>0) && (
        <div style={{marginBottom:12}}>
          <div style={{fontSize:9,fontWeight:900,letterSpacing:"0.1em",color:"#3a5070",textTransform:"uppercase",marginBottom:4}}>Injuries / Doubts</div>
          <div style={{background:"linear-gradient(160deg,#0d1525,#080e1a)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,overflow:"hidden"}}>
            {injuries.map((p,i)=><InjuryRow key={i} player={{...p,status:"injured"}}/>)}
            {doubts.map((p,i)=><InjuryRow key={i} player={{...p,status:"doubtful"}}/>)}
          </div>
        </div>
      )}
    </div>
  );
}


// ═════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════

export default function MatchLineups({ fixtureId }) {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [view,        setView]        = useState("pitch");

  const timerRef     = useRef(null);
  const isOfficialRef = useRef(false);

  // ── fetch + normalise ─────────────────────
  const fetchLineup = useCallback(async () => {
    if (!fixtureId) return;
    try {
      const r = await fetch(`${BACKEND}/api/match-lineup/${fixtureId}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const raw = await r.json();
      const normalised = normalizeResponse(raw);
      setData(normalised);
      setError(null);
      setLastUpdated(new Date());
      setLoading(false);

      if (normalised.mode === "official") {
        isOfficialRef.current = true;
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          console.log("[MatchLineups] Official lineups received — polling stopped.");
        }
      }
    } catch (err) {
      console.error("[MatchLineups] Fetch error:", err);
      setError(err.message);
      setLoading(false);
    }
  }, [fixtureId]);

  // ── mount / fixtureId change ──────────────
  useEffect(() => {
    if (!fixtureId) return;
    isOfficialRef.current = false;
    setLoading(true);
    setData(null);
    setError(null);

    fetchLineup();

    timerRef.current = setInterval(() => {
      if (!isOfficialRef.current) {
        console.log("[MatchLineups] Polling for lineup update…");
        fetchLineup();
      }
    }, POLL_INTERVAL);

    return () => {
      clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [fixtureId, fetchLineup]);

  // ── loading ───────────────────────────────
  if (loading) {
    return (
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"48px 0",gap:14}}>
        <div style={{width:32,height:32,borderRadius:"50%",border:"2px solid rgba(96,165,250,0.2)",borderTopColor:"#60a5fa",animation:"mi_spin 0.8s linear infinite"}}/>
        <div style={{color:"#3a5070",fontSize:12}}>Loading lineups…</div>
        <style>{`@keyframes mi_spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── error ─────────────────────────────────
  if (error) {
    return (
      <div style={{padding:"20px",borderRadius:14,background:"rgba(255,82,82,0.06)",border:"1px solid rgba(255,82,82,0.15)",textAlign:"center"}}>
        <div style={{fontSize:20,marginBottom:8}}>⚠</div>
        <div style={{fontSize:13,fontWeight:700,color:"#ff5252",marginBottom:4}}>Unable to load lineups</div>
        <div style={{fontSize:11,color:"#3a5070"}}>Please refresh or try again later.</div>
      </div>
    );
  }

  // ── not yet available ─────────────────────
  if (!data || (!data.home && !data.away)) {
    return (
      <div style={{padding:"32px 20px",borderRadius:14,background:"linear-gradient(160deg,#0d1525,#080e1a)",border:"1px solid rgba(255,255,255,0.06)",textAlign:"center"}}>
        <div style={{fontSize:22,marginBottom:10}}>⏳</div>
        <div style={{fontSize:13,fontWeight:700,color:"#6b7fa3",marginBottom:6}}>Lineups not available yet</div>
        <div style={{fontSize:11,color:"#3a5070"}}>Official lineups are released approximately 45 minutes before kickoff.</div>
      </div>
    );
  }

  const { mode, announced_at, home, away } = data;

  const tabBtn = (id, label) => (
    <button key={id} onClick={()=>setView(id)} style={{padding:"6px 16px",borderRadius:999,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:view===id?"rgba(96,165,250,0.12)":"transparent",color:view===id?"#60a5fa":"#3a5070",transition:"all 0.15s"}}>
      {label}
    </button>
  );

  return (
    <div>
      <ModeBanner mode={mode} announcedAt={announced_at} lastUpdated={lastUpdated}/>

      <div style={{display:"flex",gap:6,marginBottom:16}}>
        {tabBtn("pitch","Pitch View")}
        {tabBtn("home", home?.team_name||"Home")}
        {tabBtn("away", away?.team_name||"Away")}
      </div>

      {view==="pitch" && (
        <>
          <Pitch
            home={home ?? {starting_xi:[],bench:[]}}
            away={away ?? {starting_xi:[],bench:[]}}
            mode={mode}
          />
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:14}}>
            <TeamPanel team={home} color="#60a5fa" mode={mode}/>
            <TeamPanel team={away} color="#f97316" mode={mode}/>
          </div>
        </>
      )}
      {view==="home" && <TeamDetailView team={home} color="#60a5fa" mode={mode}/>}
      {view==="away" && <TeamDetailView team={away} color="#f97316" mode={mode}/>}
    </div>
  );
}