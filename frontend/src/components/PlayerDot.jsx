export default function PlayerDot({x,y,name}){

  const style={
    position:"absolute",
    left:`${y*10}%`,
    top:`${x*10}%`
  }

  return(
    <div style={style} className="player-dot">
      {name}
    </div>
  )

}