import { useEffect, useMemo, useState, useCallback, useRef } from "react";

/* ── Animated count-up hook ── */
function useCountUp(target, duration = 900, decimals = 1) {
  const [val, setVal] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    const start = performance.now();
    const from  = 0;
    const to    = Number(target) || 0;
    const tick  = (now) => {
      const p    = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(parseFloat((from + (to - from) * ease).toFixed(decimals)));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, decimals]);
  return val;
}
import { useNavigate } from "react-router-dom";
import { getFplBootstrap, getFplPredictorTable } from "../api/api";
import FplPitch from "../components/FplPitch";
import PlayerCard from "../components/PlayerCard";

const FORMATIONS = [
  { name: "4-3-3", DEF: 4, MID: 3, FWD: 3 },
  { name: "4-4-2", DEF: 4, MID: 4, FWD: 2 },
  { name: "4-5-1", DEF: 4, MID: 5, FWD: 1 },
  { name: "3-4-3", DEF: 3, MID: 4, FWD: 3 },
  { name: "3-5-2", DEF: 3, MID: 5, FWD: 2 },
  { name: "5-3-2", DEF: 5, MID: 3, FWD: 2 },
  { name: "5-4-1", DEF: 5, MID: 4, FWD: 1 },
];

function getUpcomingGameweek(bootstrap) {
  const events = Array.isArray(bootstrap?.events) ? bootstrap.events : [];
  const next = events.find((e) => !e.finished && e.is_next);
  if (next?.id) return { id: next.id, deadline: next.deadline_time };
  const current = events.find((e) => !e.finished && e.is_current);
  if (current?.id) return { id: current.id, deadline: current.deadline_time };
  const open = events.find((e) => !e.finished);
  return { id: open?.id || 29, deadline: open?.deadline_time || null };
}

function normalizePlayer(row) {
  if (!row) return null;
  const rawPts   = Number(row.pts_gw_1  ?? 0);
  const rawMerit = Number(row.merit     ?? 0);
  const rawForm  = Number(row.form      ?? 0);
  const ppg      = Number(row.points_so_far ?? 0) / Math.max(Number(row.played ?? 1), 1);
  const projected_points = rawPts > 0 ? rawPts
    : rawMerit > 0 ? rawMerit
    : rawForm  > 0 ? rawForm
    : ppg;
  return {
    ...row,
    id: row.id ?? row.player_id,
    player_id: row.player_id ?? row.id,
    name: row.name ?? row.player ?? "-",
    projected_points,
    cost: Number(row.cost ?? 0),
    team: row.team ?? "-",
    position: row.position ?? "-",
    next_opp: row.next_opp ?? "-",
    appearance_prob: Number(row.appearance_prob ?? row.prob_appear ?? 0.92),
    form: rawForm,
    selected_by_pct: Number(row.selected_by_pct ?? 0),
    pts_gw_1: rawPts,
    pts_gw_2: Number(row.pts_gw_2 ?? 0),
    pts_gw_3: Number(row.pts_gw_3 ?? 0),
    pts_gw_4: Number(row.pts_gw_4 ?? 0),
    pts_gw_5: Number(row.pts_gw_5 ?? 0),
    fixture_difficulty: Number(row.fixture_difficulty ?? 3),
    value_rest_season: Number(row.value_rest_season ?? 0),
    merit: rawMerit,
  };
}

function sortDesc(arr, field) {
  return [...arr].sort((a, b) => Number(b[field] || 0) - Number(a[field] || 0));
}

