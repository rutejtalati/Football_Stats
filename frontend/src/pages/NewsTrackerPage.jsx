// pages/NewsTrackerPage.jsx  — Intelligence Engine v2
// Article drawer replaced with full-screen ArticlePage
// Adds: hero images, related-articles sidebar, trending clubs panel
import { useState, useEffect, useCallback, useRef } from "react";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "https://football-stats-lw4b.onrender.com";

// ── Normalize ─────────────────────────────────────────────────
function normalize(a) {
  return {
    ...a,
    article_type:        a.type,
    home_team:           a.meta?.home_team,
    away_team:           a.meta?.away_team,
    home_win_prob:       (a.meta?.home_win  ?? 0) / 100,
    draw_prob:           (a.meta?.draw      ?? 0) / 100,
    away_win_prob:       (a.meta?.away_win  ?? 0) / 100,
    expected_home_goals: a.meta?.xg_home,
    expected_away_goals: a.meta?.xg_away,
    confidence_score:    (a.meta?.confidence ?? 0) / 100,
    home_logo:           a.meta?.home_logo,
    away_logo:           a.meta?.away_logo,
    model_verdict: Array.isArray(a.body)
      ? a.body[a.body.length - 1]?.replace(/\*\*/g, "") ?? ""
      : "",
    key_stat: a.summary,
  };
}

// ── League meta ───────────────────────────────────────────────
const LEAGUE_META = {
  epl:        { label: "Premier League", abbr: "EPL",  color: "#38bdf8", bg: "rgba(56,189,248,0.08)"  },
  laliga:     { label: "La Liga",        abbr: "LAL",  color: "#f59e0b", bg: "rgba(245,158,11,0.08)"  },
  seriea:     { label: "Serie A",        abbr: "SA",   color: "#34d399", bg: "rgba(52,211,153,0.08)"  },
  bundesliga: { label: "Bundesliga",     abbr: "BUN",  color: "#fb923c", bg: "rgba(251,146,60,0.08)"  },
  ligue1:     { label: "Ligue 1",        abbr: "L1",   color: "#a78bfa", bg: "rgba(167,139,250,0.08)" },
  ucl:        { label: "Champions Lge",  abbr: "UCL",  color: "#fbbf24", bg: "rgba(251,191,36,0.08)"  },
  general:    { label: "Football",       abbr: "NEWS", color: "#94a3b8", bg: "rgba(148,163,184,0.08)" },
};

const TYPE_META = {
  match_preview: { label: "Match Preview",  color: "#38bdf8", icon: "⚽" },
  model_insight: { label: "Model Insight",  color: "#34d399", icon: "📊" },
  title_race:    { label: "Title Race",     color: "#fbbf24", icon: "🏆" },
  transfer:      { label: "Transfer",       color: "#f59e0b", icon: "🔄" },
  headline:      { label: "News",           color: "#94a3b8", icon: "📰" },
};

const INSIGHT_THEMES = {
  "title race": { accent: "#fbbf24", tag: "TITLE RACE",  grad: "linear-gradient(135deg,rgba(251,191,36,0.15),rgba(0,0,0,0))" },
  "flying":     { accent: "#34d399", tag: "FORM",        grad: "linear-gradient(135deg,rgba(52,211,153,0.15),rgba(0,0,0,0))" },
  "form":       { accent: "#34d399", tag: "FORM",        grad: "linear-gradient(135deg,rgba(52,211,153,0.15),rgba(0,0,0,0))" },
  "defensive":  { accent: "#38bdf8", tag: "DEFENSIVE",   grad: "linear-gradient(135deg,rgba(56,189,248,0.12),rgba(0,0,0,0))" },
  "upset":      { accent: "#f87171", tag: "UPSET ALERT", grad: "linear-gradient(135deg,rgba(248,113,113,0.15),rgba(0,0,0,0))" },
  "model":      { accent: "#a78bfa", tag: "MODEL EDGE",  grad: "linear-gradient(135deg,rgba(167,139,250,0.15),rgba(0,0,0,0))" },
  "transfer":   { accent: "#fb923c", tag: "TRANSFER",    grad: "linear-gradient(135deg,rgba(251,146,60,0.12),rgba(0,0,0,0))" },
  "favoured":   { accent: "#a78bfa", tag: "PREDICTION",  grad: "linear-gradient(135deg,rgba(167,139,250,0.12),rgba(0,0,0,0))" },
};
const DEFAULT_THEME = { accent: "#38bdf8", tag: "INSIGHT", grad: "linear-gradient(135deg,rgba(56,189,248,0.08),rgba(0,0,0,0))" };

function getInsightTheme(title="") {
  const lower = title.toLowerCase();
  for (const [key,theme] of Object.entries(INSIGHT_THEMES))
    if (lower.includes(key)) return theme;
  return DEFAULT_THEME;
}

function getLeague(article) {
  return LEAGUE_META[(article.league||"").toLowerCase()] || LEAGUE_META.general;
}

function timeAgo(ts) {
  if (!ts) return "";
  const diff = Math.floor((Date.now()-new Date(ts))/60000);
  if (diff<1)    return "just now";
  if (diff<60)   return `${diff}m ago`;
  if (diff<1440) return `${Math.floor(diff/60)}h ago`;
  return `${Math.floor(diff/1440)}d ago`;
}

