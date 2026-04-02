export default function MatchHeader({ match }) {
  const homeGoals = match?.goals?.home;
  const awayGoals = match?.goals?.away;
  const isPreMatch = homeGoals == null && awayGoals == null;

  return (
    <div className="match-header">
      <h1 className="page-title">
        {match.teams.home.name} vs {match.teams.away.name}
      </h1>

      <div className="score-line">
        {isPreMatch
          ? "vs"
          : `${homeGoals ?? 0} - ${awayGoals ?? 0}`
        }
      </div>

      <div className="match-meta">
        <div>Status: {match.fixture.status.long}</div>
        <div>Venue: {match.fixture.venue?.name || "Unknown venue"}</div>
      </div>
    </div>
  );
}