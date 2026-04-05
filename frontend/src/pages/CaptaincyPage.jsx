// CaptaincyPage.jsx — /captaincy
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { API_BASE as API } from "@/api/api";
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
          background: hov ? "#111" : "#0c0c0c",
          border: `1px solid ${hov ? posCol + "44" : "rgba(255,255,255,0.09)"}`,
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
                fontSize: 15, fontWeight: 800, color: "#fff",
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
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>{pick.team}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>£{pick.cost}m</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>{pick.ownership}% owned</span>
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
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginTop: 2 }}>CAP SCORE</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", marginTop: 3 }}>
              EP {(pick.ep_next || 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{
          display: "flex", gap: 0, marginTop: 12, paddingTop: 10,
          borderTop: "1px solid rgba(255,255,255,0.07)", flexWrap: "wrap",
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
              <span style={{ fontSize: 8, color: "rgba(255,255,255,0.32)", letterSpacing: "0.09em", fontWeight: 800, textTransform:"uppercase" }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: col, fontFamily: "'JetBrains Mono',monospace" }}>{val}</span>
            </div>
          ))}

          {/* Ownership bar */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, justifyContent: "flex-end", minWidth: 80 }}>
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.32)", letterSpacing: "0.08em", fontWeight: 800, textTransform:"uppercase" }}>OWNERSHIP</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <MiniBar pct={ownPct} color={posCol} />
              <span style={{ fontSize: 10, fontWeight: 900, color: posCol, minWidth: 34, fontFamily: "'JetBrains Mono',monospace" }}>
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
            padding: "4px 10px", borderRadius: 8, fontWeight: 600,
          }}>{pick.news}</div>
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
    <div style={{ minHeight:"100vh", background:"#000", color:"#fff", fontFamily:"'Inter',system-ui,sans-serif" }}>
      <style>{`
        @keyframes capShimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes capFadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
      `}</style>

      {/* ── PAGE HEADER ── */}
      <div className="sn-ph" style={{ background:"linear-gradient(175deg,rgba(255,214,10,0.05) 0%,transparent 55%)" }}>
        <div className="sn-ph-row">
          <div>
            <div className="sn-eyebrow">
              <div className="sn-eyebrow-dot" style={{ background:"#ffd60a" }}/>
              <span className="sn-eyebrow-label" style={{ color:"#ffd60a" }}>
                FPL · Captaincy{data?.current_gw ? ` · GW${data.current_gw}` : ""}
              </span>
            </div>
            <h1 className="sn-page-title">Who to Captain</h1>
            <p className="sn-page-sub">
              Best armband pick for double points — ranked by Captain Score combining EP, form, fixture difficulty and ownership.
              {data?.current_gw && ` Showing picks for GW${data.current_gw}.`}
            </p>
          </div>
          <div className="sn-badge" style={{ color:"#ffd60a", borderColor:"rgba(255,214,10,0.3)", background:"rgba(255,214,10,0.08)" }}>
            {picks.length} Picks
          </div>
        </div>
      </div>

      {/* ── STAT STRIP ── */}
      {!loading && data && (
        <div className="sn-strip">
          <div className="sn-chip">
            <div className="sn-chip-label">Top pick</div>
            <div className="sn-chip-value" style={{ color:"#ffd60a", fontSize:16 }}>
              {picks[0]?.name?.split(" ").slice(-1)[0] || "—"}
            </div>
            <div className="sn-chip-sub">{picks[0]?.ep_next?.toFixed(2)} EP projected</div>
          </div>
          <div className="sn-chip">
            <div className="sn-chip-label">Cap score</div>
            <div className="sn-chip-value" style={{ color:"#30d158" }}>
              {picks[0]?.captain_score?.toFixed(1) || "—"}
            </div>
          </div>
          <div className="sn-chip">
            <div className="sn-chip-label">Ownership</div>
            <div className="sn-chip-value" style={{ color:"#0a84ff" }}>
              {picks[0]?.ownership?.toFixed(1) || "—"}%
            </div>
          </div>
          <div className="sn-chip">
            <div className="sn-chip-label">Max cost</div>
            <div className="sn-chip-value" style={{ color:"#fff", fontSize:17 }}>£{budget}m</div>
          </div>
        </div>
      )}

      {/* ── FILTER BAR ── */}
      <div style={{ padding:"12px 24px 12px", borderBottom:"1px solid rgba(255,255,255,0.06)", background:"#080808", display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
        <div className="sn-pills" style={{ marginBottom:0, flex:1 }}>
          {[["ALL","All Players"],["DIFF","Differentials"],["HOME","Home Only"]].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`sn-pill${filter === val ? " active" : ""}`}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:9, color:"rgba(255,255,255,0.32)", fontWeight:800, textTransform:"uppercase", letterSpacing:"0.1em" }}>Max cost</span>
          <select value={budget} onChange={e => setBudget(+e.target.value)} style={{
            background:"#0c0c0c", border:"1px solid rgba(255,255,255,0.09)",
            color:"#fff", padding:"6px 10px", borderRadius:8, fontSize:12, cursor:"pointer",
          }}>
            {[6.5,7.5,8.5,9.5,10.5,11.5,12.5,13.5,14.5,15.5].map(v =>
              <option key={v} value={v}>£{v}m</option>
            )}
          </select>
        </div>
      </div>

      {/* ── CARDS ── */}
      <div style={{ maxWidth:900, margin:"0 auto", padding:"16px 24px 40px" }}>
        {loading && (
          <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="sn-skel" style={{ height:100, borderRadius:14 }} />
            ))}
          </div>
        )}

        {!loading && picks.length === 0 && (
          <div style={{ textAlign:"center", color:"rgba(255,255,255,0.3)", padding:60, fontSize:14 }}>
            No picks match your current filters.
          </div>
        )}

        {!loading && (
          <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
            {picks.map((p, i) => (
              <div key={p.player_id} style={{ animation:`capFadeUp 420ms ${i * 40}ms ease both` }}>
                <CaptainCard pick={p} rank={i + 1} />
              </div>
            ))}
          </div>
        )}

        {/* Formula note */}
        <div style={{
          marginTop:28, padding:"14px 18px", borderRadius:12,
          background:"rgba(255,214,10,0.05)", border:"1px solid rgba(255,214,10,0.15)",
          fontSize:11, color:"rgba(255,255,255,0.55)", lineHeight:1.7,
        }}>
          <span style={{ color:"#ffd60a", fontWeight:800 }}>Captain Score</span> — expected points multiplied by 2 with a differential bonus applied. Players owned under 15% receive the full bonus. Above 15% the bonus decays linearly. Fixture run and clean sheet probability are folded into expected points via the xG/xA rate model.
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="sn-footer-v3">
        <div className="sn-footer-brand">
          <svg width="16" height="16" viewBox="0 0 28 28" fill="none">
            <rect x="4" y="3" width="14" height="3.5" rx="1.75" fill="#0a84ff"/>
            <rect x="4" y="9" width="10" height="3.5" rx="1.75" fill="#0a84ff" opacity="0.65"/>
            <rect x="4" y="15" width="14" height="3.5" rx="1.75" fill="#0a84ff" opacity="0.4"/>
            <rect x="4" y="21" width="7" height="3.5" rx="1.75" fill="#0a84ff" opacity="0.22"/>
            <rect x="20" y="15" width="3" height="10" rx="1.5" fill="#30d158"/>
          </svg>
          StatinSite
          <span className="sn-footer-tagline">Football Intelligence · ELO · Dixon-Coles · xG</span>
        </div>
        <div className="sn-footer-built">Built by Rutej Talati</div>
        <span className="sn-footer-copy">© {new Date().getFullYear()} StatinSite</span>
      </footer>
    </div>
  );
}