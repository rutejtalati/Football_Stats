// frontend/src/pages/MatchIntelligencePage.jsx
// FotMob-style match intelligence page
// Route: /match/:fixtureId
// Uses: GET /api/match-intelligence/:fixtureId

import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMatchIntelligence } from "../hooks/useMatchIntelligence";

// ── Design tokens ──────────────────────────────────────────────────────
const T = {
  bg:        "#000",
  panel:     "rgba(255,255,255,0.04)",
  border:    "rgba(255,255,255,0.08)",
  borderHi:  "rgba(129,140,248,0.35)",
  text:      "rgba(255,255,255,0.92)",
  muted:     "rgba(255,255,255,0.35)",
  faint:     "rgba(255,255,255,0.05)",
  accent:    "#818CF8",
  green:     "#10B981",
  red:       "#F87171",
  yellow:    "#FBBF24",
  home:      "#E2E8F0",
  away:      "#10B981",
};

// ── Helpers ────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}
function fmtTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function statusColor(short) {
  if (["1H","2H","ET","P","LIVE","HT"].includes(short)) return T.green;
  if (["FT","AET","PEN"].includes(short)) return T.muted;
  return T.accent;
}

// ── Section wrapper ────────────────────────────────────────────────────
const Section = ({ title, icon, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background: T.panel, border: `1px solid ${T.border}`,
      borderRadius: 16, overflow: "hidden",
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "14px 18px",
          background: "none", border: "none", cursor: "pointer",
          borderBottom: open ? `1px solid ${T.border}` : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
          <span style={{ fontSize: 12, fontWeight: 700, color: T.text, letterSpacing: "0.05em", fontFamily: "'Inter',sans-serif" }}>
            {title}
          </span>
        </div>
        <span style={{ fontSize: 10, color: T.muted }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && <div style={{ padding: "16px 18px" }}>{children}</div>}
    </div>
  );
};

// ── Stat bar (home vs away) ────────────────────────────────────────────
const StatBar = ({ label, home, away }) => {
  const hv = parseFloat(String(home ?? "").replace("%", "")) || 0;
  const av = parseFloat(String(away ?? "").replace("%", "")) || 0;
  const tot = hv + av || 1;
  const hPct = (hv / tot) * 100;
  const aPct = (av / tot) * 100;
  const noData = home == null && away == null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: noData ? T.muted : T.home, fontFamily: "'JetBrains Mono',monospace" }}>
          {home ?? "—"}
        </span>
        <span style={{ fontSize: 9, color: T.muted, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Inter',sans-serif" }}>
          {label}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: noData ? T.muted : T.away, fontFamily: "'JetBrains Mono',monospace" }}>
          {away ?? "—"}
        </span>
      </div>
      <div style={{ display: "flex", height: 5, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,0.05)" }}>
        {noData
          ? <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 999 }} />
          : <>
              <div style={{ flex: hPct, background: `linear-gradient(90deg,${T.home}88,${T.home})`, borderRadius: "999px 0 0 999px" }} />
              <div style={{ flex: aPct, background: `linear-gradient(90deg,${T.away},${T.away}88)`, borderRadius: "0 999px 999px 0" }} />
            </>
        }
      </div>
    </div>
  );
};

// ── Event icon ─────────────────────────────────────────────────────────
function eventIcon(type, detail) {
  if (type === "Goal") {
    if (detail?.includes("Own Goal")) return { icon: "⚽", color: T.red };
    if (detail?.includes("Penalty"))  return { icon: "🥅", color: T.yellow };
    return { icon: "⚽", color: T.green };
  }
  if (type === "Card") {
    if (detail?.includes("Red"))    return { icon: "🟥", color: T.red };
    if (detail?.includes("Yellow")) return { icon: "🟨", color: T.yellow };
    return { icon: "🟨", color: T.yellow };
  }
  if (type === "subst") return { icon: "🔄", color: T.accent };
  if (type === "Var")   return { icon: "📺", color: T.muted };
  return { icon: "•", color: T.muted };
}

// ══════════════════════════════════════════════════════════════════════
// SECTION COMPONENTS
// ══════════════════════════════════════════════════════════════════════

