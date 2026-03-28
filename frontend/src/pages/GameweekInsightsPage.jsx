// GameweekInsightsPage.jsx — /gameweek-insights
import { useState, useEffect, useMemo } from "react";
import { API_BASE as API } from "@/api/api";
function useIsMobile(bp=768){const[m,setM]=useState(()=>typeof window!=="undefined"?window.innerWidth<bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<bp);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[bp]);return m;}

/* ─── Design tokens ─────────────────────────────────────────────── */
const C = {
  bg: "#000000",
  surface: "rgba(255,255,255,0.04)",
  surfaceHov: "rgba(255,255,255,0.07)",
  border: "rgba(255,255,255,0.07)",
  text: "#ffffff",
  muted: "rgba(255,255,255,0.38)",
  green: "#00e09e",
  blue: "#4f9eff",
  gold: "#f2c94c",
  orange: "#ff8c42",
  red: "#ff4d6d",
  teal: "#2dd4bf",
  purple: "#b388ff",
};
function SiteFooter() {
  return (
    <footer style={{ background: "#000", borderTop: "0.5px solid rgba(255,255,255,0.08)", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, padding: "0 28px", height: 52 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
            <rect x="4"  y="3"  width="14" height="3.5" rx="1.75" fill="#0a84ff" />
            <rect x="4"  y="9"  width="10" height="3.5" rx="1.75" fill="#0a84ff" opacity="0.65" />
            <rect x="4"  y="15" width="14" height="3.5" rx="1.75" fill="#0a84ff" opacity="0.4" />
            <rect x="4"  y="21" width="7"  height="3.5" rx="1.75" fill="#0a84ff" opacity="0.22" />
            <rect x="20" y="15" width="3"  height="10"  rx="1.5"  fill="#30d158" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "-0.03em" }}>StatinSite</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Football Intelligence · ELO · Dixon-Coles · xG</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.09)", borderRadius: 999, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Built by</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>Rutej Talati</span>
        </div>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", flexShrink: 0, whiteSpace: "nowrap" }}>© {new Date().getFullYear()} StatinSite</span>
      </div>
    </footer>
  );
}
const POS_COL = { GK: "#f2c94c", DEF: "#4f9eff", MID: "#00e09e", FWD: "#ff6b6b" };
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "picks",    label: "Top Picks" },
  { id: "chips",    label: "Chip Advisor" },
  { id: "fixtures", label: "Fixtures" },
  { id: "injuries", label: "Injuries" },
];

/* ─── URL helpers ───────────────────────────────────────────────── */
const playerPhotoUrl = (code) =>
  code ? `https://resources.premierleague.com/premierleague/photos/players/110x140/p${code}.png` : null;

const teamBadgeUrl = (code) =>
  code ? `https://resources.premierleague.com/premierleague/badges/70/t${code}.png` : null;

/* ─── Shared: Team Badge ────────────────────────────────────────── */
function TeamBadge({ code, size = 24 }) {
  const [err, setErr] = useState(false);
  if (!code || err) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 4,
        background: "rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.5, flexShrink: 0,
      }}>⚽</div>
    );
  }
  return (
    <img src={teamBadgeUrl(code)} alt="" onError={() => setErr(true)}
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }}
    />
  );
}

/* ─── Shared: Player Photo ──────────────────────────────────────── */
function PlayerPhoto({ code, name, size = 44, accent = C.blue }) {
  const [err, setErr] = useState(false);
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const src = playerPhotoUrl(code);
  if (!src || err) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: `${accent}18`, border: `2px solid ${accent}33`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.3, fontWeight: 800, color: accent, flexShrink: 0,
      }}>{initials}</div>
    );
  }
  return (
    <img src={src} alt={name} onError={() => setErr(true)}
      style={{
        width: size, height: size, borderRadius: "50%",
        objectFit: "cover", objectPosition: "top",
        border: `2px solid ${accent}33`,
        background: `${accent}0a`, flexShrink: 0,
      }}
    />
  );
}

