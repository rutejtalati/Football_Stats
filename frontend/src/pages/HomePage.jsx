// HomePage.jsx — Datalytics
// Premium football analytics landing page
import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

/* ─── Design tokens ──────────────────────────────────────── */
const C = {
  blue:"#4f9eff",   blueGlow:"rgba(79,158,255,0.35)",
  green:"#00e09e",  greenGlow:"rgba(0,224,158,0.28)",
  red:"#ff4d6d",    redGlow:"rgba(255,77,109,0.28)",
  gold:"#f2c94c",   goldGlow:"rgba(242,201,76,0.28)",
  purple:"#b388ff", purpleGlow:"rgba(179,136,255,0.28)",
  orange:"#ff8c42",
  panel:"rgba(12,18,30,0.95)",
  line:"rgba(255,255,255,0.07)",
  text:"#e8f0ff", muted:"#4a6a8a", soft:"#2a3f58",
};

/* ─── Animated count-up hook ─────────────────────────────── */
function useCountUp(target, duration=1800, delay=0) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const start = performance.now() + delay;
      const tick = (now) => {
        const elapsed = Math.max(0, now - start);
        const pct = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - pct, 3);
        setVal(Math.round(ease * target));
        if (pct < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration, delay]);
  return [val, ref];
}

/* ─── Stat counter tile ──────────────────────────────────── */
const StatTile = ({ value, suffix="", label, color, delay=0 }) => {
  const [v, ref] = useCountUp(value, 1600, delay);
  return (
    <div ref={ref} style={{
      display:"flex", flexDirection:"column", alignItems:"center", gap:4,
      padding:"22px 18px", borderRadius:16,
      background:"rgba(255,255,255,0.025)",
      border:"1px solid rgba(255,255,255,0.07)",
      flex:1, minWidth:0,
    }}>
      <span style={{
        fontSize:38, fontWeight:900, fontFamily:"JetBrains Mono,monospace",
        color, lineHeight:1, letterSpacing:"-0.03em",
        textShadow:`0 0 20px ${color}55`,
      }}>{v}{suffix}</span>
      <span style={{
        fontSize:10, fontWeight:700, color:C.muted,
        letterSpacing:"0.1em", textTransform:"uppercase",
        fontFamily:"Inter,sans-serif", textAlign:"center",
      }}>{label}</span>
    </div>
  );
};

/* ─── Feature card ───────────────────────────────────────── */
const FeatureCard = ({ to, color, title, subtitle, description, graphic, badge, delay=0 }) => {
  const [hov, setHov] = useState(false);
  return (
    <Link to={to}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:"flex", flexDirection:"column",
        background: hov
          ? `linear-gradient(135deg, rgba(12,18,30,0.98) 0%, ${color}0a 100%)`
          : C.panel,
        border:`1px solid ${hov ? color+"45" : C.line}`,
        borderRadius:20, overflow:"hidden",
        textDecoration:"none",
        transition:"border-color 220ms ease, background 220ms ease, transform 220ms cubic-bezier(0.22,1,0.36,1), box-shadow 220ms ease",
        transform: hov ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hov ? `0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px ${color}20` : "none",
        animationDelay: delay+"ms",
        animation: "cardIn 500ms ease both",
      }}>

      {/* Graphic area */}
      <div style={{
        height:140, position:"relative", overflow:"hidden",
        background:`linear-gradient(135deg, ${color}0d 0%, rgba(0,0,0,0) 60%)`,
        borderBottom:`1px solid ${hov ? color+"30" : C.line}`,
        transition:"border-color 220ms ease",
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        {/* Corner accent */}
        <div style={{
          position:"absolute", top:0, right:0,
          width:120, height:120,
          background:`radial-gradient(circle at 100% 0%, ${color}18 0%, transparent 65%)`,
          pointerEvents:"none",
        }}/>
        {/* Animated graphic */}
        <div style={{ position:"relative", zIndex:1 }}>{graphic}</div>
        {/* Badge */}
        {badge && (
          <div style={{
            position:"absolute", top:12, right:12,
            padding:"3px 9px", borderRadius:999,
            background:color+"20", border:`1px solid ${color}45`,
            fontSize:9, fontWeight:800, color,
            fontFamily:"Inter,sans-serif", letterSpacing:"0.07em",
          }}>{badge}</div>
        )}
      </div>

      {/* Text area */}
      <div style={{ padding:"18px 20px 20px", flex:1, display:"flex", flexDirection:"column", gap:6 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:3, height:18, borderRadius:2,
            background:color, boxShadow:`0 0 8px ${color}66`,
            flexShrink:0,
          }}/>
          <span style={{
            fontSize:16, fontWeight:800, color:C.text,
            fontFamily:"Sora,sans-serif", letterSpacing:"-0.01em",
          }}>{title}</span>
        </div>
        <p style={{
          fontSize:12, color:C.muted, margin:0, lineHeight:1.6,
          fontFamily:"Inter,sans-serif",
        }}>{description}</p>
        <div style={{
          marginTop:"auto", paddingTop:12,
          display:"flex", alignItems:"center", gap:6,
        }}>
          <span style={{
            fontSize:11, fontWeight:700, color,
            fontFamily:"Inter,sans-serif",
          }}>{subtitle}</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
            style={{ transform: hov ? "translateX(3px)" : "translateX(0)", transition:"transform 180ms ease" }}>
            <path d="M2 6h8M7 3l3 3-3 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </Link>
  );
};

