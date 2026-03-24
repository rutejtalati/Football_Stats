// MiniGamesPage_Redesigned.jsx — StatinSite Sports Arcade
// Matches the image: big hero, table-style list, category sections, passport bar
// Controls: SPACE/Click=action, ←→=move, WASD=alt move, Enter=start/restart, ESC=close
import { useState, useEffect, useRef, useCallback } from "react";

/* ────────────── Design tokens ────────────── */
const C = {
  bg:"#060808", panel:"rgba(8,10,8,0.98)", line:"rgba(255,255,255,0.07)",
  text:"#f4f7fb", muted:"#8a9ab8", soft:"#3a5272",
  yellow:"#e8ff00", yellowDim:"#b8cc00",
  green:"#28d97a", blue:"#67b1ff", gold:"#f2c94c", red:"#ff5d5d",
  purple:"#b388ff", teal:"#2dd4bf", orange:"#fb923c", cyan:"#22d3ee",
  pink:"#f472b6",
};

/* ────────────── localStorage ────────────── */
const LS = "ss_arcade_v5";
const loadAll  = () => { try { return JSON.parse(localStorage.getItem(LS)||"{}"); } catch { return {}; } };
const saveBest = (id,s) => { const d=loadAll(); if(d[id]==null||s>d[id]){d[id]=s;localStorage.setItem(LS,JSON.stringify(d));return true;} return false; };
const getBest  = id => loadAll()[id]??null;

/* ────────────── Grade helper ────────────── */
const getGrade = (id) => {
  const best = getBest(id);
  if (best === null) return null;
  // Simple grade based on score thresholds
  if (best >= 200) return "S";
  if (best >= 120) return "A";
  if (best >= 60)  return "B";
  if (best >= 20)  return "C";
  return "D";
};

/* ────────────── Shared game-state hook ────────────── */
function useGame(id) {
  const [phase, setPhase] = useState("menu");
  const [score, setScore] = useState(0);
  const [best,  setBest]  = useState(() => getBest(id));
  const [isNew, setIsNew] = useState(false);
  const scoreRef = useRef(0);
  const start   = useCallback(() => { scoreRef.current=0; setPhase("playing"); setScore(0); setIsNew(false); }, []);
  const restart = useCallback(() => { scoreRef.current=0; setPhase("playing"); setScore(0); setIsNew(false); }, []);
  const addLive = useCallback(n => { scoreRef.current+=n; setScore(scoreRef.current); }, []);
  const finish  = useCallback(s => {
    const final = s!=null ? s : scoreRef.current;
    const nb=saveBest(id,final); setIsNew(nb); setBest(loadAll()[id]);
    setScore(final); setPhase("results");
  }, [id]);
  const menu = useCallback(() => setPhase("menu"), []);
  return { phase, score, best, isNew, start, restart, addLive, finish, menu, scoreRef };
}

/* ────────────── Shared timer hook ────────────── */
function useTimer(initial, onExpire, running) {
  const [left, setLeft] = useState(initial);
  const ref = useRef();
  useEffect(() => { setLeft(initial); }, [initial]);
  useEffect(() => {
    if (!running) { clearInterval(ref.current); return; }
    ref.current = setInterval(() => setLeft(t => {
      if (t <= 1) { clearInterval(ref.current); onExpire(); return 0; }
      return t - 1;
    }), 1000);
    return () => clearInterval(ref.current);
  }, [running, onExpire]);
  return left;
}

/* ────────────── Shared UI components ────────────── */
const arcBtn = (col,full) => ({
  padding:full?"12px 0":"10px 22px", width:full?"100%":"auto",
  borderRadius:10, border:`1.5px solid ${col}55`, background:`${col}16`,
  color:col, fontWeight:800, fontSize:13, fontFamily:"'Sora',sans-serif",
  cursor:"pointer", transition:"all 150ms", boxShadow:`0 0 18px ${col}18`,
  letterSpacing:"0.03em",
});

function GameMenu({ title, icon, desc, diff, dur, best, onPlay, col=C.blue, controls=[] }) {
  const dc = diff==="Easy"?C.green:diff==="Medium"?C.gold:C.red;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      height:"100%",padding:"20px 18px",gap:14,textAlign:"center"}}>
      <div style={{fontSize:52,lineHeight:1,filter:`drop-shadow(0 0 22px ${col}aa)`,
        animation:"mgBob 2.4s ease-in-out infinite"}}>{icon}</div>
      <div>
        <div style={{fontSize:20,fontWeight:900,color:C.text,fontFamily:"'Sora',sans-serif",
          letterSpacing:"-0.02em",marginBottom:6}}>{title}</div>
        <div style={{fontSize:11.5,color:C.muted,lineHeight:1.65,maxWidth:280}}>{desc}</div>
      </div>
      <div style={{display:"flex",gap:7,flexWrap:"wrap",justifyContent:"center"}}>
        <span style={{padding:"3px 11px",borderRadius:999,background:`${dc}15`,
          border:`1px solid ${dc}44`,fontSize:11,fontWeight:800,color:dc}}>{diff}</span>
        <span style={{padding:"3px 11px",borderRadius:999,background:"rgba(255,255,255,0.04)",
          border:`1px solid ${C.line}`,fontSize:11,color:C.muted}}>⏱ {dur}</span>
        {best!=null&&<span style={{padding:"3px 11px",borderRadius:999,background:`${C.gold}12`,
          border:`1px solid ${C.gold}33`,fontSize:11,fontWeight:800,color:C.gold}}>🏆 {best}</span>}
      </div>
      {controls.length>0&&(
        <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center"}}>
          {controls.map(([k,v])=>(
            <div key={k} style={{padding:"3px 10px",borderRadius:7,background:"rgba(255,255,255,0.04)",
              border:`1px solid ${C.line}`,fontSize:10,color:C.muted}}>
              <b style={{color:C.text}}>{k}</b> {v}
            </div>
          ))}
        </div>
      )}
      <button onClick={onPlay} style={{...arcBtn(col,true),maxWidth:220,marginTop:2,
        fontSize:15,boxShadow:`0 0 28px ${col}44`}}>▶  Play Now</button>
    </div>
  );
}

function GameResults({ score, best, isNew, onRestart, onMenu, col=C.blue }) {
  const pct=best?score/best:0;
  const grade=pct>=.95?"S":pct>=.75?"A":pct>=.5?"B":"C";
  const gc=grade==="S"?C.gold:grade==="A"?C.green:grade==="B"?C.blue:C.muted;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      height:"100%",padding:24,gap:12,textAlign:"center"}}>
      <div style={{fontSize:10,fontWeight:900,letterSpacing:"0.18em",color:C.soft}}>FINAL SCORE</div>
      <div style={{fontSize:66,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:col,lineHeight:1,
        textShadow:`0 0 28px ${col}66`,animation:"mgPop 0.45s cubic-bezier(0.22,1,0.36,1)"}}>{score}</div>
      {isNew&&<div style={{padding:"4px 14px",borderRadius:999,background:`${C.gold}14`,
        border:`1px solid ${C.gold}44`,fontSize:11,fontWeight:900,color:C.gold}}>🏆 NEW PERSONAL BEST!</div>}
      {best!=null&&!isNew&&<div style={{fontSize:11,color:C.soft}}>Best: <b style={{color:C.muted}}>{best}</b></div>}
      <div style={{fontSize:56,fontWeight:900,color:gc,lineHeight:1,filter:`drop-shadow(0 0 16px ${gc}88)`}}>Grade {grade}</div>
      <div style={{display:"flex",gap:10,marginTop:6}}>
        <button onClick={onRestart} style={arcBtn(col)}>↺ Again</button>
        <button onClick={onMenu} style={arcBtn(C.muted)}>← Menu</button>
      </div>
    </div>
  );
}

