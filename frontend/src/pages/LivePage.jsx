// ═══════════════════════════════════════════════════════════════════════════
// StatinSite — Live Centre  ·  Command Centre redesign
// ═══════════════════════════════════════════════════════════════════════════
//
// Component tree:
//   LivePage
//     ├─ HeroHeader       title · counters · league tabs
//     ├─ FeaturedRail     3 large hero cards (live-first priority)
//     └─ main grid
//          ├─ left column
//          │    ├─ Section "Live Now"   → LiveCard × n
//          │    ├─ Section "Today"      → mixed cards
//          │    └─ Section per day      → ScheduledCard / FullTimeCard (collapsible)
//          └─ Sidebar (sticky)
//               ├─ NextKickoffWidget   countdown clock
//               ├─ LiveTrackerWidget   compact live scores
//               └─ LeagueSummaryWidget per-league counts
//
// Backend: unchanged — GET /api/matches/upcoming
// Optional Pro fields (all gracefully absent):
//   p_home_win · p_draw · p_away_win · p_btts · p_over25 · insight · latest_event
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND = "https://football-stats-lw4b.onrender.com";

// ─── League registry ─────────────────────────────────────────────────────────

const LEAGUES = {
  epl:        { label:"Premier League", short:"PL", color:"#60a5fa", glow:"rgba(96,165,250,0.16)"  },
  laliga:     { label:"La Liga",        short:"LL", color:"#f97316", glow:"rgba(249,115,22,0.16)"  },
  seriea:     { label:"Serie A",        short:"SA", color:"#34d399", glow:"rgba(52,211,153,0.16)"  },
  bundesliga: { label:"Bundesliga",     short:"BL", color:"#f59e0b", glow:"rgba(245,158,11,0.16)"  },
  ligue1:     { label:"Ligue 1",        short:"L1", color:"#a78bfa", glow:"rgba(167,139,250,0.16)" },
};

const LEAGUE_FILTER = ["all","epl","laliga","seriea","bundesliga","ligue1"];
const LIVE_SET      = new Set(["1H","2H","HT","ET","BT","P"]);
const FT_SET        = new Set(["FT","AET","PEN","AWD","WO"]);

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function normalizeLeague(l) {
  if (!l) return "";
  const v = String(l).toLowerCase();
  if (v==="39"  || v.includes("premier"))                          return "epl";
  if (v==="140" || (v.includes("liga") && !v.includes("bundes"))) return "laliga";
  if (v==="135" || v.includes("serie"))                            return "seriea";
  if (v==="78"  || v.includes("bundes"))                           return "bundesliga";
  if (v==="61"  || v.includes("ligue"))                            return "ligue1";
  return v;
}

function cardMode(status) {
  if (!status || status==="NS" || status==="TBD") return "scheduled";
  if (LIVE_SET.has(status)) return "live";
  if (FT_SET.has(status))   return "fulltime";
  return "scheduled";
}

function fmtTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
}

function fmtKickoffLabel(iso) {
  if (!iso) return "";
  const d   = new Date(iso);
  const now = new Date();
  const tom = new Date(); tom.setDate(now.getDate()+1);
  const t   = d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
  if (d.toDateString()===now.toDateString()) return t;
  if (d.toDateString()===tom.toDateString()) return `Tomorrow ${t}`;
  return d.toLocaleDateString([], { weekday:"short", day:"numeric", month:"short" }) + ` ${t}`;
}

function dayBucket(iso) {
  if (!iso) return "upcoming";
  const d   = new Date(iso);
  const now = new Date();
  const tom = new Date(); tom.setDate(now.getDate()+1);
  if (d.toDateString()===now.toDateString()) return "today";
  if (d.toDateString()===tom.toDateString()) return "tomorrow";
  return d.toLocaleDateString([], { weekday:"long", month:"short", day:"numeric" });
}