const MatchHeader = ({ header, prediction }) => {
  const { home, away, score, status, status_short, elapsed, date, referee, league } = header;
  const isLive = ["1H","2H","ET","P","HT"].includes(status_short);
  const isFT   = ["FT","AET","PEN"].includes(status_short);
  const hp = prediction?.p_home_win || prediction?.home_win_prob || 0;
  const dp = prediction?.p_draw     || prediction?.draw_prob     || 0;
  const ap = prediction?.p_away_win || prediction?.away_win_prob || 0;
  const xgH = prediction?.xg_home || prediction?.expected_home_goals;
  const xgA = prediction?.xg_away || prediction?.expected_away_goals;
  const conf = prediction?.confidence;

  return (
    <div style={{
      background: "rgba(10,10,14,0.97)",
      border: `1px solid ${T.border}`,
      borderRadius: 20, overflow: "hidden",
      boxShadow: "0 20px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)",
    }}>
      {/* League strip */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 18px",
        background: "rgba(255,255,255,0.03)",
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {league?.logo && <img src={league.logo} alt="" style={{ width: 16, height: 16, objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"} />}
          <span style={{ fontSize: 10, fontWeight: 600, color: T.muted, fontFamily: "'Inter',sans-serif" }}>
            {league?.name}{league?.round ? ` · ${league.round}` : ""}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor(status_short), boxShadow: isLive ? `0 0 8px ${T.green}` : "none" }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: statusColor(status_short), fontFamily: "'Inter',sans-serif" }}>
            {isLive ? `LIVE ${elapsed}'` : isFT ? "Full Time" : status}
          </span>
        </div>
      </div>

      {/* VS panel */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 1fr", padding: "24px 18px 18px", gap: 0 }}>
        {/* Home */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          {home?.logo
            ? <img src={home.logo} alt={home.name} style={{ width: 56, height: 56, objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"} />
            : <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(255,255,255,0.06)" }} />
          }
          <span style={{ fontSize: 14, fontWeight: 700, color: T.home, textAlign: "center", fontFamily: "'Inter',sans-serif" }}>{home?.name}</span>
          {xgH != null && (
            <div style={{ fontSize: 10, color: T.muted, fontFamily: "'JetBrains Mono',monospace" }}>
              xG <span style={{ color: T.home, fontWeight: 700 }}>{parseFloat(xgH).toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Score */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: T.text, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>
            {score.home ?? "–"}<span style={{ color: T.muted, margin: "0 4px" }}>:</span>{score.away ?? "–"}
          </div>
          {score.ht_home != null && (
            <div style={{ fontSize: 10, color: T.muted, fontFamily: "'JetBrains Mono',monospace" }}>
              HT {score.ht_home}–{score.ht_away}
            </div>
          )}
          {(hp || dp || ap) ? (
            <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
              {[{l:"H",v:Math.round(hp*100),c:T.home},{l:"D",v:Math.round(dp*100),c:"rgba(255,255,255,0.35)"},{l:"A",v:Math.round(ap*100),c:T.away}].map(({ l, v, c }) => (
                <div key={l} style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  padding: "5px 8px", borderRadius: 8,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
                  minWidth: 34,
                }}>
                  <span style={{ fontSize: 7, color: T.muted }}>{l}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: c, fontFamily: "'JetBrains Mono',monospace" }}>{v}%</span>
                </div>
              ))}
            </div>
          ) : null}
          {conf != null && (
            <div style={{ fontSize: 9, color: T.muted, marginTop: 2 }}>
              Model conf <span style={{ color: T.accent, fontWeight: 700 }}>{conf}%</span>
            </div>
          )}
        </div>

        {/* Away */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          {away?.logo
            ? <img src={away.logo} alt={away.name} style={{ width: 56, height: 56, objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"} />
            : <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(255,255,255,0.06)" }} />
          }
          <span style={{ fontSize: 14, fontWeight: 700, color: T.away, textAlign: "center", fontFamily: "'Inter',sans-serif" }}>{away?.name}</span>
          {xgA != null && (
            <div style={{ fontSize: 10, color: T.muted, fontFamily: "'JetBrains Mono',monospace" }}>
              xG <span style={{ color: T.away, fontWeight: 700 }}>{parseFloat(xgA).toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Facts strip */}
      <div style={{
        display: "flex", justifyContent: "center", gap: 24,
        padding: "10px 18px 14px",
        borderTop: `1px solid ${T.border}`,
        flexWrap: "wrap",
      }}>
        {[
          { label: "Date",    val: fmtDate(date) },
          { label: "KO",      val: fmtTime(date) },
          { label: "Referee", val: header.referee || "—" },
        ].map(({ label, val }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 8, color: T.muted, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Inter',sans-serif" }}>{label}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.text, fontFamily: "'Inter',sans-serif", marginTop: 2 }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const EventsTimeline = ({ events, homeId }) => {
  if (!events?.length) return (
    <div style={{ padding: 20, textAlign: "center", color: T.muted, fontSize: 12 }}>No events yet</div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {events.map((e, i) => {
        const isHome = e.team_id === homeId;
        const { icon, color } = eventIcon(e.type, e.detail);
        return (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 10px", borderRadius: 10,
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
            flexDirection: isHome ? "row" : "row-reverse",
          }}>
            <div style={{
              minWidth: 36, height: 36, borderRadius: 10,
              background: `${color}18`, border: `1px solid ${color}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, flexShrink: 0,
            }}>{icon}</div>
            <div style={{ flex: 1, textAlign: isHome ? "left" : "right" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{e.player_name}</div>
              {e.assist_name && <div style={{ fontSize: 10, color: T.muted }}>{e.assist_name}</div>}
              <div style={{ fontSize: 10, color: T.muted }}>{e.detail}</div>
            </div>
            <div style={{
              minWidth: 36, textAlign: "center",
              fontSize: 13, fontWeight: 700, color: color,
              fontFamily: "'JetBrains Mono',monospace", flexShrink: 0,
            }}>
              {e.minute}{e.extra ? `+${e.extra}` : ""}'
            </div>
          </div>
        );
      })}
    </div>
  );
};

const LineupsSection = ({ lineups }) => {
  const [tab, setTab] = useState(0);
  if (!lineups?.length) return (
    <div style={{ padding: 20, textAlign: "center", color: T.muted, fontSize: 12 }}>Lineups not yet available</div>
  );
  const lineup = lineups[tab];
  const col = tab === 0 ? T.home : T.away;
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {lineups.map((l, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
            cursor: "pointer", fontFamily: "'Inter',sans-serif",
            border: `1px solid ${tab === i ? (i === 0 ? T.home : T.away) + "40" : T.border}`,
            background: tab === i ? `${i === 0 ? T.home : T.away}0c` : "transparent",
            color: tab === i ? (i === 0 ? T.home : T.away) : T.muted,
          }}>{l.team_name}</button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, alignItems: "center" }}>
        <div style={{
          fontSize: 22, fontWeight: 700, color: col, fontFamily: "'JetBrains Mono',monospace",
          background: `${col}10`, border: `1px solid ${col}30`, padding: "4px 14px", borderRadius: 10,
        }}>{lineup.formation || "—"}</div>
        {lineup.coach?.name && (
          <div style={{ fontSize: 10, color: T.muted }}>
            Coach: <span style={{ color: T.text, fontWeight: 600 }}>{lineup.coach.name}</span>
          </div>
        )}
      </div>
      <div style={{ fontSize: 9, fontWeight: 700, color: col, letterSpacing: "0.1em", marginBottom: 8 }}>STARTING XI</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {lineup.start_xi.map((p, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 10, flex: "1 1 180px",
            background: `${col}08`, border: `1px solid ${col}18`,
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7, flexShrink: 0,
              background: `${col}18`, border: `1px solid ${col}35`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700, color: col, fontFamily: "'JetBrains Mono',monospace",
            }}>{p.number}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{p.name}</div>
              <div style={{ fontSize: 9, color: col, fontWeight: 600 }}>{p.pos}</div>
            </div>
          </div>
        ))}
      </div>
      {lineup.subs?.length > 0 && (
        <>
          <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, letterSpacing: "0.1em", marginBottom: 8 }}>SUBSTITUTES</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {lineup.subs.map((p, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8,
                background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}`,
              }}>
                <span style={{ fontSize: 9, color: T.muted, fontFamily: "'JetBrains Mono',monospace", minWidth: 16 }}>{p.number}</span>
                <span style={{ fontSize: 11, color: T.text }}>{p.name}</span>
                <span style={{ fontSize: 9, color: T.muted }}>{p.pos}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const StatisticsSection = ({ statistics, header }) => {
  const STATS = [
    { key: "possession",       label: "Possession" },
    { key: "shots_total",      label: "Total Shots" },
    { key: "shots_on_target",  label: "Shots on Target" },
    { key: "shots_inside_box", label: "Inside Box" },
    { key: "expected_goals",   label: "xG" },
    { key: "corner_kicks",     label: "Corners" },
    { key: "fouls",            label: "Fouls" },
    { key: "offsides",         label: "Offsides" },
    { key: "yellow_cards",     label: "Yellow Cards" },
    { key: "red_cards",        label: "Red Cards" },
    { key: "pass_accuracy",    label: "Pass Accuracy" },
    { key: "goalkeeper_saves", label: "Saves" },
  ];
  if (!statistics || !Object.keys(statistics).length) return (
    <div style={{ padding: 20, textAlign: "center", color: T.muted, fontSize: 12 }}>No statistics available yet</div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.home }}>{header?.home?.name?.split(" ").pop()}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.away }}>{header?.away?.name?.split(" ").pop()}</span>
      </div>
      {STATS.map(({ key, label }) => {
        const stat = statistics[key];
        if (!stat) return null;
        return <StatBar key={key} label={label} home={stat.home} away={stat.away} />;
      })}
    </div>
  );
};

const H2HSection = ({ h2h, header }) => {
  const { home_wins = 0, draws = 0, away_wins = 0, results = [] } = h2h || {};
  const tot = (home_wins + draws + away_wins) || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { label: header?.home?.name?.split(" ").pop() || "Home", val: home_wins, col: T.home },
          { label: "Draw", val: draws, col: "rgba(255,255,255,0.4)" },
          { label: header?.away?.name?.split(" ").pop() || "Away", val: away_wins, col: T.away },
        ].map(({ label, val, col }) => (
          <div key={label} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            gap: 4, padding: "14px 8px", borderRadius: 14,
            background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`,
          }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: col, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>{val}</span>
            <span style={{ fontSize: 9, color: T.muted }}>{label.slice(0, 10)}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: col }}>{Math.round(val / tot * 100)}%</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", height: 6, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,0.05)" }}>
        <div style={{ flex: home_wins, background: T.home, opacity: 0.8 }} />
        <div style={{ flex: draws, background: "rgba(255,255,255,0.15)" }} />
        <div style={{ flex: away_wins, background: T.away, opacity: 0.8 }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {results.slice(0, 8).map((r, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10,
            background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}`,
          }}>
            <span style={{ fontSize: 9, color: T.muted, minWidth: 72, fontFamily: "'JetBrains Mono',monospace" }}>{r.date}</span>
            <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: T.text, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.home_team}</span>
            <span style={{ padding: "3px 10px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: `1px solid ${T.border}`, fontSize: 12, fontWeight: 800, color: T.text, fontFamily: "'JetBrains Mono',monospace", minWidth: 48, textAlign: "center" }}>
              {r.home_goals}–{r.away_goals}
            </span>
            <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.away_team}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const InjuriesSection = ({ injuries, header }) => {
  const groups = [
    { label: header?.home?.name || "Home", players: injuries?.home || [], col: T.home },
    { label: header?.away?.name || "Away", players: injuries?.away || [], col: T.away },
  ];
  const hasAny = groups.some(g => g.players.length > 0);
  if (!hasAny) return (
    <div style={{ padding: 20, textAlign: "center", color: T.muted, fontSize: 12 }}>No injuries reported</div>
  );
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {groups.map(({ label, players, col }) => (
        <div key={label}>
          <div style={{ fontSize: 9, fontWeight: 700, color: col, letterSpacing: "0.1em", marginBottom: 8 }}>{label.toUpperCase()}</div>
          {!players.length
            ? <div style={{ fontSize: 11, color: T.muted }}>No injuries</div>
            : players.map((p, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, marginBottom: 5,
                  background: "rgba(255,50,50,0.06)", border: "1px solid rgba(255,50,50,0.15)",
                }}>
                  {p.player_photo
                    ? <img src={p.player_photo} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover" }} onError={e => e.currentTarget.style.display = "none"} />
                    : <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,50,50,0.2)" }} />
                  }
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{p.player_name}</div>
                    <div style={{ fontSize: 10, color: T.red }}>{p.type}{p.reason ? ` · ${p.reason}` : ""}</div>
                  </div>
                </div>
              ))
          }
        </div>
      ))}
    </div>
  );
};

const VenueSection = ({ venue }) => {
  if (!venue?.name) return null;
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      {venue.image && (
        <img src={venue.image} alt={venue.name} style={{ width: 180, height: 100, objectFit: "cover", borderRadius: 12, border: `1px solid ${T.border}`, flexShrink: 0 }} onError={e => e.currentTarget.style.display = "none"} />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        {[
          { label: "Stadium",  val: venue.name },
          { label: "City",     val: venue.city },
          { label: "Country",  val: venue.country },
          { label: "Capacity", val: venue.capacity?.toLocaleString() },
          { label: "Surface",  val: venue.surface },
        ].filter(r => r.val).map(({ label, val }) => (
          <div key={label} style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: T.muted, letterSpacing: "0.08em", minWidth: 60, textTransform: "uppercase" }}>{label}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const SeasonStatsSection = ({ homeStats, awayStats, header }) => {
  const rows = [
    { label: "Played",             hv: homeStats?.played,              av: awayStats?.played },
    { label: "Goals For (avg)",    hv: homeStats?.goals_for_avg,       av: awayStats?.goals_for_avg },
    { label: "Goals Against (avg)",hv: homeStats?.goals_against_avg,   av: awayStats?.goals_against_avg },
    { label: "Clean Sheets",       hv: homeStats?.clean_sheets,        av: awayStats?.clean_sheets },
    { label: "Penalty %",          hv: homeStats?.penalty_scored_pct,  av: awayStats?.penalty_scored_pct },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.home }}>{header?.home?.name}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.away }}>{header?.away?.name}</span>
      </div>
      {rows.filter(r => r.hv != null || r.av != null).map(({ label, hv, av }) => (
        <StatBar key={label} label={label} home={hv} away={av} />
      ))}
      {(homeStats?.form || awayStats?.form) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
          <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.08em", color: T.home }}>{homeStats?.form?.slice(-8)}</span>
          <span style={{ fontSize: 9, color: T.muted }}>Recent Form</span>
          <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.08em", color: T.away }}>{awayStats?.form?.slice(-8)}</span>
        </div>
      )}
    </div>
  );
};

const PredictionSection = ({ prediction }) => {
  if (!prediction || !Object.keys(prediction).length) return (
    <div style={{ padding: 20, textAlign: "center", color: T.muted, fontSize: 12 }}>No model prediction available</div>
  );
  const hp = Math.round((prediction.p_home_win || prediction.home_win_prob || 0) * 100);
  const dp = Math.round((prediction.p_draw     || prediction.draw_prob     || 0) * 100);
  const ap = Math.round((prediction.p_away_win || prediction.away_win_prob || 0) * 100);
  const markets = [
    { label: "Over 2.5", val: prediction.over_2_5 },
    { label: "Over 3.5", val: prediction.over_3_5 },
    { label: "BTTS",     val: prediction.btts },
    { label: "Home CS",  val: prediction.home_clean_sheet },
    { label: "Away CS",  val: prediction.away_clean_sheet },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {[{l:"Home Win",v:hp,c:T.home},{l:"Draw",v:dp,c:"rgba(255,255,255,0.4)"},{l:"Away Win",v:ap,c:T.away}].map(({ l, v, c }) => (
          <div key={l} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "14px 8px", borderRadius: 14,
            background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`,
          }}>
            <span style={{ fontSize: 9, color: T.muted }}>{l}</span>
            <span style={{ fontSize: 26, fontWeight: 800, color: c, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>{v}%</span>
            <div style={{ width: "100%", height: 3, borderRadius: 999, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
              <div style={{ width: `${v}%`, height: "100%", background: c, borderRadius: 999 }} />
            </div>
          </div>
        ))}
      </div>
      {prediction.most_likely_score && (
        <div style={{ textAlign: "center", padding: 12, background: "rgba(255,255,255,0.04)", borderRadius: 12, border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 9, color: T.muted, marginBottom: 4 }}>MOST LIKELY SCORE</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: T.text, fontFamily: "'JetBrains Mono',monospace" }}>{prediction.most_likely_score}</div>
        </div>
      )}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {markets.filter(m => m.val != null).map(({ label, val }) => {
          const v = Math.round(parseFloat(val) * 100);
          const hi = v >= 55;
          return (
            <div key={label} style={{
              flex: "1 1 80px", display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 8px", borderRadius: 10,
              background: hi ? `${T.accent}0c` : "rgba(255,255,255,0.03)", border: `1px solid ${hi ? T.accent + "30" : T.border}`,
            }}>
              <span style={{ fontSize: 8, color: T.muted, marginBottom: 4 }}>{label}</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: hi ? T.accent : T.text, fontFamily: "'JetBrains Mono',monospace" }}>{v}%</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {["Dixon-Coles", "Dynamic Elo", "xG Model", "Form Decay"].map(l => (
          <span key={l} style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.06em", padding: "3px 9px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, color: T.muted }}>{l}</span>
        ))}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════
export default function MatchIntelligencePage() {
  const { fixtureId } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useMatchIntelligence(fixtureId ? parseInt(fixtureId) : null);

  if (!fixtureId) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: T.muted, fontSize: 14 }}>No fixture ID provided</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'Inter',sans-serif" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 16px 80px" }}>
        {/* Nav */}
        <div style={{ padding: "16px 0 12px", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, fontSize: 11, fontWeight: 600, padding: "6px 12px", cursor: "pointer" }}>
            ← Back
          </button>
          <span style={{ fontSize: 11, color: T.muted }}>Match #{fixtureId}</span>
          <button onClick={refetch} style={{ marginLeft: "auto", background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, fontSize: 11, padding: "6px 12px", cursor: "pointer" }}>
            ↻ Refresh
          </button>
        </div>

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
            {[200, 180, 140, 140, 100].map((h, i) => (
              <div key={i} style={{ height: h, borderRadius: 16, border: `1px solid ${T.border}`, background: `linear-gradient(90deg,${T.panel} 25%,rgba(255,255,255,0.06) 50%,${T.panel} 75%)`, backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
            ))}
            <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
          </div>
        )}

        {error && !loading && (
          <div style={{ marginTop: 24, padding: 24, borderRadius: 16, background: "rgba(255,50,50,0.06)", border: "1px solid rgba(255,50,50,0.2)", color: T.red, fontSize: 13, textAlign: "center" }}>
            ⚠ {error}
            <button onClick={refetch} style={{ display: "block", margin: "12px auto 0", padding: "6px 16px", borderRadius: 8, background: "rgba(255,50,50,0.1)", border: "1px solid rgba(255,50,50,0.3)", color: T.red, cursor: "pointer", fontSize: 11 }}>Try again</button>
          </div>
        )}

        {data && !loading && !data.error && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <MatchHeader   header={data.header}     prediction={data.prediction} />
            <Section title="Match Events"         icon="⚽">
              <EventsTimeline  events={data.events}    homeId={data.header?.home?.id} />
            </Section>
            <Section title="Lineups"              icon="👕">
              <LineupsSection  lineups={data.lineups} />
            </Section>
            <Section title="Match Statistics"    icon="📊">
              <StatisticsSection statistics={data.statistics} header={data.header} />
            </Section>
            <Section title="Model Prediction"    icon="🤖">
              <PredictionSection prediction={data.prediction} />
            </Section>
            <Section title="Head to Head"        icon="⚔️"  defaultOpen={false}>
              <H2HSection      h2h={data.h2h}          header={data.header} />
            </Section>
            <Section title="Season Statistics"   icon="📈"  defaultOpen={false}>
              <SeasonStatsSection homeStats={data.home_season_stats} awayStats={data.away_season_stats} header={data.header} />
            </Section>
            <Section title="Injuries"            icon="🏥"  defaultOpen={false}>
              <InjuriesSection injuries={data.injuries}  header={data.header} />
            </Section>
            {data.venue?.name && (
              <Section title="Venue"             icon="🏟️" defaultOpen={false}>
                <VenueSection  venue={data.venue} />
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}