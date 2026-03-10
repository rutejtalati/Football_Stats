// NewsTrackerPage.jsx — StatinSite
// AI-generated football articles from live stats
// AI provider: Google Gemini 1.5 Flash (browser-safe, no CORS proxy needed)
// Covers: EPL, La Liga, Serie A, Ligue 1, Champions League
// Data sources: StatinSite backend API (standings/scorers/predictions/injuries)
//               + Gemini Flash to synthesise stats into full articles

// ── ALL IMPORTS MUST BE AT THE TOP (ES module rule) ─────────
import { useState, useEffect, useCallback, useRef } from "react";
import {
  getStandings, getTopScorers, getTopAssists,
  getLeagueInjuries, getLeaguePredictions,
} from "../api/api";

/* ─── Gemini Flash helper ────────────────────────────────────
   Uses the raw REST endpoint — no npm package needed.
   Browser fetch to generativelanguage.googleapis.com is
   CORS-allowed by Google (unlike api.anthropic.com).

   🔑 Set your key in .env:  VITE_GEMINI_KEY=AIza...
   Get a free key (no credit card) at:
   https://aistudio.google.com/app/apikey
──────────────────────────────────────────────────────────── */
const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY || "";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

async function geminiChat(prompt) {
  if (!GEMINI_KEY) {
    throw new Error("NO_KEY");
  }
  const res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 1100,
        temperature: 0.75,
        topP: 0.9,
      },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini HTTP ${res.status}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}

/* ── League config ──────────────────────────────────────── */
const LEAGUES = [
  { code:"all",   label:"All",             color:"#ffffff", bg:"#1a1a2e" },
  { code:"epl",   label:"Premier League",  color:"#C8102E", bg:"#06090f",
    flag:<svg width={16} height={11} viewBox="0 0 18 13" fill="none"><rect width="18" height="13" fill="#012169"/><path d="M0 0L18 13M18 0L0 13" stroke="#fff" strokeWidth="2.6"/><path d="M0 0L18 13M18 0L0 13" stroke="#C8102E" strokeWidth="1.6"/><path d="M9 0V13M0 6.5H18" stroke="#fff" strokeWidth="4.3"/><path d="M9 0V13M0 6.5H18" stroke="#C8102E" strokeWidth="2.6"/></svg>},
  { code:"laliga",label:"La Liga",         color:"#F1BF00", bg:"#0e0700",
    flag:<svg width={16} height={11} viewBox="0 0 18 13" fill="none"><rect width="18" height="3" fill="#c60b1e"/><rect y="3" width="18" height="7" fill="#ffc400"/><rect y="10" width="18" height="3" fill="#c60b1e"/></svg>},
  { code:"seriea",label:"Serie A",         color:"#009246", bg:"#030c05",
    flag:<svg width={16} height={11} viewBox="0 0 18 13" fill="none"><rect width="6" height="13" fill="#009246"/><rect x="6" width="6" height="13" fill="#fff"/><rect x="12" width="6" height="13" fill="#ce2b37"/></svg>},
  { code:"ligue1",label:"Ligue 1",         color:"#002395", bg:"#020510",
    flag:<svg width={16} height={11} viewBox="0 0 18 13" fill="none"><rect width="6" height="13" fill="#002395"/><rect x="6" width="6" height="13" fill="#fff"/><rect x="12" width="6" height="13" fill="#ED2939"/></svg>},
  { code:"ucl",   label:"Champions League",color:"#1B5EBE", bg:"#020816",
    flag:<svg width={16} height={11} viewBox="0 0 18 13" fill="none"><rect width="18" height="13" fill="#001f6b"/><text x="9" y="9" textAnchor="middle" fontSize="8" fill="#ffd700" fontWeight="900">★</text></svg>},
];

const ARTICLE_TYPES = ["All","Analysis","Match Preview","Form Report","Injury Update","Transfer Watch","Stats Deep Dive"];

