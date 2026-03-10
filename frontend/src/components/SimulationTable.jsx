export default function SimulationTable({ rows = [] }) {
  return (
    <div className="panel">
      <div className="table-scroll-x">
        <table className="data-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>Avg Position</th>
              <th>Avg Points</th>
              <th>Title %</th>
              <th>Top 4 %</th>
              <th>Top 5 %</th>
              <th>Top Half %</th>
              <th>Relegation %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.team}>
                <td>{r.team}</td>
                <td>{r.avg_position}</td>
                <td>{r.avg_points}</td>
                <td>{r.title_prob}</td>
                <td>{r.top4_prob}</td>
                <td>{r.top5_prob}</td>
                <td>{r.top_half_prob}</td>
                <td>{r.relegation_prob}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}