function insightLine(f) {
  if (f.insight) return f.insight;
  const { p_home_win:hw, p_draw:d, p_away_win:aw } = f;
  if (hw!=null && aw!=null) {
    if (hw>=60) return `${f.home_team?.split(" ").pop()} favoured — ${hw}% win`;
    if (aw>=60) return `${f.away_team?.split(" ").pop()} favoured — ${aw}% win`;
    if (d >=35) return "Tight matchup · draw likely";
    return "Even contest · close market";
  }
  if (f.xg_home!=null && f.xg_away!=null) {
    const diff = Math.abs(f.xg_home - f.xg_away);
    if (diff < 0.12) return "xG model: even matchup";
    const fav = f.xg_home > f.xg_away ? f.home_team?.split(" ").pop() : f.away_team?.split(" ").pop();
    return `xG edge: ${fav}`;
  }
  return null;
}

function marketBadge(f) {
  if (f.p_btts!=null   && f.p_btts   >= 55) return `BTTS ${f.p_btts}%`;
  if (f.p_over25!=null && f.p_over25 >= 60) return `O2.5 ${f.p_over25}%`;
  return null;
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function LiveDot({ size=5 }) {
  return (
    <span style={{
      width:size, height:size, borderRadius:"50%",
      background:"#ff3333", display:"inline-block", flexShrink:0,
      animation:"lc-pulse 1.4s ease-in-out infinite",
    }} />
  );
}

function Logo({ src, size=18 }) {
  return src ? (
    <img src={src} alt="" width={size} height={size}
      style={{ objectFit:"contain", flexShrink:0 }}
      onError={e => e.currentTarget.style.display="none"} />
  ) : <div style={{ width:size, height:size, flexShrink:0 }} />;
}

function LeagueLabel({ k, small }) {
  const c = LEAGUES[k];
  if (!c) return null;
  return (
    <span style={{ fontSize:small?8:9, fontWeight:900, letterSpacing:"0.09em", color:c.color, textTransform:"uppercase" }}>
      {small ? c.short : c.label}
    </span>
  );
}

// ─── FEATURED RAIL ────────────────────────────────────────────────────────────

function FeaturedCard({ f, onClick }) {
  const [hov, setHov] = useState(false);
  const lg    = LEAGUES[f.league];
  const mode  = cardMode(f.status);
  const isL   = mode==="live";
  const isFT  = mode==="fulltime";
  const hS    = f.home_score ?? null;
  const aS    = f.away_score ?? null;
  const hasSc = hS!==null && aS!==null;
  const hw    = hasSc && hS>aS;
  const aw    = hasSc && aS>hS;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position:"relative", overflow:"hidden",
        borderRadius:18, cursor:"pointer", flexShrink:0,
        width:272, padding:"18px 18px 14px",
        background: isL ? "linear-gradient(145deg,#170b0b,#0e0505)" : "linear-gradient(145deg,#0c1726,#070f1b)",
        border:`1px solid ${isL ? `rgba(255,55,55,${hov?.28:.14})` : `rgba(255,255,255,${hov?.09:.045})`}`,
        boxShadow: hov
          ? `0 20px 50px rgba(0,0,0,0.55), inset 0 0 0 1px ${lg?.color||"#fff"}14`
          : "0 4px 18px rgba(0,0,0,0.3)",
        transform: hov ? "translateY(-4px) scale(1.01)" : "translateY(0) scale(1)",
        transition:"all 0.22s cubic-bezier(.22,.61,.36,1)",
      }}
    >
      {/* Top color bar */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:lg?.color||"#333", opacity:hov?1:.5, transition:"opacity .2s" }} />

      {/* Ambient glow */}
      {lg && <div style={{ position:"absolute", top:-50, right:-30, width:130, height:130, borderRadius:"50%", background:lg.glow, pointerEvents:"none", opacity:hov?1:.45, transition:"opacity .2s" }} />}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <LeagueLabel k={f.league} />
        {isL && <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:9, fontWeight:900, color:"#ff4444" }}><LiveDot />{f.minute?`${f.minute}'`:"LIVE"}</span>}
        {isFT && <span style={{ fontSize:9, fontWeight:800, color:"rgba(255,255,255,.22)", letterSpacing:".08em" }}>FT</span>}
        {!isL && !isFT && <span style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.3)" }}>{fmtKickoffLabel(f.kickoff)}</span>}
      </div>

      {/* Teams */}
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
        {[[f.home_logo,f.home_team,hS,hw],[f.away_logo,f.away_team,aS,aw]].map(([logo,name,score,bold],i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:9 }}>
            <Logo src={logo} size={22} />
            <span style={{ fontSize:13, fontWeight:bold?900:600, color:bold?"#f0f6ff":"#5a6a7e", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</span>
            {hasSc && <span style={{ fontSize:20, fontWeight:900, color:bold?"#f0f6ff":"#2a3a4c", fontFamily:"'JetBrains Mono',monospace", minWidth:22, textAlign:"center" }}>{score}</span>}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ borderTop:"1px solid rgba(255,255,255,.04)", paddingTop:10, minHeight:22 }}>
        {f.xg_home!=null && <span style={{ fontSize:10, color:"rgba(255,255,255,.22)", marginRight:10 }}><span style={{ color:"#34d399", fontWeight:700 }}>xG</span> {f.xg_home}–{f.xg_away}</span>}
        {!hasSc && insightLine(f) && <span style={{ fontSize:10, color:"rgba(255,255,255,.28)", fontStyle:"italic" }}>{insightLine(f)}</span>}
      </div>
    </div>
  );
}

