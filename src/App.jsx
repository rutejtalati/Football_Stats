import { useEffect, useState } from "react";

function App() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const API = "https://football-stats-lw4b.onrender.com";

  useEffect(() => {
    fetch(`${API}/api/league/epl/predictions`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("API request failed");
        }
        return res.json();
      })
      .then((data) => {
        console.log("API DATA:", data);
        setMatches(data.predictions);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "40px", color: "white" }}>
        Loading predictions...
      </div>
    );
  }

  return (
    <div style={{ padding: "40px", color: "white" }}>
      <h1>EPL Match Predictions</h1>

      {matches.map((m, i) => (
        <div
          key={i}
          style={{
            background: "#1e293b",
            padding: "20px",
            marginBottom: "20px",
            borderRadius: "8px",
          }}
        >
          <h3>
            {m.home_team} vs {m.away_team}
          </h3>

          <p>
            Home Win: {(m.p_home_win * 100).toFixed(1)}% | Draw:{" "}
            {(m.p_draw * 100).toFixed(1)}% | Away Win:{" "}
            {(m.p_away_win * 100).toFixed(1)}%
          </p>

          <p>Most Likely Score: {m.most_likely_score}</p>

          <p>
            xG: {m.xg_home} - {m.xg_away}
          </p>
        </div>
      ))}
    </div>
  );
}

export default App;