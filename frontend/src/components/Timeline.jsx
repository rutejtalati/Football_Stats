import { useEffect,useState } from "react"

export default function Timeline({fixtureId}){

  const [events,setEvents]=useState([])
  const API="http://127.0.0.1:8001"

  useEffect(()=>{

    fetch(`${API}/api/events/${fixtureId}`)
      .then(r=>r.json())
      .then(data=>setEvents(data.response))

  },[])

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