function FeaturedRail({ fixtures, onNavigate }) {
  const cards = useMemo(() => {
    const live  = fixtures.filter(f => LIVE_SET.has(f.status));
    const today = fixtures.filter(f => !LIVE_SET.has(f.status) && !FT_SET.has(f.status) && dayBucket(f.kickoff)==="today");
    const pool  = [...live, ...today, ...fixtures];
    const seen  = new Set();
    return pool.filter(f => { if(seen.has(f.fixture_id)) return false; seen.add(f.fixture_id); return true; }).slice(0,3);
  }, [fixtures]);

  if (!cards.length) return null;
  return (
    <div style={{ marginBottom:32 }}>
      <div style={{ fontSize:9, fontWeight:900, letterSpacing:".14em", color:"#1e2d3e", textTransform:"uppercase", marginBottom:12 }}>Featured</div>
      <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:4 }}>
        {cards.map(f => <FeaturedCard key={f.fixture_id} f={f} onClick={() => onNavigate(f.fixture_id)} />)}
      </div>
    </div>
  );
}

// ─── SCHEDULED CARD ───────────────────────────────────────────────────────────

export function ScheduledCard({ fixture, onClick }) {
  const [hov, setHov] = useState(false);
  const lg     = LEAGUES[fixture.league];
  const line   = insightLine(fixture);
  const market = marketBadge(fixture);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position:"relative", overflow:"hidden",
        padding:"12px 14px 11px",
        borderRadius:12, cursor:"pointer",
        background: hov ? "#0c1828" : "#080f1c",
        border:`1px solid rgba(255,255,255,${hov?.075:.038})`,
        boxShadow: hov ? "0 8px 26px rgba(0,0,0,0.32)" : "none",
        transform: hov ? "translateY(-2px)" : "translateY(0)",
        transition:"all .18s ease",
      }}
    >
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:2, background:lg?.color||"#333", borderRadius:"2px 0 0 2px", opacity:hov?.8:.4, transition:"opacity .18s" }} />

      <div style={{ paddingLeft:10 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <LeagueLabel k={fixture.league} />
          <span style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.28)" }}>{fmtKickoffLabel(fixture.kickoff)}</span>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom: (line||market)?9:0 }}>
          {[[fixture.home_logo,fixture.home_team],[fixture.away_logo,fixture.away_team]].map(([logo,name],i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:7 }}>
              <Logo src={logo} size={16} />
              <span style={{ fontSize:12, fontWeight:700, color:"#a8bdd4", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</span>
            </div>
          ))}
        </div>

        {(line||market) && (
          <div style={{ borderTop:"1px solid rgba(255,255,255,.04)", paddingTop:7, display:"flex", gap:7, alignItems:"center", flexWrap:"wrap" }}>
            {line   && <span style={{ fontSize:9.5, color:"rgba(255,255,255,.25)", fontStyle:"italic", flex:1 }}>{line}</span>}
            {market && <span style={{ fontSize:9, fontWeight:800, letterSpacing:".06em", color:"#34d399", background:"rgba(52,211,153,.07)", padding:"2px 7px", borderRadius:999 }}>{market}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── LIVE CARD ────────────────────────────────────────────────────────────────

export function LiveCard({ fixture, onClick }) {
  const [hov, setHov] = useState(false);
  const lg   = LEAGUES[fixture.league];
  const hS   = fixture.home_score ?? 0;
  const aS   = fixture.away_score ?? 0;
  const hw   = hS > aS;
  const aw   = aS > hS;
  const isHT = fixture.status === "HT";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position:"relative", overflow:"hidden",
        padding:"12px 14px 11px",
        borderRadius:12, cursor:"pointer",
        background: hov ? "#160a0a" : "#0f0606",
        border:`1px solid rgba(255,44,44,${hov?.28:.14})`,
        boxShadow: hov ? "0 10px 34px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,44,44,.08)" : "0 2px 10px rgba(0,0,0,.28)",
        transform: hov ? "translateY(-2px)" : "translateY(0)",
        transition:"all .18s ease",
      }}
    >
      {/* Red ambient */}
      <div style={{ position:"absolute", top:-24, right:-24, width:80, height:80, borderRadius:"50%", background:"rgba(255,30,30,.07)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:2, background:lg?.color||"#ff4444", borderRadius:"2px 0 0 2px" }} />

      <div style={{ paddingLeft:10 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:9 }}>
          <LeagueLabel k={fixture.league} />
          {isHT
            ? <span style={{ fontSize:9, fontWeight:900, color:"#f59e0b", background:"rgba(245,158,11,.09)", padding:"2px 7px", borderRadius:999, letterSpacing:".08em" }}>HALF TIME</span>
            : <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:9, fontWeight:900, color:"#ff4444", background:"rgba(255,40,40,.09)", padding:"2px 8px", borderRadius:999 }}><LiveDot />{fixture.minute?`${fixture.minute}'`:"LIVE"}</span>
          }
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:9 }}>
          {[[fixture.home_logo,fixture.home_team,hS,hw],[fixture.away_logo,fixture.away_team,aS,aw]].map(([logo,name,score,bold],i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:7 }}>
              <Logo src={logo} size={16} />
              <span style={{ fontSize:12, fontWeight:bold?800:600, color:bold?"#edf4ff":"#4a5a6e", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</span>
              <span style={{ fontSize:18, fontWeight:900, color:bold?"#f0f6ff":"#2a3a4c", fontFamily:"'JetBrains Mono',monospace", minWidth:20, textAlign:"center" }}>{score}</span>
            </div>
          ))}
        </div>

        <div style={{ borderTop:"1px solid rgba(255,255,255,.035)", paddingTop:7, display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          {fixture.xg_home!=null && (
            <span style={{ fontSize:9.5, color:"rgba(255,255,255,.3)" }}>
              <span style={{ color:"#34d399", fontWeight:700 }}>xG</span> {fixture.xg_home}–{fixture.xg_away}
            </span>
          )}
          {fixture.latest_event && (
            <span style={{ fontSize:9.5, color:"rgba(255,255,255,.22)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{fixture.latest_event}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── FULLTIME CARD ────────────────────────────────────────────────────────────

export function FullTimeCard({ fixture, onClick }) {
  const [hov, setHov] = useState(false);
  const lg   = LEAGUES[fixture.league];
  const hS   = fixture.home_score ?? 0;
  const aS   = fixture.away_score ?? 0;
  const hw   = hS > aS;
  const aw   = aS > hS;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position:"relative", overflow:"hidden",
        padding:"12px 14px 11px",
        borderRadius:12, cursor:"pointer",
        background: hov ? "#07090f" : "#050710",
        border:`1px solid rgba(255,255,255,${hov?.055:.025})`,
        boxShadow: hov ? "0 6px 18px rgba(0,0,0,.28)" : "none",
        transform: hov ? "translateY(-1px)" : "translateY(0)",
        transition:"all .18s ease",
        opacity: hov ? 1 : .78,
      }}
    >
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:2, background:lg?.color||"#333", borderRadius:"2px 0 0 2px", opacity:.25 }} />

      <div style={{ paddingLeft:10 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <LeagueLabel k={fixture.league} />
          <span style={{ fontSize:9, fontWeight:800, color:"rgba(255,255,255,.18)", background:"rgba(255,255,255,.035)", padding:"2px 7px", borderRadius:999, letterSpacing:".08em" }}>FT</span>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:fixture.xg_home!=null?8:0 }}>
          {[[fixture.home_logo,fixture.home_team,hS,hw],[fixture.away_logo,fixture.away_team,aS,aw]].map(([logo,name,score,bold],i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:7 }}>
              <Logo src={logo} size={16} />
              <span style={{ fontSize:12, fontWeight:bold?800:500, color:bold?"#c8daf0":"#2e4056", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</span>
              <span style={{ fontSize:16, fontWeight:bold?900:600, color:bold?"#c0d4ec":"#1e2f40", fontFamily:"'JetBrains Mono',monospace", minWidth:18, textAlign:"center" }}>{score}</span>
            </div>
          ))}
        </div>

        {fixture.xg_home!=null && (
          <div style={{ borderTop:"1px solid rgba(255,255,255,.025)", paddingTop:6 }}>
            <span style={{ fontSize:9.5, color:"rgba(255,255,255,.15)" }}>
              <span style={{ color:"rgba(52,211,153,.45)", fontWeight:700 }}>xG</span> {fixture.xg_home}–{fixture.xg_away}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, count, accent, collapsible, defaultOpen=true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom:24 }}>
      <div
        onClick={collapsible ? () => setOpen(o=>!o) : undefined}
        style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, cursor:collapsible?"pointer":"default", userSelect:"none" }}
      >
        {accent && <div style={{ width:3, height:14, borderRadius:2, background:accent, flexShrink:0 }} />}
        <span style={{ fontSize:10, fontWeight:900, letterSpacing:".14em", color:"#2a3d52", textTransform:"uppercase" }}>{title}</span>
        {count!=null && (
          <span style={{ fontSize:9, fontWeight:800, color:accent||"rgba(255,255,255,.3)", background:accent?`${accent}14`:"rgba(255,255,255,.04)", padding:"1px 7px", borderRadius:999 }}>{count}</span>
        )}
        {collapsible && (
          <span style={{ marginLeft:"auto", fontSize:11, color:"rgba(255,255,255,.15)", display:"inline-block", transition:"transform .2s", transform:open?"rotate(0)":"rotate(-90deg)" }}>▾</span>
        )}
      </div>
      {(!collapsible || open) && (
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function CardRouter({ f, onNavigate }) {
  const mode = cardMode(f.status);
  const go   = () => onNavigate(f.fixture_id);
  if (mode==="live")     return <LiveCard     fixture={f} onClick={go} />;
  if (mode==="fulltime") return <FullTimeCard fixture={f} onClick={go} />;
  return                        <ScheduledCard fixture={f} onClick={go} />;
}

// ─── Sidebar widgets ──────────────────────────────────────────────────────────

function WidgetShell({ title, children }) {
  return (
    <div style={{ background:"#080e1c", border:"1px solid rgba(255,255,255,.045)", borderRadius:14, padding:"14px 15px", marginBottom:10 }}>
      <div style={{ fontSize:9, fontWeight:900, letterSpacing:".13em", color:"#1e2d3e", textTransform:"uppercase", marginBottom:12 }}>{title}</div>
      {children}
    </div>
  );
}

function NextKickoffWidget({ fixtures }) {
  const next = useMemo(() => {
    const now = Date.now();
    return fixtures
      .filter(f => cardMode(f.status)==="scheduled" && f.kickoff)
      .sort((a,b) => new Date(a.kickoff)-new Date(b.kickoff))
      .find(f => new Date(f.kickoff).getTime() > now);
  }, [fixtures]);

  const [cd, setCd] = useState("");
  useEffect(() => {
    if (!next) return;
    const tick = () => {
      const diff = new Date(next.kickoff).getTime() - Date.now();
      if (diff<=0) { setCd("Kick off!"); return; }
      const h=Math.floor(diff/3_600_000), m=Math.floor((diff%3_600_000)/60_000), s=Math.floor((diff%60_000)/1_000);
      setCd(h>0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [next]);

  if (!next) return null;
  return (
    <WidgetShell title="Next Kick Off">
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
        <Logo src={next.home_logo} size={18} />
        <span style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.45)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{next.home_team?.split(" ").pop()}</span>
        <span style={{ fontSize:9, color:"rgba(255,255,255,.2)", fontWeight:600 }}>vs</span>
        <span style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.45)", flex:1, textAlign:"right", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{next.away_team?.split(" ").pop()}</span>
        <Logo src={next.away_logo} size={18} />
      </div>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:24, fontWeight:900, color:"#60a5fa", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"-0.02em" }}>{cd}</div>
        <div style={{ fontSize:10, color:"rgba(255,255,255,.18)", marginTop:3 }}>{fmtTime(next.kickoff)} · <LeagueLabel k={next.league} small /></div>
      </div>
    </WidgetShell>
  );
}

function LiveTrackerWidget({ fixtures }) {
  const live = fixtures.filter(f => LIVE_SET.has(f.status));
  return (
    <WidgetShell title="Live Tracker">
      {live.length===0
        ? <div style={{ fontSize:11, color:"#141e2c", textAlign:"center", padding:"6px 0" }}>No matches in progress</div>
        : (
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {live.map(f => (
              <div key={f.fixture_id} style={{ display:"flex", alignItems:"center", gap:7 }}>
                <span style={{ fontSize:9, fontWeight:900, color:"#ff4444", minWidth:26, fontFamily:"'JetBrains Mono',monospace" }}>
                  {f.minute?`${f.minute}'`:"–"}
                </span>
                <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.38)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {f.home_team?.split(" ").pop()} {f.home_score??0}–{f.away_score??0} {f.away_team?.split(" ").pop()}
                </span>
                <div style={{ width:5, height:5, borderRadius:"50%", background:LEAGUES[f.league]?.color||"#555", flexShrink:0 }} />
              </div>
            ))}
          </div>
        )
      }
    </WidgetShell>
  );
}

function LeagueSummaryWidget({ fixtures }) {
  const rows = LEAGUE_FILTER.filter(l=>l!=="all").map(key => {
    const lx   = fixtures.filter(f=>f.league===key);
    const live = lx.filter(f=>LIVE_SET.has(f.status)).length;
    return { key, live, total:lx.length };
  }).filter(r=>r.total>0);

  if (!rows.length) return null;
  return (
    <WidgetShell title="Leagues">
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {rows.map(({ key, live, total }) => {
          const c = LEAGUES[key];
          return (
            <div key={key} style={{ display:"flex", alignItems:"center", gap:7 }}>
              <div style={{ width:2, height:14, borderRadius:2, background:c.color, flexShrink:0 }} />
              <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", flex:1 }}>{c.label}</span>
              {live>0 && <span style={{ fontSize:9, fontWeight:800, color:"#ff4444", background:"rgba(255,40,40,.09)", padding:"1px 6px", borderRadius:999 }}>{live} live</span>}
              <span style={{ fontSize:9, fontWeight:700, color:"#1e2d3e" }}>{total}</span>
            </div>
          );
        })}
      </div>
    </WidgetShell>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function LivePage() {
  const navigate = useNavigate();
  const [chips,   setChips]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [filter,  setFilter]  = useState("all");
  const [lastUp,  setLastUp]  = useState(null);

  const fetchData = () => {
    fetch(`${BACKEND}/api/matches/upcoming`)
      .then(r => { if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setChips(d.matches||d.chips||[]); setLoading(false); setLastUp(new Date()); setError(null); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { fetchData(); const id=setInterval(fetchData,30_000); return ()=>clearInterval(id); }, []);

  const fixtures = useMemo(() => chips.map(c => ({
    fixture_id:  c.fixture_id,
    league:      normalizeLeague(c.league||c.league_id),
    home_team:   c.home_team,  away_team:  c.away_team,
    home_logo:   c.home_logo,  away_logo:  c.away_logo,
    home_score:  c.home_score??null, away_score: c.away_score??null,
    status:      c.status,     minute:     c.minute,
    kickoff:     c.kickoff||c.date,
    xg_home:     c.xg_home??null,  xg_away:    c.xg_away??null,
    // Pro enrichment — all optional
    p_home_win:  c.p_home_win??null, p_draw:     c.p_draw??null,    p_away_win: c.p_away_win??null,
    p_btts:      c.p_btts??null,     p_over25:   c.p_over25??null,
    insight:     c.insight??null,    latest_event: c.latest_event??null,
  })), [chips]);

  const filtered = useMemo(() => filter==="all" ? fixtures : fixtures.filter(f=>f.league===filter), [fixtures,filter]);

  const liveAll  = filtered.filter(f => LIVE_SET.has(f.status));
  const todayFix = filtered.filter(f => !LIVE_SET.has(f.status) && dayBucket(f.kickoff)==="today");
  const ftToday  = filtered.filter(f => FT_SET.has(f.status) && dayBucket(f.kickoff)==="today");

  const upcoming = useMemo(() => {
    const groups={}, order=[];
    filtered
      .filter(f => !LIVE_SET.has(f.status) && !FT_SET.has(f.status) && dayBucket(f.kickoff)!=="today")
      .forEach(f => {
        const k=dayBucket(f.kickoff);
        if(!groups[k]){groups[k]=[];order.push(k);}
        groups[k].push(f);
      });
    return { groups, order };
  }, [filtered]);

  const liveCount  = fixtures.filter(f=>LIVE_SET.has(f.status)).length;
  const todayCount = fixtures.filter(f=>dayBucket(f.kickoff)==="today").length;

  return (
    <>
      <style>{`
        @keyframes lc-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.68)} }
        @keyframes lc-spin  { to{transform:rotate(360deg)} }
        @keyframes lc-in    { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:translateY(0)} }
        *{box-sizing:border-box}
      `}</style>

      <div style={{ background:"#050810", minHeight:"100vh", fontFamily:"'Inter','Sora',system-ui,sans-serif" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"0 20px" }}>

          {/* ══ HERO HEADER ══ */}
          <div style={{ padding:"26px 0 18px", borderBottom:"1px solid rgba(255,255,255,.04)", marginBottom:22 }}>
            {/* Top row: title + counters */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
              <div>
                <h1 style={{ fontSize:28, fontWeight:900, color:"#f0f6ff", margin:0, letterSpacing:"-0.025em", lineHeight:1 }}>Live Centre</h1>
                <p style={{ color:"#1e2d3e", fontSize:12, margin:"5px 0 0", fontWeight:600 }}>Next 7 days · Top 5 leagues</p>
              </div>
              <div style={{ display:"flex", gap:7, alignItems:"center", flexWrap:"wrap", justifyContent:"flex-end" }}>
                {liveCount>0 && (
                  <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(255,40,40,.07)", border:"1px solid rgba(255,40,40,.18)", borderRadius:999, padding:"5px 12px" }}>
                    <LiveDot /><span style={{ fontSize:11, fontWeight:800, color:"#ff5252" }}>{liveCount} Live</span>
                  </div>
                )}
                <div style={{ background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.05)", borderRadius:999, padding:"5px 12px" }}>
                  <span style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.25)" }}>{todayCount} Today</span>
                </div>
                {lastUp && (
                  <div style={{ background:"rgba(255,255,255,.015)", border:"1px solid rgba(255,255,255,.035)", borderRadius:999, padding:"5px 10px" }}>
                    <span style={{ fontSize:10, color:"#141e2c", fontWeight:600 }}>
                      {lastUp.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* League filter tabs */}
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {LEAGUE_FILTER.map(l => {
                const c      = LEAGUES[l];
                const active = filter===l;
                const col    = c?.color||"#60a5fa";
                return (
                  <button key={l} onClick={() => setFilter(l)} style={{
                    padding:"5px 13px", borderRadius:999, cursor:"pointer",
                    fontSize:11, fontWeight:700, letterSpacing:".03em",
                    border:`1px solid ${active?col+"40":"rgba(255,255,255,.045)"}`,
                    background: active?col+"12":"rgba(255,255,255,.012)",
                    color: active?col:"rgba(255,255,255,.22)",
                    transition:"all .15s",
                  }}>
                    {l==="all"?"All":c?.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ══ STATES ══ */}
          {loading && (
            <div style={{ textAlign:"center", padding:"56px 0", color:"#1e2d3e", fontSize:13 }}>
              <div style={{ width:26, height:26, borderRadius:"50%", border:"2px solid rgba(96,165,250,.1)", borderTopColor:"#60a5fa", margin:"0 auto 12px", animation:"lc-spin .8s linear infinite" }} />
              Loading fixtures…
            </div>
          )}

          {error && (
            <div style={{ background:"rgba(255,82,82,.04)", border:"1px solid rgba(255,82,82,.1)", borderRadius:12, padding:"13px 16px", color:"#ff5252", fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
              <span>Failed to load: {error}</span>
              <button onClick={fetchData} style={{ background:"none", border:"1px solid rgba(255,82,82,.22)", color:"#ff5252", borderRadius:6, padding:"3px 10px", cursor:"pointer", fontSize:11 }}>Retry</button>
            </div>
          )}

          {!loading && !error && (
            <div style={{ animation:"lc-in .3s ease both" }}>

              {/* ══ FEATURED RAIL ══ */}
              <FeaturedRail fixtures={filtered} onNavigate={id => navigate(`/match/${id}`)} />

              {/* ══ MAIN GRID ══ */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 236px", gap:22, alignItems:"start" }}>

                {/* Left: sections */}
                <div>
                  {filtered.length===0 && (
                    <div style={{ textAlign:"center", padding:"44px 0", color:"#141e2c", fontSize:13 }}>No fixtures for this filter.</div>
                  )}

                  {liveAll.length>0 && (
                    <Section title="Live Now" count={liveAll.length} accent="#ff4444">
                      {liveAll.map(f => <CardRouter key={f.fixture_id} f={f} onNavigate={id=>navigate(`/match/${id}`)} />)}
                    </Section>
                  )}

                  {(todayFix.length>0||ftToday.length>0) && (
                    <Section title="Today" count={todayFix.length+ftToday.length} accent="#60a5fa">
                      {[...todayFix,...ftToday].map(f => <CardRouter key={f.fixture_id} f={f} onNavigate={id=>navigate(`/match/${id}`)} />)}
                    </Section>
                  )}

                  {upcoming.order.map((day,i) => (
                    <Section key={day} title={day} count={upcoming.groups[day].length} collapsible defaultOpen={i<2}>
                      {upcoming.groups[day].map(f => <CardRouter key={f.fixture_id} f={f} onNavigate={id=>navigate(`/match/${id}`)} />)}
                    </Section>
                  ))}
                </div>

                {/* Sidebar */}
                <div style={{ position:"sticky", top:16 }}>
                  <NextKickoffWidget  fixtures={filtered} />
                  <LiveTrackerWidget  fixtures={filtered} />
                  <LeagueSummaryWidget fixtures={filtered} />
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  );
}