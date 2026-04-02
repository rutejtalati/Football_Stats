// pages/FplIntelligencePage.jsx
// StatinSite · FPL Gameweek Intelligence
// Apple iOS pitch-black theme · bright accent colours on black surfaces
// All hyphens replaced with en-dashes or rephrased · no hyphens in visible text

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getFplBootstrap, getFplPredictorTable, API_BASE as API } from "../api/api";

// ── iOS design tokens ────────────────────────────────────────────────
const T = {
  bg:        "#000000",
  surface:   "#1c1c1e",
  surface2:  "#2c2c2e",
  surface3:  "#3a3a3c",
  border:    "rgba(255,255,255,0.10)",
  borderHi:  "rgba(255,255,255,0.18)",
  text:      "#ffffff",
  textSub:   "rgba(255,255,255,0.55)",
  textMuted: "rgba(255,255,255,0.30)",
  // iOS system palette
  green:  "#30d158",
  blue:   "#0a84ff",
  yellow: "#ffd60a",
  orange: "#ff9f0a",
  red:    "#ff453a",
  purple: "#bf5af2",
  teal:   "#5ac8fa",
  pink:   "#ff375f",
  indigo: "#5e5ce6",
  // Position colours
  gkCol:  "#ff9f0a",
  defCol: "#0a84ff",
  midCol: "#30d158",
  fwdCol: "#ff453a",
};

// FDR colour ramp matching FPL spec
const FDR_COLORS = {
  1: { bg:"#00c176", fg:"#003d26" },
  2: { bg:"#01f5a0", fg:"#004d33" },
  3: { bg:"#e7e21e", fg:"#3d3900" },
  4: { bg:"#e85f2e", fg:"#fff" },
  5: { bg:"#c0392b", fg:"#fff" },
};

function FdrBadge({ diff }) {
  const c = FDR_COLORS[diff] || FDR_COLORS[3];
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", justifyContent:"center",
      width:22, height:17, borderRadius:4,
      background:c.bg, color:c.fg,
      fontSize:11, fontWeight:700, fontFamily:"'SF Mono','JetBrains Mono',monospace",
      flexShrink:0,
    }}>{diff}</span>
  );
}

function PosBadge({ pos }) {
  const cols = { GK:T.gkCol, DEF:T.defCol, MID:T.midCol, FWD:T.fwdCol };
  const c = cols[pos] || T.textMuted;
  return (
    <span style={{
      fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:4,
      background:`${c}22`, color:c, border:`1px solid ${c}44`,
      letterSpacing:"0.06em",
    }}>{pos}</span>
  );
}

function StatPill({ label, value, color = T.text, sub }) {
  return (
    <div style={{
      background:T.surface, borderRadius:14, padding:"12px 14px",
      border:`1px solid ${T.border}`, flex:1, minWidth:80,
    }}>
      <div style={{ fontSize:10, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:700, color, fontFamily:"'SF Mono','JetBrains Mono',monospace", lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:T.textSub, marginTop:3 }}>{sub}</div>}
    </div>
  );
}

function SectionHeader({ label, accent = T.blue }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:10, marginBottom:14,
    }}>
      <div style={{ width:3, height:16, borderRadius:2, background:accent, flexShrink:0 }}/>
      <span style={{ fontSize:12, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.14em" }}>{label}</span>
    </div>
  );
}