// ── Win prob bar ──────────────────────────────────────────────
function WinProbBar({ home,draw,away,homeTeam,awayTeam,large=false }) {
  const h=Math.round((home||0)*100), d=Math.round((draw||0)*100), a=Math.round((away||0)*100);
  const winner=h>a?"home":a>h?"away":"draw";
  return (
    <div style={{width:"100%"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:large?10:6}}>
        <span style={{fontSize:large?15:13,fontWeight:800,color:winner==="home"?"#f0f6ff":"#4a6a8a",maxWidth:"35%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{homeTeam}</span>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:large?16:13,fontWeight:900,color:winner==="home"?"#38bdf8":"#2a4a6a"}}>{h}%</span>
          <span style={{fontSize:large?11:10,color:"#1a3a5a",fontWeight:700}}>{d}% D</span>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:large?16:13,fontWeight:900,color:winner==="away"?"#f87171":"#2a4a6a"}}>{a}%</span>
        </div>
        <span style={{fontSize:large?15:13,fontWeight:800,color:winner==="away"?"#f0f6ff":"#4a6a8a",maxWidth:"35%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"right"}}>{awayTeam}</span>
      </div>
      <div style={{display:"flex",height:large?7:5,borderRadius:999,overflow:"hidden",gap:1}}>
        <div style={{width:`${h}%`,background:"linear-gradient(90deg,#1d6fa4,#38bdf8)",borderRadius:"999px 0 0 999px",transition:"width .6s ease"}}/>
        <div style={{width:`${d}%`,background:"rgba(255,255,255,0.12)"}}/>
        <div style={{width:`${a}%`,background:"linear-gradient(90deg,#dc4f4f,#f87171)",borderRadius:"0 999px 999px 0",transition:"width .6s ease"}}/>
      </div>
    </div>
  );
}

// ── Related article pill ───────────────────────────────────────
function RelatedCard({ article, onClick }) {
  const [hov,setHov]=useState(false);
  const tm=TYPE_META[article.type]||TYPE_META.headline;
  const lg=getLeague(article);
  return (
    <div onClick={()=>onClick(article)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:"flex",gap:12,alignItems:"flex-start",padding:"12px 14px",borderRadius:12,cursor:"pointer",
              background:hov?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.02)",
              border:hov?"1px solid rgba(255,255,255,0.1)":"1px solid rgba(255,255,255,0.05)",transition:"all .15s ease"}}>
      {article.image && (
        <img src={article.image} alt="" style={{width:52,height:40,objectFit:"cover",borderRadius:8,flexShrink:0}}
             onError={e=>e.currentTarget.style.display="none"}/>
      )}
      {!article.image && (
        <div style={{width:52,height:40,borderRadius:8,flexShrink:0,background:`${tm.color}12`,border:`1px solid ${tm.color}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
          {tm.icon}
        </div>
      )}
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",gap:5,marginBottom:4}}>
          <span style={{fontSize:8,fontWeight:900,letterSpacing:"0.1em",color:tm.color,textTransform:"uppercase",background:`${tm.color}10`,border:`1px solid ${tm.color}20`,borderRadius:4,padding:"1px 5px"}}>{tm.label}</span>
          <span style={{fontSize:8,fontWeight:900,letterSpacing:"0.08em",color:lg.color,textTransform:"uppercase",background:lg.bg,border:`1px solid ${lg.color}20`,borderRadius:4,padding:"1px 5px"}}>{lg.abbr}</span>
        </div>
        <p style={{fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:700,color:hov?"#e8f0ff":"#8aabb8",lineHeight:1.35,margin:0,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{article.title}</p>
      </div>
    </div>
  );
}

// ── Full Article Page ──────────────────────────────────────────
function ArticlePage({ article, allArticles, onClose, onNavigate }) {
  const pageRef = useRef(null);

  useEffect(()=>{
    if (!article) return;
    const handler=(e)=>{ if(e.key==="Escape") onClose(); };
    window.addEventListener("keydown",handler);
    document.body.style.overflow="hidden";
    if(pageRef.current) pageRef.current.scrollTop=0;
    return ()=>{ window.removeEventListener("keydown",handler); document.body.style.overflow=""; };
  },[article,onClose]);

  if (!article) return null;

  const theme    = getInsightTheme(article.title);
  const league   = getLeague(article);
  const typeMeta = TYPE_META[article.type] || TYPE_META.headline;
  const isExternal = article.source_type==="external";
  const isPreview  = article.type==="match_preview";

  const homeProb = article.home_win_prob  || (article.meta?.home_win  ?? 0)/100;
  const drawProb = article.draw_prob      || (article.meta?.draw      ?? 0)/100;
  const awayProb = article.away_win_prob  || (article.meta?.away_win  ?? 0)/100;
  const xgHome   = (article.expected_home_goals ?? article.meta?.xg_home)?.toFixed(2);
  const xgAway   = (article.expected_away_goals ?? article.meta?.xg_away)?.toFixed(2);
  const conf     = article.confidence_score
    ? Math.round(article.confidence_score*100)
    : article.meta?.confidence ?? null;

  const homeTeam = article.home_team || article.meta?.home_team;
  const awayTeam = article.away_team || article.meta?.away_team;

  const bodyParagraphs = Array.isArray(article.body)
    ? article.body.filter(p=>typeof p==="string"&&p.trim().length>0).map(p=>p.replace(/\*\*/g,""))
    : [];

  const accentColor = isPreview ? league.color : theme.accent;

  // Related: same league or same type, not self
  const related = allArticles
    .filter(a => a.id!==article.id && (a.league===article.league || a.type===article.type))
    .slice(0,5);

  const metaStats = [
    article.meta?.leader     && { label:"Leader",     value:article.meta.leader },
    article.meta?.gap!=null  && { label:"Gap",        value:`${article.meta.gap} pts` },
    article.meta?.leader_pts && { label:"Points",     value:article.meta.leader_pts },
    isPreview && xgHome      && { label:"xG Home",    value:xgHome },
    isPreview && xgAway      && { label:"xG Away",    value:xgAway },
    article.meta?.over_2_5   && { label:"Over 2.5",   value:`${article.meta.over_2_5}%` },
    article.meta?.btts       && { label:"BTTS",       value:`${article.meta.btts}%` },
    conf!=null               && { label:"Confidence", value:`${conf}%` },
  ].filter(Boolean);

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:1100,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(6px)",WebkitBackdropFilter:"blur(6px)",animation:"apBackdrop .2s ease both"}}/>

      {/* Full-screen page panel */}
      <div ref={pageRef} style={{position:"fixed",inset:0,zIndex:1101,overflowY:"auto",overflowX:"hidden",
            background:"linear-gradient(170deg,rgba(5,10,20,0.99),rgba(2,5,12,0.99))",
            scrollbarWidth:"thin",scrollbarColor:"rgba(255,255,255,0.06) transparent",
            animation:"apSlideUp .3s cubic-bezier(.22,1,.36,1) both"}}>

        {/* Top accent line */}
        <div style={{height:2,background:`linear-gradient(90deg,${accentColor},transparent)`,flexShrink:0,position:"sticky",top:0,zIndex:10}}/>

        {/* Close button — sticky top-right */}
        <button onClick={onClose}
          style={{position:"fixed",top:16,right:20,zIndex:1200,width:40,height:40,borderRadius:"50%",
                  background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",
                  color:"#7a9ab8",fontSize:20,lineHeight:1,cursor:"pointer",display:"flex",
                  alignItems:"center",justifyContent:"center",transition:"all .15s ease",flexShrink:0}}
          onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.15)";e.currentTarget.style.color="#f0f6ff";}}
          onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.08)";e.currentTarget.style.color="#7a9ab8";}}>
          ✕
        </button>

        <div style={{maxWidth:1100,margin:"0 auto",padding:"0 24px 80px"}}>

          {/* ── Hero image ── */}
          {article.image && (
            <div style={{width:"100%",maxHeight:380,overflow:"hidden",borderRadius:"0 0 24px 24px",marginBottom:0,position:"relative"}}>
              <img src={article.image} alt={article.title}
                   style={{width:"100%",height:380,objectFit:"cover",display:"block",filter:"brightness(0.65)"}}
                   onError={e=>e.currentTarget.parentElement.style.display="none"}/>
              {/* Gradient overlay for text legibility */}
              <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(5,10,20,1) 0%,rgba(5,10,20,0.4) 60%,transparent 100%)"}}/>
              {/* League badge over image */}
              <div style={{position:"absolute",bottom:20,left:28,display:"flex",gap:8}}>
                <span style={{fontSize:9,fontWeight:900,letterSpacing:"0.14em",color:accentColor,textTransform:"uppercase",background:`${accentColor}18`,border:`1px solid ${accentColor}40`,borderRadius:6,padding:"3px 9px",backdropFilter:"blur(4px)"}}>
                  {isPreview?"MATCH PREVIEW":(theme.tag||typeMeta.label.toUpperCase())}
                </span>
                <span style={{fontSize:9,fontWeight:900,letterSpacing:"0.1em",color:league.color,textTransform:"uppercase",background:league.bg,border:`1px solid ${league.color}30`,borderRadius:6,padding:"3px 9px",backdropFilter:"blur(4px)"}}>
                  {league.abbr}
                </span>
              </div>
            </div>
          )}

          {/* ── Main layout: article + sidebar ── */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:40,marginTop:article.image?0:48,paddingTop:32,alignItems:"start"}}>

            {/* ── LEFT: article content ── */}
            <div>
              {/* Badges (only if no hero image) */}
              {!article.image && (
                <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:20,flexWrap:"wrap"}}>
                  <span style={{fontSize:9,fontWeight:900,letterSpacing:"0.14em",color:accentColor,textTransform:"uppercase",background:`${accentColor}12`,border:`1px solid ${accentColor}30`,borderRadius:5,padding:"3px 8px"}}>
                    {isPreview?"MATCH PREVIEW":(theme.tag||typeMeta.label.toUpperCase())}
                  </span>
                  <span style={{fontSize:9,fontWeight:900,letterSpacing:"0.1em",color:league.color,textTransform:"uppercase",background:league.bg,border:`1px solid ${league.color}30`,borderRadius:5,padding:"3px 8px"}}>{league.abbr}</span>
                  {article.source && <span style={{fontSize:9,fontWeight:700,color:"#2a4a6a",fontFamily:"'JetBrains Mono',monospace",marginLeft:"auto"}}>{article.source}</span>}
                  <span style={{fontSize:9,fontWeight:700,color:"#1a3a5a",fontFamily:"'JetBrains Mono',monospace"}}>{timeAgo(article.published_at)}</span>
                </div>
              )}
              {article.image && (
                <div style={{display:"flex",gap:7,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
                  {article.source && <span style={{fontSize:10,fontWeight:700,color:"#2a4a6a",fontFamily:"'JetBrains Mono',monospace"}}>{article.source}</span>}
                  <span style={{fontSize:9,fontWeight:700,color:"#1a3a5a",fontFamily:"'JetBrains Mono',monospace"}}>{timeAgo(article.published_at)}</span>
                </div>
              )}

              {/* Title */}
              <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:30,fontWeight:900,color:"#f0f6ff",lineHeight:1.2,letterSpacing:"-0.025em",margin:"0 0 16px"}}>
                {article.title}
              </h1>

              {/* Standfirst */}
              {article.standfirst && (
                <p style={{fontFamily:"'Inter',sans-serif",fontSize:17,lineHeight:1.65,color:"#8aabb8",margin:"0 0 28px",borderLeft:`3px solid ${accentColor}40`,paddingLeft:18}}>
                  {article.standfirst}
                </p>
              )}

              {/* Match stats block */}
              {isPreview && homeTeam && awayTeam && (
                <div style={{borderRadius:18,padding:"22px 26px",marginBottom:32,background:"rgba(255,255,255,0.03)",border:`1px solid ${league.color}20`}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
                    <div style={{display:"flex",flexDirection:"column",gap:5,flex:1}}>
                      {article.home_logo && <img src={article.home_logo} alt={homeTeam} style={{width:44,height:44,objectFit:"contain",marginBottom:4}} onError={e=>e.currentTarget.style.display="none"}/>}
                      <span style={{fontFamily:"'Sora',sans-serif",fontSize:17,fontWeight:900,color:homeProb>=awayProb?"#f0f6ff":"#4a6a8a"}}>{homeTeam}</span>
                      {xgHome && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:"#2a6a9a",fontWeight:700}}>xG {xgHome}</span>}
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,padding:"0 20px"}}>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:24,fontWeight:900,color:"rgba(255,255,255,0.12)",letterSpacing:"0.1em"}}>VS</span>
                      {conf!=null && <span style={{fontSize:9,fontWeight:800,color:conf>70?"#34d399":conf>50?"#fbbf24":"#f87171",letterSpacing:"0.06em"}}>{conf}% CONF</span>}
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flex:1}}>
                      {article.away_logo && <img src={article.away_logo} alt={awayTeam} style={{width:44,height:44,objectFit:"contain",marginBottom:4}} onError={e=>e.currentTarget.style.display="none"}/>}
                      <span style={{fontFamily:"'Sora',sans-serif",fontSize:17,fontWeight:900,color:awayProb>homeProb?"#f0f6ff":"#4a6a8a",textAlign:"right"}}>{awayTeam}</span>
                      {xgAway && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:"#2a6a9a",fontWeight:700,textAlign:"right"}}>xG {xgAway}</span>}
                    </div>
                  </div>
                  <WinProbBar home={homeProb} draw={drawProb} away={awayProb} homeTeam={homeTeam} awayTeam={awayTeam} large={true}/>
                  {article.meta?.most_likely_score && (
                    <div style={{marginTop:16,padding:"8px 12px",borderRadius:8,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:9,fontWeight:800,color:"#1a3a5a",letterSpacing:"0.1em"}}>MOST LIKELY</span>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:16,fontWeight:900,color:accentColor}}>{article.meta.most_likely_score}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Body paragraphs */}
              {!isExternal && bodyParagraphs.length>0 && (
                <div style={{display:"flex",flexDirection:"column",gap:20,marginBottom:32}}>
                  {bodyParagraphs.map((para,i)=>(
                    <p key={i} style={{fontFamily:"'Inter',sans-serif",fontSize:16,lineHeight:1.8,
                        color:i===bodyParagraphs.length-1?"#c8d8f0":"#6a8aa8",margin:0,
                        fontWeight:i===bodyParagraphs.length-1?600:400,
                        ...(i===bodyParagraphs.length-1&&{borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:20,marginTop:4})}}>
                      {para}
                    </p>
                  ))}
                </div>
              )}

              {/* External article */}
              {isExternal && (
                <div style={{display:"flex",flexDirection:"column",gap:16}}>
                  <p style={{fontFamily:"'Inter',sans-serif",fontSize:16,lineHeight:1.75,color:"#6a8aa8",margin:0}}>
                    {article.standfirst||article.summary||"Read the full story at the original source."}
                  </p>
                  {article.url && (
                    <a href={article.url} target="_blank" rel="noopener noreferrer"
                       style={{display:"inline-flex",alignItems:"center",gap:8,padding:"11px 22px",borderRadius:999,
                               background:accentColor,color:"#000",fontFamily:"'Inter',sans-serif",
                               fontSize:13,fontWeight:800,letterSpacing:"0.04em",textDecoration:"none",width:"fit-content"}}>
                      Read full article →
                    </a>
                  )}
                </div>
              )}

              {/* Key stats box */}
              {metaStats.length>0 && (
                <div style={{marginTop:32,padding:"18px 20px",borderRadius:14,background:"rgba(255,255,255,0.02)",border:`1px solid ${accentColor}15`,display:"flex",flexWrap:"wrap",gap:24}}>
                  <div style={{width:"100%",marginBottom:4}}>
                    <span style={{fontSize:9,fontWeight:900,letterSpacing:"0.12em",color:accentColor,textTransform:"uppercase"}}>KEY STATS</span>
                  </div>
                  {metaStats.map((s,i)=>(
                    <div key={i} style={{display:"flex",flexDirection:"column",gap:3}}>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:18,fontWeight:900,color:accentColor}}>{s.value}</span>
                      <span style={{fontSize:9,fontWeight:800,color:"#1a3a5a",letterSpacing:"0.08em",textTransform:"uppercase"}}>{s.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── RIGHT: sidebar ── */}
            <div style={{position:"sticky",top:60}}>

              {/* Verdict card */}
              {!isExternal && article.model_verdict && (
                <div style={{borderRadius:16,padding:"18px 20px",marginBottom:20,background:`${accentColor}08`,border:`1px solid ${accentColor}20`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                    <span style={{fontSize:9,fontWeight:900,letterSpacing:"0.14em",color:accentColor,textTransform:"uppercase"}}>MODEL VERDICT</span>
                  </div>
                  <p style={{fontFamily:"'Inter',sans-serif",fontSize:13,lineHeight:1.65,color:"#8aabb8",margin:0}}>
                    {article.model_verdict}
                  </p>
                </div>
              )}

              {/* Related articles */}
              {related.length>0 && (
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                    <div style={{width:2,height:20,borderRadius:2,background:`linear-gradient(180deg,${accentColor},transparent)`}}/>
                    <span style={{fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:900,color:"#f0f6ff",letterSpacing:"-0.01em"}}>Related</span>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {related.map(a=>(
                      <RelatedCard key={a.id} article={a} onClick={()=>{onNavigate(a);if(pageRef.current)pageRef.current.scrollTop=0;}}/>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Hero card ──────────────────────────────────────────────────
function HeroCard({ article, onClick }) {
  const theme=getInsightTheme(article.title); const league=getLeague(article);
  const [hov,setHov]=useState(false);
  return (
    <div onClick={()=>onClick(article)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{position:"relative",borderRadius:24,overflow:"hidden",minHeight:320,cursor:"pointer",
              background:"linear-gradient(160deg,rgba(8,14,26,0.98),rgba(4,8,16,0.98))",
              border:`1px solid ${theme.accent}30`,
              boxShadow:hov?`0 0 40px ${theme.accent}20,0 24px 56px rgba(0,0,0,0.5)`:"0 20px 48px rgba(0,0,0,0.4)",
              transition:"box-shadow .3s ease",display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:32}}>
      {article.image && (
        <div style={{position:"absolute",inset:0,overflow:"hidden"}}>
          <img src={article.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.35)"}} onError={e=>e.currentTarget.style.display="none"}/>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(8,14,26,0.95) 30%,rgba(8,14,26,0.4) 80%,transparent 100%)"}}/>
        </div>
      )}
      {!article.image && (
        <>
          <div style={{position:"absolute",inset:0,pointerEvents:"none",background:theme.grad,opacity:hov?1:0.8,transition:"opacity .3s"}}/>
          <div style={{position:"absolute",top:0,right:0,width:280,height:280,backgroundImage:"radial-gradient(rgba(255,255,255,0.04) 1px,transparent 1px)",backgroundSize:"18px 18px",maskImage:"radial-gradient(ellipse at top right,black 30%,transparent 75%)",pointerEvents:"none"}}/>
        </>
      )}
      <div style={{position:"absolute",top:0,left:32,right:32,height:2,background:`linear-gradient(90deg,${theme.accent},transparent)`}}/>
      <div style={{position:"absolute",top:24,left:32,display:"flex",gap:8}}>
        {[{label:"Featured",color:theme.accent,bg:`${theme.accent}15`,border:`${theme.accent}35`},{label:league.abbr,color:league.color,bg:league.bg,border:`${league.color}30`}].map(b=>(
          <span key={b.label} style={{fontSize:9,fontWeight:900,letterSpacing:"0.12em",color:b.color,textTransform:"uppercase",background:b.bg,border:`1px solid ${b.border}`,borderRadius:6,padding:"3px 8px"}}>{b.label}</span>
        ))}
      </div>
      <div style={{position:"relative",zIndex:1}}>
        <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:28,fontWeight:900,color:"#f0f6ff",lineHeight:1.2,letterSpacing:"-0.02em",margin:"0 0 12px"}}>{article.title}</h2>
        <p style={{fontFamily:"'Inter',sans-serif",fontSize:15,color:"#6a8aa8",lineHeight:1.55,margin:"0 0 20px",maxWidth:640}}>
          {article.standfirst||article.summary}
        </p>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <span style={{fontSize:11,fontWeight:800,color:theme.accent,letterSpacing:"0.04em"}}>Read full analysis →</span>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"#1a3a5a",fontWeight:700}}>{timeAgo(article.published_at)}</span>
        </div>
      </div>
    </div>
  );
}

// ── MatchPreviewCard ──────────────────────────────────────────
function MatchPreviewCard({ article, size="standard", onClick }) {
  const [hov,setHov]=useState(false);
  const league=getLeague(article); const isFeatured=size==="feature";
  const homeProb=article.home_win_prob||(article.meta?.home_win??0)/100;
  const drawProb=article.draw_prob||(article.meta?.draw??0)/100;
  const awayProb=article.away_win_prob||(article.meta?.away_win??0)/100;
  const xgHome=(article.expected_home_goals??article.meta?.xg_home)?.toFixed(2)||"—";
  const xgAway=(article.expected_away_goals??article.meta?.xg_away)?.toFixed(2)||"—";
  const homeTeam=article.home_team||article.meta?.home_team||"Home";
  const awayTeam=article.away_team||article.meta?.away_team||"Away";
  const homeLogo=article.home_logo||article.meta?.home_logo;
  const awayLogo=article.away_logo||article.meta?.away_logo;
  const fixDate=article.meta?.kickoff||article.fixture_date;
  const verdict=article.model_verdict||article.summary||"";
  const favoured=homeProb>awayProb?homeTeam:awayProb>homeProb?awayTeam:null;
  const favProb=homeProb>awayProb?homeProb:awayProb;
  const conf=article.confidence_score?Math.round(article.confidence_score*100):article.meta?.confidence??null;

  return (
    <div onClick={()=>onClick(article)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{position:"relative",borderRadius:20,overflow:"hidden",cursor:"pointer",display:"flex",flexDirection:"column",
              background:"linear-gradient(160deg,rgba(8,14,26,0.98),rgba(4,8,16,0.98))",
              border:hov?`1px solid ${league.color}40`:"1px solid rgba(255,255,255,0.06)",
              boxShadow:hov?`0 0 28px ${league.color}15,0 16px 40px rgba(0,0,0,0.4)`:"0 8px 24px rgba(0,0,0,0.3)",
              transition:"all .22s ease"}}>
      {article.image && (
        <div style={{height:isFeatured?140:100,overflow:"hidden",position:"relative"}}>
          <img src={article.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.5)"}} onError={e=>e.currentTarget.parentElement.style.display="none"}/>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(8,14,26,1),transparent)"}}/>
        </div>
      )}
      <div style={{height:2,background:`linear-gradient(90deg,${league.color},transparent)`,flexShrink:0}}/>
      <div style={{padding:isFeatured?"10px 24px 6px":"6px 20px 4px",display:"flex",gap:6,alignItems:"center"}}>
        <span style={{fontSize:8,fontWeight:900,letterSpacing:"0.12em",color:league.color,textTransform:"uppercase",background:league.bg,border:`1px solid ${league.color}30`,borderRadius:4,padding:"2px 6px"}}>{league.abbr}</span>
        {fixDate && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"#1a3a5a",fontWeight:700,marginLeft:"auto"}}>{new Date(fixDate).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</span>}
      </div>
      <div style={{padding:isFeatured?"16px 24px 6px":"12px 20px 4px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:4}}>
          {homeLogo && <img src={homeLogo} alt={homeTeam} style={{width:32,height:32,objectFit:"contain",marginBottom:4}} onError={e=>e.currentTarget.style.display="none"}/>}
          <span style={{fontFamily:"'Sora',sans-serif",fontSize:isFeatured?16:14,fontWeight:900,color:homeProb>=awayProb?"#f0f6ff":"#4a6a8a",lineHeight:1.2}}>{homeTeam}</span>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#2a6a9a",fontWeight:700}}>xG {xgHome}</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,flexShrink:0}}>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:18,fontWeight:900,color:"rgba(255,255,255,0.15)",letterSpacing:"0.1em"}}>VS</span>
        </div>
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
          {awayLogo && <img src={awayLogo} alt={awayTeam} style={{width:32,height:32,objectFit:"contain",marginBottom:4}} onError={e=>e.currentTarget.style.display="none"}/>}
          <span style={{fontFamily:"'Sora',sans-serif",fontSize:isFeatured?16:14,fontWeight:900,color:awayProb>homeProb?"#f0f6ff":"#4a6a8a",lineHeight:1.2,textAlign:"right"}}>{awayTeam}</span>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#2a6a9a",fontWeight:700}}>xG {xgAway}</span>
        </div>
      </div>
      <div style={{padding:"0 20px"}}>
        <WinProbBar home={homeProb} draw={drawProb} away={awayProb} homeTeam={homeTeam} awayTeam={awayTeam}/>
      </div>
      <div style={{margin:"12px 20px 0",padding:"10px 14px",borderRadius:12,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"flex-start",gap:8}}>
        <span style={{fontSize:8,fontWeight:900,letterSpacing:"0.1em",color:"#34d399",textTransform:"uppercase",flexShrink:0,paddingTop:1}}>MODEL</span>
        <span style={{fontFamily:"'Inter',sans-serif",fontSize:12,color:"#7a9ab8",lineHeight:1.45}}>{verdict.slice(0,120)}{verdict.length>120?"…":""}</span>
      </div>
      <div style={{padding:"12px 20px 16px",display:"flex",gap:12,alignItems:"center",borderTop:"1px solid rgba(255,255,255,0.04)",marginTop:12}}>
        {favoured && (
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{fontSize:9,fontWeight:800,color:"#1a3a5a",letterSpacing:"0.08em"}}>FAVOURED</span>
            <span style={{fontSize:10,fontWeight:900,color:"#f0f6ff",background:"rgba(255,255,255,0.06)",borderRadius:5,padding:"1px 6px"}}>{favoured}</span>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:900,color:"#38bdf8"}}>{Math.round(favProb*100)}%</span>
          </div>
        )}
        {conf!=null && (
          <>
            <div style={{width:1,height:14,background:"rgba(255,255,255,0.06)"}}/>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:9,fontWeight:800,color:"#1a3a5a",letterSpacing:"0.08em"}}>CONF</span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:900,color:conf>70?"#34d399":conf>50?"#fbbf24":"#f87171"}}>{conf}%</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── ModelInsightCard ──────────────────────────────────────────
function ModelInsightCard({ article, size="standard", onClick }) {
  const [hov,setHov]=useState(false);
  const theme=getInsightTheme(article.title); const league=getLeague(article);
  const isFeatured=size==="feature";
  const metaStats=[
    article.meta?.leader_pts&&{label:"Points",value:article.meta.leader_pts},
    article.meta?.gap!=null&&{label:"Gap",value:`${article.meta.gap}pts`},
    article.meta?.confidence&&{label:"Confidence",value:`${article.meta.confidence}%`},
  ].filter(Boolean).slice(0,3);

  return (
    <div onClick={()=>onClick(article)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{position:"relative",borderRadius:20,overflow:"hidden",cursor:"pointer",display:"flex",flexDirection:"column",
              background:"linear-gradient(160deg,rgba(8,14,26,0.98),rgba(4,8,16,0.98))",
              border:hov?`1px solid ${theme.accent}40`:"1px solid rgba(255,255,255,0.06)",
              boxShadow:hov?`0 0 28px ${theme.accent}15,0 16px 40px rgba(0,0,0,0.4)`:"0 8px 24px rgba(0,0,0,0.3)",
              transition:"all .22s ease"}}>
      {article.image && (
        <div style={{height:80,overflow:"hidden",position:"relative"}}>
          <img src={article.image} alt="" style={{width:"100%",height:"100%",objectFit:"contain",padding:"8px",boxSizing:"border-box",filter:"brightness(0.7)"}} onError={e=>e.currentTarget.parentElement.style.display="none"}/>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(8,14,26,1),transparent)"}}/>
        </div>
      )}
      <div style={{height:2,background:`linear-gradient(90deg,${theme.accent},transparent)`}}/>
      <div style={{padding:isFeatured?"20px 24px":"16px 20px",position:"relative",zIndex:1,flex:1,display:"flex",flexDirection:"column"}}>
        <div style={{position:"absolute",inset:0,pointerEvents:"none",background:theme.grad,opacity:hov?1:0.7,transition:"opacity .3s"}}/>
        <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:12,position:"relative"}}>
          <span style={{fontSize:9,fontWeight:900,letterSpacing:"0.14em",color:theme.accent,textTransform:"uppercase",background:`${theme.accent}12`,border:`1px solid ${theme.accent}30`,borderRadius:5,padding:"2px 7px"}}>{theme.tag}</span>
          <span style={{fontSize:9,fontWeight:900,letterSpacing:"0.1em",color:league.color,textTransform:"uppercase",background:league.bg,border:`1px solid ${league.color}30`,borderRadius:5,padding:"2px 7px"}}>{league.abbr}</span>
          <span style={{marginLeft:"auto",fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"#1a3a5a",fontWeight:700}}>{timeAgo(article.published_at)}</span>
        </div>
        <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:isFeatured?20:16,fontWeight:900,color:"#f0f6ff",lineHeight:1.25,letterSpacing:"-0.01em",margin:"0 0 10px",position:"relative"}}>{article.title}</h3>
        <p style={{fontFamily:"'Inter',sans-serif",fontSize:13,color:"#4a6a8a",lineHeight:1.55,margin:"0 0 16px",flex:1,position:"relative"}}>
          {(article.standfirst||article.summary||"").slice(0,isFeatured?200:140)}
        </p>
        {metaStats.length>0 && (
          <div style={{display:"flex",gap:16,padding:"10px 12px",borderRadius:10,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)",marginBottom:12,position:"relative"}}>
            {metaStats.map((s,i)=>(
              <div key={i} style={{display:"flex",flexDirection:"column",gap:2}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,fontWeight:900,color:theme.accent}}>{s.value}</span>
                <span style={{fontSize:9,fontWeight:800,color:"#1a3a5a",letterSpacing:"0.06em",textTransform:"uppercase"}}>{s.label}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",position:"relative"}}>
          <span style={{fontSize:11,fontWeight:700,color:"#1a3a5a"}}>StatinSite Model</span>
          <span style={{fontSize:11,fontWeight:800,color:theme.accent,letterSpacing:"0.04em"}}>Read →</span>
        </div>
      </div>
    </div>
  );
}

// ── CompactCard ───────────────────────────────────────────────
function CompactCard({ article, onClick }) {
  const [hov,setHov]=useState(false);
  const typeMeta=TYPE_META[article.type]||TYPE_META.headline;
  const league=getLeague(article);
  return (
    <div onClick={()=>onClick(article)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:"flex",gap:14,alignItems:"flex-start",padding:"14px 16px",borderRadius:14,cursor:"pointer",
              background:hov?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.02)",
              border:hov?"1px solid rgba(255,255,255,0.1)":"1px solid rgba(255,255,255,0.05)",transition:"all .15s ease"}}>
      {article.image ? (
        <img src={article.image} alt="" style={{width:60,height:44,objectFit:"cover",borderRadius:8,flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>
      ) : (
        <div style={{width:36,height:36,borderRadius:10,flexShrink:0,background:`${typeMeta.color}12`,border:`1px solid ${typeMeta.color}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>
          {typeMeta.icon}
        </div>
      )}
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:5}}>
          <span style={{fontSize:8,fontWeight:900,letterSpacing:"0.1em",color:typeMeta.color,textTransform:"uppercase",background:`${typeMeta.color}10`,border:`1px solid ${typeMeta.color}25`,borderRadius:4,padding:"1px 5px"}}>{typeMeta.label}</span>
          <span style={{fontSize:8,fontWeight:900,letterSpacing:"0.08em",color:league.color,textTransform:"uppercase",background:league.bg,border:`1px solid ${league.color}25`,borderRadius:4,padding:"1px 5px"}}>{league.abbr}</span>
          <span style={{marginLeft:"auto",fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"#1a3a5a",fontWeight:700}}>{timeAgo(article.published_at)}</span>
        </div>
        <p style={{fontFamily:"'Sora',sans-serif",fontSize:13,fontWeight:700,color:hov?"#e8f0ff":"#b8c8d8",lineHeight:1.35,margin:0,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
          {article.title}
        </p>
      </div>
    </div>
  );
}

// ── SectionHeader ─────────────────────────────────────────────
function SectionHeader({ title, subtitle, accent="#38bdf8", count }) {
  return (
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:20}}>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:3,height:36,borderRadius:2,background:`linear-gradient(180deg,${accent},transparent)`,flexShrink:0}}/>
        <div>
          <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:20,fontWeight:900,color:"#f0f6ff",margin:0,letterSpacing:"-0.02em"}}>{title}</h2>
          {subtitle && <p style={{fontFamily:"'Inter',sans-serif",fontSize:12,color:"#2a4a6a",margin:"2px 0 0",fontWeight:600}}>{subtitle}</p>}
        </div>
      </div>
      {count!=null && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#1a3a5a",fontWeight:700}}>{count} articles</span>}
    </div>
  );
}

