import { useState, useEffect, useRef, useCallback } from "react";


/* ── Responsive hook ─────────────────────────────────────── */
function useIsMobile(bp = 640) {
  const [m, setM] = useState(typeof window !== "undefined" ? window.innerWidth < bp : false);
  useEffect(() => {
    const h = () => setM(window.innerWidth < bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return m;
}
/* ── Mobile touch controls ─────────────────────────────────── */
function TouchDpad({ onLeft, onRight, onUp, onDown, showUp=true, showDown=true }) {
  const btn = (label, handler, extra={}) => (
    <button
      onTouchStart={e=>{e.preventDefault();handler&&handler(true);}}
      onTouchEnd={e=>{e.preventDefault();handler&&handler(false);}}
      onMouseDown={()=>handler&&handler(true)}
      onMouseUp={()=>handler&&handler(false)}
      style={{
        width:52,height:52,borderRadius:12,border:"1px solid rgba(255,255,255,0.15)",
        background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.8)",
        fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",
        cursor:"pointer",userSelect:"none",WebkitUserSelect:"none",touchAction:"none",
        ...extra
      }}>{label}</button>
  );
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
      {showUp && btn("↑", onUp)}
      <div style={{display:"flex",gap:4}}>
        {btn("←", onLeft)}
        {showDown ? btn("↓", onDown) : <div style={{width:52}}/>}
        {btn("→", onRight)}
      </div>
    </div>
  );
}

function TouchButton({ label, onPress, color="#28d97a", size=52 }) {
  return (
    <button
      onTouchStart={e=>{e.preventDefault();onPress&&onPress();}}
      onMouseDown={()=>onPress&&onPress()}
      style={{
        width:size,height:size,borderRadius:size/2,
        border:`1px solid ${color}55`,
        background:`${color}18`,color,
        fontSize:size>48?16:13,fontWeight:900,
        display:"flex",alignItems:"center",justifyContent:"center",
        cursor:"pointer",userSelect:"none",WebkitUserSelect:"none",touchAction:"none",
      }}>{label}</button>
  );
}

function MobileGameControls({ children, hint }) {
  return (
    <div style={{
      display:"flex",flexDirection:"column",alignItems:"center",gap:12,
      padding:"12px 0 4px",
    }}>
      {children}
      {hint && <div style={{fontSize:10,color:"#3a5272",textAlign:"center",opacity:0.6}}>{hint}</div>}
    </div>
  );
}

/* ────────────── Design tokens ────────────── */
const C = {
  bg:"#060a14", panel:"rgba(8,13,24,0.98)", line:"rgba(255,255,255,0.07)",
  text:"#f4f7fb", muted:"#8a9ab8", soft:"#3a5272",
  green:"#28d97a", blue:"#67b1ff", gold:"#f2c94c", red:"#ff5d5d",
  purple:"#b388ff", teal:"#2dd4bf", orange:"#fb923c", cyan:"#22d3ee",
  pink:"#f472b6",
};

/* ────────────── localStorage ────────────── */
const LS = "ss_arcade_v5";
const loadAll  = () => { try { return JSON.parse(localStorage.getItem(LS)||"{}"); } catch { return {}; } };
const saveBest = (id,s) => { const d=loadAll(); if(d[id]==null||s>d[id]){d[id]=s;localStorage.setItem(LS,JSON.stringify(d));return true;} return false; };
const getBest  = id => loadAll()[id]??null;

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

/* ────────────── CSS keyframes (injected once) ────────────── */
const KEYFRAMES = `
  @keyframes mgBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
  @keyframes mgPop { 0%{transform:scale(0.6);opacity:0} 100%{transform:scale(1);opacity:1} }
  @keyframes mgPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(0.92)} }
  @keyframes mgGlow { 0%,100%{box-shadow:0 0 20px #28d97a33} 50%{box-shadow:0 0 40px #28d97a88} }
  @keyframes mgSlide { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes mgFloat { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-8px) scale(1.02)} }
  @keyframes mgOrbFloat { 0%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-20px) scale(1.1)} 66%{transform:translate(-15px,25px) scale(0.9)} 100%{transform:translate(0,0) scale(1)} }
  @keyframes mgTimerPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes mgCardHover { from{transform:translateY(0) scale(1)} to{transform:translateY(-4px) scale(1.02)} }
  @keyframes mgSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
`;

/* ════════════════════════════════════════════════════════
   GAME 1 — PENALTY SHOOTOUT  (SPACE / click to shoot)
   ════════════════════════════════════════════════════════ */
export function PenaltyGame({ onScore }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  // All mutable game state lives in a ref so rAF always sees latest
  const gs = useRef({
    phase:"intro",      // intro|aim|shoot|result|over
    aimX:230, aimY:110,
    ballX:230, ballY:310,
    targetX:230, targetY:110,
    animT:0,
    score:0, attempts:0,
    resultMsg:"", resultCol:"#28d97a",
    particles:[],
    gkX:230, gkDir:1, gkDive:false, gkDiveDir:1,
    power:0, powerDir:1,
    highscore: getBest("penalty")||0,
  });

  const W=460, H=360;
  const GOAL={x:70,y:48,w:320,h:124};

  const doShoot = useCallback(() => {
    const s=gs.current;
    if(s.phase!=="aim") return;
    s.targetX=s.aimX; s.targetY=s.aimY;
    // GK decides to dive based on power — high power = more likely center or strong direction
    s.gkDive=Math.random()>.35;
    s.gkDiveDir=s.aimX<230?-1:1;
    s.phase="shoot"; s.animT=0;
  },[]);

  const doRestart = useCallback(() => {
    Object.assign(gs.current,{phase:"aim",ballX:230,ballY:310,aimX:230,aimY:110,
      score:0,attempts:0,resultMsg:"",particles:[],gkX:230,gkDir:1,gkDive:false,animT:0,power:0,powerDir:1});
  },[]);

  const doNext = useCallback(() => {
    Object.assign(gs.current,{phase:"aim",ballX:230,ballY:310,aimX:230,aimY:110,
      resultMsg:"",particles:[],gkX:230,gkDir:1,gkDive:false,animT:0,power:0,powerDir:1});
  },[]);

  useEffect(()=>{
    const cv=canvasRef.current; const ctx=cv.getContext("2d");
    let last=0;

    // Controls
    const onKey=e=>{
      if(e.code==="Space"){e.preventDefault(); const s=gs.current;
        if(s.phase==="aim") doShoot();
        else if(s.phase==="over") doRestart();
      }
    };
    const onClick=()=>{ const s=gs.current;
      if(s.phase==="aim") doShoot();
      else if(s.phase==="over") doRestart();
    };
    window.addEventListener("keydown",onKey);
    cv.addEventListener("click",onClick);

    // ── Draw helpers ──
    const drawBall=(x,y,r,shadow=true)=>{
      if(shadow){ctx.shadowColor="#ffffff55";ctx.shadowBlur=12;}
      const g=ctx.createRadialGradient(x-r*.3,y-r*.35,r*.05,x,y,r);
      g.addColorStop(0,"#ffffff"); g.addColorStop(.45,"#ddd"); g.addColorStop(1,"#777");
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();
      // Hex pattern
      ctx.strokeStyle="rgba(40,40,40,0.5)";ctx.lineWidth=.8;
      for(let a=0;a<6;a++){
        ctx.beginPath();ctx.moveTo(x,y);
        ctx.arc(x,y,r*.55,a*Math.PI/3,(a+1)*Math.PI/3);ctx.closePath();ctx.stroke();
      }
      ctx.shadowBlur=0;
    };

    const drawGK=(x,y,diving,diveDir,t)=>{
      let bx=x,rot=0;
      if(diving&&t>0){
        const dp=Math.min(t/.3,1);
        bx=x+diveDir*80*dp;
        rot=diveDir*Math.PI*.35*dp;
      }
      ctx.save();ctx.translate(bx,y);ctx.rotate(rot);
      // Body
      ctx.shadowColor="#f87171";ctx.shadowBlur=14;
      ctx.fillStyle="#dc2626";ctx.beginPath();ctx.roundRect(-18,-26,36,30,4);ctx.fill();
      // Head
      ctx.fillStyle="#fcd7aa";ctx.beginPath();ctx.arc(0,-34,11,0,Math.PI*2);ctx.fill();
      // Gloves
      ctx.fillStyle="#22c55e";ctx.shadowColor="#22c55e";
      ctx.beginPath();ctx.arc(-26,-16,8,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(26,-16,8,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;ctx.restore();
    };

    const loop=(ts)=>{
      const dt=Math.min((ts-last)/1000,.05);last=ts;
      const s=gs.current;
      ctx.clearRect(0,0,W,H);

      // ── Background ──
      const sky=ctx.createLinearGradient(0,0,0,H);
      sky.addColorStop(0,"#060c1a");sky.addColorStop(1,"#091d10");
      ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);

      // Grass stripes
      for(let i=0;i<10;i++){
        ctx.fillStyle=i%2===0?"rgba(0,90,20,0.28)":"rgba(0,70,15,0.18)";
        ctx.fillRect(i*W/10,0,W/10,H);
      }

      // Stadium lights effect (top corners)
      [[0,0],[W,0]].forEach(([lx,ly])=>{
        const lg=ctx.createRadialGradient(lx,ly,0,lx,ly,180);
        lg.addColorStop(0,"rgba(255,240,200,0.12)");lg.addColorStop(1,"transparent");
        ctx.fillStyle=lg;ctx.fillRect(0,0,W,H);
      });

      // Penalty box markings
      ctx.strokeStyle="rgba(255,255,255,0.18)";ctx.lineWidth=1.5;
      ctx.strokeRect(50,180,360,H-180);   // penalty area
      ctx.strokeRect(120,250,220,H-250);  // six-yard box
      // Penalty spot
      ctx.beginPath();ctx.arc(230,310,3.5,0,Math.PI*2);
      ctx.fillStyle="rgba(255,255,255,0.45)";ctx.fill();
      // Penalty spot glow
      const spg=ctx.createRadialGradient(230,310,0,230,310,22);
      spg.addColorStop(0,"rgba(255,255,255,0.1)");spg.addColorStop(1,"transparent");
      ctx.fillStyle=spg;ctx.fillRect(208,288,44,44);

      // ── Goal ──
      // Posts glow
      ctx.shadowColor="#ffffff";ctx.shadowBlur=20;
      ctx.strokeStyle="rgba(255,255,255,0.92)";ctx.lineWidth=5;
      ctx.strokeRect(GOAL.x,GOAL.y,GOAL.w,GOAL.h);
      ctx.shadowBlur=0;
      // Net
      ctx.strokeStyle="rgba(255,255,255,0.05)";ctx.lineWidth=.6;
      for(let x=GOAL.x+14;x<GOAL.x+GOAL.w;x+=14){
        ctx.beginPath();ctx.moveTo(x,GOAL.y);ctx.lineTo(x+7,GOAL.y+GOAL.h);ctx.stroke();
      }
      for(let y=GOAL.y+12;y<GOAL.y+GOAL.h;y+=12){
        ctx.beginPath();ctx.moveTo(GOAL.x,y);ctx.lineTo(GOAL.x+GOAL.w,y);ctx.stroke();
      }

      // ── AIM phase ──
      if(s.phase==="aim"||s.phase==="intro"){
        s.phase="aim";
        // GK sway
        s.gkX+=s.gkDir*88*dt;
        if(s.gkX>GOAL.x+GOAL.w-24||s.gkX<GOAL.x+24) s.gkDir*=-1;
        // Aim crosshair oscillation
        s.aimX=GOAL.x+32+(Math.sin(ts/780*1.1)*.44+.5)*(GOAL.w-64);
        s.aimY=GOAL.y+12+(Math.cos(ts/660*.9)*.38+.44)*(GOAL.h-24);
        // Power bar
        s.power+=(s.powerDir*1.6*dt);
        if(s.power>=1||s.power<=0) s.powerDir*=-1;

        // Draw GK
        drawGK(s.gkX, GOAL.y+GOAL.h, false, 1, 0);

        // Aim crosshair
        const cx=s.aimX,cy=s.aimY;
        const alpha=.55+Math.sin(ts/220)*.35;
        ctx.strokeStyle=`rgba(251,191,36,${alpha})`;ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(cx-20,cy);ctx.lineTo(cx+20,cy);ctx.stroke();
        ctx.beginPath();ctx.moveTo(cx,cy-20);ctx.lineTo(cx,cy+20);ctx.stroke();
        ctx.beginPath();ctx.arc(cx,cy,12,0,Math.PI*2);
        ctx.strokeStyle=`rgba(251,191,36,${alpha*.5})`;ctx.lineWidth=1;ctx.stroke();
        // Danger zone highlight inside goal
        ctx.fillStyle="rgba(251,191,36,0.06)";
        ctx.fillRect(GOAL.x,GOAL.y,GOAL.w/3,GOAL.h); // left
        ctx.fillRect(GOAL.x+GOAL.w*2/3,GOAL.y,GOAL.w/3,GOAL.h); // right
        ctx.fillRect(GOAL.x,GOAL.y,GOAL.w,GOAL.h/2); // top

        // Power bar
        const bW=140,bX=W/2-70,bY=H-20;
        ctx.fillStyle="rgba(0,0,0,0.5)";ctx.beginPath();ctx.roundRect(bX,bY,bW,8,4);ctx.fill();
        const bG=ctx.createLinearGradient(bX,0,bX+bW,0);
        bG.addColorStop(0,"#28d97a");bG.addColorStop(.6,"#f2c94c");bG.addColorStop(1,"#ff5d5d");
        ctx.fillStyle=bG;ctx.beginPath();ctx.roundRect(bX,bY,bW*s.power,8,4);ctx.fill();
        ctx.strokeStyle="rgba(255,255,255,0.1)";ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(bX,bY,bW,8,4);ctx.stroke();
        ctx.fillStyle="#8a9ab8";ctx.font="9px Inter";ctx.textAlign="center";ctx.fillText("POWER",W/2,bY-4);

        drawBall(230,310,12);
      }

      // ── SHOOT phase ──
      if(s.phase==="shoot"){
        s.animT+=dt;
        const prog=Math.min(s.animT/.42,1);
        const ease=prog<.5?2*prog*prog:1-Math.pow(-2*prog+2,2)/2;
        s.ballX=230+(s.targetX-230)*ease;
        s.ballY=310+(s.targetY-310)*ease;
        const r=12-ease*4.5;

        // GK dive during shot
        drawGK(s.gkX,GOAL.y+GOAL.h,s.gkDive,s.gkDiveDir,s.animT);
        drawBall(s.ballX,s.ballY,Math.max(r,3));

        // Motion trail
        for(let i=1;i<=4;i++){
          const tp=Math.max(0,prog-(i*.08));
          const ex=tp<.5?2*tp*tp:1-Math.pow(-2*tp+2,2)/2;
          const tx=230+(s.targetX-230)*ex,ty=310+(s.targetY-310)*ex;
          const tr=Math.max(12-ex*4.5,2);
          ctx.beginPath();ctx.arc(tx,ty,tr,0,Math.PI*2);
          ctx.fillStyle=`rgba(255,255,255,${.06*(5-i)})`;ctx.fill();
        }

        if(prog>=1){
          const inGoal = s.ballX>GOAL.x&&s.ballX<GOAL.x+GOAL.w&&s.ballY>GOAL.y&&s.ballY<GOAL.y+GOAL.h;
          let gkSaved = false;
          if(inGoal&&s.gkDive){
            const gkFinalX=s.gkX+s.gkDiveDir*80;
            gkSaved=Math.abs(s.ballX-gkFinalX)<52;
          } else if(inGoal&&!s.gkDive){
            gkSaved=Math.abs(s.ballX-s.gkX)<40;
          }
          const goal=inGoal&&!gkSaved;
          s.resultMsg=!inGoal?"MISS!":gkSaved?"SAVED!":"GOAL!";
          s.resultCol=!inGoal?"#f2c94c":gkSaved?"#ff5d5d":"#28d97a";
          if(goal){
            s.score++;
            if(onScore) onScore(s.score);
            for(let i=0;i<36;i++) s.particles.push({
              x:s.ballX,y:s.ballY,
              vx:(Math.random()-.5)*240,vy:(Math.random()-.95)*170,
              life:1,col:["#f2c94c","#28d97a","#67b1ff","#f472b6","#fff"][i%5],
              r:Math.random()*4+1.5,
            });
          }
          s.attempts++;
          s.phase="result";s.animT=0;
        }
      }

      // ── RESULT phase ──
      if(s.phase==="result"){
        s.animT+=dt;
        s.particles.forEach(p=>{
          p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=260*dt;p.life-=1.0*dt;
          if(p.life>0){
            ctx.save();ctx.globalAlpha=Math.max(0,p.life);
            ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
            ctx.restore();
          }
        });
        ctx.globalAlpha=1;
        // Result text with glow
        ctx.shadowColor=s.resultCol;ctx.shadowBlur=30;
        ctx.fillStyle=s.resultCol;ctx.font="bold 52px 'Sora',sans-serif";
        ctx.textAlign="center";ctx.fillText(s.resultMsg,W/2,H/2-10);
        ctx.shadowBlur=0;
        // Sub-score
        ctx.fillStyle="rgba(255,255,255,0.6)";ctx.font="bold 14px 'JetBrains Mono',monospace";
        ctx.fillText(`${s.score} / ${s.attempts}`,W/2,H/2+22);
        if(s.animT>1.6){
          s.attempts>=5 ? Object.assign(s,{phase:"over"}) : doNext();
        }
      }

      // ── GAME OVER ──
      if(s.phase==="over"){
        ctx.fillStyle="rgba(0,0,0,0.78)";ctx.fillRect(0,0,W,H);
        ctx.fillStyle="#f4f7fb";ctx.font="bold 24px 'Sora',sans-serif";ctx.textAlign="center";ctx.fillText("⚽ Final Whistle",W/2,H/2-52);
        const fc=s.score>=4?"#28d97a":s.score>=2?"#f2c94c":"#ff5d5d";
        ctx.fillStyle=fc;ctx.shadowColor=fc;ctx.shadowBlur=22;
        ctx.font="bold 62px 'JetBrains Mono',monospace";ctx.fillText(`${s.score}/5`,W/2,H/2+12);
        ctx.shadowBlur=0;
        if(s.score>s.highscore){s.highscore=s.score;saveBest("penalty",s.score);}
        ctx.fillStyle="#3a5272";ctx.font="11px Inter";
        ctx.fillText(s.score>=5?"Perfect! 🌟":s.score>=3?"Good effort":"Keep practising",W/2,H/2+42);
        ctx.fillStyle="#67b1ff";ctx.fillText("SPACE / tap to replay",W/2,H/2+62);
      }

      // ── HUD strip ──
      ctx.fillStyle="rgba(6,10,20,0.7)";ctx.fillRect(0,0,W,28);
      ctx.font="bold 11px 'JetBrains Mono',monospace";
      ctx.textAlign="left";ctx.fillStyle="#28d97a";ctx.fillText(`⚽ ${s.score} goals`,10,19);
      ctx.textAlign="center";ctx.fillStyle="#f2c94c";ctx.fillText("PENALTY SHOOTOUT",W/2,19);
      ctx.textAlign="right";ctx.fillStyle="#3a5272";ctx.fillText(`${s.attempts}/5 shots`,W-10,19);

      animRef.current=requestAnimationFrame(loop);
    };
    animRef.current=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(animRef.current);window.removeEventListener("keydown",onKey);cv.removeEventListener("click",onClick);};
  },[doShoot,doRestart,doNext,onScore,W,H,GOAL]);

  const isMobile = useIsMobile();
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:12}}>
      <canvas ref={canvasRef} width={W} height={H}
        style={{display:"block",borderRadius:12,maxWidth:"100%",height:"auto",cursor:"crosshair",
          boxShadow:"0 0 40px rgba(40,217,122,0.15)",
          maxWidth:"100%",height:"auto"}}/>
      {isMobile ? (
        <MobileGameControls hint="Move crosshair, then tap SHOOT">
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <TouchDpad
              showUp={true} showDown={true}
              onLeft={h=>{if(h)gs.current.aimX=Math.max(70,gs.current.aimX-18);}}
              onRight={h=>{if(h)gs.current.aimX=Math.min(390,gs.current.aimX+18);}}
              onUp={h=>{if(h)gs.current.aimY=Math.max(50,gs.current.aimY-18);}}
              onDown={h=>{if(h)gs.current.aimY=Math.min(160,gs.current.aimY+18);}}
            />
            <TouchButton label="⚽ SHOOT" onPress={doShoot} color="#28d97a" size={72}/>
          </div>
        </MobileGameControls>
      ) : (
        <div style={{fontSize:10,color:C.soft,textAlign:"center"}}>
          <b style={{color:C.text}}>SPACE</b> or <b style={{color:C.text}}>TAP</b> to shoot · Mouse to aim
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   GAME 2 — TENNIS RALLY  (←→ / AD to move paddle)
   ════════════════════════════════════════════════════════ */
export function TennisGame() {
  const canvasRef=useRef(null);const animRef=useRef(null);const keys=useRef({});
  const gs=useRef({
    bx:230,by:170,bvx:170,bvy:130,
    pX:230,aiX:230,
    pScore:0,aiScore:0,
    rally:0,
    phase:"intro",  // intro|play|dead
    winner:"",
  });
  const W=460,H=340;

  useEffect(()=>{
    const cv=canvasRef.current,ctx=cv.getContext("2d");let last=0;
    const reset=()=>Object.assign(gs.current,{bx:230,by:170,bvx:170,bvy:130,pX:230,aiX:230,pScore:0,aiScore:0,rally:0,phase:"intro",winner:""});
    const kd=e=>{
      keys.current[e.key]=true;keys.current[e.code]=true;
      if(e.key==="Enter"||e.code==="Enter"){const s=gs.current;if(s.phase==="intro")s.phase="play";else if(s.phase==="dead")reset();}
      if(["ArrowLeft","ArrowRight"].includes(e.key))e.preventDefault();
    };
    const ku=e=>{keys.current[e.key]=false;keys.current[e.code]=false;};
    window.addEventListener("keydown",kd);window.addEventListener("keyup",ku);

    const loop=(ts)=>{
      const dt=Math.min((ts-last)/1000,.04);last=ts;
      const s=gs.current;ctx.clearRect(0,0,W,H);

      // Background — hard court blue
      const bg=ctx.createLinearGradient(0,0,0,H);
      bg.addColorStop(0,"#1a3a6b");bg.addColorStop(1,"#0f2244");
      ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);

      // Court lines
      ctx.strokeStyle="rgba(255,255,255,0.65)";ctx.lineWidth=2;
      ctx.strokeRect(26,26,W-52,H-52);
      ctx.beginPath();ctx.moveTo(26,H/2);ctx.lineTo(W-26,H/2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(W/2,26);ctx.lineTo(W/2,H-26);ctx.stroke();
      // Service boxes inner
      ctx.strokeStyle="rgba(255,255,255,0.2)";ctx.lineWidth=1;
      ctx.strokeRect(26,H/2-60,W/2-26,60);
      ctx.strokeRect(W/2,H/2-60,W/2-26,60);

      // Net with shadow
      ctx.shadowColor="rgba(0,0,0,0.4)";ctx.shadowBlur=6;ctx.shadowOffsetY=2;
      ctx.strokeStyle="rgba(255,255,255,0.9)";ctx.lineWidth=4;
      ctx.beginPath();ctx.moveTo(26,H/2);ctx.lineTo(W-26,H/2);ctx.stroke();
      // Net posts
      ctx.fillStyle="rgba(255,255,255,0.7)";
      ctx.fillRect(22,H/2-16,4,32);ctx.fillRect(W-26,H/2-16,4,32);
      ctx.shadowBlur=0;ctx.shadowOffsetY=0;

      if(s.phase==="play"){
        // Move player
        const spd=300;
        if(keys.current["ArrowLeft"]||keys.current["KeyA"])  s.pX=Math.max(52,s.pX-spd*dt);
        if(keys.current["ArrowRight"]||keys.current["KeyD"]) s.pX=Math.min(W-52,s.pX+spd*dt);

        // AI tracks ball with slight lag
        const aiSpd=220+Math.min(s.rally*4,80);
        const aiDiff=s.bx-s.aiX;
        s.aiX+=Math.sign(aiDiff)*Math.min(Math.abs(aiDiff),aiSpd*dt);
        s.aiX=Math.max(52,Math.min(W-52,s.aiX));

        // Ball movement
        s.bx+=s.bvx*dt;s.by+=s.bvy*dt;

        // Wall bounces
        if(s.bx<32){s.bvx=Math.abs(s.bvx);s.bx=32;}
        if(s.bx>W-32){s.bvx=-Math.abs(s.bvx);s.bx=W-32;}

        // Player paddle (bottom)
        const pPaddleY=H-58;
        if(s.bvy>0&&s.by>pPaddleY-8&&s.by<pPaddleY+8&&Math.abs(s.bx-s.pX)<44){
          s.bvy=-Math.abs(s.bvy)*1.05;
          s.bvx+=(s.bx-s.pX)*2.2;
          // Clamp speed
          const spd2=Math.sqrt(s.bvx*s.bvx+s.bvy*s.bvy);
          const maxSpd=320;
          if(spd2>maxSpd){s.bvx=s.bvx/spd2*maxSpd;s.bvy=s.bvy/spd2*maxSpd;}
          s.rally++;
        }

        // AI paddle (top)
        const aiPaddleY=58;
        if(s.bvy<0&&s.by<aiPaddleY+8&&s.by>aiPaddleY-8&&Math.abs(s.bx-s.aiX)<44){
          s.bvy=Math.abs(s.bvy)*1.04;
          s.bvx+=(s.bx-s.aiX)*1.8;
          const spd2=Math.sqrt(s.bvx*s.bvx+s.bvy*s.bvy);
          const maxSpd=300;
          if(spd2>maxSpd){s.bvx=s.bvx/spd2*maxSpd;s.bvy=s.bvy/spd2*maxSpd;}
          s.rally++;
        }

        // Scoring — ball exits top/bottom
        if(s.by>H){
          s.aiScore++; s.rally=0;
          s.bx=230;s.by=170;s.bvx=(Math.random()-.5)*140;s.bvy=-120;
          if(s.aiScore>=7){s.phase="dead";s.winner="cpu";}
        }
        if(s.by<0){
          s.pScore++; s.rally=0;
          s.bx=230;s.by=170;s.bvx=(Math.random()-.5)*140;s.bvy=120;
          if(s.pScore>=7){s.phase="dead";s.winner="player";}
        }
      }

      // Draw paddles
      const drawPaddle=(x,y,col,label)=>{
        ctx.shadowColor=col;ctx.shadowBlur=18;
        const g=ctx.createLinearGradient(x-40,0,x+40,0);
        g.addColorStop(0,col+"99");g.addColorStop(.5,col);g.addColorStop(1,col+"99");
        ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(x-40,y-6,80,12,6);ctx.fill();
        ctx.shadowBlur=0;
        ctx.fillStyle="rgba(255,255,255,0.7)";ctx.font="bold 8px Inter";ctx.textAlign="center";
        ctx.fillText(label,x,y>H/2?y-12:y+20);
      };
      drawPaddle(s.pX,H-58,"#f2c94c","YOU");
      drawPaddle(s.aiX,58,"#ff5d5d","CPU");

      // Ball with glow & shadow
      ctx.shadowColor="#a3e635";ctx.shadowBlur=20;
      const ballG=ctx.createRadialGradient(s.bx-2,s.by-2,1,s.bx,s.by,8);
      ballG.addColorStop(0,"#e8ff80");ballG.addColorStop(1,"#78b000");
      ctx.beginPath();ctx.arc(s.bx,s.by,8,0,Math.PI*2);ctx.fillStyle=ballG;ctx.fill();
      ctx.shadowBlur=0;

      // Rally badge
      if(s.rally>=3&&s.phase==="play"){
        ctx.fillStyle=s.rally>=10?"#f2c94c":s.rally>=6?"#67b1ff":"#28d97a";
        ctx.font=`bold ${10+Math.min(s.rally,8)}px 'JetBrains Mono',monospace`;
        ctx.textAlign="center";ctx.fillText(`${s.rally}x rally!`,W/2,H/2+14);
      }

      // Intro / Dead overlays
      if(s.phase==="intro"){
        ctx.fillStyle="rgba(0,0,0,0.72)";ctx.fillRect(0,0,W,H);
        ctx.fillStyle="#f4f7fb";ctx.font="bold 24px 'Sora',sans-serif";ctx.textAlign="center";ctx.fillText("🎾 Tennis Rally",W/2,H/2-28);
        ctx.fillStyle="#8a9ab8";ctx.font="12px Inter";ctx.fillText("← → / A D  to move",W/2,H/2+2);
        ctx.fillStyle="#f2c94c";ctx.fillText("First to 7 wins — press Enter",W/2,H/2+24);
      }
      if(s.phase==="dead"){
        ctx.fillStyle="rgba(0,0,0,0.75)";ctx.fillRect(0,0,W,H);
        const wc=s.winner==="player"?"#28d97a":"#ff5d5d";
        ctx.fillStyle=wc;ctx.shadowColor=wc;ctx.shadowBlur=24;
        ctx.font="bold 32px 'Sora',sans-serif";ctx.textAlign="center";
        ctx.fillText(s.winner==="player"?"You Win! 🎾":"CPU Wins 🤖",W/2,H/2-16);
        ctx.shadowBlur=0;ctx.fillStyle="#f2c94c";ctx.font="bold 22px 'JetBrains Mono',monospace";
        ctx.fillText(`${s.pScore} – ${s.aiScore}`,W/2,H/2+14);
        ctx.fillStyle="#8a9ab8";ctx.font="11px Inter";ctx.fillText("Enter to rematch",W/2,H/2+40);
      }

      // HUD
      ctx.fillStyle="rgba(6,10,20,0.7)";ctx.fillRect(0,0,W,26);
      ctx.font="bold 11px 'JetBrains Mono',monospace";
      ctx.textAlign="left";ctx.fillStyle="#f2c94c";ctx.fillText(`YOU  ${s.pScore}`,10,18);
      ctx.textAlign="center";ctx.fillStyle="#a3e635";ctx.fillText("TENNIS",W/2,18);
      ctx.textAlign="right";ctx.fillStyle="#ff5d5d";ctx.fillText(`${s.aiScore}  CPU`,W-10,18);

      animRef.current=requestAnimationFrame(loop);
    };
    animRef.current=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(animRef.current);window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku);};
  },[W,H]);

  const isMobileTennis = useIsMobile();
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:12}}>
      <canvas ref={canvasRef} width={W} height={H}
        style={{display:"block",borderRadius:12,boxShadow:"0 0 40px rgba(103,177,255,0.12)",maxWidth:"100%",height:"auto"}}/>
      {isMobileTennis ? (
        <MobileGameControls hint="Move your paddle · Tap START to begin">
          <div style={{display:"flex",gap:16,alignItems:"center"}}>
            <TouchButton label="◀" onPress={()=>{keys.current.ArrowLeft=true;setTimeout(()=>keys.current.ArrowLeft=false,120);}} color="#60a5fa" size={56}/>
            <TouchButton label="START" onPress={()=>{const s=gs.current;if(s.phase==="intro"||s.phase==="over")reset();}} color="#28d97a" size={56}/>
            <TouchButton label="▶" onPress={()=>{keys.current.ArrowRight=true;setTimeout(()=>keys.current.ArrowRight=false,120);}} color="#60a5fa" size={56}/>
          </div>
        </MobileGameControls>
      ) : (
        <div style={{fontSize:10,color:C.soft,textAlign:"center"}}>
          <b style={{color:C.text}}>← → / A D</b> to move · <b style={{color:C.text}}>Enter</b> to start/restart
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   GAME 3 — BASKETBALL FREE THROW  (hold SPACE to power, release to shoot)
   ════════════════════════════════════════════════════════ */
export function BasketballGame() {
  const canvasRef=useRef(null);const animRef=useRef(null);
  const gs=useRef({
    phase:"aim",    // aim|fly|result|over
    power:0, powDir:1, charging:false,
    angle:0, aimDir:1,
    bx:230, by:300,
    vx:0, vy:0,
    score:0, attempts:0,
    resultMsg:"", resultCol:"#28d97a",
    particles:[],
    animT:0,
    highscore:getBest("basket")||0,
  });
  const W=460,H=360;
  // Hoop at top-right-ish
  const HOOP={x:320,y:110,r:28};
  // Board
  const BOARD={x:358,y:74,w:60,h:80};

  useEffect(()=>{
    const cv=canvasRef.current,ctx=cv.getContext("2d");let last=0;
    const s=gs.current;

    const doShoot=()=>{
      if(s.phase!=="aim") return;
      // Physics: power controls speed, angle controls direction
      const pwr=s.power; // 0-1
      const ang=s.angle; // radians, aim upward-right toward hoop
      const speed=280+pwr*180;
      // Aim from ball position toward hoop with angle offset
      const dx=HOOP.x-s.bx, dy=HOOP.y-s.by;
      const baseAng=Math.atan2(dy,dx);
      const finalAng=baseAng+ang;
      s.vx=Math.cos(finalAng)*speed;
      s.vy=Math.sin(finalAng)*speed;
      s.phase="fly";s.animT=0;
    };

    const doRestart=()=>Object.assign(s,{phase:"aim",power:0,powDir:1,charging:false,
      angle:0,aimDir:1,bx:230,by:300,vx:0,vy:0,score:0,attempts:0,resultMsg:"",particles:[],animT:0});
    const doNext=()=>Object.assign(s,{phase:"aim",power:0,powDir:1,charging:false,
      angle:0,aimDir:1,bx:230,by:300,vx:0,vy:0,resultMsg:"",particles:[],animT:0});

    const onKeyDown=e=>{
      if(e.code==="Space"){e.preventDefault();if(s.phase==="aim"&&!s.charging){s.charging=true;s.power=0;}}
      if(e.code==="Space"&&s.phase==="over") doRestart();
    };
    const onKeyUp=e=>{if(e.code==="Space"&&s.charging){s.charging=false;doShoot();}};
    const onClick=()=>{if(s.phase==="over")doRestart();};

    window.addEventListener("keydown",onKeyDown);
    window.addEventListener("keyup",onKeyUp);
    cv.addEventListener("click",onClick);

    const loop=(ts)=>{
      const dt=Math.min((ts-last)/1000,.05);last=ts;
      ctx.clearRect(0,0,W,H);

      // Background — arena
      const bg=ctx.createLinearGradient(0,0,0,H);
      bg.addColorStop(0,"#0a0f1e");bg.addColorStop(1,"#1a0a00");
      ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
      // Court floor gradient
      const fl=ctx.createLinearGradient(0,H*.55,0,H);
      fl.addColorStop(0,"#7c3a00");fl.addColorStop(1,"#4a2200");
      ctx.fillStyle=fl;ctx.fillRect(0,H*.55,W,H*.45);
      // Court line
      ctx.strokeStyle="rgba(255,200,100,0.3)";ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(W/2,H+20,160,Math.PI,2*Math.PI);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,H*.55);ctx.lineTo(W,H*.55);ctx.stroke();
      // Free throw line
      ctx.strokeStyle="rgba(255,200,100,0.2)";ctx.lineWidth=1.5;
      ctx.strokeRect(80,H*.55,W-160,H*.18);

      // Crowd lights (atmospheric)
      for(let i=0;i<12;i++){
        const lx=30+i*(W/12),ly=20;
        const lg=ctx.createRadialGradient(lx,ly,0,lx,ly,40);
        lg.addColorStop(0,i%3===0?"rgba(255,200,50,0.15)":i%3===1?"rgba(255,100,50,0.1)":"rgba(50,150,255,0.1)");
        lg.addColorStop(1,"transparent");
        ctx.fillStyle=lg;ctx.fillRect(lx-40,0,80,H*.4);
      }

      // Backboard
      ctx.shadowColor="#fff";ctx.shadowBlur=12;
      ctx.fillStyle="rgba(220,235,255,0.15)";ctx.strokeStyle="rgba(255,255,255,0.8)";ctx.lineWidth=3;
      ctx.beginPath();ctx.roundRect(BOARD.x,BOARD.y,BOARD.w,BOARD.h,4);ctx.fill();ctx.stroke();
      // Inner square
      ctx.strokeStyle="rgba(255,50,50,0.8)";ctx.lineWidth=2;
      ctx.strokeRect(BOARD.x+10,BOARD.y+16,BOARD.w-20,34);
      // Pole
      ctx.fillStyle="rgba(255,255,255,0.3)";ctx.fillRect(BOARD.x+BOARD.w/2-3,BOARD.y+BOARD.h,6,H-BOARD.y-BOARD.h);

      // Hoop
      ctx.shadowColor="#ff6020";ctx.shadowBlur=18;
      ctx.strokeStyle="#ff6020";ctx.lineWidth=5;
      ctx.beginPath();ctx.arc(HOOP.x,HOOP.y,HOOP.r,0,Math.PI*2);ctx.stroke();
      ctx.shadowBlur=0;
      // Net
      const netSegs=8,netH=40;
      for(let i=0;i<netSegs;i++){
        const a1=(i/netSegs)*Math.PI*2;const a2=((i+1)/netSegs)*Math.PI*2;
        const x1=HOOP.x+Math.cos(a1)*HOOP.r,y1=HOOP.y+Math.sin(a1)*HOOP.r;
        const x2=HOOP.x+Math.cos(a2)*HOOP.r,y2=HOOP.y+Math.sin(a2)*HOOP.r;
        const xb=HOOP.x+Math.cos((a1+a2)/2)*(HOOP.r*.5),yb=HOOP.y+netH*.6;
        ctx.strokeStyle="rgba(255,255,255,0.25)";ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(xb,yb);ctx.stroke();
        ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(xb,yb);ctx.stroke();
      }

      // AIM phase
      if(s.phase==="aim"){
        // Angle oscillation
        s.angle+=(s.aimDir*.8*dt);
        if(s.angle>.18||s.angle<-.18) s.aimDir*=-1;
        // Auto power if charging
        if(s.charging){s.power+=1.8*dt;if(s.power>1)s.power=1;}

        // Trajectory preview arc
        const pwr=s.power;
        const dx=HOOP.x-s.bx,dy=HOOP.y-s.by;
        const baseAng=Math.atan2(dy,dx);
        const finalAng=baseAng+s.angle;
        const spd=280+pwr*180;
        const vx0=Math.cos(finalAng)*spd,vy0=Math.sin(finalAng)*spd;
        const GRAV=500;
        ctx.setLineDash([4,5]);ctx.strokeStyle="rgba(255,200,80,0.35)";ctx.lineWidth=1.5;ctx.beginPath();
        let px=s.bx,py=s.by,pvx=vx0,pvy=vy0;
        ctx.moveTo(px,py);
        for(let i=0;i<22;i++){
          const step=.04;pvx+=0;pvy+=GRAV*step;px+=pvx*step;py+=pvy*step;
          if(px<0||px>W||py>H) break;
          ctx.lineTo(px,py);
        }
        ctx.stroke();ctx.setLineDash([]);

        // Power bar
        const bW=120,bX=W/2-60,bY=H-18;
        ctx.fillStyle="rgba(0,0,0,0.5)";ctx.beginPath();ctx.roundRect(bX,bY,bW,7,3);ctx.fill();
        const bG=ctx.createLinearGradient(bX,0,bX+bW,0);
        bG.addColorStop(0,"#28d97a");bG.addColorStop(.6,"#f2c94c");bG.addColorStop(1,"#ff5d5d");
        ctx.fillStyle=bG;ctx.beginPath();ctx.roundRect(bX,bY,bW*pwr,7,3);ctx.fill();
        ctx.fillStyle="#8a9ab8";ctx.font="9px Inter";ctx.textAlign="center";
        ctx.fillText(s.charging?"Release SPACE!":"Hold SPACE to power",W/2,bY-4);
      }

      // FLY phase
      if(s.phase==="fly"){
        s.animT+=dt;
        const GRAV=500;
        s.vx+=0; s.vy+=GRAV*dt;
        s.bx+=s.vx*dt; s.by+=s.vy*dt;

        // Check score — ball passes through hoop
        const dHoop=Math.hypot(s.bx-HOOP.x,s.by-HOOP.y);
        if(dHoop<HOOP.r+2&&s.by>HOOP.y-4&&s.by<HOOP.y+16){
          s.resultMsg=dHoop<HOOP.r*.5?"SWISH! 🔥":"BASKET!";
          s.resultCol="#28d97a";s.score++;
          for(let i=0;i<28;i++) s.particles.push({
            x:HOOP.x,y:HOOP.y,vx:(Math.random()-.5)*200,vy:(Math.random()-.9)*150,
            life:1,col:["#f2c94c","#ff6020","#28d97a","#fff"][i%4],r:Math.random()*4+1.5,
          });
          s.attempts++;s.phase="result";s.animT=0;
          doNext(); // reset after short delay via animT check
        }
        // Miss
        if(s.by>H||s.bx<0||s.bx>W){
          s.resultMsg="MISS";s.resultCol="#ff5d5d";s.attempts++;s.phase="result";s.animT=0;
        }
        // Backboard hit
        if(s.bx>BOARD.x&&s.bx<BOARD.x+BOARD.w&&s.by>BOARD.y&&s.by<BOARD.y+BOARD.h){
          s.vx=-Math.abs(s.vx)*.65;
        }
      }

      // RESULT phase
      if(s.phase==="result"){
        s.animT+=dt;
        s.particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=280*dt;p.life-=1.1*dt;
          if(p.life>0){ctx.save();ctx.globalAlpha=Math.max(0,p.life);
            ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=p.col;ctx.fill();ctx.restore();}
        });
        ctx.globalAlpha=1;
        ctx.shadowColor=s.resultCol;ctx.shadowBlur=24;ctx.fillStyle=s.resultCol;
        ctx.font="bold 44px 'Sora',sans-serif";ctx.textAlign="center";ctx.fillText(s.resultMsg,W/2,H/2-10);
        ctx.shadowBlur=0;
        if(s.animT>1.4){s.attempts>=6?Object.assign(s,{phase:"over"}):doNext();}
      }

      // OVER
      if(s.phase==="over"){
        ctx.fillStyle="rgba(0,0,0,0.8)";ctx.fillRect(0,0,W,H);
        ctx.fillStyle="#f4f7fb";ctx.font="bold 22px 'Sora',sans-serif";ctx.textAlign="center";ctx.fillText("🏀 Final Buzzer",W/2,H/2-50);
        const fc=s.score>=4?"#28d97a":s.score>=2?"#f2c94c":"#ff5d5d";
        ctx.fillStyle=fc;ctx.shadowColor=fc;ctx.shadowBlur=20;
        ctx.font="bold 58px 'JetBrains Mono',monospace";ctx.fillText(`${s.score}/6`,W/2,H/2+12);
        ctx.shadowBlur=0;ctx.fillStyle="#3a5272";ctx.font="11px Inter";
        ctx.fillText(s.score>=5?"All-Star 🌟":s.score>=3?"Not bad, coach":"More practice",W/2,H/2+40);
        ctx.fillStyle="#67b1ff";ctx.fillText("Tap to replay",W/2,H/2+60);
      }

      // Draw basketball (after all court/hoop so it appears on top)
      if(s.phase!=="over"){
        const bx=s.bx,by=s.by,r=13;
        ctx.shadowColor="#ff6020";ctx.shadowBlur=16;
        const bg2=ctx.createRadialGradient(bx-r*.3,by-r*.3,r*.1,bx,by,r);
        bg2.addColorStop(0,"#ff8c42");bg2.addColorStop(.6,"#e05000");bg2.addColorStop(1,"#7a2800");
        ctx.beginPath();ctx.arc(bx,by,r,0,Math.PI*2);ctx.fillStyle=bg2;ctx.fill();
        // Ball lines
        ctx.strokeStyle="rgba(0,0,0,0.5)";ctx.lineWidth=1.2;ctx.shadowBlur=0;
        ctx.beginPath();ctx.arc(bx,by,r,0,Math.PI);ctx.stroke();
        ctx.beginPath();ctx.moveTo(bx,by-r);ctx.bezierCurveTo(bx+r*.6,by-r*.4,bx+r*.6,by+r*.4,bx,by+r);ctx.stroke();
        ctx.beginPath();ctx.moveTo(bx,by-r);ctx.bezierCurveTo(bx-r*.6,by-r*.4,bx-r*.6,by+r*.4,bx,by+r);ctx.stroke();
      }

      // HUD
      ctx.fillStyle="rgba(6,10,20,0.7)";ctx.fillRect(0,0,W,26);
      ctx.font="bold 11px 'JetBrains Mono',monospace";
      ctx.textAlign="left";ctx.fillStyle="#ff6020";ctx.fillText(`🏀 ${s.score} pts`,10,18);
      ctx.textAlign="center";ctx.fillStyle="#f2c94c";ctx.fillText("FREE THROW",W/2,18);
      ctx.textAlign="right";ctx.fillStyle="#3a5272";ctx.fillText(`${s.attempts}/6`,W-10,18);

      animRef.current=requestAnimationFrame(loop);
    };
    animRef.current=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(animRef.current);window.removeEventListener("keydown",onKeyDown);window.removeEventListener("keyup",onKeyUp);cv.removeEventListener("click",onClick);};
  },[W,H,HOOP,BOARD]);

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:12}}>
      <canvas ref={canvasRef} width={W} height={H}
        style={{display:"block",borderRadius:12,maxWidth:"100%",height:"auto",boxShadow:"0 0 40px rgba(255,96,32,0.15)"}}/>
      <div style={{fontSize:10,color:C.soft,textAlign:"center"}}>
        <b style={{color:C.text}}>Hold SPACE</b> to charge power · <b style={{color:C.text}}>Release</b> to shoot
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   GAME 4 — PITCH HOPPER  (←→↑↓ / WASD to dodge)
   Frogger-style: cross 6 lanes of defenders to score
   ════════════════════════════════════════════════════════ */