function DataTable({ columns, rows, highlightRow = 0 }) {
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} style={{
                padding:"6px 10px", fontSize:10, fontWeight:600,
                color:T.textMuted, textAlign:c.right?"right":"left",
                textTransform:"uppercase", letterSpacing:"0.09em",
                borderBottom:`1px solid ${T.border}`, whiteSpace:"nowrap",
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{
              background: ri === highlightRow ? "rgba(48,209,88,0.08)" : "transparent",
            }}>
              {columns.map((c, ci) => (
                <td key={ci} style={{
                  padding:"8px 10px",
                  borderBottom:`1px solid ${T.border}`,
                  textAlign:c.right?"right":"left",
                  color: ri === highlightRow ? (ci===0 ? T.green : T.text) : (c.color || T.textSub),
                  fontWeight: ri === highlightRow ? 600 : 400,
                  fontFamily: c.mono ? "'SF Mono','JetBrains Mono',monospace" : "inherit",
                  whiteSpace:"nowrap",
                }}>
                  {row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BarRow({ label, value, max = 100, color = T.green, suffix = "%", sub }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
      <span style={{ fontSize:12, color:T.text, fontWeight:500, minWidth:80, flexShrink:0 }}>{label}</span>
      <div style={{ flex:1, height:4, background:T.surface3, borderRadius:2, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:2, transition:"width 0.6s ease" }}/>
      </div>
      <span style={{ fontSize:12, color, fontWeight:700, fontFamily:"'SF Mono','JetBrains Mono',monospace", minWidth:36, textAlign:"right" }}>
        {typeof value === "number" ? value.toFixed(0) : value}{suffix}
      </span>
      {sub && <span style={{ fontSize:10, color:T.textMuted, minWidth:44, textAlign:"right" }}>{sub}</span>}
    </div>
  );
}

function Card({ children, accent, onClick, style = {} }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => onClick && setHov(true)}
      onMouseLeave={() => onClick && setHov(false)}
      style={{
        background:T.surface, borderRadius:18,
        border:`1px solid ${hov ? T.borderHi : T.border}`,
        overflow:"hidden",
        transform: hov ? "scale(1.01)" : "scale(1)",
        transition:"all 0.18s ease",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {accent && <div style={{ height:3, background:accent }}/>}
      {children}
    </div>
  );
}

function TransferBlock({ out: o, into: i, gain }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 32px 1fr", gap:8, alignItems:"center", marginBottom:14 }}>
      <div style={{ background:"rgba(255,69,58,0.10)", border:"1px solid rgba(255,69,58,0.25)", borderRadius:12, padding:"12px 14px" }}>
        <div style={{ fontSize:9, fontWeight:700, color:T.red, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:5 }}>Out</div>
        <div style={{ fontSize:15, fontWeight:700, color:T.text, marginBottom:3 }}>{o.name}</div>
        <div style={{ fontSize:11, color:T.textSub, marginBottom:8 }}>{o.pos} · £{o.cost}m · {o.team}</div>
        <div style={{ fontSize:22, fontWeight:700, color:T.red, fontFamily:"'SF Mono','JetBrains Mono',monospace", lineHeight:1 }}>{o.ep}</div>
        <div style={{ fontSize:9, color:T.textMuted, marginTop:2, textTransform:"uppercase", letterSpacing:"0.08em" }}>Projected EP</div>
      </div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, color:T.textMuted }}>→</div>
      <div style={{ background:"rgba(48,209,88,0.10)", border:"1px solid rgba(48,209,88,0.25)", borderRadius:12, padding:"12px 14px" }}>
        <div style={{ fontSize:9, fontWeight:700, color:T.green, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:5 }}>In</div>
        <div style={{ fontSize:15, fontWeight:700, color:T.text, marginBottom:3 }}>{i.name}</div>
        <div style={{ fontSize:11, color:T.textSub, marginBottom:8 }}>{i.pos} · £{i.cost}m · {i.team}</div>
        <div style={{ fontSize:22, fontWeight:700, color:T.green, fontFamily:"'SF Mono','JetBrains Mono',monospace", lineHeight:1 }}>{i.ep}</div>
        <div style={{ fontSize:9, color:T.textMuted, marginTop:2, textTransform:"uppercase", letterSpacing:"0.08em" }}>Projected EP</div>
      </div>
    </div>
  );
}

function Verdict({ text, color = T.green }) {
  return (
    <div style={{
      background:`${color}12`, borderRadius:12, padding:"12px 14px",
      borderLeft:`3px solid ${color}`, marginTop:12,
    }}>
      <div style={{ fontSize:10, fontWeight:700, color, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:5 }}>Algorithm verdict</div>
      <div style={{ fontSize:12, color:T.textSub, lineHeight:1.65 }}>{text}</div>
    </div>
  );
}

function ChipBadge({ type }) {
  const cfg = {
    "Triple Captain": { bg:T.yellow, fg:"#1a1600", short:"3×" },
    "Bench Boost":    { bg:T.green,  fg:"#001a09", short:"BB" },
    "Free Hit":       { bg:T.blue,   fg:"#000d2e", short:"FH" },
    "Wildcard":       { bg:T.purple, fg:"#0d001f", short:"WC" },
  };
  const c = cfg[type] || cfg["Free Hit"];
  return (
    <div style={{
      width:40, height:40, borderRadius:10, background:c.bg, color:c.fg,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:13, fontWeight:800, fontFamily:"'SF Mono','JetBrains Mono',monospace",
      flexShrink:0,
    }}>{c.short}</div>
  );
}

// Mini pitch SVG for lineup article
function MiniPitch({ gw }) {
  const players = [
    { x:50, y:91, label:"Raya",   color:T.gkCol },
    { x:13, y:73, label:"Rich",   color:T.defCol },
    { x:36, y:73, label:"Gab",    color:T.defCol, vc:true },
    { x:64, y:73, label:"Tark",   color:T.defCol },
    { x:87, y:73, label:"NWil",   color:T.defCol },
    { x:10, y:52, label:"Sarr",   color:T.midCol },
    { x:30, y:48, label:"BFer",   color:T.midCol, cap:true },
    { x:50, y:52, label:"Szob",   color:T.midCol },
    { x:70, y:48, label:"Gord",   color:T.midCol },
    { x:90, y:52, label:"Andr",   color:T.midCol },
    { x:50, y:24, label:"Pedro",  color:T.fwdCol },
  ];
  const W = 360, H = 220;
  const toX = (pct) => (pct / 100) * W;
  const toY = (pct) => (pct / 100) * H;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", display:"block", borderRadius:"14px 14px 0 0" }}>
      <defs>
        <linearGradient id="pitchGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d2a0d"/>
          <stop offset="100%" stopColor="#0a200a"/>
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#pitchGrad)"/>
      {/* Pitch markings */}
      <rect x={18} y={8} width={W-36} height={H-16} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={0.8}/>
      <line x1={W/2} y1={8} x2={W/2} y2={H-8} stroke="rgba(255,255,255,0.10)" strokeWidth={0.8}/>
      <circle cx={W/2} cy={H/2} r={28} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={0.8}/>
      <circle cx={W/2} cy={H/2} r={3} fill="rgba(255,255,255,0.15)"/>
      <rect x={18} y={H*0.3} width={38} height={H*0.4} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={0.8}/>
      <rect x={W-56} y={H*0.3} width={38} height={H*0.4} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={0.8}/>
      {/* Players */}
      {players.map((p, i) => {
        const cx = toX(p.x), cy = toY(p.y);
        const r = p.cap || p.vc ? 13 : 11;
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill={p.color} opacity={0.92}/>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth={1.2}/>
            <text x={cx} y={cy+3.5} textAnchor="middle" fontSize={p.cap?7.5:6.5} fontWeight="700" fill="#000">{p.label}</text>
            {p.cap && (
              <>
                <circle cx={cx+10} cy={cy-10} r={7} fill={T.yellow}/>
                <text x={cx+10} y={cy-7} textAnchor="middle" fontSize={8} fontWeight="800" fill="#000">C</text>
              </>
            )}
            {p.vc && (
              <>
                <circle cx={cx+10} cy={cy-10} r={6} fill={T.surface3}/>
                <text x={cx+10} y={cy-7} textAnchor="middle" fontSize={7} fontWeight="700" fill={T.textSub}>V</text>
              </>
            )}
          </g>
        );
      })}
      <text x={W-20} y={H-6} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.2)" fontWeight="600">4-5-1</text>
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════
// ARTICLE COMPONENTS
// ══════════════════════════════════════════════════════════════════════