/* ─────────────────────────────────────────────────────────────
   COMPOSITE PLAYER SCORE  (used for Best XI selection)

   Formula:
     raw = (pts_gw_1 × 0.40) + (form × 0.35) + (season_ppg × 0.15) + (ict/30 × 0.10)

   Modifiers applied on top of raw:
     • Form gate     — if form < 1.5, scale by max(form/1.5, 0.25)
                       Players not featuring recently get a strong downgrade
     • Availability  — multiply by prob_appear^1.4
                       50% injured player scores 35% of fit equivalent, not 50%
                       0%  suspended player scores 0 regardless of raw score

   Why:
     - Old formula used pts_gw_1 alone. FPL's ep_next (which drives pts_gw_1)
       uses full-season history so an out-of-form player still has a high ep_next.
     - Form weight (35%) ensures recent games matter — 0-form players are
       gated down to 25% of their projected score.
     - PPG ensures consistent starters aren't penalised for one bad GW.
     - Prob^1.4 is a convex penalty: 100%=1.00, 75%=0.69, 50%=0.38, 25%=0.13
       This makes "available" vs "doubtful" a real selection difference.
───────────────────────────────────────────────────────────── */
function score(p) {
  const pts   = Number(p.pts_gw_1        || 0);
  const form  = Number(p.form            || 0);
  const ppg   = Number(p.points_so_far   || 0) / Math.max(Number(p.played || p.games_played || 1), 1);
  const ict   = Number(p.ict_index       || 0);
  const prob  = Number(p.appearance_prob || p.prob_appear || 0.92);

  // Composite raw score
  const raw   = (pts * 0.40) + (form * 0.35) + (ppg * 0.15) + ((ict / 30) * 0.10);

  // Form gate: players with form < 1.5 are heavily penalised
  const formGate = form >= 1.5 ? 1.0 : Math.max(form / 1.5, 0.25);

  // Availability: convex penalty — injured/suspended players score very low
  const probPenalty = Math.pow(Math.max(prob, 0), 1.4);

  return raw * formGate * probPenalty;
}

function chooseBestXI(players) {
  if (!players?.length) return null;
  const sorted = pos => [...players.filter(p => p.position === pos)].sort((a,b) => score(b)-score(a));
  const gks = sorted("GK"), defs = sorted("DEF"), mids = sorted("MID"), fwds = sorted("FWD");
  if (!gks.length || defs.length < 3 || mids.length < 2 || !fwds.length) return null;
  const bestGK = gks[0];
  let best = null;
  for (const f of FORMATIONS) {
    if (defs.length < f.DEF || mids.length < f.MID || fwds.length < f.FWD) continue;
    const lineup = {
      gk: bestGK,
      defenders:   defs.slice(0, f.DEF),
      midfielders: mids.slice(0, f.MID),
      forwards:    fwds.slice(0, f.FWD),
    };
    const total = score(bestGK)
      + lineup.defenders.reduce((s,p)   => s + score(p), 0)
      + lineup.midfielders.reduce((s,p) => s + score(p), 0)
      + lineup.forwards.reduce((s,p)    => s + score(p), 0);
    if (!best || total > best.total) best = { formation: f, lineup, total };
  }
  return best;
}

/* ── FPL bench structure: slot 0 = best GK not in XI, slots 1-3 = best outfield by pts ── */
function getBench(allPlayers, lineup) {
  const used = new Set([
    lineup.gk?.player_id || lineup.gk?.id,
    ...(lineup.defenders   || []).map(p => p.player_id || p.id),
    ...(lineup.midfielders || []).map(p => p.player_id || p.id),
    ...(lineup.forwards    || []).map(p => p.player_id || p.id),
  ]);
  const avail   = allPlayers.filter(p => !used.has(p.player_id || p.id));
  const byPts   = arr => [...arr].sort((a,b) => Number(b.projected_points||0) - Number(a.projected_points||0));
  const benchGK = byPts(avail.filter(p => p.position === "GK"))[0] || null;
  const outfield = byPts(avail.filter(p => p.position !== "GK")).slice(0, 3);
  return [benchGK, ...outfield].filter(Boolean).slice(0, 4);
}

function shortName(name) {
  if (!name) return "-";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0];
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}

/* Formats ISO deadline string */
function formatDeadline(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    const day  = d.toLocaleDateString("en-GB", { weekday:"short", day:"numeric", month:"short" });
    const time = d.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" });
    return { day, time };
  } catch { return null; }
}

