// pages/PlayerInsightPage.jsx — StatinSite Stats Hub v3  ·  Part 3 refactor
// Changes:
//   • useIsMobile → imported from @/hooks
//   • const B (backend URL) → API_BASE from @/api/api
//   • All design tokens, LEAGUES[], PLAYER_TABS, components — 100% preserved

import { useState, useEffect, useRef, useCallback } from "react";
import { useIsMobile } from "@/hooks";
import { API_BASE as B } from "@/api/api";
// ── Design tokens ──────────────────────────────────────────────────────────────
const T = {
  red:    "#e83a3a",
  green:  "#22c55e",
  blue:   "#3b82f6",
  amber:  "#f59e0b",
  purple: "#a78bfa",
  orange: "#f97316",
  line:   "rgba(255,255,255,0.07)",
  dim:    "rgba(255,255,255,0.22)",
  muted:  "rgba(255,255,255,0.38)",
  soft:   "rgba(255,255,255,0.72)",
};

// ── League / tab config ────────────────────────────────────────────────────────
const LEAGUES = [
  { key:"all",        label:"All",            color:T.soft   },
  { key:"epl",        label:"Premier League", color:T.blue   },
  { key:"laliga",     label:"La Liga",        color:T.amber  },
  { key:"seriea",     label:"Serie A",        color:T.green  },
  { key:"bundesliga", label:"Bundesliga",     color:T.red    },
  { key:"ligue1",     label:"Ligue 1",        color:T.purple },
];
const LC = { epl:T.blue, laliga:T.amber, seriea:T.green, bundesliga:T.red, ligue1:T.purple };
const LA = { epl:"EPL", laliga:"LAL", seriea:"SA", bundesliga:"BUN", ligue1:"L1" };

const PLAYER_TABS = [
  { key:"scorers",  label:"Top Scorers",  ep:"/api/players/top-scorers",      sk:"goals",              sl:"Goals",   sc:T.red,    max:40,  dec:0 },
  { key:"assists",  label:"Top Assists",  ep:"/api/players/top-assisters",    sk:"assists",            sl:"Assists", sc:T.green,  max:20,  dec:0 },
  { key:"contrib",  label:"G + A",        ep:"/api/players/top-contributors", sk:"goal_contributions", sl:"G+A",     sc:T.blue,   max:55,  dec:0 },
  { key:"rated",    label:"Best Rated",   ep:"/api/players/top-rated",        sk:"rating",             sl:"Rating",  sc:T.amber,  max:10,  dec:1 },
  { key:"shots",    label:"Most Shots",   ep:"/api/players/most-shots",       sk:"shots_total",        sl:"Shots",   sc:T.purple, max:180, dec:0 },
  { key:"tackles",  label:"Top Tacklers", ep:"/api/players/top-tacklers",     sk:"tackles_total",      sl:"Tackles", sc:T.orange, max:120, dec:0 },
];
const TEAM_TABS = [
  { key:"tgoals",   label:"Most Goals",   ep:"/api/players/teams/most-goals",        sk:"goals_for",     sl:"Goals", sc:T.red,   max:110, dec:0 },
  { key:"tdefence", label:"Best Defence", ep:"/api/players/teams/best-defence",      sk:"goals_against", sl:"GA",    sc:T.green, max:80,  dec:0 },
  { key:"tcs",      label:"Clean Sheets", ep:"/api/players/teams/most-clean-sheets", sk:"clean_sheets",  sl:"CS",    sc:T.blue,  max:20,  dec:0 },
  { key:"tform",    label:"Best Form",    ep:"/api/players/teams/form",              sk:"points",        sl:"Pts",   sc:T.amber, max:90,  dec:0 },
];

// ── Global keyframes injected once ────────────────────────────────────────────
const KEYFRAMES = `
  @keyframes fadeUp     { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideRight { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
  @keyframes slideLeft  { from{opacity:0;transform:translateX(8px)}  to{opacity:1;transform:translateX(0)} }
  @keyframes scaleIn    { from{opacity:0;transform:scale(.94)}       to{opacity:1;transform:scale(1)} }
  @keyframes shimmer    { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes fillBar    { from{width:0!important} to{} }
  @keyframes pulse      { 0%,100%{opacity:1} 50%{opacity:.35} }
  @keyframes countUp    { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ringIn     { from{stroke-dashoffset:283!important} to{} }
  @keyframes drawerUp   { from{transform:translateY(100%)} to{transform:translateY(0)} }
  .si-prow:hover        { background:rgba(255,255,255,0.038)!important; }
  ::-webkit-scrollbar   { width:3px; height:3px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(255,255,255,.15); border-radius:2px; }
`;

