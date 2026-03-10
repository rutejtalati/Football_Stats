// NewsTrackerPage.jsx — StatinSite
// Real football news from RSS feeds — no API key needed

import { useState, useEffect, useCallback } from "react";

/* ── RSS Feed sources ────────────────────────────────────────
   Fetched via rss2json.com (free, CORS-friendly, no key needed)
──────────────────────────────────────────────────────────── */
const RSS_PROXY = "https://api.rss2json.com/v1/api.json?rss_url=";

const FEEDS = [
  { url:"https://www.espn.com/espn/rss/soccer/news",                    source:"ESPN FC",       league:"epl",    color:"#C8102E" },
  { url:"https://www.football365.com/feed",                              source:"Football365",   league:"epl",    color:"#ff6600" },
  { url:"https://www.theguardian.com/football/rss",                      source:"The Guardian",  league:"epl",    color:"#C8102E" },
  { url:"https://en.as.com/rss/feeds/soccer.xml",                       source:"AS English",    league:"laliga", color:"#F1BF00" },
  { url:"https://www.getfootballnewsfrance.com/feed/",                   source:"GFN France",    league:"ligue1", color:"#002395" },
  { url:"https://www.getfootballnewsgermany.com/feed/",                  source:"GFN Germany",   league:"epl",    color:"#d00000" },
  { url:"https://www.getfootballnewsitaly.com/feed/",                    source:"GFN Italy",     league:"seriea", color:"#009246" },
  { url:"https://www.getfootballnewsspain.com/feed/",                    source:"GFN Spain",     league:"laliga", color:"#F1BF00" },
];

const LEAGUES = [
  { code:"all",    label:"All",              color:"#ffffff" },
  { code:"epl",    label:"Premier League",   color:"#C8102E",
    flag:<svg width={16} height={11} viewBox="0 0 18 13" fill="none"><rect width="18" height="13" fill="#012169"/><path d="M0 0L18 13M18 0L0 13" stroke="#fff" strokeWidth="2.6"/><path d="M0 0L18 13M18 0L0 13" stroke="#C8102E" strokeWidth="1.6"/><path d="M9 0V13M0 6.5H18" stroke="#fff" strokeWidth="4.3"/><path d="M9 0V13M0 6.5H18" stroke="#C8102E" strokeWidth="2.6"/></svg>},
  { code:"laliga", label:"La Liga",          color:"#F1BF00",
    flag:<svg width={16} height={11} viewBox="0 0 18 13" fill="none"><rect width="18" height="3" fill="#c60b1e"/><rect y="3" width="18" height="7" fill="#ffc400"/><rect y="10" width="18" height="3" fill="#c60b1e"/></svg>},
  { code:"seriea", label:"Serie A",          color:"#009246",
    flag:<svg width={16} height={11} viewBox="0 0 18 13" fill="none"><rect width="6" height="13" fill="#009246"/><rect x="6" width="6" height="13" fill="#fff"/><rect x="12" width="6" height="13" fill="#ce2b37"/></svg>},
  { code:"ligue1", label:"Ligue 1",          color:"#002395",
    flag:<svg width={16} height={11} viewBox="0 0 18 13" fill="none"><rect width="6" height="13" fill="#002395"/><rect x="6" width="6" height="13" fill="#fff"/><rect x="12" width="6" height="13" fill="#ED2939"/></svg>},
  { code:"ucl",    label:"Champions League", color:"#1B5EBE",
    flag:<svg width={16} height={11} viewBox="0 0 18 13" fill="none"><rect width="18" height="13" fill="#001f6b"/><text x="9" y="9" textAnchor="middle" fontSize="8" fill="#ffd700" fontWeight="900">★</text></svg>},
];

const FOOTBALL_KEYWORDS = ["football","soccer","goal","match","premier league","la liga","serie a","ligue 1","champions league","transfer","manager","striker","midfielder","defender","goalkeeper","fixture","standings","squad","stadium","referee","offside","penalty","kick","club","fc ","united","city fc","arsenal","chelsea","liverpool","barcelona","real madrid","juventus","psg","inter","milan","atletico","dortmund","ajax","porto","benfica"];

function isFootballArticle(title, desc) {
  const text = (title + " " + desc).toLowerCase();
  return FOOTBALL_KEYWORDS.some(k => text.includes(k));
}

