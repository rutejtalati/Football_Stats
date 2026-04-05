import { useEffect, useState } from "react";
import { getSeasonSimulation } from "../api/api";

export default function SeasonSimulator() {
  const [table, setTable] = useState({});

  useEffect(() => {
    getSeasonSimulation()
      .then((data) => setTable(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="page-shell" style={{ minHeight: "100vh", background: "#000000" }}>
      <h1 className="page-title">Season Simulation</h1>

      <div className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>Avg Position</th>
              <th>Title %</th>
              <th>Top 4 %</th>
              <th>Relegation %</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(table).map(([team, data]) => (
              <tr key={team}>
                <td>{team}</td>
                <td>{data.avg_position}</td>
                <td>{(data.title_prob * 100).toFixed(1)}</td>
                <td>{(data.top4_prob * 100).toFixed(1)}</td>
                <td>{(data.relegation_prob * 100).toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}