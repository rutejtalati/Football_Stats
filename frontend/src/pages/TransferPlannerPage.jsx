// TransferPlannerPage.jsx — /transfer-planner
import { useEffect, useState } from "react";
import { API_BASE as API } from "@/api/api";

/* ─── Design tokens ─────────────────────────────────────────────── */
const C = {
  bg: "#000000",
  surface: "rgba(255,255,255,0.04)",
  surfaceHov: "rgba(255,255,255,0.07)",
  border: "rgba(255,255,255,0.08)",
  text: "#ffffff",
  muted: "rgba(255,255,255,0.4)",
  faint: "rgba(255,255,255,0.12)",
  green: "#00e09e",
  blue: "#4f9eff",
  gold: "#f2c94c",
  orange: "#ff8c42",
  red: "#ff6b6b",
  purple: "#b388ff",
};

const POS_COL = { GK: "#f2c94c", DEF: "#4f9eff", MID: "#00e09e", FWD: "#ff6b6b" };
const FDR_CFG = {
  1: { bg: "#0f4a24", fg: "#6ee8a0" },
  2: { bg: "#1a5c30", fg: "#7ee8a8" },
  3: { bg: "#1e1e1e", fg: "#8a9aaa" },
  4: { bg: "#4a1212", fg: "#f08080" },
  5: { bg: "#2e0808", fg: "#ff9090" },
};

/* ─── Team badge ────────────────────────────────────────────────── */
function TeamBadge({ code, size = 28, style = {} }) {
  const [err, setErr] = useState(false);
  if (!code || err) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 6,
        background: "rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.45, flexShrink: 0, ...style,
      }}>⚽</div>
    );
  }
  return (
    <img
      src={`https://resources.premierleague.com/premierleague/badges/70/t${code}.png`}
      alt="" onError={() => setErr(true)}
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0, ...style }}
    />
  );
}

/* ─── Player photo ──────────────────────────────────────────────── */
function PlayerFace({ src, name, size = 60, accentColor = C.blue, type = "in" }) {
  const [err, setErr] = useState(false);
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const borderColor = type === "in" ? C.green : C.red;

  if (!src || err) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: `${accentColor}18`, border: `2.5px solid ${borderColor}55`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.3, fontWeight: 800, color: accentColor, flexShrink: 0,
      }}>{initials}</div>
    );
  }
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <img
        src={src} alt={name} onError={() => setErr(true)}
        style={{
          width: size, height: size, borderRadius: "50%",
          objectFit: "cover", objectPosition: "top",
          border: `2.5px solid ${borderColor}55`,
          background: "rgba(255,255,255,0.04)",
          display: "block",
        }}
      />
      {/* IN / OUT indicator dot */}
      <div style={{
        position: "absolute", bottom: 0, right: 0,
        width: 14, height: 14, borderRadius: "50%",
        background: type === "in" ? C.green : C.red,
        border: "2px solid #000",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 8, fontWeight: 900, color: "#000",
      }}>{type === "in" ? "+" : "−"}</div>
    </div>
  );
}

/* ─── Skeleton ──────────────────────────────────────────────────── */
function Skel({ h = 88, r = 14 }) {
  return (
    <div style={{
      height: h, borderRadius: r,
      background: "linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.03) 75%)",
      backgroundSize: "200% 100%", animation: "tpShimmer 1.6s linear infinite",
    }} />
  );
}

