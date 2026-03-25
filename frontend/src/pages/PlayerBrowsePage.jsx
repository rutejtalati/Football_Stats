// pages/PlayerBrowsePage.jsx
// Browse all players — MOBILE RESPONSIVE

import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getFplBootstrap, getFplPredictorTable } from "../api/api";

/* ── Neobrutalist theme constants ── */
const NB = { y:"#00fff0", k:"#000", r:"#ff2744" };
const NB_CSS = `
  @import url("https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;700;900&family=DM+Mono:wght@400;500&display=swap");
  @keyframes nbPulse  { 0%,100%{opacity:1} 50%{opacity:0.35} }
  @keyframes nbBlink  { 50%{opacity:0} }
  @keyframes nbStripes{ to{background-position:90px 0} }
  @keyframes nbFadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes nbShimmer{ 0%{background-position:-800px 0} 100%{background-position:800px 0} }
  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-track { background:#000; }
  ::-webkit-scrollbar-thumb { background:rgba(0,255,240,.3); }
  ::selection { background:#00fff0; color:#000; }
  input[type=range] { accent-color:#00fff0; }
`;



/* ── Responsive hook ── */
function useIsMobile(bp = 640) {
  const [m, setM] = useState(typeof window !== "undefined" ? window.innerWidth < bp : false);
  useEffect(() => {
    const h = () => setM(window.innerWidth < bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return m;
}

const SHIRT_IDS = {
  ARS:3,AVL:7,BOU:91,BRE:94,BHA:36,CHE:8,CRY:31,EVE:11,FUL:54,IPS:40,
  LEI:13,LIV:14,MCI:43,MUN:1,NEW:4,NFO:17,SOU:20,TOT:6,WHU:21,WOL:39,
};
const POS_COLORS = { GK:"#f2c94c", DEF:"rgba(0,255,240,.7)", MID:"#9ff1b4", FWD:"#ff8080" };

function getUpcomingGameweek(bootstrap) {
  const events = Array.isArray(bootstrap?.events) ? bootstrap.events : [];
  const next = events.find(e => !e.finished && e.is_next);
  if (next?.id) return next.id;
  const curr = events.find(e => !e.finished && e.is_current);
  if (curr?.id) return curr.id;
  return events.find(e => !e.finished)?.id || 29;
}

function normalizePlayer(row, codeMap = {}) {
  if (!row) return null;
  const rawPts   = Number(row.pts_gw_1  ?? 0);
  const rawMerit = Number(row.merit     ?? 0);
  const rawForm  = Number(row.form      ?? 0);
  const ppg      = Number(row.points_so_far ?? 0) / Math.max(Number(row.played ?? 1), 1);
  const projected_points = rawPts > 0 ? rawPts : rawMerit > 0 ? rawMerit : rawForm > 0 ? rawForm : ppg;
  const norm = {
    ...row,
    id: row.id ?? row.player_id,
    player_id: row.player_id ?? row.id,
    name: row.name ?? row.player ?? "-",
    projected_points,
    cost: Number(row.cost ?? 0),
    team: row.team ?? "-",
    position: row.position ?? "-",
    next_opp: row.next_opp ?? "-",
    form: rawForm,
    selected_by_pct: Number(row.selected_by_pct ?? 0),
    fixture_difficulty: Number(row.fixture_difficulty ?? 3),
  };
  const code = row.code
    || codeMap[row.player || row.name || row.web_name]
    || codeMap[row.player_id || row.id];
  return code ? { ...norm, code } : norm;
}

function Skel({ h=20, w="100%", r=8 }) {
  return <div style={{ height:h, width:w, borderRadius:r,
    background:"rgba(0,255,240,.06)", animation:"piSkeletonPulse 1.4s ease-in-out infinite" }}/>;
}

export default function PlayerBrowsePage() {
  const navigate   = useNavigate();
  const isMobile   = useIsMobile();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gw, setGw]           = useState(29);
  const [search, setSearch]   = useState("");
  const [posFilter, setPos]   = useState("ALL");
  const [sortBy, setSortBy]   = useState("pts");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const bootstrap = await getFplBootstrap();
        const nextGw    = getUpcomingGameweek(bootstrap);
        if (cancelled) return;
        setGw(nextGw);
        const codeMap = {};
        (bootstrap?.elements || []).forEach(el => {
          if (el.web_name && el.code) codeMap[el.web_name] = el.code;
          if (el.id && el.code) codeMap[el.id] = el.code;
        });
        const tableData = await getFplPredictorTable({
          start_gw: nextGw, max_cost: 15.5, min_prob: 0, team: "ALL", position: "ALL",
        });
        if (cancelled) return;
        setPlayers((tableData.rows||[]).map(r => normalizePlayer(r, codeMap)).filter(Boolean));
        setLoading(false);
      } catch(e) {
        console.error(e);
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let list = players;
    if (posFilter !== "ALL") list = list.filter(p => p.position === posFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.team.toLowerCase().includes(q)
      );
    }
    if (sortBy === "pts")  list = [...list].sort((a,b) => Number(b.projected_points||0) - Number(a.projected_points||0));
    if (sortBy === "cost") list = [...list].sort((a,b) => Number(b.cost||0) - Number(a.cost||0));
    if (sortBy === "form") list = [...list].sort((a,b) => Number(b.form||0) - Number(a.form||0));
    if (sortBy === "own")  list = [...list].sort((a,b) => Number(b.selected_by_pct||0) - Number(a.selected_by_pct||0));
    return list;
  }, [players, posFilter, search, sortBy]);

  // On mobile: fewer columns — hide FORM and OWN, keep PROJ + COST
  const cols = isMobile
    ? "1fr 52px 48px"
    : "1fr 60px 60px 60px 60px";

  return (
    <div style={{ background:"#000", minHeight:"100vh", padding: isMobile ? "14px 0 80px" : "20px 0 40px" }}>
      <style>{NB_CSS}</style>
      {/* NB bg stripes */}
      {/* Grid from index.css body::after */}
      <div style={{position:"fixed",top:"5vh",left:"-1%",fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(80px,14vw,180px)",color:"rgba(0,255,240,.022)",pointerEvents:"none",zIndex:0,lineHeight:1,userSelect:"none"}}>xG</div>

      <style>{`
        @keyframes piSkeletonPulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .pbp-row:active { background:rgba(0,255,240,0.1) !important; }
      `}</style>
      <div style={{ maxWidth:860, margin:"0 auto", padding: isMobile ? "0 10px" : "0 16px" }}>

        {/* Header */}
        <div style={{ marginBottom:16 }}>
          <h1 style={{ fontSize: isMobile ? 22 : 26, fontWeight:900, color:"#00fff0",
            letterSpacing:"-0.02em", margin:0 }}>
            Player Insight
          </h1>
          <div style={{ color:"rgba(0,255,240,.35)", fontSize:11, fontWeight:700, marginTop:4 }}>
            {loading ? "Loading..." : `${players.length} players · GW${gw} · Tap any player for full analysis`}
          </div>
        </div>

        {/* Filters */}
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10, alignItems:"center" }}>
          {/* Position pills — horizontal scroll on mobile */}
          <div style={{
            display:"flex", gap:5,
            overflowX: isMobile ? "auto" : "visible",
            WebkitOverflowScrolling:"touch",
            scrollbarWidth:"none",
            flexShrink:0,
          }}>
            {["ALL","GK","DEF","MID","FWD"].map(p => (
              <button key={p} onClick={() => setPos(p)} style={{
                padding: isMobile ? "6px 12px" : "5px 13px",
                 fontSize:11, fontWeight:800,
                cursor:"pointer", fontFamily:"inherit", flexShrink:0,
                background: posFilter===p ? (POS_COLORS[p]||"rgba(0,255,240,0.22)") : "rgba(255,255,255,0.05)",
                border: `1px solid ${posFilter===p ? (POS_COLORS[p]||"rgba(0,255,240,0.5)") : "rgba(255,255,255,0.08)"}`,
                color: posFilter===p ? "#000" : "rgba(0,255,240,.35)",
                minHeight:36,
              }}>{p}</button>
            ))}
          </div>

          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search player or team…"
            style={{
              flex:1, minWidth: isMobile ? "100%" : 160,
              padding:"8px 12px", borderRadius:0, fontSize:14,
              background:"rgba(0,255,240,.05)", border:"1px solid rgba(0,255,240,.2)",
              color:"#00fff0", outline:"none", fontFamily:"inherit",
            }}
          />

          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
            padding: isMobile ? "8px 10px" : "6px 10px",
            borderRadius:0, fontSize:11, background:"#000",
            border:"1px solid rgba(0,255,240,.2)", color:"rgba(0,255,240,.8)",
            outline:"none", cursor:"pointer", fontFamily:"inherit",
            minHeight:36, flexShrink:0,
          }}>
            <option value="pts">⬆ Pts</option>
            <option value="form">⬆ Form</option>
            <option value="cost">⬆ Cost</option>
            <option value="own">⬆ Own%</option>
          </select>
        </div>

        {/* Column headers */}
        {!loading && (
          <div style={{ display:"grid", gridTemplateColumns:cols,
            gap:8, padding:"4px 14px", marginBottom:4 }}>
            <span style={{ fontSize:9, fontWeight:800, color:"rgba(0,255,240,.25)", letterSpacing:"0.1em" }}>PLAYER</span>
            <span style={{ fontSize:9, fontWeight:800, color:"rgba(0,255,240,.25)", letterSpacing:"0.1em", textAlign:"right" }}>PROJ</span>
            {!isMobile && <span style={{ fontSize:9, fontWeight:800, color:"rgba(0,255,240,.25)", letterSpacing:"0.1em", textAlign:"right" }}>FORM</span>}
            <span style={{ fontSize:9, fontWeight:800, color:"rgba(0,255,240,.25)", letterSpacing:"0.1em", textAlign:"right" }}>COST</span>
            {!isMobile && <span style={{ fontSize:9, fontWeight:800, color:"rgba(0,255,240,.25)", letterSpacing:"0.1em", textAlign:"right" }}>OWN%</span>}
          </div>
        )}

        {/* Player rows */}
        {loading ? (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {Array.from({length:10}).map((_,i) => <Skel key={i} h={58} r={12} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ color:"rgba(0,255,240,.35)", textAlign:"center", padding:"40px 0", fontSize:14 }}>
            No players match your search
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            {filtered.slice(0, 100).map((p, i) => {
              const pts      = Number(p.projected_points||0);
              const ptsColor = pts>=9?"#9ff1b4":pts>=6?"rgba(0,255,240,.7)":"rgba(0,255,240,.8)";
              const shirtId  = SHIRT_IDS[p.team];
              const faceUrl  = p.code
                ? `https://resources.premierleague.com/premierleague/photos/players/110x140/p${p.code}.png`
                : null;
              const posColor = POS_COLORS[p.position] || "rgba(0,255,240,.8)";

              return (
                <div key={p.player_id||p.id}
                  className="pbp-row"
                  onClick={() => navigate(`/player/${p.player_id||p.id}`)}
                  style={{
                    display:"grid", gridTemplateColumns:cols,
                    gap:8, alignItems:"center",
                    padding: isMobile ? "8px 10px" : "10px 14px",
                    borderRadius:0, cursor:"pointer",
                    background: i%2===0 ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.018)",
                    border:"1px solid rgba(0,255,240,.1)",
                    transition:"all 0.13s ease",
                    WebkitTapHighlightColor:"rgba(0,255,240,0.15)",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(0,255,240,0.07)";
                    e.currentTarget.style.borderColor = "rgba(0,255,240,0.2)";
                    if (!isMobile) e.currentTarget.style.transform = "translateX(4px)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = i%2===0 ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.018)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  {/* Player identity */}
                  <div style={{ display:"flex", alignItems:"center", gap: isMobile ? 8 : 10, minWidth:0 }}>
                    {/* Rank */}
                    {!isMobile && (
                      <span style={{ fontSize:10, fontWeight:800, color:"rgba(0,255,240,.25)", minWidth:20,
                        fontFamily:"DM Mono, monospace" }}>{i+1}</span>
                    )}

                    {/* Face or shirt */}
                    <div style={{ position:"relative", width: isMobile?28:34, height: isMobile?28:34, flexShrink:0 }}>
                      {faceUrl ? (
                        <img src={faceUrl} alt={p.name}
                          style={{ width:isMobile?28:34, height:isMobile?28:34, borderRadius:"50%",
                            objectFit:"cover", objectPosition:"top",
                            border:"1.5px solid rgba(255,255,255,0.12)",
                            background:"#000" }}
                          onError={e => {
                            e.currentTarget.style.display="none";
                            if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display="block";
                          }}
                        />
                      ) : null}
                      {shirtId && (
                        <img
                          src={`https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${shirtId}-66.png`}
                          alt={p.team}
                          style={{ width:isMobile?24:28, height:isMobile?24:28, objectFit:"contain",
                            display: faceUrl ? "none" : "block",
                            filter:"drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}
                          onError={e => { e.currentTarget.style.display="none"; }}
                        />
                      )}
                    </div>

                    {/* Name + meta */}
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize: isMobile ? 12 : 13, fontWeight:800, color:"#00fff0",
                        whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {p.name}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:1, flexWrap:"nowrap" }}>
                        <span style={{ fontSize:9, color:"rgba(0,255,240,.35)", fontWeight:700 }}>{p.team}</span>
                        <span style={{ fontSize:8, fontWeight:900, color:posColor,
                          background:`${posColor}22`, padding:"0 4px", borderRadius:3 }}>
                          {p.position}
                        </span>
                        {!isMobile && (
                          <span style={{ fontSize:9, color:"rgba(0,255,240,.25)" }}>{p.next_opp}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Proj pts */}
                  <span style={{ textAlign:"right", fontSize: isMobile?13:14, fontWeight:900,
                    color:ptsColor, fontFamily:"DM Mono, monospace" }}>{pts.toFixed(1)}</span>

                  {/* Form — desktop only */}
                  {!isMobile && (
                    <span style={{ textAlign:"right", fontSize:13, fontWeight:800, color:"rgba(0,255,240,.7)",
                      fontFamily:"DM Mono, monospace" }}>{Number(p.form||0).toFixed(1)}</span>
                  )}

                  {/* Cost */}
                  <span style={{ textAlign:"right", fontSize: isMobile?11:12, fontWeight:800,
                    color:"#f2c94c", fontFamily:"DM Mono, monospace" }}>
                    £{Number(p.cost||0).toFixed(1)}
                  </span>

                  {/* Ownership — desktop only */}
                  {!isMobile && (
                    <span style={{ textAlign:"right", fontSize:12, fontWeight:800, color:"rgba(0,255,240,.8)",
                      fontFamily:"DM Mono, monospace" }}>{Number(p.selected_by_pct||0).toFixed(1)}%</span>
                  )}
                </div>
              );
            })}
            {filtered.length > 100 && (
              <div style={{ textAlign:"center", color:"rgba(0,255,240,.25)", fontSize:11, padding:"12px 0" }}>
                Showing top 100 of {filtered.length} — refine your search
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}