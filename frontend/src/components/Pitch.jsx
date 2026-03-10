import PlayerCard from "./PlayerCard";

export default function PitchView({ lineup, captain, viceCaptain }) {

  if (!lineup) return null;

  return (
    <div className="pitch-container">

      <div className="pitch-row">
        {lineup.gk && (
          <PlayerCard
            key={`gk-${lineup.gk.id}`}
            player={lineup.gk}
            isCaptain={captain?.id === lineup.gk?.id}
            isViceCaptain={viceCaptain?.id === lineup.gk?.id}
          />
        )}
      </div>

      <div className="pitch-row">
        {lineup.defenders.map((p, i) => (
          <PlayerCard
            key={`def-${p.id}-${i}`}
            player={p}
            isCaptain={captain?.id === p.id}
            isViceCaptain={viceCaptain?.id === p.id}
          />
        ))}
      </div>

      <div className="pitch-row">
        {lineup.midfielders.map((p, i) => (
          <PlayerCard
            key={`mid-${p.id}-${i}`}
            player={p}
            isCaptain={captain?.id === p.id}
            isViceCaptain={viceCaptain?.id === p.id}
          />
        ))}
      </div>

      <div className="pitch-row">
        {lineup.forwards.map((p, i) => (
          <PlayerCard
            key={`fwd-${p.id}-${i}`}
            player={p}
            isCaptain={captain?.id === p.id}
            isViceCaptain={viceCaptain?.id === p.id}
          />
        ))}
      </div>

    </div>
  );
}