// PlayerDot.jsx — presentational marker
// All coordinate logic lives in Pitch.jsx.

export default function PlayerDot({ x, y, name, color = "#60a5fa" }) {
  return (
    <div style={{
      position:      "absolute",
      left:          `${y}%`,
      top:           `${x}%`,
      transform:     "translate(-50%, -50%)",
      display:       "flex",
      flexDirection: "column",
      alignItems:    "center",
      gap:           3,
      pointerEvents: "none",
    }}>
      <div style={{
        width:          28,
        height:         28,
        borderRadius:   "50%",
        border:         `2px solid ${color}`,
        background:     "rgba(0,0,0,0.6)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        fontSize:       9,
        fontWeight:     700,
        color,
      }}>
        {(name || "?")[0]}
      </div>
      <span style={{
        fontSize:   8,
        fontWeight: 700,
        color:      "rgba(220,235,255,0.8)",
        whiteSpace: "nowrap",
        textShadow: "0 1px 3px rgba(0,0,0,0.9)",
      }}>
        {name}
      </span>
    </div>
  );
}