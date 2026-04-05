// pages/MatchCentrePage.jsx  — StatinSite Match Centre v1
// Three-column command centre: Left = live/upcoming, Centre = selected match deep-dive, Right = intel rail
// Sits alongside existing LivePage and PredictionsPage — no replacements

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getLeaguePredictions } from "../api/api";

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */
const BACKEND = import.meta.env.VITE_BACKEND_URL || "https://footballstats-production-ecd9.up.railway.app";

const COMP_COLORS = {
  epl:"#60a5fa", laliga:"#f97316", bundesliga:"#f59e0b",
  seriea:"#e2e8e4", ligue1:"#a78bfa",
  ucl:"#818cf8", uel:"#fb923c", uecl:"#4ade80", facup:"#f87171",
};

const COMP_LABELS = {
  epl:"Premier League", laliga:"La Liga", bundesliga:"Bundesliga",
  seriea:"Serie A", ligue1:"Ligue 1",
  ucl:"Champions League", uel:"Europa League", uecl:"Conference League", facup:"FA Cup",
};

const AF = "https://media.api-sports.io/football/leagues/";
const COMP_LOGOS = {
  epl:`${AF}39.png`, laliga:`${AF}140.png`, bundesliga:`${AF}78.png`,
  seriea:`${AF}135.png`, ligue1:`${AF}61.png`,
  ucl:`${AF}2.png`, uel:`${AF}3.png`, uecl:`${AF}848.png`, facup:`${AF}45.png`,
};

const COMPS = [
  { code:"epl",        group:"domestic"  },
  { code:"laliga",     group:"domestic"  },
  { code:"bundesliga", group:"domestic"  },
  { code:"seriea",     group:"domestic"  },
  { code:"ligue1",     group:"domestic"  },
  { code:"ucl",        group:"european"  },
  { code:"uel",        group:"european"  },
  { code:"uecl",       group:"european"  },
  { code:"facup",      group:"cup"       },
];

const GROUPS = ["domestic","european","cup"];
const GROUP_LABELS = { domestic:"Domestic", european:"European", cup:"Cup" };

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
function poisson(lam,k){let r=Math.exp(-lam);for(let i=0;i<k;i++)r*=lam/(i+1);return r;}
function buildProbs(xgH,xgA){
  let pH=0,pD=0,pA=0,topScore="1-0",topP=0;
  for(let h=0;h<=6;h++)for(let a=0;a<=6;a++){
    const p=poisson(xgH,h)*poisson(xgA,a);
    if(h>a)pH+=p;else if(h===a)pD+=p;else pA+=p;
    if(p>topP){topP=p;topScore=`${h}-${a}`;}
  }
  const tot=pH+pD+pA||1;
  return{pH:pH/tot,pD:pD/tot,pA:pA/tot,topScore};
}
function fmtDate(raw){
  if(!raw||raw==="TBD")return{day:"TBD",time:""};
  try{
    const d=new Date(raw);
    return{
      day:d.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"}),
      time:raw.includes("T")?raw.split("T")[1]?.slice(0,5)||"":"",
    };
  }catch{return{day:"",time:""};}
}
function parseForm(raw){
  if(Array.isArray(raw))return raw.filter(c=>"WDL".includes(c));
  return String(raw||"").split("").filter(c=>"WDL".includes(c));
}
function timeAgo(ts){
  if(!ts)return"";
  const m=Math.floor((Date.now()-new Date(ts))/60000);
  if(m<1)return"just now";if(m<60)return m+"m ago";
  if(m<1440)return Math.floor(m/60)+"h ago";
  return Math.floor(m/1440)+"d ago";
}

/* ─────────────────────────────────────────────────────────────
   SMALL COMPONENTS
───────────────────────────────────────────────────────────── */
function LiveDot(){
  return(
    <span style={{position:"relative",display:"inline-flex",width:8,height:8,flexShrink:0}}>
      <span style={{position:"absolute",inset:0,borderRadius:"50%",background:"#ef4444",animation:"mcPulse 1.4s ease infinite"}}/>
      <span style={{position:"relative",width:8,height:8,borderRadius:"50%",background:"#ef4444"}}/>
    </span>
  );
}

