// DifferentialFinderPage.jsx — /differentials
import { useEffect, useState } from "react";
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
  green: "#00e09e",
  blue: "#4f9eff",
  gold: "#f2c94c",
  orange: "#ff8c42",
  red: "#ff4d6d",
  teal: "#2dd4bf",
  purple: "#b388ff",
};

const POS_COL = { GK: "#f2c94c", DEF: "#4f9eff", MID: "#00e09e", FWD: "#ff6b6b" };

/* ─── Team badge ────────────────────────────────────────────────── */
function TeamBadge({ code, size = 22, style = {} }) {
  const [err, setErr] = useState(false);
  if (!code || err) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 4,
        background: "rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.5, flexShrink: 0, ...style,
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

/* ─── Player photo ──────────────────────────────────────────────── */
function PlayerPhoto({ src, name, size = 64, accentColor = C.blue }) {
  const [err, setErr] = useState(false);
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  if (!src || err) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: `${accentColor}18`, border: `2px solid ${accentColor}40`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.3, fontWeight: 800, color: accentColor, flexShrink: 0,
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
        border: `2px solid ${accentColor}40`,
        background: `${accentColor}10`, flexShrink: 0,
      }}
    />
  );
}

/* ─── Score Ring ────────────────────────────────────────────────── */
function ScoreRing({ score, color }) {
  const norm = Math.min(score / 15 * 100, 100);
  const label = norm >= 60 ? "Hot" : norm >= 35 ? "Good" : "Niche";
  return (
    <div style={{
      width: 58, height: 58, borderRadius: "50%",
      border: `2.5px solid ${color}`,
      background: `${color}12`,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <div style={{
        fontSize: 17, fontWeight: 900, color,
        fontFamily: "'SF Mono','JetBrains Mono',monospace", lineHeight: 1,
      }}>{score.toFixed(1)}</div>
      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

/* ─── Ownership meter ───────────────────────────────────────────── */
function OwnershipMeter({ pct }) {
  const color = pct < 3 ? C.green : pct < 7 ? C.blue : C.gold;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden", minWidth: 60 }}>
        <div style={{
          height: "100%", borderRadius: 3, background: color,
          width: `${Math.min(pct / 15 * 100, 100)}%`,
          transition: "width 1s cubic-bezier(0.22,1,0.36,1)",
        }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 800, color, fontFamily: "'SF Mono',monospace", minWidth: 36 }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

/* ─── Skeleton ──────────────────────────────────────────────────── */
function Skel({ h = 120, r = 18 }) {
  return (
    <div style={{
      height: h, borderRadius: r,
      background: "linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.03) 75%)",
      backgroundSize: "200% 100%", animation: "diffShimmer 1.6s linear infinite",
    }} />
  );
}

/* ─── Diff Card ─────────────────────────────────────────────────── */
function DiffCard({ player, rank }) {
  const [hov, setHov] = useState(false);
  const col = POS_COL[player.position] || C.blue;
  const frsColor = player.fixture_run_score >= 6.5 ? C.green
    : player.fixture_run_score >= 4.0 ? C.gold : C.red;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        border: `1px solid ${hov ? col + "55" : C.border}`,
        borderRadius: 20,
        padding: "16px",
        background: hov ? `linear-gradient(135deg,rgba(10,16,28,0.98),${col}0a)` : C.surface,
        transform: hov ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hov ? `0 12px 32px ${col}10` : "none",
        cursor: "default", position: "relative", overflow: "hidden",
        transition: "all 0.28s cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg,transparent,${col}${hov ? "77" : "33"},transparent)`,
      }} />

      {/* Header row: rank + pos tag + team + score ring */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{
            width: 24, height: 24, borderRadius: 7, flexShrink: 0,
            background: rank <= 3 ? "rgba(242,201,76,0.15)" : "rgba(255,255,255,0.06)",
            border: `1px solid ${rank <= 3 ? "rgba(242,201,76,0.4)" : "rgba(255,255,255,0.1)"}`,
            color: rank <= 3 ? "#f2c94c" : "rgba(255,255,255,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 900,
          }}>{rank}</div>
          <span style={{
            fontSize: 9, fontWeight: 800, color: col,
            background: `${col}14`, border: `1px solid ${col}30`,
            padding: "2px 8px", borderRadius: 999,
          }}>{player.position}</span>
          <TeamBadge code={player.team_code} size={20} />
          <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>{player.team}</span>
        </div>
        <ScoreRing score={player.captain_score || 0} color={col} />
      </div>

      {/* Player face + name */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <PlayerPhoto src={player.photo} name={player.name} size={56} accentColor={col} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{player.name}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>£{player.cost}m</div>
        </div>
      </div>

      {/* EP, Form, Fix Run */}
      <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
        {[
          { label: "EP NEXT GW", val: (player.ep_next || 0).toFixed(2), color: col },
          { label: "FORM", val: (player.form || 0).toFixed(1), color: C.text },
          { label: "FIX RUN", val: `${(player.fixture_run_score || 0).toFixed(1)}/10`, color: frsColor },
        ].map(m => (
          <div key={m.label}>
            <div style={{ fontSize: 8, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 3 }}>{m.label}</div>
            <div style={{ fontSize: 16, fontWeight: 900, fontFamily: "'SF Mono',monospace", color: m.color }}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* Next fixture */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
        padding: "5px 8px", borderRadius: 8, background: "rgba(255,255,255,0.04)",
      }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: C.muted }}>Next</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: C.text }}>{player.next_opp || "TBC"}</span>
        {Math.abs(player.transfer_momentum || 0) > 1000 && (
          <span style={{
            marginLeft: "auto", fontSize: 10, fontWeight: 800,
            color: player.transfer_momentum > 0 ? C.green : C.red,
          }}>
            {player.transfer_momentum > 0 ? "↑" : "↓"} {(Math.abs(player.transfer_momentum) / 1000).toFixed(0)}k
          </span>
        )}
      </div>

      {/* Ownership meter */}
      <div>
        <div style={{ fontSize: 8, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 5 }}>
          OWNERSHIP  differential upside
        </div>
        <OwnershipMeter pct={player.selected_by_pct || 0} />
      </div>
    </div>
  );
}

/* ─── Filter number input ───────────────────────────────────────── */
function NumInput({ label, val, set, step, min, max }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 9, fontWeight: 800, color: C.muted, letterSpacing: "0.08em" }}>{label}</label>
      <input
        type="number" step={step} min={min} max={max} value={val}
        onChange={e => set(Number(e.target.value))}
        style={{
          padding: "6px 10px", borderRadius: 8, fontSize: 13, width: 80,
          background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`,
          color: C.text, outline: "none",
        }}
      />
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function DifferentialFinderPage() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [maxOwn, setMaxOwn] = useState(0.10);
  const [position, setPosition] = useState("ALL");
  const [minEp, setMinEp] = useState(3.0);
  const [maxCost, setMaxCost] = useState(15.5);
  const [topN, setTopN] = useState(12);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    const p = new URLSearchParams({ max_owned: maxOwn, min_ep: minEp, position, max_cost: maxCost, top_n: topN });
    fetch(`${API}/api/fpl/differentials?${p}`)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => { if (!cancelled) { setPlayers(d.differentials || []); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(String(e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [maxOwn, position, minEp, maxCost, topN]);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "-apple-system,'SF Pro Display',sans-serif" }}>
      <style>{`
        @keyframes diffShimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes diffFadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        background: "rgba(0,0,0,0.9)", backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${C.border}`,
        padding: "24px 24px 0", position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.green, letterSpacing: "0.14em", marginBottom: 6 }}>
            FPL DIFFERENTIALS
          </div>
          <h1 style={{
            fontSize: "clamp(22px,4vw,34px)", fontWeight: 900, margin: "0 0 10px",
            background: `linear-gradient(135deg,${C.green},${C.blue})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>Differential Finder</h1>

          {/* Description */}
          <p style={{ fontSize: 13, color: C.muted, margin: "0 0 16px", lineHeight: 1.7, maxWidth: 680 }}>
            Surface high-expected-points players that are still flying under the radar, owned by fewer FPL managers than their quality warrants. Differentials are the moves that separate the top mini-league winners from the pack. Ranked by Captain Score so you can see which differentials also carry armband potential this week.
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
                    background: position === pos ? `${C.green}18` : C.surface,
                    color: position === pos ? C.green : C.muted,
                    outline: position === pos ? `1px solid ${C.green}44` : "none",
                  }}>{pos}</button>
                ))}
              </div>
            </div>
            <NumInput label="MAX OWN %" val={+(maxOwn*100).toFixed(0)} set={v => setMaxOwn(v/100)} step={1} min={1} max={30} />
            <NumInput label="MIN EP" val={minEp} set={setMinEp} step={0.5} min={0} max={15} />
            <NumInput label="MAX COST" val={maxCost} set={setMaxCost} step={0.5} min={4} max={15.5} />
            <NumInput label="TOP N" val={topN} set={setTopN} step={1} min={5} max={30} />
            <div style={{ marginLeft: "auto", fontSize: 12, color: C.muted, alignSelf: "flex-end", paddingBottom: 4 }}>
              {players.length} results
            </div>
          </div>
        </div>
      </div>

      {/* ── Grid ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 24px 80px" }}>
        {error && (
          <div style={{
            padding: "12px 16px", borderRadius: 12,
            background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.2)",
            color: "#ff8080", fontSize: 12, marginBottom: 16,
          }}>{error}</div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
          {loading
            ? Array.from({ length: 9 }).map((_, i) => <Skel key={i} />)
            : players.map((p, i) => (
                <div key={p.player_id} style={{ animation: `diffFadeUp 380ms ${i * 50}ms ease both` }}>
                  <DiffCard player={p} rank={i + 1} />
                </div>
              ))
          }
        </div>

        {!loading && players.length === 0 && !error && (
          <div style={{ textAlign: "center", padding: "60px", color: C.muted, fontSize: 14 }}>
            No differentials found. Try increasing Max Ownership or lowering Min EP.
          </div>
        )}
      </div>
    </div>
  );
}