/* ─── Player Card ───────────────────────────────────────────────── */
function PlayerCard({ player, type }) {
  const [hov, setHov] = useState(false);
  const col = POS_COL[player.position] || C.blue;
  const isIn = type === "in";
  const borderAccent = isIn ? C.green : C.red;
  const epColor = isIn ? C.green : "#ff9090";
  const fd = FDR_CFG[player.fixture_difficulty] || FDR_CFG[3];
  const frsColor = (player.fixture_run_score || 5) >= 6.5 ? C.green
    : (player.fixture_run_score || 5) >= 4.0 ? C.gold : C.red;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", gap: 12, alignItems: "flex-start",
        padding: "14px 14px",
        borderRadius: 16,
        background: hov
          ? `linear-gradient(135deg,rgba(10,16,28,0.98),${borderAccent}08)`
          : C.surface,
        border: `1px solid ${hov ? borderAccent + "33" : C.border}`,
        transform: hov ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hov ? `0 8px 24px ${borderAccent}0e` : "none",
        cursor: "default",
        transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        position: "relative", overflow: "hidden",
      }}
    >
      {/* Left border accent */}
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0, width: 3,
        background: `${borderAccent}55`, borderRadius: "16px 0 0 16px",
      }} />

      {/* Player face */}
      <div style={{ paddingLeft: 4, flexShrink: 0 }}>
        <PlayerFace src={player.photo} name={player.name} size={58} accentColor={col} type={type} />
      </div>

      {/* Info block */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: C.text, whiteSpace: "nowrap" }}>
            {player.name}
          </span>
          <span style={{
            fontSize: 9, fontWeight: 800, color: col,
            background: `${col}14`, border: `1px solid ${col}30`,
            padding: "2px 7px", borderRadius: 999,
          }}>{player.position}</span>
          {/* Team badge + short */}
          <TeamBadge code={player.team_code} size={18} />
          <span style={{ fontSize: 10, color: C.muted }}>{player.team}</span>
        </div>

        {/* Cost + ownership + fixture */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: C.muted }}>£{player.cost}m</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{(player.selected_by_pct || 0).toFixed(1)}% owned</span>
          <span style={{
            fontSize: 10, fontWeight: 800,
            background: fd.bg, color: fd.fg,
            padding: "2px 8px", borderRadius: 7,
          }}>{player.next_opp || "TBD"}</span>
        </div>

        {/* Stat pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{
            fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 999,
            background: `${col}14`, color: col, border: `1px solid ${col}30`,
          }}>Form {(player.form || 0).toFixed(1)}</span>
          <span style={{
            fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 999,
            background: `${frsColor}10`, color: frsColor, border: `1px solid ${frsColor}30`,
          }}>Fix Run {(player.fixture_run_score || 0).toFixed(1)}/10</span>
          {Math.abs(player.transfer_momentum || 0) > 1000 && (
            <span style={{
              fontSize: 9, fontWeight: 800,
              color: player.transfer_momentum > 0 ? C.green : C.red,
            }}>
              {player.transfer_momentum > 0 ? "↑" : "↓"} {(Math.abs(player.transfer_momentum) / 1000).toFixed(0)}k transfers
            </span>
          )}
        </div>

        {/* Sell reason */}
        {player.reason && (
          <div style={{ marginTop: 5, fontSize: 10, color: "#ff9090", fontStyle: "italic" }}>
            {player.reason}
          </div>
        )}
      </div>

      {/* EP score */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: epColor, fontFamily: "'SF Mono',monospace", lineHeight: 1 }}>
          {(player.ep_next || 0).toFixed(2)}
        </div>
        <div style={{ fontSize: 8, color: C.muted, letterSpacing: "0.08em", marginTop: 2 }}>EP NEXT GW</div>
      </div>
    </div>
  );
}

/* ─── Summary card ──────────────────────────────────────────────── */
function SumCard({ label, val, color, delay }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: "14px 18px", flexShrink: 0,
      animation: `tpFadeUp 0.45s ${delay}s ease both`,
    }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: C.muted, letterSpacing: "0.1em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color, fontFamily: "'SF Mono',monospace" }}>{val}</div>
    </div>
  );
}