export function PitchHopperGame() {
  const canvasRef=useRef(null);const animRef=useRef(null);const keys=useRef({});
  const gs=useRef({
    px:230,py:310,   // player position
    lives:3,score:0,
    phase:"intro",  // intro|play|dead|over|win
    lanes:[],        // {y, defenders, speed, dir}
    moveCD:0,        // cooldown between moves
    stepsSinceMove:0,
    animT:0,
    particles:[],
  });
  const W=460,H=380;
  const LANE_H=42, LANES=6, START_Y=310, TOP_Y=310-LANE_H*LANES; // ~58

  // Init lanes
  const makeLanes=()=>[
    {y:START_Y-LANE_H*1, speed:80,  dir:1,  color:"#1a5c28", defenders:3},
    {y:START_Y-LANE_H*2, speed:110, dir:-1, color:"#174f22", defenders:4},
    {y:START_Y-LANE_H*3, speed:70,  dir:1,  color:"#1a5c28", defenders:3},
    {y:START_Y-LANE_H*4, speed:130, dir:-1, color:"#174f22", defenders:5},
    {y:START_Y-LANE_H*5, speed:90,  dir:1,  color:"#1a5c28", defenders:2},
    {y:START_Y-LANE_H*6, speed:150, dir:-1, color:"#103818", defenders:4},
  ].map(lane=>({
    ...lane,
    defs: Array.from({length:lane.defenders},(_,i)=>({
      x: (i/(lane.defenders))*W+Math.random()*40,
      y: lane.y+LANE_H/2,
    })),
  }));

  useEffect(()=>{
    const cv=canvasRef.current,ctx=cv.getContext("2d");let last=0;
    const s=gs.current;
    s.lanes=makeLanes();

    const reset=()=>{
      s.px=230;s.py=START_Y;s.lives=3;s.score=0;s.phase="play";s.lanes=makeLanes();s.moveCD=0;s.particles=[];
    };
    const nextRound=()=>{s.px=230;s.py=START_Y;s.lanes=makeLanes();};

    const kd=e=>{
      keys.current[e.code]=true;
      if(e.code==="Enter"){if(s.phase==="intro")reset();else if(s.phase==="over"||s.phase==="win")reset();}
      if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key))e.preventDefault();
    };
    const ku=e=>{keys.current[e.code]=false;};
    window.addEventListener("keydown",kd);window.addEventListener("keyup",ku);

    const loop=(ts)=>{
      const dt=Math.min((ts-last)/1000,.05);last=ts;
      ctx.clearRect(0,0,W,H);

      // Background — pitch
      ctx.fillStyle="#071a0d";ctx.fillRect(0,0,W,H);

      // Draw lane stripes
      for(let i=0;i<LANES;i++){
        const ly=START_Y-LANE_H*(i+1);
        ctx.fillStyle=i%2===0?"rgba(0,70,20,0.5)":"rgba(0,55,15,0.5)";
        ctx.fillRect(0,ly,W,LANE_H);
        // Lane border
        ctx.strokeStyle="rgba(255,255,255,0.06)";ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(0,ly);ctx.lineTo(W,ly);ctx.stroke();
      }
      // Safe zones
      ctx.fillStyle="rgba(40,217,122,0.08)";
      ctx.fillRect(0,START_Y,W,LANE_H*.5);            // start
      ctx.fillRect(0,TOP_Y-LANE_H*.5,W,LANE_H*.5);   // goal
      // Goal line
      ctx.strokeStyle=C.green;ctx.lineWidth=2;ctx.setLineDash([6,4]);
      ctx.beginPath();ctx.moveTo(0,TOP_Y);ctx.lineTo(W,TOP_Y);ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle=C.green;ctx.font="bold 9px Inter";ctx.textAlign="center";ctx.fillText("GOAL LINE",W/2,TOP_Y-4);

      // Side lines
      ctx.strokeStyle="rgba(255,255,255,0.12)";ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(10,TOP_Y-10);ctx.lineTo(10,START_Y+10);ctx.stroke();
      ctx.beginPath();ctx.moveTo(W-10,TOP_Y-10);ctx.lineTo(W-10,START_Y+10);ctx.stroke();

      if(s.phase==="play"){
        s.moveCD=Math.max(0,s.moveCD-dt);

        // Move player on key press (grid-step style)
        if(s.moveCD<=0){
          const step=LANE_H;
          if(keys.current["ArrowUp"]||keys.current["KeyW"])   {s.py-=step;s.moveCD=.16;}
          if(keys.current["ArrowDown"]||keys.current["KeyS"])  {s.py=Math.min(START_Y,s.py+step);s.moveCD=.16;}
          if(keys.current["ArrowLeft"]||keys.current["KeyA"])  {s.px=Math.max(18,s.px-36);s.moveCD=.12;}
          if(keys.current["ArrowRight"]||keys.current["KeyD"]) {s.px=Math.min(W-18,s.px+36);s.moveCD=.12;}
        }

        // Move defenders
        s.lanes.forEach(lane=>{
          const defW=30;
          lane.defs.forEach(d=>{
            d.x+=lane.speed*lane.dir*dt;
            // Wrap around
            if(d.x>W+defW) d.x=-defW;
            if(d.x<-defW)  d.x=W+defW;
          });
        });

        // Collision detection
        s.lanes.forEach(lane=>{
          lane.defs.forEach(d=>{
            const inLane=Math.abs(s.py-(d.y))<LANE_H*.4;
            const dist=Math.hypot(s.px-d.x,s.py-d.y);
            if(inLane&&dist<26){
              // Hit!
              s.lives--;
              for(let i=0;i<16;i++) s.particles.push({x:s.px,y:s.py,vx:(Math.random()-.5)*180,vy:(Math.random()-.5)*180,life:1,col:"#ff5d5d",r:3});
              if(s.lives<=0){s.phase="over";}
              else{s.px=230;s.py=START_Y;}
            }
          });
        });

        // Reached goal?
        if(s.py<=TOP_Y){
          s.score++;
          for(let i=0;i<24;i++) s.particles.push({x:s.px,y:s.py,vx:(Math.random()-.5)*200,vy:(Math.random()-.9)*150,life:1,col:C.green,r:3.5});
          if(s.score>=3) s.phase="win";
          else nextRound();
        }
      }

      // Draw defenders
      s.lanes.forEach(lane=>{
        lane.defs.forEach(d=>{
          // Defender body
          ctx.shadowColor="#ff5d5d";ctx.shadowBlur=8;
          ctx.fillStyle="#c0392b";ctx.beginPath();ctx.arc(d.x,d.y,14,0,Math.PI*2);ctx.fill();
          ctx.fillStyle="#f8c8a8";ctx.beginPath();ctx.arc(d.x,d.y-12,7,0,Math.PI*2);ctx.fill();
          // Kit number
          ctx.shadowBlur=0;ctx.fillStyle="white";ctx.font="bold 9px Inter";ctx.textAlign="center";
          ctx.fillText("🛡",d.x,d.y+4);
        });
      });

      // Draw particles
      s.particles=s.particles.filter(p=>p.life>0);
      s.particles.forEach(p=>{
        p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=1.2*dt;
        ctx.save();ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.col;
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.restore();
      });
      ctx.globalAlpha=1;

      // Draw player (attacker)
      if(s.phase==="play"||s.phase==="win"){
        ctx.shadowColor="#28d97a";ctx.shadowBlur=16;
        ctx.fillStyle="#28d97a";ctx.beginPath();ctx.arc(s.px,s.py,13,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="white";ctx.shadowBlur=0;ctx.font="bold 10px Inter";ctx.textAlign="center";
        ctx.fillText("⚡",s.px,s.py+4);
        // Lives indicator
        for(let i=0;i<s.lives;i++){
          ctx.shadowColor=C.green;ctx.shadowBlur=6;ctx.fillStyle=C.green;
          ctx.beginPath();ctx.arc(W-22-i*20,H-12,6,0,Math.PI*2);ctx.fill();
          ctx.shadowBlur=0;
        }
      }

      // Overlays
      if(s.phase==="intro"){
        ctx.fillStyle="rgba(0,0,0,0.78)";ctx.fillRect(0,0,W,H);
        ctx.fillStyle="#f4f7fb";ctx.font="bold 24px 'Sora',sans-serif";ctx.textAlign="center";ctx.fillText("⚡ Pitch Hopper",W/2,H/2-36);
        ctx.fillStyle="#8a9ab8";ctx.font="11px Inter";ctx.fillText("Cross all lanes without getting tackled!",W/2,H/2-6);
        ctx.fillText("↑ ↓ ← → / WASD to move",W/2,H/2+16);
        ctx.fillStyle="#f2c94c";ctx.fillText("Press Enter to run",W/2,H/2+38);
      }
      if(s.phase==="over"){
        ctx.fillStyle="rgba(0,0,0,0.8)";ctx.fillRect(0,0,W,H);
        ctx.fillStyle="#ff5d5d";ctx.shadowColor="#ff5d5d";ctx.shadowBlur=20;
        ctx.font="bold 28px 'Sora',sans-serif";ctx.textAlign="center";ctx.fillText("TACKLED! 😵",W/2,H/2-24);
        ctx.shadowBlur=0;ctx.fillStyle="#f2c94c";ctx.font="bold 20px 'JetBrains Mono',monospace";
        ctx.fillText(`${s.score} goal${s.score!==1?"s":""}`,W/2,H/2+10);
        ctx.fillStyle="#8a9ab8";ctx.font="11px Inter";ctx.fillText("Enter to retry",W/2,H/2+36);
      }
      if(s.phase==="win"){
        ctx.fillStyle="rgba(0,0,0,0.78)";ctx.fillRect(0,0,W,H);
        ctx.fillStyle="#28d97a";ctx.shadowColor="#28d97a";ctx.shadowBlur=24;
        ctx.font="bold 28px 'Sora',sans-serif";ctx.textAlign="center";ctx.fillText("HAT-TRICK! 🏆",W/2,H/2-24);
        ctx.shadowBlur=0;ctx.fillStyle="#f2c94c";ctx.font="bold 18px Inter";
        ctx.fillText("3 goals! You're unstoppable!",W/2,H/2+8);
        ctx.fillStyle="#8a9ab8";ctx.font="11px Inter";ctx.fillText("Enter to play again",W/2,H/2+34);
      }

      // HUD
      ctx.fillStyle="rgba(6,10,20,0.7)";ctx.fillRect(0,0,W,26);
      ctx.font="bold 11px 'JetBrains Mono',monospace";
      ctx.textAlign="left";ctx.fillStyle="#28d97a";ctx.fillText(`⚽ ${s.score} goals`,10,18);
      ctx.textAlign="center";ctx.fillStyle="#f2c94c";ctx.fillText("PITCH HOPPER",W/2,18);
      ctx.textAlign="right";ctx.fillStyle="#ff5d5d";ctx.fillText(`♥ ${s.lives}`,W-10,18);

      animRef.current=requestAnimationFrame(loop);
    };
    animRef.current=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(animRef.current);window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku);};
  },[W,H,LANE_H,LANES,START_Y,TOP_Y]);

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:12}}>
      <canvas ref={canvasRef} width={W} height={H}
        style={{display:"block",borderRadius:12,maxWidth:"100%",height:"auto",boxShadow:"0 0 40px rgba(40,217,122,0.12)"}}/>
      <div style={{fontSize:10,color:C.soft,textAlign:"center"}}>
        <b style={{color:C.text}}>↑↓←→ / WASD</b> to move · Reach goal line · Avoid defenders · <b style={{color:C.text}}>Enter</b> to start
      </div>
    </div>
  );
}