// ── FilterChip ────────────────────────────────────────────────
function FilterChip({ label, active, color="#38bdf8", onClick, count }) {
  const [hov,setHov]=useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:999,
              border:active?`1.5px solid ${color}60`:hov?"1.5px solid rgba(255,255,255,0.15)":"1.5px solid rgba(255,255,255,0.07)",
              background:active?`${color}14`:hov?"rgba(255,255,255,0.05)":"rgba(255,255,255,0.03)",
              color:active?color:hov?"#c8d8f0":"#3a5a7a",
              fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:800,letterSpacing:"0.04em",
              cursor:"pointer",transition:"all .15s ease",boxShadow:active?`0 0 12px ${color}18`:"none",
              whiteSpace:"nowrap",flexShrink:0}}>
      {active && <span style={{width:5,height:5,borderRadius:"50%",background:color,boxShadow:`0 0 6px ${color}`,flexShrink:0}}/>}
      {label}
      {count!=null && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,fontWeight:900,color:active?color:"#1a3a5a",background:active?`${color}18`:"rgba(255,255,255,0.04)",borderRadius:999,padding:"1px 5px"}}>{count}</span>}
    </button>
  );
}

function SkeletonCard({ height=220 }) {
  return <div style={{borderRadius:20,height,background:"linear-gradient(90deg,rgba(255,255,255,0.03) 0%,rgba(255,255,255,0.06) 50%,rgba(255,255,255,0.03) 100%)",backgroundSize:"400% 100%",animation:"niShimmer 1.5s ease-in-out infinite",border:"1px solid rgba(255,255,255,0.04)"}}/>;
}

