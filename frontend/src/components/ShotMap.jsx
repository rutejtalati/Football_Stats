export default function ShotMap({ shots = [] }){

  if (!shots.length) return null;

  return(

    <svg width="600" height="400">

      {shots.map((s,i)=>(
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={5}
          fill={s.is_goal ? "red" : "white"}
        />
      ))}

    </svg>

  )

}