export { C, useGame, GameMenu, GameResults, arcBtn, KEYFRAMES, getBest, saveBest };

/* ════════════════════════════════════════════════════════
   GAME 5 — TIC TAC TOE  (click cells, strategic AI)
   ════════════════════════════════════════════════════════ */
function TicTacToe() {
  const [board, setBoard]   = useState(Array(9).fill(null));
  const [xTurn, setXTurn]   = useState(true);
  const [status, setStatus] = useState("play"); // play|won|draw
  const [winner, setWinner] = useState(null);
  const [winLine, setWinLine] = useState(null);
  const [scores, setScores] = useState({X:0,O:0,D:0});

  const LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const checkWin=(b)=>{for(const l of LINES){const[a,c,d]=l;if(b[a]&&b[a]===b[c]&&b[a]===b[d])return{sym:b[a],line:l};}return null;};

  // Minimax AI for O
  const minimax=(b,isMax)=>{
    const w=checkWin(b);
    if(w) return w.sym==="O"?10:w.sym==="X"?-10:0;
    if(!b.includes(null)) return 0;
    if(isMax){let best=-Infinity;b.forEach((_,i)=>{if(!b[i]){const nb=[...b];nb[i]="O";best=Math.max(best,minimax(nb,false));}});return best;}
    else{let best=Infinity;b.forEach((_,i)=>{if(!b[i]){const nb=[...b];nb[i]="X";best=Math.min(best,minimax(nb,true));}});return best;}
  };
  const bestMove=(b)=>{let bv=-Infinity,bi=-1;b.forEach((_,i)=>{if(!b[i]){const nb=[...b];nb[i]="O";const v=minimax(nb,false);if(v>bv){bv=v;bi=i;}}});return bi;};

  const click=(i)=>{
    if(!xTurn||board[i]||status!=="play") return;
    const nb=[...board];nb[i]="X";
    const w=checkWin(nb);
    if(w){setBoard(nb);setWinner("X");setWinLine(w.line);setStatus("won");setScores(s=>({...s,X:s.X+1}));return;}
    if(!nb.includes(null)){setBoard(nb);setStatus("draw");setScores(s=>({...s,D:s.D+1}));return;}
    setBoard(nb);setXTurn(false);
    // AI move with tiny delay for feel
    setTimeout(()=>{
      const ai=bestMove(nb);
      if(ai===-1) return;
      const nb2=[...nb];nb2[ai]="O";
      const w2=checkWin(nb2);
      if(w2){setBoard(nb2);setWinner("O");setWinLine(w2.line);setStatus("won");setScores(s=>({...s,O:s.O+1}));}
      else if(!nb2.includes(null)){setBoard(nb2);setStatus("draw");setScores(s=>({...s,D:s.D+1}));}
      else{setBoard(nb2);setXTurn(true);}
    },260);
  };

  const reset=()=>{setBoard(Array(9).fill(null));setXTurn(true);setStatus("play");setWinner(null);setWinLine(null);};

  const cellColors={"X":C.cyan,"O":C.orange,null:C.soft};
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"16px 12px",gap:14}}>
      {/* Score strip */}
      <div style={{display:"flex",gap:16,alignItems:"center"}}>
        {[["YOU (X)",scores.X,C.cyan],["DRAW",scores.D,C.muted],["CPU (O)",scores.O,C.orange]].map(([l,v,c])=>(
          <div key={l} style={{textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:900,color:c,fontFamily:"'JetBrains Mono',monospace"}}>{v}</div>
            <div style={{fontSize:9,color:C.soft,fontWeight:700,letterSpacing:"0.08em"}}>{l}</div>
          </div>
        ))}
      </div>
      {/* Grid */}
      <div id="game2048-canvas-area" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,width:isMobile?200:240}}>
        {board.map((cell,i)=>{
          const isWin=winLine&&winLine.includes(i);
          return (
            <div key={i} onClick={()=>click(i)} style={{
              height:74,display:"flex",alignItems:"center",justifyContent:"center",
              borderRadius:10,cursor:(!cell&&xTurn&&status==="play")?"pointer":"default",
              background:isWin?`${cellColors[cell]}18`:"rgba(255,255,255,0.04)",
              border:`2px solid ${isWin?cellColors[cell]:cell?`${cellColors[cell]}44`:C.line}`,
              fontSize:32,fontWeight:900,color:cellColors[cell]||C.soft,
              transition:"all 180ms",
              boxShadow:isWin?`0 0 18px ${cellColors[cell]}88`:"none",
              animation:cell?"mgPop 0.25s cubic-bezier(0.22,1,0.36,1)":"none",
            }}>{cell||(!cell&&xTurn&&status==="play"&&<span style={{opacity:.15,fontSize:20}}>×</span>)}</div>
          );
        })}
      </div>
      {/* Status */}
      <div style={{textAlign:"center"}}>
        {status==="play"&&<div style={{fontSize:12,color:C.muted}}>{xTurn?"Your turn (X)":"CPU thinking..."}</div>}
        {status==="won"&&<div style={{fontSize:16,fontWeight:900,color:winner==="X"?C.green:C.red,
          animation:"mgPop 0.3s ease"}}>
          {winner==="X"?"You Win! 🎉":"CPU Wins 🤖"}
        </div>}
        {status==="draw"&&<div style={{fontSize:16,fontWeight:900,color:C.gold}}>Draw! 🤝</div>}
      </div>
      <button onClick={reset} style={{...arcBtn(status==="play"?C.soft:C.green,false),fontSize:12}}>
        {status==="play"?"Reset":"Play Again"}
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   GAME 6 — 2048 SLIDE  (arrow keys to slide tiles)
   ════════════════════════════════════════════════════════ */
