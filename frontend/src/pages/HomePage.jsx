// ═══════════════════════════════════════════════════════════════════
// StatinSite — Homepage  ·  The Analyst's Command Centre
// ═══════════════════════════════════════════════════════════════════
//
// Sections:
//   HeroSection           — live stats, animated counters, CTA
//   LivePulseStrip        — scrolling live match scores
//   FeatureGrid           — 6 portal cards to every site section
//   TodayMatches          — featured fixtures with model edge
//   LeagueCommandStrip    — top of table + scorer per league
//   FPLCorner             — all 8 FPL tools
//   SiteExplorer          — full site map by category
//
// Data: GET /api/matches/upcoming  (with skeleton fallback)
// Routing: all links use React Router <Link> — no page reloads
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";

const BACKEND = "https://football-stats-lw4b.onrender.com";

// ─── Design tokens (mirrors index.css variables) ──────────────────
const C = {
  bg:      "#000810",
  bgCard:  "rgba(9,15,28,0.98)",
  border:  "rgba(255,255,255,0.065)",
  borderHover: "rgba(255,255,255,0.13)",
  text:    "#f0f6ff",
  muted:   "#5a7a9a",
  dim:     "#1a3a5a",
  blue:    "#38bdf8",
  green:   "#34d399",
  amber:   "#f59e0b",
  red:     "#f87171",
  redLive: "#ff4444",
  purple:  "#a78bfa",
  cyan:    "#67b1ff",
  orange:  "#fb923c",
};

// ─── Live status helpers ───────────────────────────────────────────
const LIVE_SET = new Set(["1H","2H","HT","ET","BT","P"]);
const FT_SET   = new Set(["FT","AET","PEN"]);

function isToday(iso) {
  if (!iso) return false;
  return new Date(iso).toDateString() === new Date().toDateString();
}

