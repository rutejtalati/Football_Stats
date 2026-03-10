// components/StandingsTable.jsx
// Handles both the old raw API-Football shape (response[0].league.standings[0])
// and the new normalised shape from main.py ({ standings: [...] })

const FORM_STYLE = {
  W: { bg:"rgba(44,200,120,0.18)", color:"#2cc878", border:"rgba(44,200,120,0.35)" },
  D: { bg:"rgba(160,160,180,0.12)",color:"#7a8a9a", border:"rgba(160,160,180,0.2)" },
  L: { bg:"rgba(220,70,70,0.16)",  color:"#e05050", border:"rgba(220,70,70,0.28)"  },
};

function FormPip({ result }) {
  const s = FORM_STYLE[result] || FORM_STYLE.D;
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", justifyContent:"center",
      width:18, height:18, borderRadius:4, fontSize:9, fontWeight:900,
      background:s.bg, color:s.color, border:"1px solid "+s.border,
    }}>{result}</span>
  );
}

function normaliseRows(table) {
  if (!table || table.length === 0) return [];

  const first = table[0];

  // Already normalised (from new main.py parse_standings_response)
  if (first.team_name !== undefined) return table;

  // Old raw API-Football shape: { rank, team:{name,logo}, all:{played,win,draw,lose}, goalsDiff, points, form }
  return table.map((entry, i) => ({
    rank:          entry.rank ?? i + 1,
    team_id:       entry.team?.id,
    team_name:     entry.team?.name ?? "—",
    logo:          entry.team?.logo ?? "",
    played:        entry.all?.played ?? 0,
    won:           entry.all?.win    ?? 0,
    drawn:         entry.all?.draw   ?? 0,
    lost:          entry.all?.lose   ?? 0,
    goals_for:     entry.all?.goals?.for      ?? 0,
    goals_against: entry.all?.goals?.against  ?? 0,
    goal_diff:     entry.goalsDiff ?? 0,
    points:        entry.points    ?? 0,
    form:          entry.form      ?? "",
  }));
}

export default function StandingsTable({ table = [] }) {
  const rows  = normaliseRows(table);
  const total = rows.length;

  function getZoneColor(pos) {
    if (pos <= 4)          return "#3b9eff";
    if (pos === 5)         return "#f5a623";
    if (pos === 6)         return "#a06cd5";
    if (pos >= total - 2)  return "#e05050";
    return "transparent";
  }

  if (rows.length === 0) {
    return (
      <div style={{ padding:"32px", textAlign:"center", color:"#2a4a6a", fontSize:14 }}>
        No standings data available
      </div>
    );
  }

  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13,
                      fontFamily:"Outfit, sans-serif" }}>
        <thead>
          <tr>
            {["#","Club","P","W","D","L","GF","GA","GD","Pts","Form"].map(h => (
              <th key={h} style={{
                padding:"10px 12px", fontSize:9, fontWeight:900, letterSpacing:"0.1em",
                color:"#1a3a5a", borderBottom:"1px solid rgba(255,255,255,0.07)",
                background:"rgba(0,0,0,0.4)", textAlign: h==="Club" ? "left" : "center",
                whiteSpace:"nowrap",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const pos  = row.rank ?? i + 1;
            const gd   = row.goal_diff ?? 0;
            const zc   = getZoneColor(pos);
            const form = String(row.form || "");
            return (
              <tr key={row.team_id ?? i}
                  style={{ borderLeft:"3px solid "+zc, transition:"background 0.12s" }}
                  onMouseEnter={e => { e.currentTarget.style.background="rgba(103,177,255,0.04)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background=""; }}>
                <td style={{ padding:"10px 12px", textAlign:"center",
                             color:"#4a6a8a", fontWeight:800,
                             borderBottom:"1px solid rgba(255,255,255,0.04)" }}>{pos}</td>
                <td style={{ padding:"10px 12px", textAlign:"left",
                             borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    {row.logo && (
                      <img src={row.logo} alt="" style={{ width:20, height:20, objectFit:"contain" }}
                           onError={e => { e.currentTarget.style.display="none"; }} />
                    )}
                    <span style={{ fontWeight:800, color:"#d0dce8", whiteSpace:"nowrap" }}>
                      {row.team_name}
                    </span>
                  </div>
                </td>
                <td style={{ padding:"10px 12px", textAlign:"center", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>{row.played}</td>
                <td style={{ padding:"10px 12px", textAlign:"center", color:"#2cc878", fontWeight:800, borderBottom:"1px solid rgba(255,255,255,0.04)" }}>{row.won}</td>
                <td style={{ padding:"10px 12px", textAlign:"center", color:"#7a8a9a", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>{row.drawn}</td>
                <td style={{ padding:"10px 12px", textAlign:"center", color:"#e05050", fontWeight:800, borderBottom:"1px solid rgba(255,255,255,0.04)" }}>{row.lost}</td>
                <td style={{ padding:"10px 12px", textAlign:"center", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>{row.goals_for}</td>
                <td style={{ padding:"10px 12px", textAlign:"center", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>{row.goals_against}</td>
                <td style={{ padding:"10px 12px", textAlign:"center", borderBottom:"1px solid rgba(255,255,255,0.04)",
                             color: gd > 0 ? "#2cc878" : gd < 0 ? "#e05050" : undefined }}>
                  {gd > 0 ? "+":""}{gd}
                </td>
                <td style={{ padding:"10px 12px", textAlign:"center", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                  <strong style={{ color:"#fff", fontSize:14 }}>{row.points}</strong>
                </td>
                <td style={{ padding:"10px 12px", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ display:"flex", gap:3, justifyContent:"center" }}>
                    {form.split("").slice(-5).map((r, j) => <FormPip key={j} result={r} />)}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Zone legend */}
      <div style={{ display:"flex", gap:16, flexWrap:"wrap", padding:"12px 4px 4px",
                    fontSize:11, color:"#2a4a6a", fontWeight:700 }}>
        {[
          { color:"#3b9eff", label:"Champions League" },
          { color:"#f5a623", label:"Europa League"    },
          { color:"#a06cd5", label:"Conference League"},
          { color:"#e05050", label:"Relegation"       },
        ].map(({ color, label }) => (
          <span key={label} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:color, flexShrink:0 }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}