function Game2048() {
  const init=()=>{const b=Array(16).fill(0);addTile(b);addTile(b);return b;};
  const addTile=(b)=>{const empty=b.reduce((a,v,i)=>v===0?[...a,i]:a,[]);if(!empty.length)return;b[empty[Math.floor(Math.random()*empty.length)]]=Math.random()<.9?2:4;};

  const [board,setBoard]   = useState(init);
  const [score,setScore]   = useState(0);
  const [best, setBest2]   = useState(()=>getBest("2048")||0);
  const [over, setOver]    = useState(false);
  const [won,  setWon]     = useState(false);

  const slide=(tiles)=>{
    const row=tiles.filter(v=>v!==0);
    let pts=0;
    for(let i=0;i<row.length-1;i++){
      if(row[i]===row[i+1]){row[i]*=2;pts+=row[i];row.splice(i+1,1);}
    }
    while(row.length<4) row.push(0);
    return{row,pts};
  };

  const move=useCallback((dir)=>{
    if(over||won) return;
    const b=[...board];let pts=0;let moved=false;

    const getRow=(r)=>[b[r*4],b[r*4+1],b[r*4+2],b[r*4+3]];
    const setRow=(r,row)=>{row.forEach((v,c)=>{if(b[r*4+c]!==v)moved=true;b[r*4+c]=v;});};
    const getCol=(c)=>[b[c],b[c+4],b[c+8],b[c+12]];
    const setCol=(c,col)=>{col.forEach((v,r)=>{if(b[c+r*4]!==v)moved=true;b[c+r*4]=v;});};

    if(dir==="left")  {for(let r=0;r<4;r++){const{row,pts:p}=slide(getRow(r));setRow(r,row);pts+=p;}}
    if(dir==="right") {for(let r=0;r<4;r++){const{row,pts:p}=slide(getRow(r).reverse());setRow(r,row.reverse());pts+=p;}}
    if(dir==="up")    {for(let c=0;c<4;c++){const{row,pts:p}=slide(getCol(c));setCol(c,row);pts+=p;}}
    if(dir==="down")  {for(let c=0;c<4;c++){const{row,pts:p}=slide(getCol(c).reverse());setCol(c,row.reverse());pts+=p;}}

    if(!moved) return;
    addTile(b);
    const newScore=score+pts;
    setBoard(b);setScore(newScore);
    if(newScore>best){setBest2(newScore);saveBest("2048",newScore);}
    if(b.includes(2048)) setWon(true);
    // Check game over
    const hasMove=b.includes(0)||b.some((v,i)=>{
      if(i%4<3&&v===b[i+1])return true;
      if(i<12&&v===b[i+4])return true;
      return false;
    });
    if(!hasMove) setOver(true);
  },[board,score,best,over,won]);

  // Touch swipe for mobile
  const touchStartRef = React.useRef(null);
  React.useEffect(() => {
    const el = document.getElementById('game2048-canvas-area');
    if (!el) return;
    const onTouchStart = e => { touchStartRef.current = {x:e.touches[0].clientX, y:e.touches[0].clientY}; };
    const onTouchEnd = e => {
      if (!touchStartRef.current) return;
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
      if (Math.abs(dx) > Math.abs(dy)) { if (dx > 30) move("ArrowRight"); else if (dx < -30) move("ArrowLeft"); }
      else { if (dy > 30) move("ArrowDown"); else if (dy < -30) move("ArrowUp"); }
      touchStartRef.current = null;
    };
    el.addEventListener('touchstart', onTouchStart, {passive:true});
    el.addEventListener('touchend', onTouchEnd);
    return () => { el.removeEventListener('touchstart', onTouchStart); el.removeEventListener('touchend', onTouchEnd); };
  }, [move]);

  useEffect(()=>{
    const kd=e=>{
      const map={ArrowLeft:"left",ArrowRight:"right",ArrowUp:"up",ArrowDown:"down",
                 KeyA:"left",KeyD:"right",KeyW:"up",KeyS:"down"};
      if(map[e.code]){e.preventDefault();move(map[e.code]);}
    };
    window.addEventListener("keydown",kd);
    return()=>window.removeEventListener("keydown",kd);
  },[move]);

  const reset=()=>{const b=init();setBoard(b);setScore(0);setOver(false);setWon(false);};

  const tileColor={0:"rgba(255,255,255,0.04)",2:"#1a3a2a",4:"#1e4430",8:"#28d97a",
    16:"#22b862",32:"#f2c94c",64:"#fb923c",128:"#ff5d5d",256:"#b388ff",
    512:"#67b1ff",1024:"#22d3ee",2048:"#f2c94c"};
  const tileText={0:"",2:C.green,4:C.green,8:"#000",16:"#000",32:"#000",64:"#000",
    128:"#fff",256:"#fff",512:"#fff",1024:"#fff",2048:"#000"};

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"14px 10px",gap:12}}>
      {/* Scores */}
      <div style={{display:"flex",gap:20}}>
        {[["SCORE",score,C.green],["BEST",best,C.gold]].map(([l,v,c])=>(
          <div key={l} style={{textAlign:"center",background:"rgba(255,255,255,0.04)",
            border:`1px solid ${C.line}`,borderRadius:8,padding:"6px 16px"}}>
            <div style={{fontSize:9,color:C.soft,letterSpacing:"0.12em",marginBottom:2}}>{l}</div>
            <div style={{fontSize:18,fontWeight:900,color:c,fontFamily:"'JetBrains Mono',monospace"}}>{v}</div>
          </div>
        ))}
      </div>
      {/* Grid */}
      <div id="game2048-canvas-area" style={{touchAction:"none"}}><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,
        background:"rgba(255,255,255,0.04)",borderRadius:10,padding:6,
        border:`1px solid ${C.line}`,width:244}}>
        {board.map((v,i)=>(
          <div key={i} style={{height:54,display:"flex",alignItems:"center",justifyContent:"center",
            borderRadius:7,background:tileColor[v]||"#b388ff",transition:"background 180ms",
            fontSize:v>=1024?14:v>=128?17:20,fontWeight:900,color:tileText[v]||"#fff",
            fontFamily:"'JetBrains Mono',monospace",
            boxShadow:v>=8?`0 0 10px ${tileColor[v]}88`:"none"}}>
            {v||""}
          </div>
        ))}
      </div>
      {(over||won)&&(
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:900,color:won?C.gold:C.red,marginBottom:8}}>
            {won?"You reached 2048! 🏆":"Game Over"}
          </div>
          <button onClick={reset} style={arcBtn(C.green)}>New Game</button>
        </div>
      )}
      {!over&&!won&&<div style={{fontSize:10,color:C.soft}}>← → ↑ ↓ / WASD to slide</div>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   GAME 7 — XG SHOT GUESSER  (analytics, slider)
   ════════════════════════════════════════════════════════ */
const XG_SHOTS=[
  {zone:"Central Box",dist:12,desc:"One-on-one with keeper, 12 yards, central",xg:0.74},
  {zone:"6-Yard Box",dist:5,desc:"Header from corner, 5 yards, crowded box",xg:0.28},
  {zone:"30-Yard Drive",dist:30,desc:"Long-range effort, slight right angle",xg:0.03},
  {zone:"Penalty Spot",dist:12,desc:"Penalty kick from the spot",xg:0.79},
  {zone:"Goal Line",dist:2,desc:"Open-net tap-in, 2 yards after low cross",xg:0.96},
  {zone:"Edge of Box",dist:22,desc:"Half-volley, 22 yards, keeper set",xg:0.08},
  {zone:"Tight Angle",dist:8,desc:"Close-range, 8 yards, acute angle wide",xg:0.14},
  {zone:"Free Header",dist:10,desc:"Unmarked header, 10 yards from corner",xg:0.48},
];

function XgGuesser() {
  const g=useGame("xg_v5");
  const ROUNDS=6,TIMER=70;
  const [round,setRound]=useState(0);
  const [guess,setGuess]=useState(0.50);
  const [fb,setFb]=useState(null);
  const [shots]=useState(()=>[...XG_SHOTS].sort(()=>Math.random()-.5).slice(0,ROUNDS));
  const onExpire=useCallback(()=>g.finish(g.scoreRef.current),[g]);
  const timeLeft=useTimer(TIMER,onExpire,g.phase==="playing");

  const submit=()=>{
    if(fb||g.phase!=="playing")return;
    const sc=shots[round];
    const diff=Math.abs(guess-sc.xg);
    const pts=diff<.03?120:diff<.07?85:diff<.12?55:diff<.18?30:8;
    g.addLive(pts);setFb({diff:diff.toFixed(2),correct:sc.xg,pts,guess:guess.toFixed(2)});
  };
  const next=()=>{setFb(null);const n=round+1;if(n>=ROUNDS){g.finish(g.scoreRef.current);return;}setRound(n);setGuess(.50);};

  const useTimer2=(s,cb,run)=>{const[l,sl]=useState(s);const r=useRef();useEffect(()=>{sl(s);},[s]);useEffect(()=>{if(!run){clearInterval(r.current);return;}r.current=setInterval(()=>sl(t=>{if(t<=1){clearInterval(r.current);cb();return 0;}return t-1;}),1000);return()=>clearInterval(r.current);},[run,cb]);return l;};

  if(g.phase==="menu")return<GameMenu title="xG Guesser" icon="🎯"
    desc="Estimate expected goals (0–1) for each shot. Closer = more points. 6 shots, 70 seconds!"
    diff="Medium" dur="70s" best={g.best} onPlay={g.start} col={C.green}
    controls={[["Slider","estimate xG"],["Lock In","submit answer"]]}/>;
  if(g.phase==="results")return<GameResults score={g.score} best={g.best} isNew={g.isNew}
    onRestart={()=>{setRound(0);setGuess(.50);setFb(null);g.restart();}} onMenu={g.menu} col={C.green}/>;

  const sc=shots[round];
  const xCol=guess<.2?C.blue:guess<.5?C.teal:guess<.75?C.gold:C.red;
  const pct=maxTime=>timeLeft/maxTime*100;

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      {/* Mini header */}
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderBottom:`1px solid ${C.line}`,flexShrink:0}}>
        <button onClick={g.menu} style={{background:"none",border:`1px solid ${C.line}`,borderRadius:7,color:C.soft,cursor:"pointer",padding:"4px 8px",fontSize:11}}>←</button>
        <span style={{flex:1,fontSize:12,fontWeight:900,color:C.text,fontFamily:"'Sora',sans-serif"}}>🎯 xG Guesser</span>
        <span style={{fontSize:11,fontWeight:900,color:C.green,fontFamily:"'JetBrains Mono',monospace",background:`${C.green}12`,padding:"2px 8px",borderRadius:6}}>{g.score}pts</span>
        <span style={{fontSize:10,color:timeLeft<15?C.red:C.soft,fontFamily:"'JetBrains Mono',monospace"}}>{timeLeft}s</span>
      </div>
      {/* Timer bar */}
      <div style={{height:3,background:"rgba(255,255,255,0.05)"}}>
        <div style={{height:"100%",width:`${(timeLeft/TIMER)*100}%`,background:timeLeft<15?C.red:C.green,transition:"width 1s linear"}}/>
      </div>
      <div style={{flex:1,padding:"12px 14px",display:"flex",flexDirection:"column",gap:10,overflow:"auto"}}>
        {/* Progress */}
        <div style={{display:"flex",gap:5,alignItems:"center"}}>
          {Array.from({length:ROUNDS}).map((_,i)=>(
            <div key={i} style={{flex:1,height:4,borderRadius:2,background:i<round?C.green:i===round?`${C.green}66`:"rgba(255,255,255,0.07)"}}/>
          ))}
          <span style={{fontSize:9,color:C.soft,marginLeft:6,fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>{round+1}/{ROUNDS}</span>
        </div>
        {/* Mini pitch diagram */}
        <div style={{position:"relative",height:130,borderRadius:10,overflow:"hidden",
          background:"linear-gradient(180deg,#071a0e,#0b2414)",border:`1px solid ${C.green}18`}}>
          <svg style={{position:"absolute",inset:0}} width="100%" height="130" viewBox="0 0 400 130" preserveAspectRatio="none">
            <rect x="6" y="6" width="388" height="118" rx="3" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
            <line x1="200" y1="6" x2="200" y2="124" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
            <rect x="358" y="38" width="36" height="54" rx="2" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5"/>
            <rect x="316" y="20" width="78" height="90" rx="2" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
          </svg>
          {(()=>{const pct=Math.min(sc.dist/35,1);const sx=370-pct*195;const sxPct=(sx/400)*100;
            return<>
              <div style={{position:"absolute",top:"50%",left:`${sxPct}%`,width:12,height:12,
                background:C.gold,borderRadius:"50%",transform:"translate(-50%,-50%)",
                boxShadow:`0 0 12px ${C.gold}`,animation:"mgPulse 1s ease-in-out infinite",zIndex:2}}/>
              <div style={{position:"absolute",bottom:6,left:8,fontSize:9,fontWeight:900,color:C.gold,
                background:"rgba(0,0,0,0.65)",padding:"2px 7px",borderRadius:4}}>{sc.zone} · {sc.dist}yds</div>
            </>;
          })()}
        </div>
        {/* Situation */}
        <div style={{background:`${C.blue}0a`,border:`1px solid ${C.blue}1e`,borderRadius:8,padding:"9px 11px"}}>
          <div style={{fontSize:8,fontWeight:900,color:C.blue,letterSpacing:"0.1em",marginBottom:3}}>SHOT SITUATION</div>
          <div style={{fontSize:12,color:C.text,lineHeight:1.6}}>{sc.desc}</div>
        </div>
        {/* Slider */}
        {!fb&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
            <span style={{fontSize:9,fontWeight:900,color:C.soft,letterSpacing:"0.1em"}}>YOUR xG</span>
            <span style={{fontSize:32,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:xCol,textShadow:`0 0 14px ${xCol}66`}}>{guess.toFixed(2)}</span>
          </div>
          <div style={{position:"relative",height:10,borderRadius:5,cursor:"pointer",
            background:"linear-gradient(to right,#1a4a2a,#28d97a,#f2c94c,#fb923c,#ff5d5d)"}}
            onClick={e=>{const r=e.currentTarget.getBoundingClientRect();setGuess(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)));}}>
            <div style={{position:"absolute",top:"50%",left:`${guess*100}%`,width:20,height:20,
              background:xCol,borderRadius:"50%",transform:"translate(-50%,-50%)",
              boxShadow:`0 0 10px ${xCol}`,border:"2.5px solid white",pointerEvents:"none"}}/>
          </div>
          <input type="range" min={0} max={1} step={0.01} value={guess} onChange={e=>setGuess(+e.target.value)}
            style={{width:"100%",accentColor:xCol,cursor:"pointer",marginTop:2}}/>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.soft}}>
            <span>0.00</span><span>1.00</span>
          </div>
          <button onClick={submit} style={{...arcBtn(C.green,true)}}>Lock In →</button>
        </div>}
        {/* Feedback */}
        {fb&&<div style={{borderRadius:10,padding:"11px 13px",
          background:fb.pts>=85?`${C.green}0d`:fb.pts>=40?`${C.gold}0d`:`${C.red}0d`,
          border:`1px solid ${fb.pts>=85?C.green:fb.pts>=40?C.gold:C.red}33`}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <div><div style={{fontSize:8,color:C.soft,letterSpacing:"0.1em",marginBottom:2}}>ACTUAL xG</div>
              <div style={{fontSize:32,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:fb.pts>=85?C.green:fb.pts>=40?C.gold:C.red}}>{fb.correct.toFixed(2)}</div></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:8,color:C.soft,letterSpacing:"0.1em",marginBottom:2}}>EARNED</div>
              <div style={{fontSize:32,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:C.gold}}>+{fb.pts}</div></div>
          </div>
          <div style={{fontSize:10,color:C.muted,marginBottom:8}}>
            Yours {fb.guess} · Actual {fb.correct.toFixed(2)} · Off by {fb.diff}
            {" "}{fb.pts>=85?"🎯 Expert!":fb.pts>=55?"✅ Good":"📚 Study more"}
          </div>
          <button onClick={next} style={{...arcBtn(C.blue,true)}}>{round+1>=ROUNDS?"Results →":"Next →"}</button>
        </div>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   GAME 8 — FPL CAPTAIN PICKER  (analytics, tap to pick)
   ════════════════════════════════════════════════════════ */
