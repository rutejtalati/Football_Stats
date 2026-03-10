export default function MatchHeader({ match }) {
  return (
    <div className="match-header">
      <h1 className="page-title">
        {match.teams.home.name} vs {match.teams.away.name}
      </h1>

      <div className="score-line">
        {match.goals.home} - {match.goals.away}
      </div>

      <div className="match-meta">
        <div>Status: {match.fixture.status.long}</div>
        <div>Venue: {match.fixture.venue?.name || "Unknown venue"}</div>
      </div>
    </div>
  );
}