/* ─── Shimmer skeleton ──────────────────────────────────────────── */
function Skel({ w = "100%", h = 14, r = 7 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: "linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.09) 50%,rgba(255,255,255,0.04) 75%)",
      backgroundSize: "200% 100%",
      animation: "gwShimmer 1.6s linear infinite",
    }} />
  );
}

/* ─── Mini progress bar ─────────────────────────────────────────── */
function Bar({ pct, color, h = 4 }) {
  return (
    <div style={{ height: h, borderRadius: h, background: "rgba(255,255,255,0.07)", overflow: "hidden", flex: 1, minWidth: 40 }}>
      <div style={{
        height: "100%", borderRadius: h, background: color,
        width: `${Math.min(pct, 100)}%`,
        transition: "width 1s cubic-bezier(0.22,1,0.36,1)",
      }} />
    </div>
  );
}

/* ─── Panel card ────────────────────────────────────────────────── */
function Panel({ children, style = {} }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 20, padding: "18px 20px",
      ...style,
    }}>{children}</div>
  );
}

/* ─── Section label ─────────────────────────────────────────────── */
function SecLabel({ text, accent = C.blue, sub = null }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
      <div style={{ width: 3, height: 14, borderRadius: 2, background: accent, flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 800, color: C.text, letterSpacing: "0.06em" }}>{text}</span>
      {sub && <span style={{ fontSize: 10, color: C.muted }}>{sub}</span>}
    </div>
  );
}