const CAP_ROUNDS=[
  {gw:28,players:[
    {name:"Salah",team:"LIV",opp:"vs Luton (H)",fdr:1,form:8.2,pts5:[12,6,2,8,14],ict:54,cost:12.8},
    {name:"Haaland",team:"MCI",opp:"vs Burnley (H)",fdr:1,form:7.4,pts5:[6,15,2,6,8],ict:49,cost:14.2},
    {name:"Palmer",team:"CHE",opp:"vs Wolves (A)",fdr:3,form:9.1,pts5:[18,6,8,2,12],ict:61,cost:5.7},
  ],ans:0,reason:"Salah: consistent L5 avg 8.4, best fixture FDR 1 at home. Palmer leads form but faces FDR 3 away."},
  {gw:29,players:[
    {name:"Watkins",team:"AVL",opp:"vs Sheff Utd (H)",fdr:1,form:8.4,pts5:[8,12,6,6,8],ict:52,cost:8.9},
    {name:"Son",team:"TOT",opp:"vs Man Utd (A)",fdr:3,form:6.5,pts5:[2,6,2,8,6],ict:41,cost:9.8},
    {name:"Mbeumo",team:"BRE",opp:"vs Leicester (H)",fdr:2,form:7.8,pts5:[6,2,10,8,6],ict:38,cost:7.2},
  ],ans:0,reason:"Watkins: FDR 1 at home, best ICT 52, strong form 8.4 avg. Clear captain choice."},
  {gw:30,players:[
    {name:"Gordon",team:"NEW",opp:"vs Everton (H)",fdr:1,form:7.9,pts5:[6,8,6,12,8],ict:48,cost:7.8},
    {name:"Saka",team:"ARS",opp:"vs Man City (A)",fdr:5,form:7.2,pts5:[6,2,8,6,2],ict:44,cost:8.6},
    {name:"Zaha",team:"CRY",opp:"vs Burnley (H)",fdr:2,form:6.8,pts5:[2,8,2,6,6],ict:36,cost:6.8},
  ],ans:0,reason:"Gordon: FDR 1 home vs Everton relegation side, best ICT 48, consistent returns."},
];