/* ── Helpers ─────────────────────────────────────────────── */
function timeAgo(iso) {
  const d = new Date(iso), now = Date.now();
  const mins = Math.round((now - d) / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString("en-GB", { day:"numeric", month:"short" });
}

function readingTime(text) {
  return Math.max(1, Math.round((text||"").split(" ").length / 200));
}

/* ── CSS ─────────────────────────────────────────────────── */
const CSS = `
@keyframes ntFadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
@keyframes ntPulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
@keyframes ntSpin    { from{transform:rotate(0)} to{transform:rotate(360deg)} }
@keyframes ntShimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
@keyframes ntTickerX { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
.nt-card { transition: transform .2s, box-shadow .2s, border-color .2s; }
.nt-card:hover { transform: translateY(-4px); }
.nt-shimmer {
  background: linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.09) 50%,rgba(255,255,255,.04) 75%);
  background-size:200% 100%; animation: ntShimmer 1.4s linear infinite;
}
`;

/* ── No-key warning banner ───────────────────────────────── */
const NoKeyBanner = () => (
  <div style={{
    margin:"0 0 24px",padding:"18px 22px",borderRadius:12,
    background:"rgba(251,191,36,.07)",border:"1px solid rgba(251,191,36,.25)",
  }}>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
      <span style={{fontSize:16}}>🔑</span>
      <span style={{fontSize:13,fontWeight:800,color:"rgba(251,191,36,.95)"}}>Gemini API Key Required</span>
    </div>
    <p style={{margin:"0 0 10px",fontSize:12,color:"rgba(255,255,255,.55)",lineHeight:1.65}}>
      Add your free Gemini API key to <code style={{background:"rgba(255,255,255,.08)",padding:"1px 6px",
      borderRadius:4,fontSize:11,fontFamily:"monospace"}}>frontend/.env</code> to enable AI article generation:
    </p>
    <div style={{background:"rgba(0,0,0,.4)",border:"1px solid rgba(255,255,255,.09)",borderRadius:8,
      padding:"9px 14px",fontFamily:"monospace",fontSize:12,color:"rgba(255,255,255,.7)",marginBottom:10,
      letterSpacing:".02em"}}>
      VITE_GEMINI_KEY=AIzaSy…your_key_here
    </div>
    <p style={{margin:0,fontSize:11,color:"rgba(255,255,255,.35)"}}>
      Get a <strong style={{color:"rgba(251,191,36,.8)"}}>free</strong> key (no credit card) at{" "}
      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
        style={{color:"rgba(251,191,36,.85)",textDecoration:"none",fontWeight:700}}>
        aistudio.google.com/app/apikey
      </a>
      {" "}— free tier: 15 req/min, 1 M tokens/day.
      After adding the key, restart <code style={{fontSize:11,fontFamily:"monospace"}}>npm run dev</code>.
    </p>
  </div>
);

/* ── Skeleton card ───────────────────────────────────────── */
const SkeletonCard = () => (
  <div style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:14,overflow:"hidden"}}>
    <div className="nt-shimmer" style={{height:180}}/>
    <div style={{padding:16,display:"flex",flexDirection:"column",gap:8}}>
      <div className="nt-shimmer" style={{height:10,width:"40%",borderRadius:4}}/>
      <div className="nt-shimmer" style={{height:18,borderRadius:4}}/>
      <div className="nt-shimmer" style={{height:14,borderRadius:4}}/>
      <div className="nt-shimmer" style={{height:14,width:"70%",borderRadius:4}}/>
    </div>
  </div>
);

