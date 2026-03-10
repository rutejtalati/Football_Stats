const FORMATIONS = [
  { def:3, mid:4, fwd:3 },
  { def:3, mid:5, fwd:2 },
  { def:4, mid:4, fwd:2 },
  { def:4, mid:3, fwd:3 },
  { def:5, mid:3, fwd:2 }
];

function sortByPoints(players){
  return [...players].sort((a,b)=>b.projected_points-a.projected_points);
}

export function calculateBestXI(players){

  const gk = sortByPoints(players.filter(p=>p.position==="GK"));
  const def = sortByPoints(players.filter(p=>p.position==="DEF"));
  const mid = sortByPoints(players.filter(p=>p.position==="MID"));
  const fwd = sortByPoints(players.filter(p=>p.position==="FWD"));

  let best = null;

  FORMATIONS.forEach(f => {

    const lineup = {
      gk: gk[0],
      defenders: def.slice(0,f.def),
      midfielders: mid.slice(0,f.mid),
      forwards: fwd.slice(0,f.fwd)
    };

    const total =
      lineup.gk.projected_points +
      lineup.defenders.reduce((a,p)=>a+p.projected_points,0) +
      lineup.midfielders.reduce((a,p)=>a+p.projected_points,0) +
      lineup.forwards.reduce((a,p)=>a+p.projected_points,0);

    if(!best || total>best.total){
      best={lineup,total,formation:f};
    }

  });

  return best;
}

export function chooseCaptain(players){
  return sortByPoints(players)[0];
}

export function suggestOneTransfer(currentSquad, allPlayers){

  const worst = sortByPoints(currentSquad).slice(-1)[0];

  const better = sortByPoints(allPlayers).find(
    p => p.position===worst.position && p.projected_points>worst.projected_points
  );

  if(!better) return null;

  return {
    out: worst,
    in: better,
    gain: better.projected_points - worst.projected_points
  };
}

export function suggestTwoTransfers(currentSquad, allPlayers){

  const sorted = sortByPoints(currentSquad);

  const worst1 = sorted[sorted.length-1];
  const worst2 = sorted[sorted.length-2];

  const best1 = sortByPoints(allPlayers).find(p=>p.position===worst1.position);
  const best2 = sortByPoints(allPlayers).find(p=>p.position===worst2.position);

  return {
    transfers:[
      {out:worst1,in:best1},
      {out:worst2,in:best2}
    ]
  };
}

export function wildcardSquad(allPlayers){

  const squad = [];

  const positions = {
    GK:2,
    DEF:5,
    MID:5,
    FWD:3
  };

  Object.keys(positions).forEach(pos=>{
    const best = sortByPoints(allPlayers.filter(p=>p.position===pos))
      .slice(0,positions[pos]);

    squad.push(...best);
  });

  return squad;
}

export function benchBoostSquad(allPlayers){

  return wildcardSquad(allPlayers)
    .sort((a,b)=>b.appearance_prob-a.appearance_prob);
}