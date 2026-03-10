// components/PredictionTable.jsx
import PredictionCard from "./PredictionCard";

export default function PredictionTable({ predictions = [] }) {
  if (predictions.length === 0) {
    return (
      <div style={{ padding:"32px", textAlign:"center", color:"#2a4a6a", fontSize:14 }}>
        No predictions available — check backend is running and API key is set
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8, padding:"4px 0" }}>
      {predictions.map((match, i) => (
        <PredictionCard
          key={(match.home_team||"")+"-"+(match.away_team||"")+"-"+i}
          match={match}
        />
      ))}
    </div>
  );
}