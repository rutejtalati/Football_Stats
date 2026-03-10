import PlayerCard from "./PlayerCard";

/* ─────────────────────────────────────────────────────
   X positions (% from left) for each formation.
   Kept between 10%–90% so no card clips the pitch edge.
───────────────────────────────────────────────────── */
/* ── Formation X positions (% from left edge)
   Design principles:
   - GK always centred at 50%
   - 3 defenders: spread wide (18/50/82) leaving flanks for fullbacks in 4+
   - 4 defenders: standard full-width (11/36/64/89)
   - 5 defenders: tight cluster across full width (9/26/50/74/91)
   - Midfielders: central 3 compact (26/50/74); 4-5 use full width
   - Wingers in 3-man attacks: hug touchlines (12/50/88)
   - 2 strikers: pulled closer to centre (37/63) — "twin striker" look
   - 1 striker: dead centre (50)
──────────────────────────────────────────────────── */
const FORMATION_X_MAP = {
  "3-4-3": {
    GK:  [50],
    DEF: [18, 50, 82],
    MID: [11, 37, 63, 89],
    FWD: [12, 50, 88],
  },
  "3-5-2": {
    GK:  [50],
    DEF: [18, 50, 82],
    MID: [9, 28, 50, 72, 91],
    FWD: [34, 66],
  },
  "4-4-2": {
    GK:  [50],
    DEF: [11, 36, 64, 89],
    MID: [11, 36, 64, 89],
    FWD: [34, 66],
  },
  "4-3-3": {
    GK:  [50],
    DEF: [11, 36, 64, 89],
    MID: [25, 50, 75],
    FWD: [12, 50, 88],
  },
  "4-5-1": {
    GK:  [50],
    DEF: [11, 36, 64, 89],
    MID: [9, 27, 50, 73, 91],
    FWD: [50],
  },
  "5-3-2": {
    GK:  [50],
    DEF: [9, 26, 50, 74, 91],
    MID: [25, 50, 75],
    FWD: [34, 66],
  },
  "5-4-1": {
    GK:  [50],
    DEF: [9, 26, 50, 74, 91],
    MID: [13, 37, 63, 87],
    FWD: [50],
  },
  "3-4-2-1": {
    GK:  [50],
    DEF: [18, 50, 82],
    MID: [11, 37, 63, 89],
    FWD: [50],
  },
};

/* ─────────────────────────────────────────────────────
   Y positions (% from top of pitch).
   Pitch reads top = attack, bottom = defence.
   GK at 83%, DEF at 65%, MID at 42%, FWD at 18%
───────────────────────────────────────────────────── */
// Y positions — well-separated rows, GK pressed to goal line
// Pitch is ~650px min-height; rows must not overlap (card ~126px)
// 650 * row_pct = anchor centre; anchors transform: translate(-50%, -50%)
// Row separation: FWD=6%, MID=28%, DEF=52%, GK=75% → gaps: 22%, 24%, 23%
// At 650px: 22% = 143px — safely more than card height
const VERTICAL_Y_MAP = {
  FWD: "9%",
  MID: "31%",
  DEF: "56%",
  GK:  "78%",
};

/* ─── helpers ─── */
function getPlayerKey(player, prefix, index) {
  return player?.player_id || player?.id || `${prefix}-${index}`;
}

function inferFormationName(lineup) {
  const def = (lineup?.defenders   || []).length;
  const mid = (lineup?.midfielders || []).length;
  const fwd = (lineup?.forwards    || []).length;
  return `${def}-${mid}-${fwd}`;
}

function flattenStarters(lineup) {
  return [
    lineup?.gk,
    ...(lineup?.defenders   || []),
    ...(lineup?.midfielders || []),
    ...(lineup?.forwards    || []),
  ].filter(Boolean);
}

function buildCaptaincyModel(lineup) {
  return flattenStarters(lineup)
    .sort((a, b) => Number(b.projected_points || 0) - Number(a.projected_points || 0))
    .slice(0, 4);
}

function buildDifferentials(lineup) {
  return flattenStarters(lineup)
    .sort((a, b) => {
      const aO = Number(a.selected_by_pct || a.ownership_pct || 0);
      const bO = Number(b.selected_by_pct || b.ownership_pct || 0);
      return (Number(b.projected_points || 0) - bO * 0.12)
           - (Number(a.projected_points || 0) - aO * 0.12);
    })
    .slice(0, 4);
}

function buildMinutesRisk(lineup) {
  return flattenStarters(lineup)
    .map(p => ({ ...p, riskValue: Number(p.appearance_prob || p.prob_appear || 0) }))
    .sort((a, b) => a.riskValue - b.riskValue)
    .slice(0, 4);
}

function buildValueIndex(lineup) {
  return flattenStarters(lineup)
    .map(p => ({
      ...p,
      valueIndex: Number(p.cost || 1) > 0
        ? Number(p.projected_points || 0) / Number(p.cost || 1) : 0,
    }))
    .sort((a, b) => b.valueIndex - a.valueIndex)
    .slice(0, 4);
}

