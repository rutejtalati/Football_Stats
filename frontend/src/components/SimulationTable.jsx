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
                <td>{r.avg_position  != null ? Number(r.avg_position).toFixed(1)          : "—"}</td>
                <td>{r.avg_points    != null ? Number(r.avg_points).toFixed(1)             : "—"}</td>
                <td>{r.title_prob    != null ? (Number(r.title_prob)    * 100).toFixed(1)  : "—"}</td>
                <td>{r.top4_prob     != null ? (Number(r.top4_prob)     * 100).toFixed(1)  : "—"}</td>
                <td>{r.top5_prob     != null ? (Number(r.top5_prob)     * 100).toFixed(1)  : "—"}</td>
                <td>{r.top_half_prob != null ? (Number(r.top_half_prob) * 100).toFixed(1)  : "—"}</td>
                <td>{r.relegation_prob != null ? (Number(r.relegation_prob) * 100).toFixed(1) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}