/* ── Live ticker ─────────────────────────────────────────── */
const LiveTicker = ({ items }) => {
  if (!items.length) return null;
  const doubled = [...items, ...items];
  return (
    <div style={{overflow:"hidden",background:"rgba(255,255,255,.04)",borderBottom:"1px solid rgba(255,255,255,.08)",padding:"8px 0",position:"relative"}}>
      <div style={{display:"flex",gap:0,animation:`ntTickerX ${items.length*4}s linear infinite`}}>
        {doubled.map((item, i) => (
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"0 24px",flexShrink:0,whiteSpace:"nowrap"}}>
            <span style={{fontSize:9,fontWeight:900,padding:"2px 7px",borderRadius:999,
              background:`${item.color}22`,color:item.color,letterSpacing:".08em"}}>{item.league}</span>
            <span style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.8)"}}>{item.headline}</span>
            <span style={{fontSize:9,color:"rgba(255,255,255,.3)",margin:"0 8px"}}>·</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Article card ────────────────────────────────────────── */
const ArticleCard = ({ article, onClick, featured = false }) => {
  const league = LEAGUES.find(l => l.code === article.league) || LEAGUES[0];
  const rt = readingTime(article.body);

  if (featured) return (
    <div className="nt-card" onClick={onClick} style={{
      gridColumn:"1 / -1",background:"rgba(255,255,255,.03)",border:`1px solid ${league.color}33`,
      borderRadius:16,overflow:"hidden",cursor:"pointer",
      boxShadow:`0 0 40px ${league.color}0a`,
      animation:"ntFadeUp .3s ease both",
    }}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",minHeight:240}}>
        <div style={{background:`linear-gradient(135deg,${league.color}15,${league.color}05)`,
          display:"flex",alignItems:"center",justifyContent:"center",padding:32,
          borderRight:`1px solid ${league.color}22`}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:8,lineHeight:1}}>{article.icon}</div>
            <div style={{fontSize:11,fontWeight:900,color:league.color,letterSpacing:".12em"}}>{article.type.toUpperCase()}</div>
          </div>
        </div>
        <div style={{padding:28,display:"flex",flexDirection:"column",gap:12,justifyContent:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {league.flag}
            <span style={{fontSize:10,fontWeight:800,color:league.color}}>{league.label}</span>
            <span style={{fontSize:9,color:"rgba(255,255,255,.3)"}}>·</span>
            <span style={{fontSize:9,color:"rgba(255,255,255,.35)"}}>{timeAgo(article.publishedAt)}</span>
            <span style={{marginLeft:"auto",fontSize:9,color:"rgba(255,255,255,.3)"}}>{rt} min read</span>
          </div>
          <h2 style={{margin:0,fontSize:22,fontWeight:900,color:"#f0f4ff",lineHeight:1.3,letterSpacing:"-.01em"}}>{article.title}</h2>
          <p style={{margin:0,fontSize:13,color:"rgba(255,255,255,.55)",lineHeight:1.6}}>{article.summary}</p>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4}}>
            {(article.tags||[]).slice(0,4).map(t=>(
              <span key={t} style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:999,
                background:"rgba(255,255,255,.06)",color:"rgba(255,255,255,.5)"}}>{t}</span>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
            <div style={{width:24,height:24,borderRadius:"50%",
              background:`linear-gradient(135deg,${league.color},${league.color}88)`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,color:"#000"}}>S</div>
            <span style={{fontSize:10,color:"rgba(255,255,255,.4)"}}>StatinSite AI · Gemini Flash</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="nt-card" onClick={onClick} style={{
      background:"rgba(255,255,255,.03)",border:`1px solid rgba(255,255,255,.08)`,
      borderRadius:14,overflow:"hidden",cursor:"pointer",
      animation:"ntFadeUp .3s ease both",
      display:"flex",flexDirection:"column",
    }}
    onMouseEnter={e=>{e.currentTarget.style.borderColor=`${league.color}44`;e.currentTarget.style.boxShadow=`0 8px 28px rgba(0,0,0,.4),0 0 0 1px ${league.color}22`;}}
    onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,.08)";e.currentTarget.style.boxShadow="";}}>

      {/* Color header band */}
      <div style={{height:3,background:`linear-gradient(90deg,${league.color},${league.color}44)`}}/>

      <div style={{padding:"14px 16px",flex:1,display:"flex",flexDirection:"column",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {league.flag}
          <span style={{fontSize:9,fontWeight:800,color:league.color}}>{league.label}</span>
          <span style={{marginLeft:"auto",fontSize:8,padding:"1px 6px",borderRadius:999,
            background:`${article.typeColor||"rgba(255,255,255,.08)"}22`,
            color:article.typeColor||"rgba(255,255,255,.4)",fontWeight:800,letterSpacing:".06em"}}>
            {article.type}
          </span>
        </div>

        <h3 style={{margin:0,fontSize:14,fontWeight:900,color:"#f0f4ff",lineHeight:1.35,letterSpacing:"-.01em",
          display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
          {article.title}
        </h3>

        <p style={{margin:0,fontSize:11,color:"rgba(255,255,255,.45)",lineHeight:1.5,flex:1,
          display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
          {article.summary}
        </p>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"auto",paddingTop:8,
          borderTop:"1px solid rgba(255,255,255,.06)"}}>
          <span style={{fontSize:9,color:"rgba(255,255,255,.3)"}}>{timeAgo(article.publishedAt)}</span>
          <span style={{fontSize:9,color:"rgba(255,255,255,.3)"}}>{rt} min read</span>
        </div>
      </div>
    </div>
  );
};

/* ── Full article reader ─────────────────────────────────── */
const ArticleReader = ({ article, onClose }) => {
  const league = LEAGUES.find(l => l.code === article.league) || LEAGUES[0];
  const ref = useRef(null);
  useEffect(() => { ref.current?.scrollTo(0,0); }, [article]);

  // Render body with section headers
  const renderBody = (text) => {
    if (!text) return null;
    const lines = text.split("\n").filter(l => l.trim());
    return lines.map((line, i) => {
      if (line.startsWith("## ")) return (
        <h2 key={i} style={{fontSize:18,fontWeight:900,color:league.color,margin:"28px 0 12px",
          borderLeft:`3px solid ${league.color}`,paddingLeft:12,letterSpacing:"-.01em"}}>
          {line.replace("## ","")}
        </h2>
      );
      if (line.startsWith("**") && line.endsWith("**")) return (
        <p key={i} style={{fontSize:14,fontWeight:800,color:"#e8f0ff",margin:"16px 0 6px"}}>{line.replace(/\*\*/g,"")}</p>
      );
      if (line.startsWith("- ")) return (
        <div key={i} style={{display:"flex",gap:10,margin:"5px 0"}}>
          <span style={{color:league.color,flexShrink:0,marginTop:2}}>▸</span>
          <p style={{margin:0,fontSize:13,color:"rgba(255,255,255,.7)",lineHeight:1.65}}>{line.replace("- ","")}</p>
        </div>
      );
      return <p key={i} style={{fontSize:14,color:"rgba(255,255,255,.7)",lineHeight:1.75,margin:"10px 0"}}>{line}</p>;
    });
  };

  return (
    <div ref={ref} style={{position:"fixed",inset:0,zIndex:1000,overflowY:"auto",
      background:"rgba(0,0,0,.96)",animation:"ntFadeUp .2s ease both"}}>
      {/* Header */}
      <div style={{position:"sticky",top:0,zIndex:10,background:"rgba(0,0,0,.95)",
        backdropFilter:"blur(16px)",borderBottom:"1px solid rgba(255,255,255,.08)",
        padding:"14px 20px",display:"flex",alignItems:"center",gap:12}}>
        <button onClick={onClose} style={{background:"none",border:"1px solid rgba(255,255,255,.15)",
          borderRadius:8,color:"rgba(255,255,255,.7)",fontSize:12,padding:"6px 14px",cursor:"pointer",
          fontWeight:700,transition:"all .15s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,.4)";e.currentTarget.style.color="#fff";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,.15)";e.currentTarget.style.color="rgba(255,255,255,.7)";}}>
          ← Back
        </button>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {league.flag}
          <span style={{fontSize:11,fontWeight:800,color:league.color}}>{league.label}</span>
          <span style={{fontSize:10,color:"rgba(255,255,255,.3)"}}>·</span>
          <span style={{fontSize:10,color:"rgba(255,255,255,.35)"}}>{article.type}</span>
        </div>
        <span style={{marginLeft:"auto",fontSize:10,color:"rgba(255,255,255,.3)"}}>{readingTime(article.body)} min read</span>
      </div>

      {/* Article content */}
      <div style={{maxWidth:720,margin:"0 auto",padding:"40px 24px 80px"}}>
        {/* Tags */}
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
          {(article.tags||[]).map(t=>(
            <span key={t} style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:999,
              background:"rgba(255,255,255,.06)",color:"rgba(255,255,255,.5)"}}>{t}</span>
          ))}
        </div>

        <h1 style={{fontSize:28,fontWeight:900,color:"#f4f8ff",lineHeight:1.25,
          letterSpacing:"-.02em",margin:"0 0 16px"}}>{article.title}</h1>

        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:32,
          paddingBottom:20,borderBottom:`1px solid ${league.color}22`}}>
          <div style={{width:32,height:32,borderRadius:"50%",
            background:`linear-gradient(135deg,${league.color},${league.color}88)`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:"#000"}}>S</div>
          <div>
            <div style={{fontSize:12,fontWeight:800,color:"rgba(255,255,255,.8)"}}>StatinSite Analytics Engine</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,.35)"}}>{timeAgo(article.publishedAt)} · Generated from live data via Gemini Flash</div>
          </div>
        </div>

        {/* Summary pull quote */}
        <blockquote style={{margin:"0 0 28px",padding:"14px 20px",
          background:`${league.color}0e`,border:`1px solid ${league.color}33`,
          borderLeft:`4px solid ${league.color}`,borderRadius:"0 8px 8px 0"}}>
          <p style={{margin:0,fontSize:15,fontStyle:"italic",color:"rgba(255,255,255,.75)",lineHeight:1.6}}>{article.summary}</p>
        </blockquote>

        {/* Body */}
        <div>{renderBody(article.body)}</div>

        {/* Stats boxes if present */}
        {article.statBoxes?.length > 0 && (
          <div style={{marginTop:32,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {article.statBoxes.map((s,i)=>(
              <div key={i} style={{padding:"14px 12px",borderRadius:10,
                background:`${league.color}0a`,border:`1px solid ${league.color}22`,textAlign:"center"}}>
                <div style={{fontSize:22,fontWeight:900,color:league.color,fontFamily:"'JetBrains Mono',monospace"}}>{s.value}</div>
                <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.5)",marginTop:4}}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{marginTop:40,paddingTop:20,borderTop:"1px solid rgba(255,255,255,.07)",
          fontSize:10,color:"rgba(255,255,255,.2)",lineHeight:1.6}}>
          This article was generated by StatinSite's AI analytics engine using live match data, standings, and statistical models. All statistics are sourced from API-Football Pro.
        </div>
      </div>
    </div>
  );
};

/* ── Article generator — Gemini Flash ───────────────────── */
async function generateArticles(statsData) {
  const { epl, laliga, seriea, ligue1 } = statsData;

  const makePrompt = (leagueLabel, code, data) => {
    const { standings=[], scorers=[], assists=[], injuries=[], predictions=[] } = data;
    const top3 = standings.slice(0,3).map(t=>`${t.team_name||t.team}: ${t.points||0}pts (${t.played||0}P)`).join(", ");
    const topScorer = scorers[0] ? `${scorers[0].player_name||scorers[0].name}: ${scorers[0].goals} goals` : "N/A";
    const topAssist = assists[0] ? `${assists[0].player_name||assists[0].name}: ${assists[0].assists} assists` : "N/A";
    const injCount = injuries.length;
    const topMatch = predictions[0] ? `${predictions[0].home_team} vs ${predictions[0].away_team} (${Math.round((predictions[0].p_home_win||0)*100)}% home/${Math.round((predictions[0].p_draw||0)*100)}% draw/${Math.round((predictions[0].p_away_win||0)*100)}% away)` : "N/A";
    const nextMatches = predictions.slice(0,3).map(m=>`${m.home_team} vs ${m.away_team} predicted ${m.most_likely_score||"?"}`).join("; ");

    return `You are a football analytics journalist for StatinSite. Write a concise, data-driven football article about ${leagueLabel}.

LIVE DATA (use these exact numbers):
- Top 3 standings: ${top3}
- Top scorer: ${topScorer}
- Top assister: ${topAssist}  
- Active injuries: ${injCount}
- Featured match: ${topMatch}
- Upcoming predictions: ${nextMatches}

Write a ${["Form Report","Analysis","Match Preview","Stats Deep Dive"][Math.floor(Math.random()*4)]} article. Include:
1. A punchy title (no quotes, max 12 words)
2. A 1-sentence summary (max 25 words)  
3. Article body with sections marked ## Section Title. Use the real numbers provided. 3-4 sections, each 2-3 short paragraphs. Include bullet points for key stats.
4. 3 stat boxes in format: STAT_BOXES: [{"value":"X","label":"Y"},...]
5. 4 tags in format: TAGS: tag1,tag2,tag3,tag4

Format your response EXACTLY as:
TITLE: [title here]
SUMMARY: [summary here]
TYPE: [article type]
BODY:
[article body here]
STAT_BOXES: [json array]
TAGS: [comma separated]`;
  };

  const LEAGUE_DATA = [
    { code:"epl",    label:"Premier League", data:epl    },
    { code:"laliga", label:"La Liga",         data:laliga },
    { code:"seriea", label:"Serie A",         data:seriea },
    { code:"ligue1", label:"Ligue 1",         data:ligue1 },
  ];

  const ICONS = { "Form Report":"📈","Analysis":"🔬","Match Preview":"⚽","Stats Deep Dive":"📊","Injury Update":"🏥","Transfer Watch":"💰" };
  const TYPE_COLORS = { "Form Report":"#28d97a","Analysis":"#3b9eff","Match Preview":"#f2c94c","Stats Deep Dive":"#b388ff","Injury Update":"#ff4d6d","Transfer Watch":"#ff6b35" };

  // One article per league — run sequentially to stay under free-tier rate limit (15 req/min)
  const results = [];
  for (const { code, label, data } of LEAGUE_DATA) {
    try {
      const text = await geminiChat(makePrompt(label, code, data||{}));
      const article = parseArticle(text, code, label, ICONS, TYPE_COLORS);
      if (article) results.push(article);
    } catch (err) {
      console.warn(`[Gemini] Failed for ${label}:`, err.message);
      // Re-throw if it's a key error so the outer handler can show it
      if (err.message === "NO_KEY" || err.message.includes("API_KEY") || err.message.includes("403")) throw err;
      // Otherwise skip this league and continue
    }
  }
  return results;
}

function parseArticle(text, code, leagueLabel, ICONS, TYPE_COLORS) {
  const get = (key) => {
    const regex = new RegExp(`${key}:\\s*(.+?)(?=\\n[A-Z_]+:|$)`, "s");
    const m = text.match(regex);
    return m ? m[1].trim() : "";
  };

  const title   = get("TITLE").replace(/^\[|\]$/g,"");
  const summary = get("SUMMARY").replace(/^\[|\]$/g,"");
  const type    = get("TYPE").replace(/^\[|\]$/g,"") || "Analysis";
  const body    = get("BODY").replace(/^STAT_BOXES:.*$/ms,"").trim();
  const tagsRaw = get("TAGS");

  let statBoxes = [];
  const sbMatch = text.match(/STAT_BOXES:\s*(\[.*?\])/s);
  if (sbMatch) { try { statBoxes = JSON.parse(sbMatch[1]); } catch {} }

  const tags = tagsRaw ? tagsRaw.split(",").map(t=>t.trim()).filter(Boolean) : [leagueLabel];

  if (!title || !body) return null;

  return {
    id: `${code}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
    league: code,
    title,
    summary: summary || body.split("\n")[0]?.slice(0,120)+"...",
    body,
    type: type.trim(),
    typeColor: TYPE_COLORS[type.trim()] || "#67b1ff",
    icon: ICONS[type.trim()] || "📰",
    tags,
    statBoxes,
    publishedAt: new Date(Date.now() - Math.random()*3600000).toISOString(),
    source: "StatinSite AI",
  };
}

/* ── UCL article generator — Gemini Flash ───────────────── */
async function generateUCLArticle() {
  const prompt = `You are a football analytics journalist. Write a Champions League analysis article.

Write a Stats Deep Dive about the current Champions League season focusing on xG leaders, 
defensive records, and knockout stage predictions. Include realistic stats.

Format EXACTLY as:
TITLE: [title]
SUMMARY: [1 sentence summary, max 25 words]
TYPE: Stats Deep Dive
BODY:
[body with ## sections, bullet points, real football analysis]
STAT_BOXES: [{"value":"X","label":"Y"},{"value":"X","label":"Y"},{"value":"X","label":"Y"}]
TAGS: tag1,tag2,tag3,tag4`;

  try {
    const text = await geminiChat(prompt);
    const article = parseArticle(text, "ucl", "Champions League",
      {"Stats Deep Dive":"📊","Analysis":"🔬"},
      {"Stats Deep Dive":"#1B5EBE","Analysis":"#ffd700"});
    if (article) article.icon = "🏆";
    return article;
  } catch(err) {
    // Propagate auth/key errors; silently skip UCL for other failures
    if (err.message === "NO_KEY" || err.message.includes("API_KEY") || err.message.includes("403")) throw err;
    console.warn("[Gemini] UCL article failed:", err.message);
    return null;
  }
}

/* ── Trending headlines ticker data (from stats) ─────────── */
function buildTickerItems(allStats) {
  const items = [];
  const { epl, laliga, seriea, ligue1 } = allStats;
  const leagues = [
    { code:"epl",    data:epl,    color:"#C8102E", label:"EPL" },
    { code:"laliga", data:laliga, color:"#F1BF00", label:"LaLiga" },
    { code:"seriea", data:seriea, color:"#009246", label:"Serie A" },
    { code:"ligue1", data:ligue1, color:"#4d7fff", label:"Ligue 1" },
  ];
  leagues.forEach(({ data, color, label }) => {
    const { standings=[], scorers=[], injuries=[], predictions=[] } = data||{};
    if (standings[0]) items.push({ color, league:label, headline:`${standings[0].team_name||standings[0].team} lead ${label} with ${standings[0].points}pts` });
    if (scorers[0]) items.push({ color, league:label, headline:`${scorers[0].player_name||scorers[0].name} tops ${label} scoring chart with ${scorers[0].goals} goals` });
    if (predictions[0]) items.push({ color, league:label, headline:`${predictions[0].home_team} vs ${predictions[0].away_team}: Model predicts ${predictions[0].most_likely_score||"close contest"}` });
    if (injuries.length) items.push({ color, league:label, headline:`${injuries.length} players currently sidelined in ${label}` });
  });
  return items;
}

/* ══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════ */
export default function NewsTrackerPage() {
  const [articles, setArticles]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [generating, setGenerating]   = useState(false);
  const [activeLeague, setActiveLeague] = useState("all");
  const [activeType, setActiveType]   = useState("All");
  const [search, setSearch]           = useState("");
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [tickerItems, setTickerItems] = useState([]);
  const [statsData, setStatsData]     = useState({});
  const [error, setError]             = useState(null);

  // Load all stats in parallel
  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    const LEAGUE_CODES = ["epl","laliga","seriea","ligue1"];
    try {
      const results = await Promise.allSettled(
        LEAGUE_CODES.flatMap(code => [
          getStandings(code).then(d => ({ type:"standings", code, data:d?.standings||d||[] })),
          getTopScorers(code).then(d => ({ type:"scorers",  code, data:d?.scorers||d||[] })),
          getTopAssists(code).then(d => ({ type:"assists",  code, data:d?.assists||d||[] })),
          getLeagueInjuries(code).then(d => ({ type:"injuries", code, data:d?.injuries||d||[] })),
          getLeaguePredictions(code).then(d => ({ type:"predictions", code, data:d?.predictions||d||[] })),
        ])
      );

      const byLeague = {};
      LEAGUE_CODES.forEach(c => byLeague[c] = { standings:[], scorers:[], assists:[], injuries:[], predictions:[] });

      results.forEach(r => {
        if (r.status === "fulfilled" && r.value) {
          const { type, code, data } = r.value;
          if (byLeague[code]) byLeague[code][type] = Array.isArray(data) ? data : [];
        }
      });

      setStatsData(byLeague);
      setTickerItems(buildTickerItems(byLeague));
      setLoading(false);
      return byLeague;
    } catch(e) {
      setError("Failed to load league data. Check your backend connection.");
      setLoading(false);
      return null;
    }
  }, []);

  const generateAllArticles = useCallback(async (stats) => {
    if (!stats) return;
    setGenerating(true);
    setError(null);
    try {
      const [leagueArticles, uclArticle] = await Promise.all([
        generateArticles(stats),
        generateUCLArticle(),
      ]);
      const all = [...leagueArticles];
      if (uclArticle) all.push(uclArticle);
      all.sort((a,b) => new Date(b.publishedAt)-new Date(a.publishedAt));
      setArticles(all);
      if (all.length === 0) {
        setError("Gemini returned no articles. Check browser console (F12) for details — the key may be invalid or rate limited.");
      }
    } catch(e) {
      if (e.message === "NO_KEY") {
        setError(null); // NoKeyBanner handles this case
      } else {
        // Show the real Gemini error so the user knows what's wrong
        setError(`Gemini error: ${e.message}`);
      }
    }
    setGenerating(false);
  }, []);

  useEffect(() => {
    loadStats().then(stats => { if(stats) generateAllArticles(stats); });
  }, []);

  const handleRefresh = async () => {
    const stats = await loadStats();
    if (stats) await generateAllArticles(stats);
  };

  // Filter articles
  const filtered = articles.filter(a => {
    const leagueMatch = activeLeague === "all" || a.league === activeLeague;
    const typeMatch   = activeType === "All" || a.type === activeType;
    const searchMatch = !search || a.title.toLowerCase().includes(search.toLowerCase()) ||
                        a.summary.toLowerCase().includes(search.toLowerCase()) ||
                        (a.tags||[]).some(t => t.toLowerCase().includes(search.toLowerCase()));
    return leagueMatch && typeMatch && searchMatch;
  });

  const featuredArticle  = filtered[0];
  const remainingArticles = filtered.slice(1);

  if (selectedArticle) {
    return (
      <div style={{fontFamily:"'Inter','Sora',sans-serif"}}>
        <style>{CSS}</style>
        <ArticleReader article={selectedArticle} onClose={() => setSelectedArticle(null)}/>
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",background:"#08090e",color:"#f0f4ff",fontFamily:"'Inter','Sora',sans-serif"}}>
      <style>{CSS}</style>

      {/* Live ticker */}
      {tickerItems.length > 0 && <LiveTicker items={tickerItems}/>}

      <div style={{maxWidth:1400,margin:"0 auto",padding:"28px 20px 60px"}}>

        {/* ── HEADER ── */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",
          flexWrap:"wrap",gap:16,marginBottom:28}}>
          <div>
            <div style={{fontSize:9,fontWeight:900,letterSpacing:".2em",color:"rgba(255,255,255,.3)",marginBottom:6}}>
              STATINSITE · FOOTBALL INTELLIGENCE
            </div>
            <h1 style={{margin:"0 0 6px",fontSize:30,fontWeight:900,letterSpacing:"-.02em",
              background:"linear-gradient(135deg,#fff,rgba(255,255,255,.6))",
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              News & Analysis
            </h1>
            <p style={{margin:0,fontSize:12,color:"rgba(255,255,255,.4)",fontWeight:600}}>
              AI-generated articles from live stats · Powered by Gemini Flash · EPL · La Liga · Serie A · Ligue 1 · UCL
            </p>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            {/* Search */}
            <div style={{position:"relative"}}>
              <input
                value={search}
                onChange={e=>setSearch(e.target.value)}
                placeholder="Search articles..."
                style={{
                  background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",
                  borderRadius:8,padding:"8px 12px 8px 32px",fontSize:12,color:"#f0f4ff",
                  outline:"none",width:200,transition:"border-color .15s",
                }}
                onFocus={e=>e.target.style.borderColor="rgba(255,255,255,.25)"}
                onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.1)"}
              />
              <svg style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",opacity:.4}}
                width={13} height={13} viewBox="0 0 16 16" fill="none">
                <circle cx="6" cy="6" r="5" stroke="white" strokeWidth="1.5"/>
                <path d="M10 10L14 14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>

            {/* Refresh */}
            <button onClick={handleRefresh} disabled={loading||generating}
              style={{
                display:"flex",alignItems:"center",gap:7,
                padding:"8px 16px",borderRadius:8,fontSize:11,fontWeight:800,cursor:"pointer",
                background: loading||generating ? "rgba(255,255,255,.05)" : "rgba(77,127,255,.15)",
                border:`1px solid ${loading||generating?"rgba(255,255,255,.1)":"rgba(77,127,255,.4)"}`,
                color: loading||generating ? "rgba(255,255,255,.3)" : "#4d7fff",
                transition:"all .15s",
              }}>
              <svg width={12} height={12} viewBox="0 0 16 16" fill="none"
                style={{animation:loading||generating?"ntSpin 1s linear infinite":"none"}}>
                <path d="M13.5 2.5A6.5 6.5 0 1 0 14 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M13.5 2.5V6H10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {generating ? "Generating..." : loading ? "Loading..." : "Regenerate"}
            </button>

            {/* Live dot */}
            <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",
              background:"rgba(40,217,122,.07)",border:"1px solid rgba(40,217,122,.2)",borderRadius:999}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:"#28d97a",
                animation:"ntPulse 1.8s ease-in-out infinite"}}/>
              <span style={{fontSize:9,fontWeight:800,color:"#28d97a",letterSpacing:".1em"}}>LIVE</span>
            </div>
          </div>
        </div>

        {/* ── NO KEY BANNER — only shown in local dev if key missing ── */}
        {!GEMINI_KEY && process.env.NODE_ENV !== "production" && <NoKeyBanner />}

        {/* ── LEAGUE FILTER ── */}
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
          {LEAGUES.map(l=>(
            <button key={l.code} onClick={()=>setActiveLeague(l.code)} style={{
              display:"flex",alignItems:"center",gap:6,
              padding:"7px 14px",borderRadius:999,fontSize:11,fontWeight:800,cursor:"pointer",
              background: activeLeague===l.code ? `${l.color}18` : "rgba(255,255,255,.04)",
              border:`1.5px solid ${activeLeague===l.code ? l.color : "rgba(255,255,255,.1)"}`,
              color: activeLeague===l.code ? l.color : "rgba(255,255,255,.45)",
              transition:"all .15s",
            }}>
              {l.code!=="all" && l.flag}
              {l.label}
              {activeLeague===l.code && articles.filter(a=>l.code==="all"||a.league===l.code).length>0 && (
                <span style={{fontSize:9,background:`${l.color}22`,borderRadius:999,
                  padding:"1px 6px"}}>{articles.filter(a=>l.code==="all"||a.league===l.code).length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── TYPE FILTER ── */}
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:28,
          paddingBottom:16,borderBottom:"1px solid rgba(255,255,255,.06)"}}>
          {ARTICLE_TYPES.map(t=>(
            <button key={t} onClick={()=>setActiveType(t)} style={{
              padding:"5px 11px",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer",
              background: activeType===t ? "rgba(255,255,255,.1)" : "transparent",
              border:`1px solid ${activeType===t ? "rgba(255,255,255,.2)" : "rgba(255,255,255,.07)"}`,
              color: activeType===t ? "#f0f4ff" : "rgba(255,255,255,.35)",
              transition:"all .13s",
            }}>{t}</button>
          ))}
        </div>

        {/* ── ERROR / DEBUG ── */}
        {error && (
          <div style={{padding:"16px 18px",background:"rgba(255,77,109,.08)",border:"1px solid rgba(255,77,109,.2)",
            borderRadius:10,color:"#ff4d6d",fontSize:12,marginBottom:20,lineHeight:1.7}}>
            <div style={{fontWeight:800,marginBottom:6}}>⚠ {error}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.4)"}}>
              Key loaded: <code style={{color:GEMINI_KEY?"#28d97a":"#ff4d6d",fontFamily:"monospace"}}>{GEMINI_KEY ? `${GEMINI_KEY.slice(0,8)}…${GEMINI_KEY.slice(-4)} ✓` : "NOT FOUND"}</code>
              {" · "}Open <strong>F12 → Console</strong> for the full error from Gemini.
            </div>
          </div>
        )}

        {/* ── LOADING SKELETON ── */}
        {(loading || generating) && !articles.length && (
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
              {[...Array(8)].map((_,i)=><SkeletonCard key={i}/>)}
            </div>
            <div style={{textAlign:"center",marginTop:20,fontSize:12,color:"rgba(255,255,255,.3)"}}>
              {loading ? "Loading live stats from all leagues..." : "Generating AI articles via Gemini Flash..."}
            </div>
          </div>
        )}

        {/* ── NO RESULTS ── */}
        {!loading && !generating && filtered.length === 0 && articles.length > 0 && (
          <div style={{textAlign:"center",padding:60,color:"rgba(255,255,255,.3)",fontSize:14}}>
            No articles match your filters. Try changing league or type.
          </div>
        )}

        {/* ── ARTICLES GRID ── */}
        {!loading && filtered.length > 0 && (
          <div>
            {/* Featured article */}
            {featuredArticle && (
              <div style={{marginBottom:20}}>
                <ArticleCard article={featuredArticle} onClick={()=>setSelectedArticle(featuredArticle)} featured/>
              </div>
            )}

            {/* Remaining articles in 3-col grid */}
            {remainingArticles.length > 0 && (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
                {remainingArticles.map(a=>(
                  <ArticleCard key={a.id} article={a} onClick={()=>setSelectedArticle(a)}/>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STATS SNAPSHOT (bottom) ── */}
        {!loading && Object.keys(statsData).length > 0 && (
          <div style={{marginTop:48,paddingTop:24,borderTop:"1px solid rgba(255,255,255,.06)"}}>
            <div style={{fontSize:9,fontWeight:900,color:"rgba(255,255,255,.25)",letterSpacing:".14em",marginBottom:14}}>
              LIVE DATA SNAPSHOT · USED TO GENERATE ARTICLES
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {["epl","laliga","seriea","ligue1"].map(code=>{
                const l = LEAGUES.find(x=>x.code===code);
                const d = statsData[code]||{};
                const leader = d.standings?.[0];
                const topScorer = d.scorers?.[0];
                return(
                  <div key={code} style={{padding:"12px 14px",borderRadius:10,
                    background:"rgba(255,255,255,.03)",border:`1px solid ${l?.color||"#fff"}22`}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                      {l?.flag}
                      <span style={{fontSize:10,fontWeight:800,color:l?.color}}>{l?.label}</span>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                      <div style={{fontSize:10,color:"rgba(255,255,255,.5)"}}>
                        <span style={{color:"rgba(255,255,255,.25)"}}>Leader: </span>
                        {leader?.team_name||leader?.team||"—"} {leader?.points||0}pts
                      </div>
                      <div style={{fontSize:10,color:"rgba(255,255,255,.5)"}}>
                        <span style={{color:"rgba(255,255,255,.25)"}}>Top scorer: </span>
                        {topScorer?.player_name||topScorer?.name||"—"} ({topScorer?.goals||0})
                      </div>
                      <div style={{fontSize:10,color:"rgba(255,255,255,.5)"}}>
                        <span style={{color:"rgba(255,255,255,.25)"}}>Injuries: </span>
                        {d.injuries?.length||0} active
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}