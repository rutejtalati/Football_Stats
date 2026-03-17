// ═══════════════════════════════════════════════════════════════════
// StatinSite — HomePage v5  "Live Intelligence Command Centre"
// Real data from /api/home/dashboard + /api/matches/upcoming
// ═══════════════════════════════════════════════════════════════════
//
// Data architecture:
//   useDashboard()     — single call to /api/home/dashboard
//   useUpcoming()      — /api/matches/upcoming (live + today)
//   All UI reads from these two hooks. Nothing is static.
//
// All v4 animations are preserved and enhanced with data.
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";

const API = "https://football-stats-lw4b.onrender.com";

// ─── Status sets ─────────────────────────────────────────────
const LIVE_SET = new Set(["1H","2H","HT","ET","BT","P"]);
const FT_SET   = new Set(["FT","AET","PEN"]);
const isToday  = d => d && new Date(d).toDateString() === new Date().toDateString();

// ══════════════════════════════════════════════════════════════
// DATA HOOKS
// ══════════════════════════════════════════════════════════════

function useUpcoming() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const key = "hp5_upcoming";

    // Try sessionStorage cache (3min TTL)
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const { ts, payload } = JSON.parse(raw);
        if (Date.now() - ts < 180_000) { setData(payload); setLoading(false); return; }
      }
    } catch {}

    fetch(`${API}/api/matches/upcoming`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (cancelled || !d) return;
        const raw = d.matches || d.chips || [];
        const mapped = raw.map(c => ({
          fixture_id:  c.fixture_id,
          home_team:   c.home_team,
          away_team:   c.away_team,
          home_logo:   c.home_logo,
          away_logo:   c.away_logo,
          home_score:  c.home_score ?? null,
          away_score:  c.away_score ?? null,
          status:      c.status,
          minute:      c.minute,
          kickoff:     c.kickoff || c.date,
          league_name: c.league_name || c.league,
          p_home_win:  c.p_home_win  ?? null,
          p_draw:      c.p_draw      ?? null,
          p_away_win:  c.p_away_win  ?? null,
          confidence:  c.confidence  ?? null,
        }));
        setData(mapped);
        try { sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), payload: mapped })); } catch {}
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  return { fixtures: data, loading };
}

function useDashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    const key = "hp5_dashboard";

    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const { ts, payload } = JSON.parse(raw);
        if (Date.now() - ts < 300_000) { setData(payload); setLoading(false); return; }
      }
    } catch {}

    fetch(`${API}/api/home/dashboard`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        if (cancelled) return;
        setData(d);
        try { sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), payload: d })); } catch {}
      })
      .catch(e => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  return { dash: data, loading, error };
}

// ══════════════════════════════════════════════════════════════
// UTILITY HOOKS & COMPONENTS
// ══════════════════════════════════════════════════════════════

function useReveal(threshold = 0.08) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); io.disconnect(); } },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, vis];
}

function useTilt(strength = 7) {
  const ref = useRef(null);
  const [tf, setTf] = useState("perspective(900px) rotateX(0) rotateY(0) scale3d(1,1,1)");
  const [glow, setGlow] = useState({ x: 50, y: 50 });
  const onMove = useCallback(e => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top)  / r.height;
    setTf(`perspective(900px) rotateX(${(y-0.5)*-strength}deg) rotateY(${(x-0.5)*strength}deg) scale3d(1.02,1.02,1.02)`);
    setGlow({ x: Math.round(x*100), y: Math.round(y*100) });
  }, [strength]);
  const onLeave = useCallback(() => {
    setTf("perspective(900px) rotateX(0) rotateY(0) scale3d(1,1,1)");
    setGlow({ x: 50, y: 50 });
  }, []);
  return { ref, tf, glow, onMove, onLeave };
}