/* ─── Mini pitch SVG graphic ─────────────────────────────── */
const PitchGraphic = ({ color="#4f9eff" }) => (
  <svg width="160" height="90" viewBox="0 0 160 90" fill="none">
    <rect x="2" y="2" width="156" height="86" rx="6" stroke={color} strokeWidth="1.5" strokeOpacity="0.3"/>
    <line x1="80" y1="2" x2="80" y2="88" stroke={color} strokeWidth="0.8" strokeOpacity="0.25"/>
    <circle cx="80" cy="45" r="18" stroke={color} strokeWidth="0.8" strokeOpacity="0.25"/>
    <circle cx="80" cy="45" r="2" fill={color} opacity="0.4"/>
    <rect x="2" y="28" width="22" height="34" rx="2" stroke={color} strokeWidth="0.8" strokeOpacity="0.22"/>
    <rect x="136" y="28" width="22" height="34" rx="2" stroke={color} strokeWidth="0.8" strokeOpacity="0.22"/>
    {/* Ball trail */}
    <path d="M40 55 C60 30 100 28 125 45" stroke={color} strokeWidth="1.5" strokeOpacity="0.6" strokeDasharray="4 3" strokeLinecap="round"/>
    <circle cx="125" cy="45" r="5" fill={color} opacity="0.8"/>
    <circle cx="125" cy="45" r="9" fill={color} opacity="0.18"/>
    {/* Players */}
    {[[40,55],[60,35],[60,65],[95,38],[95,60]].map(([x,y],i) => (
      <circle key={i} cx={x} cy={y} r="4" fill={color} opacity={i===0?0.9:0.35}/>
    ))}
  </svg>
);

/* ─── Bar chart graphic ──────────────────────────────────── */
const BarGraphic = ({ color="#f2c94c" }) => {
  const bars = [0.45, 0.72, 0.55, 0.88, 0.61, 0.78, 0.93];
  return (
    <svg width="160" height="90" viewBox="0 0 160 90" fill="none">
      {bars.map((h,i) => (
        <rect key={i}
          x={14 + i*21} y={88 - h*70} width="14" height={h*70}
          rx="3" fill={color} opacity={0.2 + h*0.5}/>
      ))}
      <path d="M14 60 L28 48 L49 52 L70 32 L91 40 L112 24 L133 28"
        stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8"/>
      {[28,70,112,133].map((x,i)=>(
        <circle key={i} cx={x} cy={[48,32,24,28][i]} r="3" fill={color} opacity="0.9"/>
      ))}
    </svg>
  );
};

