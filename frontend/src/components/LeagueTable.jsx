export default function LeagueTable({ table }) {

  return (
    <div className="league-table">

      <h2>League Table</h2>

      <table>

        <thead>
          <tr>
            <th>Pos</th>
            <th>Team</th>
            <th>Pld</th>
            <th>Pts</th>
          </tr>
        </thead>

        <tbody>

          {table.map(team => (
            <tr key={team.team.id}>

              <td>{team.rank}</td>
              <td>{team.team.name}</td>
              <td>{team.all.played}</td>
              <td>{team.points}</td>

            </tr>
          ))}

        </tbody>

      </table>

    </div>
  );
}