import PlayerCard from "./PlayerCard";

function getBenchKey(player, index) {
  return player?.player_id || player?.id || `bench-${index}`;
}

export default function BenchRow({
  bench = [],
  onDragStartPlayer,
  onDropOnBench,
  dragItem,
  captain,
  viceCaptain,
}) {
  const filteredBench = bench.filter(Boolean);

  const topProjectedId =
    [...filteredBench]
      .sort((a, b) => Number(b.projected_points || 0) - Number(a.projected_points || 0))[0]
      ?.player_id || null;

  return (
    <div className="bench-side-shell bench-tactical-shell">
      <div className="premium-bench-header">
        <div className="premium-bench-title">Bench</div>
        <div className="premium-bench-subtitle">Drag to swap with starters</div>
      </div>

      <div className="bench-tactical-board">
        <div className="bench-tactical-glow" />
        <div className="bench-tactical-lines bench-tactical-outline" />
        <div className="bench-tactical-lines bench-tactical-seats" />
        <div className="bench-tactical-lines bench-tactical-front-line" />

        <div className="bench-tactical-grid">
          {filteredBench.map((p, i) => {
            const targetMeta = { area: "bench", index: i };
            const isDropActive =
              dragItem && !(dragItem.area === "bench" && dragItem.index === i);

            return (
              <div key={getBenchKey(p, i)} className="bench-card-slot">
                <PlayerCard
                  player={p}
                  size="bench"
                  draggable
                  onDragStart={(e) => onDragStartPlayer?.(e, targetMeta, p)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    onDropOnBench?.(targetMeta, p);
                  }}
                  dropActive={Boolean(isDropActive)}
                  isTopProjected={(p.player_id || p.id) === topProjectedId}
                  isCaptain={(captain?.player_id || captain?.id) === (p?.player_id || p?.id)}
                  isViceCaptain={
                    (viceCaptain?.player_id || viceCaptain?.id) === (p?.player_id || p?.id)
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}