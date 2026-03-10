export default function MonteCarloTable({data}){

  return(

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
          <td>{data.home}</td>
        </tr>

        <tr>
          <td>Draw</td>
          <td>{data.draw}</td>
        </tr>

        <tr>
          <td>Away Win</td>
          <td>{data.away}</td>
        </tr>

      </tbody>

    </table>

  )
}