function CountUp({ to, suffix = "", duration = 900 }) {
  const [v, setV] = useState(0);
  const [ref, vis] = useReveal(0.1);
  const ran = useRef(false);
  useEffect(() => {
    if (!vis || ran.current || !to) return;
    ran.current = true;
    const t0 = performance.now();
    const step = ts => {
      const p = Math.min((ts - t0) / duration, 1);
      setV(Math.round((1 - Math.pow(1-p, 4)) * to));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [vis, to, duration]);
  return <span ref={ref} className="hp4-mono">{v}{suffix}</span>;
}

function RippleBtn({ children, onClick, className = "", style = {} }) {
  const [ripples, setRipples] = useState([]);
  const handle = e => {
    const r = e.currentTarget.getBoundingClientRect();
    const id = Date.now();
    setRipples(p => [...p, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
    setTimeout(() => setRipples(p => p.filter(r => r.id !== id)), 700);
    onClick?.(e);
  };
  return (
    <button className={`hp4-btn ${className}`} style={style} onClick={handle}>
      {children}
      {ripples.map(r => <span key={r.id} className="hp4-ripple" style={{ left:r.x, top:r.y }} />)}
    </button>
  );
}

// Skeleton loader
function Skel({ w = "100%", h = 16, r = 6 }) {
  return <div className="hp5-skel" style={{ width:w, height:h, borderRadius:r }} />;
}

// Form pip
function FormPip({ r }) {
  const c = r==="W"?"#34d399":r==="D"?"#f59e0b":"#f87171";
  return (
    <div style={{ width:14, height:14, borderRadius:3, background:`${c}22`, border:`1px solid ${c}50`,
      display:"flex", alignItems:"center", justifyContent:"center", fontSize:7, fontWeight:900, color:c }}>
      {r}
    </div>
  );
}

// ─── Telemetry canvas ─────────────────────────────────────────
function TelemetryGrid() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf, t = 0;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const draw = () => {
      const { width:W, height:H } = canvas;
      ctx.clearRect(0,0,W,H);
      const CELL = 64;
      const cols = Math.ceil(W/CELL)+2, rows = Math.ceil(H/CELL)+2;
      const ox = (t*0.3)%CELL, oy = (t*0.15)%CELL;
      for (let c=-1;c<cols;c++) {
        const a = 0.025+0.012*Math.sin(c*0.4+t*0.008);
        ctx.strokeStyle=`rgba(56,189,248,${a})`; ctx.lineWidth=0.5;
        ctx.beginPath(); ctx.moveTo(c*CELL-ox,0); ctx.lineTo(c*CELL-ox,H); ctx.stroke();
      }
      for (let r=-1;r<rows;r++) {
        const a = 0.025+0.012*Math.sin(r*0.5+t*0.006);
        ctx.strokeStyle=`rgba(56,189,248,${a})`; ctx.lineWidth=0.5;
        ctx.beginPath(); ctx.moveTo(0,r*CELL-oy); ctx.lineTo(W,r*CELL-oy); ctx.stroke();
      }
      for (let c=0;c<cols;c++) for (let r=0;r<rows;r++) {
        const pulse = Math.sin(c*0.8+r*0.6+t*0.04);
        if (pulse>0.7) {
          ctx.fillStyle=`rgba(52,211,153,${(pulse-0.7)*0.5})`;
          ctx.beginPath(); ctx.arc(c*CELL-ox,r*CELL-oy,1.5,0,Math.PI*2); ctx.fill();
        }
      }
      t++; raf=requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize",resize); };
  },[]);
  return <canvas ref={ref} style={{ position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0 }} />;
}

function Particles({ count = 24 }) {
  const ps = useMemo(() => Array.from({length:count},(_,i)=>({
    id:i, x:Math.random()*100, y:Math.random()*100,
    size:1+Math.random()*2.5, dur:8+Math.random()*16, del:-Math.random()*20,
    col:i%4===0?"56,189,248":i%4===1?"52,211,153":i%4===2?"167,139,250":"245,158,11",
  })),[count]);
  return (
    <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
      {ps.map(p=>(
        <div key={p.id} style={{position:"absolute",left:`${p.x}%`,top:`${p.y}%`,
          width:p.size,height:p.size,borderRadius:"50%",
          background:`rgba(${p.col},0.6)`,boxShadow:`0 0 ${p.size*3}px rgba(${p.col},0.4)`,
          animation:`hp4-float ${p.dur}s ${p.del}s linear infinite`}}/>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// HERO — with rotating live match feature
// ══════════════════════════════════════════════════════════════
function HeroSection({ fixtures, upcoming_loading, dash, dash_loading }) {
  const nav       = useNavigate();
  const heroRef   = useRef(null);
  const [mouse,   setMouse]   = useState({ x: 0.5, y: 0.5 });
  const [featIdx, setFeatIdx] = useState(0);

  const liveCount  = fixtures.filter(f => LIVE_SET.has(f.status)).length;
  const todayCount = fixtures.filter(f => isToday(f.kickoff)).length;
  const avgConf    = dash?.model_confidence?.avg_confidence ?? null;
  const topEdge    = dash?.model_edges?.edges?.[0] ?? null;

  // Featured matches — prioritise live, then high-confidence
  const featuredMatches = useMemo(() => {
    const preds = dash?.top_predictions?.predictions ?? [];
    const live  = fixtures.filter(f => LIVE_SET.has(f.status));
    // Merge: live fixtures + top predictions
    const seen = new Set();
    const pool = [];
    live.forEach(f => { if (!seen.has(f.fixture_id)) { seen.add(f.fixture_id); pool.push({ type:"live", ...f }); } });
    preds.forEach(p => { if (p.fixture_id && !seen.has(p.fixture_id)) { seen.add(p.fixture_id); pool.push({ type:"pred", ...p }); } });
    return pool.slice(0, 5);
  }, [fixtures, dash]);

  // Rotate featured match every 4s
  useEffect(() => {
    if (featuredMatches.length < 2) return;
    const id = setInterval(() => setFeatIdx(i => (i+1) % featuredMatches.length), 4000);
    return () => clearInterval(id);
  }, [featuredMatches.length]);

  const feat = featuredMatches[featIdx];

  const onMove = useCallback(e => {
    const r = heroRef.current?.getBoundingClientRect();
    if (!r) return;
    setMouse({ x:(e.clientX-r.left)/r.width, y:(e.clientY-r.top)/r.height });
  }, []);

  return (
    <section className="hp4-hero" ref={heroRef} onMouseMove={onMove}>
      <TelemetryGrid />
      <Particles count={24} />

      {/* Parallax blobs */}
      {[
        { cls:"hp4-hero-blob hp4-hero-blob--a", dx:0.5, dy:0.4 },
        { cls:"hp4-hero-blob hp4-hero-blob--b", dx:-0.3, dy:-0.3 },
        { cls:"hp4-hero-blob hp4-hero-blob--c", dx:0.6, dy:0.5 },
      ].map(({cls,dx,dy},i) => (
        <div key={i} className={cls} style={{
          transform:`translate(calc(-50% + ${(mouse.x-0.5)*40*dx}px), calc(-50% + ${(mouse.y-0.5)*28*dy}px))`,
          transition:"transform 0.18s ease",
        }}/>
      ))}
      <div className="hp4-scanline" />

      <div className="hp4-hero-inner">
        {/* Live badge */}
        <div className="hp4-hero-badge" style={{animationDelay:"0.05s"}}>
          {liveCount>0 ? (
            <><span className="hp4-live-dot"/><span className="hp4-hero-badge-text hp4-hero-badge-text--live hp4-mono">{liveCount} LIVE NOW</span></>
          ) : (
            <span className="hp4-hero-badge-text">ELO · DIXON-COLES · REAL xG · POISSON</span>
          )}
        </div>

        {/* Headline */}
        <h1 className="hp4-hero-title" style={{animationDelay:"0.12s"}}>
          Read The<br/>
          <span className="hp4-gradient-text hp4-glow-pulse">Game.</span>
        </h1>

        {/* LIVE ROTATING FEATURE — replaces static subtitle */}
        <div className="hp5-hero-feature" style={{animationDelay:"0.2s"}}>
          {feat ? (
            <div className="hp5-feat-ticker" key={featIdx}>
              {feat.type === "live" ? (
                <>
                  <span className="hp4-live-dot hp4-live-dot--sm"/>
                  <span className="hp5-feat-text">
                    <strong style={{color:"var(--text)"}}>{feat.home_team?.split(" ").slice(-1)[0]}</strong>
                    <span className="hp5-feat-score hp4-mono"> {feat.home_score ?? 0}–{feat.away_score ?? 0} </span>
                    <strong style={{color:"var(--text)"}}>{feat.away_team?.split(" ").slice(-1)[0]}</strong>
                    {feat.minute && <span className="hp5-feat-min hp4-mono"> · {feat.minute}'</span>}
                  </span>
                </>
              ) : (
                <>
                  <span className="hp5-feat-prob" style={{background:`${(feat.homeProb>feat.awayProb?"#38bdf8":"#34d399")}18`, color:feat.homeProb>feat.awayProb?"#38bdf8":"#34d399"}}>
                    {Math.max(feat.homeProb||0,feat.awayProb||0)}%
                  </span>
                  <span className="hp5-feat-text">
                    <strong style={{color:"var(--text)"}}>{feat.homeProb>feat.awayProb?feat.home:feat.away}</strong>
                    <span style={{color:"var(--text-muted)"}}> model favourite vs </span>
                    <strong style={{color:"var(--text)"}}>{feat.homeProb>feat.awayProb?feat.away:feat.home}</strong>
                  </span>
                </>
              )}
              {/* Match dots */}
              <div className="hp5-feat-dots">
                {featuredMatches.map((_,i) => (
                  <div key={i} className={`hp5-feat-dot ${i===featIdx?"hp5-feat-dot--active":""}`}
                    onClick={()=>setFeatIdx(i)}/>
                ))}
              </div>
            </div>
          ) : (
            <p className="hp4-hero-sub">
              Football intelligence rebuilt. Poisson models, ELO ratings, live xG and the deepest FPL suite on the web.
            </p>
          )}
        </div>

        {/* CTAs */}
        <div className="hp4-hero-ctas" style={{animationDelay:"0.3s"}}>
          <RippleBtn className={liveCount>0?"hp4-btn--live":"hp4-btn--primary"} onClick={()=>nav("/live")}>
            {liveCount>0&&<span className="hp4-live-dot hp4-live-dot--sm"/>}
            {liveCount>0?"Watch Live":"Live Centre"}
            <span className="hp4-btn-sweep"/>
          </RippleBtn>
          <RippleBtn className="hp4-btn--ghost" onClick={()=>nav("/predictions/premier-league")}>
            Predictions<span className="hp4-btn-sweep"/>
          </RippleBtn>
          <RippleBtn className="hp4-btn--fpl" onClick={()=>nav("/best-team")}>
            FPL Tools<span className="hp4-btn-sweep"/>
          </RippleBtn>
        </div>

        {/* Live stats strip — real data */}
        <div className="hp4-stats-strip" style={{animationDelay:"0.42s"}}>
          {[
            { label:"Live Now",    val:liveCount,  color:"#ff4444", live:true,  loading:upcoming_loading },
            { label:"Today",       val:todayCount, color:"#38bdf8",             loading:upcoming_loading },
            { label:"Avg Conf",    val:avgConf,    color:"#34d399", suffix:"%", loading:dash_loading     },
            { label:"Top Edge",    val:topEdge?`${topEdge.edge}%`:null, color:"#a78bfa", raw:true, loading:dash_loading },
          ].map(({label,val,color,live,suffix="",loading:ld,raw},i) => (
            <div key={label} className="hp4-stat-cell" style={{"--cell-color":color}}>
              {i>0&&<div className="hp4-stat-div"/>}
              <div className="hp4-stat-inner">
                <div className="hp4-stat-val">
                  {live&&val>0&&!ld&&<span className="hp4-live-dot hp4-live-dot--sm" style={{"--dot-color":"#ff4444"}}/>}
                  {ld||val==null
                    ? <span className="hp5-skel" style={{width:32,height:24,borderRadius:4}}/>
                    : raw ? <span className="hp4-mono">{val}</span>
                          : <CountUp to={Number(val)||0} suffix={suffix} duration={900}/>
                  }
                </div>
                <div className="hp4-stat-label">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="hp4-scroll-cue">
        <div className="hp4-scroll-line"/>
        <div className="hp4-scroll-dot"/>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
// LIVE STRIP
// ══════════════════════════════════════════════════════════════
function LivePulseStrip({ fixtures }) {
  const nav  = useNavigate();
  const live = fixtures.filter(f => LIVE_SET.has(f.status));
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

// ══════════════════════════════════════════════════════════════
// MODEL INSIGHTS — real data from dashboard
// ══════════════════════════════════════════════════════════════
function InsightCard({ insight, index }) {
  const [hov, setHov] = useState(false);
  const [ref, vis]    = useReveal(0.05);
  return (
    <div ref={ref} style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(16px)",transition:`all 0.45s ease ${index*60}ms`}}>
      <div
        className={`hp5-insight-card ${hov?"hp5-insight-card--hov":""}`}
        style={{"--ins-color":insight.color}}
        onMouseEnter={()=>setHov(true)}
        onMouseLeave={()=>setHov(false)}
      >
        <div className="hp5-insight-top">
          <span className="hp5-insight-tag">{insight.tag}</span>
          <span className="hp5-insight-val hp4-mono">{insight.value}</span>
        </div>
        <div className="hp5-insight-main">{insight.text}</div>
        <div className={`hp5-insight-detail ${hov?"hp5-insight-detail--vis":""}`}>{insight.detail}</div>
        {insight.logos && (
          <div className="hp5-insight-logos">
            {insight.logos.map((l,i)=>l&&<img key={i} src={l} width={18} height={18} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>)}
          </div>
        )}
      </div>
    </div>
  );
}

function ModelInsights({ dash, loading }) {
  const [ref, vis] = useReveal(0.04);

  const insights = useMemo(() => {
    if (!dash) return [];
    const out = [];

    // Top prediction
    const topPred = dash.top_predictions?.predictions?.[0];
    if (topPred) {
      const favTeam  = topPred.homeProb > topPred.awayProb ? topPred.home : topPred.away;
      const favProb  = Math.max(topPred.homeProb||0, topPred.awayProb||0);
      out.push({
        tag: "Model Favourite",
        value: `${favProb}%`,
        text: `${favTeam} heavily favoured`,
        detail: `xG ${topPred.xg_home?.toFixed(1)}–${topPred.xg_away?.toFixed(1)} · Predicted: ${topPred.score}`,
        color: "#38bdf8",
        logos: [topPred.home_logo, topPred.away_logo],
      });
    }

    // High scoring match
    const highScoring = dash.high_scoring_matches?.matches?.[0];
    if (highScoring) {
      const totalXg = highScoring.total_xg || ((highScoring.xg_home||0)+(highScoring.xg_away||0));
      out.push({
        tag: "Goal Fest",
        value: `${totalXg.toFixed(1)} xG`,
        text: `${highScoring.home?.split(" ").slice(-1)[0]} vs ${highScoring.away?.split(" ").slice(-1)[0]} — high scoring`,
        detail: `Over 2.5 goals likely · ${highScoring.home} ${highScoring.xg_home?.toFixed(1)} xG vs ${highScoring.xg_away?.toFixed(1)} xG`,
        color: "#f59e0b",
        logos: [highScoring.home_logo, highScoring.away_logo],
      });
    }

    // Best model edge
    const topEdge = dash.model_edges?.edges?.[0];
    if (topEdge) {
      out.push({
        tag: "Model Edge",
        value: `+${topEdge.edge}%`,
        text: `${topEdge.label || topEdge.home}`,
        detail: `Model probability ${topEdge.model_prob}% vs market · ${topEdge.direction} favoured`,
        color: "#34d399",
        logos: [],
      });
    }

    // FPL captain pick
    const fplCapt = dash.differential_captains?.captains?.[0];
    if (fplCapt) {
      out.push({
        tag: "Captain Pick",
        value: `${fplCapt.ep_next?.toFixed(1) ?? "??"} EP`,
        text: `${fplCapt.name || fplCapt.web_name} — GW captain`,
        detail: `${fplCapt.ownership?.toFixed(1)||"?"}% owned · ${fplCapt.next_opp||""}`,
        color: "#a78bfa",
        logos: [],
      });
    }

    // Tactical insight
    const tact = dash.tactical_insight?.primary;
    if (tact && out.length < 5) {
      out.push({
        tag: "Tactical Signal",
        value: tact.metric_value || "Signal",
        text: tact.headline || tact.insight || "Tactical intelligence",
        detail: tact.context || tact.detail || "",
        color: "#f472b6",
        logos: [],
      });
    }

    return out.slice(0, 5);
  }, [dash]);

  const skels = [
    { w:"55%", text:"Strong home side predicted" },
    { w:"60%", text:"Goal-heavy fixture detected" },
    { w:"50%", text:"Model edge identified" },
    { w:"65%", text:"Captain signal active" },
  ];

  return (
    <section className="hp4-section">
      <div className="hp4-container">
        <div ref={ref} className="hp4-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(14px)",transition:"all 0.5s ease"}}>
          <div>
            <div className="hp4-eyebrow">— Intelligence Feed</div>
            <h2 className="hp4-section-title">What the model sees today</h2>
          </div>
          <Link to="/predictions/premier-league" className="hp4-see-all">
            Full predictions
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M2 4.5h5M4.5 2l2.5 2.5L4.5 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </Link>
        </div>

        <div className="hp5-insights-grid">
          {loading ? skels.map((s,i) => (
            <div key={i} className="hp5-insight-card" style={{"--ins-color":"rgba(255,255,255,0.06)"}}>
              <div className="hp4-stat-div" style={{width:"40%",height:8,borderRadius:4,marginBottom:8}}/>
              <div className="hp5-skel" style={{width:s.w,height:12,borderRadius:4,marginBottom:6}}/>
              <div className="hp5-skel" style={{width:"80%",height:9,borderRadius:4}}/>
            </div>
          )) : insights.map((ins, i) => <InsightCard key={i} insight={ins} index={i}/>)}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
// TOOL GRID — with real data inside cards
// ══════════════════════════════════════════════════════════════
const GRAPHICS = {
  radar: ({color})=>(
    <svg width="84" height="84" viewBox="0 0 84 84" fill="none">
      {[0.25,0.5,0.75,1].map((r,i)=>(
        <polygon key={i} points={Array.from({length:6}).map((_,j)=>{const a=(j/6)*Math.PI*2-Math.PI/2;return`${42+Math.cos(a)*r*38},${42+Math.sin(a)*r*38}`;}).join(" ")} fill="none" stroke={color} strokeWidth={i===3?1.2:0.6} opacity={0.12+i*0.08}/>
      ))}
      {Array.from({length:6}).map((_,j)=>{const a=(j/6)*Math.PI*2-Math.PI/2;return<line key={j} x1="42" y1="42" x2={42+Math.cos(a)*38} y2={42+Math.sin(a)*38} stroke={color} strokeWidth="0.5" opacity="0.18"/>;  })}
      <polygon points={[0.82,0.68,0.76,0.9,0.72,0.6].map((r,j)=>{const a=(j/6)*Math.PI*2-Math.PI/2;return`${42+Math.cos(a)*r*38},${42+Math.sin(a)*r*38}`;}).join(" ")} fill={color} fillOpacity="0.12" stroke={color} strokeWidth="1.5" opacity="0.8"/>
    </svg>
  ),
  bars: ({color})=>(
    <svg width="76" height="56" viewBox="0 0 76 56" fill="none">
      {[{x:3,h:22},{x:14,h:38},{x:25,h:18},{x:36,h:48},{x:47,h:30},{x:58,h:42},{x:69,h:34}].map(({x,h},i)=>(
        <rect key={i} x={x} y={56-h} width="8" height={h} rx="3" fill={color} opacity={i===3?0.85:0.3+i*0.07}/>
      ))}
      <path d="M3 44L11 28L22 36L36 8L47 22L58 14L73 20" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5"/>
    </svg>
  ),
  pitch: ({color})=>(
    <svg width="80" height="58" viewBox="0 0 80 58" fill="none">
      <rect x="1" y="1" width="78" height="56" rx="4" stroke={color} strokeWidth="1.2" opacity="0.5"/>
      <line x1="40" y1="1" x2="40" y2="57" stroke={color} strokeWidth="0.8" opacity="0.4"/>
      <circle cx="40" cy="29" r="10" stroke={color} strokeWidth="0.8" opacity="0.4"/>
      <rect x="1" y="17" width="16" height="24" stroke={color} strokeWidth="0.8" opacity="0.4"/>
      <rect x="63" y="17" width="16" height="24" stroke={color} strokeWidth="0.8" opacity="0.4"/>
    </svg>
  ),
  star: ({color})=>(
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="29" stroke={color} strokeWidth="0.6" opacity="0.12" strokeDasharray="4 3"/>
      <path d="M32 6l4.9 10.2 11.2 1.6-8.1 7.9 2.1 11.2L32 31.8l-10.1 5.1 2.1-11.2L16 17.8l11.2-1.6L32 6z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" fill={color} fillOpacity="0.15"/>
    </svg>
  ),
  grid: ({color})=>(
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
      {[0,1,2,3].flatMap(r=>[0,1,2,3].map(c=>(
        <rect key={`${r}${c}`} x={c*15+1} y={r*15+1} width="12" height="12" rx="3" fill={color} fillOpacity={0.06+(r+c)*0.04} stroke={color} strokeWidth="0.6" strokeOpacity="0.3"/>
      )))}
    </svg>
  ),
  person: ({color})=>(
    <svg width="56" height="66" viewBox="0 0 56 66" fill="none">
      <circle cx="28" cy="16" r="12" stroke={color} strokeWidth="1.5" opacity="0.7" fill={color} fillOpacity="0.08"/>
      <path d="M4 64c0-13.3 10.7-24 24-24s24 10.7 24 24" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
    </svg>
  ),
  news: ({color})=>(
    <svg width="68" height="58" viewBox="0 0 68 58" fill="none">
      <rect x="1" y="1" width="66" height="56" rx="5" stroke={color} strokeWidth="1.2" opacity="0.4"/>
      <rect x="8" y="9" width="52" height="8" rx="3" fill={color} fillOpacity="0.4"/>
      <rect x="8" y="24" width="36" height="3" rx="1.5" fill={color} fillOpacity="0.25"/>
      <rect x="8" y="31" width="44" height="3" rx="1.5" fill={color} fillOpacity="0.2"/>
    </svg>
  ),
  game: ({color})=>(
    <svg width="70" height="54" viewBox="0 0 70 54" fill="none">
      <rect x="1" y="7" width="68" height="40" rx="10" stroke={color} strokeWidth="1.4" opacity="0.6"/>
      <circle cx="20" cy="27" r="9" stroke={color} strokeWidth="1" opacity="0.5"/>
      <line x1="16" y1="27" x2="24" y2="27" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.7"/>
      <line x1="20" y1="23" x2="20" y2="31" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.7"/>
      <circle cx="50" cy="22" r="3.5" fill={color} opacity="0.6"/>
      <circle cx="59" cy="30" r="3.5" fill={color} opacity="0.4"/>
    </svg>
  ),
};

function AnimatedCard({ children, color="#38bdf8", span=1, tall=false, delay=0 }) {
  const { ref, tf, glow, onMove, onLeave } = useTilt(7);
  const [hov, setHov] = useState(false);
  const [rref, vis]   = useReveal(0.05);
  return (
    <div ref={rref} className="hp4-card-wrap" style={{gridColumn:`span ${span}`,gridRow:tall?"span 2":"span 1",opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(22px)",transition:`opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`}}>
      <div ref={ref} className={`hp4-card ${hov?"hp4-card--hov":""}`}
        style={{"--card-color":color, transform:tf, transition:"transform 0.18s ease,box-shadow 0.22s ease,border-color 0.22s ease"}}
        onMouseMove={onMove} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>{onLeave();setHov(false);}}>
        <div className="hp4-card-glow" style={{background:`radial-gradient(circle at ${glow.x}% ${glow.y}%,${color}22 0%,transparent 65%)`}}/>
        <div className={`hp4-card-shimmer ${hov?"hp4-card-shimmer--active":""}`}/>
        <div className="hp4-card-topbar"/>
        {children}
      </div>
    </div>
  );
}

// Tool definitions — each has a dataKey to pull from dash
const TOOLS = [
  { to:"/live",   label:"Live Centre",  sub:"Real-time scores · minute tracking",      color:"#ff4444", span:2, tall:true,  gfx:"radar",  dataKey:"live"   },
  { to:"/predictions/premier-league", label:"Predictions", sub:"Dixon-Coles · ELO · xG", color:"#38bdf8", span:1, tall:false, gfx:"bars",   dataKey:"preds"  },
  { to:"/match/0",label:"Match Hub",   sub:"Lineups · H2H · Injuries · xG",           color:"#a78bfa", span:1, tall:false, gfx:"pitch",  dataKey:null     },
  { to:"/best-team",label:"FPL Best XI",sub:"Optimal starting lineup",                color:"#34d399", span:1, tall:true,  gfx:"star",   dataKey:"fpl"    },
  { to:"/squad-builder",label:"Squad Builder",sub:"Build your 15-man squad",          color:"#34d399", span:1, tall:false, gfx:"grid",   dataKey:null     },
  { to:"/player", label:"Players",     sub:"500+ profiles · xG · FPL stats",          color:"#f59e0b", span:1, tall:false, gfx:"person", dataKey:null     },
  { to:"/news",   label:"News",        sub:"Transfers · Injuries · Updates",           color:"#f472b6", span:1, tall:false, gfx:"news",   dataKey:null     },
  { to:"/games",  label:"Mini Games",  sub:"Score predictor · Quizzes",               color:"#fb923c", span:1, tall:false, gfx:"game",   dataKey:null     },
];

function ToolCardData({ dataKey, fixtures, dash, loading }) {
  if (!dataKey) return null;

  if (dataKey === "live") {
    const liveNow = fixtures.filter(f => LIVE_SET.has(f.status));
    if (loading) return (
      <div className="hp5-card-data">
        <Skel w="70%" h={11}/><div style={{marginTop:4}}/><Skel w="55%" h={10}/>
      </div>
    );
    if (!liveNow.length) return (
      <div className="hp5-card-data">
        <span className="hp5-cd-label">{fixtures.filter(f=>isToday(f.kickoff)).length} fixtures today</span>
      </div>
    );
    return (
      <div className="hp5-card-data">
        <div className="hp5-cd-live-count hp4-mono">{liveNow.length} live now</div>
        {liveNow.slice(0,2).map(f=>(
          <div key={f.fixture_id} className="hp5-cd-live-row">
            <span className="hp4-live-dot hp4-live-dot--xs"/>
            <span className="hp5-cd-team">{f.home_team?.split(" ").slice(-1)[0]}</span>
            <span className="hp5-cd-score hp4-mono">{f.home_score??0}–{f.away_score??0}</span>
            <span className="hp5-cd-team">{f.away_team?.split(" ").slice(-1)[0]}</span>
            {f.minute&&<span className="hp5-cd-min hp4-mono">{f.minute}'</span>}
          </div>
        ))}
      </div>
    );
  }

  if (dataKey === "preds") {
    const conf = dash?.model_confidence;
    const top  = dash?.top_predictions?.predictions?.[0];
    if (loading||!dash) return (
      <div className="hp5-card-data"><Skel w="60%" h={11}/><div style={{marginTop:4}}/><Skel w="75%" h={10}/></div>
    );
    return (
      <div className="hp5-card-data">
        {conf&&<span className="hp5-cd-label">{conf.avg_confidence}% avg confidence · {conf.total} fixtures</span>}
        {top&&(
          <div className="hp5-cd-pred-row">
            {top.home_logo&&<img src={top.home_logo} width={14} height={14} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
            <span className="hp5-cd-team">{top.home?.split(" ").slice(-1)[0]}</span>
            <span className="hp5-cd-prob hp4-mono" style={{color:top.homeProb>top.awayProb?"#38bdf8":"rgba(255,255,255,0.4)"}}>{top.homeProb}%</span>
            <span style={{color:"var(--text-dim)",fontSize:9}}>vs</span>
            <span className="hp5-cd-prob hp4-mono" style={{color:top.awayProb>top.homeProb?"#34d399":"rgba(255,255,255,0.4)"}}>{top.awayProb}%</span>
            <span className="hp5-cd-team">{top.away?.split(" ").slice(-1)[0]}</span>
          </div>
        )}
      </div>
    );
  }

  if (dataKey === "fpl") {
    const capt = dash?.differential_captains?.captains?.[0];
    const xi   = dash?.top_predictions; // fallback
    if (loading||!dash) return (
      <div className="hp5-card-data"><Skel w="55%" h={11}/><div style={{marginTop:4}}/><Skel w="70%" h={10}/></div>
    );
    return (
      <div className="hp5-card-data">
        <span className="hp5-cd-label">Captain signal</span>
        {capt&&(
          <div className="hp5-cd-fpl-row">
            {capt.photo&&<img src={capt.photo} width={20} height={20} style={{borderRadius:"50%",objectFit:"cover"}} onError={e=>e.currentTarget.style.display="none"}/>}
            <span className="hp5-cd-name">{capt.name||capt.web_name}</span>
            <span className="hp5-cd-ep hp4-mono">{capt.ep_next?.toFixed(1)||"??"} EP</span>
          </div>
        )}
      </div>
    );
  }

  return null;
}

function ToolGrid({ fixtures, dash, loading }) {
  const [ref, vis] = useReveal(0.04);
  return (
    <section className="hp4-section">
      <div className="hp4-container">
        <div ref={ref} className="hp4-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(14px)",transition:"all 0.5s ease"}}>
          <div><div className="hp4-eyebrow">— Platform</div><h2 className="hp4-section-title">Every tool, one platform.</h2></div>
          <span className="hp4-section-count">8 tools</span>
        </div>
        <div className="hp4-bento">
          {TOOLS.map((t, i) => {
            const Gfx = GRAPHICS[t.gfx];
            return (
              <AnimatedCard key={t.to} color={t.color} span={t.span} tall={t.tall} delay={i*55}>
                <Link to={t.to} className="hp4-card-link">
                  <div className="hp4-card-icon-wrap" style={{"--icon-color":t.color}}>
                    <div className="hp4-card-icon-dot"/>
                  </div>
                  <div className="hp4-card-body">
                    <div className="hp4-card-title">{t.label}</div>
                    <div className="hp4-card-sub">{t.sub}</div>
                  </div>
                  {/* REAL DATA */}
                  <ToolCardData dataKey={t.dataKey} fixtures={fixtures} dash={dash} loading={loading}/>
                  <div className="hp4-card-cta">
                    Open
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="hp4-card-arrow">
                      <path d="M2 5h6M5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="hp4-card-gfx">{Gfx&&<Gfx color={t.color}/>}</div>
                </Link>
              </AnimatedCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
// TODAY'S SLATE — real fixtures with real probabilities
// ══════════════════════════════════════════════════════════════
function ProbArc({ home, color }) {
  const r = 26, len = Math.PI*r, dash = (home/100)*len;
  return (
    <svg width="60" height="36" viewBox="-2 -2 64 34" style={{overflow:"visible"}}>
      <path d="M2 32 A28 28 0 0 1 58 32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5"/>
      <path d="M2 32 A28 28 0 0 1 58 32" fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${len-dash}`} strokeLinecap="round"
        style={{filter:`drop-shadow(0 0 5px ${color}70)`,transition:"stroke-dasharray 0.8s ease"}}/>
      <text x="30" y="27" textAnchor="middle" fontSize="9" fontWeight="900" fill={color} fontFamily="'JetBrains Mono',monospace">{home}%</text>
    </svg>
  );
}

function FixtureCard({ f, index }) {
  const nav = useNavigate();
  const [hov, setHov] = useState(false);
  const [ref, vis] = useReveal(0.05);
  const isLive = LIVE_SET.has(f.status);
  const hp = Math.round((f.p_home_win||0)*100);
  const ap = Math.round((f.p_away_win||0)*100);
  const fav = hp>ap+8?"home":ap>hp+8?"away":null;
  const col = isLive?"#ff4444":"#38bdf8";

  // Form from fixture data
  const hForm = typeof f.home_form==="string" ? f.home_form.split("").filter(c=>"WDL".includes(c)) : (f.home_form||[]);
  const aForm = typeof f.away_form==="string" ? f.away_form.split("").filter(c=>"WDL".includes(c)) : (f.away_form||[]);

  return (
    <div ref={ref} className={`hp4-fixture-card ${hov?"hp4-fixture-card--hov":""}`}
      style={{"--fix-color":col,opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(14px)",transition:`opacity 0.45s ease ${index*60}ms,transform 0.45s ease ${index*60}ms,box-shadow 0.2s,border-color 0.2s,background 0.2s`}}
      onClick={()=>nav(`/match/${f.fixture_id}`)}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <div className="hp4-fix-accent"/>
      <div className="hp4-fix-inner">
        <div className="hp4-fix-head">
          <span className="hp4-fix-league">{f.league_name||f.league||"Match"}</span>
          {isLive
            ? <span className="hp4-fix-live"><span className="hp4-live-dot hp4-live-dot--xs"/>{f.minute?`${f.minute}'`:"LIVE"}</span>
            : f.kickoff
              ? <span className="hp4-fix-time hp4-mono">{new Date(f.kickoff).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
              : null
          }
        </div>
        {[
          {logo:f.home_logo,name:f.home_team,score:f.home_score,win:f.home_score>f.away_score,form:hForm},
          {logo:f.away_logo,name:f.away_team,score:f.away_score,win:f.away_score>f.home_score,form:aForm},
        ].map(({logo,name,score,win,form})=>(
          <div key={name} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
            <div className="hp4-fix-team-logo">{logo&&<img src={logo} width={16} height={16} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}</div>
            <span className={`hp4-fix-team-name ${win?"hp4-fix-team-name--win":""}`}>{name}</span>
            {hov&&form.length>0&&(
              <div style={{display:"flex",gap:2,marginLeft:"auto"}}>
                {form.slice(-3).map((r,i)=><FormPip key={i} r={r}/>)}
              </div>
            )}
            {score!=null&&<span className={`hp4-fix-score hp4-mono ${win?"hp4-fix-score--win":""}`}>{score}</span>}
          </div>
        ))}
        {hp>0&&(
          <div className="hp4-fix-prob">
            <ProbArc home={hp} color={fav==="home"?"#38bdf8":fav==="away"?"#34d399":"rgba(255,255,255,0.3)"}/>
            <div className="hp4-fix-prob-away">
              <span className="hp4-mono" style={{color:"#34d399",fontSize:11,fontWeight:900}}>{ap}%</span>
              <span style={{fontSize:7,color:"var(--text-muted)"}}>Away</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TodaySlate({ fixtures, loading }) {
  const [ref, vis] = useReveal(0.04);
  const pool = useMemo(() => {
    const live  = fixtures.filter(f=>LIVE_SET.has(f.status));
    const today = fixtures.filter(f=>isToday(f.kickoff)&&!LIVE_SET.has(f.status)&&!FT_SET.has(f.status));
    const seen  = new Set();
    return [...live,...today].filter(f=>{if(seen.has(f.fixture_id))return false;seen.add(f.fixture_id);return true;}).slice(0,10);
  }, [fixtures]);
  if (!loading && !pool.length) return null;
  return (
    <section className="hp4-section">
      <div className="hp4-container">
        <div ref={ref} className="hp4-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(14px)",transition:"all 0.5s ease"}}>
          <div><div className="hp4-eyebrow">— Today</div><h2 className="hp4-section-title">Today's Slate</h2></div>
          <Link to="/live" className="hp4-see-all">All fixtures<svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M2 4.5h5M4.5 2l2.5 2.5L4.5 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg></Link>
        </div>
        <div className="hp4-h-scroll">
          {loading ? Array.from({length:5}).map((_,i)=>(
            <div key={i} className="hp4-fixture-card" style={{flexShrink:0,width:200,"--fix-color":"#38bdf8"}}>
              <div style={{padding:"13px 14px 12px 18px"}}>
                <Skel w="60%" h={9}/><div style={{marginTop:8}}/><Skel w="90%" h={11}/><div style={{marginTop:4}}/><Skel w="80%" h={11}/>
              </div>
            </div>
          )) : pool.map((f,i)=><FixtureCard key={f.fixture_id} f={f} index={i}/>)}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
// COMPETITION RAIL
// ══════════════════════════════════════════════════════════════
const COMPS = [
  {label:"Premier League",slug:"premier-league",color:"#60a5fa",logo:"https://media.api-sports.io/football/leagues/39.png"},
  {label:"La Liga",slug:"la-liga",color:"#fb923c",logo:"https://media.api-sports.io/football/leagues/140.png"},
  {label:"Bundesliga",slug:"bundesliga",color:"#f59e0b",logo:"https://media.api-sports.io/football/leagues/78.png"},
  {label:"Serie A",slug:"serie-a",color:"#34d399",logo:"https://media.api-sports.io/football/leagues/135.png"},
  {label:"Ligue 1",slug:"ligue-1",color:"#a78bfa",logo:"https://media.api-sports.io/football/leagues/61.png"},
  {label:"UCL",slug:"champions-league",color:"#3b82f6",logo:"https://media.api-sports.io/football/leagues/2.png"},
  {label:"UEL",slug:"europa-league",color:"#f97316",logo:"https://media.api-sports.io/football/leagues/3.png"},
  {label:"UECL",slug:"conference-league",color:"#22c55e",logo:"https://media.api-sports.io/football/leagues/848.png"},
  {label:"FA Cup",slug:"fa-cup",color:"#ef4444",logo:"https://media.api-sports.io/football/leagues/45.png"},
];

function CompTile({comp,index}) {
  const [hov,setHov]=useState(false);
  const [ref,vis]=useReveal(0.05);
  return (
    <div ref={ref} style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(10px)",transition:`all 0.4s ease ${index*35}ms`}}>
      <Link to={`/predictions/${comp.slug}`} style={{textDecoration:"none"}}>
        <div className={`hp4-comp-tile ${hov?"hp4-comp-tile--hov":""}`} style={{"--comp-color":comp.color}} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
          <div className="hp4-comp-logo-wrap"><img src={comp.logo} width={22} height={22} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/></div>
          <span className="hp4-comp-label">{comp.label}</span>
          <div className="hp4-comp-arrow">→</div>
        </div>
      </Link>
    </div>
  );
}

function CompRail() {
  const [ref,vis]=useReveal(0.04);
  return (
    <section className="hp4-section">
      <div className="hp4-container">
        <div ref={ref} className="hp4-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(14px)",transition:"all 0.5s ease"}}>
          <div><div className="hp4-eyebrow">— Competitions</div><h2 className="hp4-section-title">9 competitions covered</h2></div>
        </div>
        <div className="hp4-comp-grid">{COMPS.map((c,i)=><CompTile key={c.slug} comp={c} index={i}/>)}</div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
// FPL COMMAND — real captaincy data
// ══════════════════════════════════════════════════════════════
const FPL_TOOLS = [
  {to:"/best-team",label:"Best XI",stat:"Optimal 11",detail:"Model-driven optimal starting 11 for your FPL squad",color:"#34d399"},
  {to:"/squad-builder",label:"Squad Builder",stat:"15-man squad",detail:"Build your complete squad within the £100m budget",color:"#38bdf8"},
  {to:"/gameweek-insights",label:"GW Insights",stat:"This gameweek",detail:"Fixture analysis, form ratings, and GW recommendations",color:"#f59e0b"},
  {to:"/fpl-table",label:"FPL Table",stat:"Live standings",detail:"Live leaderboard with points tracking and rank changes",color:"#a78bfa"},
  {to:"/captaincy",label:"Captaincy",stat:"Captain picks",detail:"Expected points analysis and captain ownership data",color:"#fb923c"},
  {to:"/fixture-difficulty",label:"Fixture Difficulty",stat:"FDR heatmap",detail:"Multi-GW fixture difficulty ratings as a heatmap",color:"#67e8f9"},
  {to:"/transfer-planner",label:"Transfer Planner",stat:"Plan your moves",detail:"Model-backed transfer recommendations for upcoming GWs",color:"#f87171"},
  {to:"/differentials",label:"Differentials",stat:"Low-owned picks",detail:"High-ceiling, low-ownership picks to beat your mini-league",color:"#f472b6"},
];

function FPLRow({tool,index,captData}) {
  const [hov,setHov]=useState(false);
  const [ref,vis]=useReveal(0.04);
  // Show real captain data for captaincy row
  const capt = tool.to==="/captaincy" && captData?.[0];
  const realStat = capt ? `${capt.name||capt.web_name} — ${capt.ep_next?.toFixed(1)||"??"} EP` : tool.stat;
  return (
    <div ref={ref} style={{opacity:vis?1:0,transform:vis?"translateX(0)":"translateX(16px)",transition:`all 0.45s ease ${index*45}ms`}}>
      <Link to={tool.to} style={{textDecoration:"none"}}>
        <div className={`hp4-fpl-row ${hov?"hp4-fpl-row--hov":""}`} style={{"--fpl-color":tool.color}} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
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

function FPLCommand({ dash }) {
  const [ref,vis]=useReveal(0.04);
  const captPicks = dash?.differential_captains?.captains;
  return (
    <section className="hp4-section hp4-section--last">
      <div className="hp4-container">
        <div className="hp4-fpl-layout">
          <div ref={ref} className="hp4-fpl-left" style={{opacity:vis?1:0,transform:vis?"translateX(0)":"translateX(-16px)",transition:"all 0.6s ease"}}>
            <div className="hp4-eyebrow">— Fantasy Premier League</div>
            <h2 className="hp4-section-title hp4-section-title--big">
              8 FPL tools.<br/><span className="hp4-gradient-text hp4-gradient-text--green">One command.</span>
            </h2>
            <p className="hp4-fpl-desc">From squad selection to differential hunting — every FPL decision backed by model data.</p>
            <div className="hp4-fpl-badge">
              <span className="hp4-fpl-badge-dot"/>
              <span className="hp4-mono hp4-fpl-badge-text">FPL INTEL SUITE — 8 TOOLS</span>
            </div>
            <div className="hp4-fpl-orbit" aria-hidden="true">
              <div className="hp4-fpl-orbit-ring"/>
              <div className="hp4-fpl-orbit-ring hp4-fpl-orbit-ring--2"/>
              <div className="hp4-fpl-orbit-core"/>
            </div>
          </div>
          <div className="hp4-fpl-right">
            {FPL_TOOLS.map((t,i)=><FPLRow key={t.to} tool={t} index={i} captData={captPicks}/>)}
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════
export default function HomePage() {
  const { fixtures, loading: upcoming_loading } = useUpcoming();
  const { dash,     loading: dash_loading      } = useDashboard();

  return (
    <div className="hp4-root">
      <HeroSection
        fixtures={fixtures}
        upcoming_loading={upcoming_loading}
        dash={dash}
        dash_loading={dash_loading}
      />
      <LivePulseStrip fixtures={fixtures} />
      <ModelInsights  dash={dash} loading={dash_loading} />
      <div className="hp4-divider-section" />
      <ToolGrid       fixtures={fixtures} dash={dash} loading={dash_loading||upcoming_loading} />
      <div className="hp4-divider-section" />
      <TodaySlate     fixtures={fixtures} loading={upcoming_loading} />
      <div className="hp4-divider-section" />
      <CompRail />
      <div className="hp4-divider-section" />
      <FPLCommand     dash={dash} />
    </div>
  );
}