function timeAgo(iso) {
  const d = new Date(iso), now = Date.now();
  const mins = Math.round((now - d) / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString("en-GB", { day:"numeric", month:"short" });
}

function stripHtml(html) {
  return (html||"").replace(/<[^>]*>/g,"").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").trim();
}

function guessLeague(title, desc, feedLeague) {
  const text = (title + " " + desc).toLowerCase();
  if (text.includes("champions league") || text.includes("ucl")) return "ucl";
  if (text.includes("premier league") || text.includes("arsenal") || text.includes("chelsea") || text.includes("liverpool") || text.includes("man city") || text.includes("man united")) return "epl";
  if (text.includes("la liga") || text.includes("barcelona") || text.includes("real madrid") || text.includes("atletico")) return "laliga";
  if (text.includes("serie a") || text.includes("juventus") || text.includes("inter milan") || text.includes("ac milan") || text.includes("napoli")) return "seriea";
  if (text.includes("ligue 1") || text.includes("psg") || text.includes("paris saint") || text.includes("marseille")) return "ligue1";
  return feedLeague;
}

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

const SkeletonCard = () => (
  <div style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:14,overflow:"hidden"}}>
    <div className="nt-shimmer" style={{height:160}}/>
    <div style={{padding:16,display:"flex",flexDirection:"column",gap:8}}>
      <div className="nt-shimmer" style={{height:10,width:"40%",borderRadius:4}}/>
      <div className="nt-shimmer" style={{height:18,borderRadius:4}}/>
      <div className="nt-shimmer" style={{height:14,borderRadius:4}}/>
    </div>
  </div>
);

