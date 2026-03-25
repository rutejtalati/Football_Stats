// ═══════════════════════════════════════════════════════════════════════
// StatinSite — HomePage v6  "Maximum Density Intelligence Platform"
// ═══════════════════════════════════════════════════════════════════════
// New architecture — everything rebuilt from the section level up.
// Sections (in order):
//   1.  Hero          — 3-column command layout with flanking panels
//   2.  LiveStrip     — scrolling live scores
//   3.  TopPredictions — horizontal prediction cards with full data
//   4.  ModelEdgeBoard — value edge signals + xG leaders
//   5.  CommandGrid   — large animated tool cards (2-col asymmetric)
//   6.  CompetitionHub— league cards with match counts + coverage badges
//   7.  FPLHub        — multi-column FPL intelligence dashboard
//   8.  TrendingPlayers — player data rail
//   9.  WhyStatinSite — data models + platform facts
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";

const API = "https://football-stats-lw4b.onrender.com";
const LIVE_SET = new Set(["1H","2H","HT","ET","BT","P"]);
const FT_SET   = new Set(["FT","AET","PEN"]);
const isToday  = d => d && new Date(d).toDateString() === new Date().toDateString();

// ─── Data hooks ───────────────────────────────────────────────
function useUpcoming() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let dead = false;
    const k = "hp6_up";
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
          confidence: c.confidence??null,
          home_form: c.home_form||"", away_form: c.away_form||"",
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
    const k = "hp6_dash";
    try { const r = sessionStorage.getItem(k); if (r) { const {ts,p} = JSON.parse(r); if (Date.now()-ts<300000) { setData(p); setLoading(false); return; } } } catch {}
    fetch(`${API}/api/home/dashboard`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (dead||!d) return; setData(d); try { sessionStorage.setItem(k, JSON.stringify({ts:Date.now(),p:d})); } catch {} })
      .catch(()=>{}).finally(()=>{ if(!dead) setLoading(false); });
    return () => { dead = true; };
  }, []);
  return { dash: data, loading };
}

// ─── Utility hooks ────────────────────────────────────────────
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

// ─── Background animations ────────────────────────────────────
function TelemetryGrid() {
  const c = useRef(null);
  useEffect(() => {
    const canvas = c.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf, t=0;
    const resize = () => { canvas.width=canvas.offsetWidth; canvas.height=canvas.offsetHeight; };
    resize(); window.addEventListener("resize",resize);
    const draw = () => {
      const {width:W,height:H} = canvas; ctx.clearRect(0,0,W,H);
      const SZ=64, cols=Math.ceil(W/SZ)+2, rows=Math.ceil(H/SZ)+2;
      const ox=(t*0.3)%SZ, oy=(t*0.15)%SZ;
      for(let i=-1;i<cols;i++) { const a=0.02+0.01*Math.sin(i*0.4+t*0.007); ctx.strokeStyle=`rgba(56,189,248,${a})`; ctx.lineWidth=0.5; ctx.beginPath(); ctx.moveTo(i*SZ-ox,0); ctx.lineTo(i*SZ-ox,H); ctx.stroke(); }
      for(let j=-1;j<rows;j++) { const a=0.02+0.01*Math.sin(j*0.5+t*0.005); ctx.strokeStyle=`rgba(56,189,248,${a})`; ctx.lineWidth=0.5; ctx.beginPath(); ctx.moveTo(0,j*SZ-oy); ctx.lineTo(W,j*SZ-oy); ctx.stroke(); }
      for(let i=0;i<cols;i++) for(let j=0;j<rows;j++) { const p=Math.sin(i*0.8+j*0.6+t*0.04); if(p>0.7){ctx.fillStyle=`rgba(52,211,153,${(p-0.7)*0.45})`; ctx.beginPath(); ctx.arc(i*SZ-ox,j*SZ-oy,1.5,0,Math.PI*2); ctx.fill();} }
      t++; raf=requestAnimationFrame(draw);
    };
    draw(); return () => { cancelAnimationFrame(raf); window.removeEventListener("resize",resize); };
  },[]);
  return <canvas ref={c} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0}}/>;
}

function Particles({n=20}) {
  const ps = useMemo(()=>Array.from({length:n},(_,i)=>({id:i,x:Math.random()*100,y:Math.random()*100,sz:1+Math.random()*2.2,dur:9+Math.random()*14,del:-Math.random()*18,c:["56,189,248","52,211,153","167,139,250","245,158,11"][i%4]})),[n]);
  return <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>{ps.map(p=><div key={p.id} style={{position:"absolute",left:`${p.x}%`,top:`${p.y}%`,width:p.sz,height:p.sz,borderRadius:"50%",background:`rgba(${p.c},0.6)`,boxShadow:`0 0 ${p.sz*3}px rgba(${p.c},0.4)`,animation:`hp4-float ${p.dur}s ${p.del}s linear infinite`}}/>)}</div>;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1 — HERO (3-column command layout)
// ═══════════════════════════════════════════════════════════════
function LiveMatchPanel({ fixtures }) {
  const nav   = useNavigate();
  const live  = fixtures.filter(f => LIVE_SET.has(f.status)).slice(0,3);
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
  const nav   = useNavigate();
  const pred  = dash?.top_predictions?.predictions?.[0];
  if (!pred) return (
    <div className="hp6-hero-panel">
      <div className="hp6-panel-label">TOP PREDICTION</div>
      <Skel w="80%" h={11}/><div style={{marginTop:6}}/><Skel w="60%" h={9}/>
    </div>
  );
  const fav     = pred.homeProb>pred.awayProb ? pred.home : pred.away;
  const favProb = Math.max(pred.homeProb||0,pred.awayProb||0);
  const hPct    = pred.homeProb||0, aPct = pred.awayProb||0, dPct = pred.draw||0;
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
      {/* Tri-bar */}
      <div style={{display:"flex",height:5,borderRadius:999,overflow:"hidden",margin:"8px 0 5px",gap:1}}>
        <div style={{flex:hPct,background:"#38bdf8",opacity:.9}}/>
        <div style={{flex:dPct,background:"rgba(255,255,255,0.2)"}}/>
        <div style={{flex:aPct,background:"#34d399",opacity:.9}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:9}}>
        <span className="hp4-mono" style={{color:"#38bdf8",fontWeight:900}}>{hPct}%</span>
        <span style={{color:"var(--text-dim)"}}>D {dPct}%</span>
        <span className="hp4-mono" style={{color:"#34d399",fontWeight:900}}>{aPct}%</span>
      </div>
      <div style={{marginTop:6,fontSize:9,color:"var(--text-muted)"}}>
        xG <span className="hp4-mono" style={{color:"var(--text)"}}>{pred.xg_home!=null?Number(pred.xg_home).toFixed(1):"—"}–{pred.xg_away!=null?Number(pred.xg_away).toFixed(1):"—"}</span>
        <span style={{marginLeft:8,background:`${"#38bdf8"}18`,color:"#38bdf8",padding:"1px 6px",borderRadius:999,fontWeight:800}}>{favProb}% {fav?.split(" ").slice(-1)[0]}</span>
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
          {/* Mini confidence bar */}
          <div style={{display:"flex",gap:3,marginBottom:8}}>
            {conf.high>0&&<div style={{flex:conf.high,background:"#34d399",height:4,borderRadius:999,opacity:.8}} title={`High: ${conf.high}`}/>}
            {conf.medium>0&&<div style={{flex:conf.medium,background:"#f59e0b",height:4,borderRadius:999,opacity:.7}} title={`Med: ${conf.medium}`}/>}
            {conf.low>0&&<div style={{flex:conf.low,background:"#f87171",height:4,borderRadius:999,opacity:.6}} title={`Low: ${conf.low}`}/>}
          </div>
          {edge&&<div style={{fontSize:9,color:"var(--text-muted)"}}>Top edge: <span style={{color:"#34d399",fontWeight:800}}>+{edge.edge}% {edge.label?.split(" ").slice(0,2).join(" ")}</span></div>}
        </>
      )}
    </div>
  );
}

