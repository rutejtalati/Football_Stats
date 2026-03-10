import {simulateMatch} from "../analytics/montecarlo"
import {useState} from "react"

export default function MonteCarlo(){

  const [result,setResult]=useState(null)

  function runSimulation(){

    const r=simulateMatch(1.6,1.2,20000)
    setResult(r)

  }

  return(

    <div>

      <h1>Monte Carlo Match Simulation</h1>

      <button onClick={runSimulation}>
        Run Simulation
      </button>

      {result && (

        <table>

          <thead>
            <tr>
              <th>Outcome</th>
              <th>Probability</th>
            </tr>
          </thead>

          <tbody>

            <tr>
              <td>Home Win</td>
              <td>{(result.home*100).toFixed(1)}%</td>
            </tr>

            <tr>
              <td>Draw</td>
              <td>{(result.draw*100).toFixed(1)}%</td>
            </tr>

            <tr>
              <td>Away Win</td>
              <td>{(result.away*100).toFixed(1)}%</td>
            </tr>

          </tbody>

        </table>

      )}

    </div>

  )

}