function FormPip({r}){
  const c=r==="W"?"#34d399":r==="D"?"#f59e0b":"#f87171";
  return(
    <div style={{width:18,height:18,borderRadius:4,background:`${c}15`,border:`1px solid ${c}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:c,flexShrink:0}}>{r}</div>
  );
}

function TeamBadge({src,size=32}){
  const [err,setErr]=useState(false);
  return(
    <div style={{width:size,height:size,borderRadius:8,background:"rgba(255,255,255,.05)",border:"0.5px solid rgba(255,255,255,.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,padding:4}}>
      {src&&!err
        ?<img src={src} style={{width:size-10,height:size-10,objectFit:"contain"}} onError={()=>setErr(true)} alt=""/>
        :<div style={{width:size-14,height:size-14,borderRadius:4,background:"rgba(255,255,255,.08)"}}/>}
    </div>
  );
}

function Skel({h=14,w="100%",r=6}){
  return<div style={{height:h,width:w,borderRadius:r,background:"linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%)",backgroundSize:"200% 100%",animation:"mcShimmer 1.6s infinite"}}/>;
}

function SectionLabel({children,accent,action,onAction}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
      <div style={{width:2,height:14,borderRadius:2,background:accent||"rgba(255,255,255,.3)",flexShrink:0}}/>
      <span style={{fontSize:10,fontWeight:800,color:"rgba(255,255,255,.5)",letterSpacing:"0.1em",textTransform:"uppercase",flex:1}}>{children}</span>
      {action&&<button onClick={onAction} style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,.3)",background:"none",border:"none",cursor:"pointer",letterSpacing:"0.06em"}}>{action}</button>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SCROLLING TICKER
───────────────────────────────────────────────────────────── */
function IntelTicker(){
  const [items,setItems]=useState([]);
  useEffect(()=>{
    fetch(BACKEND+"/api/intelligence/ticker")
      .then(r=>r.ok?r.json():null)
      .then(d=>{if(d?.items)setItems(d.items);})
      .catch(()=>{});
  },[]);
  if(!items.length)return null;
  const COLORS={green:"#34d399",red:"#f87171",blue:"#60a5fa",amber:"#fbbf24"};
  return(
    <div style={{borderBottom:"0.5px solid rgba(255,255,255,.08)",background:"#000",overflow:"hidden",height:34,display:"flex",alignItems:"center",flexShrink:0}}>
      <div style={{flexShrink:0,padding:"0 14px",borderRight:"0.5px solid rgba(255,255,255,.08)",height:"100%",display:"flex",alignItems:"center"}}>
        <span style={{fontSize:9,fontWeight:800,color:"rgba(255,255,255,.35)",letterSpacing:"0.12em"}}>INTEL</span>
      </div>
      <div style={{flex:1,overflow:"hidden",position:"relative"}}>
        <div style={{display:"flex",gap:40,whiteSpace:"nowrap",animation:"mcTicker 50s linear infinite"}}>
          {[...items,...items].map((item,i)=>{
            const c=COLORS[item.color]||"rgba(255,255,255,.45)";
            return(
              <span key={i} style={{fontSize:11,fontWeight:500,color:c,display:"inline-flex",alignItems:"center",gap:7,flexShrink:0}}>
                <span style={{width:4,height:4,borderRadius:"50%",background:c,display:"inline-block",flexShrink:0}}/>
                {item.text}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   LEFT PANEL — live match card
───────────────────────────────────────────────────────────── */
function LiveMatchCard({match,selected,onClick}){
  const [hov,setHov]=useState(false);
  const accent="#ef4444";
  return(
    <div
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      onClick={onClick}
      style={{
        background:selected?"rgba(239,68,68,.06)":hov?"rgba(255,255,255,.04)":"rgba(255,255,255,.02)",
        border:`0.5px solid ${selected?"rgba(239,68,68,.4)":hov?"rgba(255,255,255,.16)":"rgba(255,255,255,.08)"}`,
        borderLeft:`2.5px solid ${selected?"#ef4444":hov?"rgba(239,68,68,.5)":"rgba(239,68,68,.25)"}`,
        borderRadius:10,padding:"11px 12px",cursor:"pointer",
        transition:"all .15s ease",marginBottom:5,
      }}
    >
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <LiveDot/>
          <span style={{fontSize:10,fontWeight:700,color:"#ef4444",letterSpacing:"0.04em"}}>{match.minute||"LIVE"}</span>
        </div>
        {match.competition&&(
          <span style={{fontSize:9,color:"rgba(255,255,255,.3)",fontWeight:600}}>{match.competition}</span>
        )}
      </div>
      {/* Teams + score */}
      <div style={{display:"flex",flexDirection:"column",gap:5}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:7,minWidth:0,flex:1}}>
            <TeamBadge src={match.home_logo} size={26}/>
            <span style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,.88)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{match.home_team}</span>
          </div>
          <span style={{fontSize:18,fontWeight:700,color:"#fff",fontFamily:"'JetBrains Mono',monospace",flexShrink:0,minWidth:24,textAlign:"right"}}>{match.home_score??"-"}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:7,minWidth:0,flex:1}}>
            <TeamBadge src={match.away_logo} size={26}/>
            <span style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,.55)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{match.away_team}</span>
          </div>
          <span style={{fontSize:18,fontWeight:700,color:"rgba(255,255,255,.55)",fontFamily:"'JetBrains Mono',monospace",flexShrink:0,minWidth:24,textAlign:"right"}}>{match.away_score??"-"}</span>
        </div>
      </div>
      {/* xG footnote if available */}
      {(match.xg_home||match.xg_away)&&(
        <div style={{marginTop:7,paddingTop:7,borderTop:"0.5px solid rgba(255,255,255,.06)",display:"flex",gap:10,fontSize:9,color:"rgba(255,255,255,.3)",fontWeight:600}}>
          <span>xG {parseFloat(match.xg_home||0).toFixed(1)} – {parseFloat(match.xg_away||0).toFixed(1)}</span>
          {match.pred_home_win&&<span>Pre-match: {Math.round((match.pred_home_win||0)*100)}%</span>}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   LEFT PANEL — upcoming prediction card
───────────────────────────────────────────────────────────── */
function UpcomingCard({match,selected,onClick,accentColor}){
  const [hov,setHov]=useState(false);
  const hp=match.p_home_win||0,dp=match.p_draw||0,ap=match.p_away_win||0;
  const tot=hp+dp+ap||1;
  const hPct=Math.round(hp/tot*100),dPct=Math.round(dp/tot*100),aPct=Math.round(ap/tot*100);
  const {day,time}=fmtDate(match.date);
  const conf=Math.round(match.confidence||0);
  const confC=conf>=70?"#34d399":conf>=50?"#f59e0b":"#f87171";
  const acc=accentColor||"rgba(255,255,255,.3)";

  return(
    <div
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      onClick={onClick}
      style={{
        background:selected?`${acc}08`:hov?"rgba(255,255,255,.04)":"rgba(255,255,255,.02)",
        border:`0.5px solid ${selected?`${acc}45`:hov?"rgba(255,255,255,.16)":"rgba(255,255,255,.08)"}`,
        borderLeft:`2.5px solid ${selected?acc:hov?`${acc}60`:`${acc}25`}`,
        borderRadius:10,padding:"10px 12px",cursor:"pointer",
        transition:"all .15s ease",marginBottom:5,
      }}
    >
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          {time&&<span style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.4)"}}>{time}</span>}
          {day&&<span style={{fontSize:9,color:"rgba(255,255,255,.22)",fontWeight:500}}>{day}</span>}
        </div>
        {conf>0&&<div style={{width:5,height:5,borderRadius:"50%",background:confC}} title={`${conf}% confidence`}/>}
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
        <div style={{display:"flex",alignItems:"center",gap:6,flex:1,minWidth:0}}>
          <TeamBadge src={match.home_logo} size={24}/>
          <span style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,.88)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{match.home_team}</span>
        </div>
        <span style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,.8)",fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>{hPct}<span style={{fontSize:9,fontWeight:400,color:"rgba(255,255,255,.3)"}}>%</span></span>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
        <div style={{display:"flex",alignItems:"center",gap:6,flex:1,minWidth:0}}>
          <TeamBadge src={match.away_logo} size={24}/>
          <span style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,.45)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{match.away_team}</span>
        </div>
        <span style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,.4)",fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>{aPct}<span style={{fontSize:9,fontWeight:400,color:"rgba(255,255,255,.2)"}}>%</span></span>
      </div>
      {/* Tri-bar */}
      <div style={{display:"flex",height:3,borderRadius:999,overflow:"hidden",gap:"1px"}}>
        <div style={{flex:hPct,background:`${acc}cc`,borderRadius:999,minWidth:4,transition:"flex .4s"}}/>
        <div style={{flex:dPct,background:"rgba(255,255,255,.18)",minWidth:2}}/>
        <div style={{flex:aPct,background:"rgba(255,255,255,.3)",borderRadius:999,minWidth:4,transition:"flex .4s"}}/>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CENTRE PANEL — match detail (shows when a match is selected)
───────────────────────────────────────────────────────────── */
function CentreDetail({match,isLive,accentColor,navigate,onCompChange}){
  const [tab,setTab]=useState("overview");

  // Fix 4: Reset tab to overview whenever the selected match changes
  useEffect(()=>{ setTab("overview"); },[match]);

  const hp=match.p_home_win||0,dp=match.p_draw||0,ap=match.p_away_win||0;
  const tot=hp+dp+ap||1;
  const hPct=Math.round(hp/tot*100),dPct=Math.round(dp/tot*100),aPct=Math.round(ap/tot*100);
  const xgH=parseFloat(match.xg_home)||0, xgA=parseFloat(match.xg_away)||0;
  const conf=Math.round(match.confidence||0);
  const confC=conf>=70?"#34d399":conf>=50?"#f59e0b":"#f87171";
  const fav=hPct>aPct+8?"home":aPct>hPct+8?"away":null;
  const {topScore}=buildProbs(Math.max(xgH,0.8),Math.max(xgA,0.7));
  const hForm=parseForm(match.home_form).slice(-5);
  const aForm=parseForm(match.away_form).slice(-5);
  const fc=r=>r==="W"?"#34d399":r==="D"?"#f59e0b":"#f87171";
  const btts=Math.round((match.btts>1?match.btts:match.btts*100)||0);
  const o25=Math.round((match.over_2_5>1?match.over_2_5:match.over_2_5*100)||0);
  const {day,time}=fmtDate(match.date);
  const acc=accentColor||"rgba(255,255,255,.5)";
  const ringCirc=2*Math.PI*20;
  const ringDash=(conf/100)*ringCirc;

  const StatBar=({label,hv,av,isXg=false,fmt})=>{
    const hv_=parseFloat(hv)||0, av_=parseFloat(av)||0, tot_=hv_+av_||1;
    return(
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
          <span style={{fontSize:14,fontWeight:700,color:"#fff"}}>{fmt?fmt(hv_):isXg?hv_.toFixed(2):Math.round(hv_)}</span>
          <span style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,.3)",letterSpacing:"0.08em",textTransform:"uppercase"}}>{label}</span>
          <span style={{fontSize:14,fontWeight:700,color:"rgba(255,255,255,.45)"}}>{fmt?fmt(av_):isXg?av_.toFixed(2):Math.round(av_)}</span>
        </div>
        <div style={{height:4,borderRadius:999,background:"rgba(255,255,255,.07)",overflow:"hidden",display:"flex"}}>
          <div style={{flex:hv_/tot_,background:`${acc}cc`,minWidth:4,borderRadius:"999px 0 0 999px",transition:"flex .6s ease"}}/>
          <div style={{flex:av_/tot_,background:"rgba(255,255,255,.25)",minWidth:4,borderRadius:"0 999px 999px 0",transition:"flex .6s ease"}}/>
        </div>
      </div>
    );
  };

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      {/* ── sticky header ── */}
      <div style={{background:"rgba(0,0,0,.95)",backdropFilter:"blur(20px)",borderBottom:"0.5px solid rgba(255,255,255,.08)",padding:"16px 20px",flexShrink:0}}>

        {/* League + date */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          {match.competition&&<span style={{fontSize:9,fontWeight:700,color:acc,letterSpacing:"0.08em",textTransform:"uppercase"}}>{match.competition||match.league_name}</span>}
          {isLive?(
            <div style={{display:"flex",alignItems:"center",gap:4,background:"rgba(239,68,68,.12)",border:"0.5px solid rgba(239,68,68,.3)",borderRadius:6,padding:"2px 8px"}}>
              <LiveDot/><span style={{fontSize:9,fontWeight:800,color:"#ef4444",letterSpacing:"0.06em"}}>{match.minute||"LIVE"}</span>
            </div>
          ):(
            <span style={{fontSize:10,color:"rgba(255,255,255,.3)"}}>{day} {time}</span>
          )}
        </div>

        {/* Teams VS block */}
        <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:12,alignItems:"center",marginBottom:14}}>
          {/* Home */}
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <TeamBadge src={match.home_logo} size={44}/>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:"#fff",letterSpacing:"-.02em"}}>{match.home_team}</div>
                {fav==="home"&&<div style={{fontSize:8,fontWeight:800,color:"#34d399",letterSpacing:"0.1em",marginTop:2}}>FAVOURITE</div>}
              </div>
            </div>
            <div style={{display:"flex",gap:3}}>{hForm.map((r,i)=><FormPip key={i} r={r}/>)}</div>
            {isLive
              ?<div style={{fontSize:32,fontWeight:800,color:"#fff",letterSpacing:"-.04em",lineHeight:1,fontFamily:"'JetBrains Mono',monospace"}}>{match.home_score??0}</div>
              :<div style={{fontSize:28,fontWeight:800,color:"#fff",letterSpacing:"-.03em",lineHeight:1}}>{hPct}<span style={{fontSize:14,fontWeight:400,color:"rgba(255,255,255,.35)"}}>%</span></div>
            }
            {xgH>0&&<div style={{fontSize:10,color:"rgba(255,255,255,.3)"}}>xG {xgH.toFixed(2)}</div>}
          </div>

          {/* Centre */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
            {/* Confidence ring */}
            {conf>0&&(
              <div style={{position:"relative",width:48,height:48}}>
                <svg width="48" height="48" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="4"/>
                  <circle cx="24" cy="24" r="20" fill="none" stroke={confC} strokeWidth="4"
                    strokeDasharray={`${ringDash} ${ringCirc-ringDash}`}
                    strokeLinecap="round" transform="rotate(-90 24 24)"
                    style={{transition:"stroke-dasharray .8s ease"}}/>
                </svg>
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:confC}}>{conf}%</div>
              </div>
            )}
            {isLive
              ?<div style={{fontSize:12,color:"rgba(255,255,255,.35)",letterSpacing:"0.08em"}}>LIVE</div>
              :<>
                <div style={{fontSize:20,fontWeight:700,color:"rgba(255,255,255,.85)",letterSpacing:"0.03em"}}>{topScore}</div>
                <div style={{fontSize:8,color:"rgba(255,255,255,.25)",letterSpacing:"0.1em",textTransform:"uppercase"}}>projected</div>
              </>
            }
            {/* Tri-bar */}
            {!isLive&&(
              <div style={{display:"flex",height:3,borderRadius:999,overflow:"hidden",gap:"1px",width:64}}>
                <div style={{flex:hPct,background:`${acc}cc`,minWidth:4,borderRadius:999,transition:"flex .6s"}}/>
                <div style={{flex:dPct,background:"rgba(255,255,255,.18)",minWidth:2}}/>
                <div style={{flex:aPct,background:"rgba(255,255,255,.35)",minWidth:4,borderRadius:999,transition:"flex .6s"}}/>
              </div>
            )}
            {!isLive&&<div style={{fontSize:9,color:"rgba(255,255,255,.28)"}}>D {dPct}%</div>}
          </div>

          {/* Away */}
          <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexDirection:"row-reverse"}}>
              <TeamBadge src={match.away_logo} size={44}/>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:15,fontWeight:700,color:"#fff",letterSpacing:"-.02em"}}>{match.away_team}</div>
                {fav==="away"&&<div style={{fontSize:8,fontWeight:800,color:"#34d399",letterSpacing:"0.1em",marginTop:2}}>FAVOURITE</div>}
              </div>
            </div>
            <div style={{display:"flex",gap:3,justifyContent:"flex-end"}}>{aForm.map((r,i)=><FormPip key={i} r={r}/>)}</div>
            {isLive
              ?<div style={{fontSize:32,fontWeight:800,color:"rgba(255,255,255,.55)",letterSpacing:"-.04em",lineHeight:1,textAlign:"right",fontFamily:"'JetBrains Mono',monospace"}}>{match.away_score??0}</div>
              :<div style={{fontSize:28,fontWeight:800,color:"rgba(255,255,255,.5)",letterSpacing:"-.03em",lineHeight:1,textAlign:"right"}}>{aPct}<span style={{fontSize:14,fontWeight:400,color:"rgba(255,255,255,.3)"}}>%</span></div>
            }
            {xgA>0&&<div style={{fontSize:10,color:"rgba(255,255,255,.3)",textAlign:"right"}}>xG {xgA.toFixed(2)}</div>}
          </div>
        </div>

        {/* CTA buttons */}
        <div style={{display:"flex",gap:6}}>
          {match.fixture_id&&(
            <button onClick={()=>navigate(`/match/${match.fixture_id}`)}
              style={{flex:1,padding:"8px 12px",background:acc+"22",border:`0.5px solid ${acc}55`,borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:700,color:acc,fontFamily:"'Inter',sans-serif"}}>
              Full Match Page →
            </button>
          )}
          <button onClick={()=>navigate && onCompChange ? onCompChange() : navigate("/predictions/premier-league")}
            style={{flex:1,padding:"8px 12px",background:"rgba(255,255,255,.04)",border:"0.5px solid rgba(255,255,255,.12)",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:700,color:"rgba(255,255,255,.5)",fontFamily:"'Inter',sans-serif"}}>
            All Predictions ↗
          </button>
        </div>
      </div>

      {/* ── tabs ── */}
      <div style={{display:"flex",borderBottom:"0.5px solid rgba(255,255,255,.08)",flexShrink:0,background:"#000"}}>
        {(isLive?[["overview","Overview"],["goals","Goals"],["stats","Stats"]]:
          [["overview","Overview"],["stats","Stats"],["markets","Markets"],["scorelines","Scorelines"]]).map(([id,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            flex:1,padding:"10px 8px",fontSize:11,fontWeight:tab===id?700:500,
            cursor:"pointer",border:"none",background:"transparent",
            color:tab===id?"#fff":"rgba(255,255,255,.32)",
            borderBottom:tab===id?`1.5px solid ${acc}`:"1.5px solid transparent",
            transition:"all .15s",fontFamily:"'Inter',sans-serif",
          }}>{lbl}</button>
        ))}
      </div>

      {/* ── tab content ── */}
      <div style={{flex:1,overflowY:"auto",padding:"18px 20px",scrollbarWidth:"none"}}>

        {/* OVERVIEW */}
        {tab==="overview"&&(
          <div>
            {/* Model signal callout */}
            {(xgH>0||xgA>0)&&(
              <div style={{marginBottom:18,padding:"12px 14px",background:`${acc}08`,border:`0.5px solid ${acc}22`,borderRadius:12,display:"flex",gap:10}}>
                <div style={{width:26,height:26,borderRadius:7,background:`${acc}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><polyline points="2,15 6,9 9.5,12 13,6 18,10" stroke={acc} strokeWidth="1.8" strokeLinecap="round"/></svg>
                </div>
                <div style={{fontSize:12,color:"rgba(255,255,255,.6)",lineHeight:1.6}}>
                  <span style={{display:"block",fontSize:12,color:"#fff",fontWeight:600,marginBottom:2}}>Model signal</span>
                  {fav==="home"
                    ?`${match.home_team?.split(" ").pop()} favoured — xG edge ${xgH.toFixed(2)} vs ${xgA.toFixed(2)}. Model gives ${hPct}% win probability.`
                    :fav==="away"
                    ?`${match.away_team?.split(" ").pop()} favoured away — xG ${xgA.toFixed(2)} vs ${xgH.toFixed(2)}. Model gives ${aPct}% win probability.`
                    :`Even contest — xG ${xgH.toFixed(2)} vs ${xgA.toFixed(2)}. Draw significant at ${dPct}%.`}
                </div>
              </div>
            )}
            {/* Prob grid */}
            {!isLive&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:18}}>
                {[
                  {label:match.home_team?.split(" ").pop()||"Home",val:hPct,color:acc},
                  {label:"Draw",val:dPct,color:"rgba(255,255,255,.4)"},
                  {label:match.away_team?.split(" ").pop()||"Away",val:aPct,color:"rgba(255,255,255,.35)"},
                ].map(({label,val,color})=>(
                  <div key={label} style={{textAlign:"center",background:"rgba(255,255,255,.03)",border:"0.5px solid rgba(255,255,255,.08)",borderRadius:10,padding:"10px 6px"}}>
                    <div style={{fontSize:20,fontWeight:800,color,fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}>{val}<span style={{fontSize:10,fontWeight:400}}>%</span></div>
                    <div style={{fontSize:9,color:"rgba(255,255,255,.3)",marginTop:4,fontWeight:600}}>{label}</div>
                  </div>
                ))}
              </div>
            )}
            {/* Live event log */}
            {isLive&&match.events?.length>0&&(
              <div style={{marginBottom:18}}>
                <SectionLabel accent={acc}>Goal events</SectionLabel>
                {match.events.map((e,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:i<match.events.length-1?"0.5px solid rgba(255,255,255,.05)":"none"}}>
                    <span style={{fontSize:10,fontWeight:700,color:acc,fontFamily:"'JetBrains Mono',monospace",minWidth:28}}>{e.minute}&apos;</span>
                    <span style={{fontSize:11,fontWeight:600,color:e.team==="home"?"rgba(255,255,255,.88)":"rgba(255,255,255,.45)"}}>{e.player}</span>
                    {e.type==="penalty"&&<span style={{fontSize:8,color:"rgba(255,255,255,.3)",background:"rgba(255,255,255,.06)",padding:"1px 5px",borderRadius:4}}>pen</span>}
                    {e.type==="own_goal"&&<span style={{fontSize:8,color:"#f87171",background:"rgba(248,113,113,.08)",padding:"1px 5px",borderRadius:4}}>OG</span>}
                  </div>
                ))}
              </div>
            )}
            {/* Quick key stats */}
            {xgH>0&&<StatBar label="xG" hv={xgH} av={xgA} isXg/>}
            {match.home_shots!=null&&<StatBar label="Shots" hv={match.home_shots} av={match.away_shots}/>}
            {match.home_possession!=null&&<StatBar label="Possession %" hv={match.home_possession} av={match.away_possession} fmt={v=>`${Math.round(v)}%`}/>}
          </div>
        )}

        {/* GOALS (live) */}
        {tab==="goals"&&(
          <div>
            {match.events?.length>0
              ?match.events.map((e,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"0.5px solid rgba(255,255,255,.06)"}}>
                  <div style={{width:36,height:36,borderRadius:8,background:`${acc}12`,border:`0.5px solid ${acc}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:acc,flexShrink:0,fontFamily:"'JetBrains Mono',monospace"}}>{e.minute}&apos;</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:e.team==="home"?"rgba(255,255,255,.88)":"rgba(255,255,255,.5)"}}>{e.player}</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,.3)",marginTop:1}}>{e.type==="penalty"?"Penalty":e.type==="own_goal"?"Own Goal":e.team==="home"?match.home_team:match.away_team}</div>
                  </div>
                </div>
              ))
              :<div style={{textAlign:"center",padding:"40px 0",color:"rgba(255,255,255,.2)",fontSize:12}}>No goals yet</div>
            }
          </div>
        )}

        {/* STATS */}
        {tab==="stats"&&(
          <div>
            {xgH>0&&<StatBar label="Expected Goals (xG)" hv={xgH} av={xgA} isXg/>}
            {!isLive&&<StatBar label="Win Probability" hv={hPct} av={aPct} fmt={v=>`${Math.round(v)}%`}/>}
            {match.home_shots!=null&&<StatBar label="Shots on Target" hv={match.home_shots||0} av={match.away_shots||0}/>}
            {match.home_possession!=null&&<StatBar label="Possession" hv={match.home_possession} av={match.away_possession} fmt={v=>`${Math.round(v)}%`}/>}
            {match.home_corners!=null&&<StatBar label="Corners" hv={match.home_corners} av={match.away_corners}/>}
            {!isLive&&btts>0&&<StatBar label="BTTS" hv={btts} av={100-btts} fmt={v=>`${Math.round(v)}%`}/>}
            {/* Form comparison */}
            <div style={{marginTop:4}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{display:"flex",gap:3}}>{hForm.map((r,i)=><FormPip key={i} r={r}/>)}</div>
                <span style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,.28)",letterSpacing:"0.08em",textTransform:"uppercase"}}>Form</span>
                <div style={{display:"flex",gap:3,flexDirection:"row-reverse"}}>{aForm.map((r,i)=><FormPip key={i} r={r}/>)}</div>
              </div>
            </div>
          </div>
        )}

        {/* MARKETS */}
        {tab==="markets"&&(
          <div>
            {[
              {label:"Home Win",val:hPct,hot:hPct>=58},
              {label:"Draw",val:dPct,hot:dPct>=32},
              {label:"Away Win",val:aPct,hot:aPct>=58},
              ...(btts>0?[{label:"Both Teams Score",val:btts,hot:btts>=55}]:[]),
              ...(o25>0?[{label:"Over 2.5 Goals",val:o25,hot:o25>=55}]:[]),
            ].map(({label,val,hot})=>(
              <div key={label} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <span style={{fontSize:12,color:"rgba(255,255,255,.5)"}}>{label}</span>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    {hot&&<span style={{fontSize:8,fontWeight:700,color:"#34d399",background:"rgba(52,211,153,.1)",borderRadius:999,padding:"1px 7px",letterSpacing:"0.06em"}}>VALUE</span>}
                    <span style={{fontSize:14,fontWeight:700,color:hot?"#fff":"rgba(255,255,255,.5)",fontFamily:"'JetBrains Mono',monospace"}}>{val}%</span>
                  </div>
                </div>
                <div style={{height:4,borderRadius:999,background:"rgba(255,255,255,.07)",overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${val}%`,background:hot?`${acc}cc`:"rgba(255,255,255,.18)",borderRadius:999,transition:"width .8s ease"}}/>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SCORELINES */}
        {tab==="scorelines"&&(
          <div>
            {match.top_scorelines?.length>0
              ?<>
                <div style={{fontSize:10,color:"rgba(255,255,255,.3)",marginBottom:12}}>Model-projected score probabilities (Dixon-Coles · Poisson)</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                  {match.top_scorelines.slice(0,12).map(({score,prob},i)=>{
                    const pct=Math.round((prob>1?prob:prob*100)||0);
                    const isTop=i===0;
                    return(
                      <div key={i} style={{textAlign:"center",padding:"10px 8px",background:isTop?`${acc}10`:"rgba(255,255,255,.02)",border:`0.5px solid ${isTop?`${acc}35`:"rgba(255,255,255,.08)"}`,borderRadius:8}}>
                        <div style={{fontSize:16,fontWeight:700,color:isTop?acc:"rgba(255,255,255,.7)",fontFamily:"'JetBrains Mono',monospace",lineHeight:1,marginBottom:4}}>{score}</div>
                        <div style={{fontSize:10,color:isTop?acc:"rgba(255,255,255,.3)",fontWeight:600}}>{pct}%</div>
                      </div>
                    );
                  })}
                </div>
              </>
              :<div style={{textAlign:"center",padding:"40px 0",color:"rgba(255,255,255,.2)",fontSize:12}}>Scoreline data not available for this match.</div>
            }
          </div>
        )}

      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CENTRE PANEL — empty state (no match selected)
───────────────────────────────────────────────────────────── */
function CentreEmpty(){
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",padding:40,gap:16}}>
      <div style={{width:56,height:56,borderRadius:14,background:"rgba(255,255,255,.04)",border:"0.5px solid rgba(255,255,255,.1)",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
        </svg>
      </div>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:14,fontWeight:600,color:"rgba(255,255,255,.3)",marginBottom:6}}>Select a match</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,.18)",lineHeight:1.6,maxWidth:200}}>Click any match on the left to see xG, probabilities, scorelines and model insights here</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   RIGHT PANEL — intel rail
───────────────────────────────────────────────────────────── */
function IntelRail({articles,transfers,liveAlerts,selectedMatch,accentColor}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10,height:"100%",overflowY:"auto",padding:"14px 14px 20px",scrollbarWidth:"none"}}>

      {/* Live alerts */}
      {liveAlerts?.length>0&&(
        <div>
          <SectionLabel accent="#ef4444">Live alerts</SectionLabel>
          {liveAlerts.map((a,i)=>(
            <div key={i} style={{padding:"8px 10px",background:"rgba(239,68,68,.06)",border:"0.5px solid rgba(239,68,68,.2)",borderRadius:8,marginBottom:5}}>
              <div style={{fontSize:11,fontWeight:700,color:"#ef4444",marginBottom:2}}>{a.title}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,.35)"}}>{a.body}</div>
            </div>
          ))}
        </div>
      )}

      {/* Top confidence */}
      {selectedMatch&&(
        <div>
          <SectionLabel accent={accentColor||"rgba(255,255,255,.3)"}>Match intel</SectionLabel>
          <div style={{padding:"10px 12px",background:"rgba(255,255,255,.03)",border:"0.5px solid rgba(255,255,255,.08)",borderRadius:10,marginBottom:6}}>
            <div style={{fontSize:9,fontWeight:700,color:accentColor||"rgba(255,255,255,.4)",letterSpacing:"0.08em",marginBottom:5}}>DIXON-COLES MODEL</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.6)",lineHeight:1.6}}>
              Poisson goal model using team attack/defence ratings calibrated to the last 38 matches. Probabilities are league-aware and adjusted for home advantage.
            </div>
          </div>
          <div style={{padding:"10px 12px",background:"rgba(255,255,255,.03)",border:"0.5px solid rgba(255,255,255,.08)",borderRadius:10}}>
            <div style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,.3)",letterSpacing:"0.08em",marginBottom:5}}>ELO RATING</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.6)",lineHeight:1.6}}>
              ELO ratings account for result strength and opponent quality. Higher ELO difference = stronger model confidence.
            </div>
          </div>
        </div>
      )}

      {/* Transfer hub */}
      {transfers?.length>0&&(
        <div>
          <SectionLabel accent="#f59e0b">Transfers</SectionLabel>
          {transfers.slice(0,6).map((t,i)=>(
            <a key={i} href={t.url||"#"} target="_blank" rel="noopener noreferrer"
              style={{display:"flex",gap:8,padding:"8px 0",borderBottom:i<5?"0.5px solid rgba(255,255,255,.05)":"none",textDecoration:"none",cursor:"pointer"}}>
              {t.image
                ?<img src={t.image} alt="" style={{width:38,height:30,objectFit:"cover",borderRadius:5,flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>
                :<div style={{width:38,height:30,borderRadius:5,background:"rgba(255,255,255,.05)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2"><path d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4"/></svg>
                </div>}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,.75)",lineHeight:1.4,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{t.headline||t.title}</div>
                <div style={{fontSize:8,color:"rgba(255,255,255,.3)",marginTop:2,fontWeight:600}}>{t.source} · {timeAgo(t.published_at)}</div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* News feed */}
      {articles?.length>0&&(
        <div>
          <SectionLabel accent="rgba(255,255,255,.3)">Intelligence</SectionLabel>
          {articles.slice(0,10).map((a,i)=>(
            <a key={i} href={a.url||"#"} target="_blank" rel="noopener noreferrer"
              style={{display:"flex",gap:8,padding:"8px 0",borderBottom:i<9?"0.5px solid rgba(255,255,255,.05)":"none",textDecoration:"none",alignItems:"flex-start",cursor:"pointer"}}>
              {a.image
                ?<img src={a.image} alt="" style={{width:44,height:34,objectFit:"cover",borderRadius:5,flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>
                :<div style={{width:44,height:34,borderRadius:5,background:"rgba(255,255,255,.04)",flexShrink:0}}/>}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,.7)",lineHeight:1.4,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{a.title||a.headline}</div>
                <div style={{fontSize:8,color:"rgba(255,255,255,.28)",marginTop:2}}>{timeAgo(a.published_at)}{a.type&&` · ${a.type.replace("_"," ")}`}</div>
              </div>
            </a>
          ))}
        </div>
      )}

      {!articles?.length&&!transfers?.length&&(
        <div style={{textAlign:"center",padding:"30px 0",color:"rgba(255,255,255,.18)",fontSize:11}}>Loading intel feed…</div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function MatchCentrePage(){
  const navigate=useNavigate();

  // Competition state
  const [activeGroup,setActiveGroup]=useState("domestic");
  const [activeComp,setActiveComp]=useState("epl");

  // Data state
  const [matches,setMatches]=useState([]);
  const [liveMatches,setLiveMatches]=useState([]);
  const [predLoad,setPredLoad]=useState(true);
  const [liveLoad,setLiveLoad]=useState(true);
  const [articles,setArticles]=useState([]);
  const [transfers,setTransfers]=useState([]);
  const [selectedMatch,setSelectedMatch]=useState(null);
  const [selectedIsLive,setSelectedIsLive]=useState(false);

  const liveRef=useRef(null);

  const accentColor=COMP_COLORS[activeComp]||"rgba(255,255,255,.5)";
  const compLabel=COMP_LABELS[activeComp]||activeComp;

  // ── Fetch predictions when competition changes ──
  useEffect(()=>{
    let cancelled=false;
    setPredLoad(true);
    setSelectedMatch(null);
    setSelectedIsLive(false);
    const cache=(key,fn,setter)=>{
      try{const r=sessionStorage.getItem(key);if(r){const p=JSON.parse(r);if(Date.now()-p.ts<3600000){setter(p.data);setPredLoad(false);return;}}}catch{}
      fn().then(json=>{
        if(cancelled)return;
        const arr=json.predictions||json.data||json||[];
        const a=Array.isArray(arr)?arr:[];
        setter(a);
        try{sessionStorage.setItem(key,JSON.stringify({data:a,ts:Date.now()}));}catch{}
      }).catch(()=>{}).finally(()=>{if(!cancelled)setPredLoad(false);});
    };
    cache("mc_pred_v1_"+activeComp,()=>getLeaguePredictions(activeComp),setMatches);
    return()=>{cancelled=true;};
  },[activeComp]);

  // ── Fetch live matches ── poll every 45s
  const fetchLive=useCallback(()=>{
    fetch(BACKEND+"/api/matches/live")
      .then(r=>r.ok?r.json():null)
      .then(d=>{
        if(d){
          const live=d.matches||d.live||d||[];
          setLiveMatches(Array.isArray(live)?live:[]);
        }
        setLiveLoad(false);
      })
      .catch(()=>setLiveLoad(false));
  },[]);

  useEffect(()=>{
    fetchLive();
    liveRef.current=setInterval(fetchLive,45000);
    return()=>clearInterval(liveRef.current);
  },[fetchLive]);

  // ── Fetch intel feed ──
  useEffect(()=>{
    fetch(BACKEND+"/api/intelligence/feed?limit=40")
      .then(r=>r.ok?r.json():null)
      .then(d=>{
        if(d){
          const items=(d.items||[]);
          const norm=a=>({
            title:a.title||a.headline||"",
            url:a.url||"",
            image:a.image||a.thumbnail||"",
            published_at:a.published_at||a.date||"",
            type:a.type||"news",
            source:a.source||"",
          });
          setArticles(items.filter(a=>a.type!=="transfer").map(norm));
          setTransfers(d.transfer_items||items.filter(a=>a.type==="transfer").map(norm));
        }
      })
      .catch(()=>{});
  },[]);

  // ── Computed data ──
  const compMatches=useMemo(()=>
    [...matches].sort((a,b)=>(b.confidence||0)-(a.confidence||0)),
  [matches]);

  const compLive=useMemo(()=>{
    if(!liveMatches.length)return[];
    // Try to filter live matches by the active comp — not always possible depending on backend
    // Show all live regardless
    return liveMatches;
  },[liveMatches]);

  const hasLive=compLive.length>0;

  const groupComps=COMPS.filter(c=>c.group===activeGroup);

  const SLUG_MAP = {
    epl:"premier-league", laliga:"la-liga", bundesliga:"bundesliga",
    seriea:"serie-a", ligue1:"ligue-1", ucl:"champions-league",
    uel:"europa-league", uecl:"conference-league", facup:"fa-cup",
  };

  return(
    <div style={{height:"100vh",background:"#000",color:"#fff",fontFamily:"'Inter',system-ui,sans-serif",display:"flex",flexDirection:"column",overflow:"hidden"}}>

      <style>{`
        @keyframes mcPulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.6)} }
        @keyframes mcShimmer{ 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes mcTicker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:3px; height:3px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,.12); border-radius:2px; }
        @media (max-width:900px) { .mc-three-col { grid-template-columns: 1fr !important; } .mc-centre,.mc-right { display:none !important; } }
        @media (max-width:600px) { .mc-header-btns { display:none !important; } }
      `}</style>

      {/* ── Page header ── */}
      <div style={{padding:"14px 20px 0",flexShrink:0,borderBottom:"0.5px solid rgba(255,255,255,.08)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              {hasLive&&(
                <div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(239,68,68,.1)",border:"0.5px solid rgba(239,68,68,.25)",borderRadius:6,padding:"3px 9px"}}>
                  <LiveDot/><span style={{fontSize:9,fontWeight:800,color:"#ef4444",letterSpacing:"0.1em"}}>{compLive.length} LIVE</span>
                </div>
              )}
              <span style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.3)"}}>{compLabel}</span>
            </div>
            <h1 style={{fontSize:22,fontWeight:800,color:"#fff",letterSpacing:"-.03em",margin:0,lineHeight:1}}>Match Centre</h1>
          </div>
          <div className="mc-header-btns" style={{display:"flex",gap:6}}>
            <button onClick={()=>navigate("/live")} style={{padding:"7px 13px",background:"rgba(239,68,68,.1)",border:"0.5px solid rgba(239,68,68,.25)",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:700,color:"#ef4444",fontFamily:"'Inter',sans-serif"}}>Live Page ↗</button>
            <button onClick={()=>navigate(`/predictions/${SLUG_MAP[activeComp]||"premier-league"}`)} style={{padding:"7px 13px",background:"rgba(255,255,255,.05)",border:"0.5px solid rgba(255,255,255,.12)",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:700,color:"rgba(255,255,255,.5)",fontFamily:"'Inter',sans-serif"}}>Predictions ↗</button>
          </div>
        </div>

        {/* ── Competition nav ── */}
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
          {/* Group tabs */}
          <div style={{display:"flex",gap:4}}>
            {GROUPS.map(g=>{
              const isActive=g===activeGroup;
              return(
                <button key={g} onClick={()=>setActiveGroup(g)} style={{
                  padding:"5px 12px",borderRadius:6,cursor:"pointer",fontFamily:"'Inter',sans-serif",
                  fontSize:10,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",
                  border:`0.5px solid ${isActive?"rgba(255,255,255,.4)":"rgba(255,255,255,.1)"}`,
                  background:isActive?"rgba(255,255,255,.1)":"transparent",
                  color:isActive?"#fff":"rgba(255,255,255,.38)",transition:"all .13s",
                }}>{GROUP_LABELS[g]}</button>
              );
            })}
          </div>
          {/* Comp pills */}
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {groupComps.map(c=>{
              const isActive=c.code===activeComp;
              const acc=COMP_COLORS[c.code]||"rgba(255,255,255,.5)";
              return(
                <button key={c.code} onClick={()=>setActiveComp(c.code)} style={{
                  display:"flex",alignItems:"center",gap:6,padding:"4px 11px",borderRadius:999,cursor:"pointer",
                  fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:600,
                  background:"rgba(255,255,255,.93)",color:"#111",
                  border:isActive?`2px solid ${acc}`:"2px solid transparent",
                  boxShadow:isActive?`0 0 0 1px ${acc}44`:"none",
                  transition:"all .13s",whiteSpace:"nowrap",
                }}>
                  {COMP_LOGOS[c.code]&&<img src={COMP_LOGOS[c.code]} width={13} height={13} style={{objectFit:"contain",flexShrink:0}} alt="" onError={e=>e.currentTarget.style.display="none"}/>}
                  {COMP_LABELS[c.code]||c.code}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Intelligence ticker ── */}
      <IntelTicker/>

      {/* ── Three column layout — takes ALL remaining height ── */}
      <div className="mc-three-col" style={{flex:1,display:"grid",gridTemplateColumns:"280px 1fr 240px",minHeight:0,overflow:"hidden"}}>

        {/* ═══ LEFT: match list ═══ */}
        <div style={{borderRight:"0.5px solid rgba(255,255,255,.08)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{flex:1,overflowY:"auto",scrollbarWidth:"none"}}>

            {/* Live matches section */}
            {(liveLoad||hasLive)&&(
              <div style={{padding:"12px 12px 0",flexShrink:0}}>
                <SectionLabel accent="#ef4444">
                  {liveLoad?"Checking live…":`Live${compLive.length>0?` · ${compLive.length}`:""}`}
                </SectionLabel>
                {liveLoad
                  ?<><Skel h={80} r={10}/>&nbsp;</>
                  :compLive.length>0
                    ?compLive.map((m,i)=>(
                      <LiveMatchCard
                        key={i} match={m}
                        selected={selectedMatch===m&&selectedIsLive}
                        onClick={()=>{setSelectedMatch(m);setSelectedIsLive(true);}}
                      />
                    ))
                    :<div style={{fontSize:10,color:"rgba(255,255,255,.2)",padding:"4px 0 8px",fontStyle:"italic"}}>No live matches right now</div>
                }
              </div>
            )}

            {/* Divider between live and upcoming */}
            {hasLive&&compMatches.length>0&&(
              <div style={{height:"0.5px",background:"rgba(255,255,255,.07)",margin:"4px 12px"}}/>
            )}

            {/* Upcoming / predictions */}
            <div style={{padding:"12px 12px 20px"}}>
              <SectionLabel accent={accentColor}>
                {predLoad?"Loading…":`${compLabel} · ${compMatches.length} fixtures`}
              </SectionLabel>
              {predLoad
                ?(Array.from({length:6}).map((_,i)=><div key={i} style={{marginBottom:5}}><Skel h={74} r={10}/></div>))
                :compMatches.length===0
                  ?<div style={{fontSize:11,color:"rgba(255,255,255,.2)",padding:"20px 0",textAlign:"center"}}>No fixtures for {compLabel}</div>
                  :compMatches.map((m,i)=>(
                    <UpcomingCard
                      key={(m.home_team||"")+(m.away_team||"")+i}
                      match={m}
                      selected={selectedMatch===m&&!selectedIsLive}
                      accentColor={accentColor}
                      onClick={()=>{setSelectedMatch(m);setSelectedIsLive(false);}}
                    />
                  ))
              }
            </div>
          </div>
        </div>

        {/* ═══ CENTRE: selected match deep-dive ═══ */}
        <div className="mc-centre" style={{borderRight:"0.5px solid rgba(255,255,255,.08)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {selectedMatch
            ?<CentreDetail
                match={selectedMatch}
                isLive={selectedIsLive}
                accentColor={selectedIsLive?"#ef4444":accentColor}
                navigate={navigate}
                onCompChange={()=>navigate(`/predictions/${SLUG_MAP[activeComp]||"premier-league"}`)}
              />
            :<CentreEmpty/>
          }
        </div>

        {/* ═══ RIGHT: intel rail — fully scrollable ═══ */}
        <div className="mc-right" style={{display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"12px 14px 8px",flexShrink:0,borderBottom:"0.5px solid rgba(255,255,255,.06)"}}>
            <SectionLabel accent={accentColor}>Intelligence</SectionLabel>
          </div>
          <div style={{flex:1,overflowY:"auto",scrollbarWidth:"none"}}>
            <IntelRail
              articles={articles}
              transfers={transfers}
              liveAlerts={[]}
              selectedMatch={selectedMatch}
              accentColor={accentColor}
            />
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{borderTop:"0.5px solid rgba(255,255,255,.07)",padding:"0 20px",height:40,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,background:"#000"}}>
        <div style={{display:"flex",alignItems:"center",gap:7,fontSize:12,fontWeight:700,color:"rgba(255,255,255,.4)",letterSpacing:"-.02em"}}>
          <svg width="14" height="14" viewBox="0 0 28 28" fill="none"><rect x="4" y="3" width="14" height="3.5" rx="1.75" fill="#0a84ff"/><rect x="4" y="9" width="10" height="3.5" rx="1.75" fill="#0a84ff" opacity=".65"/><rect x="4" y="15" width="14" height="3.5" rx="1.75" fill="#0a84ff" opacity=".4"/><rect x="4" y="21" width="7" height="3.5" rx="1.75" fill="#0a84ff" opacity=".22"/><rect x="20" y="15" width="3" height="10" rx="1.5" fill="#30d158"/></svg>
          StatinSite
          <span style={{fontSize:10,color:"rgba(255,255,255,.2)",fontWeight:500}}>Match Centre · ELO · Dixon-Coles · xG</span>
        </div>
        <span style={{fontSize:10,color:"rgba(255,255,255,.18)"}}>© {new Date().getFullYear()} StatinSite · Built by Rutej Talati</span>
      </footer>
    </div>
  );
}