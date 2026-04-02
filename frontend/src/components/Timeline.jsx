import { useEffect, useState } from "react"
import { API_BASE as API } from "../api/api"

export default function Timeline({ fixtureId }){

  const [events, setEvents] = useState([])
  const [error,  setError]  = useState(null)

  useEffect(()=>{

    fetch(`${API}/api/events/${fixtureId}`)
      .then(r => r.json())
      .then(data => setEvents(data?.response || []))
      .catch(() => setError("Failed to load events"))

  },[fixtureId])

  if (error) return <div className="timeline" style={{ color: "#ff4d6d", padding: 12 }}>{error}</div>

  return(

    <div className="timeline">

      {events.map(e=>(
        <div key={e.time.elapsed}>

          {e.time.elapsed}' {e.type} - {e.player.name}

        </div>
      ))}

    </div>

  )

}