const LiveTicker = ({ items }) => {
  if (!items.length) return null;
  const doubled = [...items, ...items];
  return (
    <div style={{overflow:"hidden",background:"rgba(255,255,255,.04)",borderBottom:"1px solid rgba(255,255,255,.08)",padding:"8px 0"}}>
      <div style={{display:"flex",gap:0,animation:`ntTickerX ${items.length*5}s linear infinite`}}>
        {doubled.map((item,i) => (
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"0 24px",flexShrink:0,whiteSpace:"nowrap"}}>
            <span style={{fontSize:9,fontWeight:900,padding:"2px 7px",borderRadius:999,
              background:`${item.color}22`,color:item.color,letterSpacing:".08em"}}>{item.source}</span>
            <span style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.8)"}}>{item.title}</span>
            <span style={{fontSize:9,color:"rgba(255,255,255,.3)",margin:"0 8px"}}>·</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ArticleCard = ({ article, featured }) => {
  const league = LEAGUES.find(l => l.code === article.league) || LEAGUES[1];
  return (
    <a href={article.link} target="_blank" rel="noreferrer" style={{textDecoration:"none"}}>
      <div className="nt-card" style={{
        background:"rgba(255,255,255,.03)",
        border:`1px solid ${featured ? league.color+"44" : "rgba(255,255,255,.08)"}`,
        borderRadius:14,overflow:"hidden",cursor:"pointer",
        animation:"ntFadeUp .3s ease both",display:"flex",flexDirection:"column",
        ...(featured?{boxShadow:`0 0 40px ${league.color}0a`}:{}),
      }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=`${league.color}55`;e.currentTarget.style.boxShadow=`0 8px 28px rgba(0,0,0,.4)`;}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=featured?`${league.color}44`:"rgba(255,255,255,.08)";e.currentTarget.style.boxShadow="";}}>
        <div style={{height:3,background:`linear-gradient(90deg,${league.color},${league.color}44)`}}/>
        {article.thumbnail ? (
          <div style={{height:featured?200:160,overflow:"hidden",background:"rgba(255,255,255,.04)"}}>
            <img src={article.thumbnail} alt="" style={{width:"100%",height:"100%",objectFit:"cover",opacity:.85}}
              onError={e=>{e.target.parentElement.style.display="none";}}/>
          </div>
        ) : (
          <div style={{height:featured?200:160,background:`linear-gradient(135deg,${league.color}15,${league.color}05)`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:48}}>
            {league.code==="ucl"?"🏆":league.code==="epl"?"⚽":league.code==="laliga"?"🇪🇸":league.code==="seriea"?"🇮🇹":league.code==="ligue1"?"🇫🇷":"⚽"}
          </div>
        )}
        <div style={{padding:"14px 16px",flex:1,display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            {league.flag}
            <span style={{fontSize:9,fontWeight:800,color:league.color}}>{league.label}</span>
            <span style={{marginLeft:"auto",fontSize:9,padding:"2px 7px",borderRadius:999,
              background:"rgba(255,255,255,.07)",color:"rgba(255,255,255,.4)",fontWeight:700}}>{article.source}</span>
          </div>
          <h3 style={{margin:0,fontSize:featured?15:13,fontWeight:900,color:"#f0f4ff",lineHeight:1.35,
            display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
            {article.title}
          </h3>
          {article.summary && (
            <p style={{margin:0,fontSize:11,color:"rgba(255,255,255,.45)",lineHeight:1.5,
              display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
              {article.summary}
            </p>
          )}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            marginTop:"auto",paddingTop:8,borderTop:"1px solid rgba(255,255,255,.06)"}}>
            <span style={{fontSize:9,color:"rgba(255,255,255,.3)"}}>{timeAgo(article.pubDate)}</span>
            <span style={{fontSize:9,color:league.color,fontWeight:700}}>Read →</span>
          </div>
        </div>
      </div>
    </a>
  );
};

export default function NewsTrackerPage() {
  const [articles, setArticles]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [activeLeague, setActiveLeague] = useState("all");
  const [search, setSearch]             = useState("");

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    const allArticles = [];
    const seen = new Set();

    await Promise.allSettled(
      FEEDS.map(async (feed) => {
        try {
          const res = await fetch(`${RSS_PROXY}${encodeURIComponent(feed.url)}&count=10`);
          const data = await res.json();
          if (data.status !== "ok") return;
          (data.items || []).forEach(item => {
            if (seen.has(item.title)) return;
            if (!isFootballArticle(item.title, item.description || "")) return;
            seen.add(item.title);
            const league = guessLeague(item.title, item.description || "", feed.league);
            allArticles.push({
              id: item.guid || item.link,
              title: item.title,
              summary: stripHtml(item.description || "").slice(0, 200),
              link: item.link,
              thumbnail: item.thumbnail || item.enclosure?.link || null,
              pubDate: item.pubDate,
              source: feed.source,
              league,
              color: LEAGUES.find(l => l.code === league)?.color || "#fff",
            });
          });
        } catch(e) {}
      })
    );

    allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    if (allArticles.length === 0) setError("Could not load news feeds. Try refreshing.");
    setArticles(allArticles);
    setLoading(false);
  }, []);

  useEffect(() => { fetchNews(); }, []);

  const filtered = articles.filter(a => {
    const leagueMatch = activeLeague === "all" || a.league === activeLeague;
    const searchMatch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.summary.toLowerCase().includes(search.toLowerCase());
    return leagueMatch && searchMatch;
  });

  const featured = filtered.slice(0, 2);
  const rest = filtered.slice(2);
  const tickerItems = articles.slice(0, 12).map(a => ({ title:a.title, source:a.source, color:a.color }));

  return (
    <div style={{minHeight:"100vh",background:"#08090e",color:"#f0f4ff",fontFamily:"'Inter','Sora',sans-serif"}}>
      <style>{CSS}</style>
      {tickerItems.length > 0 && <LiveTicker items={tickerItems}/>}
      <div style={{maxWidth:1400,margin:"0 auto",padding:"28px 20px 60px"}}>

        {/* HEADER */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:16,marginBottom:28}}>
          <div>
            <div style={{fontSize:9,fontWeight:900,letterSpacing:".2em",color:"rgba(255,255,255,.3)",marginBottom:6}}>STATINSITE · FOOTBALL INTELLIGENCE</div>
            <h1 style={{margin:"0 0 6px",fontSize:30,fontWeight:900,letterSpacing:"-.02em",
              background:"linear-gradient(135deg,#fff,rgba(255,255,255,.6))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              News & Analysis
            </h1>
            <p style={{margin:0,fontSize:12,color:"rgba(255,255,255,.4)",fontWeight:600}}>
              Live football news · Sky Sports · BBC Sport · Goal.com · EPL · La Liga · Serie A · Ligue 1 · UCL
            </p>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{position:"relative"}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search news..."
                style={{background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,
                  padding:"8px 12px 8px 32px",fontSize:12,color:"#f0f4ff",outline:"none",width:200}}
                onFocus={e=>e.target.style.borderColor="rgba(255,255,255,.25)"}
                onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.1)"}/>
              <svg style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",opacity:.4}} width={13} height={13} viewBox="0 0 16 16" fill="none">
                <circle cx="6" cy="6" r="5" stroke="white" strokeWidth="1.5"/>
                <path d="M10 10L14 14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <button onClick={fetchNews} disabled={loading} style={{display:"flex",alignItems:"center",gap:7,padding:"8px 16px",borderRadius:8,fontSize:11,fontWeight:800,cursor:"pointer",
              background:loading?"rgba(255,255,255,.05)":"rgba(77,127,255,.15)",border:`1px solid ${loading?"rgba(255,255,255,.1)":"rgba(77,127,255,.4)"}`,color:loading?"rgba(255,255,255,.3)":"#4d7fff"}}>
              <svg width={12} height={12} viewBox="0 0 16 16" fill="none" style={{animation:loading?"ntSpin 1s linear infinite":"none"}}>
                <path d="M13.5 2.5A6.5 6.5 0 1 0 14 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M13.5 2.5V6H10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {loading ? "Loading..." : "Refresh"}
            </button>
            <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:"rgba(40,217,122,.07)",border:"1px solid rgba(40,217,122,.2)",borderRadius:999}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:"#28d97a",animation:"ntPulse 1.8s ease-in-out infinite"}}/>
              <span style={{fontSize:9,fontWeight:800,color:"#28d97a",letterSpacing:".1em"}}>LIVE</span>
            </div>
          </div>
        </div>

        {/* LEAGUE FILTER */}
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:24,paddingBottom:16,borderBottom:"1px solid rgba(255,255,255,.06)"}}>
          {LEAGUES.map(l=>(
            <button key={l.code} onClick={()=>setActiveLeague(l.code)} style={{
              display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:999,fontSize:11,fontWeight:800,cursor:"pointer",
              background:activeLeague===l.code?`${l.color}18`:"rgba(255,255,255,.04)",
              border:`1.5px solid ${activeLeague===l.code?l.color:"rgba(255,255,255,.1)"}`,
              color:activeLeague===l.code?l.color:"rgba(255,255,255,.45)",transition:"all .15s"}}>
              {l.code!=="all" && l.flag}{l.label}
            </button>
          ))}
        </div>

        {error && <div style={{padding:"16px 18px",background:"rgba(255,77,109,.08)",border:"1px solid rgba(255,77,109,.2)",borderRadius:10,color:"#ff4d6d",fontSize:12,marginBottom:20}}>⚠ {error}</div>}

        {loading && (
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
              {[...Array(8)].map((_,i)=><SkeletonCard key={i}/>)}
            </div>
            <div style={{textAlign:"center",marginTop:20,fontSize:12,color:"rgba(255,255,255,.3)"}}>Loading live news from Sky Sports, BBC Sport & Goal.com...</div>
          </div>
        )}

        {!loading && filtered.length === 0 && !error && (
          <div style={{textAlign:"center",padding:60,color:"rgba(255,255,255,.3)",fontSize:14}}>No articles match your filters.</div>
        )}

        {!loading && filtered.length > 0 && (
          <div>
            {featured.length > 0 && (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(420px,1fr))",gap:16,marginBottom:16}}>
                {featured.map(a=><ArticleCard key={a.id} article={a} featured/>)}
              </div>
            )}
            {rest.length > 0 && (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
                {rest.map(a=><ArticleCard key={a.id} article={a}/>)}
              </div>
            )}
          </div>
        )}

        {!loading && articles.length > 0 && (
          <div style={{marginTop:40,paddingTop:20,borderTop:"1px solid rgba(255,255,255,.06)",display:"flex",gap:16,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:10,color:"rgba(255,255,255,.2)",fontWeight:700,letterSpacing:".1em"}}>SOURCES</span>
            {["Sky Sports","BBC Sport","Goal.com"].map(s=>(
              <span key={s} style={{fontSize:10,color:"rgba(255,255,255,.35)",padding:"3px 10px",borderRadius:999,border:"1px solid rgba(255,255,255,.08)"}}>{s}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}