/* ─── Player formation graphic ───────────────────────────── */
const FormationGraphic = ({ color="#00e09e" }) => {
  const positions = [
    [80,82],                    // GK
    [38,62],[62,62],[98,62],[122,62], // DEF
    [50,42],[80,36],[110,42],    // MID
    [60,16],[80,10],[100,16],    // FWD
  ];
  return (
    <svg width="160" height="90" viewBox="0 0 160 90" fill="none">
      <rect x="2" y="2" width="156" height="86" rx="6" stroke={color} strokeWidth="1" strokeOpacity="0.2"/>
      <line x1="2" y1="45" x2="158" y2="45" stroke={color} strokeWidth="0.5" strokeOpacity="0.15"/>
      <circle cx="80" cy="45" r="14" stroke={color} strokeWidth="0.5" strokeOpacity="0.15"/>
      {positions.map(([x,y],i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="5.5" fill={color} opacity={i===0?0.5:0.8}/>
          <circle cx={x} cy={y} r="9" fill={color} opacity="0.1"/>
        </g>
      ))}
      {/* Jersey number on first */}
      <text x="80" y="14" fontSize="5" fill="white" textAnchor="middle" dominantBaseline="middle" fontWeight="900">10</text>
    </svg>
  );
};

/* ─── Radar chart graphic ─────────────────────────────────── */
const RadarGraphic = ({ color="#b388ff" }) => {
  const pts = 6;
  const vals = [0.85, 0.7, 0.92, 0.65, 0.78, 0.88];
  const cx=80, cy=45, r=32;
  const poly = vals.map((v,i) => {
    const a = (i/pts)*Math.PI*2 - Math.PI/2;
    return [cx + Math.cos(a)*r*v, cy + Math.sin(a)*r*v];
  }).map(([x,y])=>`${x},${y}`).join(" ");
  const grid = [0.33,0.66,1].map(g =>
    Array.from({length:pts}).map((_,i) => {
      const a = (i/pts)*Math.PI*2 - Math.PI/2;
      return [cx + Math.cos(a)*r*g, cy + Math.sin(a)*r*g];
    }).map(([x,y])=>`${x},${y}`).join(" ")
  );
  const spokes = Array.from({length:pts}).map((_,i) => {
    const a = (i/pts)*Math.PI*2 - Math.PI/2;
    return [cx + Math.cos(a)*r, cy + Math.sin(a)*r];
  });
  return (
    <svg width="160" height="90" viewBox="0 0 160 90" fill="none">
      {grid.map((p,i) => <polygon key={i} points={p} fill="none" stroke={color} strokeWidth="0.6" strokeOpacity="0.2"/>)}
      {spokes.map(([x,y],i) => <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={color} strokeWidth="0.5" strokeOpacity="0.2"/>)}
      <polygon points={poly} fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1.5" strokeOpacity="0.8"/>
      {vals.map((v,i) => {
        const a = (i/pts)*Math.PI*2 - Math.PI/2;
        return <circle key={i} cx={cx+Math.cos(a)*r*v} cy={cy+Math.sin(a)*r*v} r="3" fill={color} opacity="0.9"/>;
      })}
    </svg>
  );
};

/* ─── Trend line graphic ─────────────────────────────────── */
const TrendGraphic = ({ color="#ff4d6d" }) => {
  const pts = [[10,70],[26,58],[42,62],[58,44],[74,38],[90,48],[106,32],[122,28],[138,18],[154,12]];
  const poly = pts.map(([x,y])=>`${x},${y}`).join(" ");
  const area = `${pts[0][0]},88 ` + poly + ` ${pts[pts.length-1][0]},88`;
  return (
    <svg width="160" height="90" viewBox="0 0 160 90" fill="none">
      {[20,40,60,80].map(y => <line key={y} x1="8" y1={y} x2="156" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.7"/>)}
      <polygon points={area} fill={color} fillOpacity="0.08"/>
      <polyline points={poly} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
      {pts.filter((_,i)=>i%3===0).map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="3" fill={color} opacity="0.8"/>
      ))}
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="5" fill={color} opacity="0.9"/>
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="9" fill={color} opacity="0.2"/>
    </svg>
  );
};