/* ─── Column header ─────────────────────────────────────────────── */
function ColHeader({ color, dot, title, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <div style={{ width: 9, height: 9, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}` }} />
      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: C.text }}>{title}</h2>
      <span style={{ fontSize: 11, color: C.muted }}>{sub}</span>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function TransferPlannerPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [position, setPosition] = useState("ALL");
  const [maxCost, setMaxCost] = useState(15.5);
  const [topN, setTopN] = useState(8);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    const p = new URLSearchParams({ position, max_cost: maxCost, num_gws: 5, top_in: topN, top_out: topN });
    fetch(`${API}/api/fpl/transfer-planner?${p}`)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(String(e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [position, maxCost, topN]);

  const targets_in  = data?.targets_in  || [];
  const targets_out = data?.targets_out || [];

  /* Quick stats */
  const topEp   = targets_in[0]?.ep_next?.toFixed(2) || "—";
  const avgFrs  = targets_in.length
    ? (targets_in.reduce((s, p) => s + (p.fixture_run_score || 0), 0) / targets_in.length).toFixed(1)
    : "—";
  const netMove = data?.momentum
    ? (data.momentum.reduce((s, p) => s + (p.transfer_momentum || 0), 0) / 1000).toFixed(0)
    : "—";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "-apple-system,'SF Pro Display',sans-serif" }}>
      <style>{`
        @keyframes tpShimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes tpFadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes tpSlideR  { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:translateX(0)} }
        @keyframes tpSlideL  { from{opacity:0;transform:translateX(12px)} to{opacity:1;transform:translateX(0)} }
        * { box-sizing: border-box; }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        background: "rgba(0,0,0,0.9)", backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${C.border}`,
        padding: "24px 24px 0", position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.blue, letterSpacing: "0.14em", marginBottom: 6 }}>
            FPL TRANSFER TOOL
          </div>
          <h1 style={{
            fontSize: "clamp(22px,4vw,34px)", fontWeight: 900, margin: "0 0 10px",
            background: `linear-gradient(135deg,${C.blue},${C.purple})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>Transfer Planner</h1>

          {/* Description */}
          <p style={{ fontSize: 13, color: C.muted, margin: "0 0 16px", lineHeight: 1.7, maxWidth: 720 }}>
            Data-driven buy and sell recommendations built from expected points, upcoming fixture run scores, recent form and live transfer momentum. The buy list shows the highest-value targets available. The sell watchlist flags players whose value has deteriorated due to poor fixtures, injury doubt or declining output, so you can act before the price drops further.
            {data?.current_gw && ` Based on GW${data.current_gw} data.`}
          </p>

          {/* Filters */}
          <div style={{
            display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end",
            borderTop: `1px solid ${C.border}`, paddingTop: 14, paddingBottom: 16,
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 9, fontWeight: 800, color: C.muted, letterSpacing: "0.08em" }}>POSITION</label>
              <div style={{ display: "flex", gap: 4 }}>
                {["ALL","GK","DEF","MID","FWD"].map(pos => (
                  <button key={pos} onClick={() => setPosition(pos)} style={{
                    padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 800,
                    cursor: "pointer", border: "none",
                    background: position === pos ? `${C.blue}18` : C.surface,
                    color: position === pos ? C.blue : C.muted,
                    outline: position === pos ? `1px solid ${C.blue}44` : "none",
                  }}>{pos}</button>
                ))}
              </div>
            </div>
            {[
              { label: "MAX COST", val: maxCost, set: setMaxCost, step: 0.5, min: 4, max: 15.5, w: 80 },
              { label: "TOP N", val: topN, set: setTopN, step: 1, min: 3, max: 20, w: 64 },
            ].map(f => (
              <div key={f.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 9, fontWeight: 800, color: C.muted, letterSpacing: "0.08em" }}>{f.label}</label>
                <input
                  type="number" step={f.step} min={f.min} max={f.max} value={f.val}
                  onChange={e => f.set(Number(e.target.value))}
                  style={{
                    padding: "6px 10px", borderRadius: 8, fontSize: 13, width: f.w,
                    background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`,
                    color: C.text, outline: "none",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Summary bar ── */}
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "16px 24px 0" }}>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
          {[
            { label: "TOP BUY EP", val: topEp, color: C.green, delay: 0 },
            { label: "AVG FIX RUN", val: avgFrs, color: C.blue, delay: 0.05 },
            { label: "TARGETS IN", val: targets_in.length, color: C.gold, delay: 0.1 },
            { label: "SELL FLAGS", val: targets_out.length, color: C.red, delay: 0.15 },
          ].map(s => <SumCard key={s.label} {...s} />)}
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "20px 24px 80px" }}>
        {error && (
          <div style={{
            padding: "12px 16px", borderRadius: 12, marginBottom: 16,
            background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.2)",
            color: "#ff8080", fontSize: 12,
          }}>{error}</div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Transfer In */}
          <div>
            <ColHeader color={C.green} title="Transfer In" sub="best players to buy this week" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <Skel key={i} />)
                : targets_in.map((p, i) => (
                    <div key={p.player_id || i} style={{ animation: `tpSlideR 400ms ${i * 60}ms ease both` }}>
                      <PlayerCard player={p} type="in" />
                    </div>
                  ))
              }
            </div>
          </div>

          {/* Transfer Out */}
          <div>
            <ColHeader color={C.red} title="Sell Watchlist" sub="players to consider moving on" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <Skel key={i} />)
                : targets_out.map((p, i) => (
                    <div key={p.player_id || i} style={{ animation: `tpSlideL 400ms ${i * 60}ms ease both` }}>
                      <PlayerCard player={p} type="out" />
                    </div>
                  ))
              }
              {!loading && targets_out.length === 0 && (
                <div style={{ padding: "20px 0", color: C.muted, fontSize: 13, textAlign: "center" }}>
                  No sell candidates with current filters.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}