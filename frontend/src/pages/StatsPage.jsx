import { useEffect, useState } from "react";
import { getStats } from "../api/api";

export default function StatsPage({ fixtureId }) {

  const [stats,setStats] = useState([])

  useEffect(()=>{

    getStats(fixtureId)
      .then(data => setStats(data.response))

  },[fixtureId])

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#ffffff", fontFamily: "'Inter',sans-serif", padding: "24px" }}>

      <h1 style={{ fontSize: 24, fontWeight: 900, color: "#ffffff", marginBottom: 24 }}>Match Statistics</h1>

      {stats.map(team => (

        <div key={team.team.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px", marginBottom: 16 }}>

          <h3 style={{ fontSize: 16, fontWeight: 800, color: "#ffffff", marginBottom: 14 }}>{team.team.name}</h3>

          {team.statistics.map(s => (
            <div key={s.type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>
              <span style={{ color: "rgba(255,255,255,0.5)" }}>{s.type}</span>
              <span style={{ color: "#ffffff", fontWeight: 700 }}>{s.value}</span>
            </div>
          ))}

        </div>

      ))}

    </div>
  );
}