/* ── Difficulty badge ── */
function DiffBadge({ diff }) {
  const cfg = {
    1:{bg:"#1f7d3d",fg:"#eafff1"}, 2:{bg:"#1f7d3d",fg:"#eafff1"},
    3:{bg:"#a87d1b",fg:"#fff7df"}, 4:{bg:"#8f2424",fg:"#fff0f0"},
    5:{bg:"#5a0e0e",fg:"#ffd0d0"},
  }[diff] || {bg:"#a87d1b",fg:"#fff7df"};
  return (
    <span className="bt-diff-badge" style={{ background: cfg.bg, color: cfg.fg }}>
      {["","Easy","Easy","Med","Hard","V.Hard"][diff] || "Med"}
    </span>
  );
}

/* ── Sparkline ── */
function Sparkline({ player, w = 86, h = 26 }) {
  const vals = [player.pts_gw_1,player.pts_gw_2,player.pts_gw_3,player.pts_gw_4,player.pts_gw_5].map(Number);
  const max  = Math.max(...vals, 1);
  const pad  = 3;
  const pts  = vals.map((v,i) => {
    const x = pad + (i / (vals.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v / max) * (h - pad * 2));
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} style={{ display:"block", overflow:"visible" }}>
      <defs>
        <linearGradient id="btSparkGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b9eff" />
          <stop offset="100%" stopColor="#9ff1b4" />
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke="url(#btSparkGrad)"
        strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      {vals.map((v,i) => {
        const x = pad + (i / (vals.length - 1)) * (w - pad * 2);
        const y = h - pad - ((v / max) * (h - pad * 2));
        return <circle key={i} cx={x} cy={y} r="2.5"
          fill={i === vals.length-1 ? "#9ff1b4" : "#67b1ff"}
          stroke="rgba(0,0,0,0.4)" strokeWidth="1" />;
      })}
    </svg>
  );
}

/* ── Ownership arc ── */
function OwnerArc({ pct, name }) {
  const r = 15, circ = 2 * Math.PI * r;
  const dash = Math.min(pct / 100, 1) * circ;
  const color = pct > 30 ? "#f2c94c" : pct > 15 ? "#67b1ff" : "#3fdc7d";
  return (
    <div className="bt-owner-arc-wrap">
      <svg width={38} height={38} viewBox="0 0 38 38">
        <circle cx={19} cy={19} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <circle cx={19} cy={19} r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 19 19)"
          style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)" }}
        />
        <text x={19} y={22} textAnchor="middle" fill="#c8d8f0" fontSize="7.5" fontWeight="800">
          {pct.toFixed(0)}%
        </text>
      </svg>
      <span className="bt-owner-arc-name">{shortName(name)}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   BENCH CARD — wraps PlayerCard for visual consistency
   Bench slot label + C/VC buttons below the identical card
   ══════════════════════════════════════════════════════ */
function BenchCard({ player, index, isCaptain, isVC, onPlayerClick }) {
  const labels    = ["GK", "B1", "B2", "B3"];
  const subLabels = ["Bench GK", "Top sub", "2nd sub", "3rd sub"];
  return (
    <div className="bt-bench-slot">
      {/* Slot header */}
      <div className="bt-bench-slot-header">
        <span className="bt-bench-slot-label">{labels[index] ?? `B${index}`}</span>
        <span className="bt-bench-slot-sub">{subLabels[index] ?? ""}</span>
      </div>

      {/* PlayerCard — clickable to Player Insight, no C/VC buttons */}
      <div onClick={() => onPlayerClick?.(player)} style={{ cursor:"pointer" }}>
        <PlayerCard
          player={player}
          size="bench"
          isCaptain={isCaptain}
          isViceCaptain={isVC}
        />
      </div>
    </div>
  );
}

/* ── Stat card — with animated count-up for numeric values ── */
const ACCENT_COLORS = {
  default: "#4a6a8a",
  blue:    "#4f9eff",
  green:   "#00e09e",
  gold:    "#f2c94c",
  red:     "#ff4d6d",
  purple:  "#b388ff",
  teal:    "#2dd4bf",
};

