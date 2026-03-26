// ═══════════════════════════════════════════════════════════════════════
// StatinSite — HomePage v7  "Full Backend Intelligence"
// ═══════════════════════════════════════════════════════════════════════
// Sections:
//   1.  Hero             — hero_stats from /dashboard (verified_accuracy, fixtures_predicted, competitions)
//   2.  LiveStrip        — /api/matches/upcoming
//   3.  TopPredictions   — dashboard.top_predictions
//   4.  TitleRace        — dashboard.title_race + dashboard.form_table
//   5.  EdgeBoard        — dashboard.model_edges + dashboard.high_scoring_matches
//   6.  CommandGrid      — static nav, live data from dashboard
//   7.  CompetitionHub   — bigger cards, theme-aware badges, live count from fixtures
//   8.  FPLHub           — dashboard.differential_captains + dashboard.value_players
//   9.  TrendingPlayers  — dashboard.xg_leaders + dashboard.trending_players
//  10.  TransferBrief    — dashboard.transfer_brief + dashboard.analytics_term + dashboard.defense_table
//  11.  PowerRankings    — dashboard.power_rankings (NEW)
//  12.  ModelPerformance — dashboard.performance_summary + dashboard.accountability_summary
//  13.  WhyStatinSite    — static platform facts
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";

const API = "https://football-stats-lw4b.onrender.com";
const LIVE_SET = new Set(["1H","2H","HT","ET","BT","P"]);
const FT_SET   = new Set(["FT","AET","PEN"]);
const isToday  = d => d && new Date(d).toDateString() === new Date().toDateString();

// ─── Data hooks ──────────────────────────────────────────────────────────────
function useUpcoming() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let dead = false;
    const k = "hp7_up";
    try { const r = sessionStorage.getItem(k); if (r) { const {ts,p} = JSON.parse(r); if (Date.now()-ts<180000) { setData(p); setLoading(false); return; } } } catch {}
    fetch(`${API}/api/matches/upcoming`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (dead || !d) return;
        const raw = d.matches || d.chips || [];
        const m = raw.map(c => ({
          fixture_id: c.fixture_id, home_team: c.home_team, away_team: c.away_team,
          home_logo: c.home_logo, away_logo: c.away_logo,
          home_score: c.home_score??null, away_score: c.away_score??null,
          status: c.status, minute: c.minute, kickoff: c.kickoff||c.date,
          league_name: c.league_name||c.league, league_id: c.league_id,
          p_home_win: c.p_home_win??null, p_draw: c.p_draw??null, p_away_win: c.p_away_win??null,
          confidence: c.confidence??null, home_form: c.home_form||"", away_form: c.away_form||"",
        }));
        setData(m);
        try { sessionStorage.setItem(k, JSON.stringify({ts:Date.now(),p:m})); } catch {}
      }).catch(()=>{}).finally(()=>{ if(!dead) setLoading(false); });
    return () => { dead = true; };
  }, []);
  return { fixtures: data, loading };
}

function useDashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let dead = false;
    const k = "hp7_dash";
    try { const r = sessionStorage.getItem(k); if (r) { const {ts,p} = JSON.parse(r); if (Date.now()-ts<300000) { setData(p); setLoading(false); return; } } } catch {}
    // Single dashboard call — already includes performance_summary + accountability_summary (indices 16 & 17)
    fetch(`${API}/api/home/dashboard`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (dead || !d) return;
        setData(d);
        try { sessionStorage.setItem(k, JSON.stringify({ts:Date.now(),p:d})); } catch {}
      })
      .catch(()=>{}).finally(()=>{ if(!dead) setLoading(false); });
    return () => { dead = true; };
  }, []);
  return { dash: data, loading };
}

// ─── Utility hooks ────────────────────────────────────────────────────────────
function useReveal(thr = 0.06) {
  const ref = useRef(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); io.disconnect(); } }, { threshold: thr });
    io.observe(el); return () => io.disconnect();
  }, []);
  return [ref, v];
}

function useTilt(str = 6) {
  const ref = useRef(null);
  const [tf, setTf]   = useState("perspective(900px) rotateX(0) rotateY(0) scale3d(1,1,1)");
  const [gl, setGl]   = useState({x:50,y:50});
  const onMove = useCallback(e => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX-r.left)/r.width, y = (e.clientY-r.top)/r.height;
    setTf(`perspective(900px) rotateX(${(y-.5)*-str}deg) rotateY(${(x-.5)*str}deg) scale3d(1.015,1.015,1.015)`);
    setGl({x:Math.round(x*100),y:Math.round(y*100)});
  }, [str]);
  const onLeave = useCallback(() => { setTf("perspective(900px) rotateX(0) rotateY(0) scale3d(1,1,1)"); setGl({x:50,y:50}); }, []);
  return {ref, tf, gl, onMove, onLeave};
}

function CountUp({ to, suffix="", dur=900 }) {
  const [v, setV]   = useState(0);
  const [ref, vis]  = useReveal(0.1);
  const ran         = useRef(false);
  useEffect(() => {
    if (!vis||ran.current||!to) return; ran.current=true;
    const t0 = performance.now();
    const go = ts => { const p=Math.min((ts-t0)/dur,1); setV(Math.round((1-Math.pow(1-p,4))*to)); if(p<1) requestAnimationFrame(go); };
    requestAnimationFrame(go);
  }, [vis, to, dur]);
  return <span ref={ref} className="hp4-mono">{v}{suffix}</span>;
}

function RippleBtn({ children, onClick, cls="", style={} }) {
  const [rips, setRips] = useState([]);
  const go = e => {
    const r = e.currentTarget.getBoundingClientRect(), id=Date.now();
    setRips(p=>[...p,{id,x:e.clientX-r.left,y:e.clientY-r.top}]);
    setTimeout(()=>setRips(p=>p.filter(r=>r.id!==id)),700);
    onClick?.(e);
  };
  return <button className={`hp4-btn ${cls}`} style={style} onClick={go}>{children}{rips.map(r=><span key={r.id} className="hp4-ripple" style={{left:r.x,top:r.y}}/>)}</button>;
}

function Skel({w="100%",h=14,r=5}) { return <div className="hp5-skel" style={{width:w,height:h,borderRadius:r,display:"block"}}/>; }

function FormPip({r}) {
  const c=r==="W"?"#34d399":r==="D"?"#f59e0b":"#f87171";
  return <div style={{width:14,height:14,borderRadius:3,background:`${c}22`,border:`1px solid ${c}50`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontWeight:900,color:c}}>{r}</div>;
}

// ─── Theme-aware badge ────────────────────────────────────────────────────────
function Badge({ label, color, size="sm" }) {
  const isDark = document.documentElement.getAttribute("data-theme") !== "light";
  const bg     = isDark ? `${color}18` : `${color}12`;
  const border = isDark ? `${color}35` : `${color}25`;
  const pad    = size === "sm" ? "2px 7px" : "4px 11px";
  const fs     = size === "sm" ? 8 : 10;
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",padding:pad,borderRadius:999,
      fontSize:fs,fontWeight:800,letterSpacing:"0.06em",
      background:bg,border:`1px solid ${border}`,color:color,
      whiteSpace:"nowrap",
    }}>{label}</span>
  );
}

// ─── Background animations ────────────────────────────────────────────────────
function TelemetryGrid() {
  const c = useRef(null);
  useEffect(() => {
    const canvas = c.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf, t=0;
    const resize = () => { canvas.width=canvas.offsetWidth; canvas.height=canvas.offsetHeight; };
    resize(); window.addEventListener("resize",resize);
    const isDark = () => document.documentElement.getAttribute("data-theme") !== "light";
    const draw = () => {
      const dark = isDark(); const ga = dark ? 1 : 0.3; const da = dark ? 1 : 0.2;
      const {width:W,height:H} = canvas; ctx.clearRect(0,0,W,H);
      const SZ=64, cols=Math.ceil(W/SZ)+2, rows=Math.ceil(H/SZ)+2;
      const ox=(t*0.3)%SZ, oy=(t*0.15)%SZ;
      for(let i=-1;i<cols;i++){const a=(0.02+0.01*Math.sin(i*0.4+t*0.007))*ga;ctx.strokeStyle=`rgba(56,189,248,${a})`;ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(i*SZ-ox,0);ctx.lineTo(i*SZ-ox,H);ctx.stroke();}
      for(let j=-1;j<rows;j++){const a=(0.02+0.01*Math.sin(j*0.5+t*0.005))*ga;ctx.strokeStyle=`rgba(56,189,248,${a})`;ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(0,j*SZ-oy);ctx.lineTo(W,j*SZ-oy);ctx.stroke();}
      for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){const p=Math.sin(i*0.8+j*0.6+t*0.04);if(p>0.7){ctx.fillStyle=`rgba(52,211,153,${(p-0.7)*0.45*da})`;ctx.beginPath();ctx.arc(i*SZ-ox,j*SZ-oy,1.5,0,Math.PI*2);ctx.fill();}}
      t++; raf=requestAnimationFrame(draw);
    };
    draw(); return () => { cancelAnimationFrame(raf); window.removeEventListener("resize",resize); };
  },[]);
  return <canvas ref={c} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0}}/>;
}