function HeroSection({ fixtures, upcoming_loading, dash, dash_loading }) {
  const nav     = useNavigate();
  const heroRef = useRef(null);
  const [mouse, setMouse] = useState({x:.5,y:.5});
  const liveCount  = fixtures.filter(f=>LIVE_SET.has(f.status)).length;
  const todayCount = fixtures.filter(f=>isToday(f.kickoff)).length;
  const avgConf    = dash?.model_confidence?.avg_confidence??null;
  const topEdge    = dash?.model_edges?.edges?.[0]??null;
  const onMove = useCallback(e=>{const r=heroRef.current?.getBoundingClientRect();if(!r)return;setMouse({x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height});},[]);

  return (
    <section className="hp6-hero" ref={heroRef} onMouseMove={onMove}>
      <TelemetryGrid/>
      <Particles n={20}/>
      {[{cls:"hp4-hero-blob hp4-hero-blob--a",dx:.5,dy:.4},{cls:"hp4-hero-blob hp4-hero-blob--b",dx:-.3,dy:-.3},{cls:"hp4-hero-blob hp4-hero-blob--c",dx:.6,dy:.5}].map(({cls,dx,dy},i)=>(
        <div key={i} className={cls} style={{transform:`translate(calc(-50% + ${(mouse.x-.5)*40*dx}px),calc(-50% + ${(mouse.y-.5)*28*dy}px))`,transition:"transform 0.18s ease"}}/>
      ))}
      <div className="hp4-scanline"/>

      <div className="hp6-hero-layout">
        {/* Left intel panel */}
        <div className="hp6-hero-left">
          <LiveMatchPanel fixtures={fixtures}/>
          <ModelConfPanel dash={dash} dash_loading={dash_loading}/>
        </div>

        {/* Centre */}
        <div className="hp6-hero-center">
          <div className="hp4-hero-badge" style={{animationDelay:"0.05s"}}>
            {liveCount>0
              ? <><span className="hp4-live-dot"/><span className="hp4-hero-badge-text hp4-hero-badge-text--live hp4-mono">{liveCount} LIVE NOW</span></>
              : <span className="hp4-hero-badge-text">ELO · DIXON-COLES · REAL xG · POISSON</span>
            }
          </div>
          <h1 className="hp4-hero-title hp6-hero-title" style={{animationDelay:"0.1s"}}>
            Read The<br/><span className="hp4-gradient-text hp4-glow-pulse">Game.</span>
          </h1>
          <p className="hp6-hero-sub" style={{animationDelay:"0.18s"}}>
            Football intelligence rebuilt. Live scores, Poisson predictions, live xG tracking and the deepest FPL suite.
          </p>
          <div className="hp4-hero-ctas" style={{animationDelay:"0.26s"}}>
            <RippleBtn cls={liveCount>0?"hp4-btn--live":"hp4-btn--primary"} onClick={()=>nav("/live")}>
              {liveCount>0&&<span className="hp4-live-dot hp4-live-dot--sm"/>}
              {liveCount>0?"Watch Live":"Live Centre"}<span className="hp4-btn-sweep"/>
            </RippleBtn>
            <RippleBtn cls="hp4-btn--ghost" onClick={()=>nav("/predictions/premier-league")}>
              Predictions<span className="hp4-btn-sweep"/>
            </RippleBtn>
            <RippleBtn cls="hp4-btn--fpl" onClick={()=>nav("/best-team")}>
              FPL<span className="hp4-btn-sweep"/>
            </RippleBtn>
          </div>
          {/* Stats strip */}
          <div className="hp4-stats-strip hp6-stats-strip" style={{animationDelay:"0.35s"}}>
            {[
              {l:"Live",v:liveCount,c:"#ff4444",live:true,ld:upcoming_loading},
              {l:"Today",v:todayCount,c:"#38bdf8",ld:upcoming_loading},
              {l:"Confidence",v:avgConf,c:"#34d399",sx:"%",ld:dash_loading},
              {l:"Top Edge",v:topEdge?`+${topEdge.edge}%`:null,c:"#a78bfa",raw:true,ld:dash_loading},
            ].map(({l,v,c,live,sx="",ld,raw},i)=>(
              <div key={l} className="hp4-stat-cell" style={{"--cell-color":c}}>
                {i>0&&<div className="hp4-stat-div"/>}
                <div className="hp4-stat-inner">
                  <div className="hp4-stat-val">
                    {live&&v>0&&!ld&&<span className="hp4-live-dot hp4-live-dot--sm" style={{"--dot-color":"#ff4444"}}/>}
                    {ld||v==null?<span className="hp5-skel" style={{width:28,height:22,borderRadius:4}}/>
                      :raw?<span className="hp4-mono">{v}</span>
                      :<CountUp to={Number(v)||0} suffix={sx}/>}
                  </div>
                  <div className="hp4-stat-label">{l}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right intel panel */}
        <div className="hp6-hero-right">
          <TopPredPanel dash={dash}/>
          {/* Quick links */}
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
  const nav  = useNavigate();
  const live = fixtures.filter(f=>LIVE_SET.has(f.status));
  if (!live.length) return null;
  const chips = [...live,...live,...live];
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
// SECTION 3 — TOP PREDICTIONS (large horizontal cards)
// ═══════════════════════════════════════════════════════════════
function PredCard({ p, index }) {
  const nav   = useNavigate();
  const [hov, setHov] = useState(false);
  const [ref, vis]    = useReveal(0.05);
  const hp = p.homeProb||0, dp = p.draw||0, ap = p.awayProb||0;
  const favTeam = hp>ap ? p.home : p.away;
  const favProb = Math.max(hp,ap);
  const confColor = (p.conf_pct||50)>=70?"#34d399":(p.conf_pct||50)>=55?"#f59e0b":"#f87171";

  return (
    <div ref={ref} style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(16px)",transition:`all 0.45s ease ${index*55}ms`,flexShrink:0,width:280}}>
      <div
        className={`hp6-pred-card ${hov?"hp6-pred-card--hov":""}`}
        style={{"--pc-color":p.col||"#38bdf8"}}
        onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
        onClick={()=>p.fixture_id&&nav(`/match/${p.fixture_id}`)}
      >
        {/* Header */}
        <div className="hp6-pc-head">
          <span className="hp6-pc-league">{p.league||"League"}</span>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:confColor}}/>
            <span className="hp4-mono" style={{fontSize:9,fontWeight:800,color:confColor}}>{p.conf_pct||50}%</span>
          </div>
        </div>
        {/* Teams row */}
        <div className="hp6-pc-teams">
          <div className="hp6-pc-team">
            {p.home_logo&&<img src={p.home_logo} width={24} height={24} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
            <span className="hp6-pc-tname">{p.home}</span>
          </div>
          <div className="hp6-pc-score-area">
            <div className="hp6-pc-predicted hp4-mono">{p.score||"1-0"}</div>
            <div style={{fontSize:8,color:"var(--text-muted)"}}>predicted</div>
          </div>
          <div className="hp6-pc-team" style={{flexDirection:"row-reverse"}}>
            {p.away_logo&&<img src={p.away_logo} width={24} height={24} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
            <span className="hp6-pc-tname" style={{textAlign:"right"}}>{p.away}</span>
          </div>
        </div>
        {/* Prob bar */}
        <div className="hp6-pc-probbar">
          <div style={{flex:hp,background:"#38bdf8",opacity:.85,transition:"flex .5s"}}/>
          <div style={{flex:dp,background:"rgba(255,255,255,.18)"}}/>
          <div style={{flex:ap,background:"#34d399",opacity:.85,transition:"flex .5s"}}/>
        </div>
        <div className="hp6-pc-probs">
          <span className="hp4-mono" style={{color:"#38bdf8",fontWeight:900}}>{hp}%</span>
          <span style={{color:"var(--text-dim)"}}>Draw {dp}%</span>
          <span className="hp4-mono" style={{color:"#34d399",fontWeight:900}}>{ap}%</span>
        </div>
        {/* xG + markets */}
        <div className="hp6-pc-markets">
          <span>xG <span className="hp4-mono">{p.xg_home!=null?Number(p.xg_home).toFixed(1):"—"}–{p.xg_away!=null?Number(p.xg_away).toFixed(1):"—"}</span></span>
          {favProb>=60&&<span className="hp6-pc-badge" style={{background:`${p.col||"#38bdf8"}18`,color:p.col||"#38bdf8"}}>{favProb}% {favTeam?.split(" ").slice(-1)[0]}</span>}
        </div>
        {/* Hover expand */}
        <div className={`hp6-pc-expand ${hov?"hp6-pc-expand--vis":""}`}>
          <span style={{fontSize:9,color:"var(--text-muted)"}}>Open match intelligence →</span>
        </div>
      </div>
    </div>
  );
}

function TopPredictions({ dash, loading }) {
  const [ref, vis] = useReveal(0.04);
  const preds = dash?.top_predictions?.predictions ?? [];
  return (
    <section className="hp6-section">
      <div className="hp6-container">
        <div ref={ref} className="hp6-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div><div className="hp6-eyebrow">— Model Output</div><h2 className="hp6-section-title">Today's Top Predictions</h2></div>
          <Link to="/predictions/premier-league" className="hp6-see-all">All predictions →</Link>
        </div>
        <div className="hp6-hscroll">
          {loading ? Array.from({length:4}).map((_,i)=>(
            <div key={i} style={{flexShrink:0,width:280,height:200,borderRadius:16,background:"rgba(6,11,22,.98)",border:"1px solid rgba(255,255,255,.06)"}}><div style={{padding:16}}><Skel w="60%" h={9}/><div style={{marginTop:12}}/><Skel w="90%" h={12}/><div style={{marginTop:4}}/><Skel w="75%" h={9}/></div></div>
          )) : preds.map((p,i)=><PredCard key={i} p={p} index={i}/>)}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4 — MODEL EDGE BOARD + HIGH XG
// ═══════════════════════════════════════════════════════════════
function EdgeCard({ edge, index }) {
  const [ref, vis] = useReveal(0.05);
  return (
    <div ref={ref} className="hp6-edge-card" style={{opacity:vis?1:0,transform:vis?"translateX(0)":"translateX(12px)",transition:`all .4s ease ${index*50}ms`}}>
      <div className="hp6-edge-tag" style={{color:edge.col||"#34d399"}}>MODEL EDGE</div>
      <div className="hp6-edge-match">{edge.home} vs {edge.away}</div>
      <div className="hp6-edge-val" style={{color:edge.col||"#34d399"}}>+{edge.edge}%</div>
      <div className="hp6-edge-dir">{edge.direction==="home"?edge.home:edge.away} favoured</div>
      <div style={{height:3,borderRadius:999,background:"rgba(255,255,255,.05)",marginTop:8,overflow:"hidden"}}>
        <div style={{width:`${Math.min(edge.model_prob||edge.edge*2,100)}%`,height:"100%",background:edge.col||"#34d399",borderRadius:999}}/>
      </div>
    </div>
  );
}

function XgCard({ match, index }) {
  const nav = useNavigate();
  const [ref, vis] = useReveal(0.05);
  const xgHome = Number(match.xg_home) || 0;
  const xgAway = Number(match.xg_away) || 0;
  const total  = Number(match.total_xg) || (xgHome + xgAway);
  return (
    <div ref={ref} className="hp6-xg-card" style={{opacity:vis?1:0,transform:vis?"translateX(0)":"translateX(12px)",transition:`all .4s ease ${index*50}ms`}}
      onClick={()=>match.fixture_id&&nav(`/match/${match.fixture_id}`)}>
      <div className="hp6-xg-tag">HIGH xG</div>
      <div className="hp6-xg-total hp4-mono">{total.toFixed(1)}</div>
      <div className="hp6-xg-match">{match.home?.split(" ").slice(-1)[0]} vs {match.away?.split(" ").slice(-1)[0]}</div>
      <div style={{display:"flex",gap:3,marginTop:6}}>
        <div style={{flex:xgHome||1,height:4,borderRadius:999,background:"#38bdf8",opacity:.8}}/>
        <div style={{flex:xgAway||1,height:4,borderRadius:999,background:"#34d399",opacity:.8}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:9,marginTop:3}}>
        <span className="hp4-mono" style={{color:"#38bdf8"}}>{xgHome.toFixed(1)}</span>
        <span className="hp4-mono" style={{color:"#34d399"}}>{xgAway.toFixed(1)}</span>
      </div>
    </div>
  );
}

function EdgeBoard({ dash, loading }) {
  const [ref, vis] = useReveal(0.04);
  const edges     = dash?.model_edges?.edges ?? [];
  const highXg    = dash?.high_scoring_matches?.matches ?? [];
  return (
    <section className="hp6-section">
      <div className="hp6-container">
        <div ref={ref} className="hp6-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div><div className="hp6-eyebrow">— Value Signals</div><h2 className="hp6-section-title">Model Edge Board</h2></div>
        </div>
        <div className="hp6-edge-grid">
          {/* Left: edges */}
          <div>
            <div className="hp6-sub-label">Best Edges Today</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {loading ? Array.from({length:3}).map((_,i)=><div key={i} className="hp6-edge-card"><Skel w="70%" h={10}/><div style={{marginTop:6}}/><Skel w="50%" h={16}/></div>)
                : edges.length>0 ? edges.map((e,i)=><EdgeCard key={i} edge={e} index={i}/>)
                : <div className="hp6-empty-state">No edges detected today</div>}
            </div>
          </div>
          {/* Right: high xG */}
          <div>
            <div className="hp6-sub-label">Highest xG Fixtures</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {loading ? Array.from({length:3}).map((_,i)=><div key={i} className="hp6-xg-card"><Skel w="40%" h={24}/><div style={{marginTop:4}}/><Skel w="70%" h={10}/></div>)
                : highXg.length>0 ? highXg.slice(0,4).map((m,i)=><XgCard key={i} match={m} index={i}/>)
                : <div className="hp6-empty-state">Loading fixtures…</div>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5 — TOOL COMMAND GRID (large asymmetric cards)
// ═══════════════════════════════════════════════════════════════

// Animated SVG graphics — topic-specific, animate on hover
function LiveRadarGfx({ active }) {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none" className={`hp6-gfx ${active?"hp6-gfx--active":""}`}>
      {[20,32,44].map((r,i)=><circle key={i} cx="55" cy="55" r={r} stroke="#ff4444" strokeWidth={i===2?1.5:.6} opacity={.12+i*.08}/>)}
      {Array.from({length:6}).map((_,j)=>{const a=(j/6)*Math.PI*2;return<line key={j} x1="55" y1="55" x2={55+Math.cos(a)*44} y2={55+Math.sin(a)*44} stroke="#ff4444" strokeWidth=".5" opacity=".15"/>;  })}
      {/* Sweep arm */}
      <line x1="55" y1="55" x2="99" y2="55" stroke="#ff4444" strokeWidth="1.5" opacity=".7" style={{transformOrigin:"55px 55px",animation:active?"hp6-sweep-arm 2s linear infinite":"none"}}/>
      {/* Live dots */}
      {[{x:72,y:38},{x:44,y:68},{x:80,y:64}].map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={3} fill="#ff4444" opacity=".7" style={{animation:`snLivePulse ${1.2+i*.3}s ease-in-out infinite`}}/>)}
    </svg>
  );
}

function ProbBarsGfx({ active }) {
  const bars = [62,45,78,55,88,40,66,72];
  return (
    <svg width="110" height="70" viewBox="0 0 110 70" fill="none" className={`hp6-gfx ${active?"hp6-gfx--active":""}`}>
      {bars.map((h,i)=>(
        <rect key={i} x={i*13+2} y={70-h*.65} width={10} height={h*.65} rx="3"
          fill="#38bdf8" opacity={i===4?.9:.3+i*.07}
          style={{transformOrigin:`${i*13+7}px 70px`,animation:active?`hp6-bar-grow .6s ease ${i*60}ms both`:undefined}}/>
      ))}
      <path d="M2 52L15 34L28 44L41 18L54 30L67 24L80 38L93 28" stroke="#38bdf8" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity=".5"/>
    </svg>
  );
}

function PitchGfx({ active }) {
  return (
    <svg width="110" height="78" viewBox="0 0 110 78" fill="none" className={`hp6-gfx ${active?"hp6-gfx--active":""}`}>
      <rect x="1" y="1" width="108" height="76" rx="5" stroke="#a78bfa" strokeWidth="1.2" opacity=".5"/>
      <line x1="55" y1="1" x2="55" y2="77" stroke="#a78bfa" strokeWidth=".8" opacity=".35"/>
      <circle cx="55" cy="39" r="13" stroke="#a78bfa" strokeWidth=".8" opacity=".35"/>
      <rect x="1" y="24" width="22" height="30" stroke="#a78bfa" strokeWidth=".8" opacity=".35"/>
      <rect x="87" y="24" width="22" height="30" stroke="#a78bfa" strokeWidth=".8" opacity=".35"/>
      {/* Positional nodes */}
      {[{x:18,y:39},{x:36,y:20},{x:36,y:39},{x:36,y:58},{x:55,y:28},{x:55,y:50},{x:74,y:20},{x:74,y:39},{x:74,y:58},{x:90,y:30},{x:90,y:48}].map((p,i)=>(
        <circle key={i} cx={p.x} cy={p.y} r={active?4:3} fill="#a78bfa" opacity={active?.85:.4}
          style={{transition:"r .2s,opacity .2s",animation:active?`snLivePulse ${1.5+i*.15}s ease-in-out infinite`:undefined}}/>
      ))}
    </svg>
  );
}

function FPLPitchGfx({ active }) {
  const players = [{x:18,y:39,cap:false},{x:34,y:16,cap:false},{x:34,y:32,cap:false},{x:34,y:46,cap:false},{x:34,y:62,cap:false},{x:52,y:22,cap:false},{x:52,y:39,cap:true},{x:52,y:56,cap:false},{x:70,y:26,cap:false},{x:70,y:52,cap:false},{x:86,y:39,cap:false}];
  return (
    <svg width="110" height="78" viewBox="0 0 110 78" fill="none" className={`hp6-gfx ${active?"hp6-gfx--active":""}`}>
      <rect x="1" y="1" width="108" height="76" rx="5" stroke="#34d399" strokeWidth="1" opacity=".35"/>
      <line x1="55" y1="1" x2="55" y2="77" stroke="#34d399" strokeWidth=".6" opacity=".25"/>
      <circle cx="55" cy="39" r="11" stroke="#34d399" strokeWidth=".6" opacity=".25"/>
      {players.map((p,i)=>(
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={p.cap?6:4} fill="#34d399" opacity={p.cap?.9:.5}
            style={{animation:p.cap&&active?`snLivePulse 1.5s ease-in-out infinite`:undefined}}/>
          {p.cap&&<text x={p.x} y={p.y+3.5} textAnchor="middle" fontSize="6" fontWeight="900" fill="#000" fontFamily="monospace">C</text>}
        </g>
      ))}
    </svg>
  );
}

function PlayersGfx({ active }) {
  return (
    <svg width="80" height="90" viewBox="0 0 80 90" fill="none" className={`hp6-gfx ${active?"hp6-gfx--active":""}`}>
      <circle cx="40" cy="22" r="14" stroke="#f59e0b" strokeWidth="1.5" opacity=".7" fill="#f59e0b" fillOpacity=".1"/>
      <path d="M8 88c0-17.7 14.3-32 32-32s32 14.3 32 32" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" opacity=".7"/>
      {/* Stat bars */}
      {[{x:8,y:58,h:18,w:8},{x:20,y:52,h:24,w:8},{x:32,y:46,h:30,w:8}].map((b,i)=>(
        <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="2" fill="#f59e0b" opacity={.25+i*.1}
          style={{animation:active?`hp6-bar-grow .6s ease ${i*100}ms both`:undefined}}/>
      ))}
      {/* Radar */}
      <circle cx="40" cy="22" r="20" stroke="#f59e0b" strokeWidth=".5" strokeDasharray="3 3" opacity=".2"/>
    </svg>
  );
}

function NewsGfx({ active }) {
  return (
    <svg width="100" height="70" viewBox="0 0 100 70" fill="none" className={`hp6-gfx ${active?"hp6-gfx--active":""}`}>
      <rect x="1" y="1" width="98" height="68" rx="6" stroke="#f472b6" strokeWidth="1" opacity=".35"/>
      <rect x="8" y="10" width="84" height="10" rx="3" fill="#f472b6" fillOpacity=".4"
        style={{animation:active?"hp6-shimmer-in .5s ease both":undefined}}/>
      {[{y:28,w:60},{y:38,w:76},{y:48,w:50},{y:58,w:68}].map((r,i)=>(
        <rect key={i} x="8" y={r.y} width={r.w} height="5" rx="2" fill="#f472b6" fillOpacity={.18-i*.03}/>
      ))}
      <circle cx="82" cy="43" r="12" stroke="#f472b6" strokeWidth=".8" strokeDasharray="3 2" opacity=".3"
        style={{animation:active?"hp6-sweep-arm 3s linear infinite":undefined,transformOrigin:"82px 43px"}}/>
    </svg>
  );
}

function GameGfx({ active }) {
  return (
    <svg width="100" height="68" viewBox="0 0 100 68" fill="none" className={`hp6-gfx ${active?"hp6-gfx--active":""}`}>
      <rect x="1" y="8" width="98" height="52" rx="12" stroke="#fb923c" strokeWidth="1.4" opacity=".6"/>
      <circle cx="28" cy="34" r="12" stroke="#fb923c" strokeWidth="1" opacity=".5"/>
      <line x1="22" y1="34" x2="34" y2="34" stroke="#fb923c" strokeWidth="1.6" strokeLinecap="round" opacity=".7"/>
      <line x1="28" y1="28" x2="28" y2="40" stroke="#fb923c" strokeWidth="1.6" strokeLinecap="round" opacity=".7"/>
      {[{x:68,y:26},{x:80,y:34},{x:68,y:42},{x:56,y:34}].map((p,i)=>(
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#fb923c" opacity={active?.7:.35}
          style={{animation:active?`snLivePulse ${1+i*.25}s ease-in-out infinite`:undefined}}/>
      ))}
    </svg>
  );
}

// Large tool cards
const TOOLS = [
  {
    to:"/live", label:"Live Centre", color:"#ff4444",
    span:2, tall:true,
    Gfx: LiveRadarGfx,
    sub: "Real-time scores, live events and minute-by-minute match tracking",
    dataKey:"live",
    tag:"LIVE DATA",
  },
  {
    to:"/predictions/premier-league", label:"Predictions", color:"#38bdf8",
    span:1, tall:false,
    Gfx: ProbBarsGfx,
    sub: "Dixon-Coles Poisson model with ELO ratings",
    dataKey:"preds",
    tag:"MODEL OUTPUT",
  },
  {
    to:"/match/0", label:"Match Hub", color:"#a78bfa",
    span:1, tall:false,
    Gfx: PitchGfx,
    sub: "Expected lineups, H2H, injuries, xG and live tactics",
    dataKey:null,
    tag:"INTELLIGENCE",
  },
  {
    to:"/best-team", label:"FPL Best XI", color:"#34d399",
    span:1, tall:true,
    Gfx: FPLPitchGfx,
    sub: "Optimal FPL starting XI with captain signal",
    dataKey:"fpl",
    tag:"FPL",
  },
  {
    to:"/squad-builder", label:"Squad Builder", color:"#34d399",
    span:1, tall:false,
    Gfx: null,
    sub: "Build your 15-man FPL squad under budget",
    dataKey:null,
    tag:"FPL",
  },
  {
    to:"/player", label:"Players", color:"#f59e0b",
    span:1, tall:false,
    Gfx: PlayersGfx,
    sub: "500+ player profiles with xG, FPL stats and form",
    dataKey:null,
    tag:"DATA",
  },
  {
    to:"/news", label:"News", color:"#f472b6",
    span:1, tall:false,
    Gfx: NewsGfx,
    sub: "Transfers, injuries and intelligence updates",
    dataKey:null,
    tag:"NEWS",
  },
  {
    to:"/games", label:"Mini Games", color:"#fb923c",
    span:1, tall:false,
    Gfx: GameGfx,
    sub: "Score predictor, quizzes and football challenges",
    dataKey:null,
    tag:"GAMES",
  },
];

function ToolDataRow({ dataKey, fixtures, dash, loading }) {
  if (!dataKey) return null;
  if (dataKey==="live") {
    const live = fixtures.filter(f=>LIVE_SET.has(f.status));
    if (loading) return <div className="hp6-td"><Skel w="70%" h={9}/></div>;
    return (
      <div className="hp6-td">
        <div className="hp6-td-val" style={{color:"#ff4444"}}>{live.length>0?`${live.length} live now`:`${fixtures.filter(f=>isToday(f.kickoff)).length} today`}</div>
        {live[0]&&<div className="hp6-td-sub hp4-mono">{live[0].home_team?.split(" ").slice(-1)[0]} {live[0].home_score??0}–{live[0].away_score??0} {live[0].away_team?.split(" ").slice(-1)[0]}</div>}
      </div>
    );
  }
  if (dataKey==="preds") {
    const conf = dash?.model_confidence; const top = dash?.top_predictions?.predictions?.[0];
    if (loading||!dash) return <div className="hp6-td"><Skel w="60%" h={9}/></div>;
    return (
      <div className="hp6-td">
        {conf&&<div className="hp6-td-val">{conf.avg_confidence}% conf · {conf.total} fixtures</div>}
        {top&&<div className="hp6-td-sub">{Math.max(top.homeProb||0,top.awayProb||0)}% {(top.homeProb>top.awayProb?top.home:top.away)?.split(" ").slice(-1)[0]}</div>}
      </div>
    );
  }
  if (dataKey==="fpl") {
    const capt = dash?.differential_captains?.captains?.[0];
    if (loading||!dash) return <div className="hp6-td"><Skel w="55%" h={9}/></div>;
    return (
      <div className="hp6-td">
        {capt&&<><div className="hp6-td-val">Captain: {capt.name||capt.web_name}</div><div className="hp6-td-sub hp4-mono">{capt.ep_next!=null?Number(capt.ep_next).toFixed(1):"?"} EP · {capt.next_opp||""}</div></>}
      </div>
    );
  }
  return null;
}

function LargeToolCard({ tool, index, fixtures, dash, loading }) {
  const { ref:tref, tf, gl, onMove, onLeave } = useTilt(5);
  const [hov, setHov] = useState(false);
  const [rref, vis]   = useReveal(0.04);
  const { Gfx }       = tool;
  return (
    <div ref={rref} className="hp6-tool-wrap" style={{gridColumn:`span ${tool.span}`,gridRow:tool.tall?"span 2":"span 1",opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(20px)",transition:`opacity .55s ease ${index*55}ms,transform .55s ease ${index*55}ms`}}>
      <div ref={tref} className={`hp6-tool-card ${hov?"hp6-tool-card--hov":""}`}
        style={{"--tc-color":tool.color,transform:tf,transition:"transform .18s ease,box-shadow .22s,border-color .22s"}}
        onMouseMove={onMove} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>{onLeave();setHov(false);}}>
        {/* Dynamic glow */}
        <div className="hp6-tool-glow" style={{background:`radial-gradient(circle at ${gl.x}% ${gl.y}%,${tool.color}22 0%,transparent 65%)`}}/>
        <div className={`hp4-card-shimmer ${hov?"hp4-card-shimmer--active":""}`}/>
        <div className="hp6-tool-topbar"/>
        <Link to={tool.to} className="hp6-tool-link">
          {/* Tag + label */}
          <div className="hp6-tool-header">
            <div className="hp6-tool-tag" style={{color:tool.color}}>{tool.tag}</div>
            {hov&&Gfx&&<div className="hp6-tool-gfx-top"><Gfx active={hov}/></div>}
          </div>
          <div className="hp6-tool-title">{tool.label}</div>
          <div className="hp6-tool-sub">{tool.sub}</div>
          {/* Real data */}
          <ToolDataRow dataKey={tool.dataKey} fixtures={fixtures} dash={dash} loading={loading}/>
          {/* Background graphic */}
          {Gfx&&<div className="hp6-tool-gfx-bg"><Gfx active={hov}/></div>}
          <div className="hp6-tool-cta">
            Open <span style={{transition:"transform .18s",transform:hov?"translateX(4px)":"translateX(0)",display:"inline-block"}}>→</span>
          </div>
        </Link>
      </div>
    </div>
  );
}

function CommandGrid({ fixtures, dash, loading }) {
  const [ref, vis] = useReveal(0.04);
  return (
    <section className="hp6-section">
      <div className="hp6-container">
        <div ref={ref} className="hp6-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div><div className="hp6-eyebrow">— Platform</div><h2 className="hp6-section-title">Intelligence Command Grid</h2></div>
          <span style={{fontSize:10,color:"var(--text-muted)"}}>8 tools</span>
        </div>
        <div className="hp6-bento">
          {TOOLS.map((t,i)=><LargeToolCard key={t.to} tool={t} index={i} fixtures={fixtures} dash={dash} loading={loading}/>)}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 6 — COMPETITION HUB (rich league cards)
// ═══════════════════════════════════════════════════════════════
const COMPS = [
  {label:"Premier League",slug:"premier-league",code:"epl",color:"#60a5fa",logo:"https://media.api-sports.io/football/leagues/39.png",teams:20,matches:"380/season",features:["Predictions","Standings","Season Sim","xG Leaders"]},
  {label:"La Liga",slug:"la-liga",code:"laliga",color:"#fb923c",logo:"https://media.api-sports.io/football/leagues/140.png",teams:20,matches:"380/season",features:["Predictions","Standings","Season Sim"]},
  {label:"Bundesliga",slug:"bundesliga",code:"bundesliga",color:"#f59e0b",logo:"https://media.api-sports.io/football/leagues/78.png",teams:18,matches:"306/season",features:["Predictions","Standings","Season Sim"]},
  {label:"Serie A",slug:"serie-a",code:"seriea",color:"#34d399",logo:"https://media.api-sports.io/football/leagues/135.png",teams:20,matches:"380/season",features:["Predictions","Standings"]},
  {label:"Ligue 1",slug:"ligue-1",code:"ligue1",color:"#a78bfa",logo:"https://media.api-sports.io/football/leagues/61.png",teams:18,matches:"306/season",features:["Predictions","Standings"]},
  {label:"UCL",slug:"champions-league",code:"ucl",color:"#3b82f6",logo:"https://media.api-sports.io/football/leagues/2.png",teams:36,matches:"League phase + KO",features:["Predictions","Bracket"]},
  {label:"Europa League",slug:"europa-league",code:"uel",color:"#f97316",logo:"https://media.api-sports.io/football/leagues/3.png",teams:36,matches:"League phase + KO",features:["Predictions","Bracket"]},
  {label:"Conference",slug:"conference-league",code:"uecl",color:"#22c55e",logo:"https://media.api-sports.io/football/leagues/848.png",teams:36,matches:"League phase + KO",features:["Predictions","Bracket"]},
  {label:"FA Cup",slug:"fa-cup",code:"facup",color:"#ef4444",logo:"https://media.api-sports.io/football/leagues/45.png",teams:736,matches:"Knockout",features:["Predictions","Bracket"]},
];

function CompCard({ comp, index }) {
  const [hov, setHov] = useState(false);
  const [ref, vis]    = useReveal(0.05);
  return (
    <div ref={ref} style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:`all .4s ease ${index*35}ms`}}>
      <Link to={`/predictions/${comp.slug}`} style={{textDecoration:"none"}}>
        <div className={`hp6-comp-card ${hov?"hp6-comp-card--hov":""}`} style={{"--cc-color":comp.color}}
          onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
          <div className="hp6-cc-topbar"/>
          <div className="hp6-cc-header">
            <div className="hp6-cc-logo">
              <img src={comp.logo} width={28} height={28} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>
            </div>
            <div>
              <div className="hp6-cc-name">{comp.label}</div>
              <div className="hp6-cc-meta">{comp.teams} clubs · {comp.matches}</div>
            </div>
          </div>
          <div className="hp6-cc-features">
            {comp.features.map(f=><span key={f} className="hp6-cc-feat">{f}</span>)}
          </div>
          <div className="hp6-cc-cta">Explore predictions →</div>
        </div>
      </Link>
    </div>
  );
}

function CompetitionHub() {
  const [ref, vis] = useReveal(0.04);
  return (
    <section className="hp6-section">
      <div className="hp6-container">
        <div ref={ref} className="hp6-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div>
            <div className="hp6-eyebrow">— Coverage</div>
            <h2 className="hp6-section-title">9 Competitions. Full Intelligence.</h2>
            <p style={{fontSize:12,color:"var(--text-muted)",marginTop:6,maxWidth:480}}>Poisson model predictions, standings, season simulation and xG analysis across Europe's top competitions.</p>
          </div>
        </div>
        <div className="hp6-comp-grid">
          {COMPS.map((c,i)=><CompCard key={c.slug} comp={c} index={i}/>)}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 7 — FPL INTELLIGENCE HUB
// ═══════════════════════════════════════════════════════════════
const FPL_TOOLS = [
  {to:"/best-team",label:"Best XI",stat:"Optimal 11",detail:"Model-driven optimal starting 11",color:"#34d399"},
  {to:"/squad-builder",label:"Squad Builder",stat:"15-man squad",detail:"Build within £100m budget",color:"#38bdf8"},
  {to:"/gameweek-insights",label:"GW Insights",stat:"This gameweek",detail:"Fixture analysis & GW picks",color:"#f59e0b"},
  {to:"/fpl-table",label:"FPL Table",stat:"Standings",detail:"Live leaderboard & rank",color:"#a78bfa"},
  {to:"/captaincy",label:"Captaincy",stat:"Captain picks",detail:"EP analysis & ownership",color:"#fb923c"},
  {to:"/fixture-difficulty",label:"FDR Heatmap",stat:"8 GWs",detail:"Fixture difficulty ratings",color:"#67e8f9"},
  {to:"/transfer-planner",label:"Transfer Planner",stat:"Plan moves",detail:"Model transfer recommendations",color:"#f87171"},
  {to:"/differentials",label:"Differentials",stat:"Low-owned",detail:"High-ceiling, low-ownership picks",color:"#f472b6"},
];

function FPLHub({ dash }) {
  const [ref, vis] = useReveal(0.04);
  const capts  = dash?.differential_captains?.captains?.slice(0,4) ?? [];
  const trends = dash?.trending_players?.items?.slice(0,4) ?? [];

  return (
    <section className="hp6-section">
      <div className="hp6-container">
        <div ref={ref} className="hp6-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div><div className="hp6-eyebrow">— Fantasy Premier League</div><h2 className="hp6-section-title">FPL Intelligence Hub</h2></div>
          <div style={{display:"flex",alignItems:"center",gap:7,padding:"5px 14px",borderRadius:999,background:"rgba(52,211,153,.07)",border:"1px solid rgba(52,211,153,.2)"}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"#34d399",boxShadow:"0 0 8px #34d399",animation:"snLivePulse 2s ease-in-out infinite"}}/>
            <span style={{fontSize:9,fontWeight:900,color:"#34d399",letterSpacing:"0.1em",fontFamily:"var(--font-mono)"}}>8 TOOLS ACTIVE</span>
          </div>
        </div>

        <div className="hp6-fpl-layout">
          {/* Left: captain picks */}
          <div className="hp6-fpl-left">
            <div className="hp6-sub-label">Captain Picks</div>
            {capts.length>0 ? capts.map((c,i)=>(
              <div key={i} className="hp6-capt-row" style={{"--cr-rank":i}}>
                <div className="hp6-cr-rank hp4-mono">{String(i+1).padStart(2,"0")}</div>
                {c.photo&&<img src={c.photo} width={28} height={28} style={{borderRadius:"50%",objectFit:"cover",flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>}
                <div style={{flex:1,minWidth:0}}>
                  <div className="hp6-cr-name">{c.name||c.web_name}</div>
                  <div className="hp6-cr-meta">{c.next_opp||""} · {c.ownership!=null?Number(c.ownership).toFixed(1):"?"}% owned</div>
                </div>
                <div className="hp6-cr-ep hp4-mono">{c.ep_next!=null?Number(c.ep_next).toFixed(1):"??"}</div>
                <div className="hp6-cr-ep-label">EP</div>
              </div>
            )) : Array.from({length:4}).map((_,i)=><div key={i} className="hp6-capt-row"><Skel w="70%" h={11}/></div>)}
          </div>

          {/* Center: animated orbit */}
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

          {/* Right: tool list */}
          <div className="hp6-fpl-right">
            <div className="hp6-sub-label">All Tools</div>
            {FPL_TOOLS.map((t,i)=>(
              <FPLToolRow key={t.to} tool={t} index={i} dash={dash}/>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FPLToolRow({ tool, index, dash }) {
  const [hov, setHov] = useState(false);
  const [ref, vis]    = useReveal(0.04);
  const capt = tool.to==="/captaincy" && dash?.differential_captains?.captains?.[0];
  const realStat = capt ? `${capt.name||capt.web_name} ${capt.ep_next!=null?Number(capt.ep_next).toFixed(1):"??"} EP` : tool.stat;
  return (
    <div ref={ref} style={{opacity:vis?1:0,transform:vis?"translateX(0)":"translateX(14px)",transition:`all .4s ease ${index*40}ms`}}>
      <Link to={tool.to} style={{textDecoration:"none"}}>
        <div className={`hp4-fpl-row ${hov?"hp4-fpl-row--hov":""}`} style={{"--fpl-color":tool.color}}
          onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
          <div className="hp4-fpl-indicator"/>
          <div className="hp4-fpl-idx hp4-mono">{String(index+1).padStart(2,"0")}</div>
          <div className="hp4-fpl-dot"/>
          <div className="hp4-fpl-content">
            <span className="hp4-fpl-label">{tool.label}</span>
            <span className={`hp4-fpl-detail ${hov?"hp4-fpl-detail--vis":""}`}>{tool.detail}</span>
          </div>
          <span className="hp4-fpl-stat">{realStat}</span>
          <div className={`hp4-fpl-arrow ${hov?"hp4-fpl-arrow--vis":""}`}>→</div>
        </div>
      </Link>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 8 — TRENDING PLAYERS
// ═══════════════════════════════════════════════════════════════
function TrendingPlayers({ dash, loading }) {
  const [ref, vis] = useReveal(0.04);
  const items = dash?.trending_players?.items ?? [];
  const xgLeaders = dash?.xg_leaders?.leaders?.slice(0,5) ?? [];
  const showable = items.length>0 ? items.slice(0,6) : xgLeaders.slice(0,6);

  return (
    <section className="hp6-section">
      <div className="hp6-container">
        <div ref={ref} className="hp6-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div><div className="hp6-eyebrow">— Players</div><h2 className="hp6-section-title">Trending Now</h2></div>
          <Link to="/player" className="hp6-see-all">Browse all →</Link>
        </div>
        <div className="hp6-player-grid">
          {loading ? Array.from({length:6}).map((_,i)=>(
            <div key={i} className="hp6-player-card"><div style={{padding:14}}><Skel w="60%" h={11}/><div style={{marginTop:8}}/><Skel w="80%" h={9}/></div></div>
          )) : showable.length>0 ? showable.map((p,i)=><PlayerCard key={i} player={p} index={i}/>)
            : <div className="hp6-empty-state" style={{gridColumn:"1/-1"}}>Loading player data…</div>}
        </div>
      </div>
    </section>
  );
}

function PlayerCard({ player, index }) {
  const nav   = useNavigate();
  const [hov, setHov] = useState(false);
  const [ref, vis]    = useReveal(0.05);
  const form = player.form||player.recent_form||"";
  const formArr = typeof form==="string"?form.split("").filter(c=>"WDL".includes(c)):(Array.isArray(form)?form:[]);
  return (
    <div ref={ref} style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:`all .4s ease ${index*45}ms`}}>
      <div className={`hp6-player-card ${hov?"hp6-player-card--hov":""}`}
        onClick={()=>nav(`/player?search=${encodeURIComponent(player.name||player.team_name||"")}`)}
        onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
        <div className="hp6-pc2-top">
          {player.photo&&<img src={player.photo} width={36} height={36} style={{borderRadius:"50%",objectFit:"cover",flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>}
          <div style={{flex:1,minWidth:0}}>
            <div className="hp6-pc2-name">{player.name||player.player_name||"Player"}</div>
            <div className="hp6-pc2-team">{player.team_name||player.team||""}</div>
          </div>
          {player.xg_per90!=null&&<div className="hp6-pc2-stat hp4-mono" style={{color:"#38bdf8"}}>{Number(player.xg_per90).toFixed(2)}<div style={{fontSize:7,color:"var(--text-dim)"}}>xG/90</div></div>}
        </div>
        {formArr.length>0&&(
          <div style={{display:"flex",gap:3,marginTop:8}}>
            {formArr.slice(-5).map((r,i)=><FormPip key={i} r={r}/>)}
          </div>
        )}
        {player.goals!=null&&(
          <div style={{display:"flex",gap:12,marginTop:8,fontSize:10,color:"var(--text-muted)"}}>
            {player.goals!=null&&<span><span className="hp4-mono" style={{color:"var(--text)",fontWeight:900}}>{player.goals}</span> G</span>}
            {player.assists!=null&&<span><span className="hp4-mono" style={{color:"var(--text)",fontWeight:900}}>{player.assists}</span> A</span>}
            {player.rating!=null&&<span>Rating <span className="hp4-mono" style={{color:"#f59e0b",fontWeight:900}}>{Number(player.rating).toFixed(1)}</span></span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 9 — WHY STATINSITE
// ═══════════════════════════════════════════════════════════════
const MODELS = [
  {name:"Dixon-Coles",desc:"Low-score corrected Poisson model with τ-adjustment",color:"#38bdf8"},
  {name:"ELO Ratings",desc:"Dynamic team strength ratings updated after every match",color:"#a78bfa"},
  {name:"xG Modelling",desc:"Expected goals derived from shot location and context",color:"#34d399"},
  {name:"Monte Carlo",desc:"8,000-run season simulation for final table probabilities",color:"#f59e0b"},
  {name:"Form Weighting",desc:"Exponentially decayed recent form with injury signal",color:"#f472b6"},
  {name:"Market Edge",desc:"Model probability vs implied odds to identify value signals",color:"#fb923c"},
];

const FACTS = [
  {val:"9",label:"Competitions"},
  {val:"500+",label:"Player Profiles"},
  {val:"8",label:"FPL Tools"},
  {val:"8K",label:"Simulations/Run"},
];

function ModelCard({ m, index }) {
  const [mref, mvis] = useReveal(0.05);
  return (
    <div ref={mref} className="hp6-model-card" style={{opacity:mvis?1:0,transform:mvis?"translateY(0)":"translateY(12px)",transition:`all .4s ease ${index*50}ms`,"--mc-color":m.color}}>
      <div className="hp6-mc-dot"/>
      <div>
        <div className="hp6-mc-name">{m.name}</div>
        <div className="hp6-mc-desc">{m.desc}</div>
      </div>
    </div>
  );
}

function FactCard({ f, index }) {
  const [fref, fvis] = useReveal(0.05);
  return (
    <div ref={fref} className="hp6-fact-card" style={{opacity:fvis?1:0,transform:fvis?"scale(1)":"scale(.9)",transition:`all .4s ease ${index*60}ms`}}>
      <div className="hp6-fact-val hp4-mono">{f.val}</div>
      <div className="hp6-fact-label">{f.label}</div>
    </div>
  );
}

function WhyStatinSite() {
  const [ref, vis] = useReveal(0.04);
  return (
    <section className="hp6-section hp6-section--last">
      <div className="hp6-container">
        <div ref={ref} className="hp6-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div><div className="hp6-eyebrow">— Platform</div><h2 className="hp6-section-title">The Intelligence Stack</h2></div>
        </div>
        <div className="hp6-why-grid">
          {/* Models */}
          <div>
            <div className="hp6-sub-label">Data Models</div>
            <div className="hp6-models-grid">
              {MODELS.map((m,i)=><ModelCard key={m.name} m={m} index={i}/>)}
            </div>
          </div>
          {/* Facts */}
          <div>
            <div className="hp6-sub-label">Platform Scale</div>
            <div className="hp6-facts-grid">
              {FACTS.map((f,i)=><FactCard key={f.label} f={f} index={i}/>)}
            </div>
            <div className="hp6-platform-note">
              All predictions use real season statistics from API-Football Pro. Model probabilities are not guaranteed outcomes.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// DIVIDER
// ═══════════════════════════════════════════════════════════════
function Div() {
  return <div style={{height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,.055),transparent)",maxWidth:1200,margin:"0 auto",padding:"0 40px"}}><div style={{height:1}}/></div>;
}

// ═══════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════
export default function HomePage() {
  const { fixtures, loading: ul } = useUpcoming();
  const { dash,     loading: dl } = useDashboard();
  return (
    <div className="hp4-root">
      <HeroSection fixtures={fixtures} upcoming_loading={ul} dash={dash} dash_loading={dl}/>
      <LivePulseStrip fixtures={fixtures}/>
      <TopPredictions dash={dash} loading={dl}/>
      <Div/>
      <EdgeBoard dash={dash} loading={dl}/>
      <Div/>
      <CommandGrid fixtures={fixtures} dash={dash} loading={dl||ul}/>
      <Div/>
      <CompetitionHub/>
      <Div/>
      <FPLHub dash={dash}/>
      <Div/>
      <TrendingPlayers dash={dash} loading={dl}/>
      <Div/>
      <WhyStatinSite/>
    </div>
  );
}