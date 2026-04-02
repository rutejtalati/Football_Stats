import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function RadarChart({ data }){

  if (!data) return null;

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