function FplCaptain() {
  const g=useGame("captain_v5");
  const [round,setRound]=useState(0);
  const [sel,setSel]=useState(null);
  const [fb,setFb]=useState(null);
  const fdc={1:C.green,2:"#a3e635",3:C.gold,4:C.orange,5:C.red};

  const pick=i=>{if(fb)return;setSel(i);const ok=i===CAP_ROUNDS[round].ans;g.addLive(ok?100:0);setFb({ok,reason:CAP_ROUNDS[round].reason,pts:ok?100:0});};
  const next=()=>{setFb(null);setSel(null);const n=round+1;if(n>=CAP_ROUNDS.length){g.finish(g.scoreRef.current);return;}setRound(n);};

  if(g.phase==="menu")return<GameMenu title="FPL Captain" icon="👑"
    desc="Analyse form, fixture difficulty rating, ICT index and recent returns. Pick the optimal FPL captain!"
    diff="Hard" dur="No limit" best={g.best} onPlay={g.start} col={C.gold}
    controls={[["Tap","pick captain"]]}/>;
  if(g.phase==="results")return<GameResults score={g.score} best={g.best} isNew={g.isNew}
    onRestart={()=>{setRound(0);setSel(null);setFb(null);g.restart();}} onMenu={g.menu} col={C.gold}/>;

  const r=CAP_ROUNDS[round];
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderBottom:`1px solid ${C.line}`,flexShrink:0}}>
        <button onClick={g.menu} style={{background:"none",border:`1px solid ${C.line}`,borderRadius:7,color:C.soft,cursor:"pointer",padding:"4px 8px",fontSize:11}}>←</button>
        <span style={{flex:1,fontSize:12,fontWeight:900,color:C.text,fontFamily:"'Sora',sans-serif"}}>👑 FPL Captain GW{r.gw}</span>
        <span style={{fontSize:11,fontWeight:900,color:C.gold,fontFamily:"'JetBrains Mono',monospace",background:`${C.gold}12`,padding:"2px 8px",borderRadius:6}}>{g.score}pts</span>
        <span style={{fontSize:10,color:C.soft}}>{round+1}/{CAP_ROUNDS.length}</span>
      </div>
      <div style={{flex:1,padding:"12px 14px",display:"flex",flexDirection:"column",gap:9,overflow:"auto"}}>
        {r.players.map((p,i)=>{
          let border=C.line,bg="rgba(255,255,255,0.02)";
          if(fb){if(i===r.ans){border=C.gold;bg=`${C.gold}0e`;}else if(i===sel){border=C.red;bg=`${C.red}07`;}}
          else if(i===sel){border=C.gold;bg=`${C.gold}08`;}
          const avg=(p.pts5.reduce((a,b)=>a+b,0)/5).toFixed(1);
          return(
            <div key={i} onClick={()=>pick(i)} style={{background:bg,border:`1.5px solid ${border}`,
              borderRadius:10,padding:"10px 12px",cursor:fb?"default":"pointer",transition:"all 140ms",position:"relative"}}>
              {fb&&i===r.ans&&<div style={{position:"absolute",top:8,right:10,fontSize:14}}>👑</div>}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:7}}>
                <span style={{fontSize:13,fontWeight:900,color:C.text}}>{p.name}
                  <span style={{fontSize:9,color:C.soft,marginLeft:6}}>{p.team}</span></span>
                <span style={{fontSize:9,fontWeight:800,color:fdc[p.fdr],background:`${fdc[p.fdr]}18`,padding:"2px 6px",borderRadius:999}}>FDR{p.fdr} {p.opp}</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4,marginBottom:7}}>
                {[["FORM",p.form,C.green],["ICT",p.ict,C.cyan],["£",`${p.cost}m`,C.gold],["AVG",avg,C.blue]].map(([l,v,c])=>(
                  <div key={l} style={{background:"rgba(255,255,255,0.03)",borderRadius:5,padding:"3px 5px",textAlign:"center"}}>
                    <div style={{fontSize:6.5,fontWeight:900,color:C.soft,letterSpacing:"0.1em",marginBottom:1}}>{l}</div>
                    <div style={{fontSize:11,fontWeight:900,color:c,fontFamily:"'JetBrains Mono',monospace"}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",alignItems:"flex-end",gap:2,height:20}}>
                {p.pts5.map((pt,j)=>{const c=pt>=10?C.green:pt>=6?C.blue:pt>=3?C.gold:"rgba(255,255,255,0.1)";
                  return<div key={j} style={{flex:1,height:Math.max(pt*1.8,2),background:c,borderRadius:"2px 2px 0 0",maxHeight:18}}/>;
                })}
              </div>
            </div>
          );
        })}
        {fb&&<div style={{background:fb.ok?`${C.green}08`:`${C.red}08`,border:`1px solid ${fb.ok?C.green:C.red}28`,borderRadius:9,padding:"10px 12px"}}>
          <div style={{fontSize:12,fontWeight:900,color:fb.ok?C.green:C.red,marginBottom:4}}>{fb.ok?"Correct ✓":"Wrong ✗"}</div>
          <div style={{fontSize:10.5,color:C.muted,lineHeight:1.6,marginBottom:8}}>{fb.reason}</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            {fb.pts>0&&<span style={{fontSize:15,fontWeight:900,color:C.gold,fontFamily:"'JetBrains Mono',monospace"}}>+{fb.pts}</span>}
            <button onClick={next} style={arcBtn(fb.ok?C.gold:C.blue)}>{round+1>=CAP_ROUNDS.length?"Results →":"Next →"}</button>
          </div>
        </div>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   GAME 9 — SCORELINE PREDICTOR  (pick most likely score)
   ════════════════════════════════════════════════════════ */
const MATCH_DATA=[
  {h:"Man City",a:"Burnley",hxg:2.4,axg:0.6,opts:["2-0","1-0","3-1","0-1"],ans:"2-0",hint:"Heavy home xG dominance → 2-0 is modal Poisson result"},
  {h:"Arsenal",a:"Chelsea",hxg:1.6,axg:1.4,opts:["1-1","2-0","0-2","3-2"],ans:"1-1",hint:"Near-equal xG makes draw the statistically most likely outcome"},
  {h:"Wolves",a:"Liverpool",hxg:0.5,axg:2.1,opts:["0-2","1-1","0-1","2-0"],ans:"0-2",hint:"Massive away xG advantage, 0-2 is Poisson modal scoreline"},
  {h:"Brighton",a:"Everton",hxg:1.8,axg:0.9,opts:["2-1","0-0","1-3","3-0"],ans:"2-1",hint:"Home xG edge + some away threat = 2-1 home win most likely"},
  {h:"Newcastle",a:"Brentford",hxg:2.0,axg:0.7,opts:["2-0","1-2","0-0","3-3"],ans:"2-0",hint:"Strong home output vs low away xG = dominant home clean sheet"},
];

function ScorelinePredictor() {
  const g=useGame("scoreline_v5");
  const TIMER=80;
  const [round,setRound]=useState(0);
  const [sel,setSel]=useState(null);
  const [fb,setFb]=useState(null);
  const [streak,setStreak]=useState(0);
  const onExpire=useCallback(()=>g.finish(g.scoreRef.current),[g]);
  const timeLeft=useTimer(TIMER,onExpire,g.phase==="playing");

  const pick=opt=>{
    if(fb||g.phase!=="playing")return;
    setSel(opt);const ok=opt===MATCH_DATA[round].ans;
    const pts=ok?60+streak*10:0;g.addLive(pts);setStreak(s=>ok?s+1:0);
    setFb({ok,pts,streak:ok?streak+1:0});
  };
  const next=()=>{setFb(null);setSel(null);const n=round+1;if(n>=MATCH_DATA.length){g.finish(g.scoreRef.current);return;}setRound(n);};

  if(g.phase==="menu")return<GameMenu title="Scoreline Predictor" icon="📊"
    desc="Pick the most likely scoreline from xG data. Poisson distribution thinking! Streak bonuses available."
    diff="Medium" dur="80s" best={g.best} onPlay={g.start} col={C.purple}
    controls={[["Tap","pick scoreline"],["Streak","x10 bonus pts"]]}/>;
  if(g.phase==="results")return<GameResults score={g.score} best={g.best} isNew={g.isNew}
    onRestart={()=>{setRound(0);setSel(null);setFb(null);setStreak(0);g.restart();}} onMenu={g.menu} col={C.purple}/>;

  const m=MATCH_DATA[round];
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderBottom:`1px solid ${C.line}`,flexShrink:0}}>
        <button onClick={g.menu} style={{background:"none",border:`1px solid ${C.line}`,borderRadius:7,color:C.soft,cursor:"pointer",padding:"4px 8px",fontSize:11}}>←</button>
        <span style={{flex:1,fontSize:12,fontWeight:900,color:C.text,fontFamily:"'Sora',sans-serif"}}>📊 Scoreline Predictor</span>
        {streak>0&&<span style={{fontSize:10,color:C.gold,background:`${C.gold}12`,border:`1px solid ${C.gold}28`,padding:"2px 7px",borderRadius:999,fontWeight:900}}>🔥×{streak}</span>}
        <span style={{fontSize:11,color:C.purple,fontFamily:"'JetBrains Mono',monospace",background:`${C.purple}12`,padding:"2px 8px",borderRadius:6,fontWeight:900}}>{g.score}pts</span>
        <span style={{fontSize:10,color:timeLeft<15?C.red:C.soft,fontFamily:"'JetBrains Mono',monospace"}}>{timeLeft}s</span>
      </div>
      <div style={{height:3,background:"rgba(255,255,255,0.05)"}}>
        <div style={{height:"100%",width:`${(timeLeft/TIMER)*100}%`,background:timeLeft<15?C.red:C.purple,transition:"width 1s linear"}}/>
      </div>
      <div style={{flex:1,padding:"12px 14px",display:"flex",flexDirection:"column",gap:10,overflow:"auto"}}>
        <div style={{display:"flex",gap:5}}>
          {Array.from({length:MATCH_DATA.length}).map((_,i)=>(
            <div key={i} style={{flex:1,height:4,borderRadius:2,background:i<round?C.purple:i===round?`${C.purple}66`:"rgba(255,255,255,0.07)"}}/>
          ))}
        </div>
        <div style={{background:`${C.purple}09`,border:`1px solid ${C.purple}22`,borderRadius:10,padding:"12px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <span style={{fontSize:14,fontWeight:900,color:C.text}}>{m.h}</span>
            <span style={{fontSize:11,color:C.soft,fontWeight:700}}>vs</span>
            <span style={{fontSize:14,fontWeight:900,color:C.text}}>{m.a}</span>
          </div>
          {[[m.h,m.hxg,C.blue,"Home"],[m.a,m.axg,C.red,"Away"]].map(([nm,xg,col,lbl])=>(
            <div key={nm} style={{marginBottom:7}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:9,color:C.soft}}>{lbl} xG ({nm})</span>
                <span style={{fontSize:11,fontWeight:900,color:col,fontFamily:"'JetBrains Mono',monospace"}}>{xg.toFixed(1)}</span>
              </div>
              <div style={{height:5,borderRadius:3,background:"rgba(255,255,255,0.05)"}}>
                <div style={{height:"100%",width:`${Math.min(xg/3*100,100)}%`,background:col,borderRadius:3}}/>
              </div>
            </div>
          ))}
          <div style={{fontSize:9,color:C.soft,fontStyle:"italic",marginTop:5}}>💡 {m.hint}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
          {m.opts.map(opt=>{
            const isOk=opt===m.ans,isSel=sel===opt;
            let bg="rgba(255,255,255,0.03)",border=C.line,col=C.muted;
            if(fb){if(isOk){bg=`${C.green}10`;border=C.green;col=C.green;}else if(isSel){bg=`${C.red}0a`;border=C.red;col=C.red;}}
            else if(isSel){bg=`${C.purple}10`;border=C.purple;col=C.purple;}
            return<button key={opt} onClick={()=>pick(opt)} style={{background:bg,border:`2px solid ${border}`,borderRadius:9,
              color:col,fontSize:22,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",
              padding:"13px 8px",cursor:fb?"default":"pointer",transition:"all 130ms",
              display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
              {fb&&isOk&&"✓"}{fb&&isSel&&!isOk&&"✗"}{opt}
            </button>;
          })}
        </div>
        {fb&&<div style={{background:fb.ok?`${C.green}08`:`${C.red}08`,border:`1px solid ${fb.ok?C.green:C.red}28`,
          borderRadius:9,padding:"9px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:12,fontWeight:800,color:fb.ok?C.green:C.red}}>{fb.ok?"Correct ✓":"Wrong ✗"}</div>
            {fb.ok&&fb.streak>1&&<div style={{fontSize:9,color:C.gold}}>🔥 Streak +{(fb.streak-1)*10}</div>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {fb.pts>0&&<span style={{fontSize:15,fontWeight:900,color:C.gold,fontFamily:"'JetBrains Mono',monospace"}}>+{fb.pts}</span>}
            <button onClick={next} style={arcBtn(fb.ok?C.green:C.blue)}>{round+1>=MATCH_DATA.length?"Results →":"Next →"}</button>
          </div>
        </div>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   GAME 10 — SNOOKER ANGLE  (aim & shoot pool-style)
   Click to aim direction, SPACE to power & release
   ════════════════════════════════════════════════════════ */
export function SnookerGame() {
  const canvasRef=useRef(null);const animRef=useRef(null);
  const gs=useRef({
    phase:"aim",    // aim|roll|over
    cx:160,cy:240,  // cue ball
    cvx:0,cvy:0,
    angle:0,        // aim angle (radians)
    power:0,powDir:1,charging:false,
    balls:[         // coloured balls with values
      {x:280,y:120,r:10,col:"#ff5d5d",val:1,potted:false},
      {x:340,y:160,r:10,col:"#f2c94c",val:2,potted:false},
      {x:300,y:200,r:10,col:"#28d97a",val:3,potted:false},
      {x:360,y:220,r:10,col:"#b388ff",val:4,potted:false},
      {x:320,y:260,r:10,col:"#fb923c",val:5,potted:false},
    ],
    score:0,shots:0,animT:0,
    pockets:[{x:20,y:20},{x:230,y:10},{x:440,y:20},{x:20,y:300},{x:230,y:310},{x:440,y:300}],
  });
  const W=460,H=320;

  useEffect(()=>{
    const cv=canvasRef.current,ctx=cv.getContext("2d");let last=0;
    const s=gs.current;

    const reset=()=>{
      Object.assign(s,{phase:"aim",cx:160,cy:240,cvx:0,cvy:0,angle:0,power:0,powDir:1,charging:false,shots:0,score:0,animT:0});
      s.balls.forEach((b,i)=>{b.potted=false;b.x=[280,340,300,360,320][i];b.y=[120,160,200,220,260][i];b.vx=0;b.vy=0;});
    };

    const onMouseMove=e=>{
      if(s.phase!=="aim") return;
      const rect=cv.getBoundingClientRect();
      const mx=e.clientX-rect.left,my=e.clientY-rect.top;
      s.angle=Math.atan2(my-s.cy,mx-s.cx);
    };
    const onKeyDown=e=>{
      if(e.code==="Space"){e.preventDefault();
        if(s.phase==="aim"&&!s.charging){s.charging=true;s.power=0;}
        if(s.phase==="over") reset();
      }
      if(e.code==="Enter"&&s.phase==="over") reset();
    };
    const onKeyUp=e=>{
      if(e.code==="Space"&&s.charging&&s.phase==="aim"){
        s.charging=false;
        const spd=200+s.power*320;
        s.cvx=Math.cos(s.angle)*spd;s.cvy=Math.sin(s.angle)*spd;
        s.phase="roll";s.shots++;s.animT=0;
      }
    };
    cv.addEventListener("mousemove",onMouseMove);
    window.addEventListener("keydown",onKeyDown);window.addEventListener("keyup",onKeyUp);

    const loop=(ts)=>{
      const dt=Math.min((ts-last)/1000,.05);last=ts;
      ctx.clearRect(0,0,W,H);

      // Table
      const table=ctx.createLinearGradient(0,0,0,H);
      table.addColorStop(0,"#0d5e2a");table.addColorStop(1,"#094d21");
      ctx.fillStyle=table;ctx.fillRect(0,0,W,H);
      // Cushion border
      ctx.fillStyle="#5d3a00";ctx.fillRect(0,0,W,14);ctx.fillRect(0,H-14,W,14);
      ctx.fillRect(0,0,14,H);ctx.fillRect(W-14,0,14,H);
      // Table lines
      ctx.strokeStyle="rgba(255,255,255,0.08)";ctx.lineWidth=1;
      ctx.strokeRect(14,14,W-28,H-28);
      ctx.beginPath();ctx.moveTo(W/2,14);ctx.lineTo(W/2,H-14);ctx.stroke();
      ctx.beginPath();ctx.arc(W/2,H/2,40,0,Math.PI*2);ctx.stroke();

      // Pockets
      s.pockets.forEach(p=>{
        ctx.shadowColor="#000";ctx.shadowBlur=12;
        ctx.fillStyle="#000";ctx.beginPath();ctx.arc(p.x,p.y,14,0,Math.PI*2);ctx.fill();
        ctx.shadowBlur=0;
        ctx.strokeStyle="rgba(255,255,255,0.08)";ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,14,0,Math.PI*2);ctx.stroke();
      });

      // Physics
      if(s.phase==="roll"){
        s.animT+=dt;
        const FRICTION=0.985;
        // Move cue ball
        s.cvx*=FRICTION;s.cvy*=FRICTION;
        s.cx+=s.cvx*dt;s.cy+=s.cvy*dt;
        // Cue ball cushion bounces
        if(s.cx<24){s.cx=24;s.cvx=Math.abs(s.cvx)*.85;}
        if(s.cx>W-24){s.cx=W-24;s.cvx=-Math.abs(s.cvx)*.85;}
        if(s.cy<24){s.cy=24;s.cvy=Math.abs(s.cvy)*.85;}
        if(s.cy>H-24){s.cy=H-24;s.cvy=-Math.abs(s.cvy)*.85;}

        // Cue ball collisions with coloured balls
        s.balls.forEach(b=>{
          if(b.potted)return;
          b.vx=(b.vx||0)*FRICTION;b.vy=(b.vy||0)*FRICTION;
          b.x+=(b.vx||0)*dt;b.y+=(b.vy||0)*dt;
          // Cushion bounces
          if(b.x<24){b.x=24;b.vx=Math.abs(b.vx||0)*.8;}
          if(b.x>W-24){b.x=W-24;b.vx=-Math.abs(b.vx||0)*.8;}
          if(b.y<24){b.y=24;b.vy=Math.abs(b.vy||0)*.8;}
          if(b.y>H-24){b.y=H-24;b.vy=-Math.abs(b.vy||0)*.8;}
          // Check pocket
          s.pockets.forEach(p=>{if(!b.potted&&Math.hypot(b.x-p.x,b.y-p.y)<16){b.potted=true;s.score+=b.val;}});
          // Collision with cue ball
          const dist=Math.hypot(s.cx-b.x,s.cy-b.y);
          const minD=10+10;
          if(dist<minD&&dist>0.1){
            const nx=(b.x-s.cx)/dist,ny=(b.y-s.cy)/dist;
            const rv=(s.cvx-(b.vx||0))*nx+(s.cvy-(b.vy||0))*ny;
            if(rv>0){
              s.cvx-=rv*nx;s.cvy-=rv*ny;
              b.vx=(b.vx||0)+rv*nx;b.vy=(b.vy||0)+rv*ny;
              const overlap=minD-dist;s.cx-=nx*overlap*.5;s.cy-=ny*overlap*.5;b.x+=nx*overlap*.5;b.y+=ny*overlap*.5;
            }
          }
        });
        // Check pocket for cue ball
        let cuePotted=false;
        s.pockets.forEach(p=>{if(Math.hypot(s.cx-p.x,s.cy-p.y)<16){cuePotted=true;}});
        if(cuePotted){s.cx=160;s.cy=240;s.cvx=0;s.cvy=0;}

        // Stop when slow enough
        const allSlow=Math.hypot(s.cvx,s.cvy)<8&&s.balls.every(b=>b.potted||Math.hypot(b.vx||0,b.vy||0)<8);
        if(allSlow){
          s.cvx=0;s.cvy=0;
          s.balls.forEach(b=>{b.vx=0;b.vy=0;});
          const allPotted=s.balls.every(b=>b.potted);
          if(allPotted||s.shots>=8) s.phase="over";
          else s.phase="aim";
        }
      }

      // AIM phase — aim line & power
      if(s.phase==="aim"){
        if(s.charging){s.power+=1.6*dt;if(s.power>1)s.power=1;}
        // Aim line
        ctx.setLineDash([5,5]);
        ctx.strokeStyle="rgba(255,255,255,0.25)";ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(s.cx,s.cy);
        ctx.lineTo(s.cx+Math.cos(s.angle)*160,s.cy+Math.sin(s.angle)*160);ctx.stroke();
        ctx.setLineDash([]);
        // Power bar
        const bW=100,bX=W/2-50,bY=H-16;
        ctx.fillStyle="rgba(0,0,0,0.5)";ctx.beginPath();ctx.roundRect(bX,bY,bW,6,3);ctx.fill();
        const bG=ctx.createLinearGradient(bX,0,bX+bW,0);
        bG.addColorStop(0,"#28d97a");bG.addColorStop(.7,"#f2c94c");bG.addColorStop(1,"#ff5d5d");
        ctx.fillStyle=bG;ctx.beginPath();ctx.roundRect(bX,bY,bW*s.power,6,3);ctx.fill();
        ctx.fillStyle="#8a9ab8";ctx.font="8px Inter";ctx.textAlign="center";ctx.fillText(s.charging?"Release SPACE!":"Hold SPACE · move mouse to aim",W/2,bY-4);
      }

      // Draw coloured balls
      s.balls.forEach(b=>{
        if(b.potted)return;
        ctx.shadowColor=b.col;ctx.shadowBlur=14;
        const bg=ctx.createRadialGradient(b.x-b.r*.3,b.y-b.r*.3,b.r*.1,b.x,b.y,b.r);
        bg.addColorStop(0,"rgba(255,255,255,0.7)");bg.addColorStop(.3,b.col);bg.addColorStop(1,b.col+"88");
        ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fillStyle=bg;ctx.fill();
        ctx.shadowBlur=0;
        ctx.fillStyle="rgba(0,0,0,0.7)";ctx.font="bold 8px Inter";ctx.textAlign="center";
        ctx.fillText(b.val,b.x,b.y+3);
      });

      // Draw cue ball
      if(!([s.phase==="over"])){
        ctx.shadowColor="#fff";ctx.shadowBlur=12;
        const cbg=ctx.createRadialGradient(s.cx-4,s.cy-4,1,s.cx,s.cy,10);
        cbg.addColorStop(0,"#fff");cbg.addColorStop(1,"#ccc");
        ctx.beginPath();ctx.arc(s.cx,s.cy,10,0,Math.PI*2);ctx.fillStyle=cbg;ctx.fill();
        ctx.shadowBlur=0;
      }

      // OVER
      if(s.phase==="over"){
        ctx.fillStyle="rgba(0,0,0,0.78)";ctx.fillRect(0,0,W,H);
        const fc=s.score>=12?"#28d97a":s.score>=7?"#f2c94c":"#ff5d5d";
        ctx.fillStyle="#f4f7fb";ctx.font="bold 22px 'Sora',sans-serif";ctx.textAlign="center";ctx.fillText("🎱 Frame Over",W/2,H/2-44);
        ctx.fillStyle=fc;ctx.shadowColor=fc;ctx.shadowBlur=20;
        ctx.font="bold 54px 'JetBrains Mono',monospace";ctx.fillText(`${s.score}pts`,W/2,H/2+10);
        ctx.shadowBlur=0;ctx.fillStyle="#3a5272";ctx.font="11px Inter";
        ctx.fillText(`${s.shots} shots · ${s.balls.filter(b=>b.potted).length}/5 potted`,W/2,H/2+38);
        ctx.fillStyle="#67b1ff";ctx.fillText("SPACE / Enter to replay",W/2,H/2+58);
      }

      // HUD
      ctx.fillStyle="rgba(6,10,20,0.7)";ctx.fillRect(0,0,W,24);
      ctx.font="bold 10px 'JetBrains Mono',monospace";
      ctx.textAlign="left";ctx.fillStyle="#28d97a";ctx.fillText(`${s.score} pts`,10,16);
      ctx.textAlign="center";ctx.fillStyle="#f2c94c";ctx.fillText("SNOOKER",W/2,16);
      ctx.textAlign="right";ctx.fillStyle="#3a5272";ctx.fillText(`${s.shots}/8 shots`,W-10,16);

      animRef.current=requestAnimationFrame(loop);
    };
    animRef.current=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(animRef.current);cv.removeEventListener("mousemove",onMouseMove);
      window.removeEventListener("keydown",onKeyDown);window.removeEventListener("keyup",onKeyUp);};
  },[W,H]);

  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:12}}>
      <canvas ref={canvasRef} width={W} height={H}
        style={{display:"block",borderRadius:12,maxWidth:"100%",height:"auto",boxShadow:"0 0 40px rgba(40,217,122,0.12)",cursor:"crosshair"}}/>
      <div style={{fontSize:10,color:C.soft,textAlign:"center"}}>
        <b style={{color:C.text}}>Move mouse</b> to aim · <b style={{color:C.text}}>Hold SPACE</b> for power · <b style={{color:C.text}}>Release</b> to shoot
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   GAME 11 — SPRINT RACER  (tap SPACE rapidly to accelerate)
   ════════════════════════════════════════════════════════ */
export function SprintRacer() {
  const canvasRef=useRef(null);const animRef=useRef(null);
  const gs=useRef({
    phase:"intro",   // intro|race|result
    playerX:80,cpuX:80,
    playerSpd:0,cpuSpd:0,
    playerTaps:0,tapDecay:0,
    t:0,elapsed:0,
    winner:"",
    tapCooldown:0,
    tapFlash:0,
    distance:700,
  });
  const W=460,H=240;

  useEffect(()=>{
    const cv=canvasRef.current,ctx=cv.getContext("2d");let last=0;const s=gs.current;

    const onKey=e=>{
      if(e.code==="Space"){e.preventDefault();
        if(s.phase==="intro"){s.phase="race";s.playerX=80;s.cpuX=80;s.playerSpd=0;s.cpuSpd=0;s.elapsed=0;s.tapDecay=0;}
        else if(s.phase==="race"&&s.tapCooldown<=0){
          s.playerSpd=Math.min(s.playerSpd+28,380);
          s.tapFlash=0.3;s.tapCooldown=0.06;
        }
        else if(s.phase==="result"){s.phase="intro";}
      }
    };
    window.addEventListener("keydown",onKey);
    cv.addEventListener("click",()=>{
      if(s.phase==="intro"){Object.assign(s,{phase:"race",playerX:80,cpuX:80,playerSpd:0,cpuSpd:0,elapsed:0,tapDecay:0,tapCooldown:0,tapFlash:0});}
      else if(s.phase==="race"&&s.tapCooldown<=0){s.playerSpd=Math.min(s.playerSpd+28,380);s.tapFlash=0.3;s.tapCooldown=0.06;}
      else if(s.phase==="result"){s.phase="intro";}
    });

    const loop=(ts)=>{
      const dt=Math.min((ts-last)/1000,.04);last=ts;
      ctx.clearRect(0,0,W,H);

      // Background track
      ctx.fillStyle="#0a0a14";ctx.fillRect(0,0,W,H);
      // Track lanes
      for(let i=0;i<3;i++){
        const ly=50+i*56;
        ctx.fillStyle=i%2===0?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.01)";
        ctx.fillRect(0,ly,W,54);
        // Lane lines
        ctx.setLineDash([20,12]);ctx.strokeStyle="rgba(255,255,255,0.1)";ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(0,ly);ctx.lineTo(W,ly);ctx.stroke();ctx.setLineDash([]);
        // Lane number
        ctx.fillStyle="rgba(255,255,255,0.06)";ctx.font="bold 24px Inter";ctx.textAlign="left";ctx.fillText(i+1,6,ly+36);
      }
      // Finish line
      const finX=s.distance;
      if(finX<W){
        ctx.shadowColor="#f2c94c";ctx.shadowBlur=12;
        ctx.strokeStyle="#f2c94c";ctx.lineWidth=3;
        ctx.beginPath();ctx.moveTo(finX,48);ctx.lineTo(finX,H-48);ctx.stroke();
        ctx.shadowBlur=0;
        for(let y=48;y<H-48;y+=8){
          ctx.fillStyle=(Math.floor(y/8)%2===0)?"#f2c94c":"rgba(0,0,0,0)";
          ctx.fillRect(finX,y,6,8);
        }
        ctx.fillStyle="#f2c94c";ctx.font="bold 8px Inter";ctx.textAlign="center";ctx.fillText("FINISH",finX+10,H-38);
      }

      if(s.phase==="race"){
        s.elapsed+=dt;
        s.tapCooldown=Math.max(0,s.tapCooldown-dt);
        s.tapFlash=Math.max(0,s.tapFlash-dt*3);
        // Player deceleration
        s.playerSpd=Math.max(0,s.playerSpd-120*dt);
        // CPU steady acceleration (beatable)
        s.cpuSpd=Math.min(s.cpuSpd+30*dt,220+Math.sin(s.elapsed*2)*40);
        // Move
        s.playerX+=s.playerSpd*dt;
        s.cpuX+=s.cpuSpd*dt;

        // Win detection
        const playerWon=s.playerX>=s.distance;
        const cpuWon=s.cpuX>=s.distance;
        if(playerWon||cpuWon){
          s.winner=playerWon&&!cpuWon?"player":cpuWon&&!playerWon?"cpu":"draw";
          s.phase="result";
        }
      }

      // Draw runners (simple animated stick figures)
      const drawRunner=(x,laneY,col,label)=>{
        if(x>W+20)return;
        const run=s.phase==="race";const bob=run?Math.sin((gs.current.elapsed||0)*12)*4:0;
        ctx.shadowColor=col;ctx.shadowBlur=12;
        // Body
        ctx.strokeStyle=col;ctx.lineWidth=3;ctx.lineCap="round";
        ctx.beginPath();ctx.moveTo(x,laneY-20+bob);ctx.lineTo(x,laneY);ctx.stroke();
        // Head
        ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,laneY-26+bob,7,0,Math.PI*2);ctx.fill();
        // Arms
        const arm=run?Math.sin((gs.current.elapsed||0)*12)*12:0;
        ctx.beginPath();ctx.moveTo(x-10,laneY-10+bob);ctx.lineTo(x+arm,laneY-18+bob);ctx.stroke();
        ctx.beginPath();ctx.moveTo(x+10,laneY-10+bob);ctx.lineTo(x-arm,laneY-18+bob);ctx.stroke();
        // Legs
        ctx.beginPath();ctx.moveTo(x,laneY+bob);ctx.lineTo(x-10+arm,laneY+20+bob);ctx.stroke();
        ctx.beginPath();ctx.moveTo(x,laneY+bob);ctx.lineTo(x+10-arm,laneY+20+bob);ctx.stroke();
        ctx.shadowBlur=0;
        // Label
        ctx.fillStyle=col;ctx.font="bold 8px Inter";ctx.textAlign="center";ctx.fillText(label,x,laneY-38+bob);
      };

      drawRunner(Math.min(s.playerX,W-30),100,"#f2c94c","YOU");
      drawRunner(Math.min(s.cpuX,W-30),155,"#ff5d5d","CPU");

      // Speed indicators
      if(s.phase==="race"){
        // Player speed bar
        ctx.fillStyle=`rgba(242,201,76,${.15+s.tapFlash*.6})`;ctx.fillRect(10,48,Math.min(s.playerSpd/380*200,200),8);
        ctx.strokeStyle="rgba(242,201,76,0.4)";ctx.lineWidth=1;ctx.strokeRect(10,48,200,8);
        // CPU speed bar
        ctx.fillStyle="rgba(255,93,93,0.2)";ctx.fillRect(10,103,Math.min(s.cpuSpd/380*200,200),8);
        ctx.strokeStyle="rgba(255,93,93,0.3)";ctx.lineWidth=1;ctx.strokeRect(10,103,200,8);
        // Tap prompt
        ctx.fillStyle=`rgba(255,255,255,${.4+s.tapFlash*.5})`;ctx.font="bold 11px 'Sora',sans-serif";ctx.textAlign="center";
        ctx.fillText("TAP SPACE / CLICK repeatedly!",W/2,H-12);
      }

      // Overlays
      if(s.phase==="intro"){
        ctx.fillStyle="rgba(0,0,0,0.78)";ctx.fillRect(0,0,W,H);
        ctx.fillStyle="#f4f7fb";ctx.font="bold 22px 'Sora',sans-serif";ctx.textAlign="center";ctx.fillText("⚡ Sprint Race",W/2,H/2-24);
        ctx.fillStyle="#8a9ab8";ctx.font="11px Inter";ctx.fillText("Tap SPACE or CLICK repeatedly to run!",W/2,H/2+2);
        ctx.fillStyle="#f2c94c";ctx.fillText("Tap to start",W/2,H/2+24);
      }
      if(s.phase==="result"){
        ctx.fillStyle="rgba(0,0,0,0.82)";ctx.fillRect(0,0,W,H);
        const wc=s.winner==="player"?"#28d97a":s.winner==="cpu"?"#ff5d5d":"#f2c94c";
        ctx.fillStyle=wc;ctx.shadowColor=wc;ctx.shadowBlur=22;
        ctx.font="bold 28px 'Sora',sans-serif";ctx.textAlign="center";
        ctx.fillText(s.winner==="player"?"You Win! ⚡":s.winner==="cpu"?"CPU Wins 🤖":"Photo Finish!",W/2,H/2-10);
        ctx.shadowBlur=0;ctx.fillStyle="#3a5272";ctx.font="11px Inter";
        ctx.fillText(`${s.elapsed.toFixed(2)}s`,W/2,H/2+16);
        ctx.fillStyle="#67b1ff";ctx.fillText("Tap to race again",W/2,H/2+38);
      }

      // HUD
      ctx.fillStyle="rgba(6,10,20,0.7)";ctx.fillRect(0,0,W,22);
      ctx.font="bold 10px 'JetBrains Mono',monospace";
      ctx.textAlign="left";ctx.fillStyle="#f2c94c";ctx.fillText("⚡ YOU",10,15);
      ctx.textAlign="center";ctx.fillStyle="#8a9ab8";ctx.fillText(s.phase==="race"?`${s.elapsed.toFixed(1)}s`:"SPRINT RACE",W/2,15);
      ctx.textAlign="right";ctx.fillStyle="#ff5d5d";ctx.fillText("CPU 🤖",W-10,15);

      animRef.current=requestAnimationFrame(loop);
    };
    animRef.current=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(animRef.current);window.removeEventListener("keydown",onKey);};
  },[W,H]);

  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:12}}>
      <canvas ref={canvasRef} width={W} height={H}
        style={{display:"block",borderRadius:12,maxWidth:"100%",height:"auto",boxShadow:"0 0 40px rgba(242,201,76,0.12)",cursor:"pointer"}}/>
      <div style={{fontSize:10,color:C.soft,textAlign:"center"}}>
        <b style={{color:C.text}}>Tap SPACE / Click</b> repeatedly to sprint faster than the CPU
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   GAME 12 — ANALYTICS IQ QUIZ  (football stats knowledge)
   ════════════════════════════════════════════════════════ */
