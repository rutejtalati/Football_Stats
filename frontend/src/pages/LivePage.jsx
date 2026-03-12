// ═════════════════════════════════════════════════════
// StatinSite Live Hub
// Advanced version
// ═════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND = "https://football-stats-lw4b.onrender.com";


// ─────────────────────────────────────────────
// League config
// ─────────────────────────────────────────────

const LEAGUES = {
  epl: { label: "Premier League", color: "#60a5fa" },
  laliga: { label: "La Liga", color: "#f97316" },
  seriea: { label: "Serie A", color: "#34d399" },
  bundesliga: { label: "Bundesliga", color: "#f59e0b" },
  ligue1: { label: "Ligue 1", color: "#a78bfa" }
};


const LEAGUE_FILTER = ["all","epl","laliga","seriea","bundesliga","ligue1"];


// ─────────────────────────────────────────────
// Normalize league ids
// ─────────────────────────────────────────────

function normalizeLeague(l) {

  if (!l) return "";

  const v = String(l).toLowerCase();

  if (v.includes("premier") || v === "39") return "epl";
  if (v.includes("liga") && !v.includes("bundes")) return "laliga";
  if (v.includes("serie") || v === "135") return "seriea";
  if (v.includes("bundes")) return "bundesliga";
  if (v.includes("ligue")) return "ligue1";

  return v;
}


// ─────────────────────────────────────────────
// Momentum bar
// ─────────────────────────────────────────────

function MomentumBar({ value }) {

  const pct = Math.max(0, Math.min(100, value));

  return (
    <div style={{
      width: "100%",
      height: 6,
      background: "rgba(255,255,255,0.06)",
      borderRadius: 999,
      overflow: "hidden"
    }}>
      <div style={{
        width: `${pct}%`,
        height: "100%",
        background: "linear-gradient(90deg,#34d399,#60a5fa)",
        transition: "width 0.6s ease"
      }} />
    </div>
  );
}


// ─────────────────────────────────────────────
// Probability bar
// ─────────────────────────────────────────────

function ProbabilityBar({ home, draw, away }) {

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      fontSize: 10,
      fontWeight: 700,
      color: "#9fb4d6",
      marginTop: 8
    }}>
      <span>{home}%</span>
      <span style={{textAlign:"center"}}>{draw}%</span>
      <span style={{textAlign:"right"}}>{away}%</span>
    </div>
  );
}


// ─────────────────────────────────────────────
// Team display
// ─────────────────────────────────────────────

function Team({ logo, name }) {

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8
    }}>

      {logo && (
        <img
          src={logo}
          style={{width:24,height:24}}
          onError={e=>e.currentTarget.style.display="none"}
        />
      )}

      <span style={{
        fontSize: 12,
        fontWeight: 700,
        color: "#c8d8f0"
      }}>
        {name}
      </span>

    </div>
  );
}


// ─────────────────────────────────────────────
// Live Match Card
// ─────────────────────────────────────────────