function Particles({n=20}) {
  const ps = useMemo(()=>Array.from({length:n},(_,i)=>({id:i,x:Math.random()*100,y:Math.random()*100,sz:1+Math.random()*2.2,dur:9+Math.random()*14,del:-Math.random()*18,c:["56,189,248","52,211,153","167,139,250","245,158,11"][i%4]})),[n]);
  const isDark = document.documentElement.getAttribute("data-theme") !== "light";
  const alpha = isDark ? 0.6 : 0.18; const glowA = isDark ? 0.4 : 0.08;
  return <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>{ps.map(p=><div key={p.id} style={{position:"absolute",left:`${p.x}%`,top:`${p.y}%`,width:p.sz,height:p.sz,borderRadius:"50%",background:`rgba(${p.c},${alpha})`,boxShadow:`0 0 ${p.sz*3}px rgba(${p.c},${glowA})`,animation:`hp4-float ${p.dur}s ${p.del}s linear infinite`}}/>)}</div>;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1 — HERO
// ═══════════════════════════════════════════════════════════════
function LiveMatchPanel({ fixtures }) {
  const nav  = useNavigate();
  const live = fixtures.filter(f => LIVE_SET.has(f.status)).slice(0,3);
  if (!live.length) return (
    <div className="hp6-hero-panel">
      <div className="hp6-panel-label">LIVE CENTRE</div>
      <div className="hp6-panel-empty">No matches live</div>
      <div className="hp6-panel-sub">{fixtures.filter(f=>isToday(f.kickoff)).length} fixtures today</div>
    </div>
  );
  return (
    <div className="hp6-hero-panel">
      <div className="hp6-panel-label" style={{color:"#ff4444"}}>
        <span className="hp4-live-dot hp4-live-dot--sm" style={{"--dot-color":"#ff4444"}}/> {live.length} LIVE NOW
      </div>
      {live.map(f=>(
        <div key={f.fixture_id} className="hp6-live-row" onClick={()=>nav(`/match/${f.fixture_id}`)}>
          <div className="hp6-live-teams">
            {f.home_logo&&<img src={f.home_logo} width={14} height={14} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
            <span className="hp6-lr-name">{f.home_team?.split(" ").slice(-1)[0]}</span>
            <span className="hp6-lr-score hp4-mono">{f.home_score??0}–{f.away_score??0}</span>
            <span className="hp6-lr-name">{f.away_team?.split(" ").slice(-1)[0]}</span>
            {f.away_logo&&<img src={f.away_logo} width={14} height={14} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
          </div>
          {f.minute&&<span className="hp6-lr-min hp4-mono">{f.minute}'</span>}
        </div>
      ))}
    </div>
  );
}

function TopPredPanel({ dash }) {
  const nav  = useNavigate();
  const pred = dash?.top_predictions?.predictions?.[0];
  if (!pred) return (
    <div className="hp6-hero-panel">
      <div className="hp6-panel-label">TOP PREDICTION</div>
      <Skel w="80%" h={11}/><div style={{marginTop:6}}/><Skel w="60%" h={9}/>
    </div>
  );
  const fav=pred.homeProb>pred.awayProb?pred.home:pred.away, favProb=Math.max(pred.homeProb||0,pred.awayProb||0);
  const hPct=pred.homeProb||0, aPct=pred.awayProb||0, dPct=pred.draw||0;
  return (
    <div className="hp6-hero-panel" onClick={()=>nav(`/predictions/premier-league`)} style={{cursor:"pointer"}}>
      <div className="hp6-panel-label" style={{color:"#38bdf8"}}>TOP PREDICTION</div>
      <div className="hp6-pred-teams">
        {pred.home_logo&&<img src={pred.home_logo} width={18} height={18} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
        <span className="hp6-pred-name">{pred.home?.split(" ").slice(-1)[0]}</span>
        <span style={{color:"var(--text-dim)",fontSize:9,margin:"0 3px"}}>vs</span>
        <span className="hp6-pred-name">{pred.away?.split(" ").slice(-1)[0]}</span>
        {pred.away_logo&&<img src={pred.away_logo} width={18} height={18} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
      </div>
      <div style={{display:"flex",height:5,borderRadius:999,overflow:"hidden",margin:"8px 0 5px",gap:1}}>
        <div style={{flex:hPct,background:"#38bdf8",opacity:.9}}/>
        <div style={{flex:dPct,background:"var(--border-strong)"}}/>
        <div style={{flex:aPct,background:"#34d399",opacity:.9}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:9}}>
        <span className="hp4-mono" style={{color:"#38bdf8",fontWeight:900}}>{hPct}%</span>
        <span style={{color:"var(--text-dim)"}}>D {dPct}%</span>
        <span className="hp4-mono" style={{color:"#34d399",fontWeight:900}}>{aPct}%</span>
      </div>
      <div style={{marginTop:6,fontSize:9,color:"var(--text-muted)"}}>
        xG <span className="hp4-mono" style={{color:"var(--text)"}}>{pred.xg_home!=null?Number(pred.xg_home).toFixed(1):"—"}–{pred.xg_away!=null?Number(pred.xg_away).toFixed(1):"—"}</span>
        <span style={{marginLeft:8,background:"#38bdf818",color:"#38bdf8",padding:"1px 6px",borderRadius:999,fontWeight:800}}>{favProb}% {fav?.split(" ").slice(-1)[0]}</span>
      </div>
    </div>
  );
}

function ModelConfPanel({ dash, dash_loading }) {
  const conf = dash?.model_confidence;
  const edge = dash?.model_edges?.edges?.[0];
  return (
    <div className="hp6-hero-panel">
      <div className="hp6-panel-label">MODEL SIGNALS</div>
      {dash_loading||!conf ? (
        <><Skel w="60%" h={22}/><div style={{marginTop:6}}/><Skel w="75%" h={9}/></>
      ) : (
        <>
          <div className="hp6-conf-val hp4-mono" style={{color:"#34d399"}}>{conf.avg_confidence}%</div>
          <div style={{fontSize:9,color:"var(--text-muted)",marginBottom:8}}>avg confidence · {conf.total} fixtures</div>
          <div style={{display:"flex",gap:3,marginBottom:8}}>
            {conf.high>0&&<div style={{flex:conf.high,background:"#34d399",height:4,borderRadius:999,opacity:.8}}/>}
            {conf.medium>0&&<div style={{flex:conf.medium,background:"#f59e0b",height:4,borderRadius:999,opacity:.7}}/>}
            {conf.low>0&&<div style={{flex:conf.low,background:"#f87171",height:4,borderRadius:999,opacity:.6}}/>}
          </div>
          {edge&&<div style={{fontSize:9,color:"var(--text-muted)"}}>Top edge: <span style={{color:"#34d399",fontWeight:800}}>+{edge.edge}% {edge.label?.split(" ").slice(0,2).join(" ")}</span></div>}
        </>
      )}
    </div>
  );
}

function HeroSection({ fixtures, upcoming_loading, dash, dash_loading }) {
  const nav=useNavigate(); const heroRef=useRef(null);
  const [mouse, setMouse] = useState({x:.5,y:.5});
  const liveCount=fixtures.filter(f=>LIVE_SET.has(f.status)).length;
  const todayCount=fixtures.filter(f=>isToday(f.kickoff)).length;
  const heroStats=dash?.hero_stats;
  const avgConf=dash?.model_confidence?.avg_confidence??null;
  const topEdge=dash?.model_edges?.edges?.[0]??null;
  const onMove=useCallback(e=>{const r=heroRef.current?.getBoundingClientRect();if(!r)return;setMouse({x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height});},[]);
  return (
    <section className="hp6-hero" ref={heroRef} onMouseMove={onMove}>
      <TelemetryGrid/><Particles n={20}/>
      {[{cls:"hp4-hero-blob hp4-hero-blob--a",dx:.5,dy:.4},{cls:"hp4-hero-blob hp4-hero-blob--b",dx:-.3,dy:-.3},{cls:"hp4-hero-blob hp4-hero-blob--c",dx:.6,dy:.5}].map(({cls,dx,dy},i)=>(
        <div key={i} className={cls} style={{transform:`translate(calc(-50% + ${(mouse.x-.5)*40*dx}px),calc(-50% + ${(mouse.y-.5)*28*dy}px))`,transition:"transform 0.18s ease"}}/>
      ))}
      <div className="hp4-scanline"/>
      <div className="hp6-hero-layout">
        <div className="hp6-hero-left">
          <LiveMatchPanel fixtures={fixtures}/>
          <ModelConfPanel dash={dash} dash_loading={dash_loading}/>
        </div>
        <div className="hp6-hero-center">
          <div className="hp4-hero-badge" style={{animationDelay:"0.05s"}}>
            {liveCount>0?<><span className="hp4-live-dot"/><span className="hp4-hero-badge-text hp4-hero-badge-text--live hp4-mono">{liveCount} LIVE NOW</span></>
              :<span className="hp4-hero-badge-text">ELO · DIXON-COLES · REAL xG · POISSON</span>}
          </div>
          <h1 className="hp4-hero-title hp6-hero-title" style={{animationDelay:"0.1s"}}>
            Read The<br/><span className="hp4-gradient-text hp4-glow-pulse">Game.</span>
          </h1>
          <p className="hp6-hero-sub" style={{animationDelay:"0.18s"}}>Football intelligence rebuilt. Live scores, Poisson predictions, live xG tracking and the deepest FPL suite.</p>
          <div className="hp4-hero-ctas" style={{animationDelay:"0.26s"}}>
            <RippleBtn cls={liveCount>0?"hp4-btn--live":"hp4-btn--primary"} onClick={()=>nav("/live")}>
              {liveCount>0&&<span className="hp4-live-dot hp4-live-dot--sm"/>}{liveCount>0?"Watch Live":"Live Centre"}<span className="hp4-btn-sweep"/>
            </RippleBtn>
            <RippleBtn cls="hp4-btn--ghost" onClick={()=>nav("/predictions/premier-league")}>Predictions<span className="hp4-btn-sweep"/></RippleBtn>
            <RippleBtn cls="hp4-btn--fpl" onClick={()=>nav("/best-team")}>FPL<span className="hp4-btn-sweep"/></RippleBtn>
          </div>
          <div className="hp4-stats-strip hp6-stats-strip" style={{animationDelay:"0.35s"}}>
            {[
              {l:"Accuracy",v:heroStats?.verified_accuracy||avgConf,c:"#34d399",sx:"%",ld:dash_loading},
              {l:"Verified",v:heroStats?.fixtures_predicted,c:"#38bdf8",ld:dash_loading},
              {l:"Leagues",v:heroStats?.competitions_count??9,c:"#a78bfa",ld:dash_loading},
              {l:"Top Edge",v:topEdge?`+${topEdge.edge}%`:null,c:"#f59e0b",raw:true,ld:dash_loading},
            ].map(({l,v,c,sx="",ld,raw},i)=>(
              <div key={l} className="hp4-stat-cell" style={{"--cell-color":c}}>
                {i>0&&<div className="hp4-stat-div"/>}
                <div className="hp4-stat-inner">
                  <div className="hp4-stat-val">
                    {ld||v==null?<span className="hp5-skel" style={{width:28,height:22,borderRadius:4}}/>
                      :raw?<span className="hp4-mono">{v}</span>:<CountUp to={Number(v)||0} suffix={sx}/>}
                  </div>
                  <div className="hp4-stat-label">{l}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hp6-hero-right">
          <TopPredPanel dash={dash}/>
          <div className="hp6-hero-panel hp6-quicklinks">
            <div className="hp6-panel-label">QUICK ACCESS</div>
            {[
              {to:"/predictions/champions-league",l:"UCL Predictions",c:"#3b82f6"},
              {to:"/predictions/premier-league",l:"EPL Predictions",c:"#60a5fa"},
              {to:"/captaincy",l:"Captain Picks",c:"#34d399"},
              {to:"/player",l:"Player Browser",c:"#f59e0b"},
            ].map(({to,l,c})=>(
              <Link key={to} to={to} className="hp6-qlink" style={{"--ql-color":c}}>{l}<span className="hp6-qlink-arrow">→</span></Link>
            ))}
          </div>
        </div>
      </div>
      <div className="hp4-scroll-cue"><div className="hp4-scroll-line"/><div className="hp4-scroll-dot"/></div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// LIVE STRIP
// ═══════════════════════════════════════════════════════════════
function LivePulseStrip({ fixtures }) {
  const nav=useNavigate(); const live=fixtures.filter(f=>LIVE_SET.has(f.status));
  if(!live.length) return null;
  const chips=[...live,...live,...live];
  return (
    <div className="hp4-live-strip">
      <div className="hp4-strip-fade hp4-strip-fade--l"/>
      <div className="hp4-strip-track" style={{animationDuration:`${Math.max(live.length*6,18)}s`}}>
        {chips.map((f,i)=>(
          <div key={i} className="hp4-strip-chip" onClick={()=>nav(`/match/${f.fixture_id}`)}>
            <span className="hp4-live-dot hp4-live-dot--xs"/>
            {f.home_logo&&<img src={f.home_logo} className="hp4-chip-logo" onError={e=>e.currentTarget.style.display="none"}/>}
            <span className="hp4-chip-team">{f.home_team?.split(" ").slice(-1)[0]}</span>
            <span className="hp4-chip-score hp4-mono">{f.home_score??0}–{f.away_score??0}</span>
            {f.away_logo&&<img src={f.away_logo} className="hp4-chip-logo" onError={e=>e.currentTarget.style.display="none"}/>}
            <span className="hp4-chip-team">{f.away_team?.split(" ").slice(-1)[0]}</span>
            {f.minute&&<span className="hp4-chip-min hp4-mono">{f.minute}'</span>}
          </div>
        ))}
      </div>
      <div className="hp4-strip-fade hp4-strip-fade--r"/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3 — TOP PREDICTIONS
// ═══════════════════════════════════════════════════════════════
function PredCard({ p, index }) {
  const nav=useNavigate(); const [hov,setHov]=useState(false); const [ref,vis]=useReveal(0.05);
  const hp=p.homeProb||0,dp=p.draw||0,ap=p.awayProb||0;
  const favTeam=hp>ap?p.home:p.away,favProb=Math.max(hp,ap);
  const cc=(p.conf_pct||50)>=70?"#34d399":(p.conf_pct||50)>=55?"#f59e0b":"#f87171";
  return (
    <div ref={ref} style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(16px)",transition:`all 0.45s ease ${index*55}ms`,flexShrink:0,width:280}}>
      <div className={`hp6-pred-card ${hov?"hp6-pred-card--hov":""}`} style={{"--pc-color":p.col||"#38bdf8"}}
        onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={()=>p.fixture_id&&nav(`/match/${p.fixture_id}`)}>
        <div className="hp6-pc-head">
          <span className="hp6-pc-league">{p.league||"League"}</span>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:cc}}/><span className="hp4-mono" style={{fontSize:9,fontWeight:800,color:cc}}>{p.conf_pct||50}%</span>
          </div>
        </div>
        <div className="hp6-pc-teams">
          <div className="hp6-pc-team">
            {p.home_logo&&<img src={p.home_logo} width={24} height={24} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
            <span className="hp6-pc-tname">{p.home}</span>
          </div>
          <div className="hp6-pc-score-area"><div className="hp6-pc-predicted hp4-mono">{p.score||"1-0"}</div><div style={{fontSize:8,color:"var(--text-muted)"}}>predicted</div></div>
          <div className="hp6-pc-team" style={{flexDirection:"row-reverse"}}>
            {p.away_logo&&<img src={p.away_logo} width={24} height={24} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
            <span className="hp6-pc-tname" style={{textAlign:"right"}}>{p.away}</span>
          </div>
        </div>
        <div className="hp6-pc-probbar">
          <div style={{flex:hp,background:"#38bdf8",opacity:.85,transition:"flex .5s"}}/>
          <div style={{flex:dp,background:"var(--border-strong)"}}/>
          <div style={{flex:ap,background:"#34d399",opacity:.85,transition:"flex .5s"}}/>
        </div>
        <div className="hp6-pc-probs">
          <span className="hp4-mono" style={{color:"#38bdf8",fontWeight:900}}>{hp}%</span>
          <span style={{color:"var(--text-dim)"}}>Draw {dp}%</span>
          <span className="hp4-mono" style={{color:"#34d399",fontWeight:900}}>{ap}%</span>
        </div>
        <div className="hp6-pc-markets">
          <span>xG <span className="hp4-mono">{p.xg_home!=null?Number(p.xg_home).toFixed(1):"—"}–{p.xg_away!=null?Number(p.xg_away).toFixed(1):"—"}</span></span>
          {favProb>=60&&<span className="hp6-pc-badge" style={{background:`${p.col||"#38bdf8"}18`,color:p.col||"#38bdf8"}}>{favProb}% {favTeam?.split(" ").slice(-1)[0]}</span>}
        </div>
        <div className={`hp6-pc-expand ${hov?"hp6-pc-expand--vis":""}`}><span style={{fontSize:9,color:"var(--text-muted)"}}>Open match intelligence →</span></div>
      </div>
    </div>
  );
}

function TopPredictions({ dash, loading }) {
  const [ref,vis]=useReveal(0.04); const preds=dash?.top_predictions?.predictions??[];
  return (
    <section className="hp6-section">
      <div className="hp6-container">
        <div ref={ref} className="hp6-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div><div className="hp6-eyebrow">— Model Output</div><h2 className="hp6-section-title">Today's Top Predictions</h2></div>
          <Link to="/predictions/premier-league" className="hp6-see-all">All predictions →</Link>
        </div>
        <div className="hp6-hscroll">
          {loading?Array.from({length:4}).map((_,i)=>(
            <div key={i} style={{flexShrink:0,width:280,height:200,borderRadius:16,background:"var(--bg-card)",border:"1px solid var(--border)"}}><div style={{padding:16}}><Skel w="60%" h={9}/><div style={{marginTop:12}}/><Skel w="90%" h={12}/><div style={{marginTop:4}}/><Skel w="75%" h={9}/></div></div>
          )):preds.map((p,i)=><PredCard key={i} p={p} index={i}/>)}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4 — TITLE RACE + FORM TABLE
// ═══════════════════════════════════════════════════════════════
function TitleRace({ dash, loading }) {
  const [ref,vis]=useReveal(0.04);
  const race=dash?.title_race?.top4??[];
  const maxPts=race.length>0?Math.max(...race.map(t=>t.points||0)):1;
  const league=dash?.title_race?.league??"Premier League";
  const formTable=dash?.form_table?.table??[];
  return (
    <section className="hp6-section">
      <div className="hp6-container">
        <div ref={ref} className="hp6-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div><div className="hp6-eyebrow">— Standings</div><h2 className="hp6-section-title">Title Race · {league}</h2></div>
          <Link to="/league/epl" className="hp6-see-all">Full table →</Link>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div>
            <div className="hp6-sub-label">Top 4</div>
            {loading?Array.from({length:4}).map((_,i)=><div key={i} style={{height:52,borderRadius:12,background:"var(--bg-card)",border:"1px solid var(--border)",marginBottom:6}}/>)
              :race.map((t,i)=>{
                const pct=maxPts>0?(t.points/maxPts)*100:0;
                const trendColor=t.trend==="up"?"#34d399":t.trend==="down"?"#f87171":"#f59e0b";
                return (
                  <div key={t.team_id||i} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:12,background:"var(--bg-glass)",border:"1px solid var(--border)",marginBottom:6}}>
                    <div className="hp4-mono" style={{fontSize:10,fontWeight:900,color:"var(--text-dim)",minWidth:20}}>#{i+1}</div>
                    {t.logo&&<img src={t.logo} width={22} height={22} style={{objectFit:"contain",flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:800,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.team_name}</div>
                      <div style={{display:"flex",gap:3,marginTop:4}}>{(t.form_letters||[]).slice(-5).map((r,j)=><FormPip key={j} r={r}/>)}</div>
                    </div>
                    <div style={{width:80}}>
                      <div style={{height:5,borderRadius:999,background:"var(--border)",overflow:"hidden"}}>
                        <div style={{width:`${pct}%`,height:"100%",background:"linear-gradient(90deg,#38bdf8,#34d399)",borderRadius:999,transition:"width 1s ease"}}/>
                      </div>
                    </div>
                    <div className="hp4-mono" style={{fontSize:14,fontWeight:900,color:"var(--text)",minWidth:28,textAlign:"right"}}>{t.points}</div>
                    {t.gap_to_leader>0&&<div style={{fontSize:9,color:"var(--text-muted)",minWidth:28}}>-{t.gap_to_leader}</div>}
                    <div style={{width:8,height:8,borderRadius:"50%",background:trendColor,boxShadow:`0 0 6px ${trendColor}`,flexShrink:0}}/>
                  </div>
                );
              })}
          </div>
          <div>
            <div className="hp6-sub-label">Form Table (last 5)</div>
            {loading?Array.from({length:4}).map((_,i)=><div key={i} style={{height:40,borderRadius:10,background:"var(--bg-card)",border:"1px solid var(--border)",marginBottom:5}}/>)
              :formTable.slice(0,5).map((t,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:10,background:"var(--bg-glass)",border:"1px solid var(--border)",marginBottom:5}}>
                  <div className="hp4-mono" style={{fontSize:9,color:"var(--text-dim)",minWidth:16}}>{i+1}</div>
                  {t.logo&&<img src={t.logo} width={18} height={18} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
                  <div style={{flex:1,fontSize:11,fontWeight:700,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.team_name}</div>
                  <div style={{display:"flex",gap:2}}>{(t.form5||"").split("").map((r,j)=><FormPip key={j} r={r}/>)}</div>
                  <Badge label={`${t.form_pts||0}pts`} color="#34d399" size="sm"/>
                </div>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5 — EDGE BOARD
// ═══════════════════════════════════════════════════════════════
function EdgeBoard({ dash, loading }) {
  const [ref,vis]=useReveal(0.04);
  const edges=dash?.model_edges?.edges??[];
  const highXg=dash?.high_scoring_matches?.matches??[];
  return (
    <section className="hp6-section">
      <div className="hp6-container">
        <div ref={ref} className="hp6-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div><div className="hp6-eyebrow">— Value Signals</div><h2 className="hp6-section-title">Model Edge Board</h2></div>
        </div>
        <div className="hp6-edge-grid">
          <div>
            <div className="hp6-sub-label">Best Edges Today</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {loading?Array.from({length:3}).map((_,i)=><div key={i} className="hp6-edge-card"><Skel w="70%" h={10}/><div style={{marginTop:6}}/><Skel w="50%" h={16}/></div>)
                :edges.length>0?edges.map((e,i)=>(
                  <div key={i} className="hp6-edge-card">
                    <div className="hp6-edge-tag" style={{color:e.col||"#34d399"}}>MODEL EDGE</div>
                    <div className="hp6-edge-match">{e.home} vs {e.away}</div>
                    <div className="hp6-edge-val" style={{color:e.col||"#34d399"}}>+{e.edge}%</div>
                    <div className="hp6-edge-dir">{e.direction==="home"?e.home:e.away} favoured</div>
                    <div style={{height:3,borderRadius:999,background:"var(--border)",marginTop:8,overflow:"hidden"}}>
                      <div style={{width:`${Math.min(e.model_prob||e.edge*2,100)}%`,height:"100%",background:e.col||"#34d399",borderRadius:999}}/>
                    </div>
                  </div>
                )):<div className="hp6-empty-state">No edges detected today</div>}
            </div>
          </div>
          <div>
            <div className="hp6-sub-label">Highest xG Fixtures</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {loading?Array.from({length:3}).map((_,i)=><div key={i} className="hp6-xg-card"><Skel w="40%" h={24}/><div style={{marginTop:4}}/><Skel w="70%" h={10}/></div>)
                :highXg.length>0?highXg.slice(0,4).map((m,i)=>{
                  const nav=useNavigate();
                  const xgH=Number(m.xg_home)||0,xgA=Number(m.xg_away)||0,total=Number(m.total_xg)||(xgH+xgA);
                  return (
                    <div key={i} className="hp6-xg-card" onClick={()=>m.fixture_id&&nav(`/match/${m.fixture_id}`)}>
                      <div className="hp6-xg-tag">HIGH xG</div>
                      <div className="hp6-xg-total hp4-mono">{total.toFixed(1)}</div>
                      <div className="hp6-xg-match">{m.home?.split(" ").slice(-1)[0]} vs {m.away?.split(" ").slice(-1)[0]}</div>
                      <div style={{display:"flex",gap:3,marginTop:6}}>
                        <div style={{flex:xgH||1,height:4,borderRadius:999,background:"#38bdf8",opacity:.8}}/>
                        <div style={{flex:xgA||1,height:4,borderRadius:999,background:"#34d399",opacity:.8}}/>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:9,marginTop:3}}>
                        <span className="hp4-mono" style={{color:"#38bdf8"}}>{xgH.toFixed(1)}</span>
                        <span className="hp4-mono" style={{color:"#34d399"}}>{xgA.toFixed(1)}</span>
                      </div>
                    </div>
                  );
                }):<div className="hp6-empty-state">Loading fixtures…</div>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 6 — COMMAND GRID
// ═══════════════════════════════════════════════════════════════
function LiveRadarGfx({active}){return(<svg width="110" height="110" viewBox="0 0 110 110" fill="none">{[20,32,44].map((r,i)=><circle key={i} cx="55" cy="55" r={r} stroke="#ff4444" strokeWidth={i===2?1.5:.6} opacity={.12+i*.08}/>)}{Array.from({length:6}).map((_,j)=>{const a=(j/6)*Math.PI*2;return<line key={j} x1="55" y1="55" x2={55+Math.cos(a)*44} y2={55+Math.sin(a)*44} stroke="#ff4444" strokeWidth=".5" opacity=".15"/>;})}<line x1="55" y1="55" x2="99" y2="55" stroke="#ff4444" strokeWidth="1.5" opacity=".7" style={{transformOrigin:"55px 55px",animation:active?"hp6-sweep-arm 2s linear infinite":"none"}}/>{[{x:72,y:38},{x:44,y:68},{x:80,y:64}].map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={3} fill="#ff4444" opacity=".7" style={{animation:`snLivePulse ${1.2+i*.3}s ease-in-out infinite`}}/>)}</svg>);}
function ProbBarsGfx({active}){const bars=[62,45,78,55,88,40,66,72];return(<svg width="110" height="70" viewBox="0 0 110 70" fill="none">{bars.map((h,i)=><rect key={i} x={i*13+2} y={70-h*.65} width={10} height={h*.65} rx="3" fill="#38bdf8" opacity={i===4?.9:.3+i*.07} style={{transformOrigin:`${i*13+7}px 70px`,animation:active?`hp6-bar-grow .6s ease ${i*60}ms both`:undefined}}/>)}<path d="M2 52L15 34L28 44L41 18L54 30L67 24L80 38L93 28" stroke="#38bdf8" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity=".5"/></svg>);}
function PitchGfx({active}){return(<svg width="110" height="78" viewBox="0 0 110 78" fill="none"><rect x="1" y="1" width="108" height="76" rx="5" stroke="#a78bfa" strokeWidth="1.2" opacity=".5"/><line x1="55" y1="1" x2="55" y2="77" stroke="#a78bfa" strokeWidth=".8" opacity=".35"/><circle cx="55" cy="39" r="13" stroke="#a78bfa" strokeWidth=".8" opacity=".35"/><rect x="1" y="24" width="22" height="30" stroke="#a78bfa" strokeWidth=".8" opacity=".35"/><rect x="87" y="24" width="22" height="30" stroke="#a78bfa" strokeWidth=".8" opacity=".35"/>{[{x:18,y:39},{x:36,y:20},{x:36,y:39},{x:36,y:58},{x:55,y:28},{x:55,y:50},{x:74,y:20},{x:74,y:39},{x:74,y:58},{x:90,y:30},{x:90,y:48}].map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={active?4:3} fill="#a78bfa" opacity={active?.85:.4} style={{transition:"r .2s",animation:active?`snLivePulse ${1.5+i*.15}s ease-in-out infinite`:undefined}}/>)}</svg>);}
function FPLPitchGfx({active}){const pl=[{x:18,y:39,c:false},{x:34,y:16,c:false},{x:34,y:32,c:false},{x:34,y:46,c:false},{x:34,y:62,c:false},{x:52,y:22,c:false},{x:52,y:39,c:true},{x:52,y:56,c:false},{x:70,y:26,c:false},{x:70,y:52,c:false},{x:86,y:39,c:false}];return(<svg width="110" height="78" viewBox="0 0 110 78" fill="none"><rect x="1" y="1" width="108" height="76" rx="5" stroke="#34d399" strokeWidth="1" opacity=".35"/><line x1="55" y1="1" x2="55" y2="77" stroke="#34d399" strokeWidth=".6" opacity=".25"/><circle cx="55" cy="39" r="11" stroke="#34d399" strokeWidth=".6" opacity=".25"/>{pl.map((p,i)=><g key={i}><circle cx={p.x} cy={p.y} r={p.c?6:4} fill="#34d399" opacity={p.c?.9:.5} style={{animation:p.c&&active?"snLivePulse 1.5s ease-in-out infinite":undefined}}/>{p.c&&<text x={p.x} y={p.y+3.5} textAnchor="middle" fontSize="6" fontWeight="900" fill="#000" fontFamily="monospace">C</text>}</g>)}</svg>);}
function PlayersGfx({active}){return(<svg width="80" height="90" viewBox="0 0 80 90" fill="none"><circle cx="40" cy="22" r="14" stroke="#f59e0b" strokeWidth="1.5" opacity=".7" fill="#f59e0b" fillOpacity=".1"/><path d="M8 88c0-17.7 14.3-32 32-32s32 14.3 32 32" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" opacity=".7"/>{[{x:8,y:58,h:18,w:8},{x:20,y:52,h:24,w:8},{x:32,y:46,h:30,w:8}].map((b,i)=><rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="2" fill="#f59e0b" opacity={.25+i*.1} style={{animation:active?`hp6-bar-grow .6s ease ${i*100}ms both`:undefined}}/>)}</svg>);}
function NewsGfx({active}){return(<svg width="100" height="70" viewBox="0 0 100 70" fill="none"><rect x="1" y="1" width="98" height="68" rx="6" stroke="#f472b6" strokeWidth="1" opacity=".35"/><rect x="8" y="10" width="84" height="10" rx="3" fill="#f472b6" fillOpacity=".4" style={{animation:active?"hp6-shimmer-in .5s ease both":undefined}}/>{[{y:28,w:60},{y:38,w:76},{y:48,w:50},{y:58,w:68}].map((r,i)=><rect key={i} x="8" y={r.y} width={r.w} height="5" rx="2" fill="#f472b6" fillOpacity={.18-i*.03}/>)}</svg>);}
function GameGfx({active}){return(<svg width="100" height="68" viewBox="0 0 100 68" fill="none"><rect x="1" y="8" width="98" height="52" rx="12" stroke="#fb923c" strokeWidth="1.4" opacity=".6"/><circle cx="28" cy="34" r="12" stroke="#fb923c" strokeWidth="1" opacity=".5"/><line x1="22" y1="34" x2="34" y2="34" stroke="#fb923c" strokeWidth="1.6" strokeLinecap="round" opacity=".7"/><line x1="28" y1="28" x2="28" y2="40" stroke="#fb923c" strokeWidth="1.6" strokeLinecap="round" opacity=".7"/>{[{x:68,y:26},{x:80,y:34},{x:68,y:42},{x:56,y:34}].map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="4" fill="#fb923c" opacity={active?.7:.35} style={{animation:active?`snLivePulse ${1+i*.25}s ease-in-out infinite`:undefined}}/>)}</svg>);}

const TOOLS=[
  {to:"/live",label:"Live Centre",color:"#ff4444",span:2,tall:true,Gfx:LiveRadarGfx,sub:"Real-time scores, live events and minute-by-minute match tracking",dataKey:"live",tag:"LIVE DATA"},
  {to:"/predictions/premier-league",label:"Predictions",color:"#38bdf8",span:1,tall:false,Gfx:ProbBarsGfx,sub:"Dixon-Coles Poisson model with ELO ratings",dataKey:"preds",tag:"MODEL OUTPUT"},
  {to:"/match/0",label:"Match Hub",color:"#a78bfa",span:1,tall:false,Gfx:PitchGfx,sub:"Expected lineups, H2H, injuries, xG and live tactics",dataKey:null,tag:"INTELLIGENCE"},
  {to:"/best-team",label:"FPL Best XI",color:"#34d399",span:1,tall:true,Gfx:FPLPitchGfx,sub:"Optimal FPL starting XI with captain signal",dataKey:"fpl",tag:"FPL"},
  {to:"/squad-builder",label:"Squad Builder",color:"#34d399",span:1,tall:false,Gfx:null,sub:"Build your 15-man FPL squad under budget",dataKey:null,tag:"FPL"},
  {to:"/player",label:"Players",color:"#f59e0b",span:1,tall:false,Gfx:PlayersGfx,sub:"500+ player profiles with xG, FPL stats and form",dataKey:null,tag:"DATA"},
  {to:"/news",label:"News",color:"#f472b6",span:1,tall:false,Gfx:NewsGfx,sub:"Transfers, injuries and intelligence updates",dataKey:null,tag:"NEWS"},
  {to:"/games",label:"Mini Games",color:"#fb923c",span:1,tall:false,Gfx:GameGfx,sub:"Score predictor, quizzes and football challenges",dataKey:null,tag:"GAMES"},
];

function ToolDataRow({dataKey,fixtures,dash,loading}){
  if(!dataKey)return null;
  if(dataKey==="live"){const live=fixtures.filter(f=>LIVE_SET.has(f.status));if(loading)return<div className="hp6-td"><Skel w="70%" h={9}/></div>;return<div className="hp6-td"><div className="hp6-td-val" style={{color:"#ff4444"}}>{live.length>0?`${live.length} live now`:`${fixtures.filter(f=>isToday(f.kickoff)).length} today`}</div>{live[0]&&<div className="hp6-td-sub hp4-mono">{live[0].home_team?.split(" ").slice(-1)[0]} {live[0].home_score??0}–{live[0].away_score??0} {live[0].away_team?.split(" ").slice(-1)[0]}</div>}</div>;}
  if(dataKey==="preds"){const conf=dash?.model_confidence,top=dash?.top_predictions?.predictions?.[0];if(loading||!dash)return<div className="hp6-td"><Skel w="60%" h={9}/></div>;return<div className="hp6-td">{conf&&<div className="hp6-td-val">{conf.avg_confidence}% conf · {conf.total} fixtures</div>}{top&&<div className="hp6-td-sub">{Math.max(top.homeProb||0,top.awayProb||0)}% {(top.homeProb>top.awayProb?top.home:top.away)?.split(" ").slice(-1)[0]}</div>}</div>;}
  if(dataKey==="fpl"){const capt=dash?.differential_captains?.captains?.[0];if(loading||!dash)return<div className="hp6-td"><Skel w="55%" h={9}/></div>;return<div className="hp6-td">{capt&&<><div className="hp6-td-val">Captain: {capt.name||capt.web_name}</div><div className="hp6-td-sub hp4-mono">{capt.ep_next!=null?Number(capt.ep_next).toFixed(1):"?"} EP</div></>}</div>;}
  return null;
}

function LargeToolCard({tool,index,fixtures,dash,loading}){
  const{ref:tref,tf,gl,onMove,onLeave}=useTilt(5);const[hov,setHov]=useState(false);const[rref,vis]=useReveal(0.04);const{Gfx}=tool;
  return(
    <div ref={rref} className="hp6-tool-wrap" style={{gridColumn:`span ${tool.span}`,gridRow:tool.tall?"span 2":"span 1",opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(20px)",transition:`opacity .55s ease ${index*55}ms,transform .55s ease ${index*55}ms`}}>
      <div ref={tref} className={`hp6-tool-card ${hov?"hp6-tool-card--hov":""}`} style={{"--tc-color":tool.color,transform:tf,transition:"transform .18s ease,box-shadow .22s,border-color .22s"}} onMouseMove={onMove} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>{onLeave();setHov(false);}}>
        <div className="hp6-tool-glow" style={{background:`radial-gradient(circle at ${gl.x}% ${gl.y}%,${tool.color}22 0%,transparent 65%)`}}/>
        <div className={`hp4-card-shimmer ${hov?"hp4-card-shimmer--active":""}`}/><div className="hp6-tool-topbar"/>
        <Link to={tool.to} className="hp6-tool-link">
          <div className="hp6-tool-header"><div className="hp6-tool-tag" style={{color:tool.color}}>{tool.tag}</div>{hov&&Gfx&&<div className="hp6-tool-gfx-top"><Gfx active={hov}/></div>}</div>
          <div className="hp6-tool-title">{tool.label}</div><div className="hp6-tool-sub">{tool.sub}</div>
          <ToolDataRow dataKey={tool.dataKey} fixtures={fixtures} dash={dash} loading={loading}/>
          {Gfx&&<div className="hp6-tool-gfx-bg"><Gfx active={hov}/></div>}
          <div className="hp6-tool-cta">Open <span style={{transition:"transform .18s",transform:hov?"translateX(4px)":"translateX(0)",display:"inline-block"}}>→</span></div>
        </Link>
      </div>
    </div>
  );
}

function CommandGrid({fixtures,dash,loading}){
  const[ref,vis]=useReveal(0.04);
  return(
    <section className="hp6-section"><div className="hp6-container">
      <div ref={ref} className="hp6-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
        <div><div className="hp6-eyebrow">— Platform</div><h2 className="hp6-section-title">Intelligence Command Grid</h2></div>
        <span style={{fontSize:10,color:"var(--text-muted)"}}>8 tools</span>
      </div>
      <div className="hp6-bento">{TOOLS.map((t,i)=><LargeToolCard key={t.to} tool={t} index={i} fixtures={fixtures} dash={dash} loading={loading}/>)}</div>
    </div></section>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 7 — COMPETITION HUB (bigger cards, theme-aware badges)
// ═══════════════════════════════════════════════════════════════
const COMPS=[
  {label:"Premier League",slug:"premier-league",code:"epl",leagueId:39,color:"#60a5fa",logo:"https://media.api-sports.io/football/leagues/39.png",teams:20,matches:"380/season",features:["Predictions","Standings","Season Sim","xG Leaders"],desc:"England's top flight with full Dixon-Coles prediction coverage."},
  {label:"La Liga",slug:"la-liga",code:"laliga",leagueId:140,color:"#fb923c",logo:"https://media.api-sports.io/football/leagues/140.png",teams:20,matches:"380/season",features:["Predictions","Standings","Season Sim"],desc:"Spain's premier division — tactical analysis and Elo power rankings."},
  {label:"Bundesliga",slug:"bundesliga",code:"bundesliga",leagueId:78,color:"#f59e0b",logo:"https://media.api-sports.io/football/leagues/78.png",teams:18,matches:"306/season",features:["Predictions","Standings","Season Sim"],desc:"Germany's top tier — high-pressing data and form-weighted predictions."},
  {label:"Serie A",slug:"serie-a",code:"seriea",leagueId:135,color:"#34d399",logo:"https://media.api-sports.io/football/leagues/135.png",teams:20,matches:"380/season",features:["Predictions","Standings"],desc:"Italian football with defensive analytics and match intelligence."},
  {label:"Ligue 1",slug:"ligue-1",code:"ligue1",leagueId:61,color:"#a78bfa",logo:"https://media.api-sports.io/football/leagues/61.png",teams:18,matches:"306/season",features:["Predictions","Standings"],desc:"France's top league — full Poisson model predictions."},
  {label:"Champions League",slug:"champions-league",code:"ucl",leagueId:2,color:"#3b82f6",logo:"https://media.api-sports.io/football/leagues/2.png",teams:36,matches:"League phase + KO",features:["Predictions","Bracket"],desc:"Europe's elite competition — full knockout bracket predictions."},
  {label:"Europa League",slug:"europa-league",code:"uel",leagueId:3,color:"#f97316",logo:"https://media.api-sports.io/football/leagues/3.png",teams:36,matches:"League phase + KO",features:["Predictions","Bracket"],desc:"UEFA's second-tier European competition with full model coverage."},
  {label:"Conference League",slug:"conference-league",code:"uecl",leagueId:848,color:"#22c55e",logo:"https://media.api-sports.io/football/leagues/848.png",teams:36,matches:"League phase + KO",features:["Predictions","Bracket"],desc:"UEFA's third-tier tournament — predictions across all stages."},
  {label:"FA Cup",slug:"fa-cup",code:"facup",leagueId:45,color:"#ef4444",logo:"https://media.api-sports.io/football/leagues/45.png",teams:736,matches:"Knockout",features:["Predictions","Bracket"],desc:"The world's oldest domestic cup competition."},
];

function CompCard({comp,index,fixtures}){
  const[hov,setHov]=useState(false);const[ref,vis]=useReveal(0.05);
  const isDark=document.documentElement.getAttribute("data-theme")!=="light";
  const liveCount=fixtures.filter(f=>LIVE_SET.has(f.status)&&f.league_id===comp.leagueId).length;
  return(
    <div ref={ref} style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(16px)",transition:`all .45s ease ${index*35}ms`}}>
      <Link to={`/predictions/${comp.slug}`} style={{textDecoration:"none"}}>
        <div className={`hp6-comp-card-xl ${hov?"hp6-comp-card-xl--hov":""}`} style={{"--cc-color":comp.color}} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
          {/* Top accent bar */}
          <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:comp.color,borderRadius:"16px 16px 0 0",opacity:hov?1:0,transition:"opacity .2s"}}/>
          {/* Header */}
          <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:14}}>
            <div style={{width:52,height:52,borderRadius:14,flexShrink:0,background:isDark?`${comp.color}14`:`${comp.color}10`,border:`1px solid ${isDark?comp.color+"28":comp.color+"20"}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"box-shadow .2s",boxShadow:hov?`0 0 18px ${comp.color}35`:"none"}}>
              <img src={comp.logo} width={32} height={32} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:900,color:"var(--text)",letterSpacing:"-0.02em",marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{comp.label}</div>
              <div style={{fontSize:10,color:"var(--text-muted)"}}>{comp.teams} clubs · {comp.matches}</div>
            </div>
            {liveCount>0&&(
              <div style={{display:"flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:999,background:"rgba(255,59,48,0.10)",border:"1px solid rgba(255,59,48,0.20)",flexShrink:0}}>
                <span className="hp4-live-dot hp4-live-dot--xs" style={{"--dot-color":"#ff453a"}}/>
                <span style={{fontSize:8,fontWeight:900,color:"#ff453a",fontFamily:"var(--font-mono)"}}>{liveCount}</span>
              </div>
            )}
          </div>
          {/* Description */}
          <div style={{fontSize:11,color:"var(--text-muted)",lineHeight:1.55,marginBottom:14}}>{comp.desc}</div>
          {/* Feature badges — fully theme-aware via Badge component */}
          <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:14}}>
            {comp.features.map(f=><Badge key={f} label={f} color={comp.color} size="sm"/>)}
          </div>
          {/* CTA */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:10,borderTop:"1px solid var(--border)",fontSize:11,fontWeight:700,color:hov?comp.color:"var(--text-dim)",transition:"color .15s"}}>
            <span>Explore predictions</span>
            <span style={{transition:"transform .15s",transform:hov?"translateX(4px)":"translateX(0)"}}>→</span>
          </div>
        </div>
      </Link>
    </div>
  );
}

function CompetitionHub({fixtures}){
  const[ref,vis]=useReveal(0.04);
  return(
    <section className="hp6-section"><div className="hp6-container">
      <div ref={ref} className="hp6-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
        <div>
          <div className="hp6-eyebrow">— Coverage</div>
          <h2 className="hp6-section-title">9 Competitions. Full Intelligence.</h2>
          <p style={{fontSize:12,color:"var(--text-muted)",marginTop:6,maxWidth:480}}>Poisson model predictions, standings, season simulation and xG analysis across Europe's top competitions.</p>
        </div>
      </div>
      <div className="hp6-comp-grid-xl">
        {COMPS.map((c,i)=><CompCard key={c.slug} comp={c} index={i} fixtures={fixtures}/>)}
      </div>
    </div></section>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 8 — FPL HUB
// ═══════════════════════════════════════════════════════════════
const FPL_TOOLS=[
  {to:"/best-team",label:"Best XI",stat:"Optimal 11",detail:"Model-driven optimal starting 11",color:"#34d399"},
  {to:"/squad-builder",label:"Squad Builder",stat:"15-man squad",detail:"Build within £100m budget",color:"#38bdf8"},
  {to:"/gameweek-insights",label:"GW Insights",stat:"This gameweek",detail:"Fixture analysis & GW picks",color:"#f59e0b"},
  {to:"/fpl-table",label:"FPL Table",stat:"Standings",detail:"Live leaderboard & rank",color:"#a78bfa"},
  {to:"/captaincy",label:"Captaincy",stat:"Captain picks",detail:"EP analysis & ownership",color:"#fb923c"},
  {to:"/fixture-difficulty",label:"FDR Heatmap",stat:"8 GWs",detail:"Fixture difficulty ratings",color:"#67e8f9"},
  {to:"/transfer-planner",label:"Transfer Planner",stat:"Plan moves",detail:"Model transfer recommendations",color:"#f87171"},
  {to:"/differentials",label:"Differentials",stat:"Low-owned",detail:"High-ceiling, low-ownership picks",color:"#f472b6"},
];

function FPLHub({dash}){
  const[ref,vis]=useReveal(0.04);
  const capts=dash?.differential_captains?.captains?.slice(0,4)??[];
  const valuePls=dash?.value_players?.players?.slice(0,3)??[];
  return(
    <section className="hp6-section"><div className="hp6-container">
      <div ref={ref} className="hp6-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
        <div><div className="hp6-eyebrow">— Fantasy Premier League</div><h2 className="hp6-section-title">FPL Intelligence Hub</h2></div>
        <div style={{display:"flex",alignItems:"center",gap:7,padding:"5px 14px",borderRadius:999,background:"var(--green-soft)",border:"1px solid rgba(52,211,153,.2)"}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:"#34d399",boxShadow:"0 0 8px #34d399",animation:"snLivePulse 2s ease-in-out infinite"}}/>
          <span style={{fontSize:9,fontWeight:900,color:"#34d399",letterSpacing:"0.1em",fontFamily:"var(--font-mono)"}}>8 TOOLS ACTIVE</span>
        </div>
      </div>
      <div className="hp6-fpl-layout">
        <div className="hp6-fpl-left">
          <div className="hp6-sub-label">Captain Picks · Differentials</div>
          {capts.length>0?capts.map((c,i)=>(
            <div key={i} className="hp6-capt-row">
              <div className="hp6-cr-rank hp4-mono">{String(i+1).padStart(2,"0")}</div>
              {c.photo&&<img src={c.photo} width={28} height={28} style={{borderRadius:"50%",objectFit:"cover",flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>}
              <div style={{flex:1,minWidth:0}}>
                <div className="hp6-cr-name">{c.name||c.web_name}</div>
                <div className="hp6-cr-meta">{c.team_short||c.team||""} · {c.ownership!=null?Number(c.ownership).toFixed(1):"?"}% owned</div>
              </div>
              <Badge label={`${Number(c.form||0).toFixed(1)} form`} color="#f59e0b" size="sm"/>
              <div className="hp6-cr-ep hp4-mono">{c.ep_next!=null?Number(c.ep_next).toFixed(1):"??"}</div>
              <div className="hp6-cr-ep-label">EP</div>
            </div>
          )):Array.from({length:4}).map((_,i)=><div key={i} className="hp6-capt-row"><Skel w="70%" h={11}/></div>)}
          {valuePls.length>0&&(
            <div style={{marginTop:14}}>
              <div className="hp6-sub-label">Value Picks (pts/£m)</div>
              {valuePls.map((p,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:10,background:"var(--bg-glass)",border:"1px solid var(--border)",marginBottom:5}}>
                  <div className="hp4-mono" style={{fontSize:9,color:"var(--text-dim)",minWidth:16}}>{i+1}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,fontWeight:800,color:"var(--text)"}}>{p.name}</div>
                    <div style={{fontSize:9,color:"var(--text-muted)"}}>{p.team_short} · £{p.cost}m · {p.position}</div>
                  </div>
                  <Badge label={`${p.value_score}v`} color="#38bdf8" size="sm"/>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:12,fontWeight:900,color:"var(--green)"}}>{p.total_points}</div>
                  <div style={{fontSize:8,color:"var(--text-dim)"}}>pts</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="hp6-fpl-center">
          <div className="hp4-fpl-orbit">
            <div className="hp4-fpl-orbit-ring"/>
            <div className="hp4-fpl-orbit-ring hp4-fpl-orbit-ring--2"/>
            <div className="hp4-fpl-orbit-core"/>
          </div>
          <div className="hp6-fpl-center-text">
            <div className="hp6-fpl-center-num hp4-mono">{FPL_TOOLS.length}</div>
            <div style={{fontSize:9,fontWeight:900,letterSpacing:"0.1em",color:"var(--text-muted)",textTransform:"uppercase"}}>FPL Tools</div>
          </div>
        </div>
        <div className="hp6-fpl-right">
          <div className="hp6-sub-label">All Tools</div>
          {FPL_TOOLS.map((t,i)=>{
            const[hov,setHov]=useState(false);const[ref2,vis2]=useReveal(0.04);
            const capt=t.to==="/captaincy"&&dash?.differential_captains?.captains?.[0];
            const realStat=capt?`${capt.name||capt.web_name} ${capt.ep_next!=null?Number(capt.ep_next).toFixed(1):"??"}EP`:t.stat;
            return(
              <div key={t.to} ref={ref2} style={{opacity:vis2?1:0,transform:vis2?"translateX(0)":"translateX(14px)",transition:`all .4s ease ${i*40}ms`}}>
                <Link to={t.to} style={{textDecoration:"none"}}>
                  <div className={`hp4-fpl-row ${hov?"hp4-fpl-row--hov":""}`} style={{"--fpl-color":t.color}} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
                    <div className="hp4-fpl-indicator"/><div className="hp4-fpl-idx hp4-mono">{String(i+1).padStart(2,"0")}</div><div className="hp4-fpl-dot"/>
                    <div className="hp4-fpl-content"><span className="hp4-fpl-label">{t.label}</span><span className={`hp4-fpl-detail ${hov?"hp4-fpl-detail--vis":""}`}>{t.detail}</span></div>
                    <span className="hp4-fpl-stat">{realStat}</span><div className={`hp4-fpl-arrow ${hov?"hp4-fpl-arrow--vis":""}`}>→</div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div></section>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 9 — TRENDING PLAYERS
// ═══════════════════════════════════════════════════════════════
function TrendingPlayers({dash,loading}){
  const[ref,vis]=useReveal(0.04);
  const nav=useNavigate();
  const xgLeaders=dash?.xg_leaders?.leaders?.slice(0,6)??[];
  const items=dash?.trending_players?.items??[];
  const showable=xgLeaders.length>0?xgLeaders:items.slice(0,6);
  return(
    <section className="hp6-section"><div className="hp6-container">
      <div ref={ref} className="hp6-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
        <div><div className="hp6-eyebrow">— Players</div><h2 className="hp6-section-title">xG Leaders & Form</h2></div>
        <Link to="/player" className="hp6-see-all">Browse all →</Link>
      </div>
      <div className="hp6-player-grid">
        {loading?Array.from({length:6}).map((_,i)=><div key={i} className="hp6-player-card"><div style={{padding:14}}><Skel w="60%" h={11}/><div style={{marginTop:8}}/><Skel w="80%" h={9}/></div></div>)
          :showable.length>0?showable.map((p,i)=>{
            const[hov,setHov]=useState(false);
            return(
              <div key={i} className={`hp6-player-card ${hov?"hp6-player-card--hov":""}`} onClick={()=>nav(`/player?search=${encodeURIComponent(p.name||"")}`)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
                <div className="hp6-pc2-top">
                  {p.photo&&<img src={p.photo} width={36} height={36} style={{borderRadius:"50%",objectFit:"cover",flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>}
                  <div style={{flex:1,minWidth:0}}><div className="hp6-pc2-name">{p.name||"Player"}</div><div className="hp6-pc2-team">{p.team||p.team_name||""}</div></div>
                  {p.per90!=null&&<div className="hp6-pc2-stat hp4-mono" style={{color:"#38bdf8"}}>{Number(p.per90).toFixed(2)}<div style={{fontSize:7,color:"var(--text-dim)"}}>G+A/90</div></div>}
                </div>
                {(p.goals!=null||p.g_plus_a!=null)&&(
                  <div style={{display:"flex",gap:12,marginTop:8,fontSize:10,color:"var(--text-muted)"}}>
                    {p.goals!=null&&<span><span className="hp4-mono" style={{color:"var(--text)",fontWeight:900}}>{p.goals}</span> G</span>}
                    {p.assists!=null&&<span><span className="hp4-mono" style={{color:"var(--text)",fontWeight:900}}>{p.assists}</span> A</span>}
                    {p.g_plus_a!=null&&<span><span className="hp4-mono" style={{color:"#f59e0b",fontWeight:900}}>{p.g_plus_a}</span> G+A</span>}
                  </div>
                )}
              </div>
            );
          }):<div className="hp6-empty-state" style={{gridColumn:"1/-1"}}>Loading player data…</div>}
      </div>
    </div></section>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 10 — TRANSFER BRIEF + ANALYTICS TERM + DEFENCE TABLE
// ═══════════════════════════════════════════════════════════════
function TransferBrief({dash,loading}){
  const[ref,vis]=useReveal(0.04);
  const brief=dash?.transfer_brief,term=dash?.analytics_term,defTable=dash?.defense_table?.table??[];
  return(
    <section className="hp6-section"><div className="hp6-container">
      <div ref={ref} className="hp6-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
        <div><div className="hp6-eyebrow">— Intelligence</div><h2 className="hp6-section-title">Transfer Brief & Analytics</h2></div>
        <Link to="/news" className="hp6-see-all">All news →</Link>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
        {/* Transfer brief */}
        <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:16,padding:"18px 18px 16px",display:"flex",flexDirection:"column",gap:10}}>
          <div style={{fontSize:8,fontWeight:900,letterSpacing:"0.18em",textTransform:"uppercase",color:"var(--text-muted)"}}>TRANSFER BRIEF</div>
          {loading||!brief?<><Skel w="80%" h={10}/><Skel w="60%" h={9}/><Skel w="90%" h={9}/></>:(
            <>
              <div style={{fontSize:12,fontWeight:700,color:"var(--text)",lineHeight:1.5}}>{brief.summary||"No major transfer news today."}</div>
              {(brief.key_transfers||[]).slice(0,3).map((t,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,fontSize:10,color:"var(--text-muted)",borderTop:"1px solid var(--border)",paddingTop:7}}>
                  <span style={{width:5,height:5,borderRadius:"50%",background:"#38bdf8",flexShrink:0}}/>
                  <span style={{flex:1}}>{typeof t==="string"?t:t.text||t.headline||""}</span>
                </div>
              ))}
            </>
          )}
        </div>
        {/* Analytics term */}
        <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:16,padding:"18px 18px 16px"}}>
          <div style={{fontSize:8,fontWeight:900,letterSpacing:"0.18em",textTransform:"uppercase",color:"var(--text-muted)",marginBottom:10}}>TODAY'S TERM</div>
          {loading||!term?<><Skel w="50%" h={22}/><div style={{marginTop:8}}/><Skel w="90%" h={9}/></>:(
            <>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <span style={{fontSize:22}}>{term.icon||"📊"}</span>
                <div><div style={{fontSize:16,fontWeight:900,color:term.col||"#38bdf8",fontFamily:"var(--font-mono)"}}>{term.short||term.term}</div><div style={{fontSize:9,color:"var(--text-muted)"}}>{term.value_label}</div></div>
              </div>
              <div style={{fontSize:11,color:"var(--text-muted)",lineHeight:1.6}}>{term.definition}</div>
              {term.example&&<div style={{marginTop:8,padding:"5px 10px",borderRadius:8,background:"var(--bg-glass)",border:"1px solid var(--border)",fontSize:10,fontFamily:"var(--font-mono)",color:term.col||"#38bdf8"}}>{term.example}</div>}
              <div style={{marginTop:10,display:"flex",gap:5,flexWrap:"wrap"}}>
                {["Dixon-Coles","ELO","xG","Brier","Monte Carlo"].map(t=><Badge key={t} label={t} color={term.col||"#38bdf8"} size="sm"/>)}
              </div>
            </>
          )}
        </div>
        {/* Defence table */}
        <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:16,padding:"18px 18px 16px"}}>
          <div style={{fontSize:8,fontWeight:900,letterSpacing:"0.18em",textTransform:"uppercase",color:"var(--text-muted)",marginBottom:10}}>BEST DEFENCES · EPL</div>
          {loading||defTable.length===0?Array.from({length:5}).map((_,i)=><div key={i} style={{height:28,borderRadius:6,background:"var(--bg-glass)",marginBottom:5}}/>)
            :defTable.slice(0,5).map((t,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid var(--border-soft)"}}>
                <span className="hp4-mono" style={{fontSize:9,color:"var(--text-dim)",minWidth:16}}>{i+1}</span>
                {t.logo&&<img src={t.logo} width={16} height={16} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
                <span style={{flex:1,fontSize:11,fontWeight:700,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.team_name}</span>
                <span className="hp4-mono" style={{fontSize:10,fontWeight:900,color:"#34d399"}}>{t.ga_pg}</span>
                <span style={{fontSize:8,color:"var(--text-muted)"}}>GA/g</span>
              </div>
            ))}
        </div>
      </div>
    </div></section>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 11 — POWER RANKINGS (NEW)
// ═══════════════════════════════════════════════════════════════
function PowerRankings({dash,loading}){
  const[ref,vis]=useReveal(0.04);
  const rankings=dash?.power_rankings?.rankings??[];
  const league=dash?.power_rankings?.league??"Premier League";
  return(
    <section className="hp6-section"><div className="hp6-container">
      <div ref={ref} className="hp6-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
        <div><div className="hp6-eyebrow">— Composite Model</div><h2 className="hp6-section-title">Power Rankings · {league}</h2></div>
        <span style={{fontSize:10,color:"var(--text-muted)"}}>Elo · Form · Goal Diff · PPG</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {loading?Array.from({length:8}).map((_,i)=><div key={i} style={{height:46,borderRadius:12,background:"var(--bg-card)",border:"1px solid var(--border)"}}/>)
          :rankings.map((t,i)=>{
            const barW=Math.round(t.power_pct||0);
            const delta=t.rank_delta||0;
            const dc=delta>0?"#34d399":delta<0?"#f87171":"var(--text-dim)";
            const ds=delta>0?`+${delta}`:delta<0?`${delta}`:"=";
            return(
              <div key={t.team_id||i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:12,background:"var(--bg-card)",border:"1px solid var(--border)",transition:"border-color .16s"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(56,189,248,0.25)"}
                onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
                <div className="hp4-mono" style={{fontSize:10,fontWeight:900,color:"#38bdf8",minWidth:20}}>#{i+1}</div>
                {t.logo&&<img src={t.logo} width={20} height={20} style={{objectFit:"contain",flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11,fontWeight:800,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.team_name}</div>
                  <div style={{marginTop:3,height:4,borderRadius:999,background:"var(--border)",overflow:"hidden",maxWidth:160}}>
                    <div style={{width:`${barW}%`,height:"100%",background:"linear-gradient(90deg,#38bdf8,#a78bfa)",borderRadius:999,transition:"width 1s ease"}}/>
                  </div>
                </div>
                <div style={{display:"flex",gap:2}}>{(t.form_letters||[]).slice(-5).map((r,j)=><FormPip key={j} r={r}/>)}</div>
                <div className="hp4-mono" style={{fontSize:11,fontWeight:900,color:"var(--text)",minWidth:30,textAlign:"right"}}>{t.power_pct}%</div>
                <div style={{fontSize:10,fontWeight:800,color:dc,minWidth:20,textAlign:"right"}}>{ds}</div>
              </div>
            );
          })}
      </div>
    </div></section>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 12 — MODEL PERFORMANCE
// ═══════════════════════════════════════════════════════════════
function AccuracyRing({pct,color,size=80}){
  const r=(size/2)-6,circ=2*Math.PI*r,offset=circ-(pct/100)*circ;
  return(
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} stroke="var(--border)" strokeWidth="5" fill="none"/>
      <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth="5" fill="none" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{transform:"rotate(-90deg)",transformOrigin:"50% 50%",transition:"stroke-dashoffset 1s ease"}}/>
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" style={{fontFamily:"var(--font-mono)",fontSize:size/5,fontWeight:900,fill:color}}>{pct}%</text>
    </svg>
  );
}

function ModelPerformanceSection({dash,loading}){
  const[ref,vis]=useReveal(0.04);
  const perf=dash?.performance_summary,acct=dash?.accountability_summary;
  const overallAcc=perf?.overall_accuracy??acct?.hit_rate??null;
  const last30Acc=perf?.last_30_accuracy??null;
  const highConfAcc=perf?.confidence_bands?.find(b=>b.bracket?.startsWith("High"))?.accuracy??acct?.high_confidence_hit_rate??null;
  const verifiedCount=perf?.verified_count??acct?.verified_count??0;
  const pendingCount=perf?.pending_count??acct?.pending_count??0;
  const recentPreds=acct?.recent_verified??[];
  const rollingAcc=perf?.rolling_accuracy??[];
  const confBands=perf?.confidence_bands??[];
  const avgConf=perf?.average_confidence??null;
  const isInsufficient=perf?.insufficient&&acct?.insufficient;
  return(
    <section className="hp6-section"><div className="hp6-container">
      <div ref={ref} className="hp6-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
        <div><div className="hp6-eyebrow">— Verified Results Only</div><h2 className="hp6-section-title">Model Performance & Accountability</h2></div>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 14px",borderRadius:999,background:"var(--green-soft)",border:"1px solid rgba(52,211,153,0.2)"}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:"#34d399",boxShadow:"0 0 8px #34d399",animation:"snLivePulse 2s ease-in-out infinite"}}/>
          <span style={{fontSize:9,fontWeight:900,color:"#34d399",letterSpacing:"0.1em",fontFamily:"var(--font-mono)"}}>{verifiedCount} VERIFIED · {pendingCount} PENDING</span>
        </div>
      </div>
      {loading?(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>{[0,1,2].map(i=><div key={i} style={{height:140,borderRadius:16,background:"var(--bg-card)",border:"1px solid var(--border)"}}/>)}</div>)
        :isInsufficient?(<div style={{padding:"32px 24px",borderRadius:16,background:"var(--bg-card)",border:"1px solid var(--border)",textAlign:"center"}}><div style={{fontSize:13,color:"var(--text-muted)",marginBottom:6}}>No verified predictions yet.</div><div style={{fontSize:10,color:"var(--text-dim)"}}>Results are checked automatically after matches finish.</div></div>)
        :(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
              {[{label:"Overall",val:overallAcc,color:"#34d399",sub:`${verifiedCount} verified`},{label:"Last 30",val:last30Acc,color:"#38bdf8",sub:"Trending"},{label:"High Conf",val:highConfAcc,color:"#f59e0b",sub:"≥70% picks"}].map(({label,val,color,sub})=>(
                <div key={label} style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:16,padding:"16px 12px",display:"flex",flexDirection:"column",alignItems:"center",gap:8,textAlign:"center"}}>
                  {val!=null?<AccuracyRing pct={Math.round(val)} color={color}/>:<div style={{width:80,height:80,borderRadius:"50%",border:"5px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"var(--text-dim)"}}>—</div>}
                  <div style={{fontSize:10,fontWeight:800,color:"var(--text)"}}>{label}</div><div style={{fontSize:8,color:"var(--text-muted)"}}>{sub}</div>
                </div>
              ))}
            </div>
            {rollingAcc.length>0&&(
              <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:14,padding:"14px 16px"}}>
                <div className="hp6-sub-label">Rolling Accuracy Windows</div>
                {rollingAcc.map((r,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                    <div style={{fontSize:10,fontWeight:700,color:"var(--text-secondary)",minWidth:55}}>{r.window}</div>
                    <div style={{flex:1,height:6,borderRadius:999,background:"var(--border)",overflow:"hidden"}}><div style={{width:`${r.accuracy}%`,height:"100%",background:"linear-gradient(90deg,#38bdf8,#34d399)",borderRadius:999,transition:"width 1s ease"}}/></div>
                    <div style={{fontFamily:"var(--font-mono)",fontSize:11,fontWeight:900,color:"#34d399",minWidth:35,textAlign:"right"}}>{r.accuracy}%</div>
                    <div style={{fontSize:8,color:"var(--text-muted)",minWidth:22}}>n={r.count}</div>
                  </div>
                ))}
              </div>
            )}
            {confBands.length>0&&(
              <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:14,padding:"14px 16px"}}>
                <div className="hp6-sub-label">Accuracy by Confidence Band</div>
                {confBands.map((b,i)=>{const bc=b.bracket?.startsWith("High")?"#34d399":b.bracket?.startsWith("Med")?"#f59e0b":"#f87171";return(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                    <div style={{fontSize:9,fontWeight:700,color:bc,minWidth:80,whiteSpace:"nowrap"}}>{b.bracket}</div>
                    <div style={{flex:1,height:6,borderRadius:999,background:"var(--border)",overflow:"hidden"}}><div style={{width:`${b.accuracy||0}%`,height:"100%",background:bc,borderRadius:999,opacity:.8,transition:"width 1s ease"}}/></div>
                    <div style={{fontFamily:"var(--font-mono)",fontSize:11,fontWeight:900,color:bc,minWidth:35,textAlign:"right"}}>{b.accuracy!=null?`${b.accuracy}%`:"—"}</div>
                    <div style={{fontSize:8,color:"var(--text-muted)",minWidth:28}}>({b.count})</div>
                  </div>
                );})}
                {avgConf!=null&&<div style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--border)",fontSize:10,color:"var(--text-muted)"}}>Avg confidence: <span style={{fontFamily:"var(--font-mono)",fontWeight:900,color:"var(--text)"}}>{avgConf}%</span></div>}
              </div>
            )}
          </div>
          <div>
            <div className="hp6-sub-label">Recent Verified Predictions</div>
            {recentPreds.length>0?recentPreds.slice(0,8).map((p,i)=>{
              const ic=p.correct;const cc=p.confidence>=70?"#34d399":p.confidence>=55?"#f59e0b":"#f87171";
              return(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:10,background:"var(--bg-glass)",border:"1px solid var(--border)",marginBottom:5}}>
                  <div style={{width:20,height:20,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:ic?"rgba(52,211,153,0.12)":"rgba(248,113,113,0.12)",border:`1px solid ${ic?"rgba(52,211,153,0.3)":"rgba(248,113,113,0.25)"}`}}>
                    <span style={{fontSize:10,fontWeight:900,color:ic?"#34d399":"#f87171"}}>{ic?"✓":"✗"}</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,fontWeight:700,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.home} {p.score!=="—"?p.score:""} {p.away}</div>
                    <div style={{fontSize:9,color:"var(--text-muted)",marginTop:1}}>Predicted: <span style={{color:ic?"#34d399":"#f87171",fontWeight:700}}>{p.predicted_outcome}</span>{p.actual_outcome&&<> · Actual: <span style={{fontWeight:700,color:"var(--text-secondary)"}}>{p.actual_outcome}</span></>}</div>
                  </div>
                  <Badge label={`${p.confidence}%`} color={cc} size="sm"/>
                </div>
              );
            }):<div className="hp6-empty-state">No verified results yet.</div>}
          </div>
        </div>)}
    </div></section>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 13 — WHY STATINSITE
// ═══════════════════════════════════════════════════════════════
const MODELS=[
  {name:"Dixon-Coles",desc:"Low-score corrected Poisson model with τ-adjustment",color:"#38bdf8"},
  {name:"ELO Ratings",desc:"Dynamic team strength ratings updated after every match",color:"#a78bfa"},
  {name:"xG Modelling",desc:"Expected goals derived from shot location and context",color:"#34d399"},
  {name:"Monte Carlo",desc:"8,000-run season simulation for final table probabilities",color:"#f59e0b"},
  {name:"Form Weighting",desc:"Exponentially decayed recent form with injury signal",color:"#f472b6"},
  {name:"Market Edge",desc:"Model probability vs implied odds to identify value signals",color:"#fb923c"},
];
const FACTS=[{val:"9",label:"Competitions"},{val:"500+",label:"Player Profiles"},{val:"8",label:"FPL Tools"},{val:"8K",label:"Simulations/Run"}];

function WhyStatinSite(){
  const[ref,vis]=useReveal(0.04);
  return(
    <section className="hp6-section hp6-section--last"><div className="hp6-container">
      <div ref={ref} className="hp6-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
        <div><div className="hp6-eyebrow">— Platform</div><h2 className="hp6-section-title">The Intelligence Stack</h2></div>
      </div>
      <div className="hp6-why-grid">
        <div>
          <div className="hp6-sub-label">Data Models</div>
          <div className="hp6-models-grid">
            {MODELS.map(m=><div key={m.name} className="hp6-model-card" style={{"--mc-color":m.color}}><div className="hp6-mc-dot"/><div><div className="hp6-mc-name">{m.name}</div><div className="hp6-mc-desc">{m.desc}</div></div></div>)}
          </div>
        </div>
        <div>
          <div className="hp6-sub-label">Platform Scale</div>
          <div className="hp6-facts-grid">
            {FACTS.map(f=><div key={f.label} className="hp6-fact-card"><div className="hp6-fact-val hp4-mono">{f.val}</div><div className="hp6-fact-label">{f.label}</div></div>)}
          </div>
          <div className="hp6-platform-note">All predictions use real season statistics from API-Football Pro. Model probabilities are not guaranteed outcomes.</div>
        </div>
      </div>
    </div></section>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Div(){return<div style={{height:1,background:"linear-gradient(90deg,transparent,var(--border),transparent)",maxWidth:1200,margin:"0 auto",padding:"0 40px"}}><div style={{height:1}}/></div>;}

// ═══════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════
export default function HomePage() {
  const { fixtures, loading: ul } = useUpcoming();
  const { dash,     loading: dl } = useDashboard();
  return (
    <div className="sn-page-wrap hp4-root">
      <HeroSection fixtures={fixtures} upcoming_loading={ul} dash={dash} dash_loading={dl}/>
      <LivePulseStrip fixtures={fixtures}/>
      <TopPredictions dash={dash} loading={dl}/>
      <Div/>
      <TitleRace dash={dash} loading={dl}/>
      <Div/>
      <EdgeBoard dash={dash} loading={dl}/>
      <Div/>
      <CommandGrid fixtures={fixtures} dash={dash} loading={dl||ul}/>
      <Div/>
      <CompetitionHub fixtures={fixtures}/>
      <Div/>
      <FPLHub dash={dash}/>
      <Div/>
      <TrendingPlayers dash={dash} loading={dl}/>
      <Div/>
      <TransferBrief dash={dash} loading={dl}/>
      <Div/>
      <PowerRankings dash={dash} loading={dl}/>
      <Div/>
      <ModelPerformanceSection dash={dash} loading={dl}/>
      <Div/>
      <WhyStatinSite/>
    </div>
  );
}