function StatCard({ label, value, sub, accent, expandable, children, animate }) {
  const [open, setOpen]       = useState(false);
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Extract numeric part for animation if animate=true
  const numericMatch = animate && String(value).match(/^([£]?)(\d+\.?\d*)(.*)$/);
  const numericTarget = numericMatch ? parseFloat(numericMatch[2]) : null;
  const decimals      = numericMatch ? (numericMatch[2].includes(".") ? 1 : 0) : 0;
  const countedVal    = useCountUp(numericTarget ?? 0, 900, decimals);
  const displayValue  = (animate && numericMatch)
    ? `${numericMatch[1]}${countedVal}${numericMatch[3]}`
    : value;

  const color = ACCENT_COLORS[accent] || ACCENT_COLORS.default;

  return (
    <div
      className={`bt-stat-card bt-stat-card-${accent||"default"} ${expandable ? "bt-stat-card-expandable" : ""} ${open ? "bt-stat-card-open" : ""}`}
      onClick={expandable ? () => setOpen(o => !o) : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 400ms ease, transform 400ms cubic-bezier(0.22,1,0.36,1), box-shadow 200ms ease",
        boxShadow: hovered ? `0 0 0 1px ${color}33, 0 8px 24px rgba(0,0,0,0.35)` : "none",
      }}
    >
      <div className="bt-stat-card-fill-bar" style={{
        width: hovered ? "100%" : "0%",
        background: `linear-gradient(90deg, ${color}22, ${color}44)`,
        transition: "width 350ms ease",
      }} />
      <div className="bt-stat-label" style={{ color: "#4a6a8a" }}>{label}</div>
      <div className="bt-stat-value" style={{
        color,
        fontFamily: "DM Mono, monospace",
        fontSize: 24,
        fontWeight: 900,
        lineHeight: 1.1,
        letterSpacing: "-0.02em",
        textShadow: hovered ? `0 0 20px ${color}55` : "none",
        transition: "text-shadow 200ms ease",
      }}>
        {displayValue}
      </div>
      {sub && <div className="bt-stat-sub" style={{ color: "#3a5a7a", fontSize: 11 }}>{sub}</div>}
      {expandable && (
        <div className="bt-stat-chevron">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
            style={{ transition:"transform 0.2s", transform:open?"rotate(180deg)":"rotate(0)" }}>
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
      {expandable && open && (
        <div className="bt-stat-expand" onClick={e => e.stopPropagation()}>{children}</div>
      )}
    </div>
  );
}

/* ── Leader row ── */
function LeaderRow({ rank, name, value, sub, highlighted, onHover, onLeave }) {
  const medalColors = ["#c8972a","#8a9aaa","#9b6840"];
  return (
    <div
      className={`bt-leader-row ${highlighted ? "bt-leader-row-highlight" : ""}`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <span className="bt-leader-rank" style={{ background: medalColors[rank-1] || "rgba(255,255,255,0.06)" }}>
        {rank}
      </span>
      <span className="bt-leader-name">{shortName(name)}</span>
      <span className="bt-leader-val">{value}</span>
      {sub && <span className="bt-leader-sub">{sub}</span>}
    </div>
  );
}

/* ── Skeleton ── */
function Skel({ h = 20, w = "100%", r = 10 }) {
  return <div className="bt-skel" style={{ height: h, width: w, borderRadius: r }} />;
}

/* ════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════ */
export default function BestTeamPage() {
  const navigate = useNavigate();

  const [gw, setGw]           = useState(29);
  const [deadline, setDeadline] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [captain, setCaptain] = useState(null);
  const [vc, setVC]           = useState(null);
  const [activeTab, setTab]   = useState("captaincy");
  const [hoveredPlayer, setHoveredPlayer] = useState(null);
  const [selectedFormation, setSelectedFormation] = useState(null);
  const [showFormationPicker, setShowFormationPicker] = useState(false);

  /* Close formation dropdown on outside click */
  useEffect(() => {
    if (!showFormationPicker) return;
    const fn = e => { if (!e.target.closest('.bt-formation-picker-wrap')) setShowFormationPicker(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [showFormationPicker]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const bootstrap = await getFplBootstrap();
        const { id: nextGw, deadline: dl } = getUpcomingGameweek(bootstrap);
        if (cancelled) return;
        setGw(nextGw);
        if (dl) setDeadline(dl);

        // Build player code map from FPL bootstrap elements for face photos
        // FPL elements have: id, web_name, code (used for photo URL)
        const codeMap = {};
        (bootstrap?.elements || []).forEach(el => {
          if (el.web_name && el.code) codeMap[el.web_name] = el.code;
          if (el.id && el.code) codeMap[el.id] = el.code;
        });

        const tableData = await getFplPredictorTable({
          start_gw: nextGw, max_cost: 15.5, min_prob: 0, team: "ALL", position: "ALL",
        });
        if (cancelled) return;

        // Merge code into each player row for face photos
        setPlayers((tableData.rows || []).map(row => {
          const normalized = normalizePlayer(row);
          if (!normalized) return null;
          // Try to find code by web_name match or player_id
          const code = row.code
            || codeMap[row.player || row.name || row.web_name]
            || codeMap[row.player_id || row.id];
          return code ? { ...normalized, code } : normalized;
        }).filter(Boolean));
        setLoading(false);
      } catch (err) {
        console.error(err);
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const best = useMemo(() => {
    if (!players.length) return null;
    if (!selectedFormation) return chooseBestXI(players);
    const sorted = pos => [...players.filter(p => p.position === pos)].sort((a,b) => score(b)-score(a));
    const gks = sorted("GK"), defs = sorted("DEF"), mids = sorted("MID"), fwds = sorted("FWD");
    const f = selectedFormation;
    if (!gks.length || defs.length < f.DEF || mids.length < f.MID || fwds.length < f.FWD) return chooseBestXI(players);
    const lineup = {
      gk: gks[0],
      defenders:   defs.slice(0, f.DEF),
      midfielders: mids.slice(0, f.MID),
      forwards:    fwds.slice(0, f.FWD),
    };
    const total = score(lineup.gk)
      + lineup.defenders.reduce((s,p)=>s+score(p),0)
      + lineup.midfielders.reduce((s,p)=>s+score(p),0)
      + lineup.forwards.reduce((s,p)=>s+score(p),0);
    return { formation: f, lineup, total };
  }, [players, selectedFormation]);

  const starters = useMemo(() => {
    if (!best?.lineup) return [];
    return [best.lineup.gk, ...(best.lineup.defenders||[]), ...(best.lineup.midfielders||[]), ...(best.lineup.forwards||[])].filter(Boolean);
  }, [best]);

  useEffect(() => {
    if (!starters.length) return;
    const s = sortDesc(starters, "projected_points");
    setCaptain(c => c ?? s[0]);
    setVC(v      => v ?? s[1]);
  }, [starters]);

  const bench        = useMemo(() => (!best?.lineup ? [] : getBench(players, best.lineup)), [players, best]);
  const totalCost    = useMemo(() => [...players].sort((a,b)=>Number(b.projected_points||0)-Number(a.projected_points||0)).slice(0,15).reduce((s,p)=>s+Number(p.cost||0),0), [players]);
  const captaincyTop = useMemo(() => sortDesc(starters, "projected_points").slice(0,5), [starters]);
  const differentials= useMemo(() => sortDesc(starters.filter(p=>p.selected_by_pct<15), "projected_points").slice(0,5), [starters]);
  const valueTop     = useMemo(() => sortDesc(starters, "value_rest_season").slice(0,5), [starters]);
  const minutesRisk  = useMemo(() => sortDesc(starters, "appearance_prob").reverse().slice(0,5), [starters]);

  const handlePlayerClick = useCallback(p => {
    if (p?.player_id || p?.id) navigate(`/player/${p.player_id || p.id}`);
  }, [navigate]);

  const dl = formatDeadline(deadline);

  /* ── Loading ── */
  if (loading) return (
    <div className="page-shell">
      <div className="page-content-wide">
        <div className="panel-dark">
          <Skel h={34} w={260} r={10} />
          <div className="bt-main-layout" style={{ marginTop:24 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[80,80,80,80,100].map((h,i) => <Skel key={i} h={h} r={14} />)}
            </div>
            <Skel h={560} r={20} />
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[42,200,140,120].map((h,i) => <Skel key={i} h={h} r={14} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ── No data ── */
  if (!best?.lineup) {
    const gkCount  = players.filter(p=>p.position==="GK").length;
    const defCount = players.filter(p=>p.position==="DEF").length;
    const midCount = players.filter(p=>p.position==="MID").length;
    const fwdCount = players.filter(p=>p.position==="FWD").length;
    return (
      <div className="page-shell">
        <div className="panel-dark" style={{ padding:24 }}>
          <h2 style={{ color:"#ff5d5d", marginBottom:12 }}>Unable to generate Best XI</h2>
          <p style={{ color:"#8a9aaa", fontSize:13, marginBottom:16 }}>
            {players.length === 0
              ? "No player data loaded. Check that your backend is running."
              : `Players loaded: ${players.length} — positions may be imbalanced.`}
          </p>
          {players.length > 0 && (
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              {[{pos:"GK",count:gkCount,min:1},{pos:"DEF",count:defCount,min:3},{pos:"MID",count:midCount,min:2},{pos:"FWD",count:fwdCount,min:1}].map(({pos,count,min}) => (
                <div key={pos} style={{
                  padding:"8px 16px", borderRadius:10,
                  background: count>=min ? "rgba(44,200,120,0.12)" : "rgba(220,70,70,0.12)",
                  border:`1px solid ${count>=min ? "rgba(44,200,120,0.3)" : "rgba(220,70,70,0.3)"}`,
                  color: count>=min ? "#2cc878" : "#ff5d5d",
                  fontFamily:"DM Mono, monospace", fontSize:13,
                }}>
                  {pos}: {count} {count<min && `(need ≥${min})`}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const listForTab  = activeTab === "captaincy" ? captaincyTop : activeTab === "differentials" ? differentials : valueTop;
  const tabValLabel = activeTab === "value" ? "val" : "pts";

  return (
    <div className="bt-page-shell" style={{ background:"#000", minHeight:"100vh" }}>
      <div className="page-content-wide" style={{ maxWidth:"100%", padding:"0 16px" }}>
        <div className="panel-dark" style={{ padding:"20px 20px 0", overflow:"visible", background:"#000" }}>

          {/* ── PAGE HEADER ── */}
          <div className="bt-page-header">
            <div>
              <h1 className="page-title-left bt-title-animate">Best Team · GW{gw}</h1>
              <div className="mini-metric">
                {selectedFormation ? `Showing best XI in ${selectedFormation.name}` : "Optimal formation auto-selected from projected points."}
              </div>
            </div>

            <div className="bt-header-badges">

              {/* Proj Pts — green */}
              <div className="bt-header-badge bt-badge-pts">
                <span className="bt-header-badge-label">Proj GW Pts</span>
                <span className="bt-header-badge-val">{best.total.toFixed(1)}</span>
              </div>

              {/* Formation picker — blue */}
              <div className="bt-formation-picker-wrap" style={{ position:"relative" }}>
                <button
                  className={`bt-header-badge bt-badge-formation bt-formation-badge ${showFormationPicker ? "bt-formation-badge-open":""}`}
                  onClick={() => setShowFormationPicker(v=>!v)}
                >
                  <span className="bt-header-badge-label">Formation</span>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span className="bt-header-badge-val">{best.formation.name}</span>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                      style={{ opacity:0.5, flexShrink:0, transition:"transform 0.2s", transform:showFormationPicker?"rotate(180deg)":"rotate(0)" }}>
                      <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </button>
                {showFormationPicker && (
                  <div className="bt-formation-dropdown" onClick={e=>e.stopPropagation()}>
                    <div className="bt-formation-dropdown-label">Choose Formation</div>
                    <button className={`bt-formation-option ${!selectedFormation?"bt-formation-option-active":""}`}
                      onClick={() => { setSelectedFormation(null); setShowFormationPicker(false); setCaptain(null); setVC(null); }}>
                      <span>Auto (Best)</span>
                      {!selectedFormation && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 4-4" stroke="#9ff1b4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </button>
                    {FORMATIONS.map(f => (
                      <button key={f.name}
                        className={`bt-formation-option ${selectedFormation?.name===f.name?"bt-formation-option-active":""}`}
                        onClick={() => { setSelectedFormation(f); setShowFormationPicker(false); setCaptain(null); setVC(null); }}>
                        <span>{f.name}</span>
                        {selectedFormation?.name===f.name && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 4-4" stroke="#9ff1b4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Squad Cost — amber */}
              <div className="bt-header-badge bt-badge-cost">
                <span className="bt-header-badge-label">Squad Cost</span>
                <span className="bt-header-badge-val">£{totalCost.toFixed(1)}m</span>
              </div>

              {/* Deadline — red/pink, only if available */}
              {dl && (
                <div className="bt-header-badge bt-badge-deadline">
                  <span className="bt-header-badge-label">Deadline</span>
                  <span className="bt-header-badge-val" style={{ fontSize:14 }}>{dl.day}</span>
                  <span className="bt-header-badge-sub">{dl.time}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── 3-COL LAYOUT ── */}
          <div className="bt-main-layout">

            {/* LEFT PANEL */}
            <div className="bt-left-panel">
              <StatCard label="Gameweek"        value={`GW ${gw}`} accent="default" />
              <StatCard label="Formation"       value={best.formation.name} sub={selectedFormation ? "Custom" : "Auto-selected"} accent="blue" />
              <StatCard label="Projected Pts"   value={best.total.toFixed(1)} sub="Starting XI total" accent="green" animate />
              <StatCard label="Squad Cost"      value={`£${totalCost.toFixed(1)}m`} sub="Top 15 players" accent="gold" animate />
              {dl && <StatCard label="Deadline" value={dl.day} sub={dl.time} accent="red" />}
              {/* Algorithm-selected C/VC — read only, no user override */}
              <div className="bt-cvc-card">
                <div className="bt-cvc-header">
                  <span className="bt-cvc-algo-label">Algorithm Pick</span>
                </div>
                <div className="bt-cvc-row">
                  <div className="bt-cvc-badge bt-cvc-badge-c">C</div>
                  <div>
                    <div className="bt-cvc-name">{shortName(captain?.name || "-")}</div>
                    <div className="bt-cvc-pts">{captain?.projected_points?.toFixed(1)} pts projected</div>
                  </div>
                </div>
                <div className="bt-cvc-row" style={{ marginTop:8 }}>
                  <div className="bt-cvc-badge bt-cvc-badge-vc">VC</div>
                  <div>
                    <div className="bt-cvc-name">{shortName(vc?.name || "-")}</div>
                    <div className="bt-cvc-pts">{vc?.projected_points?.toFixed(1)} pts projected</div>
                  </div>
                </div>
                <div className="bt-cvc-disclaimer">
                  Selected by our projected points model
                </div>
              </div>
            </div>

            {/* CENTRE — Pitch + Bench */}
            <div className="bt-centre-col">
              <div className="bt-pitch-wrap">
                <FplPitch
                  lineup={best.lineup}
                  captain={captain}
                  vc={vc}
                  highlightedId={hoveredPlayer}
                  onPlayerClick={handlePlayerClick}
                  showPoints="projected"
                  showFixture={true}
                  loading={loading}
                />
              </div>

              {/* ── BENCH TRAY ── */}
              {bench.length > 0 && (
                <div className="bt-bench-tray">
                  <div className="bt-bench-tray-line bt-bench-tray-line-left" />
                  <div className="bt-bench-tray-line bt-bench-tray-line-right" />
                  <div className="bt-bench-tray-center-circle" />
                  <div className="bt-bench-tray-header">
                    <div className="bt-bench-tray-title-row">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{flexShrink:0}}>
                        <rect x="1" y="4" width="12" height="8" rx="2" stroke="rgba(220,240,220,0.7)" strokeWidth="1.3"/>
                        <path d="M5 4V2.5a2 2 0 014 0V4" stroke="rgba(220,240,220,0.7)" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                      <span className="bt-bench-tray-title">Bench</span>
                    </div>
                    <span className="bt-bench-tray-hint">Bench GK + top 3 outfield by projected pts · Click player for insights</span>
                  </div>
                  <div className="bt-bench-tray-grid">
                    {bench.map((p, i) => p ? (
                      <BenchCard
                        key={p.player_id||p.id||i}
                        player={p}
                        index={i}
                        isCaptain={(captain?.player_id||captain?.id)===(p?.player_id||p?.id)}
                        isVC={(vc?.player_id||vc?.id)===(p?.player_id||p?.id)}
                        onPlayerClick={handlePlayerClick}
                      />
                    ) : null)}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT PANEL */}
            <div className="bt-right-panel">
              <div className="bt-panel-tabs">
                {[{key:"captaincy",label:"Captain"},{key:"differentials",label:"Diff"},{key:"value",label:"Value"}].map(t => (
                  <button key={t.key}
                    className={`bt-panel-tab ${activeTab===t.key?"bt-panel-tab-active":""}`}
                    onClick={() => setTab(t.key)}>{t.label}</button>
                ))}
              </div>

              <div className="bt-stat-card bt-leaderboard-card">
                <div className="bt-stat-label" style={{ marginBottom:10 }}>
                  {activeTab==="captaincy" && "Captaincy Model"}
                  {activeTab==="differentials" && "Differentials (<15% own)"}
                  {activeTab==="value" && "Value Index"}
                </div>
                {listForTab.length > 0 ? listForTab.map((p,i) => (
                  <LeaderRow
                    key={p.id}
                    rank={i+1}
                    name={p.name}
                    value={activeTab==="value" ? p.value_rest_season?.toFixed(2) : p.projected_points?.toFixed(1)}
                    sub={activeTab==="differentials" ? `${p.selected_by_pct?.toFixed(1)}% own` : tabValLabel}
                    highlighted={hoveredPlayer===(p.player_id||p.id)}
                    onHover={() => setHoveredPlayer(p.player_id||p.id)}
                    onLeave={() => setHoveredPlayer(null)}
                  />
                )) : (
                  <div style={{ color:"#4a6a8a", fontSize:12, padding:"8px 0" }}>No data</div>
                )}
              </div>

              <div className="bt-stat-card">
                <div className="bt-stat-label" style={{ marginBottom:10 }}>Minutes Risk</div>
                {minutesRisk.map(p => (
                  <div key={p.id}
                    className={`bt-risk-row ${hoveredPlayer===(p.player_id||p.id)?"bt-risk-row-highlight":""}`}
                    onMouseEnter={() => setHoveredPlayer(p.player_id||p.id)}
                    onMouseLeave={() => setHoveredPlayer(null)}
                  >
                    <span className="bt-risk-name">{shortName(p.name)}</span>
                    <div className="bt-risk-bar-track">
                      <div className="bt-risk-bar-fill" style={{
                        width:`${Math.round(p.appearance_prob*100)}%`,
                        background: p.appearance_prob>0.85?"#28d97a":p.appearance_prob>0.6?"#f2c94c":"#ff5d5d",
                      }}/>
                    </div>
                    <span className="bt-risk-val">{Math.round(p.appearance_prob*100)}%</span>
                  </div>
                ))}
              </div>

              <div className="bt-stat-card">
                <div className="bt-stat-label" style={{ marginBottom:10 }}>Top Ownership</div>
                <div className="bt-owner-arcs-grid">
                  {sortDesc(starters,"selected_by_pct").slice(0,4).map(p => (
                    <div key={p.id}
                      className={hoveredPlayer===(p.player_id||p.id)?"bt-owner-highlighted":""}
                      onMouseEnter={() => setHoveredPlayer(p.player_id||p.id)}
                      onMouseLeave={() => setHoveredPlayer(null)}
                    >
                      <OwnerArc pct={p.selected_by_pct} name={p.name}/>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bt-stat-card">
                <div className="bt-stat-label" style={{ marginBottom:10 }}>Value Index</div>
                {valueTop.map((p,i) => (
                  <LeaderRow
                    key={p.id}
                    rank={i+1}
                    name={p.name}
                    value={p.value_rest_season?.toFixed(2)}
                    highlighted={hoveredPlayer===(p.player_id||p.id)}
                    onHover={() => setHoveredPlayer(p.player_id||p.id)}
                    onLeave={() => setHoveredPlayer(null)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}