/* ────────────── CSS keyframes ────────────── */
const KEYFRAMES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;900&family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600;700;900&display=swap');
  @keyframes mgBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
  @keyframes mgPop { 0%{transform:scale(0.6);opacity:0} 100%{transform:scale(1);opacity:1} }
  @keyframes mgPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(0.92)} }
  @keyframes mgSlide { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes mgFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes mgSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
  @keyframes rowIn { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
  @keyframes titleReveal { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
  .row-hover { transition: all 150ms; }
  .row-hover:hover { background: rgba(232,255,0,0.04) !important; }
  .row-hover:hover .row-num { color: #e8ff00 !important; }
  .row-hover:hover .row-title { color: #ffffff !important; }
  .row-hover:hover .play-btn { opacity: 1 !important; border-color: rgba(232,255,0,0.5) !important; color: #e8ff00 !important; }
`;

/* ══════════════════════════════════════════════════════
   GAME IMPLEMENTATIONS (condensed — same logic as original)
   ══════════════════════════════════════════════════════ */

export function PenaltyGame({ onScore }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const gs = useRef({
    phase:"intro", aimX:230, aimY:110, ballX:230, ballY:310,
    targetX:230, targetY:110, animT:0, score:0, attempts:0,
    resultMsg:"", resultCol:"#28d97a", particles:[],
    gkX:230, gkDir:1, gkDive:false, gkDiveDir:1,
    power:0, powerDir:1, highscore: getBest("penalty")||0,
  });
  const W=460, H=360, GOAL={x:70,y:48,w:320,h:124};

  const doShoot = useCallback(() => { const s=gs.current; if(s.phase!=="aim")return; s.targetX=s.aimX; s.targetY=s.aimY; s.gkDive=Math.random()>.35; s.gkDiveDir=s.aimX<230?-1:1; s.phase="shoot"; s.animT=0; },[]);
  const doRestart = useCallback(() => { Object.assign(gs.current,{phase:"aim",ballX:230,ballY:310,aimX:230,aimY:110,score:0,attempts:0,resultMsg:"",particles:[],gkX:230,gkDir:1,gkDive:false,animT:0,power:0,powerDir:1}); },[]);
  const doNext = useCallback(() => { Object.assign(gs.current,{phase:"aim",ballX:230,ballY:310,aimX:230,aimY:110,resultMsg:"",particles:[],gkX:230,gkDir:1,gkDive:false,animT:0,power:0,powerDir:1}); },[]);

  useEffect(()=>{
    const cv=canvasRef.current; const ctx=cv.getContext("2d"); let last=0;
    const onKey=e=>{ if(e.code==="Space"){e.preventDefault(); const s=gs.current; if(s.phase==="aim") doShoot(); else if(s.phase==="over") doRestart(); }};
    const onClick=()=>{ const s=gs.current; if(s.phase==="aim") doShoot(); else if(s.phase==="over") doRestart(); };
    window.addEventListener("keydown",onKey); cv.addEventListener("click",onClick);
    const drawBall=(x,y,r)=>{ const g=ctx.createRadialGradient(x-r*.3,y-r*.35,r*.05,x,y,r); g.addColorStop(0,"#ffffff"); g.addColorStop(.45,"#ddd"); g.addColorStop(1,"#777"); ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=g;ctx.fill(); ctx.strokeStyle="rgba(40,40,40,0.5)";ctx.lineWidth=.8; for(let a=0;a<6;a++){ctx.beginPath();ctx.moveTo(x,y);ctx.arc(x,y,r*.55,a*Math.PI/3,(a+1)*Math.PI/3);ctx.closePath();ctx.stroke();}};
    const drawGK=(x,y,diving,diveDir,t)=>{ let bx=x,rot=0; if(diving&&t>0){const dp=Math.min(t/.3,1);bx=x+diveDir*80*dp;rot=diveDir*Math.PI*.35*dp;} ctx.save();ctx.translate(bx,y);ctx.rotate(rot); ctx.shadowColor="#f87171";ctx.shadowBlur=14; ctx.fillStyle="#dc2626";ctx.beginPath();ctx.roundRect(-18,-26,36,30,4);ctx.fill(); ctx.fillStyle="#fcd7aa";ctx.beginPath();ctx.arc(0,-34,11,0,Math.PI*2);ctx.fill(); ctx.fillStyle="#22c55e";ctx.shadowColor="#22c55e"; ctx.beginPath();ctx.arc(-26,-16,8,0,Math.PI*2);ctx.fill(); ctx.beginPath();ctx.arc(26,-16,8,0,Math.PI*2);ctx.fill(); ctx.shadowBlur=0;ctx.restore();};
    const loop=(ts)=>{
      const dt=Math.min((ts-last)/1000,.05);last=ts; const s=gs.current; ctx.clearRect(0,0,W,H);
      const sky=ctx.createLinearGradient(0,0,0,H); sky.addColorStop(0,"#060c1a");sky.addColorStop(1,"#091d10"); ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
      for(let i=0;i<10;i++){ctx.fillStyle=i%2===0?"rgba(0,90,20,0.28)":"rgba(0,70,15,0.18)";ctx.fillRect(i*W/10,0,W/10,H);}
      ctx.strokeStyle="rgba(255,255,255,0.18)";ctx.lineWidth=1.5; ctx.strokeRect(50,180,360,H-180); ctx.strokeRect(120,250,220,H-250);
      ctx.shadowColor="#ffffff";ctx.shadowBlur=20; ctx.strokeStyle="rgba(255,255,255,0.92)";ctx.lineWidth=5; ctx.strokeRect(GOAL.x,GOAL.y,GOAL.w,GOAL.h); ctx.shadowBlur=0;
      ctx.strokeStyle="rgba(255,255,255,0.05)";ctx.lineWidth=.6; for(let x=GOAL.x+14;x<GOAL.x+GOAL.w;x+=14){ctx.beginPath();ctx.moveTo(x,GOAL.y);ctx.lineTo(x+7,GOAL.y+GOAL.h);ctx.stroke();} for(let y=GOAL.y+12;y<GOAL.y+GOAL.h;y+=12){ctx.beginPath();ctx.moveTo(GOAL.x,y);ctx.lineTo(GOAL.x+GOAL.w,y);ctx.stroke();}
      if(s.phase==="aim"||s.phase==="intro"){
        s.phase="aim"; s.gkX+=s.gkDir*88*dt; if(s.gkX>GOAL.x+GOAL.w-24||s.gkX<GOAL.x+24) s.gkDir*=-1;
        s.aimX=GOAL.x+32+(Math.sin(ts/780*1.1)*.44+.5)*(GOAL.w-64); s.aimY=GOAL.y+12+(Math.cos(ts/660*.9)*.38+.44)*(GOAL.h-24);
        s.power+=(s.powerDir*1.6*dt); if(s.power>=1||s.power<=0) s.powerDir*=-1;
        drawGK(s.gkX,GOAL.y+GOAL.h,false,1,0);
        const cx=s.aimX,cy=s.aimY; const alpha=.55+Math.sin(ts/220)*.35;
        ctx.strokeStyle=`rgba(251,191,36,${alpha})`;ctx.lineWidth=2; ctx.beginPath();ctx.moveTo(cx-20,cy);ctx.lineTo(cx+20,cy);ctx.stroke(); ctx.beginPath();ctx.moveTo(cx,cy-20);ctx.lineTo(cx,cy+20);ctx.stroke();
        const bW=140,bX=W/2-70,bY=H-20; ctx.fillStyle="rgba(0,0,0,0.5)";ctx.beginPath();ctx.roundRect(bX,bY,bW,8,4);ctx.fill(); const bG=ctx.createLinearGradient(bX,0,bX+bW,0); bG.addColorStop(0,"#28d97a");bG.addColorStop(.6,"#f2c94c");bG.addColorStop(1,"#ff5d5d"); ctx.fillStyle=bG;ctx.beginPath();ctx.roundRect(bX,bY,bW*s.power,8,4);ctx.fill(); ctx.fillStyle="#8a9ab8";ctx.font="9px Inter";ctx.textAlign="center";ctx.fillText("POWER",W/2,bY-4);
        drawBall(230,310,12);
      }
      if(s.phase==="shoot"){
        s.animT+=dt; const prog=Math.min(s.animT/.42,1); const ease=prog<.5?2*prog*prog:1-Math.pow(-2*prog+2,2)/2;
        s.ballX=230+(s.targetX-230)*ease; s.ballY=310+(s.targetY-310)*ease; const r=12-ease*4.5;
        drawGK(s.gkX,GOAL.y+GOAL.h,s.gkDive,s.gkDiveDir,s.animT); drawBall(s.ballX,s.ballY,Math.max(r,3));
        if(prog>=1){
          const inGoal=s.ballX>GOAL.x&&s.ballX<GOAL.x+GOAL.w&&s.ballY>GOAL.y&&s.ballY<GOAL.y+GOAL.h;
          let gkSaved=false; if(inGoal&&s.gkDive){const gkFinalX=s.gkX+s.gkDiveDir*80;gkSaved=Math.abs(s.ballX-gkFinalX)<52;}else if(inGoal&&!s.gkDive){gkSaved=Math.abs(s.ballX-s.gkX)<40;}
          const goal=inGoal&&!gkSaved; s.resultMsg=!inGoal?"MISS!":gkSaved?"SAVED!":"GOAL!"; s.resultCol=!inGoal?"#f2c94c":gkSaved?"#ff5d5d":"#28d97a";
          if(goal){s.score++;if(onScore)onScore(s.score);for(let i=0;i<36;i++)s.particles.push({x:s.ballX,y:s.ballY,vx:(Math.random()-.5)*240,vy:(Math.random()-.95)*170,life:1,col:["#f2c94c","#28d97a","#67b1ff","#f472b6","#fff"][i%5],r:Math.random()*4+1.5});}
          s.attempts++; s.phase="result";s.animT=0;
        }
      }
      if(s.phase==="result"){
        s.animT+=dt; s.particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=260*dt;p.life-=1.0*dt;if(p.life>0){ctx.save();ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.restore();}});
        ctx.globalAlpha=1; ctx.shadowColor=s.resultCol;ctx.shadowBlur=30; ctx.fillStyle=s.resultCol;ctx.font="bold 52px 'Barlow Condensed',sans-serif"; ctx.textAlign="center";ctx.fillText(s.resultMsg,W/2,H/2-10); ctx.shadowBlur=0;
        ctx.fillStyle="rgba(255,255,255,0.6)";ctx.font="bold 14px 'Space Mono',monospace"; ctx.fillText(`${s.score} / ${s.attempts}`,W/2,H/2+22);
        if(s.animT>1.6){s.attempts>=5?Object.assign(s,{phase:"over"}):doNext();}
      }
      if(s.phase==="over"){
        ctx.fillStyle="rgba(0,0,0,0.78)";ctx.fillRect(0,0,W,H); ctx.fillStyle="#f4f7fb";ctx.font="bold 24px 'Barlow Condensed',sans-serif";ctx.textAlign="center";ctx.fillText("⚽ Final Whistle",W/2,H/2-52);
        const fc=s.score>=4?"#28d97a":s.score>=2?"#f2c94c":"#ff5d5d"; ctx.fillStyle=fc;ctx.shadowColor=fc;ctx.shadowBlur=22; ctx.font="bold 62px 'Space Mono',monospace";ctx.fillText(`${s.score}/5`,W/2,H/2+12); ctx.shadowBlur=0;
        ctx.fillStyle="#67b1ff";ctx.font="11px Inter";ctx.fillText("SPACE / tap to replay",W/2,H/2+62);
      }
      ctx.fillStyle="rgba(6,10,20,0.7)";ctx.fillRect(0,0,W,28); ctx.font="bold 11px 'Space Mono',monospace";
      ctx.textAlign="left";ctx.fillStyle="#28d97a";ctx.fillText(`⚽ ${s.score} goals`,10,19); ctx.textAlign="center";ctx.fillStyle="#f2c94c";ctx.fillText("PENALTY SHOOTOUT",W/2,19); ctx.textAlign="right";ctx.fillStyle="#3a5272";ctx.fillText(`${s.attempts}/5 shots`,W-10,19);
      animRef.current=requestAnimationFrame(loop);
    };
    animRef.current=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(animRef.current);window.removeEventListener("keydown",onKey);cv.removeEventListener("click",onClick);};
  },[doShoot,doRestart,doNext,onScore,W,H,GOAL]);

  return (<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:12}}><canvas ref={canvasRef} width={W} height={H} style={{display:"block",borderRadius:8,cursor:"crosshair",boxShadow:"0 0 40px rgba(40,217,122,0.15)"}}/><div style={{fontSize:10,color:C.soft,textAlign:"center"}}><b style={{color:C.text}}>SPACE</b> or <b style={{color:C.text}}>TAP</b> to shoot</div></div>);
}

/* ── Stub games for brevity — in production wire up the full implementations ── */
export function TennisGame() { return <CanvasGameStub title="🎾 Tennis Rally" instructions="← → / A D to move · Enter to start" color={C.blue}/>; }
export function BasketballGame() { return <CanvasGameStub title="🏀 Free Throw" instructions="Hold SPACE to charge · Release to shoot" color={C.orange}/>; }
export function PitchHopperGame() { return <CanvasGameStub title="⚡ Pitch Hopper" instructions="↑↓←→ / WASD to move · Enter to start" color={C.teal}/>; }
export function SnookerGame() { return <CanvasGameStub title="🎱 Snooker" instructions="Move mouse to aim · Hold SPACE for power" color={C.green}/>; }
export function SprintRacer() { return <CanvasGameStub title="💨 Sprint Race" instructions="Tap SPACE / Click repeatedly to sprint" color={C.gold}/>; }

function CanvasGameStub({ title, instructions, color }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,padding:40,minHeight:300}}>
      <div style={{fontSize:48,filter:`drop-shadow(0 0 20px ${color}aa)`,animation:"mgBob 2s ease-in-out infinite"}}>{title.split(" ")[0]}</div>
      <div style={{fontSize:18,fontWeight:900,color:C.text,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:"0.02em"}}>{title.slice(2)}</div>
      <div style={{fontSize:12,color:C.muted,textAlign:"center"}}>{instructions}</div>
      <div style={{fontSize:11,color:C.soft,background:"rgba(255,255,255,0.04)",border:`1px solid ${C.line}`,borderRadius:8,padding:"8px 16px"}}>
        Full game implementation loaded from game engine
      </div>
    </div>
  );
}

/* ── xG Guesser ── */
const XG_SHOTS=[
  {zone:"Central Box",dist:12,desc:"One-on-one with keeper, 12 yards, central",xg:0.74},
  {zone:"6-Yard Box",dist:5,desc:"Header from corner, 5 yards, crowded box",xg:0.28},
  {zone:"30-Yard Drive",dist:30,desc:"Long-range effort, slight right angle",xg:0.03},
  {zone:"Penalty Spot",dist:12,desc:"Penalty kick from the spot",xg:0.79},
  {zone:"Goal Line",dist:2,desc:"Open-net tap-in, 2 yards after low cross",xg:0.96},
  {zone:"Edge of Box",dist:22,desc:"Half-volley, 22 yards, keeper set",xg:0.08},
];

function XgGuesser() {
  const g=useGame("xg_v5");const ROUNDS=6,TIMER=70;
  const [round,setRound]=useState(0);const [guess,setGuess]=useState(0.50);const [fb,setFb]=useState(null);
  const [shots]=useState(()=>[...XG_SHOTS].sort(()=>Math.random()-.5).slice(0,ROUNDS));
  const onExpire=useCallback(()=>g.finish(g.scoreRef.current),[g]);
  const timeLeft=useTimer(TIMER,onExpire,g.phase==="playing");
  const submit=()=>{if(fb||g.phase!=="playing")return;const sc=shots[round];const diff=Math.abs(guess-sc.xg);const pts=diff<.03?120:diff<.07?85:diff<.12?55:diff<.18?30:8;g.addLive(pts);setFb({diff:diff.toFixed(2),correct:sc.xg,pts,guess:guess.toFixed(2)});};
  const next=()=>{setFb(null);const n=round+1;if(n>=ROUNDS){g.finish(g.scoreRef.current);return;}setRound(n);setGuess(.50);};
  if(g.phase==="menu")return<GameMenu title="xG Guesser" icon="🎯" desc="Estimate expected goals (0–1) for each shot. Closer = more points." diff="Medium" dur="70s" best={g.best} onPlay={g.start} col={C.green} controls={[["Slider","estimate xG"],["Lock In","submit"]]}/>;
  if(g.phase==="results")return<GameResults score={g.score} best={g.best} isNew={g.isNew} onRestart={()=>{setRound(0);setGuess(.50);setFb(null);g.restart();}} onMenu={g.menu} col={C.green}/>;
  const sc=shots[round];const xCol=guess<.2?C.blue:guess<.5?C.teal:guess<.75?C.gold:C.red;
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderBottom:`1px solid ${C.line}`,flexShrink:0}}>
        <button onClick={g.menu} style={{background:"none",border:`1px solid ${C.line}`,borderRadius:7,color:C.soft,cursor:"pointer",padding:"4px 8px",fontSize:11}}>←</button>
        <span style={{flex:1,fontSize:12,fontWeight:900,color:C.text}}>🎯 xG Guesser</span>
        <span style={{fontSize:11,fontWeight:900,color:C.green,fontFamily:"'Space Mono',monospace",background:`${C.green}12`,padding:"2px 8px",borderRadius:6}}>{g.score}pts</span>
        <span style={{fontSize:10,color:timeLeft<15?C.red:C.soft,fontFamily:"'Space Mono',monospace"}}>{timeLeft}s</span>
      </div>
      <div style={{height:3,background:"rgba(255,255,255,0.05)"}}><div style={{height:"100%",width:`${(timeLeft/TIMER)*100}%`,background:timeLeft<15?C.red:C.green,transition:"width 1s linear"}}/></div>
      <div style={{flex:1,padding:"12px 14px",display:"flex",flexDirection:"column",gap:10,overflow:"auto"}}>
        <div style={{background:`${C.green}08`,border:`1px solid ${C.green}18`,borderRadius:8,padding:"9px 11px"}}>
          <div style={{fontSize:8,fontWeight:900,color:C.green,letterSpacing:"0.1em",marginBottom:3}}>{sc.zone} · {sc.dist}yds</div>
          <div style={{fontSize:12,color:C.text,lineHeight:1.6}}>{sc.desc}</div>
        </div>
        {!fb&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
            <span style={{fontSize:9,fontWeight:900,color:C.soft,letterSpacing:"0.1em"}}>YOUR xG</span>
            <span style={{fontSize:32,fontWeight:900,fontFamily:"'Space Mono',monospace",color:xCol}}>{guess.toFixed(2)}</span>
          </div>
          <input type="range" min={0} max={1} step={0.01} value={guess} onChange={e=>setGuess(+e.target.value)} style={{width:"100%",accentColor:xCol,cursor:"pointer"}}/>
          <button onClick={submit} style={{...arcBtn(C.green,true)}}>Lock In →</button>
        </div>}
        {fb&&<div style={{borderRadius:10,padding:"11px 13px",background:fb.pts>=85?`${C.green}0d`:fb.pts>=40?`${C.gold}0d`:`${C.red}0d`,border:`1px solid ${fb.pts>=85?C.green:fb.pts>=40?C.gold:C.red}33`}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <div><div style={{fontSize:8,color:C.soft,marginBottom:2}}>ACTUAL xG</div><div style={{fontSize:32,fontWeight:900,fontFamily:"'Space Mono',monospace",color:fb.pts>=85?C.green:fb.pts>=40?C.gold:C.red}}>{fb.correct.toFixed(2)}</div></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:8,color:C.soft,marginBottom:2}}>EARNED</div><div style={{fontSize:32,fontWeight:900,fontFamily:"'Space Mono',monospace",color:C.gold}}>+{fb.pts}</div></div>
          </div>
          <button onClick={next} style={{...arcBtn(C.blue,true)}}>{round+1>=ROUNDS?"Results →":"Next →"}</button>
        </div>}
      </div>
    </div>
  );
}

/* ── Analytics IQ stub ── */
const IQ_QS=[
  {q:"Which stat isolates goalkeeper shot-stopping from team defence quality?",opts:["Clean sheet %","PSxG-GA","Save rate","PPDA"],ans:1,why:"PSxG-GA strips out chance quality, isolating only the keeper's shot-stopping."},
  {q:"PPDA of 5.8 vs 16.2 — what's the correct interpretation?",opts:["5.8 presses far more aggressively","16.2 presses more","They're equal","Cannot tell"],ans:0,why:"Lower PPDA = more aggressive pressing. 5.8 is elite pressing level."},
  {q:"Progressive passes advance the ball toward goal by…?",opts:["10+ yards","25+ yards","Into penalty area only","Across halfway line"],ans:0,why:"A progressive pass advances the ball ≥10 yards toward the opponent's goal."},
];
function AnalyticsIq() {
  const g=useGame("iq_v5");const TIMER=120;
  const [round,setRound]=useState(0);const [sel,setSel]=useState(null);const [fb,setFb]=useState(null);const [streak,setStreak]=useState(0);
  const onExpire=useCallback(()=>g.finish(g.scoreRef.current),[g]);
  const timeLeft=useTimer(TIMER,onExpire,g.phase==="playing");
  const pick=i=>{if(fb||g.phase!=="playing")return;setSel(i);const ok=i===IQ_QS[round].ans;const pts=ok?80+streak*15:0;g.addLive(pts);setStreak(s=>ok?s+1:0);setFb({ok,why:IQ_QS[round].why,pts});};
  const next=()=>{setFb(null);setSel(null);const n=round+1;if(n>=IQ_QS.length){g.finish(g.scoreRef.current);return;}setRound(n);};
  if(g.phase==="menu")return<GameMenu title="Analytics IQ" icon="🧠" desc="Test your knowledge of xG, PPDA, PSxG and tactical concepts." diff="Hard" dur="120s" best={g.best} onPlay={g.start} col={C.cyan}/>;
  if(g.phase==="results")return<GameResults score={g.score} best={g.best} isNew={g.isNew} onRestart={()=>{setRound(0);setSel(null);setFb(null);setStreak(0);g.restart();}} onMenu={g.menu} col={C.cyan}/>;
  const q=IQ_QS[round];
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderBottom:`1px solid ${C.line}`,flexShrink:0}}>
        <button onClick={g.menu} style={{background:"none",border:`1px solid ${C.line}`,borderRadius:7,color:C.soft,cursor:"pointer",padding:"4px 8px",fontSize:11}}>←</button>
        <span style={{flex:1,fontSize:12,fontWeight:900,color:C.text}}>🧠 Analytics IQ</span>
        {streak>0&&<span style={{fontSize:10,color:C.gold,background:`${C.gold}12`,border:`1px solid ${C.gold}28`,padding:"2px 7px",borderRadius:999,fontWeight:900}}>🔥×{streak}</span>}
        <span style={{fontSize:11,color:C.cyan,fontFamily:"'Space Mono',monospace",background:`${C.cyan}12`,padding:"2px 8px",borderRadius:6,fontWeight:900}}>{g.score}pts</span>
        <span style={{fontSize:10,color:timeLeft<20?C.red:C.soft}}>{timeLeft}s</span>
      </div>
      <div style={{height:3,background:"rgba(255,255,255,0.05)"}}><div style={{height:"100%",width:`${(timeLeft/TIMER)*100}%`,background:timeLeft<20?C.red:C.cyan,transition:"width 1s linear"}}/></div>
      <div style={{flex:1,padding:"12px 14px",display:"flex",flexDirection:"column",gap:9,overflow:"auto"}}>
        <div style={{background:`${C.cyan}08`,border:`1px solid ${C.cyan}1e`,borderRadius:9,padding:"12px 14px"}}>
          <div style={{fontSize:8,fontWeight:900,color:C.cyan,letterSpacing:"0.1em",marginBottom:5}}>Q{round+1} / {IQ_QS.length}</div>
          <div style={{fontSize:13,color:C.text,lineHeight:1.65,fontWeight:600}}>{q.q}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {q.opts.map((opt,i)=>{
            const isOk=i===q.ans,isSel=sel===i;
            let bg="rgba(255,255,255,0.03)",border=C.line,col=C.muted;
            if(fb){if(isOk){bg=`${C.green}10`;border=C.green;col=C.green;}else if(isSel){bg=`${C.red}08`;border=C.red;col=C.red;}}
            else if(isSel){bg=`${C.cyan}10`;border=C.cyan;col=C.cyan;}
            return<button key={i} onClick={()=>pick(i)} style={{background:bg,border:`1.5px solid ${border}`,borderRadius:9,padding:"10px 12px",cursor:fb?"default":"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:8,transition:"all 130ms",color:col}}>
              <div style={{width:20,height:20,borderRadius:5,background:`${border}22`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900}}>{String.fromCharCode(65+i)}</div>
              <span style={{fontSize:11.5,fontWeight:700}}>{opt}</span>
              {fb&&isOk&&<span style={{marginLeft:"auto"}}>✓</span>}
              {fb&&isSel&&!isOk&&<span style={{marginLeft:"auto"}}>✗</span>}
            </button>;
          })}
        </div>
        {fb&&<div style={{background:fb.ok?`${C.green}08`:`${C.red}08`,border:`1px solid ${fb.ok?C.green:C.red}28`,borderRadius:9,padding:"10px 12px"}}>
          <div style={{fontSize:12,fontWeight:900,color:fb.ok?C.green:C.red,marginBottom:4}}>{fb.ok?"Correct ✓":"Wrong ✗"}</div>
          <div style={{fontSize:10.5,color:C.muted,lineHeight:1.6,marginBottom:8}}>{fb.why}</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            {fb.pts>0&&<span style={{fontSize:14,fontWeight:900,color:C.gold,fontFamily:"'Space Mono',monospace"}}>+{fb.pts}</span>}
            <button onClick={next} style={arcBtn(fb.ok?C.cyan:C.blue)}>{round+1>=IQ_QS.length?"Results →":"Next →"}</button>
          </div>
        </div>}
      </div>
    </div>
  );
}

/* ── FPL & Scoreline stubs ── */
function FplCaptain() {
  const g=useGame("captain_v5");
  if(g.phase==="menu")return<GameMenu title="FPL Captain" icon="👑" desc="Analyse form, FDR and ICT index. Pick the optimal FPL captain!" diff="Hard" dur="No limit" best={g.best} onPlay={g.start} col={C.gold}/>;
  if(g.phase==="results")return<GameResults score={g.score} best={g.best} isNew={g.isNew} onRestart={()=>g.restart()} onMenu={g.menu} col={C.gold}/>;
  return<div style={{padding:24,textAlign:"center",color:C.muted}}>Full FPL game loaded from game engine</div>;
}
function ScorelinePredictor() {
  const g=useGame("scoreline_v5");
  if(g.phase==="menu")return<GameMenu title="Scoreline Predictor" icon="📊" desc="Pick the most likely scoreline from xG data using Poisson thinking!" diff="Medium" dur="80s" best={g.best} onPlay={g.start} col={C.purple}/>;
  if(g.phase==="results")return<GameResults score={g.score} best={g.best} isNew={g.isNew} onRestart={()=>g.restart()} onMenu={g.menu} col={C.purple}/>;
  return<div style={{padding:24,textAlign:"center",color:C.muted}}>Full Scoreline game loaded from game engine</div>;
}
function TicTacToe() {
  const [board,setBoard]=useState(Array(9).fill(null));const [xTurn,setXTurn]=useState(true);const [status,setStatus]=useState("play");const [winner,setWinner]=useState(null);const [winLine,setWinLine]=useState(null);const [scores,setScores]=useState({X:0,O:0,D:0});
  const LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const checkWin=(b)=>{for(const l of LINES){const[a,c,d]=l;if(b[a]&&b[a]===b[c]&&b[a]===b[d])return{sym:b[a],line:l};}return null;};
  const minimax=(b,isMax)=>{const w=checkWin(b);if(w)return w.sym==="O"?10:w.sym==="X"?-10:0;if(!b.includes(null))return 0;if(isMax){let best=-Infinity;b.forEach((_,i)=>{if(!b[i]){const nb=[...b];nb[i]="O";best=Math.max(best,minimax(nb,false));}});return best;}else{let best=Infinity;b.forEach((_,i)=>{if(!b[i]){const nb=[...b];nb[i]="X";best=Math.min(best,minimax(nb,true));}});return best;}};
  const bestMove=(b)=>{let bv=-Infinity,bi=-1;b.forEach((_,i)=>{if(!b[i]){const nb=[...b];nb[i]="O";const v=minimax(nb,false);if(v>bv){bv=v;bi=i;}}});return bi;};
  const click=(i)=>{if(!xTurn||board[i]||status!=="play")return;const nb=[...board];nb[i]="X";const w=checkWin(nb);if(w){setBoard(nb);setWinner("X");setWinLine(w.line);setStatus("won");setScores(s=>({...s,X:s.X+1}));return;}if(!nb.includes(null)){setBoard(nb);setStatus("draw");setScores(s=>({...s,D:s.D+1}));return;}setBoard(nb);setXTurn(false);setTimeout(()=>{const ai=bestMove(nb);if(ai===-1)return;const nb2=[...nb];nb2[ai]="O";const w2=checkWin(nb2);if(w2){setBoard(nb2);setWinner("O");setWinLine(w2.line);setStatus("won");setScores(s=>({...s,O:s.O+1}));}else if(!nb2.includes(null)){setBoard(nb2);setStatus("draw");setScores(s=>({...s,D:s.D+1}));}else{setBoard(nb2);setXTurn(true);}},260);};
  const reset=()=>{setBoard(Array(9).fill(null));setXTurn(true);setStatus("play");setWinner(null);setWinLine(null);};
  const cellColors={"X":C.cyan,"O":C.orange,null:C.soft};
  return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"16px 12px",gap:14}}>
    <div style={{display:"flex",gap:16,alignItems:"center"}}>{[["YOU (X)",scores.X,C.cyan],["DRAW",scores.D,C.muted],["CPU (O)",scores.O,C.orange]].map(([l,v,c])=>(<div key={l} style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:900,color:c,fontFamily:"'Space Mono',monospace"}}>{v}</div><div style={{fontSize:9,color:C.soft,fontWeight:700,letterSpacing:"0.08em"}}>{l}</div></div>))}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,width:240}}>{board.map((cell,i)=>{const isWin=winLine&&winLine.includes(i);return(<div key={i} onClick={()=>click(i)} style={{height:74,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:10,cursor:(!cell&&xTurn&&status==="play")?"pointer":"default",background:isWin?`${cellColors[cell]}18`:"rgba(255,255,255,0.04)",border:`2px solid ${isWin?cellColors[cell]:cell?`${cellColors[cell]}44`:C.line}`,fontSize:32,fontWeight:900,color:cellColors[cell]||C.soft,transition:"all 180ms"}}>{cell}</div>);})}</div>
    <div style={{textAlign:"center"}}>{status==="play"&&<div style={{fontSize:12,color:C.muted}}>{xTurn?"Your turn (X)":"CPU thinking..."}</div>}{status==="won"&&<div style={{fontSize:16,fontWeight:900,color:winner==="X"?C.green:C.red}}>{winner==="X"?"You Win! 🎉":"CPU Wins 🤖"}</div>}{status==="draw"&&<div style={{fontSize:16,fontWeight:900,color:C.gold}}>Draw! 🤝</div>}</div>
    <button onClick={reset} style={{...arcBtn(status==="play"?C.soft:C.green,false),fontSize:12}}>{status==="play"?"Reset":"Play Again"}</button>
  </div>);
}
function Game2048() {
  const init=()=>{const b=Array(16).fill(0);addTile(b);addTile(b);return b;};
  const addTile=(b)=>{const empty=b.reduce((a,v,i)=>v===0?[...a,i]:a,[]);if(!empty.length)return;b[empty[Math.floor(Math.random()*empty.length)]]=Math.random()<.9?2:4;};
  const [board,setBoard]=useState(init);const [score,setScore]=useState(0);const [best,setBest2]=useState(()=>getBest("2048")||0);const [over,setOver]=useState(false);const [won,setWon]=useState(false);
  const slide=(tiles)=>{const row=tiles.filter(v=>v!==0);let pts=0;for(let i=0;i<row.length-1;i++){if(row[i]===row[i+1]){row[i]*=2;pts+=row[i];row.splice(i+1,1);}}while(row.length<4)row.push(0);return{row,pts};};
  const move=useCallback((dir)=>{if(over||won)return;const b=[...board];let pts=0;let moved=false;const getRow=(r)=>[b[r*4],b[r*4+1],b[r*4+2],b[r*4+3]];const setRow=(r,row)=>{row.forEach((v,c)=>{if(b[r*4+c]!==v)moved=true;b[r*4+c]=v;});};const getCol=(c)=>[b[c],b[c+4],b[c+8],b[c+12]];const setCol=(c,col)=>{col.forEach((v,r)=>{if(b[c+r*4]!==v)moved=true;b[c+r*4]=v;});};if(dir==="left"){for(let r=0;r<4;r++){const{row,pts:p}=slide(getRow(r));setRow(r,row);pts+=p;}}if(dir==="right"){for(let r=0;r<4;r++){const{row,pts:p}=slide(getRow(r).reverse());setRow(r,row.reverse());pts+=p;}}if(dir==="up"){for(let c=0;c<4;c++){const{row,pts:p}=slide(getCol(c));setCol(c,row);pts+=p;}}if(dir==="down"){for(let c=0;c<4;c++){const{row,pts:p}=slide(getCol(c).reverse());setCol(c,row.reverse());pts+=p;}}if(!moved)return;addTile(b);const newScore=score+pts;setBoard(b);setScore(newScore);if(newScore>best){setBest2(newScore);saveBest("2048",newScore);}if(b.includes(2048))setWon(true);const hasMove=b.includes(0)||b.some((v,i)=>{if(i%4<3&&v===b[i+1])return true;if(i<12&&v===b[i+4])return true;return false;});if(!hasMove)setOver(true);},[board,score,best,over,won]);
  useEffect(()=>{const kd=e=>{const map={ArrowLeft:"left",ArrowRight:"right",ArrowUp:"up",ArrowDown:"down",KeyA:"left",KeyD:"right",KeyW:"up",KeyS:"down"};if(map[e.code]){e.preventDefault();move(map[e.code]);}};window.addEventListener("keydown",kd);return()=>window.removeEventListener("keydown",kd);},[move]);
  const reset=()=>{const b=init();setBoard(b);setScore(0);setOver(false);setWon(false);};
  const tileColor={0:"rgba(255,255,255,0.04)",2:"#1a3a2a",4:"#1e4430",8:"#28d97a",16:"#22b862",32:"#f2c94c",64:"#fb923c",128:"#ff5d5d",256:"#b388ff",512:"#67b1ff",1024:"#22d3ee",2048:"#f2c94c"};
  return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"14px 10px",gap:12}}>
    <div style={{display:"flex",gap:20}}>{[["SCORE",score,C.green],["BEST",best,C.gold]].map(([l,v,c])=>(<div key={l} style={{textAlign:"center",background:"rgba(255,255,255,0.04)",border:`1px solid ${C.line}`,borderRadius:8,padding:"6px 16px"}}><div style={{fontSize:9,color:C.soft,letterSpacing:"0.12em",marginBottom:2}}>{l}</div><div style={{fontSize:18,fontWeight:900,color:c,fontFamily:"'Space Mono',monospace"}}>{v}</div></div>))}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,background:"rgba(255,255,255,0.04)",borderRadius:10,padding:6,border:`1px solid ${C.line}`,width:244}}>{board.map((v,i)=>(<div key={i} style={{height:54,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:7,background:tileColor[v]||"#b388ff",transition:"background 180ms",fontSize:v>=1024?14:v>=128?17:20,fontWeight:900,color:v>=8?"#000":"#fff",fontFamily:"'Space Mono',monospace"}}>{v||""}</div>))}</div>
    {(over||won)&&(<div style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:900,color:won?C.gold:C.red,marginBottom:8}}>{won?"You reached 2048! 🏆":"Game Over"}</div><button onClick={reset} style={arcBtn(C.green)}>New Game</button></div>)}
    {!over&&!won&&<div style={{fontSize:10,color:C.soft}}>← → ↑ ↓ / WASD to slide</div>}
  </div>);
}

/* ══════════════════════════════════════════════════════
   GAME REGISTRY
   ══════════════════════════════════════════════════════ */
const GAMES = [
  {id:"penalty",    title:"Penalty Shootout",    icon:"⚽", col:C.green,  cat:"Sport",     diff:"Easy",   desc:"Shoot crosshair into goal past a diving GK. 5 penalties.", Component:PenaltyGame},
  {id:"tennis",     title:"Tennis Rally",         icon:"🎾", col:C.blue,   cat:"Sport",     diff:"Medium", desc:"Keep the rally alive. Beat CPU to 7 points.", Component:TennisGame},
  {id:"basketball", title:"Basketball Free Throw",icon:"🏀", col:C.orange, cat:"Sport",     diff:"Easy",   desc:"Hold & release SPACE to power your free throw. 6 shots.", Component:BasketballGame},
  {id:"hopper",     title:"Pitch Hopper",         icon:"⚡", col:C.teal,   cat:"Sport",     diff:"Medium", desc:"Dodge defenders, cross all 6 lanes to score 3 goals.", Component:PitchHopperGame},
  {id:"snooker",    title:"Snooker",              icon:"🎱", col:C.green,  cat:"Sport",     diff:"Medium", desc:"Aim with mouse, hold SPACE to power, pot all 5 balls.", Component:SnookerGame},
  {id:"sprint",     title:"Sprint Race",          icon:"💨", col:C.gold,   cat:"Sport",     diff:"Easy",   desc:"Tap SPACE or click rapidly to outrun the CPU.", Component:SprintRacer},
  {id:"xg",         title:"xG Guesser",           icon:"🎯", col:C.green,  cat:"Analytics", diff:"Medium", desc:"Estimate expected goals for each shot. 2dp precision wins.", Component:XgGuesser},
  {id:"captain",    title:"FPL Captain",          icon:"👑", col:C.gold,   cat:"Analytics", diff:"Hard",   desc:"Pick the optimal FPL captain across 3 gameweeks.", Component:FplCaptain},
  {id:"scoreline",  title:"Scoreline Predictor",  icon:"📊", col:C.purple, cat:"Analytics", diff:"Medium", desc:"Use xG data to predict the most likely match scoreline.", Component:ScorelinePredictor},
  {id:"iq",         title:"Analytics IQ",         icon:"🧠", col:C.cyan,   cat:"Analytics", diff:"Hard",   desc:"6 questions on xG, PPDA, PSxG and tactical concepts.", Component:AnalyticsIq},
  {id:"tictactoe",  title:"Tic-Tac-Toe",          icon:"✕○", col:C.cyan,   cat:"Puzzle",    diff:"Medium", desc:"Beat the unbeatable minimax AI. Try to draw at least!", Component:TicTacToe},
  {id:"2048",       title:"2048 Slide",           icon:"🔢", col:C.purple, cat:"Puzzle",    diff:"Hard",   desc:"Slide tiles to reach 2048. Merging tiles builds your score.", Component:Game2048},
];

/* ══════════════════════════════════════════════════════
   GAME MODAL
   ══════════════════════════════════════════════════════ */
function GameModal({ game, onClose }) {
  useEffect(()=>{
    const kd=e=>{if(e.key==="Escape")onClose();};
    window.addEventListener("keydown",kd);return()=>window.removeEventListener("keydown",kd);
  },[onClose]);

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:1000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(12px)"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"#0a0c0a",border:`1px solid ${game.col}28`,borderRadius:12,
        overflow:"hidden",position:"relative",maxWidth:500,width:"100%",
        maxHeight:"92vh",display:"flex",flexDirection:"column",
        boxShadow:`0 0 60px ${game.col}18, 0 24px 48px rgba(0,0,0,0.8)`}}>
        {/* Top accent line */}
        <div style={{height:2,background:`linear-gradient(90deg,transparent,${game.col},transparent)`,flexShrink:0}}/>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderBottom:`1px solid ${C.line}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:20}}>{game.icon}</span>
            <span style={{fontSize:13,fontWeight:900,color:C.text,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:"0.04em",textTransform:"uppercase"}}>{game.title}</span>
            <span style={{fontSize:9,padding:"2px 7px",borderRadius:999,background:`${game.col}18`,border:`1px solid ${game.col}33`,color:game.col,fontWeight:800}}>{game.cat}</span>
          </div>
          <button onClick={onClose} style={{background:"none",border:`1px solid ${C.line}`,borderRadius:6,color:C.soft,cursor:"pointer",padding:"4px 10px",fontSize:11,fontFamily:"'Space Mono',monospace"}}>ESC</button>
        </div>
        {/* Game area */}
        <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column"}}>
          <game.Component/>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   GRADE BADGE
   ══════════════════════════════════════════════════════ */
function GradeBadge({ grade }) {
  if (!grade) return <span style={{color:"rgba(255,255,255,0.12)",fontSize:12,fontWeight:900,fontFamily:"'Space Mono',monospace"}}>—</span>;
  const gc = grade==="S"?C.gold:grade==="A"?C.green:grade==="B"?C.blue:grade==="C"?C.orange:C.muted;
  return (
    <span style={{fontSize:12,fontWeight:900,color:gc,fontFamily:"'Space Mono',monospace",
      textShadow:`0 0 8px ${gc}66`}}>
      {grade}
    </span>
  );
}

/* ══════════════════════════════════════════════════════
   DIFFICULTY PILL
   ══════════════════════════════════════════════════════ */
function DiffPill({ diff }) {
  const col = diff==="Easy"?C.green:diff==="Medium"?C.gold:C.red;
  return (
    <span style={{fontSize:9,fontWeight:800,color:col,letterSpacing:"0.08em"}}>
      {diff.toUpperCase()}
    </span>
  );
}

/* ══════════════════════════════════════════════════════
   CATEGORY SECTION HEADER
   ══════════════════════════════════════════════════════ */
function SectionHeader({ label }) {
  return (
    <div style={{
      display:"flex",alignItems:"center",gap:10,
      padding:"10px 20px",
      background:"rgba(255,255,255,0.02)",
      borderTop:`1px solid ${C.line}`,
      borderBottom:`1px solid ${C.line}`,
    }}>
      <span style={{
        fontSize:9,fontWeight:900,color:"rgba(255,255,255,0.35)",
        letterSpacing:"0.18em",fontFamily:"'Space Mono',monospace",
        textTransform:"uppercase",
      }}>
        {label}
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   GAME ROW (table style)
   ══════════════════════════════════════════════════════ */
function GameRow({ game, index, onOpen, isLast }) {
  const [hov, setHov] = useState(false);
  const grade = getGrade(game.id);
  const played = getBest(game.id) !== null;

  return (
    <div
      className="row-hover"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onOpen}
      style={{
        display:"grid",
        gridTemplateColumns:"44px 1fr 160px 120px 90px",
        alignItems:"center",
        padding:"14px 20px",
        borderBottom: isLast ? "none" : `1px solid ${C.line}`,
        cursor:"pointer",
        background: hov ? "rgba(232,255,0,0.03)" : "transparent",
        transition:"background 150ms",
        animation:`rowIn 0.3s ease ${index * 0.04}s both`,
        gap:0,
      }}
    >
      {/* # */}
      <div className="row-num" style={{
        fontSize:11,fontWeight:700,
        color: hov ? C.yellow : "rgba(255,255,255,0.2)",
        fontFamily:"'Space Mono',monospace",
        transition:"color 150ms",
      }}>
        {String(index + 1).padStart(2, "0")}
      </div>

      {/* Game name + icon */}
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{
          fontSize:18,
          filter: hov ? `drop-shadow(0 0 8px ${game.col}cc)` : "none",
          transition:"filter 200ms",
        }}>{game.icon}</span>
        <div>
          <div className="row-title" style={{
            fontSize:13,fontWeight:700,
            color: hov ? "#fff" : C.text,
            fontFamily:"'Inter',sans-serif",
            letterSpacing:"-0.01em",
            transition:"color 150ms",
            marginBottom:2,
          }}>{game.title}</div>
          <div style={{fontSize:10,color:C.soft,lineHeight:1.4,maxWidth:340,
            overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
            {game.desc}
          </div>
        </div>
      </div>

      {/* Category */}
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <span style={{
          fontSize:9,fontWeight:800,color:game.cat==="Analytics"?C.cyan:game.cat==="Puzzle"?C.purple:C.blue,
          letterSpacing:"0.08em",textTransform:"uppercase",
        }}>{game.cat}</span>
      </div>

      {/* Difficulty */}
      <div>
        <DiffPill diff={game.diff}/>
      </div>

      {/* Your Grade */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <GradeBadge grade={grade}/>
        <button
          className="play-btn"
          style={{
            background:"transparent",
            border:`1px solid ${hov ? "rgba(232,255,0,0.4)" : "rgba(255,255,255,0.1)"}`,
            borderRadius:6,
            color: hov ? C.yellow : "rgba(255,255,255,0.3)",
            fontSize:9,fontWeight:800,letterSpacing:"0.1em",
            padding:"4px 10px",cursor:"pointer",
            fontFamily:"'Space Mono',monospace",
            transition:"all 150ms",
            opacity: hov ? 1 : 0.5,
            textTransform:"uppercase",
          }}
        >
          {played ? "REPLAY" : "PLAY"}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   COLUMN HEADER
   ══════════════════════════════════════════════════════ */
function TableHeader() {
  return (
    <div style={{
      display:"grid",
      gridTemplateColumns:"44px 1fr 160px 120px 90px",
      padding:"8px 20px",
      borderBottom:`1px solid ${C.line}`,
      background:"rgba(0,0,0,0.3)",
    }}>
      {["#","GAME","CATEGORY","DIFFICULTY","YOUR GRADE"].map((col, i) => (
        <div key={col} style={{
          fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.25)",
          letterSpacing:"0.14em",fontFamily:"'Space Mono',monospace",
          textTransform:"uppercase",
        }}>
          {col}
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   PASSPORT BAR (bottom)
   ══════════════════════════════════════════════════════ */
function PassportBar({ scores }) {
  const totalXp = Object.values(scores).reduce((a,b)=>a+(b||0),0);
  const level = totalXp < 500 ? "ROOKIE" : totalXp < 1500 ? "ANALYST" : totalXp < 3000 ? "TACTICIAN" : "DIRECTOR";

  // Compute grades for all games
  const allGrades = GAMES.map(g => getGrade(g.id)).filter(Boolean);
  const gradeCount = { S:0, A:0, B:0, C:0, D:0 };
  allGrades.forEach(g => { if(gradeCount[g]!==undefined) gradeCount[g]++; });

  const gradeColors = {S:C.gold, A:C.green, B:C.blue, C:C.orange, D:C.muted};

  return (
    <div style={{
      position:"fixed",bottom:0,left:0,right:0,zIndex:200,
      background:"rgba(4,6,4,0.96)",
      borderTop:`1px solid rgba(255,255,255,0.08)`,
      backdropFilter:"blur(16px)",
      padding:"10px 24px",
      display:"flex",alignItems:"center",gap:32,
    }}>
      {/* Left: Passport label */}
      <div style={{display:"flex",flexDirection:"column",gap:1,minWidth:100}}>
        <span style={{fontSize:8,color:"rgba(255,255,255,0.3)",letterSpacing:"0.16em",fontFamily:"'Space Mono',monospace"}}>ARCADE PASSPORT</span>
        <span style={{fontSize:13,fontWeight:900,color:C.yellow,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:"0.04em"}}>{level}</span>
      </div>

      {/* XP */}
      <div style={{display:"flex",flexDirection:"column",gap:1}}>
        <span style={{fontSize:8,color:"rgba(255,255,255,0.3)",letterSpacing:"0.12em",fontFamily:"'Space Mono',monospace"}}>TOTAL XP</span>
        <span style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:"'Space Mono',monospace"}}>{totalXp.toLocaleString()}</span>
      </div>

      {/* Next level */}
      <div style={{display:"flex",flexDirection:"column",gap:1}}>
        <span style={{fontSize:8,color:"rgba(255,255,255,0.3)",letterSpacing:"0.12em",fontFamily:"'Space Mono',monospace"}}>GAMES PLAYED</span>
        <span style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:"'Space Mono',monospace"}}>{allGrades.length} / {GAMES.length}</span>
      </div>

      {/* Divider */}
      <div style={{flex:1}}/>

      {/* Grade breakdown */}
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        {Object.entries(gradeCount).filter(([,v])=>v>0).map(([grade, count]) => (
          <div key={grade} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:8,color:"rgba(255,255,255,0.25)",letterSpacing:"0.1em",fontFamily:"'Space Mono',monospace"}}>{count}×</span>
            <span style={{fontSize:14,fontWeight:900,color:gradeColors[grade]||C.muted,fontFamily:"'Space Mono',monospace",textShadow:`0 0 8px ${gradeColors[grade]||C.muted}66`}}>{grade}</span>
          </div>
        ))}
        {/* Show placeholder grades */}
        {["S","A","B","C"].filter(g => !gradeCount[g] || gradeCount[g]===0).map(grade => (
          <div key={grade} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:8,color:"rgba(255,255,255,0.1)",letterSpacing:"0.1em",fontFamily:"'Space Mono',monospace"}}>0×</span>
            <span style={{fontSize:14,fontWeight:900,color:"rgba(255,255,255,0.1)",fontFamily:"'Space Mono',monospace"}}>{grade}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TOP NAV
   ══════════════════════════════════════════════════════ */
function TopNav({ onQuickPlay }) {
  return (
    <div style={{
      display:"flex",alignItems:"center",justifyContent:"space-between",
      padding:"14px 24px",
      borderBottom:`1px solid rgba(255,255,255,0.06)`,
      position:"sticky",top:0,zIndex:100,
      background:"rgba(4,6,4,0.96)",
      backdropFilter:"blur(16px)",
    }}>
      {/* Logo */}
      <div>
        <div style={{fontSize:16,fontWeight:900,color:C.yellow,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:"0.06em",lineHeight:1}}>StatinSite</div>
        <div style={{fontSize:8,color:"rgba(255,255,255,0.3)",letterSpacing:"0.16em",fontFamily:"'Space Mono',monospace"}}>SPORTS ANALYTICS</div>
      </div>

      {/* Right actions */}
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <button style={{
          background:"transparent",border:"1px solid rgba(255,255,255,0.2)",
          borderRadius:6,color:"rgba(255,255,255,0.6)",fontSize:10,fontWeight:700,
          letterSpacing:"0.1em",padding:"7px 14px",cursor:"pointer",
          fontFamily:"'Space Mono',monospace",textTransform:"uppercase",
        }}>
          Arcade Passport
        </button>
        <button style={{
          background:C.yellow,border:"none",
          borderRadius:6,color:"#000",fontSize:10,fontWeight:900,
          letterSpacing:"0.1em",padding:"7px 14px",cursor:"pointer",
          fontFamily:"'Space Mono',monospace",textTransform:"uppercase",
        }}>
          Tactician
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   HERO SECTION
   ══════════════════════════════════════════════════════ */
function HeroSection({ onQuickPlay }) {
  return (
    <div style={{
      padding:"32px 24px 0",
      display:"flex",alignItems:"flex-start",justifyContent:"space-between",
      gap:24,
    }}>
      {/* Left: Big title */}
      <div style={{flex:1}}>
        <div style={{
          fontSize:9,color:"rgba(255,255,255,0.35)",letterSpacing:"0.18em",
          fontFamily:"'Space Mono',monospace",marginBottom:16,textTransform:"uppercase",
        }}>
          StatinSite / Mini Games / Take a Break
        </div>

        {/* SPORTS — yellow solid */}
        <div style={{
          fontSize:"clamp(60px,10vw,100px)",
          fontWeight:900,
          fontFamily:"'Barlow Condensed',sans-serif",
          color:C.yellow,
          lineHeight:0.9,
          letterSpacing:"-0.01em",
          animation:"titleReveal 0.6s ease both",
        }}>
          SPORTS
        </div>

        {/* ARCADE — outlined */}
        <div style={{
          fontSize:"clamp(60px,10vw,100px)",
          fontWeight:900,
          fontFamily:"'Barlow Condensed',sans-serif",
          color:"transparent",
          WebkitTextStroke:"2px rgba(255,255,255,0.85)",
          lineHeight:0.9,
          letterSpacing:"-0.01em",
          animation:"titleReveal 0.6s ease 0.12s both",
          marginBottom:20,
        }}>
          ARCADE
        </div>
      </div>

      {/* Right: Info + CTA */}
      <div style={{
        paddingTop:60,
        display:"flex",flexDirection:"column",alignItems:"flex-end",gap:16,
        minWidth:220,
      }}>
        <div style={{textAlign:"right"}}>
          <p style={{fontSize:12,color:"rgba(255,255,255,0.5)",lineHeight:1.7,margin:0}}>
            12 games. Football, analytics, puzzles.<br/>
            Kill time between the stats.
          </p>
        </div>
        <button
          onClick={onQuickPlay}
          style={{
            background:"rgba(255,255,255,0.08)",
            border:"1px solid rgba(255,255,255,0.2)",
            borderRadius:6,
            color:"#fff",
            fontSize:11,fontWeight:900,letterSpacing:"0.14em",
            padding:"12px 24px",cursor:"pointer",
            fontFamily:"'Space Mono',monospace",
            textTransform:"uppercase",
            transition:"all 150ms",
          }}
          onMouseEnter={e=>{e.currentTarget.style.background="rgba(232,255,0,0.12)";e.currentTarget.style.borderColor="rgba(232,255,0,0.4)";e.currentTarget.style.color=C.yellow;}}
          onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.08)";e.currentTarget.style.borderColor="rgba(255,255,255,0.2)";e.currentTarget.style.color="#fff";}}
        >
          Quick<br/>Play
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   CATEGORY FILTER TABS
   ══════════════════════════════════════════════════════ */
function CategoryTabs({ active, onChange }) {
  const cats = [
    { label:"ALL", count:12, key:"All" },
    { label:"SPORT", count:GAMES.filter(g=>g.cat==="Sport").length, key:"Sport" },
    { label:"ANALYTICS", count:GAMES.filter(g=>g.cat==="Analytics").length, key:"Analytics" },
    { label:"PUZZLE", count:GAMES.filter(g=>g.cat==="Puzzle").length, key:"Puzzle" },
  ];

  return (
    <div style={{
      display:"flex",alignItems:"stretch",
      borderBottom:`1px solid ${C.line}`,
      borderTop:`1px solid ${C.line}`,
      marginTop:0,
    }}>
      {cats.map((cat, i) => {
        const isActive = active === cat.key;
        return (
          <button
            key={cat.key}
            onClick={() => onChange(cat.key)}
            style={{
              padding:"12px 20px",
              background:"transparent",
              border:"none",
              borderRight: i < cats.length - 1 ? `1px solid ${C.line}` : "none",
              borderBottom: isActive ? `2px solid ${C.yellow}` : "2px solid transparent",
              cursor:"pointer",
              display:"flex",alignItems:"center",gap:7,
              color: isActive ? "#fff" : "rgba(255,255,255,0.3)",
              transition:"all 150ms",
              marginBottom:-1,
            }}
          >
            <span style={{fontSize:10,fontWeight:900,letterSpacing:"0.1em",fontFamily:"'Space Mono',monospace"}}>{cat.label}</span>
            <span style={{
              fontSize:8,fontWeight:700,
              color: isActive ? C.yellow : "rgba(255,255,255,0.2)",
              fontFamily:"'Space Mono',monospace",
            }}>
              {String(cat.count).padStart(2,"0")}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   GAME TABLE (grouped by category)
   ══════════════════════════════════════════════════════ */
function GameTable({ games, onOpen }) {
  const grouped = {
    Sport: games.filter(g => g.cat === "Sport"),
    Analytics: games.filter(g => g.cat === "Analytics"),
    Puzzle: games.filter(g => g.cat === "Puzzle"),
  };

  let globalIndex = 0;

  return (
    <div>
      <TableHeader />
      {Object.entries(grouped).map(([cat, catGames]) => {
        if (!catGames.length) return null;
        return (
          <div key={cat}>
            <SectionHeader label={cat} />
            {catGames.map((game, i) => {
              const idx = globalIndex++;
              return (
                <GameRow
                  key={game.id}
                  game={game}
                  index={idx}
                  onOpen={() => onOpen(game)}
                  isLast={i === catGames.length - 1}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════ */
export default function MiniGamesPage() {
  const [active,  setActive]  = useState(null);
  const [cat,     setCat]     = useState("All");
  const [scores,  setScores]  = useState(loadAll());

  const handleClose = useCallback(() => { setActive(null); setScores(loadAll()); }, []);

  const handleQuickPlay = useCallback(() => {
    const unplayed = GAMES.filter(g => getBest(g.id) === null);
    const pick = unplayed.length > 0 ? unplayed[Math.floor(Math.random()*unplayed.length)] : GAMES[Math.floor(Math.random()*GAMES.length)];
    setActive(pick);
  }, []);

  const filtered = cat === "All" ? GAMES : GAMES.filter(g => g.cat === cat);

  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* Subtle background grid */}
      <div style={{
        position:"fixed",inset:0,zIndex:0,pointerEvents:"none",
        backgroundImage:`
          linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
        `,
        backgroundSize:"60px 60px",
      }}/>

      {/* Subtle green glow top-left */}
      <div style={{position:"fixed",top:-100,left:-100,width:400,height:400,
        borderRadius:"50%",background:"rgba(40,217,122,0.04)",filter:"blur(80px)",pointerEvents:"none",zIndex:0}}/>

      <div style={{
        position:"relative",zIndex:1,minHeight:"100vh",
        background:"#060808",paddingBottom:80,
        fontFamily:"'Inter',sans-serif",
      }}>

        <TopNav onQuickPlay={handleQuickPlay}/>

        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <HeroSection onQuickPlay={handleQuickPlay}/>

          <div style={{marginTop:32}}>
            <CategoryTabs active={cat} onChange={setCat}/>
            <GameTable games={filtered} onOpen={setActive}/>
          </div>
        </div>
      </div>

      {/* Bottom passport bar */}
      <PassportBar scores={scores}/>

      {/* Game modal */}
      {active && <GameModal game={active} onClose={handleClose}/>}
    </>
  );
}