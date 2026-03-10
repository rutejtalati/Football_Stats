import { Radar } from "react-chartjs-2";

export default function RadarChart({data}){

  const chartData={
    labels:["xG","xA","Shots","Pass","Dribble"],
    datasets:[
      {
        label:"Player",
        data:data,
        backgroundColor:"rgba(0,200,255,0.3)"
      }
    ]
  }

  return <Radar data={chartData}/>
}