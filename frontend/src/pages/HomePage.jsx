// ═══════════════════════════════════════════════════════════════════
// StatinSite — HomePage v4 "INTELLIGENCE ENGINE"
// Premium SaaS × Sports Analytics × F1 Telemetry aesthetic
//
// Design DNA:
//   - Centered cinematic hero with telemetry grid + particle field
//   - Glassmorphic bento cards with 3D tilt on mouse move
//   - Gradient sweep button animations + click ripple
//   - Scroll-driven stagger reveals throughout
//   - Continuous idle animations (shimmer, glow pulse, orbit)
//   - Custom cursor with magnetic hover
//   - FPL tool rows that expand on hover
//   - Horizontal competition scroller with live glow states
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";

const API = "https://football-stats-lw4b.onrender.com";

// ─── Status helpers ──────────────────────────────────────────
const LIVE_SET = new Set(["1H","2H","HT","ET","BT","P"]);
const FT_SET   = new Set(["FT","AET","PEN"]);
const isToday  = d => d && new Date(d).toDateString() === new Date().toDateString();

// ─── useReveal — IntersectionObserver ────────────────────────
function useReveal(threshold = 0.08, once = true) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); if (once) io.disconnect(); } },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, vis];
}

// ─── useTilt — 3D card tilt on mousemove ─────────────────────
function useTilt(strength = 8) {
  const ref   = useRef(null);
  const [transform, setTransform] = useState("perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)");
  const [glow,      setGlow]      = useState({ x: 50, y: 50 });

  const onMove = useCallback(e => {
    const el = ref.current; if (!el) return;
    const r  = el.getBoundingClientRect();
    const x  = (e.clientX - r.left) / r.width;
    const y  = (e.clientY - r.top)  / r.height;
    const rx =  (y - 0.5) * -strength;
    const ry =  (x - 0.5) *  strength;
    setTransform(`perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.02,1.02,1.02)`);
    setGlow({ x: Math.round(x * 100), y: Math.round(y * 100) });
  }, [strength]);

  const onLeave = useCallback(() => {
    setTransform("perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)");
    setGlow({ x: 50, y: 50 });
  }, []);

  return { ref, transform, glow, onMove, onLeave };
}

