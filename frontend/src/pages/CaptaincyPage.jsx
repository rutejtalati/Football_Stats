// CaptaincyPage.jsx — /captaincy
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { API_BASE as API } from "@/api/api";
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
/* ─── Design tokens ─────────────────────────────────────────────── */
const C = {
  bg: "#000000",
  surface: "rgba(255,255,255,0.04)",
  surfaceHov: "rgba(255,255,255,0.08)",
  border: "rgba(255,255,255,0.08)",
  borderHov: "rgba(255,255,255,0.18)",
  text: "#ffffff",
  muted: "rgba(255,255,255,0.4)",
  faint: "rgba(255,255,255,0.15)",
  gold: "#f2c94c",
  orange: "#ff8c42",
  green: "#00e09e",
  blue: "#4f9eff",
  red: "#ff4d6d",
  teal: "#2dd4bf",
  purple: "#b388ff",
};

const POS_COL = { GK: "#f2c94c", DEF: "#4f9eff", MID: "#00e09e", FWD: "#ff4d6d" };
const FDR_COL = { 1: "#00e09e", 2: "#78c952", 3: "#f2c94c", 4: "#ff8c42", 5: "#ff4d6d" };
const RANK_COL = ["#f2c94c", "#c0c0c0", "#cd7f32"];

/* ─── Team badge + player photo URL helpers ─────────────────────── */
// FPL bootstrap gives us team.code (e.g. 3 for Arsenal, 43 for Man City)
// Badge: https://resources.premierleague.com/premierleague/badges/70/t{code}.png
// Photo: already returned as full URL by backend _photo_url()

function TeamBadge({ code, size = 24, style = {} }) {
  const [err, setErr] = useState(false);
  if (!code || err) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 4,
        background: "rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.45, ...style,
      }}>⚽</div>
    );
  }
  return (
    <img
      src={`https://resources.premierleague.com/premierleague/badges/70/t${code}.png`}
      alt=""
      onError={() => setErr(true)}
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0, ...style }}
    />
  );
}

