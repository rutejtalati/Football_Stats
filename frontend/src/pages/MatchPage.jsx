import { useEffect, useState } from "react";
import Pitch from "../components/Pitch";
import Timeline from "../components/Timeline";
import StatsBar from "../components/StatsBar";

export default function MatchPage({ fixtureId }) {

  const [match,setMatch]=useState(null)
  const API="http://127.0.0.1:8001"

  useEffect(()=>{

    fetch(`${API}/api/live/fixture/${fixtureId}`)
      .then(r=>r.json())
      .then(data=>setMatch(data.response[0]))

  },[])

  if(!match) return <div>Loading match...</div>

  return(

    <div className="match-page">

      <h1>
        {match.teams.home.name} vs {match.teams.away.name}
      </h1>

      <h2>
        {match.goals.home} - {match.goals.away}
      </h2>

      <StatsBar fixtureId={fixtureId}/>

      <Pitch fixtureId={fixtureId}/>

      <Timeline fixtureId={fixtureId}/>

    </div>
  )
}