// ─── Intersection observer hook ───────────────────────────────────
function useInView(threshold = 0.15) {
  const ref  = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

// ─── Animated counter ─────────────────────────────────────────────
function CountUp({ target, duration = 900, suffix = "" }) {
  const [val, setVal]   = useState(0);
  const [ref, inView]   = useInView(0.2);
  const started         = useRef(false);

  useEffect(() => {
    if (!inView || started.current || !target) return;
    started.current = true;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      setVal(Math.round(ease * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target, duration]);

  return (
    <span ref={ref} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {val}{suffix}
    </span>
  );
}

// ─── Section reveal wrapper ───────────────────────────────────────
function Reveal({ children, delay = 0, style }) {
  const [ref, inView] = useInView(0.08);
  return (
    <div
      ref={ref}
      style={{
        opacity:   inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(22px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Live dot ─────────────────────────────────────────────────────
function LiveDot({ size = 6, color = C.redLive }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: "50%",
      background: color, display: "inline-block", flexShrink: 0,
      animation: "hp-pulse 1.5s ease-in-out infinite",
    }} />
  );
}

// ─── Section label ────────────────────────────────────────────────
function SectionLabel({ children, color = C.blue, accent }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
      {accent && (
        <div style={{
          width: 3, height: 20, borderRadius: 2, flexShrink: 0,
          background: `linear-gradient(180deg, ${color}, transparent)`,
        }} />
      )}
      <span style={{
        fontSize: 9, fontWeight: 900, letterSpacing: "0.16em",
        color: C.dim, textTransform: "uppercase",
        fontFamily: "'Inter', sans-serif",
      }}>
        {children}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// HERO SECTION
// ══════════════════════════════════════════════════════════════════

function HeroSection({ fixtures, loading }) {
  const containerRef = useRef(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

  const liveCount  = fixtures.filter(f => LIVE_SET.has(f.status)).length;
  const todayCount = fixtures.filter(f => isToday(f.kickoff) && !FT_SET.has(f.status)).length;
  const avgConf    = useMemo(() => {
    const withConf = fixtures.filter(f => f.confidence);
    if (!withConf.length) return null;
    return Math.round(withConf.reduce((s, f) => s + f.confidence, 0) / withConf.length);
  }, [fixtures]);

  const handleMouseMove = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMouse({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top)  / rect.height,
    });
  }, []);

  const gx = (mouse.x - 0.5) * 30;
  const gy = (mouse.y - 0.5) * 20;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      style={{
        position: "relative", overflow: "hidden",
        minHeight: "88vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "60px 24px 80px",
        background: C.bg,
      }}
    >
      {/* Ambient orbs — shift with mouse */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        transition: "transform 0.12s ease",
      }}>
        <div style={{
          position: "absolute",
          top: `calc(15% + ${gy * 0.6}px)`, left: `calc(20% + ${gx * 0.4}px)`,
          width: 700, height: 700, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(56,189,248,0.07) 0%, transparent 65%)",
          transform: `translate(-50%, -50%)`,
          transition: "top 0.15s ease, left 0.15s ease",
        }} />
        <div style={{
          position: "absolute",
          top: `calc(70% + ${gy * -0.4}px)`, left: `calc(75% + ${gx * -0.3}px)`,
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(52,211,153,0.05) 0%, transparent 65%)",
          transform: `translate(-50%, -50%)`,
          transition: "top 0.15s ease, left 0.15s ease",
        }} />
        <div style={{
          position: "absolute",
          top: `calc(40% + ${gy * 0.3}px)`, left: `calc(85% + ${gx * 0.5}px)`,
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(167,139,250,0.04) 0%, transparent 65%)",
          transform: `translate(-50%, -50%)`,
          transition: "top 0.15s ease, left 0.15s ease",
        }} />
        {/* Pitch grid texture */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.022,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }} />
        {/* Top centre glow */}
        <div style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: 900, height: 400,
          background: "radial-gradient(ellipse at 50% 0%, rgba(56,189,248,0.06) 0%, transparent 70%)",
        }} />
      </div>

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 1,
        maxWidth: 860, width: "100%",
        display: "flex", flexDirection: "column",
        alignItems: "center", textAlign: "center", gap: 0,
      }}>
        {/* Live badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 14px", borderRadius: 999, marginBottom: 28,
          background: liveCount > 0 ? "rgba(255,68,68,0.08)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${liveCount > 0 ? "rgba(255,68,68,0.2)" : "rgba(255,255,255,0.07)"}`,
          animation: "hp-fadein 0.5s ease both",
        }}>
          {liveCount > 0 ? (
            <>
              <LiveDot size={5} />
              <span style={{ fontSize: 10, fontWeight: 800, color: C.redLive, letterSpacing: "0.1em" }}>
                {liveCount} MATCH{liveCount > 1 ? "ES" : ""} LIVE NOW
              </span>
            </>
          ) : (
            <span style={{ fontSize: 10, fontWeight: 800, color: C.dim, letterSpacing: "0.1em" }}>
              FOOTBALL ANALYTICS · POWERED BY API-FOOTBALL PRO
            </span>
          )}
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: "clamp(36px, 6.5vw, 72px)",
          fontWeight: 900,
          fontFamily: "'Sora', sans-serif",
          letterSpacing: "-0.035em",
          lineHeight: 1.05,
          color: C.text,
          margin: "0 0 16px",
          animation: "hp-slideup 0.65s cubic-bezier(0.22,1,0.36,1) 0.1s both",
        }}>
          Football Intelligence,
          <br />
          <span style={{
            background: `linear-gradient(135deg, ${C.blue} 0%, ${C.cyan} 40%, ${C.green} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            Rebuilt.
          </span>
        </h1>

        {/* Subheadline */}
        <p style={{
          fontSize: "clamp(14px, 1.8vw, 18px)",
          color: C.muted,
          maxWidth: 560,
          lineHeight: 1.7,
          margin: "0 0 40px",
          animation: "hp-slideup 0.65s cubic-bezier(0.22,1,0.36,1) 0.2s both",
        }}>
          Live scores, Poisson predictions, FPL intelligence and deep match analytics
          — all in one premium platform.
        </p>

        {/* CTA row */}
        <div style={{
          display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center",
          marginBottom: 56,
          animation: "hp-slideup 0.65s cubic-bezier(0.22,1,0.36,1) 0.3s both",
        }}>
          <Link to="/live" style={{ textDecoration: "none" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "13px 26px", borderRadius: 999,
              background: `linear-gradient(135deg, ${C.blue}, rgba(56,189,248,0.7))`,
              color: "#000",
              fontSize: 13, fontWeight: 800, letterSpacing: "0.02em",
              boxShadow: `0 0 32px rgba(56,189,248,0.3), 0 4px 16px rgba(0,0,0,0.3)`,
              transition: "all 0.2s ease",
              cursor: "pointer",
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = `0 0 48px rgba(56,189,248,0.45), 0 8px 24px rgba(0,0,0,0.4)`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = `0 0 32px rgba(56,189,248,0.3), 0 4px 16px rgba(0,0,0,0.3)`;
              }}
            >
              {liveCount > 0 && <LiveDot size={5} color="#000" />}
              Enter Live Centre
            </div>
          </Link>
          <Link to="/predictions/premier-league" style={{ textDecoration: "none" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "13px 26px", borderRadius: 999,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.75)",
              fontSize: 13, fontWeight: 800, letterSpacing: "0.02em",
              transition: "all 0.2s ease",
              cursor: "pointer",
            }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.09)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
                e.currentTarget.style.color = "#fff";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                e.currentTarget.style.color = "rgba(255,255,255,0.75)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              View Predictions
            </div>
          </Link>
        </div>

        {/* Live stat counters */}
        <div style={{
          display: "flex", gap: 0,
          background: C.bgCard,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          overflow: "hidden",
          animation: "hp-slideup 0.65s cubic-bezier(0.22,1,0.36,1) 0.4s both",
          width: "100%", maxWidth: 560,
        }}>
          {[
            {
              label: "Live Now",
              value: liveCount,
              suffix: "",
              color: C.redLive,
              loading,
              icon: liveCount > 0,
            },
            {
              label: "Today's Fixtures",
              value: todayCount,
              suffix: "",
              color: C.blue,
              loading,
            },
            {
              label: "Model Confidence",
              value: avgConf,
              suffix: "%",
              color: C.green,
              loading: loading || !avgConf,
            },
          ].map(({ label, value, suffix, color, loading: l, icon }, i) => (
            <div key={label} style={{
              flex: 1,
              display: "flex", flexDirection: "column", alignItems: "center",
              padding: "18px 12px",
              borderRight: i < 2 ? `1px solid ${C.border}` : "none",
              gap: 4,
            }}>
              <div style={{
                fontSize: 28, fontWeight: 900, lineHeight: 1,
                color: l ? C.dim : color,
                fontFamily: "'JetBrains Mono', monospace",
                display: "flex", alignItems: "center", gap: 7,
              }}>
                {icon && !l && <LiveDot size={6} />}
                {l ? (
                  <div style={{ width: 36, height: 28, borderRadius: 4, background: "rgba(255,255,255,0.04)", animation: "hp-shimmer 1.4s ease infinite" }} />
                ) : (
                  <CountUp target={value || 0} suffix={suffix} />
                )}
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.dim, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Scroll cue */}
        <div style={{
          marginTop: 48,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          animation: "hp-fadeinhalf 1.2s ease 1.2s both",
        }}>
          <div style={{ width: 1, height: 40, background: `linear-gradient(180deg, transparent, ${C.dim})` }} />
          <div style={{
            width: 5, height: 5, borderRadius: "50%",
            background: C.dim, animation: "hp-bounce 1.8s ease-in-out infinite",
          }} />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// LIVE PULSE STRIP
// ══════════════════════════════════════════════════════════════════

function LivePulseStrip({ fixtures }) {
  const navigate = useNavigate();
  const live = fixtures.filter(f => LIVE_SET.has(f.status));
  if (!live.length) return null;

  const chips = [...live, ...live, ...live]; // triple for seamless scroll

  return (
    <div style={{
      background: "rgba(255,44,44,0.04)",
      borderTop: "1px solid rgba(255,44,44,0.12)",
      borderBottom: "1px solid rgba(255,44,44,0.12)",
      overflow: "hidden", position: "relative",
      height: 42,
    }}>
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 60,
        background: `linear-gradient(to right, ${C.bg}, transparent)`,
        zIndex: 2, pointerEvents: "none",
      }} />
      <div style={{
        display: "flex", alignItems: "center", height: "100%",
        animation: `hp-ticker ${live.length * 7}s linear infinite`,
        width: "max-content", gap: 0,
      }}>
        {chips.map((f, i) => (
          <div
            key={i}
            onClick={() => navigate(`/match/${f.fixture_id}`)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "0 24px", height: "100%",
              borderRight: "1px solid rgba(255,44,44,0.08)",
              cursor: "pointer", flexShrink: 0,
              transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,44,44,0.06)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <LiveDot size={5} />
            <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.55)", whiteSpace: "nowrap" }}>
              {f.home_team?.split(" ").pop()}
            </span>
            {f.home_logo && <img src={f.home_logo} width={14} height={14} style={{ objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"} />}
            <span style={{ fontSize: 13, fontWeight: 900, color: C.text, fontFamily: "'JetBrains Mono', monospace" }}>
              {f.home_score ?? 0}–{f.away_score ?? 0}
            </span>
            {f.away_logo && <img src={f.away_logo} width={14} height={14} style={{ objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"} />}
            <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.55)", whiteSpace: "nowrap" }}>
              {f.away_team?.split(" ").pop()}
            </span>
            {f.minute && (
              <span style={{ fontSize: 9, fontWeight: 900, color: C.redLive, background: "rgba(255,44,44,0.1)", padding: "2px 6px", borderRadius: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                {f.minute}'
              </span>
            )}
          </div>
        ))}
      </div>
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0, width: 60,
        background: `linear-gradient(to left, ${C.bg}, transparent)`,
        zIndex: 2, pointerEvents: "none",
      }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// FEATURE GRID — 6 portal cards
// ══════════════════════════════════════════════════════════════════

const FEATURES = [
  {
    to:      "/live",
    title:   "Live Centre",
    desc:    "Real-time scores, live match tracking and upcoming fixtures across the top 5 European leagues.",
    accent:  C.redLive,
    glow:    "rgba(255,68,68,0.12)",
    icon:    (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="4" fill="currentColor" />
        <circle cx="11" cy="11" r="7.5" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
        <circle cx="11" cy="11" r="10.5" stroke="currentColor" strokeWidth="0.8" opacity="0.15" />
      </svg>
    ),
    stat:    "liveCount",
    statLabel: "live now",
  },
  {
    to:      "/predictions/premier-league",
    title:   "Predictions",
    desc:    "Dixon-Coles Poisson model with ELO ratings. Win probabilities, xG projections, BTTS and scoreline distribution.",
    accent:  C.blue,
    glow:    "rgba(56,189,248,0.1)",
    icon:    (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M3 16l4.5-7 3.5 2.5 3.5-5.5L19 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="19" cy="7" r="2" fill="currentColor" opacity="0.7" />
      </svg>
    ),
    stat:    "todayCount",
    statLabel: "fixtures today",
  },
  {
    to:      "/match/0",
    title:   "Match Intelligence",
    desc:    "Prematch hub with expected lineups, H2H, table impact, injury reports and live match analytics.",
    accent:  C.purple,
    glow:    "rgba(167,139,250,0.1)",
    icon:    (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="2" y="3" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 8h8M7 11h5M7 14h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
        <circle cx="16" cy="14" r="2.5" fill="currentColor" opacity="0.6" />
      </svg>
    ),
    stat:    null,
    statLabel: "xG · H2H · lineups",
  },
  {
    to:      "/best-team",
    title:   "Fantasy FPL",
    desc:    "Squad builder, Best XI, GW insights, captaincy picks, differential finder and transfer planner.",
    accent:  C.green,
    glow:    "rgba(52,211,153,0.1)",
    icon:    (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 2l2.2 4.6 5.1.7-3.7 3.6.9 5-4.5-2.4L6.5 16l.9-5L3.7 7.3l5.1-.7L11 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
    stat:    null,
    statLabel: "8 FPL tools",
  },
  {
    to:      "/leagues",
    title:   "Leagues",
    desc:    "Live standings, season simulation, top scorers and assists for Premier League, La Liga, Bundesliga and more.",
    accent:  C.amber,
    glow:    "rgba(245,158,11,0.1)",
    icon:    (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="8.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M11 2.5c0 0 3.5 3.5 3.5 8.5s-3.5 8.5-3.5 8.5M11 2.5c0 0-3.5 3.5-3.5 8.5s3.5 8.5 3.5 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.6" />
        <path d="M2.5 11h17M3.5 7h15M3.5 15h15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      </svg>
    ),
    stat:    null,
    statLabel: "5 leagues · 100 clubs",
  },
  {
    to:      "/player",
    title:   "Players",
    desc:    "Browse 500+ player profiles with form ratings, FPL stats, xG per 90, captaincy scores and transfer intel.",
    accent:  C.orange,
    glow:    "rgba(251,146,60,0.1)",
    icon:    (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="7.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 19.5c0-3.9 3.1-7 7-7h0c3.9 0 7 3.1 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    stat:    null,
    statLabel: "500+ profiles",
  },
];

function FeatureCard({ feature, liveCount, todayCount, index }) {
  const [hov, setHov] = useState(false);
  const stat = feature.stat === "liveCount" ? liveCount
    : feature.stat === "todayCount" ? todayCount
    : null;

  return (
    <Reveal delay={index * 60}>
      <Link to={feature.to} style={{ textDecoration: "none", display: "block" }}>
        <div
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            position: "relative", overflow: "hidden",
            background: C.bgCard,
            border: `1px solid ${hov ? feature.accent + "40" : C.border}`,
            borderRadius: 18,
            padding: "24px 22px 20px",
            height: "100%",
            display: "flex", flexDirection: "column", gap: 14,
            boxShadow: hov
              ? `0 0 32px ${feature.glow}, 0 16px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)`
              : `0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.025)`,
            transform: hov ? "translateY(-5px)" : "translateY(0)",
            transition: "all 0.22s cubic-bezier(0.22,1,0.36,1)",
            cursor: "pointer",
          }}
        >
          {/* Top accent bar */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 2,
            background: hov ? feature.accent : "transparent",
            transition: "background 0.2s",
            borderRadius: "18px 18px 0 0",
          }} />

          {/* Ambient inner glow on hover */}
          <div style={{
            position: "absolute", bottom: -40, right: -40,
            width: 160, height: 160, borderRadius: "50%",
            background: feature.glow,
            opacity: hov ? 1 : 0,
            transition: "opacity 0.25s",
            pointerEvents: "none",
          }} />

          {/* Icon + live badge row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: `${feature.accent}18`,
              border: `1px solid ${feature.accent}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: feature.accent,
              boxShadow: hov ? `0 0 16px ${feature.accent}30` : "none",
              transition: "box-shadow 0.2s",
            }}>
              {feature.icon}
            </div>
            {stat != null ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 999,
                background: `${feature.accent}12`,
                border: `1px solid ${feature.accent}25`,
              }}>
                {feature.stat === "liveCount" && stat > 0 && <LiveDot size={4} color={feature.accent} />}
                <span style={{
                  fontSize: 10, fontWeight: 800, color: feature.accent,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {stat} {feature.statLabel}
                </span>
              </div>
            ) : (
              <span style={{
                fontSize: 9, fontWeight: 700, color: C.dim,
                background: "rgba(255,255,255,0.03)",
                border: `1px solid rgba(255,255,255,0.06)`,
                padding: "4px 9px", borderRadius: 999,
                letterSpacing: "0.06em",
              }}>
                {feature.statLabel}
              </span>
            )}
          </div>

          {/* Text */}
          <div>
            <div style={{
              fontSize: 16, fontWeight: 800, color: C.text,
              letterSpacing: "-0.01em", marginBottom: 7,
              fontFamily: "'Sora', sans-serif",
            }}>
              {feature.title}
            </div>
            <p style={{
              fontSize: 12, color: C.muted, lineHeight: 1.65, margin: 0,
            }}>
              {feature.desc}
            </p>
          </div>

          {/* Arrow */}
          <div style={{
            marginTop: "auto",
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 11, fontWeight: 700,
            color: hov ? feature.accent : C.dim,
            transition: "color 0.18s, transform 0.18s",
            transform: hov ? "translateX(3px)" : "translateX(0)",
          }}>
            Explore
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </Link>
    </Reveal>
  );
}

function FeatureGrid({ liveCount, todayCount }) {
  return (
    <section style={{ padding: "80px 24px", background: C.bg }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Reveal>
          <SectionLabel accent>What's Inside</SectionLabel>
          <h2 style={{
            fontSize: "clamp(22px, 3.5vw, 34px)",
            fontWeight: 900, fontFamily: "'Sora', sans-serif",
            letterSpacing: "-0.025em", color: C.text,
            margin: "0 0 40px",
          }}>
            Every tool you need
          </h2>
        </Reveal>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 14,
        }}>
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feature={f} liveCount={liveCount} todayCount={todayCount} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
// TODAY'S KEY MATCHES
// ══════════════════════════════════════════════════════════════════

const LEAGUE_COLORS = {
  "39":  C.blue,   "Premier League": C.blue,
  "140": C.orange, "La Liga":        C.orange,
  "78":  C.amber,  "Bundesliga":     C.amber,
  "135": C.green,  "Serie A":        C.green,
  "61":  C.purple, "Ligue 1":        C.purple,
};

function MatchTile({ fixture, index }) {
  const navigate  = useNavigate();
  const [hov, setHov] = useState(false);
  const leagueColor = LEAGUE_COLORS[String(fixture.league_id)] || LEAGUE_COLORS[fixture.league_name] || C.blue;
  const isLive = LIVE_SET.has(fixture.status);
  const hasScore = fixture.home_score != null && fixture.away_score != null;
  const hw = fixture.p_home_win;
  const dw = fixture.p_draw;
  const aw = fixture.p_away_win;
  const fav = hw && aw ? (hw > aw + 8 ? "home" : aw > hw + 8 ? "away" : null) : null;

  const insightText = () => {
    if (fixture.btts >= 0.58) return `BTTS ${Math.round(fixture.btts * 100)}%`;
    if (fixture.over_2_5 >= 0.62) return `O2.5 ${Math.round(fixture.over_2_5 * 100)}%`;
    if (fav === "home") return `${fixture.home_team?.split(" ").pop()} favoured`;
    if (fav === "away") return `${fixture.away_team?.split(" ").pop()} favoured`;
    return "Even matchup";
  };

  return (
    <Reveal delay={index * 80}>
      <div
        onClick={() => navigate(`/match/${fixture.fixture_id}`)}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          background: C.bgCard,
          border: `1px solid ${hov ? leagueColor + "40" : isLive ? "rgba(255,68,68,0.18)" : C.border}`,
          borderRadius: 16,
          padding: "18px 18px 14px",
          cursor: "pointer",
          transform: hov ? "translateY(-3px)" : "translateY(0)",
          boxShadow: hov ? `0 12px 36px rgba(0,0,0,0.45), 0 0 0 1px ${leagueColor}18` : "0 2px 12px rgba(0,0,0,0.3)",
          transition: "all 0.2s cubic-bezier(0.22,1,0.36,1)",
          position: "relative", overflow: "hidden",
        }}
      >
        {/* Left accent */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: leagueColor, borderRadius: "3px 0 0 3px", opacity: 0.8 }} />

        <div style={{ paddingLeft: 10 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              {fixture.league_logo && (
                <img src={fixture.league_logo} width={14} height={14} style={{ objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"} />
              )}
              <span style={{ fontSize: 9, fontWeight: 900, color: leagueColor, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {fixture.league_name || "League"}
              </span>
            </div>
            {isLive ? (
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, fontWeight: 900, color: C.redLive, background: "rgba(255,44,44,0.1)", padding: "2px 8px", borderRadius: 999 }}>
                <LiveDot size={4} />
                {fixture.minute ? `${fixture.minute}'` : "LIVE"}
              </span>
            ) : hasScore ? (
              <span style={{ fontSize: 9, fontWeight: 800, color: C.muted, background: "rgba(255,255,255,0.04)", padding: "2px 7px", borderRadius: 999 }}>FT</span>
            ) : fixture.kickoff ? (
              <span style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>
                {new Date(fixture.kickoff).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            ) : null}
          </div>

          {/* Teams */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {[
              { logo: fixture.home_logo, name: fixture.home_team, score: fixture.home_score, bold: hasScore && fixture.home_score > fixture.away_score },
              { logo: fixture.away_logo, name: fixture.away_team, score: fixture.away_score, bold: hasScore && fixture.away_score > fixture.home_score },
            ].map(({ logo, name, score, bold }) => (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {logo ? (
                  <img src={logo} width={18} height={18} style={{ objectFit: "contain", flexShrink: 0 }} onError={e => e.currentTarget.style.display = "none"} />
                ) : <div style={{ width: 18, height: 18, flexShrink: 0 }} />}
                <span style={{ fontSize: 12, fontWeight: bold ? 800 : 600, color: bold ? C.text : "rgba(255,255,255,0.6)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {name}
                </span>
                {hasScore && (
                  <span style={{ fontSize: 16, fontWeight: 900, color: bold ? C.text : "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace", minWidth: 16, textAlign: "center" }}>
                    {score}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Win prob bar + insight */}
          {hw != null && (
            <div style={{ borderTop: `1px solid rgba(255,255,255,0.05)`, paddingTop: 10 }}>
              <div style={{ display: "flex", height: 4, borderRadius: 999, overflow: "hidden", marginBottom: 6 }}>
                <div style={{ flex: hw, background: C.blue, opacity: 0.85 }} />
                <div style={{ flex: dw, background: "rgba(255,255,255,0.15)" }} />
                <div style={{ flex: aw, background: leagueColor, opacity: 0.85 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: C.blue, fontFamily: "'JetBrains Mono', monospace" }}>
                  {Math.round(hw * 100)}%
                </span>
                <span style={{ fontSize: 9, fontWeight: 800, color: C.green, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", padding: "2px 7px", borderRadius: 999 }}>
                  {insightText()}
                </span>
                <span style={{ fontSize: 9, fontWeight: 700, color: leagueColor, fontFamily: "'JetBrains Mono', monospace" }}>
                  {Math.round(aw * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Reveal>
  );
}

function TodayMatches({ fixtures }) {
  const featured = useMemo(() => {
    const live    = fixtures.filter(f => LIVE_SET.has(f.status));
    const today   = fixtures.filter(f => isToday(f.kickoff) && !LIVE_SET.has(f.status) && !FT_SET.has(f.status));
    const pool    = [...live, ...today].slice(0, 6);
    const seen    = new Set();
    return pool.filter(f => { if (seen.has(f.fixture_id)) return false; seen.add(f.fixture_id); return true; });
  }, [fixtures]);

  if (!featured.length) return null;

  return (
    <section style={{ padding: "0 24px 80px", background: C.bg }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Reveal>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
            <div>
              <SectionLabel accent color={C.redLive}>Today's Action</SectionLabel>
              <h2 style={{ fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 900, fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em", color: C.text, margin: 0 }}>
                Key matches today
              </h2>
            </div>
            <Link to="/live" style={{ textDecoration: "none" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.blue, display: "flex", alignItems: "center", gap: 4 }}>
                View all
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5h6M5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </span>
            </Link>
          </div>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 12 }}>
          {featured.map((f, i) => <MatchTile key={f.fixture_id} fixture={f} index={i} />)}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
// LEAGUE COMMAND STRIP
// ══════════════════════════════════════════════════════════════════

const LEAGUES_CONFIG = [
  { code: "epl",        slug: "premier-league", label: "Premier League", color: C.blue,   flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", logo: "https://media.api-sports.io/football/leagues/39.png"  },
  { code: "laliga",     slug: "la-liga",        label: "La Liga",        color: C.orange, flag: "🇪🇸", logo: "https://media.api-sports.io/football/leagues/140.png" },
  { code: "bundesliga", slug: "bundesliga",     label: "Bundesliga",     color: C.amber,  flag: "🇩🇪", logo: "https://media.api-sports.io/football/leagues/78.png"  },
  { code: "seriea",     slug: "serie-a",        label: "Serie A",        color: C.green,  flag: "🇮🇹", logo: "https://media.api-sports.io/football/leagues/135.png" },
  { code: "ligue1",     slug: "ligue-1",        label: "Ligue 1",        color: C.purple, flag: "🇫🇷", logo: "https://media.api-sports.io/football/leagues/61.png"  },
];

function LeagueTile({ league, index }) {
  const [hov, setHov] = useState(false);

  return (
    <Reveal delay={index * 70}>
      <Link to={`/predictions/${league.slug}`} style={{ textDecoration: "none", display: "block" }}>
        <div
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            background: C.bgCard,
            border: `1px solid ${hov ? league.color + "45" : C.border}`,
            borderRadius: 16,
            padding: "20px 18px",
            cursor: "pointer",
            transform: hov ? "translateY(-3px)" : "translateY(0)",
            boxShadow: hov ? `0 12px 36px rgba(0,0,0,0.45), 0 0 0 1px ${league.color}18` : "0 2px 12px rgba(0,0,0,0.3)",
            transition: "all 0.2s cubic-bezier(0.22,1,0.36,1)",
            position: "relative", overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: hov ? league.color : "transparent", transition: "background 0.2s" }} />

          {/* League header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, overflow: "hidden",
              background: `${league.color}14`,
              border: `1px solid ${league.color}25`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <img src={league.logo} width={24} height={24} style={{ objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: "-0.01em" }}>
                {league.label}
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.dim, letterSpacing: "0.06em" }}>
                {league.flag} TOP FLIGHT
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              { label: "Table & Standings", path: `/league/${league.code}` },
              { label: "Match Predictions", path: `/predictions/${league.slug}` },
              { label: "Season Simulator",  path: `/simulation/${league.code}` },
            ].map(({ label, path }) => (
              <div key={label} style={{
                fontSize: 10, fontWeight: 600,
                color: hov ? "rgba(255,255,255,0.55)" : C.dim,
                display: "flex", alignItems: "center", gap: 5,
                transition: "color 0.15s",
              }}>
                <div style={{ width: 3, height: 3, borderRadius: "50%", background: hov ? league.color : C.dim, flexShrink: 0, transition: "background 0.15s" }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </Link>
    </Reveal>
  );
}

function LeagueCommandStrip() {
  return (
    <section style={{
      padding: "0 24px 80px",
      background: C.bg,
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Reveal>
          <SectionLabel accent color={C.amber}>Top 5 Leagues</SectionLabel>
          <h2 style={{ fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 900, fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em", color: C.text, margin: "0 0 28px" }}>
            League command centre
          </h2>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {LEAGUES_CONFIG.map((l, i) => <LeagueTile key={l.code} league={l} index={i} />)}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
// FPL CORNER
// ══════════════════════════════════════════════════════════════════

const FPL_TOOLS = [
  { to: "/best-team",          label: "Best XI",            desc: "Optimal starting 11",        color: C.green  },
  { to: "/squad-builder",      label: "Squad Builder",      desc: "Full 15-man squad",           color: C.blue   },
  { to: "/gameweek-insights",  label: "GW Insights",        desc: "Gameweek analysis",           color: C.amber  },
  { to: "/fpl-table",          label: "FPL Table",          desc: "Live leaderboard",            color: C.purple },
  { to: "/captaincy",          label: "Captaincy",          desc: "Captain pick data",           color: C.orange },
  { to: "/fixture-difficulty", label: "Fixture Difficulty", desc: "FDR heatmap",                 color: C.cyan   },
  { to: "/transfer-planner",   label: "Transfer Planner",   desc: "Plan your moves",             color: C.red    },
  { to: "/differentials",      label: "Differentials",      desc: "Low-owned high-ceiling picks", color: "#f472b6" },
];

function FPLCorner() {
  return (
    <section style={{
      padding: "0 24px 80px",
      background: C.bg,
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Reveal>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
            <div>
              <SectionLabel accent color={C.green}>Fantasy Premier League</SectionLabel>
              <h2 style={{ fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 900, fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em", color: C.text, margin: 0 }}>
                FPL intelligence suite
              </h2>
            </div>
            <span style={{
              fontSize: 9, fontWeight: 800, color: C.green,
              background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)",
              padding: "5px 12px", borderRadius: 999, letterSpacing: "0.08em",
            }}>
              8 TOOLS
            </span>
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {FPL_TOOLS.map((tool, i) => (
            <Reveal key={tool.to} delay={i * 40}>
              <Link to={tool.to} style={{ textDecoration: "none", display: "block" }}>
                <FPLToolCard tool={tool} />
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FPLToolCard({ tool }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? `${tool.color}0c` : C.bgCard,
        border: `1px solid ${hov ? tool.color + "35" : C.border}`,
        borderRadius: 12,
        padding: "14px 16px",
        cursor: "pointer",
        transform: hov ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hov ? `0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px ${tool.color}14` : "none",
        transition: "all 0.18s ease",
        display: "flex", alignItems: "center", gap: 12,
      }}
    >
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: tool.color,
        boxShadow: hov ? `0 0 10px ${tool.color}` : "none",
        flexShrink: 0, transition: "box-shadow 0.18s",
      }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: hov ? C.text : "rgba(255,255,255,0.75)", letterSpacing: "-0.01em", transition: "color 0.15s" }}>
          {tool.label}
        </div>
        <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>
          {tool.desc}
        </div>
      </div>
      <div style={{
        marginLeft: "auto", flexShrink: 0,
        color: hov ? tool.color : C.dim,
        transition: "color 0.18s, transform 0.18s",
        transform: hov ? "translateX(3px)" : "translateX(0)",
      }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 5h6M5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SITE EXPLORER — full site map
// ══════════════════════════════════════════════════════════════════

const SITE_CATEGORIES = [
  {
    label: "Analytics",
    color: C.blue,
    items: [
      { to: "/live",                     label: "Live Centre",         desc: "Scores & fixtures" },
      { to: "/predictions/premier-league", label: "Predictions",       desc: "Match predictions" },
      { to: "/leagues",                  label: "Leagues",             desc: "Standings & stats" },
      { to: "/simulation/epl",           label: "Season Simulator",    desc: "Monte Carlo model" },
    ],
  },
  {
    label: "Match Intelligence",
    color: C.purple,
    items: [
      { to: "/league/epl",               label: "Premier League",      desc: "EPL hub" },
      { to: "/league/laliga",            label: "La Liga",             desc: "La Liga hub" },
      { to: "/league/seriea",            label: "Serie A",             desc: "Serie A hub" },
      { to: "/league/ligue1",            label: "Ligue 1",             desc: "Ligue 1 hub" },
    ],
  },
  {
    label: "Fantasy FPL",
    color: C.green,
    items: [
      { to: "/best-team",                label: "Best XI",             desc: "Optimal lineup" },
      { to: "/squad-builder",            label: "Squad Builder",       desc: "Build your squad" },
      { to: "/captaincy",                label: "Captaincy",           desc: "Captain picks" },
      { to: "/differentials",            label: "Differentials",       desc: "Low-owned picks" },
      { to: "/transfer-planner",         label: "Transfer Planner",    desc: "Plan moves" },
      { to: "/fixture-difficulty",       label: "Fixture Difficulty",  desc: "FDR heatmap" },
      { to: "/gameweek-insights",        label: "GW Insights",         desc: "GW analysis" },
      { to: "/fpl-table",                label: "FPL Table",           desc: "Leaderboard" },
    ],
  },
  {
    label: "Discovery",
    color: C.amber,
    items: [
      { to: "/player",                   label: "Player Browser",      desc: "500+ profiles" },
      { to: "/news",                     label: "News Tracker",        desc: "Transfer news" },
      { to: "/games",                    label: "Mini Games",          desc: "Football games" },
      { to: "/learn",                    label: "Ground Zero",         desc: "Learn analytics" },
    ],
  },
];

function SiteExplorer() {
  return (
    <section style={{
      padding: "0 24px 80px",
      background: C.bg,
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Reveal>
          <SectionLabel accent color={C.muted}>Everything</SectionLabel>
          <h2 style={{ fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 900, fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em", color: C.text, margin: "0 0 32px" }}>
            Explore the platform
          </h2>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
          {SITE_CATEGORIES.map((cat, ci) => (
            <Reveal key={cat.label} delay={ci * 80}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 3, height: 16, borderRadius: 2, background: cat.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 900, color: cat.color, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    {cat.label}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {cat.items.map(item => (
                    <SiteMapLink key={item.to} item={item} color={cat.color} />
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function SiteMapLink({ item, color }) {
  const [hov, setHov] = useState(false);
  return (
    <Link to={item.to} style={{ textDecoration: "none" }}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "9px 12px",
          borderRadius: 10,
          background: hov ? `${color}0a` : "rgba(255,255,255,0.015)",
          border: `1px solid ${hov ? color + "28" : "rgba(255,255,255,0.04)"}`,
          cursor: "pointer",
          transform: hov ? "translateX(3px)" : "translateX(0)",
          transition: "all 0.15s ease",
        }}
      >
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: hov ? color : C.dim, flexShrink: 0, transition: "background 0.15s", boxShadow: hov ? `0 0 6px ${color}` : "none" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: hov ? C.text : "rgba(255,255,255,0.6)", transition: "color 0.15s", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.label}
          </div>
          <div style={{ fontSize: 9, color: C.dim, marginTop: 1 }}>{item.desc}</div>
        </div>
        <div style={{ color: hov ? color : "transparent", transition: "color 0.15s", flexShrink: 0 }}>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M2 4.5h5M4.5 2l2.5 2.5L4.5 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

// ══════════════════════════════════════════════════════════════════
// DIVIDER
// ══════════════════════════════════════════════════════════════════

function Divider({ color = C.border }) {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto 0", padding: "0 24px" }}>
      <div style={{ height: 1, background: color }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════

export default function HomePage() {
  const [fixtures, setFixtures] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetch(`${BACKEND}/api/matches/upcoming`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        const raw = d.matches || d.chips || [];
        setFixtures(raw.map(c => ({
          fixture_id:   c.fixture_id,
          home_team:    c.home_team,
          away_team:    c.away_team,
          home_logo:    c.home_logo,
          away_logo:    c.away_logo,
          home_score:   c.home_score ?? null,
          away_score:   c.away_score ?? null,
          status:       c.status,
          minute:       c.minute,
          kickoff:      c.kickoff || c.date,
          league_id:    c.league_id,
          league_name:  c.league_name || c.league,
          league_logo:  c.league_logo,
          p_home_win:   c.p_home_win ?? null,
          p_draw:       c.p_draw     ?? null,
          p_away_win:   c.p_away_win ?? null,
          xg_home:      c.xg_home    ?? null,
          xg_away:      c.xg_away    ?? null,
          btts:         c.p_btts     ?? c.btts     ?? null,
          over_2_5:     c.p_over25   ?? c.over_2_5 ?? null,
          confidence:   c.confidence ?? null,
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const liveCount  = fixtures.filter(f => LIVE_SET.has(f.status)).length;
  const todayCount = fixtures.filter(f => isToday(f.kickoff)).length;

  return (
    <>
      <style>{`
        @keyframes hp-pulse    { 0%,100%{opacity:1;transform:scale(1)}   50%{opacity:.3;transform:scale(.65)} }
        @keyframes hp-fadein   { from{opacity:0} to{opacity:1} }
        @keyframes hp-fadeinhalf { from{opacity:0} to{opacity:.45} }
        @keyframes hp-slideup  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes hp-bounce   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(5px)} }
        @keyframes hp-shimmer  { 0%{opacity:.4} 50%{opacity:.9} 100%{opacity:.4} }
        @keyframes hp-ticker   { from{transform:translateX(0)} to{transform:translateX(-33.333%)} }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Inter', 'Sora', system-ui, sans-serif" }}>

        <HeroSection fixtures={fixtures} loading={loading} />

        <LivePulseStrip fixtures={fixtures} />

        <div style={{ height: 80, background: C.bg }} />
        <FeatureGrid liveCount={liveCount} todayCount={todayCount} />

        <Divider />
        <div style={{ height: 80 }} />
        <TodayMatches fixtures={fixtures} />

        <Divider />
        <div style={{ height: 80 }} />
        <LeagueCommandStrip />

        <Divider />
        <div style={{ height: 80 }} />
        <FPLCorner />

        <Divider />
        <div style={{ height: 80 }} />
        <SiteExplorer />

      </div>
    </>
  );
}