// ─── CountUp ─────────────────────────────────────────────────
function CountUp({ to, suffix = "", duration = 1000 }) {
  const [val, setVal] = useState(0);
  const [ref, vis]    = useReveal(0.1);
  const started       = useRef(false);
  useEffect(() => {
    if (!vis || started.current || !to) return;
    started.current = true;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      setVal(Math.round(ease * to));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [vis, to, duration]);
  return <span ref={ref} className="hp4-mono">{val}{suffix}</span>;
}

// ─── Ripple button ────────────────────────────────────────────
function RippleBtn({ children, onClick, className = "", style = {} }) {
  const [ripples, setRipples] = useState([]);
  const handleClick = (e) => {
    const r   = e.currentTarget.getBoundingClientRect();
    const x   = e.clientX - r.left;
    const y   = e.clientY - r.top;
    const id  = Date.now();
    setRipples(prev => [...prev, { id, x, y }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 700);
    onClick?.(e);
  };
  return (
    <button className={`hp4-btn ${className}`} style={style} onClick={handleClick}>
      {children}
      {ripples.map(r => (
        <span key={r.id} className="hp4-ripple" style={{ left: r.x, top: r.y }} />
      ))}
    </button>
  );
}

// ─── Telemetry grid canvas ────────────────────────────────────
function TelemetryGrid() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    let t = 0;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const { width: W, height: H } = canvas;
      ctx.clearRect(0, 0, W, H);

      const CELL = 64;
      const cols = Math.ceil(W / CELL) + 2;
      const rows = Math.ceil(H / CELL) + 2;
      const offsetX = (t * 0.3) % CELL;
      const offsetY = (t * 0.15) % CELL;

      // Vertical lines
      for (let c = -1; c < cols; c++) {
        const x = c * CELL - offsetX;
        const alpha = 0.025 + 0.012 * Math.sin(c * 0.4 + t * 0.008);
        ctx.strokeStyle = `rgba(56,189,248,${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      // Horizontal lines
      for (let r = -1; r < rows; r++) {
        const y = r * CELL - offsetY;
        const alpha = 0.025 + 0.012 * Math.sin(r * 0.5 + t * 0.006);
        ctx.strokeStyle = `rgba(56,189,248,${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Telemetry "pulse" dots at grid intersections
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const x = c * CELL - offsetX;
          const y = r * CELL - offsetY;
          const pulse = Math.sin(c * 0.8 + r * 0.6 + t * 0.04);
          if (pulse > 0.7) {
            const alpha = (pulse - 0.7) * 0.5;
            ctx.fillStyle = `rgba(52,211,153,${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      t++;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        pointerEvents: "none", zIndex: 0,
      }}
    />
  );
}

// ─── Floating particles ───────────────────────────────────────
function Particles({ count = 28 }) {
  const particles = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    x:    Math.random() * 100,
    y:    Math.random() * 100,
    size: 1 + Math.random() * 2.5,
    dur:  8 + Math.random() * 16,
    del:  -Math.random() * 20,
    col:  i % 4 === 0 ? "56,189,248" : i % 4 === 1 ? "52,211,153" : i % 4 === 2 ? "167,139,250" : "245,158,11",
  })), [count]);

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top:  `${p.y}%`,
            width:  p.size,
            height: p.size,
            borderRadius: "50%",
            background: `rgba(${p.col},0.6)`,
            boxShadow: `0 0 ${p.size * 3}px rgba(${p.col},0.4)`,
            animation: `hp4-float ${p.dur}s ${p.del}s linear infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// HERO SECTION
// ══════════════════════════════════════════════════════════════
function HeroSection({ fixtures, loading }) {
  const nav    = useNavigate();
  const heroRef = useRef(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

  const liveCount  = fixtures.filter(f => LIVE_SET.has(f.status)).length;
  const todayCount = fixtures.filter(f => isToday(f.kickoff)).length;
  const avgConf    = useMemo(() => {
    const w = fixtures.filter(f => f.confidence);
    return w.length ? Math.round(w.reduce((s, f) => s + f.confidence, 0) / w.length) : null;
  }, [fixtures]);

  const onMove = useCallback(e => {
    const r = heroRef.current?.getBoundingClientRect();
    if (!r) return;
    setMouse({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
  }, []);

  return (
    <section className="hp4-hero" ref={heroRef} onMouseMove={onMove}>
      {/* Animated telemetry canvas */}
      <TelemetryGrid />
      {/* Floating particles */}
      <Particles count={24} />

      {/* Parallax mesh blobs */}
      <div className="hp4-hero-blob hp4-hero-blob--a" style={{
        transform: `translate(${(mouse.x - 0.5) * -35}px, ${(mouse.y - 0.5) * -28}px)`,
      }} />
      <div className="hp4-hero-blob hp4-hero-blob--b" style={{
        transform: `translate(${(mouse.x - 0.5) * 28}px, ${(mouse.y - 0.5) * 22}px)`,
      }} />
      <div className="hp4-hero-blob hp4-hero-blob--c" style={{
        transform: `translate(${(mouse.x - 0.5) * -18}px, ${(mouse.y - 0.5) * 15}px)`,
      }} />

      {/* Scan line */}
      <div className="hp4-scanline" />

      {/* Content */}
      <div className="hp4-hero-inner">

        {/* Live badge */}
        <div className="hp4-hero-badge" style={{ animationDelay: "0.05s" }}>
          {liveCount > 0 ? (
            <>
              <span className="hp4-live-dot" />
              <span className="hp4-mono hp4-hero-badge-text hp4-hero-badge-text--live">
                {liveCount} LIVE NOW
              </span>
            </>
          ) : (
            <span className="hp4-hero-badge-text">
              ELO · DIXON-COLES · REAL xG · POISSON
            </span>
          )}
        </div>

        {/* Headline */}
        <h1 className="hp4-hero-title" style={{ animationDelay: "0.12s" }}>
          Read The
          <br />
          <span className="hp4-gradient-text hp4-glow-pulse">Game.</span>
        </h1>

        {/* Sub */}
        <p className="hp4-hero-sub" style={{ animationDelay: "0.22s" }}>
          Football intelligence rebuilt from the ground up.
          Poisson models, ELO ratings, live xG tracking,
          and the deepest FPL suite on the web.
        </p>

        {/* CTA row */}
        <div className="hp4-hero-ctas" style={{ animationDelay: "0.32s" }}>
          <RippleBtn
            className={liveCount > 0 ? "hp4-btn--live" : "hp4-btn--primary"}
            onClick={() => nav("/live")}
          >
            {liveCount > 0 && <span className="hp4-live-dot hp4-live-dot--sm" />}
            {liveCount > 0 ? "Watch Live" : "Live Centre"}
            <span className="hp4-btn-sweep" />
          </RippleBtn>
          <RippleBtn className="hp4-btn--ghost" onClick={() => nav("/predictions/premier-league")}>
            Predictions
            <span className="hp4-btn-sweep" />
          </RippleBtn>
          <RippleBtn className="hp4-btn--fpl" onClick={() => nav("/best-team")}>
            FPL Tools
            <span className="hp4-btn-sweep" />
          </RippleBtn>
        </div>

        {/* Live stats strip */}
        <div className="hp4-stats-strip" style={{ animationDelay: "0.42s" }}>
          {[
            { label: "Live Now",    val: liveCount,  suffix: "",  color: "#ff4444", live: true  },
            { label: "Today",       val: todayCount, suffix: "",  color: "#38bdf8"              },
            { label: "Avg Conf",    val: avgConf,    suffix: "%", color: "#34d399"              },
          ].map(({ label, val, suffix, color, live }, i) => (
            <div key={label} className="hp4-stat-cell" style={{ "--cell-color": color }}>
              {i > 0 && <div className="hp4-stat-div" />}
              <div className="hp4-stat-inner">
                <div className="hp4-stat-val">
                  {live && val > 0 && !loading && <span className="hp4-live-dot hp4-live-dot--sm" style={{ "--dot-color": "#ff4444" }} />}
                  {loading || val == null
                    ? <span className="hp4-skel hp4-skel--num" />
                    : <CountUp to={val} suffix={suffix} duration={900} />
                  }
                </div>
                <div className="hp4-stat-label">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom scroll cue */}
      <div className="hp4-scroll-cue">
        <div className="hp4-scroll-line" />
        <div className="hp4-scroll-dot" />
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
// LIVE PULSE STRIP
// ══════════════════════════════════════════════════════════════
function LivePulseStrip({ fixtures }) {
  const nav  = useNavigate();
  const live = fixtures.filter(f => LIVE_SET.has(f.status));
  if (!live.length) return null;
  const chips = [...live, ...live, ...live];

  return (
    <div className="hp4-live-strip">
      <div className="hp4-strip-fade hp4-strip-fade--l" />
      <div
        className="hp4-strip-track"
        style={{ animationDuration: `${Math.max(live.length * 6, 18)}s` }}
      >
        {chips.map((f, i) => (
          <div
            key={i}
            className="hp4-strip-chip"
            onClick={() => nav(`/match/${f.fixture_id}`)}
          >
            <span className="hp4-live-dot hp4-live-dot--xs" />
            {f.home_logo && <img src={f.home_logo} className="hp4-chip-logo" onError={e => e.currentTarget.style.display="none"} />}
            <span className="hp4-chip-team">{f.home_team?.split(" ").slice(-1)[0]}</span>
            <span className="hp4-chip-score hp4-mono">{f.home_score ?? 0}–{f.away_score ?? 0}</span>
            {f.away_logo && <img src={f.away_logo} className="hp4-chip-logo" onError={e => e.currentTarget.style.display="none"} />}
            <span className="hp4-chip-team">{f.away_team?.split(" ").slice(-1)[0]}</span>
            {f.minute && <span className="hp4-chip-min hp4-mono">{f.minute}'</span>}
          </div>
        ))}
      </div>
      <div className="hp4-strip-fade hp4-strip-fade--r" />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ANIMATED CARD — glassmorphic 3D tilt
// ══════════════════════════════════════════════════════════════
function AnimatedCard({ children, color = "#38bdf8", className = "", style = {}, delay = 0, span = 1, tall = false }) {
  const { ref, transform, glow, onMove, onLeave } = useTilt(7);
  const [hov, setHov] = useState(false);
  const [reveal, vis] = useReveal(0.05);

  return (
    <div
      ref={reveal}
      className={`hp4-card-wrap ${className}`}
      style={{
        gridColumn: `span ${span}`,
        gridRow: tall ? "span 2" : "span 1",
        opacity:   vis ? 1 : 0,
        transform: vis ? "translateY(0)" : "translateY(22px)",
        transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
      }}
    >
      <div
        ref={ref}
        className={`hp4-card ${hov ? "hp4-card--hov" : ""}`}
        style={{
          "--card-color": color,
          transform,
          transition: "transform 0.18s ease, box-shadow 0.22s ease, border-color 0.22s ease",
          ...style,
        }}
        onMouseMove={onMove}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => { onLeave(); setHov(false); }}
      >
        {/* Inner glow that tracks mouse */}
        <div
          className="hp4-card-glow"
          style={{
            background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, ${color}22 0%, transparent 65%)`,
          }}
        />
        {/* Shimmer sweep */}
        <div className={`hp4-card-shimmer ${hov ? "hp4-card-shimmer--active" : ""}`} />
        {/* Top accent */}
        <div className="hp4-card-topbar" />
        {children}
      </div>
    </div>
  );
}

// ─── Tool card graphic SVGs ───────────────────────────────────
const GRAPHICS = {
  radar: ({ color }) => (
    <svg width="84" height="84" viewBox="0 0 84 84" fill="none">
      {[0.25,0.5,0.75,1].map((r,i) => (
        <polygon key={i} points={Array.from({length:6}).map((_,j) => {
          const a = (j/6)*Math.PI*2-Math.PI/2;
          return `${42+Math.cos(a)*r*38},${42+Math.sin(a)*r*38}`;
        }).join(" ")} fill="none" stroke={color} strokeWidth={i===3?1.2:0.6} opacity={0.15+i*0.08}/>
      ))}
      {Array.from({length:6}).map((_,j) => {
        const a=(j/6)*Math.PI*2-Math.PI/2;
        return <line key={j} x1="42" y1="42" x2={42+Math.cos(a)*38} y2={42+Math.sin(a)*38} stroke={color} strokeWidth="0.5" opacity="0.2"/>;
      })}
      <polygon
        points={[0.82,0.68,0.76,0.9,0.72,0.6].map((r,j) => {
          const a=(j/6)*Math.PI*2-Math.PI/2;
          return `${42+Math.cos(a)*r*38},${42+Math.sin(a)*r*38}`;
        }).join(" ")}
        fill={color} fillOpacity="0.12" stroke={color} strokeWidth="1.5" opacity="0.8"/>
      <circle cx="42" cy="42" r="3" fill={color} opacity="0.6"/>
    </svg>
  ),
  bars: ({ color }) => (
    <svg width="76" height="56" viewBox="0 0 76 56" fill="none">
      {[{x:3,h:22},{x:14,h:38},{x:25,h:18},{x:36,h:48},{x:47,h:30},{x:58,h:42},{x:69,h:34}].map(({x,h},i) => (
        <rect key={i} x={x} y={56-h} width="8" height={h} rx="3"
          fill={color} opacity={i===3?0.85:0.3+i*0.07}
          style={{ filter: i===3?`drop-shadow(0 0 6px ${color})`:undefined }}/>
      ))}
      <path d="M3 44 L11 28 L22 36 L36 8 L47 22 L58 14 L73 20"
        stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5"/>
    </svg>
  ),
  pitch: ({ color }) => (
    <svg width="80" height="58" viewBox="0 0 80 58" fill="none">
      <rect x="1" y="1" width="78" height="56" rx="4" stroke={color} strokeWidth="1.2" opacity="0.5"/>
      <line x1="40" y1="1" x2="40" y2="57" stroke={color} strokeWidth="0.8" opacity="0.4"/>
      <circle cx="40" cy="29" r="10" stroke={color} strokeWidth="0.8" opacity="0.4"/>
      <rect x="1" y="17" width="16" height="24" stroke={color} strokeWidth="0.8" opacity="0.4"/>
      <rect x="63" y="17" width="16" height="24" stroke={color} strokeWidth="0.8" opacity="0.4"/>
      <rect x="1" y="22" width="7" height="14" stroke={color} strokeWidth="0.8" opacity="0.3"/>
      <rect x="72" y="22" width="7" height="14" stroke={color} strokeWidth="0.8" opacity="0.3"/>
      {/* xG dots */}
      {[{x:18,y:22},{x:24,y:34},{x:56,y:18},{x:62,y:32}].map((p,i)=>(
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} opacity="0.5"
          style={{filter:`drop-shadow(0 0 4px ${color})`}}/>
      ))}
    </svg>
  ),
  star: ({ color }) => (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      {/* Outer ring */}
      <circle cx="32" cy="32" r="29" stroke={color} strokeWidth="0.6" opacity="0.12" strokeDasharray="4 3"/>
      <circle cx="32" cy="32" r="22" stroke={color} strokeWidth="0.5" opacity="0.1"/>
      <path d="M32 6l4.9 10.2 11.2 1.6L39.9 26 42 37.3 32 31.8l-10 5.5 2.1-11.3L16 17.8l11.2-1.6L32 6z"
        stroke={color} strokeWidth="1.6" strokeLinejoin="round"
        fill={color} fillOpacity="0.15"
        style={{filter:`drop-shadow(0 0 8px ${color}50)`}}/>
      {/* Small stars */}
      {[{x:12,y:48,s:0.5},{x:52,y:50,s:0.4},{x:8,y:20,s:0.35}].map((p,i)=>(
        <circle key={i} cx={p.x} cy={p.y} r={3*p.s} fill={color} opacity="0.3"/>
      ))}
    </svg>
  ),
  grid: ({ color }) => (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
      {[0,1,2,3].flatMap(r=>[0,1,2,3].map(c=>(
        <rect key={`${r}${c}`} x={c*15+1} y={r*15+1} width="12" height="12" rx="3"
          fill={color}
          fillOpacity={0.06 + (r+c)*0.04}
          stroke={color} strokeWidth="0.6" strokeOpacity="0.3"/>
      )))}
      <rect x="16" y="16" width="12" height="12" rx="3" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="1"
        style={{filter:`drop-shadow(0 0 5px ${color}50)`}}/>
    </svg>
  ),
  person: ({ color }) => (
    <svg width="56" height="66" viewBox="0 0 56 66" fill="none">
      <circle cx="28" cy="16" r="12" stroke={color} strokeWidth="1.5" opacity="0.7"
        fill={color} fillOpacity="0.08"/>
      <path d="M4 64c0-13.3 10.7-24 24-24s24 10.7 24 24" stroke={color} strokeWidth="1.5" strokeLinecap="round"
        opacity="0.7"/>
      {/* Data aura */}
      <circle cx="28" cy="16" r="18" stroke={color} strokeWidth="0.5" strokeDasharray="3 4" opacity="0.2"/>
      {/* Stats bars */}
      {[{x:8,y:50,h:8},{x:14,y:46,h:12},{x:20,y:44,h:14}].map((b,i)=>(
        <rect key={i} x={b.x} y={b.y} width="4" height={b.h} rx="2" fill={color} opacity="0.3"/>
      ))}
    </svg>
  ),
  news: ({ color }) => (
    <svg width="68" height="58" viewBox="0 0 68 58" fill="none">
      <rect x="1" y="1" width="66" height="56" rx="5" stroke={color} strokeWidth="1.2" opacity="0.4"/>
      <rect x="8" y="9" width="52" height="8" rx="3" fill={color} fillOpacity="0.4"
        style={{filter:`drop-shadow(0 0 4px ${color}50)`}}/>
      <rect x="8" y="24" width="36" height="3" rx="1.5" fill={color} fillOpacity="0.25"/>
      <rect x="8" y="31" width="44" height="3" rx="1.5" fill={color} fillOpacity="0.2"/>
      <rect x="8" y="38" width="28" height="3" rx="1.5" fill={color} fillOpacity="0.15"/>
      <rect x="8" y="45" width="38" height="3" rx="1.5" fill={color} fillOpacity="0.12"/>
    </svg>
  ),
  game: ({ color }) => (
    <svg width="70" height="54" viewBox="0 0 70 54" fill="none">
      <rect x="1" y="7" width="68" height="40" rx="10" stroke={color} strokeWidth="1.4" opacity="0.6"/>
      <circle cx="20" cy="27" r="9" stroke={color} strokeWidth="1" opacity="0.5"/>
      <line x1="16" y1="27" x2="24" y2="27" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.7"/>
      <line x1="20" y1="23" x2="20" y2="31" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.7"/>
      <circle cx="50" cy="22" r="3.5" fill={color} opacity="0.6" style={{filter:`drop-shadow(0 0 4px ${color})`}}/>
      <circle cx="59" cy="30" r="3.5" fill={color} opacity="0.4"/>
      <circle cx="41" cy="30" r="3.5" fill={color} opacity="0.3"/>
      <circle cx="50" cy="38" r="3.5" fill={color} opacity="0.25"/>
    </svg>
  ),
};

// ─── Tool config ─────────────────────────────────────────────
const TOOLS = [
  { to:"/live",                      label:"Live Centre",  sub:"Real-time scores · Minute tracking",   color:"#ff4444", span:2, tall:true,  gfx:"radar"  },
  { to:"/predictions/premier-league",label:"Predictions",  sub:"Dixon-Coles · ELO · xG models",       color:"#38bdf8", span:1, tall:false, gfx:"bars"   },
  { to:"/match/0",                   label:"Match Hub",    sub:"Lineups · H2H · Injuries · xG",        color:"#a78bfa", span:1, tall:false, gfx:"pitch"  },
  { to:"/best-team",                 label:"FPL Best XI",  sub:"Optimal starting lineup",              color:"#34d399", span:1, tall:true,  gfx:"star"   },
  { to:"/squad-builder",             label:"Squad Builder",sub:"Build your 15-man squad",              color:"#34d399", span:1, tall:false, gfx:"grid"   },
  { to:"/player",                    label:"Players",      sub:"500+ profiles · xG · FPL stats",       color:"#f59e0b", span:1, tall:false, gfx:"person" },
  { to:"/news",                      label:"News",         sub:"Transfers · Injuries · Updates",       color:"#f472b6", span:1, tall:false, gfx:"news"   },
  { to:"/games",                     label:"Mini Games",   sub:"Score predictor · Quizzes",            color:"#fb923c", span:1, tall:false, gfx:"game"   },
];

// ══════════════════════════════════════════════════════════════
// TOOL GRID — bento layout
// ══════════════════════════════════════════════════════════════
function ToolGrid() {
  const [ref, vis] = useReveal(0.04);
  return (
    <section className="hp4-section">
      <div className="hp4-container">
        <div ref={ref} className="hp4-section-head" style={{ opacity: vis?1:0, transform: vis?"translateY(0)":"translateY(14px)", transition:"all 0.5s ease" }}>
          <div className="hp4-eyebrow">— Platform</div>
          <h2 className="hp4-section-title">Every tool, one platform.</h2>
          <span className="hp4-section-count">8 tools</span>
        </div>
        <div className="hp4-bento">
          {TOOLS.map((t, i) => {
            const Gfx = GRAPHICS[t.gfx];
            return (
              <AnimatedCard key={t.to} color={t.color} span={t.span} tall={t.tall} delay={i * 55}>
                <Link to={t.to} className="hp4-card-link">
                  <div className="hp4-card-icon-wrap" style={{ "--icon-color": t.color }}>
                    <div className="hp4-card-icon-dot" />
                  </div>
                  <div className="hp4-card-body">
                    <div className="hp4-card-title">{t.label}</div>
                    <div className="hp4-card-sub">{t.sub}</div>
                  </div>
                  <div className="hp4-card-cta">
                    Open
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="hp4-card-arrow">
                      <path d="M2 5h6M5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  {/* Background graphic */}
                  <div className="hp4-card-gfx">
                    {Gfx && <Gfx color={t.color} />}
                  </div>
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
// TODAY'S SLATE — horizontal scroll fixtures
// ══════════════════════════════════════════════════════════════
function ProbSemiCircle({ home, color }) {
  const r = 26, len = Math.PI * r;
  const dash = (home / 100) * len;
  return (
    <svg width="60" height="36" viewBox="-2 -2 64 34" style={{ overflow:"visible" }}>
      <path d={`M2 32 A28 28 0 0 1 58 32`} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5"/>
      <path d={`M2 32 A28 28 0 0 1 58 32`} fill="none"
        stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${len - dash}`}
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 5px ${color}70)`, transition: "stroke-dasharray 0.8s ease" }}/>
      <text x="30" y="27" textAnchor="middle" fontSize="9" fontWeight="900" fill={color}
        fontFamily="'JetBrains Mono',monospace">{home}%</text>
    </svg>
  );
}

function FixtureCard({ f, index }) {
  const nav = useNavigate();
  const [hov, setHov] = useState(false);
  const [ref, vis] = useReveal(0.05);
  const isLive  = LIVE_SET.has(f.status);
  const hp = Math.round((f.p_home_win || 0) * 100);
  const dp = Math.round((f.p_draw    || 0) * 100);
  const ap = Math.round((f.p_away_win || 0) * 100);
  const fav = hp > ap + 8 ? "home" : ap > hp + 8 ? "away" : null;
  const col = isLive ? "#ff4444" : "#38bdf8";

  return (
    <div
      ref={ref}
      className={`hp4-fixture-card ${hov ? "hp4-fixture-card--hov" : ""}`}
      style={{
        "--fix-color": col,
        opacity:   vis ? 1 : 0,
        transform: vis ? "translateY(0)" : "translateY(14px)",
        transition: `opacity 0.45s ease ${index * 60}ms, transform 0.45s ease ${index * 60}ms, box-shadow 0.2s, border-color 0.2s, background 0.2s`,
      }}
      onClick={() => nav(`/match/${f.fixture_id}`)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Left accent */}
      <div className="hp4-fix-accent" />

      <div className="hp4-fix-inner">
        {/* Header */}
        <div className="hp4-fix-head">
          <span className="hp4-fix-league">{f.league_name || "Match"}</span>
          {isLive ? (
            <span className="hp4-fix-live"><span className="hp4-live-dot hp4-live-dot--xs" />{f.minute ? `${f.minute}'` : "LIVE"}</span>
          ) : f.kickoff ? (
            <span className="hp4-fix-time hp4-mono">
              {new Date(f.kickoff).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
            </span>
          ) : null}
        </div>

        {/* Teams */}
        {[
          { logo: f.home_logo, name: f.home_team, score: f.home_score, win: f.home_score > f.away_score },
          { logo: f.away_logo, name: f.away_team, score: f.away_score, win: f.away_score > f.home_score },
        ].map(({ logo, name, score, win }) => (
          <div key={name} className="hp4-fix-team">
            <div className="hp4-fix-team-logo">
              {logo && <img src={logo} width={16} height={16} style={{ objectFit:"contain" }} onError={e => e.currentTarget.style.display="none"} />}
            </div>
            <span className={`hp4-fix-team-name ${win?"hp4-fix-team-name--win":""}`} title={name}>{name}</span>
            {score != null && <span className={`hp4-fix-score hp4-mono ${win?"hp4-fix-score--win":""}`}>{score}</span>}
          </div>
        ))}

        {/* Prob arc */}
        {hp > 0 && (
          <div className="hp4-fix-prob">
            <ProbSemiCircle home={hp} color={fav==="home"?"#38bdf8":fav==="away"?"#34d399":"rgba(255,255,255,0.35)"} />
            <div className="hp4-fix-prob-away">
              <span className="hp4-mono" style={{ color:"#34d399", fontSize:11, fontWeight:900 }}>{ap}%</span>
              <span style={{ fontSize:7, color:"var(--text-muted)" }}>Away</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TodaySlate({ fixtures }) {
  const [ref, vis] = useReveal(0.04);
  const pool = useMemo(() => {
    const live  = fixtures.filter(f => LIVE_SET.has(f.status));
    const today = fixtures.filter(f => isToday(f.kickoff) && !LIVE_SET.has(f.status) && !FT_SET.has(f.status));
    const seen  = new Set();
    return [...live, ...today].filter(f => {
      if (seen.has(f.fixture_id)) return false;
      seen.add(f.fixture_id); return true;
    }).slice(0, 10);
  }, [fixtures]);

  if (!pool.length) return null;

  return (
    <section className="hp4-section">
      <div className="hp4-container">
        <div ref={ref} className="hp4-section-head" style={{ opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(14px)", transition:"all 0.5s ease" }}>
          <div>
            <div className="hp4-eyebrow">— Today</div>
            <h2 className="hp4-section-title">Today's Slate</h2>
          </div>
          <Link to="/live" className="hp4-see-all">
            All fixtures
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M2 4.5h5M4.5 2l2.5 2.5L4.5 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </Link>
        </div>
        <div className="hp4-h-scroll">
          {pool.map((f, i) => <FixtureCard key={f.fixture_id} f={f} index={i} />)}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
// COMPETITION RAIL — animated hover + glow
// ══════════════════════════════════════════════════════════════
const COMPS = [
  { label:"Premier League", slug:"premier-league",   color:"#60a5fa", logo:"https://media.api-sports.io/football/leagues/39.png"  },
  { label:"La Liga",        slug:"la-liga",          color:"#fb923c", logo:"https://media.api-sports.io/football/leagues/140.png" },
  { label:"Bundesliga",     slug:"bundesliga",       color:"#f59e0b", logo:"https://media.api-sports.io/football/leagues/78.png"  },
  { label:"Serie A",        slug:"serie-a",          color:"#34d399", logo:"https://media.api-sports.io/football/leagues/135.png" },
  { label:"Ligue 1",        slug:"ligue-1",          color:"#a78bfa", logo:"https://media.api-sports.io/football/leagues/61.png"  },
  { label:"UCL",            slug:"champions-league", color:"#3b82f6", logo:"https://media.api-sports.io/football/leagues/2.png"   },
  { label:"UEL",            slug:"europa-league",    color:"#f97316", logo:"https://media.api-sports.io/football/leagues/3.png"   },
  { label:"UECL",           slug:"conference-league",color:"#22c55e", logo:"https://media.api-sports.io/football/leagues/848.png" },
  { label:"FA Cup",         slug:"fa-cup",           color:"#ef4444", logo:"https://media.api-sports.io/football/leagues/45.png"  },
];

function CompTile({ comp, index }) {
  const [hov, setHov] = useState(false);
  const [ref, vis] = useReveal(0.05);
  return (
    <div ref={ref} style={{ opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(10px)", transition:`all 0.4s ease ${index*35}ms` }}>
      <Link to={`/predictions/${comp.slug}`} style={{ textDecoration:"none" }}>
        <div
          className={`hp4-comp-tile ${hov?"hp4-comp-tile--hov":""}`}
          style={{ "--comp-color": comp.color }}
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
        >
          <div className="hp4-comp-logo-wrap">
            <img src={comp.logo} width={22} height={22} style={{ objectFit:"contain" }}
              onError={e => e.currentTarget.style.display="none"} />
          </div>
          <span className="hp4-comp-label">{comp.label}</span>
          <div className="hp4-comp-arrow">→</div>
        </div>
      </Link>
    </div>
  );
}

function CompRail() {
  const [ref, vis] = useReveal(0.04);
  return (
    <section className="hp4-section">
      <div className="hp4-container">
        <div ref={ref} className="hp4-section-head" style={{ opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(14px)", transition:"all 0.5s ease" }}>
          <div>
            <div className="hp4-eyebrow">— Competitions</div>
            <h2 className="hp4-section-title">9 competitions covered</h2>
          </div>
        </div>
        <div className="hp4-comp-grid">
          {COMPS.map((c, i) => <CompTile key={c.slug} comp={c} index={i} />)}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
// FPL COMMAND — expandable rows
// ══════════════════════════════════════════════════════════════
const FPL_TOOLS = [
  { to:"/best-team",          label:"Best XI",            stat:"Optimal 11",      detail:"Model-driven optimal starting 11 for your FPL squad",      color:"#34d399" },
  { to:"/squad-builder",      label:"Squad Builder",      stat:"15-man squad",    detail:"Build your complete squad within the £100m budget",         color:"#38bdf8" },
  { to:"/gameweek-insights",  label:"GW Insights",        stat:"This gameweek",   detail:"Fixture analysis, form ratings, and GW recommendations",    color:"#f59e0b" },
  { to:"/fpl-table",          label:"FPL Table",          stat:"Live standings",  detail:"Live leaderboard with points tracking and rank changes",     color:"#a78bfa" },
  { to:"/captaincy",          label:"Captaincy",          stat:"Captain picks",   detail:"Expected points analysis and captain ownership data",        color:"#fb923c" },
  { to:"/fixture-difficulty", label:"Fixture Difficulty", stat:"FDR heatmap",     detail:"Multi-gameweek fixture difficulty ratings as a heatmap",     color:"#67e8f9" },
  { to:"/transfer-planner",   label:"Transfer Planner",   stat:"Plan your moves", detail:"Model-backed transfer recommendations for upcoming GWs",     color:"#f87171" },
  { to:"/differentials",      label:"Differentials",      stat:"Low-owned picks", detail:"High-ceiling, low-ownership picks to beat your mini-league", color:"#f472b6" },
];

function FPLRow({ tool, index }) {
  const [hov, setHov] = useState(false);
  const [ref, vis] = useReveal(0.04);
  return (
    <div ref={ref} style={{ opacity:vis?1:0, transform:vis?"translateX(0)":"translateX(16px)", transition:`all 0.45s ease ${index*45}ms` }}>
      <Link to={tool.to} style={{ textDecoration:"none" }}>
        <div
          className={`hp4-fpl-row ${hov?"hp4-fpl-row--hov":""}`}
          style={{ "--fpl-color": tool.color }}
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
        >
          {/* Sliding left indicator */}
          <div className="hp4-fpl-indicator" />
          <div className="hp4-fpl-idx hp4-mono">{String(index+1).padStart(2,"0")}</div>
          <div className="hp4-fpl-dot" />
          <div className="hp4-fpl-content">
            <span className="hp4-fpl-label">{tool.label}</span>
            {/* Expand on hover */}
            <span className={`hp4-fpl-detail ${hov?"hp4-fpl-detail--vis":""}`}>{tool.detail}</span>
          </div>
          <span className="hp4-fpl-stat">{tool.stat}</span>
          <div className={`hp4-fpl-arrow ${hov?"hp4-fpl-arrow--vis":""}`}>→</div>
        </div>
      </Link>
    </div>
  );
}

function FPLCommand() {
  const [ref, vis] = useReveal(0.04);
  return (
    <section className="hp4-section hp4-section--last">
      <div className="hp4-container">
        <div className="hp4-fpl-layout">
          {/* Left */}
          <div ref={ref} className="hp4-fpl-left" style={{ opacity:vis?1:0, transform:vis?"translateX(0)":"translateX(-16px)", transition:"all 0.6s ease" }}>
            <div className="hp4-eyebrow">— Fantasy Premier League</div>
            <h2 className="hp4-section-title hp4-section-title--big">
              8 FPL tools.
              <br />
              <span className="hp4-gradient-text hp4-gradient-text--green">One command.</span>
            </h2>
            <p className="hp4-fpl-desc">
              From squad selection to differential hunting — every FPL decision backed by model data.
            </p>
            <div className="hp4-fpl-badge">
              <span className="hp4-fpl-badge-dot" />
              <span className="hp4-mono hp4-fpl-badge-text">FPL INTEL SUITE — 8 TOOLS</span>
            </div>
            {/* Decorative orbit */}
            <div className="hp4-fpl-orbit" aria-hidden="true">
              <div className="hp4-fpl-orbit-ring" />
              <div className="hp4-fpl-orbit-ring hp4-fpl-orbit-ring--2" />
              <div className="hp4-fpl-orbit-core" />
            </div>
          </div>

          {/* Right */}
          <div className="hp4-fpl-right">
            {FPL_TOOLS.map((t, i) => <FPLRow key={t.to} tool={t} index={i} />)}
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
  const [fixtures, setFixtures] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetch(`${API}/api/matches/upcoming`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        const raw = d.matches || d.chips || [];
        setFixtures(raw.map(c => ({
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
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="hp4-root">
      <HeroSection fixtures={fixtures} loading={loading} />
      <LivePulseStrip fixtures={fixtures} />
      <ToolGrid />
      <div className="hp4-divider-section" />
      <TodaySlate fixtures={fixtures} />
      <div className="hp4-divider-section" />
      <CompRail />
      <div className="hp4-divider-section" />
      <FPLCommand />
    </div>
  );
}