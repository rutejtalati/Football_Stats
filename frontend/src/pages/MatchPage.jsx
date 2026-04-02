import { useEffect, useState } from "react";
import Pitch from "../components/Pitch";
import Timeline from "../components/Timeline";
import StatsBar from "../components/StatsBar";
import { API_BASE as API } from "../api/api";

export default function MatchPage({ fixtureId }) {

  const [match,setMatch]=useState(null)

  useEffect(()=>{

    fetch(`${API}/api/live/fixture/${fixtureId}`)
      .then(r=>r.json())
      .then(data=>setMatch(data.response?.[0] ?? null))
      .catch(()=>setMatch(null))

  },[fixtureId])

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