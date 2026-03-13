// PlayerDot.jsx
// grid format: "row:col"
// row = which line (1=GK, ascending toward attack)
// col = horizontal position (left to right)
//
// FIX: previous version had left/top swapped (left used x=row, top used y=col)
//      and used *10 which didn't center players in their column slot.

export default function PlayerDot({ x, y, name, totalRows = 4, totalCols = 4 }) {
  // x = row (vertical), y = col (horizontal)
  // Convert to % coordinates, centering each player in their cell
  const leftPct = ((y - 0.5) / totalCols) * 100;
  const topPct  = ((x - 0.5) / totalRows) * 100;

  const style = {
    position:  "absolute",
    left:      `${leftPct}%`,
    top:       `${topPct}%`,
    transform: "translate(-50%, -50%)",
  };

  return (
    <div style={style} className="player-dot">
      {name}
    </div>
  );
}