function EmptyState({ message="No articles found" }) {
  return (
    <div style={{padding:"60px 20px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
      <div style={{fontSize:32,opacity:0.3}}>📭</div>
      <p style={{fontFamily:"'Inter',sans-serif",fontSize:14,color:"#1a3a5a",fontWeight:600}}>{message}</p>
    </div>
  );
}

// ── Trending clubs panel ──────────────────────────────────────
function TrendingPanel({ clubs }) {
  if (!clubs||clubs.length===0) return null;
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20,overflowX:"auto",paddingBottom:4}}>
      <span style={{fontSize:9,fontWeight:900,letterSpacing:"0.12em",color:"#1a3a5a",textTransform:"uppercase",flexShrink:0}}>Trending:</span>
      {clubs.map(club=>(
        <span key={club} style={{fontSize:10,fontWeight:800,color:"#8aabb8",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:999,padding:"3px 10px",flexShrink:0,whiteSpace:"nowrap"}}>
          {club}
        </span>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════
export default function NewsTrackerPage() {
  const [articles,       setArticles]       = useState([]);
  const [trending,       setTrending]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [activeType,     setActiveType]     = useState("all");
  const [activeLeague,   setActiveLeague]   = useState("all");
  const [lastUpdated,    setLastUpdated]    = useState(null);
  const [selectedArticle,setSelectedArticle]= useState(null);

  const openArticle   = useCallback(a=>setSelectedArticle(a), []);
  const closeArticle  = useCallback(()=>setSelectedArticle(null), []);
  const navigateArticle = useCallback(a=>setSelectedArticle(a), []);

  useEffect(()=>{
    async function load() {
      try {
        setLoading(true); setError(null);
        const res  = await fetch(`${BACKEND}/api/intelligence/feed?limit=40`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const raw  = Array.isArray(data.items)?data.items:[];
        setArticles(raw.map(normalize));
        setTrending(data.trending_clubs||[]);
        setLastUpdated(new Date());
      } catch(e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
    const t=setInterval(load,5*60*1000);
    return ()=>clearInterval(t);
  },[]);

  const filtered=articles.filter(a=>{
    const typeMatch  =activeType==="all"   ||a.type===activeType;
    const leagueMatch=activeLeague==="all" ||a.league===activeLeague;
    return typeMatch&&leagueMatch;
  });

  const previews  =filtered.filter(a=>a.type==="match_preview");
  const insights  =filtered.filter(a=>a.type==="model_insight"||a.type==="title_race");
  const transfers =filtered.filter(a=>a.type!=="match_preview"&&a.type!=="model_insight"&&a.type!=="title_race");
  const hero      =insights[0]||previews[0]||null;

  const counts={
    all:           articles.length,
    match_preview: articles.filter(a=>a.type==="match_preview").length,
    model_insight: articles.filter(a=>a.type==="model_insight"||a.type==="title_race").length,
    transfer:      articles.filter(a=>a.type!=="match_preview"&&a.type!=="model_insight"&&a.type!=="title_race").length,
  };

  const TYPE_FILTERS=[
    {key:"all",          label:"All",      color:"#94a3b8"},
    {key:"match_preview",label:"Previews", color:"#38bdf8"},
    {key:"model_insight",label:"Insights", color:"#34d399"},
    {key:"transfer",     label:"News",     color:"#f59e0b"},
  ];
  const LEAGUE_FILTERS=[
    {key:"all",        label:"All Leagues",    color:"#94a3b8"},
    {key:"epl",        label:"Premier League", color:"#38bdf8"},
    {key:"laliga",     label:"La Liga",        color:"#f59e0b"},
    {key:"seriea",     label:"Serie A",        color:"#34d399"},
    {key:"bundesliga", label:"Bundesliga",     color:"#fb923c"},
    {key:"ligue1",     label:"Ligue 1",        color:"#a78bfa"},
  ];

  return (
    <div style={{minHeight:"100vh",background:"#000",fontFamily:"'Sora',sans-serif"}}>
      <style>{`
        @keyframes niShimmer    {0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes niFadeUp     {from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes tickerPulse  {0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.85)}}
        @keyframes apBackdrop   {from{opacity:0}to{opacity:1}}
        @keyframes apSlideUp    {from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        .ni-card-enter { animation: niFadeUp .4s cubic-bezier(.22,1,.36,1) both; }
      `}</style>

      {/* Article full-page overlay */}
      <ArticlePage
        article={selectedArticle}
        allArticles={articles}
        onClose={closeArticle}
        onNavigate={navigateArticle}
      />

      <div style={{maxWidth:1200,margin:"0 auto",padding:"0 20px 80px"}}>

        {/* Page header */}
        <div style={{padding:"32px 0 24px",borderBottom:"1px solid rgba(255,255,255,0.05)",marginBottom:28}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
            <div style={{display:"flex",alignItems:"center",gap:16}}>
              <div style={{width:4,height:48,borderRadius:2,background:"linear-gradient(180deg,#38bdf8,#34d399)",flexShrink:0}}/>
              <div>
                <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:32,fontWeight:900,color:"#f0f6ff",margin:0,letterSpacing:"-0.03em",lineHeight:1.1}}>Football Intelligence</h1>
                <p style={{fontFamily:"'Inter',sans-serif",fontSize:13,color:"#2a4a6a",margin:"4px 0 0",fontWeight:600,letterSpacing:"0.02em"}}>
                  Model-driven previews · Tactical insights · Transfer news
                  {lastUpdated && <span style={{marginLeft:12,fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"#1a3a5a"}}>Updated {timeAgo(lastUpdated)}</span>}
                </p>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:7,padding:"6px 14px",borderRadius:999,background:"rgba(52,211,153,0.06)",border:"1px solid rgba(52,211,153,0.2)"}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:"#34d399",boxShadow:"0 0 8px rgba(52,211,153,0.8)",animation:"tickerPulse 2s ease-in-out infinite",display:"inline-block"}}/>
              <span style={{fontSize:10,fontWeight:900,color:"#34d399",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'Inter',sans-serif"}}>Auto-refreshing</span>
            </div>
          </div>
        </div>

        {/* Trending clubs */}
        <TrendingPanel clubs={trending}/>

        {/* Filters */}
        <div style={{marginBottom:28}}>
          <div style={{display:"flex",gap:6,flexWrap:"nowrap",overflowX:"auto",paddingBottom:10,scrollbarWidth:"none"}}>
            {TYPE_FILTERS.map(f=>(
              <FilterChip key={f.key} label={f.label} active={activeType===f.key} color={f.color} count={counts[f.key]} onClick={()=>setActiveType(f.key)}/>
            ))}
            <div style={{width:1,height:28,background:"rgba(255,255,255,0.07)",alignSelf:"center",flexShrink:0,margin:"0 4px"}}/>
            {LEAGUE_FILTERS.map(f=>(
              <FilterChip key={f.key} label={f.label} active={activeLeague===f.key} color={f.color} onClick={()=>setActiveLeague(f.key)}/>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{padding:"16px 20px",borderRadius:14,marginBottom:24,background:"rgba(248,113,113,0.06)",border:"1px solid rgba(248,113,113,0.2)",fontFamily:"'Inter',sans-serif",fontSize:13,color:"#f87171"}}>
            Failed to load intelligence feed: {error}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <SkeletonCard height={320}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <SkeletonCard height={240}/><SkeletonCard height={240}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
              <SkeletonCard height={180}/><SkeletonCard height={180}/><SkeletonCard height={180}/>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Hero */}
            {hero && (
              <div className="ni-card-enter" style={{marginBottom:40}}>
                <HeroCard article={hero} onClick={openArticle}/>
              </div>
            )}

            {/* Match Previews */}
            {previews.length>0 && (
              <div className="ni-card-enter" style={{marginBottom:48}}>
                <SectionHeader title="Match Previews" subtitle="Model-generated fixture analysis with xG and win probability" accent="#38bdf8" count={previews.length}/>
                <div style={{display:"grid",gridTemplateColumns:previews.length===1?"1fr":previews.length===2?"1fr 1fr":"1.4fr 1fr 1fr",gap:16}}>
                  {previews.slice(0,3).map((a,i)=>(
                    <div key={a.id||i} className="ni-card-enter" style={{animationDelay:`${i*.08}s`}}>
                      <MatchPreviewCard article={a} size={i===0?"feature":"standard"} onClick={openArticle}/>
                    </div>
                  ))}
                </div>
                {previews.length>3 && (
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginTop:16}}>
                    {previews.slice(3,6).map((a,i)=>(
                      <div key={a.id||i} className="ni-card-enter" style={{animationDelay:`${(i+3)*.08}s`}}>
                        <MatchPreviewCard article={a} size="standard" onClick={openArticle}/>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Divider */}
            {previews.length>0&&insights.length>0 && (
              <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:40}}>
                <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(255,255,255,0.06),transparent)"}}/>
                <span style={{fontSize:9,fontWeight:900,letterSpacing:"0.16em",color:"#1a3a5a",textTransform:"uppercase",fontFamily:"'Inter',sans-serif"}}>Model Insights</span>
                <div style={{flex:1,height:1,background:"linear-gradient(270deg,rgba(255,255,255,0.06),transparent)"}}/>
              </div>
            )}

            {/* Model Insights + Title Race */}
            {insights.length>0 && (
              <div className="ni-card-enter" style={{marginBottom:48}}>
                <SectionHeader title="Model Insights" subtitle="Statistical patterns, title race analysis and form deep-dives" accent="#34d399" count={insights.length}/>
                <div style={{display:"grid",gridTemplateColumns:insights.length===1?"1fr":"1fr 1fr",gap:16}}>
                  {insights.slice(0,6).map((a,i)=>(
                    <div key={a.id||i} className="ni-card-enter" style={{animationDelay:`${i*.08}s`}}>
                      <ModelInsightCard article={a} size={i===0&&insights.length>2?"feature":"standard"} onClick={openArticle}/>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Latest News */}
            {transfers.length>0 && (
              <div className="ni-card-enter" style={{marginBottom:48}}>
                <SectionHeader title="Latest News" subtitle="Transfers, headlines and breaking stories" accent="#f59e0b" count={transfers.length}/>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {transfers.slice(0,8).map((a,i)=>(
                    <div key={a.id||i} className="ni-card-enter" style={{animationDelay:`${i*.05}s`}}>
                      <CompactCard article={a} onClick={openArticle}/>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filtered.length===0&&<EmptyState message="No articles match your current filters"/>}
          </>
        )}
      </div>
    </div>
  );
}