const IQ_QS=[
  {q:"Which stat isolates goalkeeper shot-stopping from team defence quality?",
    opts:["Clean sheet %","PSxG-GA","Save rate","PPDA"],ans:1,
    why:"PSxG-GA (Post-Shot xG minus Goals Allowed) strips out chance quality, isolating only the keeper's shot-stopping ability."},
  {q:"A team xG 1.9, actual goals 0.6/game over 20 matches. What's likely?",
    opts:["Consistent bad luck","Systematic underfinishing","Low xG model quality","Defensive xG inflation"],ans:1,
    why:"20 games is enough to rule out variance. Persistent xG overperformance of goals indicates systematic finishing issues — poor composure or striker quality."},
  {q:"PPDA of 5.8 vs 16.2 — what's the correct interpretation?",
    opts:["5.8 presses far more aggressively","16.2 presses more","They're equal","Cannot tell from PPDA alone"],ans:0,
    why:"PPDA = passes conceded per defensive action. Lower = more aggressive pressing. 5.8 is elite pressing (Man City/Liverpool level). 16.2 is passive mid/low block."},
  {q:"Progressive passes measure passes that advance the ball toward goal by…?",
    opts:["10+ yards","25+ yards","Into penalty area only","Across halfway line"],ans:0,
    why:"A progressive pass advances the ball ≥10 yards toward the opponent's goal, or enters the penalty area. It's a core possession-progression metric in modern analytics."},
  {q:"An xA value of 0.28 on a through ball means?",
    opts:["28% goal probability if recipient shoots","28 expected assists","Very low quality chance","Equivalent to a shot"],ans:0,
    why:"xA = Expected Assists. 0.28 means if the pass recipient shoots, there's a 28% chance of a goal. Average key pass is ~0.08–0.12 xA, so 0.28 is very high quality."},
  {q:"Which formation best exploits space behind a high-press 4-3-3?",
    opts:["4-2-3-1 with quick transitions","5-4-1 deep block","4-3-3 mirror","3-5-2 with wingbacks"],ans:0,
    why:"A 4-2-3-1 with pacey forwards can exploit the space behind pressing wide midfielders. The double pivot protects against counter-press, enabling quick vertical transitions."},
];