/* ─── Insight panel list ─── */
function InsightList({ title, items, valueFormatter, accentClass = "" }) {
  return (
    <div className={`pitch-insight-card ${accentClass}`}>
      <div className="pitch-insight-card-title">{title}</div>
      <div className="pitch-insight-list">
        {items.map((p, i) => (
          <div
            key={`${title}-${p.player_id || p.id || i}`}
            className={`pitch-insight-row ${i === 0 ? "pitch-insight-row-top" : ""}`}
          >
            <span className="pitch-insight-name">{i + 1}. {p.name}</span>
            <span className="pitch-insight-value">{valueFormatter(p)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── render one starter on the pitch ─── */
function StarterAnchor({
  player, x, y, prefix, index,
  captain, viceCaptain, topProjectedId,
  onDragStartPlayer, onDropOnStarter, dragItem, onPlayerClick,
}) {
  const targetMeta = { area:"starter", group:prefix, index };
  const isDropActive = dragItem &&
    !(dragItem.area==="starter" && dragItem.group===prefix && dragItem.index===index);

  return (
    <div
      key={getPlayerKey(player, prefix, index)}
      className="vertical-pitch-player-anchor"
      style={{ left:`${x}%`, top:y }}
      onClick={() => onPlayerClick?.(player)}
    >
      <PlayerCard
        player={player}
        draggable
        onDragStart={e => onDragStartPlayer?.(e, targetMeta, player)}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); onDropOnStarter?.(targetMeta, player); }}
        dropActive={Boolean(isDropActive)}
        isTopProjected={(player.player_id||player.id) === topProjectedId}
        isCaptain={(captain?.player_id||captain?.id) === (player?.player_id||player?.id)}
        isViceCaptain={(viceCaptain?.player_id||viceCaptain?.id) === (player?.player_id||player?.id)}
      />
    </div>
  );
}

/* ─── render one bench card ─── */
function BenchSlotCard({
  player, slotLabel, index,
  captain, viceCaptain,
  onDragStartPlayer, onDropOnBench, dragItem,
}) {
  const targetMeta = { area:"bench", index };
  const isDropActive = dragItem && !(dragItem.area==="bench" && dragItem.index===index);

  return (
    <div key={getPlayerKey(player,"bench",index)} className="bench-tray-slot">
      <div className="bench-tray-slot-label">{slotLabel}</div>
      <PlayerCard
        player={player}
        size="bench"
        draggable
        onDragStart={e => onDragStartPlayer?.(e, targetMeta, player)}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); onDropOnBench?.(targetMeta, player); }}
        dropActive={Boolean(isDropActive)}
        isCaptain={(captain?.player_id||captain?.id) === (player?.player_id||player?.id)}
        isViceCaptain={(viceCaptain?.player_id||viceCaptain?.id) === (player?.player_id||player?.id)}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════
   MAIN EXPORT
   ════════════════════════════════════════════════════ */
export default function PitchView({
  lineup,
  bench = [],
  captain,
  viceCaptain,
  onDragStartPlayer,
  onDropOnStarter,
  onDropOnBench,
  dragItem,
  /* when used inside BestTeamPage the insights panel is rendered
     externally, so pass hideInsights=true to suppress it here */
  hideInsights = false,
  /* BestTeamPage renders its own bench tray — suppress PitchView's */
  hideBench = false,
  /* optional click handler — navigates to Player Insight page */
  onPlayerClick,
}) {
  if (!lineup) return null;

  const formationName = inferFormationName(lineup);
  const xMap = FORMATION_X_MAP[formationName] || FORMATION_X_MAP["4-4-2"];
  const starters = flattenStarters(lineup);

  const topProjectedId =
    [...starters].sort((a,b) => Number(b.projected_points||0) - Number(a.projected_points||0))[0]
      ?.player_id ?? starters[0]?.id;

  const captaincyModel = buildCaptaincyModel(lineup);
  const differentials  = buildDifferentials(lineup);
  const minutesRisk    = buildMinutesRisk(lineup);
  const valueIndex     = buildValueIndex(lineup);

  const benchSlots = [
    { label:"GK",   player: bench[0] || null },
    { label:"B1",   player: bench[1] || null },
    { label:"B2",   player: bench[2] || null },
    { label:"B3",   player: bench[3] || null },
  ];

  const sharedProps = { captain, viceCaptain, topProjectedId, onDragStartPlayer, onDropOnStarter, dragItem, onPlayerClick };

  return (
    <div className={`pitch-view-root ${hideInsights ? "" : "pitch-view-with-insights"}`}>

      {/* ── Pitch ── */}
      <div className="pitch-view-pitch-col">
        <div className="vertical-pitch-shell">
          <div className="vertical-pitch">

            {/* Field markings */}
            <div className="vertical-pitch-glow" />
            <div className="vertical-pitch-marking vertical-pitch-outline" />
            <div className="vertical-pitch-marking vertical-pitch-half-line" />
            <div className="vertical-pitch-marking vertical-pitch-center-circle" />
            <div className="vertical-pitch-marking vertical-pitch-box-top" />
            <div className="vertical-pitch-marking vertical-pitch-box-bottom" />
            <div className="vertical-pitch-marking vertical-pitch-small-box-top" />
            <div className="vertical-pitch-marking vertical-pitch-small-box-bottom" />
            <div className="vertical-pitch-marking vertical-pitch-spot-top" />
            <div className="vertical-pitch-marking vertical-pitch-spot-bottom" />

            {/* ── Goalposts (top = opponent goal, bottom = our goal) ── */}
            <svg className="vp-goalpost vp-goalpost-top" viewBox="0 0 100 18" preserveAspectRatio="none">
              <rect x="5" y="2" width="90" height="14" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeLinejoin="round"/>
              <rect x="5" y="2" width="90" height="5" fill="rgba(255,255,255,0.07)" rx="1"/>
            </svg>
            <svg className="vp-goalpost vp-goalpost-bottom" viewBox="0 0 100 18" preserveAspectRatio="none">
              <rect x="5" y="2" width="90" height="14" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeLinejoin="round"/>
              <rect x="5" y="9" width="90" height="7" fill="rgba(255,255,255,0.07)" rx="1"/>
            </svg>

            {/* GK */}
            {lineup.gk && (
              <StarterAnchor player={lineup.gk} x={xMap.GK[0]} y={VERTICAL_Y_MAP.GK}
                prefix="gk" index={0} {...sharedProps} />
            )}

            {/* DEF */}
            {(lineup.defenders||[]).map((p,i) => (
              <StarterAnchor key={getPlayerKey(p,"def",i)} player={p}
                x={xMap.DEF[i]??50} y={VERTICAL_Y_MAP.DEF}
                prefix="defenders" index={i} {...sharedProps} />
            ))}

            {/* MID */}
            {(lineup.midfielders||[]).map((p,i) => (
              <StarterAnchor key={getPlayerKey(p,"mid",i)} player={p}
                x={xMap.MID[i]??50} y={VERTICAL_Y_MAP.MID}
                prefix="midfielders" index={i} {...sharedProps} />
            ))}

            {/* FWD */}
            {(lineup.forwards||[]).map((p,i) => (
              <StarterAnchor key={getPlayerKey(p,"fwd",i)} player={p}
                x={xMap.FWD[i]??50} y={VERTICAL_Y_MAP.FWD}
                prefix="forwards" index={i} {...sharedProps} />
            ))}
          </div>
        </div>

        {/* ── Bench tray (below pitch, grass look) ── */}
        {!hideBench && <div className="bench-tray-shell">
          <div className="bench-tray-header">
            <div className="bench-tray-title">Bench</div>
            <div className="bench-tray-subtitle">Drag to swap with starters</div>
          </div>
          <div className="bench-tray-board">
            {benchSlots.map((slot, i) => (
              <div key={slot.label} className="bench-tray-board-item">
                {slot.player ? (
                  <BenchSlotCard
                    player={slot.player}
                    slotLabel={slot.label}
                    index={i}
                    captain={captain}
                    viceCaptain={viceCaptain}
                    onDragStartPlayer={onDragStartPlayer}
                    onDropOnBench={onDropOnBench}
                    dragItem={dragItem}
                  />
                ) : (
                  <div className="bench-tray-slot bench-tray-slot-empty">
                    <div className="bench-tray-slot-label">{slot.label}</div>
                    <div className="bench-empty-card">Empty</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>}
      </div>

      {/* ── Insights panel (hidden when BestTeamPage handles it) ── */}
      {!hideInsights && (
        <div className="pitch-insights-panel">
          <InsightList
            title="Captaincy Model" accentClass="pitch-insight-card-captaincy"
            items={captaincyModel}
            valueFormatter={p => Number(p.projected_points||0).toFixed(1)}
          />
          <InsightList
            title="Differentials" accentClass="pitch-insight-card-differentials"
            items={differentials}
            valueFormatter={p => Number(p.projected_points||0).toFixed(1)}
          />
          <InsightList
            title="Minutes Risk" accentClass="pitch-insight-card-risk"
            items={minutesRisk}
            valueFormatter={p => Number(p.appearance_prob||p.prob_appear||0).toFixed(2)}
          />
          <InsightList
            title="Value Index" accentClass="pitch-insight-card-value"
            items={valueIndex}
            valueFormatter={p => (
              Number(p.cost||1) > 0
                ? Number(p.projected_points||0) / Number(p.cost||1) : 0
            ).toFixed(2)}
          />
        </div>
      )}
    </div>
  );
}