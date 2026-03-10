export function simulateMatch(xgHome,xgAway,simulations=10000){

  function poisson(lambda){
    let L=Math.exp(-lambda)
    let p=1
    let k=0

    while(p>L){
      k++
      p*=Math.random()
    }

    return k-1
  }

  let homeWins=0
  let draws=0
  let awayWins=0

  for(let i=0;i<simulations;i++){

    let hg=poisson(xgHome)
    let ag=poisson(xgAway)

    if(hg>ag) homeWins++
    else if(hg===ag) draws++
    else awayWins++

  }

  return{
    home:homeWins/simulations,
    draw:draws/simulations,
    away:awayWins/simulations
  }

}