// ── Helpers ────────────────────────────────────────────────────────────────────
const posColor = pos => {
  const l = (pos || "").toLowerCase();
  if (l.includes("keep") || l.includes("goal")) return T.amber;
  if (l.includes("defend"))                      return T.green;
  if (l.includes("mid"))                         return T.blue;
  if (l.includes("attack") || l.includes("forward") || l.includes("wing")) return T.red;
  return T.muted;
};
const fmt      = (v, dec) => dec ? Number(v || 0).toFixed(dec) : Math.round(Number(v) || 0);
const initials = name => (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
const lgColor  = slug => LC[slug] || T.muted;
const lgLabel  = slug => LA[slug] || (slug || "").toUpperCase();

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Sk({ h = 52 }) {
  return (
    <div style={{
      height: h,
      background: "linear-gradient(90deg,rgba(255,255,255,.03) 0%,rgba(255,255,255,.07) 50%,rgba(255,255,255,.03) 100%)",
      backgroundSize: "400% 100%",
      animation: "shimmer 1.6s ease-in-out infinite",
      marginBottom: 4,
    }}/>
  );
}

// ── Animated horizontal bar ────────────────────────────────────────────────────
function HBar({ v = 0, max = 1, color = T.blue, h = 4, delay = 0 }) {
  const pct = Math.min(100, max > 0 ? Math.round((v / max) * 100) : 0);
  return (
    <div style={{ flex: 1, height: h, background: "rgba(255,255,255,.06)", borderRadius: h / 2, overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${pct}%`, background: color, borderRadius: h / 2,
        animation: `fillBar .85s cubic-bezier(.22,1,.36,1) ${delay}s both`,
        transition: "width .6s cubic-bezier(.22,1,.36,1)",
      }}/>
    </div>
  );
}

// ── Animated SVG donut ring ────────────────────────────────────────────────────
function DonutRing({ value, max, color, size = 72, strokeW = 5, children }) {
  const r    = (size / 2) - strokeW;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(1, (value || 0) / (max || 1));
  const dashOffset = circ - circ * pct;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={strokeW}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={strokeW} strokeLinecap="round"
          strokeDasharray={`${circ}`} strokeDashoffset={dashOffset}
          style={{ animation: "ringIn .9s cubic-bezier(.22,1,.36,1) both .1s", transition: "stroke-dashoffset .7s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}

// ── Radar chart ───────────────────────────────────────────────────────────────
function RadarChart({ dims, color, size = 150 }) {
  const cx = size / 2, cy = size / 2, r = size * 0.36;
  const n  = dims.length;
  const angle = (i) => (i / n) * Math.PI * 2 - Math.PI / 2;
  const pts = dims.map((d, i) => {
    const a = angle(i), frac = Math.min(1, (d.v || 0) / (d.max || 1));
    return { x: cx + r * frac * Math.cos(a), y: cy + r * frac * Math.sin(a),
             lx: cx + (r + 17) * Math.cos(a), ly: cy + (r + 17) * Math.sin(a), l: d.l };
  });
  const rings = [0.25, 0.5, 0.75, 1].map(f => {
    const rpts = dims.map((_, i) => {
      const a = angle(i);
      return `${(cx + r * f * Math.cos(a)).toFixed(1)},${(cy + r * f * Math.sin(a)).toFixed(1)}`;
    }).join(" ");
    return <polygon key={f} points={rpts} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="1"/>;
  });
  const poly = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rings}
      {dims.map((_, i) => {
        const a = angle(i);
        return <line key={i} x1={cx} y1={cy} x2={(cx + r * Math.cos(a)).toFixed(1)} y2={(cy + r * Math.sin(a)).toFixed(1)} stroke="rgba(255,255,255,.07)" strokeWidth="1"/>;
      })}
      <polygon points={poly} fill={`${color}18`} stroke={color} strokeWidth="1.5"
        style={{ animation: "scaleIn .7s cubic-bezier(.22,1,.36,1) both .1s" }}/>
      {pts.map((p, i) => (
        <text key={i} x={p.lx.toFixed(1)} y={p.ly.toFixed(1)}
          textAnchor="middle" dominantBaseline="middle"
          fontSize="8" fill="rgba(255,255,255,.28)"
          fontFamily="-apple-system,sans-serif" fontWeight="700">{p.l}</text>
      ))}
    </svg>
  );
}

// ── League badge ──────────────────────────────────────────────────────────────
function LBadge({ slug }) {
  if (!slug || slug === "all") return null;
  const c = lgColor(slug);
  return (
    <span style={{
      fontSize: 8, fontWeight: 800, padding: "2px 6px", borderRadius: 4,
      textTransform: "uppercase", letterSpacing: ".07em", flexShrink: 0,
      color: c, background: `${c}18`, border: `1px solid ${c}28`,
    }}>{lgLabel(slug)}</span>
  );
}

// ── KPI tile ──────────────────────────────────────────────────────────────────
function KpiTile({ label, value, sub, color, delay = 0 }) {
  return (
    <div style={{
      background: "#080808", border: `1px solid ${T.line}`, borderRadius: 14,
      padding: "16px 14px", position: "relative", overflow: "hidden",
      animation: `fadeUp .4s ease ${delay}s both`,
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color }}/>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-1px", lineHeight: 1, color, animation: "countUp .5s cubic-bezier(.22,1,.36,1) .1s both" }}>
        {value}
      </div>
      <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: ".1em", marginTop: 5, fontWeight: 700 }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ── Player list row ───────────────────────────────────────────────────────────
function PRow({ p, rank, cfg, max, selected, onClick }) {
  const [hov, setHov] = useState(false);
  const ac  = lgColor(p.league_slug);
  const val = p[cfg.sk];
  const medals = ["#f2c94c", "#9ca3af", "#d97706"];
  return (
    <div className="si-prow" onClick={() => onClick(p)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: "11px 16px",
        borderBottom: `1px solid ${T.line}`, cursor: "pointer",
        background: selected ? "rgba(255,255,255,.045)" : "transparent",
        position: "relative", transition: "background .15s",
        animation: `slideRight .35s ease ${rank * 0.04}s both`,
      }}>
      {selected && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: cfg.sc }}/>}
      <div style={{ width: 22, textAlign: "right", fontSize: 11, fontWeight: 800, color: rank <= 3 ? medals[rank-1] : "rgba(255,255,255,.2)", flexShrink: 0 }}>
        {rank}
      </div>
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: `${ac}18`, color: ac, overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 800, letterSpacing: "-.3px",
        border: selected ? `1px solid ${ac}40` : "1px solid transparent", transition: "border .15s",
      }}>
        {p.photo
          ? <img src={p.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.currentTarget.style.display = "none"; }}/>
          : initials(p.name)
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: selected ? "#fff" : "rgba(255,255,255,.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", transition: "color .15s" }}>
            {p.name}
          </span>
          <LBadge slug={p.league_slug}/>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 9, color: T.muted, fontWeight: 600 }}>{p.team}</span>
          {p.position && (
            <span style={{ fontSize: 8, fontWeight: 700, color: posColor(p.position), background: `${posColor(p.position)}15`, padding: "1px 5px", borderRadius: 3, textTransform: "uppercase", letterSpacing: ".05em" }}>
              {p.position}
            </span>
          )}
        </div>
        <div style={{ marginTop: 5 }}>
          <HBar v={val || 0} max={max} color={cfg.sc} h={3} delay={rank * 0.04}/>
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: cfg.sc, letterSpacing: "-.5px", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          {fmt(val, cfg.dec)}
        </div>
        <div style={{ fontSize: 8, color: T.dim, textTransform: "uppercase", letterSpacing: ".08em", marginTop: 2 }}>{cfg.sl}</div>
      </div>
    </div>
  );
}

// ── Team list row ─────────────────────────────────────────────────────────────
function TRow({ t, rank, cfg, max, selected, onClick }) {
  const ac  = lgColor(t.league_slug);
  const val = t[cfg.sk];
  const medals = ["#f2c94c", "#9ca3af", "#d97706"];
  return (
    <div className="si-prow" onClick={() => onClick(t)}
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: "11px 16px",
        borderBottom: `1px solid ${T.line}`, cursor: "pointer",
        background: selected ? "rgba(255,255,255,.045)" : "transparent",
        position: "relative", transition: "background .15s",
        animation: `slideRight .35s ease ${rank * 0.04}s both`,
      }}>
      {selected && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: cfg.sc }}/>}
      <div style={{ width: 22, textAlign: "right", fontSize: 11, fontWeight: 800, color: rank <= 3 ? medals[rank-1] : "rgba(255,255,255,.2)", flexShrink: 0 }}>
        {rank}
      </div>
      <div style={{ width: 32, height: 32, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {t.team_logo
          ? <img src={t.team_logo} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} onError={e => { e.currentTarget.style.display = "none"; }}/>
          : <div style={{ width: 28, height: 28, borderRadius: 6, background: `${ac}20` }}/>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: selected ? "#fff" : "rgba(255,255,255,.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {t.team}
          </span>
          <LBadge slug={t.league_slug}/>
        </div>
        {t.form && (
          <div style={{ display: "flex", gap: 2, marginBottom: 4 }}>
            {String(t.form).slice(-5).split("").map((c, i) => (
              <span key={i} style={{
                width: 14, height: 14, borderRadius: 3, fontSize: 7, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: c==="W" ? `${T.green}22` : c==="D" ? `${T.amber}20` : `${T.red}18`,
                color: c==="W" ? T.green : c==="D" ? T.amber : T.red,
              }}>{c}</span>
            ))}
          </div>
        )}
        <HBar v={val || 0} max={max} color={cfg.sc} h={3} delay={rank * 0.04}/>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: cfg.sc, letterSpacing: "-.5px", lineHeight: 1 }}>{fmt(val, cfg.dec)}</div>
        <div style={{ fontSize: 8, color: T.dim, textTransform: "uppercase", letterSpacing: ".08em", marginTop: 2 }}>{cfg.sl}</div>
      </div>
    </div>
  );
}

// ── Player detail panel ───────────────────────────────────────────────────────
function PlayerDetail({ p, allRows, cfg }) {
  const ac   = lgColor(p.league_slug);
  const apps = Math.max(p.appearances || p.apps || 1, 1);
  const mins = p.minutes || p.mins || 0;

  const statBars = [
    { l: "Goals",       v: p.goals            || 0, max: 40,  c: T.red    },
    { l: "Assists",     v: p.assists           || 0, max: 20,  c: T.green  },
    { l: "Shots",       v: p.shots_total       || 0, max: 180, c: T.blue   },
    { l: "On target",   v: p.shots_on          || 0, max: 80,  c: T.blue   },
    { l: "Key passes",  v: p.passes_key        || 0, max: 80,  c: T.amber  },
    { l: "Dribbles",    v: p.dribbles_success  || 0, max: 80,  c: T.purple },
    { l: "Tackles",     v: p.tackles_total     || 0, max: 120, c: T.orange },
  ];

  const radarDims = [
    { l: "Goals",   v: p.goals           || 0, max: 40  },
    { l: "Assists", v: p.assists          || 0, max: 20  },
    { l: "Shots",   v: p.shots_total      || 0, max: 180 },
    { l: "Passes",  v: p.passes_key       || 0, max: 80  },
    { l: "Tackles", v: p.tackles_total    || 0, max: 120 },
  ];

  const compRows = [...(allRows || [])].sort((a, b) => (b[cfg.sk] || 0) - (a[cfg.sk] || 0));
  const compMax  = compRows[0] ? (compRows[0][cfg.sk] || 1) : 1;

  const form = p.form
    ? (typeof p.form === "string" ? p.form.slice(-7).split("") : (Array.isArray(p.form) ? p.form.slice(-7) : []))
    : [];

  return (
    <div style={{ animation: "slideLeft .28s cubic-bezier(.22,1,.36,1) both" }}>

      {/* Hero */}
      <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${T.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <DonutRing value={p.goals || 0} max={40} color={ac} size={72} strokeW={5}>
            <div style={{ fontSize: 18, fontWeight: 800, color: ac, lineHeight: 1 }}>{p.goals || 0}</div>
            <div style={{ fontSize: 7, color: "rgba(255,255,255,.28)", textTransform: "uppercase", letterSpacing: ".06em", marginTop: 1 }}>Goals</div>
          </DonutRing>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.3px", marginBottom: 3 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>
              {p.team}{p.position ? ` · ${p.position}` : ""}{p.age ? ` · Age ${p.age}` : ""}
            </div>
            <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
              <LBadge slug={p.league_slug}/>
              <span style={{ fontSize: 9, color: T.dim }}>{apps} apps · {mins.toLocaleString()} min</span>
            </div>
            {form.length > 0 && (
              <div style={{ display: "flex", gap: 3, marginTop: 8 }}>
                {form.map((f, i) => {
                  const isW = f === 1 || f === "W";
                  const isD = f === "D";
                  return (
                    <div key={i} style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: isW ? `${ac}28` : isD ? `${T.amber}20` : "rgba(255,255,255,.05)",
                      color: isW ? ac : isD ? T.amber : "rgba(255,255,255,.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 8, fontWeight: 800,
                    }}>
                      {isW ? "W" : isD ? "D" : "L"}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4 headline metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", borderBottom: `1px solid ${T.line}` }}>
        {[
          { l: "Goals",   v: p.goals    || 0,                               c: T.red    },
          { l: "Assists", v: p.assists   || 0,                               c: T.green  },
          { l: "Rating",  v: p.rating ? Number(p.rating).toFixed(1) : "—",  c: T.amber  },
          { l: "G + A",   v: (p.goals || 0) + (p.assists || 0),             c: T.purple },
        ].map((m, i) => (
          <div key={m.l} style={{ padding: "13px 10px", textAlign: "center", borderRight: i < 3 ? `1px solid ${T.line}` : "none" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: m.c, letterSpacing: "-.5px", lineHeight: 1, animation: "countUp .45s ease both" }}>
              {m.v}
            </div>
            <div style={{ fontSize: 8, color: T.dim, textTransform: "uppercase", letterSpacing: ".1em", marginTop: 4 }}>{m.l}</div>
          </div>
        ))}
      </div>

      {/* Stat bars */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.line}` }}>
        <div style={{ fontSize: 9, color: T.dim, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700, marginBottom: 12 }}>
          Season breakdown
        </div>
        {statBars.map((b, i) => (
          <div key={b.l} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: T.muted, width: 76, flexShrink: 0, textAlign: "right" }}>{b.l}</div>
            <HBar v={b.v} max={b.max} color={b.c} h={6} delay={i * 0.06}/>
            <div style={{ fontSize: 12, fontWeight: 800, color: b.c, width: 28, textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
              {b.v}
            </div>
          </div>
        ))}
      </div>

      {/* Radar + percent bars */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.line}` }}>
        <div style={{ fontSize: 9, color: T.dim, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700, marginBottom: 10 }}>
          Attribute profile
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <RadarChart dims={radarDims} color={ac} size={148}/>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            {radarDims.map(d => {
              const pct = Math.min(100, Math.round(((d.v || 0) / (d.max || 1)) * 100));
              return (
                <div key={d.l}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: T.muted }}>{d.l}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: ac }}>{pct}%</span>
                  </div>
                  <HBar v={d.v} max={d.max} color={ac} h={3}/>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Comparison */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.line}` }}>
        <div style={{ fontSize: 9, color: T.dim, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700, marginBottom: 10 }}>
          {cfg.sl} comparison
        </div>
        {compRows.slice(0, 8).map(x => {
          const isMe = x.id === p.id || x.name === p.name;
          const v    = x[cfg.sk] || 0;
          const pct  = Math.min(100, Math.round((v / compMax) * 100));
          return (
            <div key={x.id || x.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
              <div style={{ fontSize: 10, color: isMe ? cfg.sc : T.dim, width: 64, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: isMe ? 700 : 400 }}>
                {(x.name || "").split(" ").slice(-1)[0]}
              </div>
              <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,.06)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: isMe ? cfg.sc : "rgba(255,255,255,.12)", borderRadius: 2, transition: "width .7s cubic-bezier(.22,1,.36,1)" }}/>
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: isMe ? cfg.sc : T.dim, width: 22, textAlign: "right" }}>
                {fmt(v, cfg.dec)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Per-90 */}
      <div style={{ padding: "14px 20px" }}>
        <div style={{ fontSize: 9, color: T.dim, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700, marginBottom: 10 }}>
          Per 90 metrics
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
          {[
            { l: "Goals / 90",   v: ((p.goals || 0) / apps).toFixed(2) },
            { l: "Assists / 90", v: ((p.assists || 0) / apps).toFixed(2) },
            { l: "Shots / 90",   v: ((p.shots_total || 0) / apps).toFixed(1) },
          ].map(m => (
            <div key={m.l} style={{ background: "#0a0a0a", border: `1px solid ${T.line}`, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: ac, letterSpacing: "-.5px" }}>{m.v}</div>
              <div style={{ fontSize: 9, color: T.dim, marginTop: 3, textTransform: "uppercase", letterSpacing: ".06em" }}>{m.l}</div>
            </div>
          ))}
        </div>
        {(p.yellow_cards !== undefined || p.red_cards !== undefined) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            <div style={{ background: `${T.amber}08`, border: `1px solid ${T.amber}28`, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.amber }}>{p.yellow_cards || 0}</div>
              <div style={{ fontSize: 9, color: T.dim, textTransform: "uppercase", letterSpacing: ".06em", marginTop: 3 }}>Yellow</div>
            </div>
            <div style={{ background: `${T.red}08`, border: `1px solid ${T.red}28`, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.red }}>{p.red_cards || 0}</div>
              <div style={{ fontSize: 9, color: T.dim, textTransform: "uppercase", letterSpacing: ".06em", marginTop: 3 }}>Red</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Team detail panel ─────────────────────────────────────────────────────────
function TeamDetail({ t, allRows, cfg }) {
  const ac = lgColor(t.league_slug);

  const statBars = [
    { l: "Goals for",       v: t.goals_for        || 0, max: 110, c: T.red    },
    { l: "Goals against",   v: t.goals_against     || 0, max: 80,  c: T.orange },
    { l: "Clean sheets",    v: t.clean_sheets      || 0, max: 20,  c: T.green  },
    { l: "Goals / game",    v: parseFloat(t.goals_per_game    || 0), max: 4, c: T.amber },
    { l: "Conceded / game", v: parseFloat(t.conceded_per_game || 0), max: 3, c: T.muted },
    { l: "Win rate",        v: parseFloat(t.win_rate          || 0), max: 100, c: T.blue },
  ];

  const compRows = [...(allRows || [])].sort((a, b) => (b[cfg.sk] || 0) - (a[cfg.sk] || 0));
  const compMax  = compRows[0] ? (compRows[0][cfg.sk] || 1) : 1;

  return (
    <div style={{ animation: "slideLeft .28s cubic-bezier(.22,1,.36,1) both" }}>
      <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${T.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {t.team_logo
            ? <img src={t.team_logo} alt="" style={{ width: 52, height: 52, objectFit: "contain" }} onError={e => { e.currentTarget.style.display = "none"; }}/>
            : <div style={{ width: 52, height: 52, borderRadius: 12, background: `${ac}20` }}/>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.3px", marginBottom: 3 }}>{t.team}</div>
            <div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 6 }}>
              <LBadge slug={t.league_slug}/>
              {t.rank && <span style={{ fontSize: 9, color: T.dim }}>#{t.rank}</span>}
              {t.played && <span style={{ fontSize: 9, color: T.dim }}>{t.played} played</span>}
            </div>
            {t.form && (
              <div style={{ display: "flex", gap: 3 }}>
                {String(t.form).slice(-7).split("").map((c, i) => (
                  <span key={i} style={{ width: 20, height: 20, borderRadius: "50%", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", background: c==="W" ? `${T.green}22` : c==="D" ? `${T.amber}20` : `${T.red}18`, color: c==="W" ? T.green : c==="D" ? T.amber : T.red }}>
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", borderBottom: `1px solid ${T.line}` }}>
        {[{l:"W",v:t.wins||0,c:T.green},{l:"D",v:t.draws||0,c:T.amber},{l:"L",v:t.losses||0,c:T.red},{l:"Pts",v:t.points||0,c:T.blue}].map((m, i) => (
          <div key={m.l} style={{ padding: "13px 10px", textAlign: "center", borderRight: i < 3 ? `1px solid ${T.line}` : "none" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: m.c, letterSpacing: "-.5px", lineHeight: 1, animation: "countUp .45s ease both" }}>{m.v}</div>
            <div style={{ fontSize: 8, color: T.dim, textTransform: "uppercase", letterSpacing: ".1em", marginTop: 4 }}>{m.l}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.line}` }}>
        <div style={{ fontSize: 9, color: T.dim, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700, marginBottom: 12 }}>
          Team statistics
        </div>
        {statBars.map((b, i) => (
          <div key={b.l} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: T.muted, width: 100, flexShrink: 0, textAlign: "right" }}>{b.l}</div>
            <HBar v={b.v} max={b.max} color={b.c} h={6} delay={i * 0.06}/>
            <div style={{ fontSize: 12, fontWeight: 800, color: b.c, width: 36, textAlign: "right", flexShrink: 0 }}>
              {typeof b.v === "number" ? b.v.toFixed(b.v % 1 !== 0 ? 1 : 0) : b.v || 0}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: "14px 20px" }}>
        <div style={{ fontSize: 9, color: T.dim, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700, marginBottom: 10 }}>
          {cfg.sl} comparison
        </div>
        {compRows.slice(0, 8).map(x => {
          const isMe = x.team_id === t.team_id || x.team === t.team;
          const v    = x[cfg.sk] || 0;
          const pct  = Math.min(100, Math.round((v / compMax) * 100));
          return (
            <div key={x.team_id || x.team} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
              <div style={{ fontSize: 10, color: isMe ? cfg.sc : T.dim, width: 72, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: isMe ? 700 : 400 }}>
                {(x.team || "").split(" ").slice(-1)[0]}
              </div>
              <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,.06)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: isMe ? cfg.sc : "rgba(255,255,255,.12)", borderRadius: 2, transition: "width .7s cubic-bezier(.22,1,.36,1)" }}/>
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: isMe ? cfg.sc : T.dim, width: 24, textAlign: "right" }}>{fmt(v, cfg.dec)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Panel header with pill tabs ───────────────────────────────────────────────
function PanelHeader({ label, tabs, active, onSwitch }) {
  return (
    <div style={{ padding: "12px 16px 10px", borderBottom: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: T.dim, textTransform: "uppercase", letterSpacing: ".12em" }}>
        {label}
      </div>
      <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,.04)", borderRadius: 8, padding: 2, flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => onSwitch(t.key)}
            style={{
              padding: "5px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
              background: active === t.key ? "rgba(255,255,255,.1)" : "transparent",
              color: active === t.key ? "#fff" : T.muted,
              border: active === t.key ? `1px solid rgba(255,255,255,.12)` : "1px solid transparent",
              transition: "all .18s",
            }}>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function PageFooter() {
  return (
    <footer style={{ background: "#000", borderTop: `1px solid ${T.line}`, fontFamily: "inherit" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, padding: "0 24px", height: 52 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 28 28" fill="none">
            <rect x="4" y="3"  width="14" height="3.5" rx="1.75" fill="#3b82f6"/>
            <rect x="4" y="9"  width="10" height="3.5" rx="1.75" fill="#3b82f6" opacity="0.6"/>
            <rect x="4" y="15" width="14" height="3.5" rx="1.75" fill="#3b82f6" opacity="0.35"/>
            <rect x="4" y="21" width="7"  height="3.5" rx="1.75" fill="#3b82f6" opacity="0.18"/>
            <rect x="20" y="15" width="3" height="10"  rx="1.5"  fill="#22c55e"/>
          </svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.55)", letterSpacing: "-.03em" }}>StatinSite</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,.18)" }}>Football Intelligence · ELO · Dixon-Coles · xG</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 14px", background: "rgba(255,255,255,.04)", border: `1px solid ${T.line}`, borderRadius: 999, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,.2)", textTransform: "uppercase", letterSpacing: ".1em" }}>Built by</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.55)" }}>Rutej Talati</span>
        </div>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,.14)", flexShrink: 0 }}>© {new Date().getFullYear()} StatinSite</span>
      </div>
    </footer>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════════════
export default function PlayerInsightPage() {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [league,    setLeague]    = useState("all");
  const [pTab,      setPTab]      = useState("scorers");
  const [tTab,      setTTab]      = useState("tgoals");
  const [cache,     setCache]     = useState({});
  const [loading,   setLoading]   = useState({});
  const [selPlayer, setSelPlayer] = useState(null);
  const [selTeam,   setSelTeam]   = useState(null);
  const [search,    setSearch]    = useState("");
  const [srRes,     setSrRes]     = useState([]);
  const [srLoading, setSrLoading] = useState(false);
  const [srOpen,    setSrOpen]    = useState(false);
  const cacheRef  = useRef({});
  const debRef    = useRef(null);
  const searchRef = useRef(null);

  const fetchTab = useCallback(async (ep, key) => {
    if (cacheRef.current[key] !== undefined) return;
    setLoading(l => ({ ...l, [key]: true }));
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (league && league !== "all") params.set("league", league);
      const res = await fetch(`${B}${ep}?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      const val = Array.isArray(raw) ? raw : (raw.teams || raw.players || []);
      cacheRef.current[key] = val;
      setCache(c => ({ ...c, [key]: val }));
    } catch (e) {
      console.error(ep, e);
      setCache(c => ({ ...c, [key]: [] }));
    }
    setLoading(l => ({ ...l, [key]: false }));
  }, [league]);

  const pCurrent = PLAYER_TABS.find(t => t.key === pTab) || PLAYER_TABS[0];
  const tCurrent = TEAM_TABS.find(t => t.key === tTab)   || TEAM_TABS[0];
  const pKey = `${pCurrent.key}:${league}`;
  const tKey = `${tCurrent.key}:${league}`;

  useEffect(() => { fetchTab(pCurrent.ep, pKey); }, [pTab, league, fetchTab, pCurrent.ep, pKey]);
  useEffect(() => { fetchTab(tCurrent.ep, tKey); }, [tTab, league, fetchTab, tCurrent.ep, tKey]);
  useEffect(() => {
    fetchTab(PLAYER_TABS[0].ep, `${PLAYER_TABS[0].key}:all`);
    fetchTab(TEAM_TABS[0].ep,   `${TEAM_TABS[0].key}:all`);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pRows    = cache[pKey] || [];
  const tRows    = cache[tKey] || [];
  const pLoading = loading[pKey];
  const tLoading = loading[tKey];
  const pMax     = pRows.length ? Math.max(...pRows.map(r => parseFloat(r[pCurrent.sk]) || 0), 1) : 1;
  const tMax     = tRows.length ? Math.max(...tRows.map(r => parseFloat(r[tCurrent.sk]) || 0), 1) : 1;

  const pTop   = pRows[0];
  const pAvg   = pRows.length ? (pRows.reduce((s, r) => s + (parseFloat(r[pCurrent.sk]) || 0), 0) / pRows.length) : 0;
  const pTopPG = pTop && (pTop.appearances || pTop.apps) ? ((parseFloat(pTop[pCurrent.sk]) || 0) / Math.max(pTop.appearances || pTop.apps, 1)) : 0;

  // Debounced search
  useEffect(() => {
    clearTimeout(debRef.current);
    if (!search.trim()) { setSrRes([]); setSrOpen(false); return; }
    setSrLoading(true); setSrOpen(true);
    debRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`${B}/api/players/search?q=${encodeURIComponent(search)}&limit=20`);
        const d = await r.json();
        setSrRes(Array.isArray(d) ? d : []);
      } catch { setSrRes([]); }
      setSrLoading(false);
    }, 350);
  }, [search]);

  useEffect(() => {
    const fn = e => { if (searchRef.current && !searchRef.current.contains(e.target)) setSrOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const onLeague   = lg => { setLeague(lg); cacheRef.current = {}; setCache({}); setSelPlayer(null); setSelTeam(null); };
  const openPlayer = p  => { setSelPlayer(p); setSelTeam(null);   setSrOpen(false); setSearch(""); if(isMobile) setDrawerOpen(true); };
  const openTeam   = t  => { setSelTeam(t);   setSelPlayer(null); setSrOpen(false); setSearch(""); if(isMobile) setDrawerOpen(true); };
  const hasDetail  = selPlayer || selTeam;

  return (
    <div style={{
      position: "relative", zIndex: 1, minHeight: "100vh", background: "#000",
      fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Display','Helvetica Neue',sans-serif",
      color: "#fff",
    }}>
      <style>{KEYFRAMES}</style>

      {/* Subtle grid background */}
      <div aria-hidden="true" style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `linear-gradient(${T.line} 1px,transparent 1px),linear-gradient(90deg,${T.line} 1px,transparent 1px)`,
        backgroundSize: "64px 64px",
      }}/>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1320, margin: "0 auto", padding: isMobile ? "0 12px 80px" : "0 24px 60px" }}>

        {/* Header */}
        <div style={{ padding: isMobile ? "16px 0 14px" : "28px 0 20px", borderBottom: `1px solid ${T.line}`, marginBottom: 22, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 3, height: 48, background: T.blue, flexShrink: 0 }}/>
            <div>
              <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, letterSpacing: "-.6px", margin: 0, lineHeight: 1 }}>Stats Hub</h1>
              <p style={{ fontSize: 11, color: T.muted, margin: "5px 0 0", fontWeight: 500 }}>
                Goals · Assists · Clean sheets · Team form across all 5 European leagues
              </p>
            </div>
          </div>

          {/* Search */}
          <div ref={searchRef} style={{ position: "relative", width: isMobile ? "100%" : "min(300px,100%)" }}>
            <svg style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search players or teams…"
              style={{ width: "100%", padding: "10px 32px 10px 32px", borderRadius: 10, boxSizing: "border-box", background: "#0a0a0a", border: `1px solid ${T.line}`, color: "#fff", fontFamily: "inherit", fontSize: 12, outline: "none", transition: "border .15s" }}
              onFocus={e => { e.target.style.borderColor = `${T.blue}55`; setSrOpen(!!search.trim()); }}
              onBlur={e  => { e.target.style.borderColor = T.line; }}
            />
            {search && (
              <button onClick={() => { setSearch(""); setSrRes([]); setSrOpen(false); }}
                style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.muted, cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
                ✕
              </button>
            )}
            {srOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 900, background: "#0a0a0a", border: `1px solid rgba(255,255,255,.12)`, borderRadius: 12, overflow: "hidden", maxHeight: 340, overflowY: "auto" }}>
                <div style={{ padding: "8px 14px 4px", fontSize: 8, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: ".1em" }}>Results</div>
                {srLoading && [1,2,3].map(i => <div key={i} style={{ padding: "8px 14px" }}><Sk h={38}/></div>)}
                {!srLoading && srRes.length === 0 && <p style={{ fontSize: 12, color: T.dim, padding: "12px 14px", margin: 0 }}>No results for "{search}"</p>}
                {!srLoading && srRes.map(p => (
                  <div key={p.id} onClick={() => openPlayer(p)}
                    style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", cursor: "pointer", borderTop: `1px solid ${T.line}`, transition: "background .12s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.04)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: `${posColor(p.position)}14`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: posColor(p.position) }}>
                      {p.photo ? <img src={p.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.currentTarget.style.display="none"}/> : initials(p.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.8)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                      <p style={{ fontSize: 9, color: T.muted, margin: 0 }}>{p.team} · {p.position} · {p.league}</p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: T.red }}>{p.goals}G</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: T.green }}>{p.assists}A</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* League filter */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2, WebkitOverflowScrolling: "touch" }}>
          {LEAGUES.map(l => (
            <button key={l.key} onClick={() => onLeague(l.key)}
              style={{ padding: "7px 16px", borderRadius: 8, border: league === l.key ? `1px solid ${l.color}50` : `1px solid ${T.line}`, background: league === l.key ? `${l.color}12` : "transparent", color: league === l.key ? l.color : T.muted, fontFamily: "inherit", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all .18s", flexShrink: 0, whiteSpace: "nowrap", letterSpacing: ".02em" }}>
              {l.label}
            </button>
          ))}
        </div>

        {/* KPI row — 4 cols desktop, 2×2 mobile */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))", gap: isMobile ? 8 : 10, marginBottom: 20 }}>
          <KpiTile label="Leader"          value={pTop ? fmt(pTop[pCurrent.sk], pCurrent.dec) : "—"} sub={pTop?.name?.split(" ").slice(-1)[0] || ""}   color={pCurrent.sc} delay={0}    />
          <KpiTile label="League avg"      value={fmt(pAvg, 1)}                                       sub={`${pCurrent.sl} per player`}                  color={T.blue}      delay={0.05} />
          <KpiTile label="Players tracked" value={pRows.length || "—"}                                sub="Active this season"                            color={T.green}     delay={0.1}  />
          <KpiTile label="Per game (top)"  value={fmt(pTopPG, 2)}                                     sub={`${pCurrent.sl} per appearance`}               color={T.amber}     delay={0.15} />
        </div>

        {/* Main layout — 3-col desktop, stacked on mobile */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 340px", gap: 14 }}>

          {/* Player rankings */}
          <div style={{ background: "#050505", border: `1px solid ${T.line}`, borderRadius: 16, overflow: "hidden" }}>
            <PanelHeader label="Player Rankings" tabs={PLAYER_TABS} active={pTab} onSwitch={setPTab}/>
            {pLoading && [1,2,3,4,5,6,7].map(i => <Sk key={i} h={58}/>)}
            {!pLoading && pRows.length === 0 && (
              <div style={{ padding: "40px 20px", textAlign: "center", color: T.dim, fontSize: 12 }}>
                No data — check backend at {B}
              </div>
            )}
            {!pLoading && pRows.map((p, i) => (
              <PRow key={p.id || i} p={p} rank={i+1} cfg={pCurrent} max={pMax}
                selected={selPlayer?.id === p.id || selPlayer?.name === p.name}
                onClick={openPlayer}
              />
            ))}
          </div>

          {/* Team rankings */}
          <div style={{ background: "#050505", border: `1px solid ${T.line}`, borderRadius: 16, overflow: "hidden" }}>
            <PanelHeader label="Team Rankings" tabs={TEAM_TABS} active={tTab} onSwitch={setTTab}/>
            {tLoading && [1,2,3,4,5,6,7].map(i => <Sk key={i} h={58}/>)}
            {!tLoading && tRows.length === 0 && (
              <div style={{ padding: "40px 20px", textAlign: "center", color: T.dim, fontSize: 12 }}>
                No team data — check backend at {B}
              </div>
            )}
            {!tLoading && tRows.map((t, i) => (
              <TRow key={t.team_id || i} t={t} rank={i+1} cfg={tCurrent} max={tMax}
                selected={selTeam?.team_id === t.team_id || selTeam?.team === t.team}
                onClick={openTeam}
              />
            ))}
          </div>

          {/* Detail panel — sidebar on desktop, bottom drawer on mobile */}
          {!isMobile && (
            <div style={{ background: "#050505", border: `1px solid ${T.line}`, borderRadius: 16, overflow: "hidden", overflowY: "auto", maxHeight: "82vh" }}>
              {!hasDetail && (
                <div style={{ padding: "60px 20px", textAlign: "center", color: "rgba(255,255,255,.14)", fontSize: 12 }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"
                    style={{ display: "block", margin: "0 auto 12px", opacity: .35 }}>
                    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                  Select a player or team to view their full profile
                </div>
              )}
              {hasDetail && selPlayer && <PlayerDetail p={selPlayer} allRows={pRows} cfg={pCurrent}/>}
              {hasDetail && selTeam   && <TeamDetail   t={selTeam}   allRows={tRows} cfg={tCurrent}/>}
            </div>
          )}
        </div>
      </div>

      {/* Mobile detail drawer */}
      {isMobile && drawerOpen && hasDetail && (
        <>
          <div onClick={() => setDrawerOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 800, backdropFilter: "blur(4px)" }}/>
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 900, background: "#080808", border: `1px solid ${T.line}`, borderRadius: "20px 20px 0 0", maxHeight: "85vh", overflowY: "auto", animation: "drawerUp .28s cubic-bezier(.22,1,.36,1) both" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 0" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,.15)", margin: "0 auto" }}/>
            </div>
            <button onClick={() => setDrawerOpen(false)} style={{ position: "absolute", top: 14, right: 16, background: "rgba(255,255,255,.08)", border: "none", color: "#fff", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            {selPlayer && <PlayerDetail p={selPlayer} allRows={pRows} cfg={pCurrent}/>}
            {selTeam   && <TeamDetail   t={selTeam}   allRows={tRows} cfg={tCurrent}/>}
          </div>
        </>
      )}

      <PageFooter/>
    </div>
  );
}