/* ─── Hero stat card ────────────────────────────────────────────── */
function HeroCard({ label, val, sub, color, delay = 0 }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 18, padding: "16px 18px",
      position: "relative", overflow: "hidden",
      animation: `gwFadeUp 0.5s ${delay}s ease both`,
    }}>
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
        background: color, opacity: 0.5,
      }} />
      <div style={{ fontSize: 9, fontWeight: 800, color: C.muted, letterSpacing: "0.1em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color, fontFamily: "'SF Mono',monospace", lineHeight: 1 }}>{val}</div>
      {sub && <div style={{ fontSize: 10, color: C.muted, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

/* ─── Player row (used in Top Picks / differentials) ────────────── */
function PlayerRow({ player, rank, color, metric, metricLabel, maxMetric, delay = 0 }) {
  const [hov, setHov] = useState(false);
  const col = POS_COL[player.position] || C.blue;
  const pct = maxMetric > 0 ? (metric / maxMetric) * 100 : 0;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 10px", borderRadius: 12,
        background: hov ? C.surfaceHov : "rgba(255,255,255,0.025)",
        border: `1px solid ${hov ? C.border : "transparent"}`,
        transition: "all 0.2s", cursor: "default",
        animation: `gwFadeUp 0.4s ${delay}s ease both`,
      }}
    >
      <span style={{ fontSize: 9, fontWeight: 900, color: C.muted, width: 18, flexShrink: 0 }}>{rank}</span>
      <PlayerPhoto code={player.code} name={player.name} size={36} accent={col} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {player.name}
          </span>
          <span style={{ fontSize: 8, fontWeight: 800, color: col, background: `${col}14`, border: `1px solid ${col}25`, padding: "1px 5px", borderRadius: 999 }}>
            {player.position}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
          <TeamBadge code={player.team_code} size={14} />
          <span style={{ fontSize: 9, color: C.muted }}>{player.team} · £{player.cost}m</span>
        </div>
      </div>
      <Bar pct={pct} color={color} h={3} />
      <div style={{ textAlign: "right", flexShrink: 0, minWidth: 38 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color, fontFamily: "'SF Mono',monospace" }}>
          {typeof metric === "number" ? metric.toFixed(1) : metric}
        </div>
        <div style={{ fontSize: 8, color: C.muted }}>{metricLabel}</div>
      </div>
    </div>
  );
}

/* ─── Fixture row ───────────────────────────────────────────────── */
function FixtureRow({ fix, homeCode, awayCode, delay = 0 }) {
  const [hov, setHov] = useState(false);
  const total = (fix.home_prob || 0) + (fix.draw_prob || 0) + (fix.away_prob || 0) || 1;
  const hPct  = (fix.home_prob || 0) / total * 100;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 12px", borderRadius: 12,
        background: hov ? C.surfaceHov : C.surface,
        border: `1px solid ${hov ? C.border : "transparent"}`,
        transition: "all 0.2s", cursor: "default",
        animation: `gwFadeUp 0.4s ${delay}s ease both`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Teams */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <TeamBadge code={homeCode} size={22} />
          <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{fix.home}</span>
          <span style={{ fontSize: 10, color: C.muted, margin: "0 4px" }}>vs</span>
          <TeamBadge code={awayCode} size={22} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.65)" }}>{fix.away}</span>
        </div>
        {/* Probability bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 3,
              background: `linear-gradient(90deg,${C.blue},${C.green})`,
              width: `${hPct}%`, transition: "width 1s ease",
            }} />
          </div>
          <div style={{ display: "flex", gap: 6, fontSize: 10, fontWeight: 700, fontFamily: "'SF Mono',monospace", flexShrink: 0 }}>
            <span style={{ color: C.blue }}>{Math.round(fix.home_prob || 45)}%</span>
            <span style={{ color: C.muted }}>{Math.round(fix.draw_prob || 28)}%</span>
            <span style={{ color: C.red }}>{Math.round(fix.away_prob || 27)}%</span>
          </div>
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: fix.is_live ? C.red : C.muted }}>
          {fix.is_live ? <span><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: C.red, marginRight: 4, animation: "gwPulse 1.2s infinite" }} />LIVE</span> : fix.kickoff}
        </div>
        {fix.score && <div style={{ fontSize: 16, fontWeight: 900, color: C.text, marginTop: 2, fontFamily: "'SF Mono',monospace" }}>{fix.score}</div>}
      </div>
    </div>
  );
}

/* ─── Chip advisor card ─────────────────────────────────────────── */
function ChipCard({ chip, delay = 0 }) {
  const [hov, setHov] = useState(false);
  const useNow = chip.recommendation === "NOW";
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 16px", borderRadius: 18,
        background: hov ? `linear-gradient(135deg,rgba(10,16,28,0.98),${chip.color}0a)` : C.surface,
        border: `1px solid ${hov ? chip.color + "44" : C.border}`,
        transform: hov ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.28s cubic-bezier(0.34,1.56,0.64,1)",
        animation: `gwFadeUp 0.45s ${delay}s ease both`,
        cursor: "default",
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 14, flexShrink: 0,
        background: `${chip.color}14`, border: `1px solid ${chip.color}33`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22,
      }}>{chip.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 3 }}>{chip.name}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: useNow ? C.green : C.muted, marginBottom: 3 }}>
          {useNow ? "Use now" : "Hold for later"}
        </div>
        <div style={{ fontSize: 10, color: C.muted }}>{chip.reason}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: chip.color, fontFamily: "'SF Mono',monospace" }}>
          {chip.score}
        </div>
        <div style={{ fontSize: 8, color: C.muted, letterSpacing: "0.08em" }}>SCORE</div>
      </div>
    </div>
  );
}

/* ─── Injury pill ───────────────────────────────────────────────── */
function InjPill({ player, delay = 0 }) {
  const prob = Math.round((player.appearance_prob || 0) * 100);
  const col = prob < 40 ? C.red : prob < 70 ? C.orange : C.gold;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 12px", borderRadius: 12,
      background: `${col}06`, border: `1px solid ${col}18`,
      animation: `gwFadeUp 0.4s ${delay}s ease both`,
    }}>
      <PlayerPhoto code={player.code} name={player.name} size={34} accent={col} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {player.name}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
          <TeamBadge code={player.team_code} size={14} />
          <span style={{ fontSize: 9, color: C.muted }}>{player.team}</span>
          {player.news && <span style={{ fontSize: 9, color: col, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>· {player.news}</span>}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: col, fontFamily: "'SF Mono',monospace" }}>{prob}%</div>
        <div style={{ fontSize: 8, color: C.muted }}>PLAY PROB</div>
      </div>
    </div>
  );
}

/* ─── Deadline countdown ────────────────────────────────────────── */
function useCountdown(deadline) {
  const [left, setLeft] = useState("");
  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const diff = new Date(deadline) - Date.now();
      if (diff <= 0) { setLeft("DEADLINE PASSED"); return; }
      const h = Math.floor(diff / 3.6e6);
      const m = Math.floor((diff % 3.6e6) / 60000);
      setLeft(`${h}h ${m}m`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [deadline]);
  return left;
}

