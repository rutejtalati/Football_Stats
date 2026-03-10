import { useEffect, useState } from "react";
import { getStats } from "../api/api";

export default function StatsPage({ fixtureId }) {

  const [stats,setStats] = useState([])

  useEffect(()=>{

    getStats(fixtureId)
      .then(data => setStats(data.response))

  },[fixtureId])

  return (
    <div>

      <h1>Match Statistics</h1>

      {stats.map(team => (

        <div key={team.team.id}>

          <h3>{team.team.name}</h3>

          {team.statistics.map(s => (
            <p key={s.type}>
              {s.type} : {s.value}
            </p>
          ))}

        </div>

      ))}

    </div>
  );
}