function MatchCard({ fixture }) {

  const navigate = useNavigate();

  const league = LEAGUES[fixture.league];

  return (

    <div
      onClick={()=>navigate(`/match/${fixture.fixture_id}`)}

      style={{
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.07)",
        background: "linear-gradient(160deg,#0b1220,#060a12)",
        cursor: "pointer",
        transition: "transform 0.18s, box-shadow 0.18s"
      }}
    >

      {/* league header */}

      <div style={{
        display:"flex",
        justifyContent:"space-between",
        marginBottom:10
      }}>

        <span style={{
          fontSize:9,
          letterSpacing:"0.1em",
          fontWeight:900,
          color:league?.color
        }}>
          {league?.label}
        </span>

        {fixture.minute && (
          <span style={{
            fontSize:10,
            color:"#ff5252",
            fontWeight:800
          }}>
            LIVE {fixture.minute}'
          </span>
        )}

      </div>


      {/* teams */}

      <div style={{
        display:"flex",
        justifyContent:"space-between",
        alignItems:"center"
      }}>

        <Team
          logo={fixture.home_logo}
          name={fixture.home_team}
        />

        <span style={{
          fontSize:20,
          fontWeight:900,
          color:"#f0f6ff"
        }}>
          {fixture.home_score} – {fixture.away_score}
        </span>

        <Team
          logo={fixture.away_logo}
          name={fixture.away_team}
        />

      </div>


      {/* xG */}

      {fixture.xg_home && (

        <div style={{
          fontSize:10,
          color:"#9fb4d6",
          marginTop:10
        }}>
          xG {fixture.xg_home} – {fixture.xg_away}
        </div>

      )}


      {/* momentum */}

      {fixture.momentum && (

        <div style={{marginTop:8}}>
          <MomentumBar value={fixture.momentum}/>
        </div>

      )}


      {/* probability */}

      {fixture.prob_home && (

        <ProbabilityBar
          home={fixture.prob_home}
          draw={fixture.prob_draw}
          away={fixture.prob_away}
        />

      )}

    </div>
  );
}



// ─────────────────────────────────────────────
// Main Live Page
// ─────────────────────────────────────────────

export default function LivePage() {

  const [chips,setChips] = useState([]);
  const [loading,setLoading] = useState(true);
  const [league,setLeague] = useState("all");


  const fetchData = () => {

    fetch(`${BACKEND}/api/live/summary`)
      .then(r=>r.json())
      .then(d=>{

        setChips(d.chips || []);
        setLoading(false);

      });
  };


  useEffect(()=>{

    fetchData();

    const interval = setInterval(fetchData,20000);

    return ()=>clearInterval(interval);

  },[]);



  const fixtures = useMemo(()=>{

    return chips.map(c=>({

      fixture_id:c.fixture_id,
      league:normalizeLeague(c.league),

      home_team:c.home_team,
      away_team:c.away_team,

      home_logo:c.home_logo,
      away_logo:c.away_logo,

      home_score:c.home_score,
      away_score:c.away_score,

      minute:c.minute,

      xg_home:c.xg_home,
      xg_away:c.xg_away,

      momentum:c.momentum,

      prob_home:c.prob_home,
      prob_draw:c.prob_draw,
      prob_away:c.prob_away

    }));

  },[chips]);



  const filtered = fixtures.filter(f=>{

    if(league==="all") return true;

    return f.league === league;

  });



  return (

    <div style={{
      background:"#060a12",
      minHeight:"100vh",
      padding:"30px"
    }}>

      <div style={{
        maxWidth:1100,
        margin:"0 auto"
      }}>

        {/* title */}

        <h1 style={{
          fontSize:28,
          fontWeight:900,
          color:"#f0f6ff",
          marginBottom:20
        }}>
          Live Centre
        </h1>


        {/* league filters */}

        <div style={{
          display:"flex",
          gap:8,
          marginBottom:30
        }}>

          {LEAGUE_FILTER.map(l=>{

            return(

              <button
                key={l}
                onClick={()=>setLeague(l)}

                style={{
                  padding:"6px 12px",
                  borderRadius:999,
                  border:"1px solid rgba(255,255,255,0.08)",
                  background: league===l
                    ? "rgba(96,165,250,0.1)"
                    : "rgba(255,255,255,0.03)",
                  color: league===l
                    ? "#60a5fa"
                    : "rgba(255,255,255,0.4)",
                  cursor:"pointer",
                  fontSize:11
                }}
              >

                {l==="all" ? "All" : LEAGUES[l]?.label}

              </button>

            );

          })}

        </div>


        {/* matches */}

        {loading ? (

          <div style={{color:"#8aa6d8"}}>Loading matches…</div>

        ) : (

          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",
            gap:14
          }}>

            {filtered.map(f=>(
              <MatchCard
                key={f.fixture_id}
                fixture={f}
              />
            ))}

          </div>

        )}

      </div>

    </div>
  );
}