/* ─── Heatmap thumbnail ───────────────────────────────────── */
const HeatmapGraphic = ({ color="#ff8c42" }) => {
  const cells = Array.from({length:35}, (_,i) => Math.random()*0.8+0.1);
  return (
    <svg width="160" height="90" viewBox="0 0 160 90" fill="none">
      {/* Pitch outline */}
      <rect x="10" y="8" width="140" height="74" rx="4" fill="none" stroke={color} strokeWidth="0.8" strokeOpacity="0.3"/>
      {/* Heatmap cells */}
      {Array.from({length:7}).map((_,row) =>
        Array.from({length:5}).map((_,col) => {
          const v = cells[row*5+col];
          const x = 10 + col*28, y = 8 + row*10.5;
          return <rect key={row*5+col} x={x} y={y} width="28" height="10.5"
            fill={color} opacity={v*0.7} rx="1"/>;
        })
      )}
      {/* Centre line */}
      <line x1="80" y1="8" x2="80" y2="82" stroke={color} strokeWidth="0.6" strokeOpacity="0.25"/>
    </svg>
  );
};

/* ─── Feature cards data ─────────────────────────────────── */
const FEATURES = [
  {
    to:"/predictions/premier-league",
    color:C.blue,
    title:"Match Predictions",
    subtitle:"See this week's fixtures →",
    description:"AI-powered match predictions using Dixon-Coles Poisson models, Elo ratings and real xG data. Win probabilities, expected scorelines and betting edge analysis.",
    graphic:<PitchGraphic color={C.blue}/>,
    badge:"LIVE",
  },
  {
    to:"/best-team",
    color:C.green,
    title:"Best XI Builder",
    subtitle:"Build your squad →",
    description:"Find the optimal fantasy starting XI using composite scoring that weighs upcoming fixtures, form, ICT index and season PPG. Never get your transfers wrong again.",
    graphic:<FormationGraphic color={C.green}/>,
    badge:"FPL",
  },
  {
    to:"/squad-builder",
    color:C.gold,
    title:"Squad Builder",
    subtitle:"Plan transfers →",
    description:"Build and compare complete FPL squads with budget constraints. Identify the best value picks, differential choices and captain options for the next gameweek.",
    graphic:<BarGraphic color={C.gold}/>,
    badge:"FPL",
  },
  {
    to:"/player",
    color:C.purple,
    title:"Player Insight",
    subtitle:"Analyse any player →",
    description:"Deep statistical profiles for every player — goals, assists, xG, xA, minutes played, form trends and fixture difficulty across the season.",
    graphic:<RadarGraphic color={C.purple}/>,
    badge:"STATS",
  },
  {
    to:"/gameweek-insights",
    color:C.orange,
    title:"GW Insights",
    subtitle:"This gameweek →",
    description:"Fixture difficulty ratings, captain picks, differential watchlist and injury news all in one place. Know exactly who to play and who to bench.",
    graphic:<TrendGraphic color={C.orange}/>,
    badge:"FPL",
  },
  {
    to:"/fpl-table",
    color:C.red,
    title:"Player Stats",
    subtitle:"Full stats table →",
    description:"Sortable stats table for all players — filter by position, team, price. Find hidden gems and underpriced assets before your rivals do.",
    graphic:<HeatmapGraphic color={C.red}/>,
    badge:"STATS",
  },
];

/* ─── Floating particle background ───────────────────────── */
const ParticleBg = () => {
  const particles = useRef(Array.from({length:22}, (_,i) => ({
    x: Math.random()*100, y: Math.random()*100,
    size: Math.random()*1.5+0.5,
    opacity: Math.random()*0.25+0.05,
    speed: Math.random()*30+20,
    delay: Math.random()*-30,
  }))).current;
  return (
    <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
      {particles.map((p,i)=>(
        <div key={i} style={{
          position:"absolute",
          left:p.x+"%", top:p.y+"%",
          width:p.size, height:p.size,
          borderRadius:"50%",
          background:"white",
          opacity:p.opacity,
          animation:`floatParticle ${p.speed}s ${p.delay}s linear infinite`,
        }}/>
      ))}
    </div>
  );
};