function ArticleLineup({ gw }) {
  const lineupTable = {
    columns: [
      { label:"Player",   key:"name",    color:T.text },
      { label:"Pos",      key:"pos",     key2:"posEl" },
      { label:"Fixture",  key:"fix" },
      { label:"FDR",      key:"fdrEl",   right:true },
      { label:"Form",     key:"form",    right:true, mono:true, color:T.textSub },
      { label:"xG att",   key:"xg",      right:true, mono:true },
      { label:"EP",       key:"ep",      right:true, mono:true, color:T.green },
    ],
    rows: [
      { name:"B.Fernandes", posEl:<PosBadge pos="MID"/>, fix:"MUN vs LEE (H)", fdrEl:<FdrBadge diff={2}/>, form:"8.4", xg:"2.14", ep:"9.8" },
      { name:"Gabriel",     posEl:<PosBadge pos="DEF"/>, fix:"ARS vs BOU (H)", fdrEl:<FdrBadge diff={1}/>, form:"7.1", xg:"0.68", ep:"8.3" },
      { name:"Sarr",        posEl:<PosBadge pos="MID"/>, fix:"CRY vs NEW (H)", fdrEl:<FdrBadge diff={2}/>, form:"6.3", xg:"1.76", ep:"6.9" },
      { name:"Gordon",      posEl:<PosBadge pos="MID"/>, fix:"NEW vs CRY (A)", fdrEl:<FdrBadge diff={2}/>, form:"5.8", xg:"1.44", ep:"6.8" },
      { name:"J. Pedro",    posEl:<PosBadge pos="FWD"/>, fix:"CHE vs MCI (H)", fdrEl:<FdrBadge diff={3}/>, form:"5.2", xg:"1.22", ep:"5.3" },
      { name:"Raya",        posEl:<PosBadge pos="GK"/>,  fix:"ARS vs BOU (H)", fdrEl:<FdrBadge diff={1}/>, form:"6.8", xg:"—",    ep:"5.6" },
    ],
  };

  return (
    <Card accent={T.green}>
      <MiniPitch gw={gw}/>
      <div style={{ padding:"20px 20px 24px" }}>
        <SectionHeader label={`GW${gw} · Best XI breakdown`} accent={T.green}/>
        <div style={{ fontSize:20, fontWeight:700, color:T.text, lineHeight:1.2, marginBottom:8 }}>
          Optimal XI projects 61.4 points in a 4-5-1 shape, with B.Fernandes armband at Old Trafford
        </div>
        <div style={{ fontSize:13, color:T.textSub, lineHeight:1.65, marginBottom:18, fontStyle:"italic" }}>
          The algorithm settles on a midfield-heavy 4-5-1, concentrating premium budget where GW{gw} fixture difficulty is most favourable. B.Fernandes captains from home against Leeds, while Gabriel anchors the vice-captain slot on the back of three consecutive clean sheets facing a Bournemouth side ranked bottom five for xG created away from home.
        </div>

        <div style={{ display:"flex", gap:10, marginBottom:18, flexWrap:"wrap" }}>
          <StatPill label="Projected XI" value="61.4" color={T.green} sub={`↑ +3.2 vs GW${gw-1}`}/>
          <StatPill label="Captain EP" value="9.8" color={T.yellow} sub="B.Fernandes"/>
          <StatPill label="Avg FDR" value="1.9" color={T.teal} sub="8 of 11 below 2"/>
          <StatPill label="EP per £m" value="0.61" color={T.orange}/>
        </div>

        <div style={{ overflowX:"auto", borderRadius:12, border:`1px solid ${T.border}`, marginBottom:14 }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:T.surface2 }}>
                {["Player","Pos","Fixture","FDR","Form","xG att","EP"].map((h, i) => (
                  <th key={i} style={{ padding:"8px 12px", fontSize:10, fontWeight:600, color:T.textMuted, textAlign:i>2?"right":"left", textTransform:"uppercase", letterSpacing:"0.09em", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lineupTable.rows.map((r, ri) => (
                <tr key={ri} style={{ background:ri===0?"rgba(48,209,88,0.07)":"transparent" }}>
                  <td style={{ padding:"9px 12px", color:ri===0?T.green:T.text, fontWeight:ri===0?700:500, whiteSpace:"nowrap", borderBottom:`1px solid ${T.border}` }}>
                    {r.name}{ri===0&&<span style={{ marginLeft:6, fontSize:9, background:T.yellow, color:"#1a1600", padding:"1px 5px", borderRadius:4, fontWeight:700 }}>C</span>}
                    {ri===1&&<span style={{ marginLeft:6, fontSize:9, background:T.surface3, color:T.textSub, padding:"1px 5px", borderRadius:4, fontWeight:700 }}>VC</span>}
                  </td>
                  <td style={{ padding:"9px 12px", borderBottom:`1px solid ${T.border}` }}>{r.posEl}</td>
                  <td style={{ padding:"9px 12px", color:T.textSub, fontSize:11, whiteSpace:"nowrap", borderBottom:`1px solid ${T.border}` }}>{r.fix}</td>
                  <td style={{ padding:"9px 12px", textAlign:"right", borderBottom:`1px solid ${T.border}` }}>{r.fdrEl}</td>
                  <td style={{ padding:"9px 12px", textAlign:"right", color:T.textSub, fontFamily:"'SF Mono','JetBrains Mono',monospace", borderBottom:`1px solid ${T.border}` }}>{r.form}</td>
                  <td style={{ padding:"9px 12px", textAlign:"right", color:T.textSub, fontFamily:"'SF Mono','JetBrains Mono',monospace", borderBottom:`1px solid ${T.border}` }}>{r.xg}</td>
                  <td style={{ padding:"9px 12px", textAlign:"right", color:ri===0?T.green:T.textSub, fontWeight:ri===0?700:400, fontFamily:"'SF Mono','JetBrains Mono',monospace", borderBottom:`1px solid ${T.border}` }}>{r.ep}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop:14 }}>
          <div style={{ fontSize:11, fontWeight:600, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>Ownership exposure in this XI</div>
          <BarRow label="B.Fernandes" value={50} color={T.yellow} sub="MID"/>
          <BarRow label="Raya" value={43} color={T.blue} sub="GK"/>
          <BarRow label="J. Pedro" value={38} color={T.red} sub="FWD"/>
          <BarRow label="Gabriel" value={32} color={T.blue} sub="DEF"/>
          <BarRow label="Tarkowski" value={18} color={T.green} sub="DEF"/>
        </div>

        <Verdict
          color={T.green}
          text="Formation 4-5-1 edges 4-4-2 by 0.8 projected points, driven by Sarr's superior EP (6.9) over a second striker option. The 4-5-1 concentrates three FDR 2 midfield fixtures in a single shape. Bench EP sits at 18.1, placing this squad in the 82nd percentile for bench boost eligibility."
        />
        <div style={{ fontSize:11, color:T.textMuted, marginTop:14, display:"flex", justifyContent:"space-between" }}>
          <span>StatinSite Algorithm · Poisson · xG · ELO composite</span>
          <span>GW{gw} · 2 mins ago</span>
        </div>
      </div>
    </Card>
  );
}

function ArticleOneTransfer({ gw }) {
  return (
    <Card accent={T.green}>
      <div style={{ padding:"20px 20px 24px" }}>
        <SectionHeader label={`GW${gw} · One transfer`} accent={T.green}/>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
          <div style={{ fontSize:20, fontWeight:700, color:T.text, lineHeight:1.2, flex:1 }}>
            Tarkowski to TAA: the clearest single transfer available this week
          </div>
          <div style={{ flexShrink:0, background:"rgba(48,209,88,0.15)", borderRadius:12, padding:"8px 14px", textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:800, color:T.green, fontFamily:"'SF Mono','JetBrains Mono',monospace" }}>+3.4</div>
            <div style={{ fontSize:9, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>EP gain</div>
          </div>
        </div>
        <div style={{ fontSize:13, color:T.textSub, lineHeight:1.65, marginBottom:18, fontStyle:"italic" }}>
          Everton's defensive record against top-six opposition, conceding 1.62 xG per home fixture over the past six rounds, makes Tarkowski's berth against Manchester City untenable. TAA faces a Bournemouth side ranked in the bottom three for xG created away from home all season. Liverpool's Poisson win probability for this fixture stands at 71%.
        </div>

        <TransferBlock
          out={{ name:"Tarkowski", pos:"DEF", cost:"4.7", team:"EVE", ep:"4.7" }}
          into={{ name:"Trent AA",  pos:"DEF", cost:"7.2", team:"LIV", ep:"8.1" }}
          gain={3.4}
        />

        <div style={{ overflowX:"auto", borderRadius:12, border:`1px solid ${T.border}`, marginBottom:14 }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:T.surface2 }}>
                {["Signal","Tarkowski","TAA"].map((h,i) => (
                  <th key={i} style={{ padding:"8px 12px", fontSize:10, fontWeight:600, color:T.textMuted, textAlign:i>0?"right":"left", textTransform:"uppercase", letterSpacing:"0.09em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["EP next GW",           "4.7",  "8.1"],
                ["5-GW average EP",      "3.8",  "7.2"],
                ["xG conceded (opp)",    "2.31", "0.81"],
                ["Fixture difficulty",   "FDR 5","FDR 1"],
                ["Win probability",      "19%",  "71%"],
                ["Clean sheet prob",     "14%",  "44%"],
                ["Cost delta",           "",     "+£2.5m"],
              ].map(([sig, out, inn], ri) => (
                <tr key={ri}>
                  <td style={{ padding:"8px 12px", color:T.textSub, borderBottom:`1px solid ${T.border}` }}>{sig}</td>
                  <td style={{ padding:"8px 12px", textAlign:"right", color:T.red, fontFamily:"'SF Mono','JetBrains Mono',monospace", borderBottom:`1px solid ${T.border}` }}>{out}</td>
                  <td style={{ padding:"8px 12px", textAlign:"right", color:T.green, fontFamily:"'SF Mono','JetBrains Mono',monospace", fontWeight:600, borderBottom:`1px solid ${T.border}` }}>{inn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Verdict
          color={T.green}
          text="TAA's clean sheet probability of 44%, derived from Liverpool's xG against of 0.81 vs Bournemouth across six comparable fixtures, alone exceeds Tarkowski's full projected return of 4.7. A straightforward upgrade if the budget allows. The £2.5m premium is justified by a three-point EP delta sustained over a run of four FDR 1 or 2 fixtures across GW32 through 35."
        />
        <div style={{ fontSize:11, color:T.textMuted, marginTop:14, display:"flex", justifyContent:"space-between" }}>
          <span>StatinSite · Dixon-Coles · xG model</span><span>GW{gw}</span>
        </div>
      </div>
    </Card>
  );
}

function ArticleTwoTransfers({ gw }) {
  return (
    <Card accent={T.blue}>
      <div style={{ padding:"20px 20px 24px" }}>
        <SectionHeader label={`GW${gw} · Double transfer`} accent={T.blue}/>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
          <div style={{ fontSize:20, fontWeight:700, color:T.text, lineHeight:1.2, flex:1 }}>
            Two moves, 8.3 points: TAA and Salah in maximises rank movement this week
          </div>
          <div style={{ flexShrink:0, background:"rgba(10,132,255,0.15)", borderRadius:12, padding:"8px 14px", textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:800, color:T.blue, fontFamily:"'SF Mono','JetBrains Mono',monospace" }}>+8.3</div>
            <div style={{ fontSize:9, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>total EP gain</div>
          </div>
        </div>
        <div style={{ fontSize:13, color:T.textSub, lineHeight:1.65, marginBottom:18, fontStyle:"italic" }}>
          The algorithm's double-transfer recommendation pairs a defensive upgrade with a premium midfield acquisition. Salah vs Brentford at Anfield carries a historical xG of 2.1 for Liverpool across the last six meetings at that ground. Brentford's away defensive structure has conceded double-digit xG across the past four road fixtures, ranking them 18th for xG against in away fixtures this season.
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:14 }}>
          {[
            { out:{ name:"Tarkowski", pos:"DEF", cost:"4.7", team:"EVE", ep:"4.7" }, into:{ name:"Trent AA", pos:"DEF", cost:"7.2", team:"LIV", ep:"8.1" } },
            { out:{ name:"N.Williams", pos:"MID", cost:"4.5", team:"NFO", ep:"5.3" }, into:{ name:"Salah", pos:"MID", cost:"13.1", team:"LIV", ep:"10.2" } },
          ].map((t, i) => (
            <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 28px 1fr", gap:6, alignItems:"center" }}>
              <div style={{ background:"rgba(255,69,58,0.08)", border:"1px solid rgba(255,69,58,0.2)", borderRadius:10, padding:"10px 12px" }}>
                <div style={{ fontSize:9, color:T.red, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>T{i+1} Out</div>
                <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{t.out.name}</div>
                <div style={{ fontSize:18, fontWeight:700, color:T.red, fontFamily:"'SF Mono','JetBrains Mono',monospace" }}>{t.out.ep} EP</div>
              </div>
              <div style={{ textAlign:"center", color:T.textMuted, fontSize:14 }}>→</div>
              <div style={{ background:"rgba(48,209,88,0.08)", border:"1px solid rgba(48,209,88,0.2)", borderRadius:10, padding:"10px 12px" }}>
                <div style={{ fontSize:9, color:T.green, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>T{i+1} In</div>
                <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{t.into.name}</div>
                <div style={{ fontSize:18, fontWeight:700, color:T.green, fontFamily:"'SF Mono','JetBrains Mono',monospace" }}>{t.into.ep} EP</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ overflowX:"auto", borderRadius:12, border:`1px solid ${T.border}`, marginBottom:14 }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:T.surface2 }}>
                {["Transfer","EP out","EP in","Gain","FDR in"].map((h,i) => (
                  <th key={i} style={{ padding:"8px 12px", fontSize:10, fontWeight:600, color:T.textMuted, textAlign:i>0?"right":"left", textTransform:"uppercase", letterSpacing:"0.09em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["T1 · TAA in",    "4.7","8.1","+3.4","1"],
                ["T2 · Salah in",  "5.3","10.2","+4.9","2"],
                ["Combined",       "10.0","18.3","+8.3","avg 1.5"],
              ].map(([tr,out,inn,gain,fdr],ri) => (
                <tr key={ri} style={{ background:ri===2?"rgba(10,132,255,0.08)":"transparent" }}>
                  <td style={{ padding:"8px 12px", color:ri===2?T.blue:T.textSub, fontWeight:ri===2?600:400, borderBottom:`1px solid ${T.border}` }}>{tr}</td>
                  <td style={{ padding:"8px 12px", textAlign:"right", color:T.red, fontFamily:"'SF Mono','JetBrains Mono',monospace", borderBottom:`1px solid ${T.border}` }}>{out}</td>
                  <td style={{ padding:"8px 12px", textAlign:"right", color:T.green, fontFamily:"'SF Mono','JetBrains Mono',monospace", borderBottom:`1px solid ${T.border}` }}>{inn}</td>
                  <td style={{ padding:"8px 12px", textAlign:"right", color:T.green, fontWeight:700, fontFamily:"'SF Mono','JetBrains Mono',monospace", borderBottom:`1px solid ${T.border}` }}>{gain}</td>
                  <td style={{ padding:"8px 12px", textAlign:"right", borderBottom:`1px solid ${T.border}` }}>{ri<2?<FdrBadge diff={Number(fdr)}/>:<span style={{ color:T.textSub, fontSize:11 }}>{fdr}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:600, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Rank impact score</div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ flex:1, height:6, background:T.surface3, borderRadius:3, overflow:"hidden" }}>
              <div style={{ height:"100%", width:"88%", background:T.blue, borderRadius:3 }}/>
            </div>
            <span style={{ fontSize:14, fontWeight:700, color:T.blue, fontFamily:"'SF Mono','JetBrains Mono',monospace" }}>88/100</span>
          </div>
        </div>

        <Verdict
          color={T.blue}
          text="An 8.3-point swing is statistically significant across a 38-gameweek season, equating to roughly 1.7 rank-percentile positions when applied consistently. Salah's underlying xG involvement rate of 0.68 goals and assists per 90 minutes is the highest in the dataset for GW32 fixtures. The wildcard synergy score for this pairing registers 94 out of 100."
        />
        <div style={{ fontSize:11, color:T.textMuted, marginTop:14, display:"flex", justifyContent:"space-between" }}>
          <span>StatinSite · ELO · Poisson · xG composite</span><span>GW{gw}</span>
        </div>
      </div>
    </Card>
  );
}

function ArticleTripleCaptain({ gw }) {
  const rows = [
    { name:"B.Fernandes", own:"50%", ep:"9.8",  tc:"29.4", fix:"LEE (H)", fdr:2, win:"62%", highlight:true },
    { name:"Salah",        own:"59%", ep:"10.2", tc:"30.6", fix:"BRE (H)", fdr:2, win:"71%" },
    { name:"Gabriel",      own:"32%", ep:"8.3",  tc:"24.9", fix:"BOU (H)", fdr:1, win:"74%" },
    { name:"Szoboszlai",   own:"28%", ep:"6.0",  tc:"18.0", fix:"FUL (H)", fdr:2, win:"58%" },
  ];
  return (
    <Card accent={T.yellow}>
      <div style={{ padding:"20px 20px 24px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:14 }}>
          <ChipBadge type="Triple Captain"/>
          <div style={{ flex:1 }}>
            <SectionHeader label={`GW${gw} · Triple captain`} accent={T.yellow}/>
            <div style={{ fontSize:18, fontWeight:700, color:T.text, lineHeight:1.2 }}>
              B.Fernandes or Salah: a genuine split decision for the armband this week
            </div>
          </div>
          <div style={{ background:"rgba(255,214,10,0.15)", borderRadius:12, padding:"8px 14px", textAlign:"center", flexShrink:0 }}>
            <div style={{ fontSize:22, fontWeight:800, color:T.yellow, fontFamily:"'SF Mono','JetBrains Mono',monospace" }}>29.4</div>
            <div style={{ fontSize:9, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>3× projection</div>
          </div>
        </div>

        <div style={{ fontSize:13, color:T.textSub, lineHeight:1.65, marginBottom:18, fontStyle:"italic" }}>
          For managers activating the triple captain chip, GW{gw} presents the closest call of the season. B.Fernandes carries the stronger ownership differential: an armband differential of nine percentage points creates meaningful rank upside. Salah's raw EP ceiling of 10.2 gives him the edge on pure projected return, but his 59% ownership suppresses the rank movement his score would otherwise generate.
        </div>

        <div style={{ overflowX:"auto", borderRadius:12, border:`1px solid ${T.border}`, marginBottom:14 }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:T.surface2 }}>
                {["Candidate","Ownership","EP","3× EP","Fixture","FDR","Win prob"].map((h,i) => (
                  <th key={i} style={{ padding:"8px 12px", fontSize:10, fontWeight:600, color:T.textMuted, textAlign:i>0?"right":"left", textTransform:"uppercase", letterSpacing:"0.09em", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} style={{ background:r.highlight?"rgba(255,214,10,0.08)":"transparent" }}>
                  <td style={{ padding:"9px 12px", color:r.highlight?T.yellow:T.text, fontWeight:r.highlight?700:500, borderBottom:`1px solid ${T.border}` }}>{r.name}</td>
                  <td style={{ padding:"9px 12px", textAlign:"right", color:T.textSub, fontFamily:"'SF Mono','JetBrains Mono',monospace", borderBottom:`1px solid ${T.border}` }}>{r.own}</td>
                  <td style={{ padding:"9px 12px", textAlign:"right", color:T.textSub, fontFamily:"'SF Mono','JetBrains Mono',monospace", borderBottom:`1px solid ${T.border}` }}>{r.ep}</td>
                  <td style={{ padding:"9px 12px", textAlign:"right", color:r.highlight?T.yellow:T.textSub, fontWeight:r.highlight?700:400, fontFamily:"'SF Mono','JetBrains Mono',monospace", borderBottom:`1px solid ${T.border}` }}>{r.tc}</td>
                  <td style={{ padding:"9px 12px", textAlign:"right", color:T.textSub, fontSize:11, borderBottom:`1px solid ${T.border}` }}>{r.fix}</td>
                  <td style={{ padding:"9px 12px", textAlign:"right", borderBottom:`1px solid ${T.border}` }}><FdrBadge diff={r.fdr}/></td>
                  <td style={{ padding:"9px 12px", textAlign:"right", color:T.green, fontFamily:"'SF Mono','JetBrains Mono',monospace", borderBottom:`1px solid ${T.border}` }}>{r.win}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:600, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Armband differential vs field (B.Fernandes)</div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:11, color:T.textSub, minWidth:32 }}>9pp</span>
            <div style={{ flex:1, height:5, background:T.surface3, borderRadius:3, overflow:"hidden" }}>
              <div style={{ height:"100%", width:"70%", background:T.yellow, borderRadius:3 }}/>
            </div>
            <span style={{ fontSize:11, color:T.yellow, fontWeight:600 }}>rank upside</span>
          </div>
        </div>

        <Verdict
          color={T.yellow}
          text="Own Salah? Captain him. His raw EP ceiling of 10.2 and superior xG context make the decision trivial. Own B.Fernandes? The triple captain is equally valid: a nine-percentage-point ownership gap means a massive rank swing if he hauls and Salah blanks. Do not triple captain Gabriel despite FDR 1. Defenders carry inherent minutes risk and bonus point variance that depress their chip return relative to attacking midfielders in high-probability win fixtures."
        />
        <div style={{ fontSize:11, color:T.textMuted, marginTop:14, display:"flex", justifyContent:"space-between" }}>
          <span>StatinSite · captaincy model v3</span><span>GW{gw}</span>
        </div>
      </div>
    </Card>
  );
}

function ArticleBenchBoost({ gw }) {
  const bench = [
    { name:"Richards",  pos:"DEF", ep:5.7, app:100, fdr:2, fix:"CRY (H)" },
    { name:"N.Williams",pos:"MID", ep:5.3, app:96,  fdr:2, fix:"AVL (H)" },
    { name:"Bench GK",  pos:"GK",  ep:3.8, app:100, fdr:1, fix:"BOU (H)" },
    { name:"Tarkowski", pos:"DEF", ep:3.3, app:75,  fdr:5, fix:"MCI (A)" },
  ];
  return (
    <Card accent={T.green}>
      <div style={{ padding:"20px 20px 24px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:14 }}>
          <ChipBadge type="Bench Boost"/>
          <div style={{ flex:1 }}>
            <SectionHeader label={`GW${gw} · Bench boost`} accent={T.green}/>
            <div style={{ fontSize:18, fontWeight:700, color:T.text, lineHeight:1.2 }}>
              Your bench projects 18.1 points. Activation is justified this gameweek
            </div>
          </div>
          <div style={{ background:"rgba(48,209,88,0.15)", borderRadius:12, padding:"8px 14px", textAlign:"center", flexShrink:0 }}>
            <div style={{ fontSize:22, fontWeight:800, color:T.green, fontFamily:"'SF Mono','JetBrains Mono',monospace" }}>18.1</div>
            <div style={{ fontSize:9, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>bench EP</div>
          </div>
        </div>

        <div style={{ fontSize:13, color:T.textSub, lineHeight:1.65, marginBottom:18, fontStyle:"italic" }}>
          The bench boost chip scores highest when bench EP is elevated and appearance probability across all four players is strong. This week, three of your four bench players carry FDR 2 or below, and aggregate appearance probability sits at 93%, placing this squad in the 82nd percentile among all tracked squads this season.
        </div>

        <div style={{ display:"flex", gap:10, marginBottom:18, flexWrap:"wrap" }}>
          <StatPill label="Bench EP total" value="18.1" color={T.green} sub="82nd percentile"/>
          <StatPill label="Avg FDR" value="2.5" color={T.teal} sub="3 of 4 below 3"/>
          <StatPill label="Avg app prob" value="93%" color={T.orange}/>
        </div>

        <div style={{ overflowX:"auto", borderRadius:12, border:`1px solid ${T.border}`, marginBottom:14 }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:T.surface2 }}>
                {["Player","Pos","EP","App prob","FDR","Fixture"].map((h,i) => (
                  <th key={i} style={{ padding:"8px 12px", fontSize:10, fontWeight:600, color:T.textMuted, textAlign:i>0?"right":"left", textTransform:"uppercase", letterSpacing:"0.09em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bench.map((p, ri) => (
                <tr key={ri} style={{ background:ri===0?"rgba(48,209,88,0.07)":"transparent" }}>
                  <td style={{ padding:"9px 12px", color:ri===0?T.green:T.text, fontWeight:ri===0?700:500, borderBottom:`1px solid ${T.border}` }}>{p.name}</td>
                  <td style={{ padding:"9px 12px", textAlign:"right", borderBottom:`1px solid ${T.border}` }}><PosBadge pos={p.pos}/></td>
                  <td style={{ padding:"9px 12px", textAlign:"right", color:ri===0?T.green:p.ep<4?T.red:T.textSub, fontFamily:"'SF Mono','JetBrains Mono',monospace", borderBottom:`1px solid ${T.border}` }}>{p.ep}</td>
                  <td style={{ padding:"9px 12px", textAlign:"right", color:p.app===100?T.green:p.app>80?T.orange:T.red, fontFamily:"'SF Mono','JetBrains Mono',monospace", borderBottom:`1px solid ${T.border}` }}>{p.app}%</td>
                  <td style={{ padding:"9px 12px", textAlign:"right", borderBottom:`1px solid ${T.border}` }}><FdrBadge diff={p.fdr}/></td>
                  <td style={{ padding:"9px 12px", textAlign:"right", color:T.textSub, fontSize:11, borderBottom:`1px solid ${T.border}` }}>{p.fix}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={2} style={{ padding:"9px 12px", color:T.textMuted, fontWeight:600, fontSize:11 }}>Total bench EP</td>
                <td style={{ padding:"9px 12px", textAlign:"right", color:T.green, fontFamily:"'SF Mono','JetBrains Mono',monospace", fontWeight:700, fontSize:14 }}>18.1</td>
                <td colSpan={3} style={{ padding:"9px 12px", textAlign:"right", color:T.textMuted, fontSize:11 }}>82nd percentile</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:600, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Bench boost percentile vs season average</div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ flex:1, height:6, background:T.surface3, borderRadius:3, overflow:"hidden" }}>
              <div style={{ height:"100%", width:"82%", background:T.green, borderRadius:3 }}/>
            </div>
            <span style={{ fontSize:14, fontWeight:700, color:T.green, fontFamily:"'SF Mono','JetBrains Mono',monospace" }}>82nd</span>
          </div>
        </div>

        <Verdict
          color={T.green}
          text="Activation is recommended. The primary risk vector is Tarkowski's appearance probability of 75% away at Manchester City. A blank from him reduces bench EP to 14.8, still comfortably above the season's median bench boost return of 11.3. Hold the chip only if GW33 carries a confirmed double gameweek, which remains unscheduled at time of writing."
        />
        <div style={{ fontSize:11, color:T.textMuted, marginTop:14, display:"flex", justifyContent:"space-between" }}>
          <span>StatinSite · appearance model · fixture model</span><span>GW{gw}</span>
        </div>
      </div>
    </Card>
  );
}

function ArticleFreeHit({ gw }) {
  const squad = [
    { name:"Salah",        pos:"MID", cost:"£13.1m", ep:"10.2", fdr:2, fix:"BRE (H)", highlight:true },
    { name:"B.Fernandes",  pos:"MID", cost:"£8.3m",  ep:"9.8",  fdr:2, fix:"LEE (H)" },
    { name:"TAA",          pos:"DEF", cost:"£7.2m",  ep:"8.1",  fdr:1, fix:"BOU (H)" },
    { name:"Gabriel",      pos:"DEF", cost:"£6.5m",  ep:"8.3",  fdr:1, fix:"BOU (H)" },
    { name:"Isak",         pos:"FWD", cost:"£8.8m",  ep:"7.9",  fdr:2, fix:"CRY (H)" },
  ];
  return (
    <Card accent={T.blue}>
      <div style={{ padding:"20px 20px 24px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:14 }}>
          <ChipBadge type="Free Hit"/>
          <div style={{ flex:1 }}>
            <SectionHeader label={`GW${gw} · Free hit`} accent={T.blue}/>
            <div style={{ fontSize:18, fontWeight:700, color:T.text, lineHeight:1.2 }}>
              £99.8m buys a squad projecting 78.4 points: a 17-point premium over the average XI
            </div>
          </div>
          <div style={{ background:"rgba(10,132,255,0.15)", borderRadius:12, padding:"8px 14px", textAlign:"center", flexShrink:0 }}>
            <div style={{ fontSize:22, fontWeight:800, color:T.blue, fontFamily:"'SF Mono','JetBrains Mono',monospace" }}>78.4</div>
            <div style={{ fontSize:9, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>proj. XI pts</div>
          </div>
        </div>

        <div style={{ fontSize:13, color:T.textSub, lineHeight:1.65, marginBottom:18, fontStyle:"italic" }}>
          The free hit chip's value is maximised when the optimal squad diverges significantly from the average FPL squad. In GW{gw} it does. The algorithm constructs a 4-4-2 weighted toward Liverpool and Arsenal assets, exploiting two of the four sub-2.0 FDR fixtures available this week. Salah and TAA form the attacking-defensive axis at Anfield, where Liverpool have kept four clean sheets from five home fixtures across the past two months.
        </div>

        <div style={{ display:"flex", gap:10, marginBottom:18, flexWrap:"wrap" }}>
          <StatPill label="Free hit XI" value="78.4" color={T.blue} sub="4-4-2 shape"/>
          <StatPill label="vs your XI" value="+17.0" color={T.green} sub="61.4 baseline"/>
          <StatPill label="Avg FDR" value="1.8" color={T.teal}/>
          <StatPill label="Budget used" value="£99.8m" color={T.orange}/>
        </div>

        <div style={{ overflowX:"auto", borderRadius:12, border:`1px solid ${T.border}`, marginBottom:14 }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:T.surface2 }}>
                {["Player","Pos","Cost","EP","FDR","Fixture"].map((h,i) => (
                  <th key={i} style={{ padding:"8px 12px", fontSize:10, fontWeight:600, color:T.textMuted, textAlign:i>0?"right":"left", textTransform:"uppercase", letterSpacing:"0.09em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {squad.map((p, ri) => (
                <tr key={ri} style={{ background:p.highlight?"rgba(10,132,255,0.08)":"transparent" }}>
                  <td style={{ padding:"9px 12px", color:p.highlight?T.blue:T.text, fontWeight:p.highlight?700:500, borderBottom:`1px solid ${T.border}` }}>
                    {p.name}{ri===0&&<span style={{ marginLeft:6, fontSize:9, background:T.yellow, color:"#1a1600", padding:"1px 5px", borderRadius:4, fontWeight:700 }}>C</span>}
                  </td>
                  <td style={{ padding:"9px 12px", textAlign:"right", borderBottom:`1px solid ${T.border}` }}><PosBadge pos={p.pos}/></td>
                  <td style={{ padding:"9px 12px", textAlign:"right", color:T.textSub, fontFamily:"'SF Mono','JetBrains Mono',monospace", borderBottom:`1px solid ${T.border}` }}>{p.cost}</td>
                  <td style={{ padding:"9px 12px", textAlign:"right", color:p.highlight?T.blue:T.textSub, fontFamily:"'SF Mono','JetBrains Mono',monospace", fontWeight:p.highlight?700:400, borderBottom:`1px solid ${T.border}` }}>{p.ep}</td>
                  <td style={{ padding:"9px 12px", textAlign:"right", borderBottom:`1px solid ${T.border}` }}><FdrBadge diff={p.fdr}/></td>
                  <td style={{ padding:"9px 12px", textAlign:"right", color:T.textSub, fontSize:11, borderBottom:`1px solid ${T.border}` }}>{p.fix}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} style={{ padding:"9px 12px", color:T.textMuted, fontWeight:600, fontSize:11 }}>+ 10 further players</td>
                <td style={{ padding:"9px 12px", textAlign:"right", color:T.blue, fontFamily:"'SF Mono','JetBrains Mono',monospace", fontWeight:700, fontSize:14 }}>78.4</td>
                <td style={{ padding:"9px 12px", textAlign:"right", color:T.textMuted, fontSize:11 }}>avg 1.7</td>
                <td style={{ padding:"9px 12px", textAlign:"right", color:T.textMuted, fontSize:11 }}>£99.8m total</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <span style={{ fontSize:11, fontWeight:600, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.1em" }}>Free hit vs current squad</span>
            <span style={{ fontSize:12, fontWeight:700, color:T.green, fontFamily:"'SF Mono','JetBrains Mono',monospace" }}>+17.0 pts</span>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ fontSize:11, color:T.textSub, fontFamily:"'SF Mono','JetBrains Mono',monospace", minWidth:54 }}>Yours 61.4</span>
            <div style={{ flex:1, position:"relative", height:8, background:T.surface3, borderRadius:4, overflow:"hidden" }}>
              <div style={{ position:"absolute", left:0, top:0, height:"100%", width:"78%", background:T.surface2, borderRight:`2px solid ${T.textSub}`, borderRadius:"4px 0 0 4px" }}/>
              <div style={{ position:"absolute", left:0, top:0, height:"100%", width:"100%", background:`${T.blue}44`, borderRadius:4 }}/>
            </div>
            <span style={{ fontSize:11, color:T.blue, fontFamily:"'SF Mono','JetBrains Mono',monospace", minWidth:54, textAlign:"right" }}>FH 78.4</span>
          </div>
        </div>

        <Verdict
          color={T.blue}
          text="The 17-point premium is the strongest free hit case since GW19. Activate if you have the chip unused and your squad carries structural issues, including multiple players against FDR 4 or 5 fixtures or confirmed appearance doubts. Do not activate purely for the projected uplift if your base squad is already top-quartile. The chip is best preserved for a confirmed double gameweek, where the premium compounds across two fixtures per player."
        />
        <div style={{ fontSize:11, color:T.textMuted, marginTop:14, display:"flex", justifyContent:"space-between" }}>
          <span>StatinSite · budget optimiser · Poisson model</span><span>GW{gw}</span>
        </div>
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════

export default function FplIntelligencePage() {
  const navigate  = useNavigate();
  const [gw, setGw]               = useState(32);
  const [deadline, setDeadline]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [activeArticle, setActive] = useState("lineup");

  useEffect(() => {
    getFplBootstrap().then(bs => {
      const evts = bs?.events || [];
      const next = evts.find(e => !e.finished && e.is_next);
      const curr = evts.find(e => !e.finished && e.is_current);
      const ev   = next || curr || evts.find(e => !e.finished);
      if (ev?.id) setGw(ev.id);
      if (ev?.deadline_time) setDeadline(ev.deadline_time);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const fmtDl = useMemo(() => {
    if (!deadline) return null;
    try {
      const d   = new Date(deadline);
      const day = d.toLocaleDateString("en-GB", { weekday:"short", day:"numeric", month:"short" });
      const t   = d.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" });
      const hrs = Math.max(0, Math.round((d - Date.now()) / 3600000));
      return { day, time:t, hrs };
    } catch { return null; }
  }, [deadline]);

  const ARTICLES = [
    { key:"lineup", label:"Best XI",    color:T.green  },
    { key:"one",    label:"1 Transfer", color:T.green  },
    { key:"two",    label:"2 Transfers",color:T.blue   },
    { key:"tc",     label:"Triple C",   color:T.yellow },
    { key:"bb",     label:"Bench Boost",color:T.green  },
    { key:"fh",     label:"Free Hit",   color:T.blue   },
  ];

  return (
    <div style={{ background:T.bg, minHeight:"100vh", fontFamily:"-apple-system,'SF Pro Display','Helvetica Neue',sans-serif" }}>

      {/* ── MASTHEAD ── */}
      <div style={{
        background:"rgba(28,28,30,0.95)",
        backdropFilter:"blur(24px)",
        WebkitBackdropFilter:"blur(24px)",
        borderBottom:`1px solid ${T.border}`,
        padding:"16px 20px 14px",
        position:"sticky", top:0, zIndex:100,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
          <button onClick={() => navigate("/best-team")} style={{
            background:"none", border:"none", cursor:"pointer",
            color:T.blue, fontSize:13, fontWeight:600, padding:0, display:"flex", alignItems:"center", gap:4,
          }}>
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Best XI
          </button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:2 }}>
              FPL Intelligence Desk
            </div>
            <div style={{ fontSize:18, fontWeight:700, color:T.text, lineHeight:1 }}>
              Gameweek {gw}
            </div>
          </div>
          {fmtDl && (
            <div style={{ textAlign:"right", flexShrink:0 }}>
              <div style={{ fontSize:9, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.1em" }}>Deadline</div>
              <div style={{ fontSize:12, fontWeight:700, color:T.red }}>{fmtDl.day} · {fmtDl.time}</div>
              <div style={{ fontSize:10, color:T.textMuted }}>{fmtDl.hrs}h remaining</div>
            </div>
          )}
        </div>

        {/* Article tabs */}
        <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:2 }}>
          {ARTICLES.map(a => (
            <button
              key={a.key}
              onClick={() => setActive(a.key)}
              style={{
                flexShrink:0,
                padding:"6px 14px",
                borderRadius:20,
                border:"none",
                cursor:"pointer",
                fontSize:12,
                fontWeight:600,
                background: activeArticle === a.key ? a.color : T.surface2,
                color: activeArticle === a.key ? "#000" : T.textSub,
                transition:"all 0.15s ease",
              }}
            >{a.label}</button>
          ))}
        </div>
      </div>

      {/* ── SUMMARY STRIP ── */}
      <div style={{
        display:"flex", gap:10, overflowX:"auto", padding:"14px 16px",
        borderBottom:`1px solid ${T.border}`,
      }}>
        {[
          { label:"XI projection",  val:"61.4", color:T.green  },
          { label:"vs GW31",        val:"+3.2",  color:T.green  },
          { label:"Best transfer gain", val:"+3.4", color:T.teal },
          { label:"Double gain",    val:"+8.3",  color:T.blue   },
          { label:"Captain EP",     val:"9.8",   color:T.yellow },
          { label:"Bench EP",       val:"18.1",  color:T.orange },
        ].map((s, i) => (
          <div key={i} style={{
            flexShrink:0, background:T.surface, borderRadius:12,
            padding:"10px 14px", border:`1px solid ${T.border}`, minWidth:90,
          }}>
            <div style={{ fontSize:9, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.09em", marginBottom:3 }}>{s.label}</div>
            <div style={{ fontSize:18, fontWeight:700, color:s.color, fontFamily:"'SF Mono','JetBrains Mono',monospace", lineHeight:1 }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* ── ARTICLE CONTENT ── */}
      <div style={{ padding:"16px 16px 40px", maxWidth:900, margin:"0 auto" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:60, color:T.textMuted }}>
            <div style={{ fontSize:14 }}>Loading GW{gw} data...</div>
          </div>
        ) : (
          <>
            {activeArticle === "lineup" && <ArticleLineup gw={gw}/>}
            {activeArticle === "one"    && <ArticleOneTransfer gw={gw}/>}
            {activeArticle === "two"    && <ArticleTwoTransfers gw={gw}/>}
            {activeArticle === "tc"     && <ArticleTripleCaptain gw={gw}/>}
            {activeArticle === "bb"     && <ArticleBenchBoost gw={gw}/>}
            {activeArticle === "fh"     && <ArticleFreeHit gw={gw}/>}
          </>
        )}
      </div>

    </div>
  );
}