function PlayerPhoto({ src, name, size = 56, accentColor = C.blue }) {
  const [err, setErr] = useState(false);
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  if (!src || err) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: `${accentColor}18`,
        border: `2px solid ${accentColor}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.32, fontWeight: 800, color: accentColor,
        flexShrink: 0, letterSpacing: "0.02em",
      }}>{initials}</div>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      onError={() => setErr(true)}
      style={{
        width: size, height: size, borderRadius: "50%",
        objectFit: "cover", objectPosition: "top",
        border: `2px solid ${accentColor}44`,
        background: `${accentColor}10`,
        flexShrink: 0,
      }}
    />
  );
}

/* ─── Skeleton shimmer ──────────────────────────────────────────── */
function Skel({ w = "100%", h = 16, r = 8 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: "linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.09) 50%,rgba(255,255,255,0.04) 75%)",
      backgroundSize: "200% 100%",
      animation: "capShimmer 1.6s linear infinite",
    }} />
  );
}

/* ─── Mini progress bar ─────────────────────────────────────────── */
function MiniBar({ pct, color, h = 4 }) {
  return (
    <div style={{ height: h, borderRadius: h, background: "rgba(255,255,255,0.07)", overflow: "hidden", flex: 1, minWidth: 40 }}>
      <div style={{
        height: "100%", width: `${Math.min(pct, 100)}%`,
        background: color, borderRadius: h,
        transition: "width 1s cubic-bezier(0.22,1,0.36,1)",
      }} />
    </div>
  );
}

/* ─── Captain Card ──────────────────────────────────────────────── */
function CaptainCard({ pick, rank }) {
  const [hov, setHov] = useState(false);
  const posCol = POS_COL[pick.position] || C.blue;
  const rankCol = rank <= 3 ? RANK_COL[rank - 1] : "rgba(255,255,255,0.2)";
  const fdrCol = FDR_COL[pick.fixture_difficulty] || C.gold;
  const minSecPct = Math.round((pick.minutes_security || 0));
  const ownPct = Math.min((pick.ownership || 0) / 70 * 100, 100);

  return (
    <Link to={`/player/${pick.player_id}`} style={{ textDecoration: "none" }}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          background: hov ? C.surfaceHov : C.surface,
          border: `1px solid ${hov ? posCol + "44" : C.border}`,
          borderRadius: 20,
          padding: "16px 18px",
          position: "relative",
          overflow: "hidden",
          cursor: "pointer",
          transform: hov ? "translateY(-3px)" : "translateY(0)",
          boxShadow: hov ? `0 12px 36px ${posCol}14` : "none",
          transition: "all 0.28s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {/* Top accent line */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg,transparent,${posCol}${hov ? "88" : "44"},transparent)`,
        }} />

        {/* Main row */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {/* Rank badge */}
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: `${rankCol}18`,
            border: `2px solid ${rankCol}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 900, color: rankCol,
            fontFamily: "'SF Mono','JetBrains Mono',monospace",
          }}>{rank}</div>

          {/* Player photo */}
          <PlayerPhoto src={pick.photo} name={pick.name} size={52} accentColor={posCol} />

          {/* Name / meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 15, fontWeight: 800, color: C.text,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{pick.name}</span>
              <span style={{
                fontSize: 9, fontWeight: 800, color: posCol,
                background: `${posCol}18`, border: `1px solid ${posCol}33`,
                padding: "2px 7px", borderRadius: 999,
              }}>{pick.position}</span>
              {pick.differential && (
                <span style={{
                  fontSize: 9, fontWeight: 800, color: C.teal,
                  background: `${C.teal}14`, border: `1px solid ${C.teal}33`,
                  padding: "2px 7px", borderRadius: 999,
                }}>DIFF</span>
              )}
              {pick.home_fixture && (
                <span style={{
                  fontSize: 9, fontWeight: 800, color: C.green,
                  background: `${C.green}14`, border: `1px solid ${C.green}33`,
                  padding: "2px 7px", borderRadius: 999,
                }}>HOME</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {/* Team badge + name */}
              <TeamBadge code={pick.team_code} size={18} />
              <span style={{ fontSize: 11, color: C.muted }}>{pick.team}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>£{pick.cost}m</span>
              <span style={{ fontSize: 11, color: C.muted }}>{pick.ownership}% owned</span>
              <span style={{
                fontSize: 10, fontWeight: 800, color: fdrCol,
                background: `${fdrCol}18`, border: `1px solid ${fdrCol}40`,
                padding: "2px 8px", borderRadius: 999,
                fontFamily: "'SF Mono',monospace",
              }}>{pick.next_opp || "TBD"}</span>
            </div>
          </div>

          {/* Captain Score */}
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{
              fontSize: 28, fontWeight: 900, color: posCol, lineHeight: 1,
              fontFamily: "'SF Mono','JetBrains Mono',monospace",
              textShadow: hov ? `0 0 20px ${posCol}88` : `0 0 10px ${posCol}44`,
              transition: "text-shadow 0.3s",
            }}>{(pick.captain_score || 0).toFixed(1)}</div>
            <div style={{ fontSize: 8, color: C.muted, letterSpacing: "0.1em", marginTop: 2 }}>CAP SCORE</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>
              EP {(pick.ep_next || 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{
          display: "flex", gap: 0, marginTop: 12, paddingTop: 10,
          borderTop: `1px solid ${C.border}`, flexWrap: "wrap",
        }}>
          {[
            ["FORM", (pick.form || 0).toFixed(1), C.green],
            ["MIN SEC", `${minSecPct}%`, C.blue],
            ["FDR RUN", `${(pick.fixture_run_score || 0).toFixed(1)}/10`, fdrCol],
            ["NET XFERS", pick.transfer_momentum > 0
              ? `+${(pick.transfer_momentum / 1000).toFixed(0)}k`
              : `${(pick.transfer_momentum / 1000).toFixed(0)}k`,
              pick.transfer_momentum > 0 ? C.green : C.red],
          ].map(([label, val, col]) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 2, marginRight: 20, minWidth: 60 }}>
              <span style={{ fontSize: 8, color: C.muted, letterSpacing: "0.09em", fontWeight: 700 }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: col, fontFamily: "'SF Mono',monospace" }}>{val}</span>
            </div>
          ))}

          {/* Ownership bar */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, justifyContent: "flex-end", minWidth: 80 }}>
            <span style={{ fontSize: 8, color: C.muted, letterSpacing: "0.08em", fontWeight: 700 }}>OWNERSHIP</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <MiniBar pct={ownPct} color={posCol} />
              <span style={{ fontSize: 10, fontWeight: 800, color: posCol, minWidth: 34, fontFamily: "'SF Mono',monospace" }}>
                {pick.ownership}%
              </span>
            </div>
          </div>
        </div>

        {/* News alert */}
        {pick.news && (
          <div style={{
            marginTop: 8, fontSize: 10, color: C.orange,
            background: `${C.orange}0d`, border: `1px solid ${C.orange}25`,
            padding: "4px 10px", borderRadius: 8,
          }}>⚠ {pick.news}</div>
        )}
      </div>
    </Link>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function CaptaincyPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState(15.5);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/fpl/captaincy?budget=${budget}&top_n=20`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [budget]);

  const picks = (data?.picks || []).filter(p =>
    filter === "DIFF" ? p.differential :
    filter === "HOME" ? p.home_fixture : true
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "-apple-system,'SF Pro Display',sans-serif" }}>
      <style>{`
        @keyframes capShimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes capFadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        background: "rgba(0,0,0,0.9)", backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${C.border}`,
        padding: "24px 24px 0", position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <Link to="/gameweek-insights" style={{ color: C.muted, textDecoration: "none", fontSize: 12, display: "inline-block", marginBottom: 10 }}>
            ← Gameweek Hub
          </Link>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.gold, letterSpacing: "0.14em", marginBottom: 6 }}>
            FPL CAPTAIN TOOL
          </div>
          <h1 style={{
            fontSize: "clamp(24px,4vw,36px)", fontWeight: 900, margin: "0 0 10px",
            background: `linear-gradient(135deg,${C.gold},${C.orange})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>Captain Picker</h1>

          {/* Description */}
          <p style={{ fontSize: 13, color: C.muted, margin: "0 0 16px", lineHeight: 1.7, maxWidth: 640 }}>
            Every FPL midfielder and forward ranked by Captain Score, a composite metric that doubles expected points and rewards low ownership, strong recent form, and home fixtures. Use this to find the highest-upside armband choice for this gameweek.
            {data?.current_gw && ` Showing picks for GW${data.current_gw}.`}
          </p>

          {/* Filters */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", paddingBottom: 16 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {[["ALL", "All Players"], ["DIFF", "Differentials"], ["HOME", "Home Only"]].map(([val, label]) => (
                <button key={val} onClick={() => setFilter(val)} style={{
                  padding: "6px 14px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                  background: filter === val ? `${C.gold}20` : C.surface,
                  border: `1px solid ${filter === val ? C.gold + "55" : C.border}`,
                  color: filter === val ? C.gold : C.muted,
                  cursor: "pointer",
                }}>{label}</button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
              <span style={{ fontSize: 10, color: C.muted, fontWeight: 700 }}>MAX COST</span>
              <select value={budget} onChange={e => setBudget(+e.target.value)} style={{
                background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`,
                color: C.text, padding: "5px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer",
              }}>
                {[6.5,7.5,8.5,9.5,10.5,11.5,12.5,13.5,14.5,15.5].map(v =>
                  <option key={v} value={v}>£{v}m</option>
                )}
              </select>
              <span style={{ fontSize: 11, color: C.muted }}>{picks.length} picks</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cards ── */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "16px 24px 80px" }}>
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} style={{ borderRadius: 20, border: `1px solid ${C.border}`, padding: "20px 18px" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <Skel w={34} h={34} r={10} />
                  <Skel w={52} h={52} r={26} />
                  <div style={{ flex: 1 }}><Skel h={16} w="55%" /><div style={{ marginTop: 6 }}><Skel h={12} w="75%" /></div></div>
                  <Skel w={50} h={28} r={8} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && picks.length === 0 && (
          <div style={{ textAlign: "center", color: C.muted, padding: 60, fontSize: 14 }}>
            No picks match your current filters.
          </div>
        )}

        {!loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {picks.map((p, i) => (
              <div key={p.player_id} style={{ animation: `capFadeUp 420ms ${i * 45}ms ease both` }}>
                <CaptainCard pick={p} rank={i + 1} />
              </div>
            ))}
          </div>
        )}

        {/* Formula note */}
        <div style={{
          marginTop: 32, padding: "16px 20px", borderRadius: 16,
          background: `${C.gold}06`, border: `1px solid ${C.gold}18`,
          fontSize: 12, color: C.muted, lineHeight: 1.7,
        }}>
          <span style={{ color: C.gold, fontWeight: 700 }}>Captain Score</span> equals expected points multiplied by 2 with a differential bonus applied. Players owned under 15% receive the full bonus. Above 15% the bonus decays linearly. Fixture run and clean sheet probability are folded into expected points via the xG/xA rate model.
        </div>
      </div>
    </div>
  );
}