/* ─── Main HomePage ──────────────────────────────────────── */
export default function HomePage() {

  return (
    <div style={{ minHeight:"100vh", background:"transparent", overflow:"hidden" }}>

      {/* ── HERO ── */}
      <section style={{
        position:"relative",
        padding:"80px 20px 72px",
        maxWidth:1200, margin:"0 auto",
        textAlign:"center",
        overflow:"hidden",
      }}>
        <ParticleBg/>

        {/* Radial glow behind headline */}
        <div style={{
          position:"absolute", top:"50%", left:"50%",
          transform:"translate(-50%,-60%)",
          width:600, height:400,
          background:"radial-gradient(ellipse, rgba(79,158,255,0.1) 0%, rgba(0,224,158,0.04) 50%, transparent 75%)",
          pointerEvents:"none",
        }}/>

        {/* Badge */}
        <div style={{
          display:"inline-flex", alignItems:"center", gap:8,
          padding:"5px 14px", borderRadius:999,
          background:"rgba(79,158,255,0.1)",
          border:"1px solid rgba(79,158,255,0.25)",
          marginBottom:24,
          animation:"fadeDown 600ms ease both",
        }}>
          <span style={{width:6,height:6,borderRadius:"50%",background:C.blue,animation:"livePulse 2s ease infinite"}}/>
          <span style={{fontSize:11,fontWeight:700,color:C.blue,letterSpacing:"0.1em",fontFamily:"Inter,sans-serif"}}>
            FOOTBALL ANALYTICS PLATFORM
          </span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize:"clamp(36px, 6vw, 72px)",
          fontWeight:900, color:"#f4f8ff",
          margin:"0 0 6px",
          fontFamily:"Sora,sans-serif",
          letterSpacing:"-0.03em",
          lineHeight:1.08,
          animation:"fadeDown 600ms 100ms ease both",
        }}>
          Where Football Meets
          <br/>
          <span style={{
            background:"linear-gradient(135deg, #4f9eff 0%, #00e09e 60%, #f2c94c 100%)",
            WebkitBackgroundClip:"text",
            WebkitTextFillColor:"transparent",
          }}>Data Science</span>
        </h1>

        {/* Subheadline */}
        <p style={{
          fontSize:"clamp(14px, 2vw, 18px)",
          color:C.muted, maxWidth:640, margin:"20px auto 0",
          lineHeight:1.7, fontFamily:"Inter,sans-serif",
          animation:"fadeDown 600ms 200ms ease both",
        }}>
          Whether you want to know <strong style={{color:"#7ab8ff"}}>who will win on Saturday</strong>,
          build the <strong style={{color:C.green}}>best FPL squad for next gameweek</strong>,
          or find out if your team is <strong style={{color:C.gold}}>worth watching</strong> —
          you've come to the right place.
        </p>

        {/* CTA buttons */}
        <div style={{
          display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap",
          marginTop:36,
          animation:"fadeDown 600ms 300ms ease both",
        }}>
          <Link to="/predictions/premier-league" style={{
            display:"inline-flex", alignItems:"center", gap:8,
            padding:"13px 28px", borderRadius:12,
            background:"linear-gradient(135deg, #3b7fd4, #1a5fad)",
            border:"1px solid rgba(79,158,255,0.4)",
            color:"#fff", fontSize:14, fontWeight:700,
            textDecoration:"none", fontFamily:"Inter,sans-serif",
            boxShadow:"0 4px 24px rgba(79,158,255,0.3)",
            transition:"transform 180ms ease, box-shadow 180ms ease",
          }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 32px rgba(79,158,255,0.45)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 4px 24px rgba(79,158,255,0.3)";}}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 14l4-6 3 2.5 3.5-5L15 2" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            This Week's Predictions
          </Link>
          <Link to="/best-team" style={{
            display:"inline-flex", alignItems:"center", gap:8,
            padding:"13px 28px", borderRadius:12,
            background:"rgba(0,224,158,0.1)",
            border:"1px solid rgba(0,224,158,0.3)",
            color:C.green, fontSize:14, fontWeight:700,
            textDecoration:"none", fontFamily:"Inter,sans-serif",
            transition:"transform 180ms ease, background 180ms ease",
          }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.background="rgba(0,224,158,0.16)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.background="rgba(0,224,158,0.1)";}}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5l1.545 3.13 3.455.502-2.5 2.437.59 3.44L8 9.25l-3.09 1.759.59-3.44L3 5.132l3.455-.502L8 1.5z" stroke={C.green} strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            Build My FPL Team
          </Link>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section style={{
        maxWidth:900, margin:"0 auto",
        padding:"0 20px 64px",
      }}>
        <div style={{
          display:"flex", gap:12, flexWrap:"wrap",
          animation:"fadeUp 600ms 400ms ease both",
        }}>
          <StatTile value={4}    suffix=" leagues"  label="Leagues Covered"   color={C.blue}   delay={0}/>
          <StatTile value={380}  suffix="+"          label="Fixtures Predicted" color={C.green}  delay={100}/>
          <StatTile value={5000} suffix="+"          label="Players Tracked"    color={C.gold}   delay={200}/>
          <StatTile value={3}    suffix=" models"   label="Prediction Models"  color={C.purple} delay={300}/>
        </div>
      </section>

      {/* ── PITCH LINE DIVIDER ── */}
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 20px 48px" }}>
        <div style={{
          height:1,
          background:"linear-gradient(90deg, transparent, rgba(79,158,255,0.3), rgba(0,224,158,0.3), transparent)",
        }}/>
      </div>

      {/* ── WHAT IS THIS? ── */}
      <section style={{ maxWidth:900, margin:"0 auto", padding:"0 20px 64px" }}>
        <div style={{
          padding:"36px 40px",
          borderRadius:24,
          background:"rgba(255,255,255,0.02)",
          border:"1px solid rgba(255,255,255,0.07)",
          position:"relative", overflow:"hidden",
        }}>
          <div style={{
            position:"absolute", top:0, right:0,
            width:300, height:200,
            background:"radial-gradient(circle at 100% 0%, rgba(79,158,255,0.07) 0%, transparent 70%)",
            pointerEvents:"none",
          }}/>
          <h2 style={{
            fontSize:22, fontWeight:900, color:"#f4f8ff",
            margin:"0 0 16px", fontFamily:"Sora,sans-serif",
            letterSpacing:"-0.02em",
          }}>
            Built for football fans who love numbers
          </h2>
          <div style={{
            display:"grid", gridTemplateColumns:"1fr 1fr", gap:20,
            fontFamily:"Inter,sans-serif",
          }}>
            {[
              ["Planning your FPL transfers?","Get data-driven squad recommendations with fixture difficulty, form ratings and projected points for the next 6 gameweeks."],
              ["Want to bet smarter?","Our Poisson + Elo model identifies where bookmakers are mispriced. See exact model vs implied odds edge for every fixture."],
              ["Wondering if Saturday is worth watching?","Predicted scorelines, expected goal totals and match style indicators tell you whether it will be a banger or a bore draw."],
              ["Just love football stats?","Deep player profiles, scoring patterns, passing accuracy, shot maps and head-to-head records across 4 top leagues."],
            ].map(([title, body], i) => (
              <div key={i} style={{ display:"flex", flexDirection:"column", gap:5 }}>
                <div style={{
                  fontSize:13, fontWeight:800, color:C.text,
                  display:"flex", alignItems:"center", gap:8,
                }}>
                  <div style={{
                    width:6, height:6, borderRadius:"50%",
                    background:[C.blue,C.gold,C.green,C.purple][i],
                    flexShrink:0,
                    boxShadow:`0 0 6px ${[C.blue,C.gold,C.green,C.purple][i]}`,
                  }}/>
                  {title}
                </div>
                <p style={{ margin:0, fontSize:12, color:C.muted, lineHeight:1.65 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE CARDS GRID ── */}
      <section style={{ maxWidth:1200, margin:"0 auto", padding:"0 20px 80px" }}>
        <div style={{ marginBottom:28, textAlign:"center" }}>
          <h2 style={{
            fontSize:24, fontWeight:900, color:"#f4f8ff",
            margin:"0 0 8px", fontFamily:"Sora,sans-serif",
            letterSpacing:"-0.02em",
          }}>Everything you need, in one place</h2>
          <p style={{
            fontSize:13, color:C.muted, margin:0,
            fontFamily:"Inter,sans-serif",
          }}>Six tools, one platform. Pick where you want to start.</p>
        </div>
        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))",
          gap:16,
        }}>
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.to} {...f} delay={i*60}/>
          ))}
        </div>
      </section>

      {/* ── LEAGUES STRIP ── */}
      <section style={{ maxWidth:1200, margin:"0 auto", padding:"0 20px 80px" }}>
        <div style={{
          padding:"28px 36px",
          borderRadius:20,
          background:"rgba(255,255,255,0.02)",
          border:"1px solid rgba(255,255,255,0.07)",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          flexWrap:"wrap", gap:20,
        }}>
          <div>
            <p style={{ margin:"0 0 4px", fontSize:11, color:C.muted, fontFamily:"Inter,sans-serif", letterSpacing:"0.1em", textTransform:"uppercase" }}>
              Covering 4 top leagues
            </p>
            <h3 style={{ margin:0, fontSize:18, fontWeight:900, color:C.text, fontFamily:"Sora,sans-serif" }}>
              Pick your league
            </h3>
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {[
              {to:"/predictions/premier-league", name:"Premier League", color:"#4f9eff",
                flag:<svg width="22" height="16" viewBox="0 0 18 13" fill="none"><rect width="18" height="13" rx="2" fill="#012169"/><path d="M0 0l18 13M18 0L0 13" stroke="white" strokeWidth="3"/><path d="M0 0l18 13M18 0L0 13" stroke="#C8102E" strokeWidth="1.8"/><path d="M9 0v13M0 6.5h18" stroke="white" strokeWidth="4"/><path d="M9 0v13M0 6.5h18" stroke="#C8102E" strokeWidth="2.4"/></svg>},
              {to:"/predictions/la-liga",        name:"La Liga",         color:"#ff6b35",
                flag:<svg width="22" height="16" viewBox="0 0 18 13" fill="none"><rect width="18" height="13" rx="2" fill="#AA151B"/><rect y="2.8" width="18" height="7.4" fill="#F1BF00"/></svg>},
              {to:"/predictions/serie-a",        name:"Serie A",          color:"#00e09e",
                flag:<svg width="22" height="16" viewBox="0 0 18 13" fill="none"><rect width="18" height="13" rx="2" fill="#009246"/><rect x="6" width="6" height="13" fill="white"/><rect x="12" width="6" height="13" fill="#CE2B37"/></svg>},
              {to:"/predictions/ligue-1",        name:"Ligue 1",          color:"#b388ff",
                flag:<svg width="22" height="16" viewBox="0 0 18 13" fill="none"><rect width="18" height="13" rx="2" fill="#002395"/><rect x="6" width="6" height="13" fill="white"/><rect x="12" width="6" height="13" fill="#ED2939"/></svg>},
            ].map(({to,name,color,flag}) => (
              <Link key={to} to={to} style={{
                display:"flex", alignItems:"center", gap:8,
                padding:"10px 18px", borderRadius:12,
                background:color+"12", border:`1.5px solid ${color}35`,
                color, fontSize:13, fontWeight:700,
                textDecoration:"none", fontFamily:"Inter,sans-serif",
                transition:"all 180ms ease",
              }}
                onMouseEnter={e=>{e.currentTarget.style.background=color+"20";e.currentTarget.style.transform="translateY(-2px)";}}
                onMouseLeave={e=>{e.currentTarget.style.background=color+"12";e.currentTarget.style.transform="";}}>
                <span style={{display:"flex",alignItems:"center",borderRadius:2,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.4)"}}>{flag}</span>
                {name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── ANIMATION EXPLANATION BOX ── */}
      <section style={{ maxWidth:900, margin:"0 auto", padding:"0 20px 80px" }}>
        <div style={{
          padding:"28px 36px",
          borderRadius:20,
          background:"rgba(255,255,255,0.02)",
          border:"1px solid rgba(255,255,255,0.07)",
          display:"flex", gap:24, alignItems:"flex-start", flexWrap:"wrap",
        }}>
          <div style={{ flex:"0 0 auto" }}>
            {/* Animated pitch mini */}
            <svg width="120" height="68" viewBox="0 0 120 68" fill="none" style={{display:"block"}}>
              <rect x="1" y="1" width="118" height="66" rx="5" fill="#0a2a10" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"/>
              <line x1="60" y1="1" x2="60" y2="67" stroke="rgba(255,255,255,0.1)" strokeWidth="0.6"/>
              <circle cx="60" cy="34" r="12" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.6"/>
              <rect x="1" y="22" width="16" height="24" rx="1" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6"/>
              <rect x="103" y="22" width="16" height="24" rx="1" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6"/>
              <path d="M30 34 C48 20 74 20 95 34" stroke="#4f9eff" strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round" opacity="0.7" style={{animation:"dashMove 2s linear infinite"}}/>
              <circle cx="95" cy="34" r="4" fill="#4f9eff" opacity="0.9">
                <animate attributeName="r" values="4;6;4" dur="1.2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.9;0.4;0.9" dur="1.2s" repeatCount="indefinite"/>
              </circle>
            </svg>
          </div>
          <div>
            <h3 style={{ margin:"0 0 8px", fontSize:15, fontWeight:800, color:C.text, fontFamily:"Sora,sans-serif" }}>
              How do our predictions work?
            </h3>
            <p style={{ margin:"0 0 10px", fontSize:12, color:C.muted, lineHeight:1.65, fontFamily:"Inter,sans-serif", maxWidth:520 }}>
              Each prediction combines three independent models: a <span style={{color:C.green,fontWeight:700}}>Dixon-Coles Poisson model</span> calibrated on real xG data, an <span style={{color:C.blue,fontWeight:700}}>Elo rating system</span> updated after every result, and a <span style={{color:C.gold,fontWeight:700}}>form-weighted scoring model</span>. Confidence scores reflect how much the three models agree.
            </p>
            <Link to="/predictions/premier-league" style={{
              display:"inline-flex", alignItems:"center", gap:6,
              fontSize:12, fontWeight:700, color:C.blue,
              textDecoration:"none", fontFamily:"Inter,sans-serif",
            }}>
              See today's predictions
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M7 3l3 3-3 3" stroke={C.blue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes fadeDown  { from{opacity:0;transform:translateY(-14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeUp    { from{opacity:0;transform:translateY(14px)}  to{opacity:1;transform:translateY(0)} }
        @keyframes cardIn    { from{opacity:0;transform:translateY(20px)}  to{opacity:1;transform:translateY(0)} }
        @keyframes livePulse { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(79,158,255,0.5)} 50%{opacity:0.7;box-shadow:0 0 0 6px transparent} }
        @keyframes floatParticle { 0%{transform:translateY(0)} 50%{transform:translateY(-20px)} 100%{transform:translateY(0)} }
        @keyframes dashMove { to{stroke-dashoffset:-14} }
        @media(max-width:640px){
          .home-grid { grid-template-columns:1fr !important; }
          .home-desc-grid { grid-template-columns:1fr !important; }
        }
      `}</style>
    </div>
  );
}