function AnalyticsIq() {
  const g=useGame("iq_v5");const TIMER=120;
  const [round,setRound]=useState(0);
  const [sel,setSel]=useState(null);
  const [fb,setFb]=useState(null);
  const [streak,setStreak]=useState(0);
  const onExpire=useCallback(()=>g.finish(g.scoreRef.current),[g]);
  const timeLeft=useTimer(TIMER,onExpire,g.phase==="playing");

  const pick=i=>{if(fb||g.phase!=="playing")return;setSel(i);const ok=i===IQ_QS[round].ans;const pts=ok?80+streak*15:0;g.addLive(pts);setStreak(s=>ok?s+1:0);setFb({ok,why:IQ_QS[round].why,pts,streak:ok?streak+1:0});};
  const next=()=>{setFb(null);setSel(null);const n=round+1;if(n>=IQ_QS.length){g.finish(g.scoreRef.current);return;}setRound(n);};

  if(g.phase==="menu")return<GameMenu title="Analytics IQ" icon="🧠"
    desc="6 questions on xG, PPDA, PSxG, progressive passes and tactics. Build answer streaks for big bonuses!"
    diff="Hard" dur="120s" best={g.best} onPlay={g.start} col={C.cyan}
    controls={[["A–D","pick answer"],["Streak","×15 bonus"]]}/>;
  if(g.phase==="results")return<GameResults score={g.score} best={g.best} isNew={g.isNew}
    onRestart={()=>{setRound(0);setSel(null);setFb(null);setStreak(0);g.restart();}} onMenu={g.menu} col={C.cyan}/>;

  const q=IQ_QS[round];
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderBottom:`1px solid ${C.line}`,flexShrink:0}}>
        <button onClick={g.menu} style={{background:"none",border:`1px solid ${C.line}`,borderRadius:7,color:C.soft,cursor:"pointer",padding:"4px 8px",fontSize:11}}>←</button>
        <span style={{flex:1,fontSize:12,fontWeight:900,color:C.text,fontFamily:"'Sora',sans-serif"}}>🧠 Analytics IQ</span>
        {streak>0&&<span style={{fontSize:10,color:C.gold,background:`${C.gold}12`,border:`1px solid ${C.gold}28`,padding:"2px 7px",borderRadius:999,fontWeight:900}}>🔥×{streak}</span>}
        <span style={{fontSize:11,color:C.cyan,fontFamily:"'JetBrains Mono',monospace",background:`${C.cyan}12`,padding:"2px 8px",borderRadius:6,fontWeight:900}}>{g.score}pts</span>
        <span style={{fontSize:10,color:timeLeft<20?C.red:C.soft,fontFamily:"'JetBrains Mono',monospace"}}>{timeLeft}s</span>
      </div>
      <div style={{height:3,background:"rgba(255,255,255,0.05)"}}>
        <div style={{height:"100%",width:`${(timeLeft/TIMER)*100}%`,background:timeLeft<20?C.red:C.cyan,transition:"width 1s linear"}}/>
      </div>
      <div style={{flex:1,padding:"12px 14px",display:"flex",flexDirection:"column",gap:9,overflow:"auto"}}>
        <div style={{display:"flex",gap:4}}>
          {IQ_QS.map((_,i)=><div key={i} style={{flex:1,height:4,borderRadius:2,background:i<round?C.cyan:i===round?`${C.cyan}66`:"rgba(255,255,255,0.07)"}}/>)}
        </div>
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
            return<button key={i} onClick={()=>pick(i)} style={{background:bg,border:`1.5px solid ${border}`,borderRadius:9,
              padding:"10px 12px",cursor:fb?"default":"pointer",textAlign:"left",display:"flex",alignItems:"center",
              gap:8,transition:"all 130ms",color:col,fontFamily:"'Inter',sans-serif"}}>
              <div style={{width:20,height:20,borderRadius:5,background:`${border}22`,flexShrink:0,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900}}>
                {String.fromCharCode(65+i)}
              </div>
              <span style={{fontSize:11.5,fontWeight:700}}>{opt}</span>
              {fb&&isOk&&<span style={{marginLeft:"auto"}}>✓</span>}
              {fb&&isSel&&!isOk&&<span style={{marginLeft:"auto"}}>✗</span>}
            </button>;
          })}
        </div>
        {fb&&<div style={{background:fb.ok?`${C.green}08`:`${C.red}08`,border:`1px solid ${fb.ok?C.green:C.red}28`,borderRadius:9,padding:"10px 12px"}}>
          <div style={{fontSize:12,fontWeight:900,color:fb.ok?C.green:C.red,marginBottom:4}}>
            {fb.ok?"Correct ✓":"Wrong ✗"}
            {fb.ok&&fb.streak>1&&<span style={{color:C.gold,fontSize:10,marginLeft:8}}>+{(fb.streak-1)*15} streak!</span>}
          </div>
          <div style={{fontSize:10.5,color:C.muted,lineHeight:1.6,marginBottom:8}}>{fb.why}</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            {fb.pts>0&&<span style={{fontSize:14,fontWeight:900,color:C.gold,fontFamily:"'JetBrains Mono',monospace"}}>+{fb.pts}</span>}
            <button onClick={next} style={arcBtn(fb.ok?C.cyan:C.blue)}>{round+1>=IQ_QS.length?"Results →":"Next →"}</button>
          </div>
        </div>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   GAME REGISTRY — 12 games total
   ════════════════════════════════════════════════════════ */
const GAMES=[
  {id:"penalty",    title:"Penalty Shootout",   icon:"⚽", col:C.green,  cat:"Sport",     diff:"Easy",   desc:"Shoot crosshair into goal past a diving GK. 5 penalties.", Component:PenaltyGame},
  {id:"tennis",     title:"Tennis Rally",        icon:"🎾", col:C.blue,   cat:"Sport",     diff:"Medium", desc:"Keep the rally alive. Beat CPU to 7 points.", Component:TennisGame},
  {id:"basketball", title:"Basketball Free Throw",icon:"🏀", col:C.orange, cat:"Sport",     diff:"Easy",   desc:"Hold & release SPACE to power your free throw. 6 shots.", Component:BasketballGame},
  {id:"hopper",     title:"Pitch Hopper",        icon:"⚡", col:C.teal,   cat:"Sport",     diff:"Medium", desc:"Dodge defenders, cross all 6 lanes to score 3 goals.", Component:PitchHopperGame},
  {id:"tictactoe",  title:"Tic-Tac-Toe",         icon:"✕○", col:C.cyan,   cat:"Puzzle",    diff:"Medium", desc:"Beat the unbeatable minimax AI. Try to draw at least!", Component:TicTacToe},
  {id:"2048",       title:"2048 Slide",           icon:"🔢", col:C.purple, cat:"Puzzle",    diff:"Hard",   desc:"Slide tiles to reach 2048. Merging tiles builds your score.", Component:Game2048},
  {id:"xg",         title:"xG Guesser",           icon:"🎯", col:C.green,  cat:"Analytics", diff:"Medium", desc:"Estimate expected goals for each shot. 2dp precision wins.", Component:XgGuesser},
  {id:"captain",    title:"FPL Captain",          icon:"👑", col:C.gold,   cat:"Analytics", diff:"Hard",   desc:"Pick the optimal FPL captain across 3 gameweeks.", Component:FplCaptain},
  {id:"scoreline",  title:"Scoreline Predictor",  icon:"📊", col:C.purple, cat:"Analytics", diff:"Medium", desc:"Use xG data to predict the most likely match scoreline.", Component:ScorelinePredictor},
  {id:"snooker",    title:"Snooker",              icon:"🎱", col:C.green,  cat:"Sport",     diff:"Medium", desc:"Aim with mouse, hold SPACE to power, pot all 5 balls.", Component:SnookerGame},
  {id:"sprint",     title:"Sprint Race",          icon:"💨", col:C.gold,   cat:"Sport",     diff:"Easy",   desc:"Tap SPACE or click rapidly to outrun the CPU.", Component:SprintRacer},
  {id:"iq",         title:"Analytics IQ",         icon:"🧠", col:C.cyan,   cat:"Analytics", diff:"Hard",   desc:"6 questions on xG, PPDA, PSxG and tactical concepts.", Component:AnalyticsIq},
];

const CONTROLS=[
  ["SPACE","Shoot / Charge / Action"],["←→ / AD","Move left-right"],["↑↓ / WS","Move up-down"],
  ["Enter","Start / Restart"],["Mouse","Aim (Snooker)"],["Click","Shoot / Tap sprint"],
];

const CATS=["All","Sport","Analytics","Puzzle"];

/* ════════════════════════════════════════════════════════
   GAME MODAL
   ════════════════════════════════════════════════════════ */
function GameModal({ game, onClose }) {
  useEffect(()=>{
    const kd=e=>{if(e.key==="Escape")onClose();};
    window.addEventListener("keydown",kd);return()=>window.removeEventListener("keydown",kd);
  },[onClose]);

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:1000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(8px)"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:C.panel,border:`1px solid ${game.col}28`,borderRadius:18,
        overflow:"hidden",position:"relative",maxWidth:500,width:"100%",
        maxHeight:"92vh",display:"flex",flexDirection:"column",
        boxShadow:`0 0 60px ${game.col}22, 0 24px 48px rgba(0,0,0,0.7)`}}>
        {/* Close */}
        <button onClick={onClose} style={{position:"absolute",top:10,right:12,zIndex:10,
          background:"rgba(0,0,0,0.5)",border:`1px solid ${C.line}`,borderRadius:8,
          color:C.muted,cursor:"pointer",padding:"4px 10px",fontSize:12,fontFamily:"inherit"}}>
          ESC ✕
        </button>
        {/* Accent bar */}
        <div style={{height:3,background:`linear-gradient(90deg,transparent,${game.col},transparent)`,flexShrink:0}}/>
        {/* Game area */}
        <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column"}}>
          <game.Component/>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   GAME CARD
   ════════════════════════════════════════════════════════ */
function GameCard({ game, onOpen }) {
  const [hov,setHov]=useState(false);
  const best=getBest(game.id);
  const diffCol=game.diff==="Easy"?C.green:game.diff==="Medium"?C.gold:C.red;
  const catCol=game.cat==="Analytics"?C.cyan:game.cat==="Puzzle"?C.purple:C.blue;

  return(
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      onClick={onOpen}
      style={{
        background:hov?`linear-gradient(135deg,rgba(8,13,24,0.98),${game.col}12)`:"rgba(8,13,24,0.98)",
        border:`1px solid ${hov?game.col+"44":C.line}`,
        borderRadius:14,padding:"18px 16px",cursor:"pointer",
        transition:"all 220ms cubic-bezier(0.22,1,0.36,1)",
        transform:hov?"translateY(-4px) scale(1.01)":"translateY(0) scale(1)",
        boxShadow:hov?`0 12px 36px ${game.col}22, 0 0 0 1px ${game.col}22`:"0 2px 8px rgba(0,0,0,0.3)",
        position:"relative",overflow:"hidden",
      }}>
      {/* Background glow on hover */}
      {hov&&<div style={{position:"absolute",top:-30,right:-30,width:100,height:100,
        borderRadius:"50%",background:`${game.col}15`,filter:"blur(24px)",pointerEvents:"none"}}/>}
      {/* Icon + title row */}
      <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:10}}>
        <div style={{fontSize:32,lineHeight:1,filter:`drop-shadow(0 0 10px ${game.col}88)`,
          flexShrink:0,animation:hov?"mgFloat 2s ease-in-out infinite":"none"}}>{game.icon}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:900,color:C.text,fontFamily:"'Sora',sans-serif",
            letterSpacing:"-0.01em",marginBottom:4,lineHeight:1.2}}>{game.title}</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            <span style={{fontSize:9,fontWeight:800,color:catCol,background:`${catCol}14`,
              border:`1px solid ${catCol}30`,padding:"1px 7px",borderRadius:999}}>{game.cat}</span>
            <span style={{fontSize:9,fontWeight:800,color:diffCol,background:`${diffCol}14`,
              border:`1px solid ${diffCol}30`,padding:"1px 7px",borderRadius:999}}>{game.diff}</span>
          </div>
        </div>
      </div>
      {/* Desc */}
      <div style={{fontSize:11,color:C.muted,lineHeight:1.6,marginBottom:12,
        overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
        {game.desc}
      </div>
      {/* Footer */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        {best!=null
          ?<span style={{fontSize:10,fontWeight:800,color:C.gold,background:`${C.gold}10`,
              border:`1px solid ${C.gold}28`,padding:"2px 8px",borderRadius:6}}>🏆 {best}</span>
          :<span style={{fontSize:10,color:C.soft}}>No score yet</span>
        }
        <div style={{display:"flex",alignItems:"center",gap:6,
          background:`${game.col}14`,border:`1px solid ${game.col}33`,
          borderRadius:8,padding:"5px 12px",transition:"all 150ms",
          boxShadow:hov?`0 0 14px ${game.col}44`:"none"}}>
          <span style={{fontSize:11,fontWeight:900,color:game.col,fontFamily:"'Sora',sans-serif"}}>
            {hov?"Let's go →":"Play"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════ */
export default function MiniGamesPage() {
  const isMobile = useIsMobile();
  const [active,  setActive]  = useState(null); // open game
  const [cat,     setCat]     = useState("All");
  const [scores,  setScores]  = useState(loadAll());

  // Refresh scores when modal closes
  const handleClose=useCallback(()=>{setActive(null);setScores(loadAll());},[]);

  const filtered=cat==="All"?GAMES:GAMES.filter(g=>g.cat===cat);
  const totalScore=Object.values(scores).reduce((a,b)=>a+(b||0),0);
  const gamesPlayed=Object.keys(scores).length;

  return(
    <>
      <style>{KEYFRAMES}</style>
      {/* Animated bg orbs */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
        {[[C.green,.12,"-20%","10%","48s"],[C.blue,.1,"80%","60%","62s"],[C.purple,.08,"40%","-10%","55s"]].map(([col,op,l,t,dur],i)=>(
          <div key={i} style={{position:"absolute",width:500,height:500,borderRadius:"50%",left:l,top:t,
            background:col,opacity:op,filter:"blur(120px)",animation:`mgOrbFloat ${dur} ease-in-out infinite`,
            animationDelay:`${i*8}s`}}/>
        ))}
      </div>

      <div style={{position:"relative",zIndex:1,minHeight:"100vh",background:"transparent",
        padding:"0 0 60px"}}>

        {/* ── Page header ── */}
        <div style={{borderBottom:`1px solid ${C.line}`,background:"rgba(6,10,20,0.85)",
          backdropFilter:"blur(16px)",padding:"28px 24px 20px",marginBottom:0,position:"sticky",top:0,zIndex:100}}>
          <div style={{maxWidth:900,margin:"0 auto"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap",marginBottom:16}}>
              <div>
                <div style={{fontSize:10,fontWeight:900,color:C.soft,letterSpacing:"0.18em",marginBottom:6}}>STATINSITE</div>
                <h1 style={{fontSize:26,fontWeight:900,color:C.text,fontFamily:"'Sora',sans-serif",
                  letterSpacing:"-0.03em",margin:0,lineHeight:1}}>
                  Sports Arcade
                  <span style={{fontSize:14,fontWeight:700,color:C.muted,marginLeft:10,fontFamily:"'Inter',sans-serif",
                    letterSpacing:0}}>12 games</span>
                </h1>
              </div>
              {/* Stats */}
              <div style={{display:"flex",gap:12}}>
                {[["🎮",gamesPlayed,"Played",C.blue],["🏆",totalScore,"Total Score",C.gold]].map(([ic,v,l,c])=>(
                  <div key={l} style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${C.line}`,
                    borderRadius:10,padding:"8px 14px",textAlign:"center"}}>
                    <div style={{fontSize:16,fontWeight:900,color:c,fontFamily:"'JetBrains Mono',monospace"}}>{ic} {v}</div>
                    <div style={{fontSize:9,color:C.soft,letterSpacing:"0.1em",marginTop:1}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Controls legend ── */}
            <div style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${C.line}`,
              borderRadius:10,padding:"8px 12px",marginBottom:14}}>
              <div style={{fontSize:8,fontWeight:900,color:C.soft,letterSpacing:"0.14em",marginBottom:6}}>🎮 CONTROLS</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {CONTROLS.map(([k,v])=>(
                  <div key={k} style={{display:"flex",alignItems:"center",gap:5}}>
                    <kbd style={{background:"rgba(255,255,255,0.08)",border:`1px solid rgba(255,255,255,0.14)`,
                      borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:800,color:C.text,
                      fontFamily:"'JetBrains Mono',monospace",lineHeight:1.6}}>{k}</kbd>
                    <span style={{fontSize:10,color:C.soft}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Category filter */}
            <div style={{display:"flex",gap:7}}>
              {CATS.map(c=>(
                <button key={c} onClick={()=>setCat(c)} style={{
                  padding:"5px 14px",borderRadius:999,cursor:"pointer",transition:"all 140ms",
                  fontWeight:800,fontSize:11,fontFamily:"'Inter',sans-serif",letterSpacing:"0.04em",
                  background:cat===c?"rgba(103,177,255,0.15)":"rgba(255,255,255,0.03)",
                  border:`1px solid ${cat===c?C.blue+"44":C.line}`,
                  color:cat===c?C.blue:C.soft,
                }}>
                  {c==="All"?`All (${GAMES.length})`:c==="Sport"?`⚽ Sport (${GAMES.filter(g=>g.cat==="Sport").length})`
                    :c==="Analytics"?`📊 Analytics (${GAMES.filter(g=>g.cat==="Analytics").length})`
                    :`🧩 Puzzle (${GAMES.filter(g=>g.cat==="Puzzle").length})`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Game grid ── */}
        <div style={{maxWidth:900,margin:"0 auto",padding:"24px 24px 0"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
            {filtered.map(game=>(
              <GameCard key={game.id} game={game} onOpen={()=>setActive(game)}/>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {active&&<GameModal game={active} onClose={handleClose}/>}
    </>
  );
}