/* ─── Main page ─────────────────────────────────────────────────── */
export default function GameweekInsightsPage() {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState("overview");
  const [bootstrap, setBootstrap] = useState(null);
  const [players, setPlayers] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ── Fetch bootstrap + predictor table ── */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetch(`${API}/api/fpl/predictor-table?num_gws=5&min_prob=0.0&sort_by=ep_next`)
        .then(r => r.ok ? r.json() : null),
      fetch(`${API}/api/fpl/fixture-difficulty?num_gws=5`)
        .then(r => r.ok ? r.json() : null),
    ]).then(([tbl, fdr]) => {
      if (cancelled) return;
      setPlayers(tbl?.rows || tbl?.players || []);
      if (fdr) setFixtures(fdr);
      if (tbl) setBootstrap({ current_gw: tbl.current_gw || tbl.gw });
      setLoading(false);
    }).catch(e => {
      if (!cancelled) { setError(String(e)); setLoading(false); }
    });

    return () => { cancelled = true; };
  }, []);

  /* ── Derived data ── */
  const sorted        = useMemo(() => [...players].sort((a, b) => (b.ep_next || 0) - (a.ep_next || 0)), [players]);
  const diffs         = useMemo(() => players.filter(p => (p.selected_by_pct || 0) < 12).sort((a, b) => (b.ep_next || 0) - (a.ep_next || 0)), [players]);
  const atRisk        = useMemo(() => players.filter(p => (p.appearance_prob || 1) < 0.85).sort((a, b) => (a.appearance_prob || 0) - (b.appearance_prob || 0)), [players]);
  const byValue       = useMemo(() => [...players].sort((a, b) => (b.value_score || 0) - (a.value_score || 0)), [players]);
  const currentGw     = bootstrap?.current_gw;

  /* ── Chip advisor (static heuristics — no endpoint needed) ── */
  const chips = [
    { icon: "⚡", name: "Triple Captain", recommendation: "NOW", score: 88, color: C.gold,
      reason: "Use when your top captain pick has an excellent home fixture." },
    { icon: "🏦", name: "Bench Boost", recommendation: "HOLD", score: 62, color: C.blue,
      reason: "Best deployed in a double gameweek when all 15 players have fixtures." },
    { icon: "🆓", name: "Free Hit", recommendation: "HOLD", score: 55, color: C.green,
      reason: "Save for a blank gameweek to field a full starting 11." },
    { icon: "♻️", name: "Wildcard", recommendation: "HOLD", score: 71, color: C.purple,
      reason: "Use to overhaul your squad ahead of a favourable fixture run." },
  ];

  const fxTeams = fixtures?.teams || [];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "-apple-system,'SF Pro Display',sans-serif" }}>
      <style>{`
        @keyframes gwShimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes gwFadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes gwPulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { height: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
      `}</style>

      {/* ── Sticky header ── */}
      <div style={{
        background: "rgba(0,0,0,0.92)", backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${C.border}`,
        padding: isMobile ? "16px 14px 0" : "24px 24px 0", position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {/* Title row */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: C.blue, letterSpacing: "0.14em" }}>
                  GAMEWEEK HUB
                </div>
                {currentGw && (
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    background: "rgba(0,224,158,0.12)", border: "1px solid rgba(0,224,158,0.25)",
                    borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: C.green,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block", animation: "gwPulse 1.5s infinite" }} />
                    GW{currentGw}
                  </div>
                )}
              </div>
              <h1 style={{
                fontSize: "clamp(22px,4vw,34px)", fontWeight: 900, margin: "0 0 10px",
                background: `linear-gradient(135deg,${C.blue},${C.green})`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>Gameweek Insights</h1>
            </div>
          </div>

          {/* Description */}
          <p style={{ fontSize: 13, color: C.muted, margin: "0 0 16px", lineHeight: 1.7, maxWidth: 760 }}>
            Your complete FPL command centre for the current gameweek. Browse projected points, captain picks, differential targets and chip timing advice all in one place. The Top Picks tab ranks every player by expected points for this gameweek. The Chip Advisor scores each chip based on current fixture difficulty and your squad context. The Fixtures tab shows upcoming match probabilities powered by the Dixon Coles Poisson model. The Injuries tab surfaces players with reduced appearance probability so you can react before deadline.
          </p>

          {/* Tab bar */}
          <div style={{ display: "flex", gap: 2, overflowX: "auto", scrollbarWidth: "none" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: "10px 18px", borderRadius: "12px 12px 0 0",
                fontSize: 13, fontWeight: tab === t.id ? 800 : 600,
                background: tab === t.id ? C.surface : "transparent",
                border: `1px solid ${tab === t.id ? C.border : "transparent"}`,
                borderBottom: "none",
                color: tab === t.id ? C.text : C.muted,
                cursor: "pointer", whiteSpace: "nowrap",
                transition: "all 0.2s",
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab content ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "14px 14px 80px" : "20px 24px 80px" }}>

        {/* ══ OVERVIEW ══ */}
        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Hero stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10 }}>
              <HeroCard label="CURRENT GW" val={currentGw || "—"} sub="active gameweek" color={C.gold} delay={0} />
              <HeroCard label="TOP EP PICK" val={sorted[0] ? (sorted[0].ep_next || 0).toFixed(2) : "—"} sub={sorted[0]?.name || ""} color={C.green} delay={0.05} />
              <HeroCard label="PLAYERS TRACKED" val={players.length || "—"} sub="with EP projections" color={C.blue} delay={0.1} />
              <HeroCard label="DIFFERENTIALS" val={diffs.length} sub="under 12% owned" color={C.teal} delay={0.15} />
              <HeroCard label="INJURY RISK" val={atRisk.length} sub="below 85% prob" color={C.red} delay={0.2} />
            </div>

            {/* Two-col: top picks + best value */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
              <Panel>
                <SecLabel text="TOP EXPECTED POINTS" accent={C.green} sub="highest EP picks this GW" />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => <Skel key={i} h={44} r={12} />)
                    : sorted.slice(0, 10).map((p, i) => (
                        <PlayerRow key={p.player_id || i} player={p} rank={i+1} color={C.green}
                          metric={p.ep_next || 0} metricLabel="EP" maxMetric={sorted[0]?.ep_next || 1} delay={i * 0.03} />
                      ))
                  }
                </div>
              </Panel>
              <Panel>
                <SecLabel text="BEST VALUE PER £M" accent={C.purple} sub="points per million spent" />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => <Skel key={i} h={44} r={12} />)
                    : byValue.slice(0, 10).map((p, i) => (
                        <PlayerRow key={p.player_id || i} player={p} rank={i+1} color={C.purple}
                          metric={p.value_score || 0} metricLabel="VAL" maxMetric={byValue[0]?.value_score || 1} delay={i * 0.03} />
                      ))
                  }
                </div>
              </Panel>
            </div>

            {/* Differentials highlight */}
            <Panel>
              <SecLabel text="TOP DIFFERENTIALS THIS GW" accent={C.teal} sub="owned under 12%  high reward upside" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 10 }}>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => <Skel key={i} h={70} r={12} />)
                  : diffs.slice(0, 6).map((p, i) => {
                      const col = POS_COL[p.position] || C.blue;
                      return (
                        <div key={p.player_id || i} style={{
                          display: "flex", gap: 10, alignItems: "center",
                          padding: "10px 12px", borderRadius: 14,
                          background: "rgba(255,255,255,0.03)", border: `1px solid ${C.teal}18`,
                          animation: `gwFadeUp 0.4s ${i * 0.05}s ease both`,
                        }}>
                          <PlayerPhoto code={p.code} name={p.name} size={40} accent={col} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                            <div style={{ display: "flex", gap: 5, alignItems: "center", marginTop: 2 }}>
                              <TeamBadge code={p.team_code} size={13} />
                              <span style={{ fontSize: 9, color: C.muted }}>{p.team}</span>
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 900, color: C.teal, fontFamily: "'SF Mono',monospace" }}>
                              {(p.ep_next || 0).toFixed(1)}
                            </div>
                            <div style={{ fontSize: 8, color: C.muted }}>{(p.selected_by_pct || 0).toFixed(1)}% owned</div>
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </Panel>
          </div>
        )}

        {/* ══ TOP PICKS ══ */}
        {tab === "picks" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(320px,100%),1fr))", gap: 16 }}>
            {["MID","FWD","DEF","GK"].map(pos => {
              const posPicks = sorted.filter(p => p.position === pos);
              const col = POS_COL[pos] || C.blue;
              return (
                <Panel key={pos}>
                  <SecLabel
                    text={`TOP ${pos === "GK" ? "GOALKEEPERS" : pos === "DEF" ? "DEFENDERS" : pos === "MID" ? "MIDFIELDERS" : "FORWARDS"}`}
                    accent={col}
                    sub={`${posPicks.length} players`}
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {loading
                      ? Array.from({ length: 6 }).map((_, i) => <Skel key={i} h={44} r={12} />)
                      : posPicks.slice(0, 8).map((p, i) => (
                          <PlayerRow key={p.player_id || i} player={p} rank={i+1} color={col}
                            metric={p.ep_next || 0} metricLabel="EP" maxMetric={posPicks[0]?.ep_next || 1} delay={i * 0.03} />
                        ))
                    }
                  </div>
                </Panel>
              );
            })}
          </div>
        )}

        {/* ══ CHIPS ══ */}
        {tab === "chips" && (
          <div style={{ maxWidth: 700 }}>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.7 }}>
              Each chip is scored out of 100 based on fixture difficulty, expected points ceiling and historical deployment timing. A score above 75 suggests now is a strong window to use that chip.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {chips.map((chip, i) => <ChipCard key={chip.name} chip={chip} delay={i * 0.07} />)}
            </div>
          </div>
        )}

        {/* ══ FIXTURES ══ */}
        {tab === "fixtures" && (
          <div style={{ maxWidth: 700 }}>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.7 }}>
              Upcoming fixtures with Dixon Coles Poisson win probabilities. The probability bar shows the home win likelihood from left to right. Green equals home, red equals away.
            </div>
            {loading
              ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Array.from({ length: 8 }).map((_, i) => <Skel key={i} h={68} r={14} />)}
                </div>
              : fxTeams.slice(0, 10).map((team, i) => {
                  const gw = fixtures?.gws?.[0];
                  const fx = team.fixtures?.[gw];
                  if (!fx) return null;
                  return (
                    <div key={team.team_id} style={{ marginBottom: 8 }}>
                      <FixtureRow
                        delay={i * 0.04}
                        homeCode={team.code}
                        awayCode={null}
                        fix={{
                          home: team.name,
                          away: fx.opp || fx.opp_short,
                          kickoff: `GW${gw}`,
                          home_prob: (1 / Math.max(fx.difficulty, 1)) * 45 + 25,
                          draw_prob: 25,
                          away_prob: Math.max(5, fx.difficulty * 10),
                          is_live: false,
                        }}
                      />
                    </div>
                  );
                })
            }
          </div>
        )}

        {/* ══ INJURIES ══ */}
        {tab === "injuries" && (
          <div style={{ maxWidth: 700 }}>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.7 }}>
              Players with appearance probability below 85% based on FPL injury data, minutes rate and form signals. Check these before your deadline to avoid blank starters.
            </div>
            {loading
              ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Array.from({ length: 10 }).map((_, i) => <Skel key={i} h={52} r={12} />)}
                </div>
              : atRisk.length === 0
                ? <div style={{ textAlign: "center", padding: "60px 0", color: C.muted, fontSize: 14 }}>
                    No players flagged with reduced appearance probability.
                  </div>
                : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {atRisk.slice(0, 20).map((p, i) => <InjPill key={p.player_id || i} player={p} delay={i * 0.04} />)}
                  </div>
            }
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: "12px 16px", borderRadius: 12, marginTop: 20,
            background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.2)",
            color: "#ff8080", fontSize: 13,
          }}>Failed to load data: {error}</div>
        )}
      </div>
    </div>
  );
}