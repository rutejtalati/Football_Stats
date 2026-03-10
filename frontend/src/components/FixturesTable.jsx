export default function FixturesTable({ fixtures = [] }) {
  return (
    <div className="panel">
      <table className="data-table">
        <thead>
          <tr>
            <th>Fixture</th>
            <th>Date</th>
            <th>Venue</th>
          </tr>
        </thead>
        <tbody>
          {fixtures.map((match) => (
            <tr key={match.fixture.id}>
              <td>
                {match.teams.home.name} vs {match.teams.away.name}
              </td>
              <td>{new Date(match.fixture.date).toLocaleDateString()}</td>
              <td>{match.fixture.venue?.name || "TBC"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}