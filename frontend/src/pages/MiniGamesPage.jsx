// MiniGamesPage.jsx — StatinSite — 12 Sports Mini-Games
// Full-page grid, click card to open modal, canvas + React games
import { useState, useEffect, useRef, useCallback } from "react";

// ── Design tokens ─────────────────────────────────────────
const T = {
  bg:"#060a14", panel:"rgba(10,16,30,0.98)", glass:"rgba(255,255,255,0.025)",
  border:"rgba(255,255,255,0.07)", text:"#e2eeff", muted:"#3a5a7a",
  blue:"#60a5fa", green:"#34d399", red:"#f87171", gold:"#fbbf24",
  purple:"#c084fc", orange:"#fb923c", teal:"#2dd4bf", pink:"#f472b6",
  cyan:"#22d3ee", lime:"#a3e635",
};

// ── SVG Sport Icons ──────────────────────────────────────
const SportIcons = {
  football: (
    <svg viewBox="0 0 60 60" width="60" height="60">
      <circle cx="30" cy="30" r="26" fill="#1a3a1a" stroke="#4ade80" strokeWidth="1.5"/>
      <circle cx="30" cy="30" r="7" fill="#fff" stroke="#222" strokeWidth="1.5"/>
      <path d="M30 4v8M30 48v8M4 30h8M48 30h8" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".4"/>
      <path d="M10 10l6 6M44 44l6 6M44 10l-6 6M16 44l-6 6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity=".3"/>
    </svg>
  ),
  americanFootball: (
    <svg viewBox="0 0 60 60" width="60" height="60">
      <ellipse cx="30" cy="30" rx="22" ry="14" fill="#7c3f00" stroke="#fb923c" strokeWidth="1.5"/>
      <path d="M8 30h44M30 16v28" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity=".6"/>
      <path d="M22 22l8 8M38 22l-8 8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity=".4"/>
    </svg>
  ),
  tennis: (
    <svg viewBox="0 0 60 60" width="60" height="60">
      <circle cx="30" cy="30" r="24" fill="#c8f566" stroke="#a3e635" strokeWidth="1.5"/>
      <path d="M10 20 Q20 30 10 40M50 20 Q40 30 50 40" stroke="#fff" strokeWidth="2.5" fill="none" opacity=".7"/>
      <circle cx="30" cy="30" r="4" fill="white"/>
    </svg>
  ),
  tableTennis: (
    <svg viewBox="0 0 60 60" width="60" height="60">
      <circle cx="30" cy="30" r="22" fill="#e53e3e" stroke="#f87171" strokeWidth="1.5"/>
      <circle cx="30" cy="30" r="10" fill="white" opacity=".9"/>
      <rect x="14" y="28" width="32" height="4" rx="2" fill="rgba(0,0,0,0.2)"/>
    </svg>
  ),
  cricket: (
    <svg viewBox="0 0 60 60" width="60" height="60">
      <rect x="18" y="8" width="10" height="44" rx="3" fill="#f5e642" stroke="#fbbf24" strokeWidth="1"/>
      <rect x="14" y="8" width="3" height="10" rx="1.5" fill="#888"/>
      <rect x="43" y="8" width="3" height="10" rx="1.5" fill="#888"/>
      <circle cx="42" cy="38" r="8" fill="#e53e3e" stroke="#f87171" strokeWidth="1"/>
      <path d="M36 32l12 12" stroke="white" strokeWidth="1" opacity=".4"/>
    </svg>
  ),
  f1: (
    <svg viewBox="0 0 60 60" width="60" height="60">
      <rect x="4" y="24" width="52" height="14" rx="7" fill="#1a1a2e" stroke="#f43f5e" strokeWidth="1.5"/>
      <ellipse cx="16" cy="38" rx="8" ry="6" fill="#333" stroke="#888" strokeWidth="1"/>
      <ellipse cx="44" cy="38" rx="8" ry="6" fill="#333" stroke="#888" strokeWidth="1"/>
      <rect x="20" y="22" width="20" height="8" rx="2" fill="#e2e8f0" opacity=".8"/>
      <path d="M42 28h10l-4-10h-6z" fill="#f43f5e" opacity=".8"/>
    </svg>
  ),
  badminton: (
    <svg viewBox="0 0 60 60" width="60" height="60">
      <circle cx="30" cy="42" r="6" fill="#fff" stroke="#60a5fa" strokeWidth="1.5"/>
      <path d="M30 36V16" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M22 16 Q30 10 38 16 Q30 22 22 16z" fill="#60a5fa" opacity=".6"/>
      <path d="M24 20 Q30 14 36 20" stroke="#fff" strokeWidth="1" fill="none" opacity=".5"/>
    </svg>
  ),
  hopper: (
    <svg viewBox="0 0 60 60" width="60" height="60">
      {[0,1,2,3].map(i=><rect key={i} x="4" y={10+i*13} width="52" height="11" rx="3" fill={i%2===0?"#1a3a1a":"#0f2010"} stroke="#34d399" strokeWidth=".5" opacity={.6+i*.1}/>)}
      <rect x="24" y="28" width="12" height="12" rx="3" fill="#34d399"/>
    </svg>
  ),
  tictactoe: (
    <svg viewBox="0 0 60 60" width="60" height="60">
      <path d="M20 6v48M40 6v48M6 20h48M6 40h48" stroke="#c084fc" strokeWidth="2.5" strokeLinecap="round" opacity=".5"/>
      <text x="11" y="18" fontSize="11" fill="#f87171" fontWeight="bold">X</text>
      <circle cx="30" cy="30" r="6" fill="none" stroke="#60a5fa" strokeWidth="2"/>
      <text x="40" y="52" fontSize="11" fill="#f87171" fontWeight="bold">X</text>
    </svg>
  ),
  numberGame: (
    <svg viewBox="0 0 60 60" width="60" height="60">
      {[[0,0,"2"],[1,0,"4"],[0,1,"6"],[1,1,"8"]].map(([col,row,n])=>(
        <g key={n}>
          <rect x={6+col*28} y={6+row*28} width="24" height="24" rx="4" fill={`rgba(${n==="2"?"96,165,250":n==="4"?"52,211,153":n==="6"?"251,146,60":"192,132,252"},0.2)`} stroke={`rgba(${n==="2"?"96,165,250":n==="4"?"52,211,153":n==="6"?"251,146,60":"192,132,252"},0.5)`} strokeWidth="1"/>
          <text x={18+col*28} y={23+row*28} textAnchor="middle" fontSize="14" fontWeight="900" fill="white">{n}</text>
        </g>
      ))}
    </svg>
  ),
  archery: (
    <svg viewBox="0 0 60 60" width="60" height="60">
      <circle cx="30" cy="30" r="24" fill="none" stroke="#f87171" strokeWidth="1" opacity=".3"/>
      <circle cx="30" cy="30" r="16" fill="none" stroke="#fbbf24" strokeWidth="1" opacity=".5"/>
      <circle cx="30" cy="30" r="8" fill="none" stroke="#f87171" strokeWidth="1" opacity=".8"/>
      <circle cx="30" cy="30" r="3" fill="#f87171"/>
      <path d="M50 10L30 30" stroke="#e2eeff" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M50 10l-6 1-1-6" fill="#e2eeff"/>
    </svg>
  ),
  racing: (
    <svg viewBox="0 0 60 60" width="60" height="60">
      <path d="M6 40 Q15 20 30 18 Q45 16 54 30" stroke="#fbbf24" strokeWidth="2" fill="none"/>
      <rect x="22" y="28" width="18" height="10" rx="4" fill="#1e40af"/>
      <ellipse cx="26" cy="40" rx="5" ry="4" fill="#333" stroke="#888" strokeWidth="1"/>
      <ellipse cx="36" cy="40" rx="5" ry="4" fill="#333" stroke="#888" strokeWidth="1"/>
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════════
// GAME 1 — Football Penalty Shootout (full redesign)
// ═══════════════════════════════════════════════════════════════
function FootballGame({ W=480, H=400 }) {
  const canvasRef = useRef(null);
  const state = useRef({
    phase:"aim", aimX:240, aimY:120, ballX:240, ballY:340,
    targetX:240, targetY:120, animT:0,
    score:0, attempts:0, result:"", particles:[], gkX:240, gkDir:1,
    power:0, powerDir:1,
  });
  const raf = useRef(null);
  const GOAL = { x:80, y:60, w:320, h:130 };

  const shoot = useCallback(()=>{
    const s = state.current;
    if(s.phase!=="aim") return;
    s.targetX = s.aimX; s.targetY = s.aimY;
    s.phase = "shot"; s.animT = 0;
  },[]);

  const restart = useCallback(()=>{
    const s = state.current;
    Object.assign(s,{phase:"aim",ballX:240,ballY:340,aimX:240,aimY:120,score:0,attempts:0,result:"",particles:[],gkX:240,gkDir:1,animT:0,power:0,powerDir:1});
  },[]);

  const respawn = useCallback(()=>{
    const s = state.current;
    Object.assign(s,{phase:"aim",ballX:240,ballY:340,aimX:240,aimY:120,result:"",particles:[],gkX:240,gkDir:1,animT:0,power:0,powerDir:1});
  },[]);

  useEffect(()=>{
    const canvas = canvasRef.current, ctx = canvas.getContext("2d");
    let last = 0;

    const drawPitch = () => {
      // Background sky
      const sky = ctx.createLinearGradient(0,0,0,H);
      sky.addColorStop(0,"#0a1628"); sky.addColorStop(1,"#0f2a14");
      ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);

      // Grass stripes
      for(let i=0;i<W;i+=48){
        ctx.fillStyle = i%96===0?"rgba(0,80,0,0.25)":"rgba(0,60,0,0.15)";
        ctx.fillRect(i,0,48,H);
      }

      // Penalty spot glow
      const glow = ctx.createRadialGradient(240,340,0,240,340,40);
      glow.addColorStop(0,"rgba(255,255,255,0.08)"); glow.addColorStop(1,"transparent");
      ctx.fillStyle = glow; ctx.fillRect(200,300,80,80);

      // Semi-circle
      ctx.beginPath(); ctx.arc(240,300,55,Math.PI,0,true);
      ctx.strokeStyle="rgba(255,255,255,0.12)"; ctx.lineWidth=1; ctx.stroke();

      // Penalty box
      ctx.strokeStyle="rgba(255,255,255,0.18)"; ctx.lineWidth=1.5;
      ctx.strokeRect(60,240,360,160);
      ctx.strokeRect(120,290,240,110);
    };

    const drawGoal = () => {
      // Goalposts with depth
      ctx.shadowColor="#fff"; ctx.shadowBlur=12;
      ctx.strokeStyle="#ffffff"; ctx.lineWidth=5;
      ctx.strokeRect(GOAL.x,GOAL.y,GOAL.w,GOAL.h);
      ctx.shadowBlur=0;

      // Net grid
      ctx.strokeStyle="rgba(255,255,255,0.07)"; ctx.lineWidth=0.5;
      for(let x=GOAL.x+16;x<GOAL.x+GOAL.w;x+=16){
        ctx.beginPath(); ctx.moveTo(x,GOAL.y); ctx.lineTo(x+8,GOAL.y+GOAL.h); ctx.stroke();
      }
      for(let y=GOAL.y+12;y<GOAL.y+GOAL.h;y+=12){
        ctx.beginPath(); ctx.moveTo(GOAL.x,y); ctx.lineTo(GOAL.x+GOAL.w,y); ctx.stroke();
      }

      // Post shadows
      ctx.fillStyle="rgba(0,0,0,0.3)";
      ctx.fillRect(GOAL.x+GOAL.w, GOAL.y+4, 6, GOAL.h);
    };

    const drawGK = (gkX) => {
      const gkY = GOAL.y+GOAL.h-44;
      // Body
      ctx.fillStyle="#dc2626"; ctx.shadowColor="#f87171"; ctx.shadowBlur=8;
      ctx.beginPath(); ctx.roundRect(gkX-20,gkY,40,30,4); ctx.fill();
      // Head
      ctx.fillStyle="#fcd7aa"; ctx.shadowBlur=0;
      ctx.beginPath(); ctx.arc(gkX,gkY-8,11,0,Math.PI*2); ctx.fill();
      // Arms out
      ctx.strokeStyle="#dc2626"; ctx.lineWidth=5; ctx.lineCap="round";
      ctx.beginPath(); ctx.moveTo(gkX-20,gkY+8); ctx.lineTo(gkX-36,gkY+2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gkX+20,gkY+8); ctx.lineTo(gkX+36,gkY+2); ctx.stroke();
      ctx.shadowBlur=0;
    };

    const drawBall = (x,y,r) => {
      const gr = ctx.createRadialGradient(x-r*.3,y-r*.3,r*.1,x,y,r);
      gr.addColorStop(0,"#ffffff"); gr.addColorStop(0.6,"#e0e0e0"); gr.addColorStop(1,"#aaaaaa");
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
      ctx.fillStyle=gr; ctx.fill();
      // pentagons
      ctx.strokeStyle="rgba(0,0,0,0.25)"; ctx.lineWidth=0.8;
      for(let i=0;i<5;i++){
        const a=i*Math.PI*.4;
        ctx.beginPath(); ctx.moveTo(x+r*.4*Math.cos(a),y+r*.4*Math.sin(a));
        for(let j=1;j<=5;j++){const b=a+j*Math.PI*.4; ctx.lineTo(x+r*.4*Math.cos(b),y+r*.4*Math.sin(b));}
        ctx.stroke();
      }
      // shadow
      ctx.fillStyle="rgba(0,0,0,0.25)";
      ctx.beginPath(); ctx.ellipse(x,y+r,r*.8,r*.25,0,0,Math.PI*2); ctx.fill();
    };

    const draw = (ts) => {
      const dt = Math.min((ts-last)/1000, 0.05); last=ts;
      const s = state.current;
      ctx.clearRect(0,0,W,H);

      drawPitch();
      drawGoal();

      if(s.phase==="aim"){
        s.gkX += s.gkDir*100*dt;
        if(s.gkX>GOAL.x+GOAL.w-22||s.gkX<GOAL.x+22) s.gkDir*=-1;
        // Oscillating crosshair
        s.aimX = GOAL.x+30+(Math.sin(ts/800*1.1)*.45+.5)*(GOAL.w-60);
        s.aimY = GOAL.y+12+(Math.cos(ts/700*.9)*.4+.4)*(GOAL.h-24);
        s.power = (s.power + s.powerDir*1.8*dt);
        if(s.power>=1||s.power<=0) s.powerDir*=-1;
      }

      drawGK(s.gkX);

      if(s.phase==="aim"){
        // Power bar
        const barW=140, barH=8, barX=W/2-barW/2, barY=H-24;
        ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(barX,barY,barW,barH);
        const pc = s.power;
        const barGr = ctx.createLinearGradient(barX,0,barX+barW,0);
        barGr.addColorStop(0,"#34d399"); barGr.addColorStop(0.6,"#fbbf24"); barGr.addColorStop(1,"#f87171");
        ctx.fillStyle=barGr; ctx.fillRect(barX,barY,barW*pc,barH);
        ctx.strokeStyle="rgba(255,255,255,0.2)"; ctx.lineWidth=1; ctx.strokeRect(barX,barY,barW,barH);
        ctx.fillStyle="rgba(255,255,255,0.5)"; ctx.font="9px Inter"; ctx.textAlign="center";
        ctx.fillText("POWER",W/2,barY-4);

        // Crosshair
        const cx=s.aimX, cy=s.aimY;
        ctx.strokeStyle=`rgba(251,191,36,${0.6+Math.sin(ts/200)*.3})`; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(cx-16,cy); ctx.lineTo(cx+16,cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx,cy-16); ctx.lineTo(cx,cy+16); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx,cy,10,0,Math.PI*2);
        ctx.strokeStyle=`rgba(251,191,36,0.4)`; ctx.lineWidth=1; ctx.stroke();
        // Range rings
        for(let r=20;r<=40;r+=10){
          ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
          ctx.strokeStyle="rgba(255,255,255,0.06)"; ctx.lineWidth=0.5; ctx.stroke();
        }
        drawBall(240,340,12);
      }

      if(s.phase==="shot"){
        s.animT += dt;
        const prog = Math.min(s.animT/0.42,1);
        const ease = prog<.5?2*prog*prog:1-2*(1-prog)*(1-prog);
        s.ballX = 240+(s.targetX-240)*ease;
        s.ballY = 340+(s.targetY-340)*ease;
        const r = 12-ease*5;
        // Trail
        for(let i=3;i>=1;i--){
          const tp=Math.max(0,ease-i*.06);
          const tx=240+(s.targetX-240)*(tp<.5?2*tp*tp:1-2*(1-tp)*(1-tp));
          const ty=340+(s.targetY-340)*(tp<.5?2*tp*tp:1-2*(1-tp)*(1-tp));
          ctx.globalAlpha=.08*i;
          ctx.beginPath(); ctx.arc(tx,ty,r+i,0,Math.PI*2); ctx.fillStyle="#fff"; ctx.fill();
        }
        ctx.globalAlpha=1;
        drawBall(s.ballX,s.ballY,r);
        if(prog>=1){
          const inG=s.ballX>GOAL.x&&s.ballX<GOAL.x+GOAL.w&&s.ballY>GOAL.y&&s.ballY<GOAL.y+GOAL.h;
          const saved=inG&&Math.abs(s.ballX-s.gkX)<48;
          s.result = !inG?"MISS":saved?"SAVED!":"GOAL!";
          s.score += (!saved&&inG)?1:0; s.attempts++;
          s.phase="result"; s.animT=0;
          if(!saved&&inG){
            for(let i=0;i<30;i++) s.particles.push({
              x:s.ballX,y:s.ballY,vx:(Math.random()-.5)*200,vy:(Math.random()-.9)*150,
              life:1,color:["#fbbf24","#34d399","#60a5fa","#f472b6","#fff"][Math.floor(Math.random()*5)],
              r:Math.random()*4+2,spin:Math.random()*6-3
            });
          }
        }
      }

      if(s.phase==="result"){
        s.animT += dt;
        // Particles
        s.particles.forEach(p=>{
          p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=220*dt; p.life-=dt*1.1;
          if(p.life>0){
            ctx.globalAlpha=p.life; ctx.save();
            ctx.translate(p.x,p.y); ctx.rotate(p.spin*p.life);
            ctx.fillStyle=p.color; ctx.fillRect(-p.r,-p.r,p.r*2,p.r*2);
            ctx.restore();
          }
        });
        ctx.globalAlpha=1;
        drawBall(s.ballX,s.ballY,7);

        // Result text with glow
        const col=s.result==="GOAL!"?"#34d399":s.result==="SAVED!"?"#f87171":"#fbbf24";
        ctx.shadowColor=col; ctx.shadowBlur=25;
        ctx.fillStyle=col; ctx.font="bold 44px 'Sora',sans-serif"; ctx.textAlign="center";
        ctx.fillText(s.result,W/2,H/2-20); ctx.shadowBlur=0;
        if(s.animT>1.4){ s.attempts>=5?Object.assign(s,{phase:"gameover"}):respawn(); }
      }

      if(s.phase==="gameover"){
        ctx.fillStyle="rgba(0,0,0,0.7)"; ctx.fillRect(0,0,W,H);
        ctx.fillStyle="#e2eeff"; ctx.font="bold 30px 'Sora',sans-serif"; ctx.textAlign="center";
        ctx.fillText("⚽ Final Whistle",W/2,H/2-50);
        const col=s.score>=3?"#34d399":"#f87171";
        ctx.fillStyle=col; ctx.font="bold 56px 'JetBrains Mono',monospace";
        ctx.fillText(`${s.score}/5`,W/2,H/2+10);
        ctx.fillStyle=T.muted; ctx.font="13px Inter";
        ctx.fillText(s.score>=4?"World class!":s.score>=2?"Not bad...":"Back to training",W/2,H/2+42);
        ctx.fillStyle="#3a5272"; ctx.font="11px Inter";
        ctx.fillText("SPACE or click to replay",W/2,H/2+68);
      }

      // HUD
      ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(0,0,W,30);
      ctx.fillStyle=T.green; ctx.font="bold 12px 'JetBrains Mono',monospace"; ctx.textAlign="left";
      ctx.fillText(`⚽ ${s.score} goals`,10,20);
      ctx.textAlign="right"; ctx.fillStyle=T.muted;
      ctx.fillText(`${s.attempts}/5 shots`,W-10,20);
      ctx.fillStyle=T.gold; ctx.textAlign="center";
      ctx.fillText("PENALTY SHOOTOUT",W/2,20);

      raf.current = requestAnimationFrame(draw);
    };

    raf.current = requestAnimationFrame(draw);
    const kd = e=>{
      if(e.code==="Space"){e.preventDefault();const s=state.current;s.phase==="aim"?shoot():s.phase==="gameover"?restart():null;}
    };
    window.addEventListener("keydown",kd);
    return ()=>{cancelAnimationFrame(raf.current);window.removeEventListener("keydown",kd);};
  },[W,H,shoot,restart,respawn,GOAL]);

  const tap=()=>{const s=state.current;s.phase==="aim"?shoot():s.phase==="gameover"?restart():null;};
  return <canvas ref={canvasRef} width={W} height={H} onClick={tap} style={{display:"block",borderRadius:12,cursor:"crosshair"}}/>;
}

// ═══════════════════════════════════════════════════════════════
// GAME 2 — Tennis Rallying
// ═══════════════════════════════════════════════════════════════
function TennisGame({ W=480, H=360 }) {
  const canvasRef = useRef(null);
  const state = useRef({ bx:240,by:180,bvx:200,bvy:130,pX:240,pY:290,aiX:240,pS:0,aiS:0,dead:false,started:false,rally:0,lastBounce:0 });
  const raf = useRef(null);
  const keys = useRef({});
  useEffect(()=>{
    const canvas=canvasRef.current,ctx=canvas.getContext("2d");let last=0;
    const reset=()=>{const s=state.current;Object.assign(s,{bx:240,by:180,bvx:190,bvy:120,pX:240,aiX:240,pS:0,aiS:0,dead:false,started:false,rally:0});};
    const kd=e=>{keys.current[e.key]=true;if(e.key==="Enter"){e.preventDefault();const s=state.current;if(!s.started)s.started=true;if(s.dead)reset();}if(["ArrowLeft","ArrowRight"].includes(e.key))e.preventDefault();};
    const ku=e=>{keys.current[e.key]=false;};
    window.addEventListener("keydown",kd);window.addEventListener("keyup",ku);
    const draw=(ts)=>{
      const dt=Math.min((ts-last)/1000,.04);last=ts;
      const s=state.current;ctx.clearRect(0,0,W,H);
      // Court
      const cr=ctx.createLinearGradient(0,0,0,H);cr.addColorStop(0,"#166534");cr.addColorStop(1,"#14532d");
      ctx.fillStyle=cr;ctx.fillRect(0,0,W,H);
      // Lines
      ctx.strokeStyle="rgba(255,255,255,0.5)";ctx.lineWidth=2;
      ctx.strokeRect(30,30,W-60,H-60);
      ctx.beginPath();ctx.moveTo(30,H/2);ctx.lineTo(W-30,H/2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(W/2,30);ctx.lineTo(W/2,H-30);ctx.stroke();
      ctx.strokeStyle="rgba(255,255,255,0.25)";ctx.lineWidth=1;
      ctx.strokeRect(80,30,W-160,H-60);
      // Net
      ctx.strokeStyle="rgba(255,255,255,0.8)";ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(30,H/2);ctx.lineTo(W-30,H/2);ctx.stroke();
      ctx.fillStyle="rgba(255,255,255,0.15)";
      for(let x=30;x<W-30;x+=8){ctx.fillRect(x,H/2-1,6,2);}
      if(s.started&&!s.dead){
        if(keys.current["ArrowLeft"])s.pX=Math.max(50,s.pX-280*dt);
        if(keys.current["ArrowRight"])s.pX=Math.min(W-50,s.pX+280*dt);
        s.aiX+=(s.bx-s.aiX)*Math.min(1,1.8*dt);s.aiX=Math.max(50,Math.min(W-50,s.aiX));
        s.bx+=s.bvx*dt;s.by+=s.bvy*dt;
        if(s.bx<36||s.bx>W-36){s.bvx*=-1;s.bx=s.bx<36?36:W-36;}
        // Player paddle hit
        if(s.by>H-72&&s.by<H-58&&Math.abs(s.bx-s.pX)<45){
          s.bvy=-Math.abs(s.bvy)*1.05;s.bvy=Math.max(s.bvy,-260);
          s.bvx+=(s.bx-s.pX)*1.5;s.rally++;s.lastBounce=ts;
        }
        // AI paddle hit
        if(s.by<72&&s.by>58&&Math.abs(s.bx-s.aiX)<45){
          s.bvy=Math.abs(s.bvy)*1.02;s.bvy=Math.min(s.bvy,260);
          s.bvx+=(s.bx-s.aiX)*1.5;s.rally++;
        }
        if(s.by>H){s.aiS++;s.bx=240;s.by=180;s.bvy=-130;s.bvx=(Math.random()-.5)*160;s.rally=0;if(s.aiS>=7)s.dead=true;}
        if(s.by<0){s.pS++;s.bx=240;s.by=180;s.bvy=130;s.bvx=(Math.random()-.5)*160;s.rally=0;if(s.pS>=7)s.dead=true;}
      }
      // Players
      [[s.pX,H-62,"#fbbf24","YOU"],[s.aiX,58,"#f87171","CPU"]].forEach(([x,y,col,label])=>{
        ctx.fillStyle=col;ctx.shadowColor=col;ctx.shadowBlur=12;
        ctx.beginPath();ctx.ellipse(x,y,40,6,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        ctx.fillStyle=col;ctx.font="bold 9px Inter";ctx.textAlign="center";ctx.fillText(label,x,y-10);
      });
      // Ball
      const gr=ctx.createRadialGradient(s.bx-3,s.by-3,1,s.bx,s.by,9);
      gr.addColorStop(0,"#e8ff80");gr.addColorStop(1,"#a3e635");
      ctx.beginPath();ctx.arc(s.bx,s.by,9,0,Math.PI*2);
      ctx.fillStyle=gr;ctx.shadowColor="#a3e635";ctx.shadowBlur=14;ctx.fill();ctx.shadowBlur=0;
      // Score
      ctx.fillStyle="rgba(0,0,0,0.4)";ctx.fillRect(0,0,W,26);
      ctx.fillStyle="#e2eeff";ctx.font="bold 11px 'JetBrains Mono',monospace";ctx.textAlign="left";
      ctx.fillText(`YOU ${s.pS}`,10,18);ctx.textAlign="right";ctx.fillText(`CPU ${s.aiS}`,W-10,18);
      ctx.fillStyle=T.gold;ctx.textAlign="center";ctx.fillText("TENNIS",W/2,18);
      ctx.fillStyle=T.muted;ctx.textAlign="right";ctx.fillText(`Rally: ${s.rally}`,W-10,H-6);
      if(!s.started){ctx.fillStyle="rgba(0,0,0,.6)";ctx.fillRect(0,0,W,H);ctx.fillStyle="#e2eeff";ctx.font="bold 22px 'Sora',sans-serif";ctx.textAlign="center";ctx.fillText("🎾 Tennis",W/2,H/2-20);ctx.fillStyle=T.muted;ctx.font="12px Inter";ctx.fillText("← → arrows to move  ·  Enter to start",W/2,H/2+6);}
      if(s.dead){ctx.fillStyle="rgba(0,0,0,.65)";ctx.fillRect(0,0,W,H);const wc=s.pS>=7?T.green:T.red;ctx.fillStyle=wc;ctx.font="bold 28px 'Sora',sans-serif";ctx.textAlign="center";ctx.shadowColor=wc;ctx.shadowBlur=18;ctx.fillText(s.pS>=7?"You Win!":"CPU Wins",W/2,H/2-18);ctx.shadowBlur=0;ctx.fillStyle=T.gold;ctx.font="bold 16px 'JetBrains Mono',monospace";ctx.fillText(`${s.pS}–${s.aiS}`,W/2,H/2+12);ctx.fillStyle=T.muted;ctx.font="11px Inter";ctx.fillText("Enter to retry",W/2,H/2+38);}
      raf.current=requestAnimationFrame(draw);
    };
    raf.current=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(raf.current);window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku);};
  },[W,H]);
  return <canvas ref={canvasRef} width={W} height={H} style={{display:"block",borderRadius:12}}/>;
}

// ═══════════════════════════════════════════════════════════════
// GAME 3 — Tic Tac Toe with strategic AI
// ═══════════════════════════════════════════════════════════════
function TicTacToeGame({W=400,H=400}){
  const [board,setBoard]=useState(Array(9).fill(null));
  const [turn,setTurn]=useState("X");const [winner,setWinner]=useState(null);const [score,setScore]=useState({X:0,O:0,d:0});
  const wins=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const check=(b)=>{for(const[a,c,d]of wins){if(b[a]&&b[a]===b[c]&&b[a]===b[d])return{winner:b[a],line:[a,c,d]};}if(b.every(Boolean))return{winner:"draw",line:[]};return null;};
  const aiMove=useCallback((b)=>{
    // Try win, then block, then center, then random
    for(const p of["O","X"]){for(let i=0;i<9;i++){if(!b[i]){const t=[...b];t[i]=p;if(check(t)?.winner===p)return i;}}}
    if(!b[4])return 4;
    const corners=[0,2,6,8].filter(i=>!b[i]);
    if(corners.length)return corners[Math.floor(Math.random()*corners.length)];
    return b.findIndex(v=>!v);
  },[]);
  const move=(i)=>{
    if(board[i]||winner)return;
    const nb=[...board];nb[i]="X";
    const r=check(nb);
    setBoard(nb);
    if(r){setWinner(r.winner);setScore(s=>({...s,[r.winner]:s[r.winner]+1}));return;}
    setTurn("O");
    setTimeout(()=>{
      const ai=aiMove(nb);if(ai==null)return;
      const nb2=[...nb];nb2[ai]="O";
      const r2=check(nb2);
      setBoard(nb2);setTurn("X");
      if(r2){setWinner(r2.winner);setScore(s=>({...s,[r2.winner]:s[r2.winner]+1}));}
    },350);
  };
  const reset=()=>{setBoard(Array(9).fill(null));setTurn("X");setWinner(null);};
  const result=winner?check(board):null;
  const winLine=result?.line||[];
  const CX="⚔", CO="🔵";
  return(
    <div style={{height:H,display:"flex",flexDirection:"column",background:"rgba(8,12,24,0.98)",borderRadius:12,overflow:"hidden"}}>
      {/* Score bar */}
      <div style={{padding:"12px 20px",background:"rgba(192,132,252,0.06)",borderBottom:"1px solid rgba(192,132,252,0.15)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:900,color:T.red,fontFamily:"JetBrains Mono,monospace"}}>{score.X}</div><div style={{fontSize:9,color:T.muted,fontFamily:"Inter,sans-serif"}}>X — YOU</div></div>
        <div style={{fontSize:10,fontWeight:900,color:T.purple,fontFamily:"Inter,sans-serif",letterSpacing:".1em"}}>TIC TAC TOE</div>
        <div style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:900,color:T.blue,fontFamily:"JetBrains Mono,monospace"}}>{score.O}</div><div style={{fontSize:9,color:T.muted,fontFamily:"Inter,sans-serif"}}>O — CPU</div></div>
      </div>
      {/* Board */}
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,width:"min(280px,100%)"}}>
          {board.map((v,i)=>{
            const isWin=winLine.includes(i);
            return(
              <div key={i} onClick={()=>move(i)}
                style={{aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center",
                  borderRadius:12,cursor:(!v&&!winner)?"pointer":"default",
                  background:isWin?"rgba(192,132,252,0.15)":v?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.03)",
                  border:`1.5px solid ${isWin?"rgba(192,132,252,0.5)":"rgba(255,255,255,0.07)"}`,
                  transition:"all 150ms",fontSize:36,
                  boxShadow:isWin?"0 0 20px rgba(192,132,252,0.3)":"none",
                }}>
                {v==="X"&&<span style={{color:T.red,textShadow:"0 0 12px rgba(248,113,113,0.8)"}}>✕</span>}
                {v==="O"&&<span style={{color:T.blue,textShadow:"0 0 12px rgba(96,165,250,0.8)"}}>◯</span>}
              </div>
            );
          })}
        </div>
      </div>
      {/* Status */}
      <div style={{padding:"10px 20px",borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        {winner?(
          <div style={{display:"flex",gap:12,alignItems:"center",width:"100%",justifyContent:"space-between"}}>
            <span style={{fontSize:14,fontWeight:700,color:winner==="draw"?T.gold:winner==="X"?T.green:T.red,fontFamily:"Sora,sans-serif"}}>
              {winner==="draw"?"Draw!":`${winner} wins!`}
            </span>
            <button onClick={reset} style={{padding:"7px 18px",borderRadius:8,background:"rgba(192,132,252,0.15)",border:"1px solid rgba(192,132,252,0.3)",color:T.purple,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Play Again</button>
          </div>
        ):(
          <span style={{fontSize:12,color:T.muted,fontFamily:"Inter,sans-serif"}}>{turn==="X"?"Your turn (X)":"CPU thinking…"}</span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// GAME 4 — F1 Racing Game (canvas driving)
// ═══════════════════════════════════════════════════════════════
function F1Game({W=480,H=380}){
  const canvasRef=useRef(null);
  const state=useRef({carX:240,carY:300,carV:0,carA:0,angle:0,track:[],lap:0,time:0,best:null,started:false,dead:false,score:0,obstacles:[],boost:0});
  const raf=useRef(null);const keys=useRef({});
  useEffect(()=>{
    const canvas=canvasRef.current,ctx=canvas.getContext("2d");let last=0;
    const s=state.current;
    // Generate track waypoints (oval-ish)
    s.track=Array.from({length:48},(_,i)=>{const a=i/48*Math.PI*2;return{x:W/2+Math.cos(a)*(170+Math.cos(a*3)*20),y:H/2+Math.sin(a)*(130+Math.sin(a*2)*15)};});
    s.obstacles=Array.from({length:5},(_,i)=>({x:50+Math.random()*(W-100),y:50+Math.random()*(H-100),r:8+Math.random()*8,color:["#f87171","#fbbf24","#60a5fa"][i%3]}));
    const kd=e=>{keys.current[e.key]=true;if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key))e.preventDefault();if(e.key==="Enter"&&!s.started){s.started=true;}if(e.key==="Enter"&&s.dead){Object.assign(s,{carX:240,carY:300,carV:0,carA:0,angle:0,lap:0,time:0,started:false,dead:false,score:0,boost:1});}};
    const ku=e=>{keys.current[e.key]=false;};
    window.addEventListener("keydown",kd);window.addEventListener("keyup",ku);
    const draw=(ts)=>{
      const dt=Math.min((ts-last)/1000,.04);last=ts;
      ctx.clearRect(0,0,W,H);
      // Background
      ctx.fillStyle="#0a0a0a";ctx.fillRect(0,0,W,H);
      // Grass
      ctx.fillStyle="#14532d";ctx.fillRect(0,0,W,H);
      // Track (draw road)
      ctx.strokeStyle="#4a5568";ctx.lineWidth=48;ctx.lineCap="round";ctx.lineJoin="round";
      ctx.beginPath();s.track.forEach((p,i)=>{i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);});ctx.closePath();ctx.stroke();
      // Track surface
      ctx.strokeStyle="#374151";ctx.lineWidth=44;
      ctx.beginPath();s.track.forEach((p,i)=>{i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);});ctx.closePath();ctx.stroke();
      // Center line dashes
      ctx.strokeStyle="rgba(255,255,0,0.3)";ctx.lineWidth=1.5;ctx.setLineDash([12,12]);
      ctx.beginPath();s.track.forEach((p,i)=>{i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);});ctx.closePath();ctx.stroke();ctx.setLineDash([]);
      // Start/finish
      ctx.fillStyle="#e2eeff";ctx.font="bold 10px Inter";ctx.textAlign="center";ctx.fillText("S/F",s.track[0].x,s.track[0].y-28);
      ctx.fillStyle="rgba(255,255,255,0.3)";ctx.fillRect(s.track[0].x-20,s.track[0].y-24,40,4);

      if(s.started&&!s.dead){
        s.time+=dt;
        const spd=s.carV;
        if(keys.current["ArrowUp"]){s.carV=Math.min(s.carV+260*dt,180);}else if(keys.current["ArrowDown"]){s.carV=Math.max(s.carV-180*dt,0);}else{s.carV=Math.max(s.carV-80*dt,0);}
        if(keys.current["ArrowLeft"])s.angle-=2.2*dt*(s.carV/80);
        if(keys.current["ArrowRight"])s.angle+=2.2*dt*(s.carV/80);
        if(keys.current[" "]&&s.boost>0){s.carV=Math.min(s.carV+400*dt,260);s.boost=Math.max(s.boost-.3,0);}
        s.carX+=Math.sin(s.angle)*s.carV*dt;s.carY-=Math.cos(s.angle)*s.carV*dt;
        s.carX=Math.max(18,Math.min(W-18,s.carX));s.carY=Math.max(18,Math.min(H-18,s.carY));
        // Lap detection
        const d0=Math.hypot(s.carX-s.track[0].x,s.carY-s.track[0].y);
        if(d0<28&&s.carV>20&&s.time>2){s.lap++;s.time=0;s.score+=10;if(!s.best||s.time<s.best)s.best=s.time;}
        // Obstacle hit
        s.obstacles.forEach(o=>{if(Math.hypot(s.carX-o.x,s.carY-o.y)<24){s.dead=true;}});
        if(s.lap>=3)s.dead=true;
      }

      // Obstacles
      s.obstacles.forEach(o=>{ctx.fillStyle=o.color;ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,Math.PI*2);ctx.fill();});

      // Car
      ctx.save();ctx.translate(s.carX,s.carY);ctx.rotate(s.angle);
      // Car body
      const carGr=ctx.createLinearGradient(-10,-18,10,-18);
      carGr.addColorStop(0,"#f43f5e");carGr.addColorStop(.5,"#fb7185");carGr.addColorStop(1,"#f43f5e");
      ctx.fillStyle=carGr;ctx.shadowColor="#f43f5e";ctx.shadowBlur=s.started?12:0;
      ctx.beginPath();ctx.roundRect(-10,-20,20,38,4);ctx.fill();ctx.shadowBlur=0;
      // Cockpit
      ctx.fillStyle="rgba(0,0,0,0.7)";ctx.beginPath();ctx.ellipse(0,-4,6,10,0,0,Math.PI*2);ctx.fill();
      // Wheels
      ctx.fillStyle="#1a1a1a";ctx.strokeStyle="#555";ctx.lineWidth=1.5;
      [[-10,-13],[10,-13],[-10,12],[10,12]].forEach(([wx,wy])=>{ctx.beginPath();ctx.arc(wx,wy,4,0,Math.PI*2);ctx.fill();ctx.stroke();});
      // Engine glow
      if(s.carV>50){ctx.fillStyle=`rgba(251,191,36,${(s.carV-50)/130*0.8})`;ctx.beginPath();ctx.ellipse(0,22,4,8,0,0,Math.PI*2);ctx.fill();}
      ctx.restore();

      // HUD
      ctx.fillStyle="rgba(0,0,0,0.6)";ctx.fillRect(0,0,W,28);
      ctx.fillStyle=T.gold;ctx.font="bold 11px 'JetBrains Mono',monospace";ctx.textAlign="center";ctx.fillText("F1 RACING",W/2,18);
      ctx.fillStyle=T.green;ctx.textAlign="left";ctx.fillText(`Lap ${s.lap}/3`,10,18);
      ctx.fillStyle=T.blue;ctx.textAlign="right";ctx.fillText(`${Math.round(s.carV)} km/h`,W-10,18);
      // Speed bar
      ctx.fillStyle="rgba(255,255,255,0.1)";ctx.fillRect(10,H-14,W-20,6);
      ctx.fillStyle=T.red;ctx.fillRect(10,H-14,(s.carV/260)*(W-20),6);
      if(!s.started){ctx.fillStyle="rgba(0,0,0,.6)";ctx.fillRect(0,0,W,H);ctx.fillStyle="#e2eeff";ctx.font="bold 22px 'Sora',sans-serif";ctx.textAlign="center";ctx.fillText("🏎 F1 Racing",W/2,H/2-22);ctx.fillStyle=T.muted;ctx.font="12px Inter";ctx.fillText("Arrow keys to drive · SPACE for boost",W/2,H/2+4);ctx.fillText("Avoid obstacles · 3 laps to win",W/2,H/2+22);ctx.fillStyle=T.gold;ctx.font="bold 13px Inter";ctx.fillText("Enter to start!",W/2,H/2+46);}
      if(s.dead){ctx.fillStyle="rgba(0,0,0,.7)";ctx.fillRect(0,0,W,H);const msg=s.lap>=3?"Race Complete! 🏁":"💥 Crash!";ctx.fillStyle=s.lap>=3?T.green:T.red;ctx.font="bold 28px 'Sora',sans-serif";ctx.textAlign="center";ctx.shadowColor=s.lap>=3?T.green:T.red;ctx.shadowBlur=16;ctx.fillText(msg,W/2,H/2-20);ctx.shadowBlur=0;ctx.fillStyle=T.gold;ctx.font="bold 14px 'JetBrains Mono',monospace";ctx.fillText(`Score: ${s.score}`,W/2,H/2+10);ctx.fillStyle=T.muted;ctx.font="11px Inter";ctx.fillText("Enter to race again",W/2,H/2+36);}
      raf.current=requestAnimationFrame(draw);
    };
    raf.current=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(raf.current);window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku);};
  },[W,H]);
  return <canvas ref={canvasRef} width={W} height={H} style={{display:"block",borderRadius:12}}/>;
}

// ═══════════════════════════════════════════════════════════════
// GAME 5 — Cricket: Hit the ball
// ═══════════════════════════════════════════════════════════════
function CricketGame({W=480,H=360}){
  const canvasRef=useRef(null);
  const state=useRef({phase:"ready",ballX:0,ballY:80,batX:W/2,swingAng:0,swingDir:1,score:0,balls:6,wickets:3,result:"",animT:0,bounceY:H-80,bounced:false,speedMult:1});
  const raf=useRef(null);
  const swing=useCallback(()=>{const s=state.current;if(s.phase!=="bowl")return;s.phase="swing";s.swingAng=0;},[]);
  const restart=useCallback(()=>{const s=state.current;Object.assign(s,{phase:"ready",ballX:0,ballY:80,batX:W/2,swingAng:0,score:0,balls:6,wickets:3,result:"",animT:0,bounced:false,speedMult:1});},[]);
  const bowl=useCallback(()=>{const s=state.current;if(s.phase!=="ready")return;s.phase="bowl";s.ballX=W/2+(Math.random()-.5)*60;s.ballY=80;s.bounced=false;s.animT=0;s.speedMult=0.8+Math.random()*.8;},[W]);
  useEffect(()=>{
    const canvas=canvasRef.current,ctx=canvas.getContext("2d");let last=0;
    const kd=e=>{if(e.code==="Space"){e.preventDefault();const s=state.current;s.phase==="ready"?bowl():s.phase==="bowl"?swing():s.phase==="gameover"?restart():null;}};
    canvas.addEventListener("click",()=>{const s=state.current;s.phase==="ready"?bowl():s.phase==="bowl"?swing():s.phase==="gameover"?restart():null;});
    window.addEventListener("keydown",kd);
    const draw=(ts)=>{
      const dt=Math.min((ts-last)/1000,.04);last=ts;
      const s=state.current;ctx.clearRect(0,0,W,H);
      // Pitch
      const pg=ctx.createLinearGradient(0,0,0,H);pg.addColorStop(0,"#14532d");pg.addColorStop(1,"#166534");
      ctx.fillStyle=pg;ctx.fillRect(0,0,W,H);
      // Crease
      ctx.fillStyle="#c8b46a";ctx.fillRect(W/2-60,H-90,120,160);
      ctx.strokeStyle="rgba(255,255,255,0.5)";ctx.lineWidth=2;
      ctx.strokeRect(W/2-60,H-90,120,140);
      // Stumps
      [-18,0,18].forEach(dx=>{ctx.fillStyle="#e2eeff";ctx.fillRect(W/2+dx-2,H-86,4,46);ctx.fillStyle="#fbbf24";ctx.fillRect(W/2+dx-5,H-90,10,6);});
      // Ball
      if(s.phase==="bowl"||s.phase==="swing"){
        s.animT+=dt*120*s.speedMult;
        const prog=Math.min(s.animT/100,1);
        s.ballX=W/2+(Math.sin(prog*Math.PI*.6)*40)+(s.ballX-W/2)*(1-prog*.3);
        s.ballY=80+prog*(H-150)+Math.sin(prog*Math.PI)*(-30);
        if(!s.bounced&&s.ballY>H-150){s.bounced=true;s.ballY=H-150;}
        const gr=ctx.createRadialGradient(s.ballX-2,s.ballY-2,1,s.ballX,s.ballY,8);
        gr.addColorStop(0,"#fca5a5");gr.addColorStop(1,"#dc2626");
        ctx.beginPath();ctx.arc(s.ballX,s.ballY,8,0,Math.PI*2);ctx.fillStyle=gr;ctx.shadowColor="#dc2626";ctx.shadowBlur=10;ctx.fill();ctx.shadowBlur=0;
        // Seam
        ctx.strokeStyle="rgba(255,255,255,0.4)";ctx.lineWidth=1;
        ctx.beginPath();ctx.arc(s.ballX,s.ballY,8,-.5,.5);ctx.stroke();
        if(prog>=1&&s.phase==="bowl"){
          if(Math.abs(s.ballX-s.batX)<30){s.score+=3;s.balls--;s.phase="scored";s.result="FOUR! +3";}
          else{s.wickets--;s.balls--;s.phase="out";s.result="BOWLED! OUT";}
          s.animT=0;if(s.wickets<=0||s.balls<=0)setTimeout(()=>{Object.assign(s,{phase:"gameover"});},1200);
          else setTimeout(()=>Object.assign(s,{phase:"ready",bounced:false}),1400);
        }
        if(s.phase==="swing"&&prog<.85){
          if(Math.abs(s.ballX-s.batX)<40&&s.ballY>H-160){
            const r=Math.random();
            if(r>.35){const runs=r>.8?6:r>.6?4:r>.45?3:2;s.score+=runs;s.balls--;s.result=runs===6?"SIX! +6":runs===4?"FOUR! +4":`${runs} RUNS`;s.phase="scored";}
            else{s.wickets--;s.balls--;s.result="CAUGHT OUT!";}
            s.animT=0;if(s.wickets<=0||s.balls<=0)setTimeout(()=>Object.assign(s,{phase:"gameover"}),1200);
            else setTimeout(()=>Object.assign(s,{phase:"ready",bounced:false}),1400);
          }
        }
      }
      // Bat
      ctx.save();ctx.translate(s.batX,H-70);
      if(s.phase==="swing")s.swingAng=Math.min(s.swingAng+8,70);
      ctx.rotate(((s.phase==="swing"?s.swingAng:0)-20)*Math.PI/180);
      ctx.fillStyle="#c8963a";ctx.fillRect(-5,-50,10,55);
      ctx.fillStyle="#8B6914";ctx.fillRect(-3,-56,6,12);
      ctx.restore();
      // HUD
      ctx.fillStyle="rgba(0,0,0,0.55)";ctx.fillRect(0,0,W,28);
      ctx.fillStyle=T.gold;ctx.font="bold 11px 'JetBrains Mono',monospace";ctx.textAlign="center";ctx.fillText("CRICKET",W/2,18);
      ctx.fillStyle=T.green;ctx.textAlign="left";ctx.fillText(`Score: ${s.score}`,10,18);
      ctx.fillStyle=T.red;ctx.textAlign="right";ctx.fillText(`W:${s.wickets} B:${s.balls}`,W-10,18);
      if(s.phase==="scored"||s.phase==="out"){const col=s.phase==="scored"?T.green:T.red;ctx.fillStyle=col;ctx.font="bold 32px 'Sora',sans-serif";ctx.textAlign="center";ctx.shadowColor=col;ctx.shadowBlur=20;ctx.fillText(s.result,W/2,H/2);ctx.shadowBlur=0;}
      if(s.phase==="ready"){ctx.fillStyle="rgba(255,255,255,0.6)";ctx.font="bold 13px Inter";ctx.textAlign="center";ctx.fillText("SPACE / tap to bowl",W/2,H-12);}
      if(s.phase==="gameover"){ctx.fillStyle="rgba(0,0,0,.7)";ctx.fillRect(0,0,W,H);ctx.fillStyle=T.gold;ctx.font="bold 26px 'Sora',sans-serif";ctx.textAlign="center";ctx.fillText("Innings Over!",W/2,H/2-36);ctx.fillStyle=T.green;ctx.font="bold 48px 'JetBrains Mono',monospace";ctx.fillText(s.score,W/2,H/2+14);ctx.fillStyle=T.muted;ctx.font="11px Inter";ctx.fillText("Tap/SPACE to bat again",W/2,H/2+46);}
      raf.current=requestAnimationFrame(draw);
    };
    raf.current=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(raf.current);window.removeEventListener("keydown",kd);};
  },[W,H,swing,restart,bowl]);
  return <canvas ref={canvasRef} width={W} height={H} style={{display:"block",borderRadius:12,cursor:"pointer"}}/>;
}

// ═══════════════════════════════════════════════════════════════
// GAME 6 — Basketball Free Throw (trajectory-based)
// ═══════════════════════════════════════════════════════════════
function BasketballGame({W=480,H=400}){
  const canvasRef=useRef(null);
  const state=useRef({phase:"aim",power:0,angle:45,ballX:100,ballY:H-80,bvx:0,bvy:0,score:0,attempts:0,animT:0,result:"",particles:[]});
  const raf=useRef(null);
  const HOOP={x:W-100,y:H-160,r:30};
  const shoot=useCallback(()=>{const s=state.current;if(s.phase!=="aim")return;const spd=s.power*14+6;s.bvx=Math.cos(s.angle*Math.PI/180)*spd*12;s.bvy=-Math.sin(s.angle*Math.PI/180)*spd*12;s.phase="flight";s.animT=0;s.ballX=100;s.ballY=H-80;},[H]);
  const reset=useCallback(()=>{const s=state.current;Object.assign(s,{phase:"aim",power:0,angle:45,ballX:100,ballY:H-80,score:0,attempts:0,result:"",particles:[]});},[H]);
  useEffect(()=>{
    const canvas=canvasRef.current,ctx=canvas.getContext("2d");let last=0;
    const kd=e=>{if(e.code==="Space"){e.preventDefault();const s=state.current;s.phase==="aim"?shoot():s.phase==="gameover"?reset():null;}};
    canvas.addEventListener("click",()=>{const s=state.current;s.phase==="aim"?shoot():s.phase==="gameover"?reset():null;});
    window.addEventListener("keydown",kd);
    const draw=(ts)=>{
      const dt=Math.min((ts-last)/1000,.04);last=ts;
      const s=state.current;ctx.clearRect(0,0,W,H);
      // Background court
      const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,"#1c0a00");bg.addColorStop(1,"#2d1200");
      ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
      // Floor
      ctx.fillStyle="#7c3f00";ctx.fillRect(0,H-40,W,40);
      ctx.fillStyle="#6b3700";ctx.fillRect(0,H-44,W,4);
      // Court lines
      ctx.strokeStyle="rgba(255,200,100,0.2)";ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(W/2,H-40,80,Math.PI,0);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,H-40);ctx.lineTo(W,H-40);ctx.stroke();
      // Backboard
      ctx.fillStyle="rgba(200,200,220,0.9)";ctx.fillRect(HOOP.x+25,HOOP.y-60,50,70);
      ctx.strokeStyle="rgba(255,165,0,0.4)";ctx.lineWidth=2;ctx.strokeRect(HOOP.x+32,HOOP.y-42,36,36);
      // Hoop
      ctx.strokeStyle="#e65c00";ctx.lineWidth=5;ctx.shadowColor="#ff7700";ctx.shadowBlur=8;
      ctx.beginPath();ctx.arc(HOOP.x,HOOP.y,HOOP.r,0,Math.PI);ctx.stroke();ctx.shadowBlur=0;
      ctx.strokeStyle="#cc4400";ctx.lineWidth=4;
      ctx.beginPath();ctx.moveTo(HOOP.x-HOOP.r,HOOP.y);ctx.lineTo(HOOP.x+HOOP.r,HOOP.y);ctx.stroke();
      // Net
      ctx.strokeStyle="rgba(255,255,255,0.3)";ctx.lineWidth=1;
      for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(HOOP.x+i*HOOP.r/3.5,HOOP.y);ctx.lineTo(HOOP.x+i*HOOP.r/5,HOOP.y+35);ctx.stroke();}
      for(let j=0;j<3;j++){ctx.beginPath();ctx.arc(HOOP.x,HOOP.y+12+j*10,HOOP.r*(1-j*.2),0,Math.PI);ctx.stroke();}
      if(s.phase==="aim"){
        s.power=(Math.sin(ts/400)+1)/2;
        s.angle=30+s.power*30;
        // Trajectory preview
        ctx.strokeStyle="rgba(255,165,0,0.25)";ctx.lineWidth=1;ctx.setLineDash([4,6]);
        const sp=s.power*14+6;const vx=Math.cos(s.angle*Math.PI/180)*sp*12;const vy=-Math.sin(s.angle*Math.PI/180)*sp*12;
        ctx.beginPath();ctx.moveTo(100,H-80);
        for(let t=0;t<1.5;t+=.05){const px=100+vx*t;const py=H-80+vy*t+.5*500*t*t;if(px>W||py>H)break;ctx.lineTo(px,py);}
        ctx.stroke();ctx.setLineDash([]);
        // Power bar
        ctx.fillStyle="rgba(0,0,0,0.5)";ctx.fillRect(20,H-28,160,8);
        const pg=ctx.createLinearGradient(20,0,180,0);pg.addColorStop(0,"#34d399");pg.addColorStop(.6,"#fbbf24");pg.addColorStop(1,"#f87171");
        ctx.fillStyle=pg;ctx.fillRect(20,H-28,160*s.power,8);
        ctx.fillStyle="rgba(255,255,255,0.15)";ctx.lineWidth=1;ctx.strokeRect(20,H-28,160,8);
      }
      if(s.phase==="flight"){
        s.animT+=dt;s.ballX+=s.bvx*dt;s.bvy+=500*dt;s.ballY+=s.bvy*dt;
        // Trail
        ctx.shadowColor="#f97316";ctx.shadowBlur=6;
        // Ball (basketball)
        const gr=ctx.createRadialGradient(s.ballX-3,s.ballY-3,2,s.ballX,s.ballY,14);
        gr.addColorStop(0,"#fb923c");gr.addColorStop(.7,"#ea580c");gr.addColorStop(1,"#9a3412");
        ctx.beginPath();ctx.arc(s.ballX,s.ballY,14,0,Math.PI*2);ctx.fillStyle=gr;ctx.fill();
        ctx.strokeStyle="rgba(0,0,0,0.4)";ctx.lineWidth=1.5;
        ctx.beginPath();ctx.arc(s.ballX,s.ballY,14,0,Math.PI*2);ctx.stroke();
        ctx.beginPath();ctx.moveTo(s.ballX-14,s.ballY);ctx.lineTo(s.ballX+14,s.ballY);ctx.stroke();
        ctx.beginPath();ctx.moveTo(s.ballX,s.ballY-14);ctx.lineTo(s.ballX,s.ballY+14);ctx.stroke();
        ctx.shadowBlur=0;
        // Check score
        const dx=s.ballX-HOOP.x,dy=s.ballY-HOOP.y;
        if(Math.hypot(dx,dy)<HOOP.r+4&&s.bvy>0){
          s.result=Math.abs(dx)<HOOP.r*.5?"SWISH! 🏀":"IN!";s.score+=2;s.attempts++;
          for(let i=0;i<18;i++)s.particles.push({x:HOOP.x,y:HOOP.y,vx:(Math.random()-.5)*150,vy:(Math.random()-.9)*100,life:1,color:["#fb923c","#fbbf24","#fff"][Math.floor(Math.random()*3)],r:3});
          s.phase="result";s.animT=0;
        } else if(s.ballY>H||s.ballX>W){s.result="MISS";s.attempts++;s.phase="result";s.animT=0;}
      }
      if(s.phase==="result"){
        s.animT+=dt;
        s.particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=200*dt;p.life-=dt*1.3;if(p.life>0){ctx.globalAlpha=p.life;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}});ctx.globalAlpha=1;
        const col=s.result.includes("IN")||s.result.includes("SWISH")?T.green:T.red;
        ctx.fillStyle=col;ctx.font="bold 38px 'Sora',sans-serif";ctx.textAlign="center";ctx.shadowColor=col;ctx.shadowBlur=22;ctx.fillText(s.result,W/2,H/2-10);ctx.shadowBlur=0;
        if(s.animT>1.5){s.attempts>=5?Object.assign(s,{phase:"gameover"}):Object.assign(s,{phase:"aim",ballX:100,ballY:H-80,power:0,angle:45,result:"",particles:[]});}
      }
      if(s.phase==="gameover"){ctx.fillStyle="rgba(0,0,0,.7)";ctx.fillRect(0,0,W,H);ctx.fillStyle=T.gold;ctx.font="bold 26px 'Sora',sans-serif";ctx.textAlign="center";ctx.fillText("🏀 Game Over",W/2,H/2-40);ctx.fillStyle=T.green;ctx.font="bold 52px 'JetBrains Mono',monospace";ctx.fillText(`${s.score} pts`,W/2,H/2+10);ctx.fillStyle=T.muted;ctx.font="11px Inter";ctx.fillText("Tap/SPACE to replay",W/2,H/2+44);}
      // HUD
      ctx.fillStyle="rgba(0,0,0,0.55)";ctx.fillRect(0,0,W,26);
      ctx.fillStyle=T.orange;ctx.font="bold 11px 'JetBrains Mono',monospace";ctx.textAlign="center";ctx.fillText("BASKETBALL",W/2,18);
      ctx.fillStyle=T.gold;ctx.textAlign="left";ctx.fillText(`${s.score} pts`,10,18);ctx.textAlign="right";ctx.fillStyle=T.muted;ctx.fillText(`${s.attempts}/5`,W-10,18);
      // Ball in aim position
      if(s.phase==="aim"){const gr=ctx.createRadialGradient(97,H-83,2,100,H-80,14);gr.addColorStop(0,"#fb923c");gr.addColorStop(1,"#9a3412");ctx.beginPath();ctx.arc(100,H-80,14,0,Math.PI*2);ctx.fillStyle=gr;ctx.fill();}
      raf.current=requestAnimationFrame(draw);
    };
    raf.current=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(raf.current);window.removeEventListener("keydown",kd);};
  },[W,H,shoot,reset,HOOP]);
  return <canvas ref={canvasRef} width={W} height={H} style={{display:"block",borderRadius:12,cursor:"pointer"}}/>;
}

// ═══════════════════════════════════════════════════════════════
// GAME 7 — Pitch Hopper (Frogger style) - enhanced
// ═══════════════════════════════════════════════════════════════
function PitchHopperGame({W=480,H=420}){
  const canvasRef=useRef(null);
  const state=useRef({px:W/2,py:H-60,lives:3,score:0,lanes:[],started:false,dead:false});
  const raf=useRef(null);
  const LANE_H=52,NL=6;
  useEffect(()=>{
    const canvas=canvasRef.current,ctx=canvas.getContext("2d");let last=0;
    const mkLanes=()=>Array.from({length:NL},(_,i)=>({y:H-100-(i+1)*LANE_H,spd:(i%2===0?1:-1)*(55+i*22),cars:Array.from({length:2+Math.floor(i/2)},(_,j)=>({x:j*(W/(2+Math.floor(i/2)))+Math.random()*20,w:40+Math.floor(Math.random()*30),col:["#60a5fa","#f87171","#fbbf24","#c084fc","#34d399"][i%5]}))}));
    const reset=()=>{const s=state.current;s.px=W/2;s.py=H-60;s.lives=3;s.score=0;s.dead=false;s.started=false;s.lanes=mkLanes();};
    reset();
    const hop=(dir)=>{const s=state.current;if(s.dead)return;s.started=true;if(dir==="u")s.py=Math.max(H-100-NL*LANE_H-20,s.py-LANE_H);if(dir==="l")s.px=Math.max(20,s.px-44);if(dir==="r")s.px=Math.min(W-20,s.px+44);if(s.py<H-100-NL*LANE_H){s.score++;s.px=W/2;s.py=H-60;s.lanes=mkLanes();}};
    const kd=e=>{if(e.key==="ArrowUp"||e.key==="w"){e.preventDefault();hop("u");}if(e.key==="ArrowLeft"||e.key==="a"){e.preventDefault();hop("l");}if(e.key==="ArrowRight"||e.key==="d"){e.preventDefault();hop("r");}if(e.key==="Enter"&&state.current.dead)reset();};
    canvas.addEventListener("click",()=>{const s=state.current;if(s.dead)reset();else hop("u");});
    window.addEventListener("keydown",kd);
    const draw=(ts)=>{
      const dt=Math.min((ts-last)/1000,.04);last=ts;
      const s=state.current;ctx.clearRect(0,0,W,H);
      // Goal zone
      const gz=ctx.createLinearGradient(0,0,0,H-100-NL*LANE_H);gz.addColorStop(0,"#052e16");gz.addColorStop(1,"#14532d");
      ctx.fillStyle=gz;ctx.fillRect(0,0,W,H-100-NL*LANE_H);
      ctx.strokeStyle="#34d399";ctx.lineWidth=2;ctx.strokeRect(3,3,W-6,H-100-NL*LANE_H-6);
      ctx.fillStyle="#34d399";ctx.font="bold 12px 'Sora',sans-serif";ctx.textAlign="center";ctx.fillText("🎯 GOAL ZONE",W/2,(H-100-NL*LANE_H)/2+5);
      // Lanes
      s.lanes.forEach((lane,i)=>{
        ctx.fillStyle=i%2===0?"#111827":"#0f172a";ctx.fillRect(0,lane.y,W,LANE_H);
        ctx.strokeStyle="rgba(255,255,255,0.04)";ctx.lineWidth=1;ctx.setLineDash([16,12]);
        ctx.beginPath();ctx.moveTo(0,lane.y+LANE_H/2);ctx.lineTo(W,lane.y+LANE_H/2);ctx.stroke();ctx.setLineDash([]);
        lane.cars.forEach(car=>{
          car.x+=lane.spd*dt;if(car.x>W+car.w)car.x=-car.w;if(car.x<-car.w)car.x=W+car.w;
          // Defender/car body
          ctx.fillStyle=car.col;ctx.shadowColor=car.col;ctx.shadowBlur=6;
          ctx.beginPath();ctx.roundRect(car.x-car.w/2,lane.y+10,car.w,LANE_H-20,5);ctx.fill();ctx.shadowBlur=0;
          // Wheels
          ctx.fillStyle="#111";[-car.w*.35,car.w*.35].forEach(wx=>{ctx.beginPath();ctx.arc(car.x+wx,lane.y+LANE_H-10,5,0,Math.PI*2);ctx.fill();});
          // Number
          ctx.fillStyle="#fff";ctx.font="bold 10px Inter";ctx.textAlign="center";ctx.fillText(i+1,car.x,lane.y+LANE_H/2+4);
        });
      });
      // Grass at bottom
      ctx.fillStyle="#14532d";ctx.fillRect(0,H-100,W,100);
      ctx.strokeStyle="rgba(255,255,255,0.1)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,H-100);ctx.lineTo(W,H-100);ctx.stroke();
      // Player
      if(!s.dead){
        ctx.fillStyle="#fbbf24";ctx.shadowColor="#fbbf24";ctx.shadowBlur=12;
        ctx.beginPath();ctx.roundRect(s.px-16,s.py-16,32,32,5);ctx.fill();ctx.shadowBlur=0;
        ctx.fillStyle="#0f172a";ctx.font="bold 9px Inter";ctx.textAlign="center";ctx.fillText("ME",s.px,s.py+3);
        // Collision check
        if(s.started)s.lanes.forEach(lane=>{if(s.py>=lane.y&&s.py<=lane.y+LANE_H){lane.cars.forEach(car=>{if(Math.abs(s.px-car.x)<car.w/2+14&&Math.abs(s.py-(lane.y+LANE_H/2))<22){s.lives--;s.px=W/2;s.py=H-60;if(s.lives<=0)s.dead=true;}});}});
      }
      // HUD
      ctx.fillStyle="rgba(0,0,0,0.55)";ctx.fillRect(0,0,W,26);
      ctx.fillStyle=T.gold;ctx.font="bold 11px 'JetBrains Mono',monospace";ctx.textAlign="center";ctx.fillText("PITCH HOPPER",W/2,18);
      ctx.fillStyle=T.green;ctx.textAlign="left";ctx.fillText(`${s.score} ×`,10,18);
      const hearts="❤️".repeat(s.lives)+"🖤".repeat(3-s.lives);
      ctx.textAlign="right";ctx.fillText(hearts,W-10,18);
      if(!s.started){ctx.fillStyle="rgba(0,0,0,.6)";ctx.fillRect(0,0,W,H);ctx.fillStyle="#e2eeff";ctx.font="bold 22px 'Sora',sans-serif";ctx.textAlign="center";ctx.fillText("⬆ Pitch Hopper",W/2,H/2-20);ctx.fillStyle=T.muted;ctx.font="12px Inter";ctx.fillText("Arrow keys or WASD — tap/click to hop",W/2,H/2+6);}
      if(s.dead){ctx.fillStyle="rgba(0,0,0,.7)";ctx.fillRect(0,0,W,H);ctx.fillStyle=T.red;ctx.font="bold 28px 'Sora',sans-serif";ctx.textAlign="center";ctx.shadowColor=T.red;ctx.shadowBlur=16;ctx.fillText("TACKLED! 😅",W/2,H/2-22);ctx.shadowBlur=0;ctx.fillStyle=T.gold;ctx.font="bold 20px 'JetBrains Mono',monospace";ctx.fillText(`${s.score} crossings`,W/2,H/2+8);ctx.fillStyle=T.muted;ctx.font="11px Inter";ctx.fillText("Enter / tap to retry",W/2,H/2+34);}
      raf.current=requestAnimationFrame(draw);
    };
    raf.current=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(raf.current);window.removeEventListener("keydown",kd);};
  },[W,H,NL,LANE_H]);
  return <canvas ref={canvasRef} width={W} height={H} style={{display:"block",borderRadius:12,cursor:"pointer"}}/>;
}

// ═══════════════════════════════════════════════════════════════
// GAME 8 — Badminton (shuttlecock rally)
// ═══════════════════════════════════════════════════════════════
function BadmintonGame({W=480,H=360}){
  const canvasRef=useRef(null);
  const state=useRef({sx:240,sy:80,svx:100,svy:60,pX:240,aiX:240,pS:0,aiS:0,dead:false,started:false,rally:0});
  const raf=useRef(null);const keys=useRef({});
  useEffect(()=>{
    const canvas=canvasRef.current,ctx=canvas.getContext("2d");let last=0;
    const reset=()=>{const s=state.current;Object.assign(s,{sx:240,sy:80,svx:95,svy:55,pX:240,aiX:240,pS:0,aiS:0,dead:false,started:false,rally:0});};
    const kd=e=>{keys.current[e.key]=true;if(e.key==="Enter"){const s=state.current;if(!s.started)s.started=true;if(s.dead)reset();}["ArrowLeft","ArrowRight"].includes(e.key)&&e.preventDefault();};
    const ku=e=>{keys.current[e.key]=false;};
    window.addEventListener("keydown",kd);window.addEventListener("keyup",ku);
    const draw=(ts)=>{
      const dt=Math.min((ts-last)/1000,.04);last=ts;const s=state.current;ctx.clearRect(0,0,W,H);
      // Court - wood flooring
      const cg=ctx.createLinearGradient(0,0,W,H);cg.addColorStop(0,"#7c2d12");cg.addColorStop(1,"#9a3412");
      ctx.fillStyle=cg;ctx.fillRect(0,0,W,H);
      for(let i=0;i<W;i+=30){ctx.fillStyle=`rgba(0,0,0,${i%60===0?.08:.04})`;ctx.fillRect(i,0,15,H);}
      // Lines
      ctx.strokeStyle="rgba(255,255,255,0.4)";ctx.lineWidth=1.5;
      ctx.strokeRect(24,24,W-48,H-48);
      ctx.beginPath();ctx.moveTo(24,H/2);ctx.lineTo(W-24,H/2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(W/2,24);ctx.lineTo(W/2,H-24);ctx.stroke();
      // Net
      const netGr=ctx.createLinearGradient(0,H/2-20,0,H/2+20);netGr.addColorStop(0,"rgba(255,255,255,0.9)");netGr.addColorStop(1,"rgba(255,255,255,0.3)");
      ctx.strokeStyle=netGr;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(24,H/2);ctx.lineTo(W-24,H/2);ctx.stroke();
      ctx.strokeStyle="rgba(255,255,255,0.15)";ctx.lineWidth=0.8;
      for(let x=24;x<W-24;x+=10){ctx.beginPath();ctx.moveTo(x,H/2-14);ctx.lineTo(x+5,H/2+14);ctx.stroke();}
      // Net posts
      ctx.fillStyle="#ccc";ctx.fillRect(20,H/2-24,6,48);ctx.fillRect(W-26,H/2-24,6,48);
      if(s.started&&!s.dead){
        if(keys.current["ArrowLeft"])s.pX=Math.max(40,s.pX-260*dt);
        if(keys.current["ArrowRight"])s.pX=Math.min(W-40,s.pX+260*dt);
        s.aiX+=(s.sx-s.aiX)*1.7*dt;s.aiX=Math.max(40,Math.min(W-40,s.aiX));
        s.sx+=s.svx*dt;s.sy+=s.svy*dt;s.svy+=30*dt;// slight gravity
        if(s.sx<28||s.sx>W-28){s.svx*=-.9;s.sx=s.sx<28?28:W-28;}
        // Player hit
        if(s.sy>H-78&&s.sy<H-55&&Math.abs(s.sx-s.pX)<40){s.svy=-Math.abs(s.svy)*1.06-10;s.svx+=(s.sx-s.pX)*1.8;s.rally++;s.svy=Math.max(s.svy,-200);}
        // AI hit
        if(s.sy<78&&s.sy>55&&Math.abs(s.sx-s.aiX)<40){s.svy=Math.abs(s.svy)*1.04+10;s.svx+=(s.sx-s.aiX)*1.8;s.rally++;}
        if(s.sy>H){s.aiS++;s.sx=240;s.sy=80;s.svy=55;s.svx=(Math.random()-.5)*100;s.rally=0;}
        if(s.sy<0){s.pS++;s.sx=240;s.sy=80;s.svy=-55;s.svx=(Math.random()-.5)*100;s.rally=0;}
        if(s.pS>=11||s.aiS>=11)s.dead=true;
      }
      // Rackets/players
      [[s.pX,H-64,"#fbbf24"],[s.aiX,60,"#60a5fa"]].forEach(([x,y,col],pi)=>{
        ctx.save();ctx.translate(x,y);ctx.rotate(pi===0?-.3:.3);
        ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(0,-14,10,14,0,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle="#fff";ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,-14,10,14,0,0,Math.PI*2);ctx.stroke();
        ctx.strokeStyle=col;ctx.lineWidth=3;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,18);ctx.stroke();
        ctx.restore();
        ctx.fillStyle=col;ctx.font="bold 8px Inter";ctx.textAlign="center";ctx.fillText(pi===0?"YOU":"CPU",x,pi===0?H-46:46);
      });
      // Shuttlecock
      ctx.beginPath();ctx.arc(s.sx,s.sy,7,0,Math.PI*2);ctx.fillStyle="#fff";ctx.shadowColor="#fff";ctx.shadowBlur=8;ctx.fill();ctx.shadowBlur=0;
      // Feathers
      for(let i=0;i<6;i++){const a=i/6*Math.PI*2;ctx.strokeStyle="rgba(255,255,255,0.5)";ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(s.sx,s.sy);ctx.lineTo(s.sx+Math.cos(a)*10,s.sy+Math.sin(a)*10);ctx.stroke();}
      // HUD
      ctx.fillStyle="rgba(0,0,0,0.5)";ctx.fillRect(0,0,W,26);
      ctx.fillStyle=T.gold;ctx.font="bold 11px 'JetBrains Mono',monospace";ctx.textAlign="center";ctx.fillText("BADMINTON",W/2,18);
      ctx.fillStyle="#fbbf24";ctx.textAlign="left";ctx.fillText(`YOU ${s.pS}`,10,18);ctx.fillStyle="#60a5fa";ctx.textAlign="right";ctx.fillText(`CPU ${s.aiS}`,W-10,18);
      if(!s.started){ctx.fillStyle="rgba(0,0,0,.6)";ctx.fillRect(0,0,W,H);ctx.fillStyle="#e2eeff";ctx.font="bold 22px 'Sora',sans-serif";ctx.textAlign="center";ctx.fillText("🏸 Badminton",W/2,H/2-18);ctx.fillStyle=T.muted;ctx.font="12px Inter";ctx.fillText("← → to move · Enter to start · First to 11",W/2,H/2+6);}
      if(s.dead){ctx.fillStyle="rgba(0,0,0,.7)";ctx.fillRect(0,0,W,H);const wc=s.pS>=11?T.green:T.red;ctx.fillStyle=wc;ctx.font="bold 26px 'Sora',sans-serif";ctx.textAlign="center";ctx.shadowColor=wc;ctx.shadowBlur=16;ctx.fillText(s.pS>=11?"You Win! 🏆":"CPU Wins",W/2,H/2-18);ctx.shadowBlur=0;ctx.fillStyle=T.gold;ctx.font="bold 15px 'JetBrains Mono',monospace";ctx.fillText(`${s.pS}–${s.aiS}`,W/2,H/2+8);ctx.fillStyle=T.muted;ctx.font="11px Inter";ctx.fillText("Enter to rematch",W/2,H/2+32);}
      raf.current=requestAnimationFrame(draw);
    };
    raf.current=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(raf.current);window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku);};
  },[W,H]);
  return <canvas ref={canvasRef} width={W} height={H} style={{display:"block",borderRadius:12}}/>;
}

// ═══════════════════════════════════════════════════════════════
// GAME 9 — Table Tennis (Stats Pong with real visuals)
// ═══════════════════════════════════════════════════════════════
function TableTennisGame({W=480,H=320}){
  const canvasRef=useRef(null);
  const state=useRef({bx:240,by:160,bvx:150,bvy:90,pY:120,aiY:120,pS:0,aiS:0,dead:false,started:false,spin:0});
  const raf=useRef(null);const keys=useRef({});
  useEffect(()=>{
    const canvas=canvasRef.current,ctx=canvas.getContext("2d");let last=0;
    const reset=()=>{const s=state.current;Object.assign(s,{bx:240,by:H/2,bvx:155,bvy:85,pY:H/2-28,aiY:H/2-28,pS:0,aiS:0,dead:false,started:false,spin:0});};
    const kd=e=>{keys.current[e.key]=true;if(e.key==="Enter"){const s=state.current;if(!s.started)s.started=true;if(s.dead)reset();}["ArrowUp","ArrowDown"].includes(e.key)&&e.preventDefault();};
    const ku=e=>{keys.current[e.key]=false;};
    window.addEventListener("keydown",kd);window.addEventListener("keyup",ku);
    const draw=(ts)=>{
      const dt=Math.min((ts-last)/1000,.04);last=ts;const s=state.current;ctx.clearRect(0,0,W,H);
      // Table
      const tg=ctx.createLinearGradient(0,0,W,H);tg.addColorStop(0,"#1d4ed8");tg.addColorStop(1,"#1e40af");
      ctx.fillStyle=tg;ctx.fillRect(0,0,W,H);
      // Table lines
      ctx.strokeStyle="rgba(255,255,255,0.3)";ctx.lineWidth=1.5;
      ctx.strokeRect(10,10,W-20,H-20);
      ctx.beginPath();ctx.moveTo(W/2,10);ctx.lineTo(W/2,H-10);ctx.stroke();
      ctx.beginPath();ctx.moveTo(10,H/2);ctx.lineTo(W-10,H/2);ctx.stroke();
      // Net
      ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(W/2,10);ctx.lineTo(W/2,H-10);ctx.stroke();
      ctx.fillStyle="#c84b00";ctx.fillRect(W/2-2,6,4,6);ctx.fillRect(W/2-2,H-12,4,6);
      if(s.started&&!s.dead){
        if(keys.current["ArrowUp"])s.pY=Math.max(12,s.pY-210*dt);
        if(keys.current["ArrowDown"])s.pY=Math.min(H-68,s.pY+210*dt);
        s.aiY+=(s.by-28-s.aiY)*Math.min(1,2.0*dt);s.aiY=Math.max(12,Math.min(H-68,s.aiY));
        s.bx+=s.bvx*dt;s.by+=s.bvy*dt;s.by+=s.spin*dt*.5;
        if(s.by<14){s.by=14;s.bvy=Math.abs(s.bvy);}if(s.by>H-14){s.by=H-14;s.bvy=-Math.abs(s.bvy);}
        if(s.bx<30+10&&s.bx>18&&s.by>s.pY&&s.by<s.pY+56){s.bvx=Math.abs(s.bvx)*1.05;s.bvy+=(s.by-(s.pY+28))*2;s.spin=(s.by-(s.pY+28))*.2;s.bx=31;}
        if(s.bx>W-30-10&&s.bx<W-18&&s.by>s.aiY&&s.by<s.aiY+56){s.bvx=-Math.abs(s.bvx)*1.05;s.bvy+=(s.by-(s.aiY+28))*2;s.spin=(s.by-(s.aiY+28))*.15;s.bx=W-31;}
        if(s.bx<14){s.aiS++;reset();return;}if(s.bx>W-14){s.pS++;reset();return;}
        if(s.pS>=11||s.aiS>=11)s.dead=true;
      }
      // Paddles
      [[22,s.pY,"#f87171"],[W-30,s.aiY,"#34d399"]].forEach(([x,y,col])=>{
        ctx.fillStyle=col;ctx.shadowColor=col;ctx.shadowBlur=10;
        ctx.beginPath();ctx.roundRect(x,y,10,56,4);ctx.fill();ctx.shadowBlur=0;
        ctx.fillStyle="rgba(0,0,0,0.3)";ctx.beginPath();ctx.roundRect(x+2,y+2,6,52,3);ctx.fill();
      });
      // Ball with spin indicator
      const bg=ctx.createRadialGradient(s.bx-2,s.by-2,1,s.bx,s.by,8);bg.addColorStop(0,"#fff");bg.addColorStop(1,"#fecaca");
      ctx.beginPath();ctx.arc(s.bx,s.by,8,0,Math.PI*2);ctx.fillStyle=bg;ctx.shadowColor="#fff";ctx.shadowBlur=10;ctx.fill();ctx.shadowBlur=0;
      // Score
      ctx.fillStyle="rgba(255,255,255,0.15)";ctx.font="bold 44px 'JetBrains Mono',monospace";ctx.textAlign="center";ctx.fillText(s.pS,W/2-44,52);ctx.fillText(s.aiS,W/2+44,52);
      if(!s.started){ctx.fillStyle="rgba(0,0,0,.55)";ctx.fillRect(0,0,W,H);ctx.fillStyle="#e2eeff";ctx.font="bold 20px 'Sora',sans-serif";ctx.textAlign="center";ctx.fillText("🏓 Table Tennis",W/2,H/2-18);ctx.fillStyle=T.muted;ctx.font="11px Inter";ctx.fillText("↑ ↓ arrows · Enter to start · First to 11",W/2,H/2+6);}
      if(s.dead){ctx.fillStyle="rgba(0,0,0,.65)";ctx.fillRect(0,0,W,H);const wc=s.pS>=11?T.green:T.red;ctx.fillStyle=wc;ctx.font="bold 24px 'Sora',sans-serif";ctx.textAlign="center";ctx.shadowColor=wc;ctx.shadowBlur=14;ctx.fillText(s.pS>=11?"You Win!":"CPU Wins",W/2,H/2-16);ctx.shadowBlur=0;ctx.fillStyle=T.gold;ctx.font="bold 14px 'JetBrains Mono',monospace";ctx.fillText(`${s.pS}–${s.aiS}`,W/2,H/2+6);ctx.fillStyle=T.muted;ctx.font="10px Inter";ctx.fillText("Enter to rematch",W/2,H/2+28);}
      raf.current=requestAnimationFrame(draw);
    };
    raf.current=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(raf.current);window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku);};
  },[W,H]);
  return <canvas ref={canvasRef} width={W} height={H} style={{display:"block",borderRadius:12}}/>;
}

// ═══════════════════════════════════════════════════════════════
// GAME 10 — Archery (click to shoot, wind challenge)
// ═══════════════════════════════════════════════════════════════
function ArcheryGame({W=480,H=380}){
  const canvasRef=useRef(null);
  const state=useRef({arrows:[],score:0,shots:0,maxShots:10,power:0,powerDir:1,wind:(Math.random()-.5)*4,crossX:W/2,crossY:H/2,phase:"aim"});
  const raf=useRef(null);
  const TARGET={x:W-100,y:H/2};
  const shoot=useCallback(()=>{const s=state.current;if(s.phase!=="aim"||s.shots>=s.maxShots)return;s.arrows.push({x:60,y:H/2,tx:s.crossX,ty:s.crossY,t:0,scored:false,ring:0});s.shots++;s.phase="shot";s.wind=(Math.random()-.5)*5;setTimeout(()=>Object.assign(s,{phase:"aim",crossX:W/2,crossY:H/2}),900);},[H,W]);
  const restart=useCallback(()=>{const s=state.current;Object.assign(s,{arrows:[],score:0,shots:0,phase:"aim",crossX:W/2,crossY:H/2,wind:(Math.random()-.5)*4});},[]);
  useEffect(()=>{
    const canvas=canvasRef.current,ctx=canvas.getContext("2d");let last=0;
    const kd=e=>{if(e.code==="Space"){e.preventDefault();const s=state.current;s.shots>=s.maxShots?restart():shoot();}};
    canvas.addEventListener("click",()=>{const s=state.current;s.shots>=s.maxShots?restart():shoot();});
    canvas.addEventListener("mousemove",e=>{const r=canvas.getBoundingClientRect();const s=state.current;if(s.phase==="aim"){s.crossX=(e.clientX-r.left)*(W/r.width);s.crossY=(e.clientY-r.top)*(H/r.height);}});
    window.addEventListener("keydown",kd);
    const draw=(ts)=>{
      const dt=Math.min((ts-last)/1000,.04);last=ts;const s=state.current;ctx.clearRect(0,0,W,H);
      // Sky
      const sg=ctx.createLinearGradient(0,0,0,H);sg.addColorStop(0,"#0c1445");sg.addColorStop(1,"#1a2a50");
      ctx.fillStyle=sg;ctx.fillRect(0,0,W,H);
      // Ground
      ctx.fillStyle="#1a3a0a";ctx.fillRect(0,H*.7,W,H*.3);
      // Target rings
      const rings=[{r:55,col:"#1a1a1a",pts:1},{r:45,col:"#3b3b3b",pts:3},{r:34,col:"#3b82f6",pts:5},{r:23,col:"#ef4444",pts:7},{r:13,col:"#fbbf24",pts:9},{r:5,col:"#fbbf24",pts:10}];
      rings.forEach(({r,col})=>{ctx.beginPath();ctx.arc(TARGET.x,TARGET.y,r,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();});
      ctx.strokeStyle="rgba(255,255,255,0.2)";ctx.lineWidth=0.5;rings.slice(0,5).forEach(({r})=>{ctx.beginPath();ctx.arc(TARGET.x,TARGET.y,r,0,Math.PI*2);ctx.stroke();});
      ctx.strokeStyle="rgba(255,255,255,0.4)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(TARGET.x-55,TARGET.y);ctx.lineTo(TARGET.x+55,TARGET.y);ctx.moveTo(TARGET.x,TARGET.y-55);ctx.lineTo(TARGET.x,TARGET.y+55);ctx.stroke();
      // Arrows
      s.arrows.forEach(a=>{
        a.t+=dt;const prog=Math.min(a.t/.5,1);
        const ax=60+(a.tx-60)*prog+s.wind*prog*prog*3;const ay=H/2+(a.ty-H/2)*prog;
        if(prog>=1&&!a.scored){const dist=Math.hypot(ax-TARGET.x,ay-TARGET.y);const r=rings.find(r=>dist<r.r);a.scored=true;a.ring=r?r.pts:0;s.score+=a.ring;}
        ctx.strokeStyle="#c8a043";ctx.lineWidth=2;ctx.lineCap="round";
        ctx.beginPath();ctx.moveTo(ax-16,ay+4);ctx.lineTo(ax,ay);ctx.stroke();
        ctx.fillStyle="#555";ctx.beginPath();ctx.moveTo(ax-18,ay+2);ctx.lineTo(ax-14,ay+6);ctx.lineTo(ax-12,ay+1);ctx.fill();
        ctx.fillStyle="#f87171";ctx.beginPath();ctx.arc(ax,ay,3,0,Math.PI*2);ctx.fill();
        if(a.ring>0){ctx.fillStyle=T.gold;ctx.font="bold 11px 'JetBrains Mono',monospace";ctx.textAlign="center";ctx.fillText(`+${a.ring}`,ax,ay-14);}
      });
      // Bow
      ctx.strokeStyle="#8B6914";ctx.lineWidth=4;ctx.lineCap="round";
      ctx.beginPath();ctx.arc(60,H/2,35,-Math.PI*.5,Math.PI*.5,false);ctx.stroke();
      ctx.strokeStyle="#ccc";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(60,H/2-35);ctx.lineTo(60,H/2+35);ctx.stroke();
      // Crosshair
      if(s.phase==="aim"){
        ctx.strokeStyle="rgba(255,200,0,.7)";ctx.lineWidth=1.5;ctx.setLineDash([6,4]);
        ctx.beginPath();ctx.moveTo(s.crossX-18,s.crossY);ctx.lineTo(s.crossX+18,s.crossY);ctx.stroke();
        ctx.beginPath();ctx.moveTo(s.crossX,s.crossY-18);ctx.lineTo(s.crossX,s.crossY+18);ctx.stroke();
        ctx.setLineDash([]);ctx.beginPath();ctx.arc(s.crossX,s.crossY,8,0,Math.PI*2);ctx.stroke();
      }
      // Wind indicator
      const wx=W/2+(s.wind*.5>0?1:-1)*Math.abs(s.wind)*10;
      ctx.fillStyle="rgba(0,0,0,.5)";ctx.fillRect(W/2-60,H-24,120,14);
      ctx.fillStyle=s.wind>0?"#60a5fa":"#f87171";ctx.fillRect(W/2,H-24,s.wind*10,14);
      ctx.strokeStyle="rgba(255,255,255,0.2)";ctx.strokeRect(W/2-60,H-24,120,14);
      ctx.fillStyle="#e2eeff";ctx.font="9px Inter";ctx.textAlign="center";ctx.fillText(`Wind: ${s.wind>0?"→":"←"} ${Math.abs(s.wind).toFixed(1)}`,W/2,H-14);
      // HUD
      ctx.fillStyle="rgba(0,0,0,.55)";ctx.fillRect(0,0,W,26);
      ctx.fillStyle=T.gold;ctx.font="bold 11px 'JetBrains Mono',monospace";ctx.textAlign="center";ctx.fillText("🏹 ARCHERY",W/2,18);
      ctx.fillStyle=T.green;ctx.textAlign="left";ctx.fillText(`${s.score} pts`,10,18);ctx.fillStyle=T.muted;ctx.textAlign="right";ctx.fillText(`${s.shots}/${s.maxShots}`,W-10,18);
      if(s.shots>=s.maxShots&&s.phase==="aim"){ctx.fillStyle="rgba(0,0,0,.7)";ctx.fillRect(0,0,W,H);ctx.fillStyle=T.gold;ctx.font="bold 26px 'Sora',sans-serif";ctx.textAlign="center";ctx.fillText("🏹 Final Score",W/2,H/2-38);ctx.fillStyle=T.green;ctx.font="bold 54px 'JetBrains Mono',monospace";ctx.fillText(s.score,W/2,H/2+12);ctx.fillStyle=T.muted;ctx.font="11px Inter";ctx.fillText(s.score>=70?"Perfect!":s.score>=50?"Sharp eye!":"Keep practising",W/2,H/2+40);ctx.fillText("SPACE/tap to restart",W/2,H/2+58);}
      raf.current=requestAnimationFrame(draw);
    };
    raf.current=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(raf.current);window.removeEventListener("keydown",kd);};
  },[W,H,shoot,restart,TARGET]);
  return <canvas ref={canvasRef} width={W} height={H} style={{display:"block",borderRadius:12,cursor:"crosshair"}}/>;
}

// ═══════════════════════════════════════════════════════════════
// GAME 11 — American Football (QB Pass)
// ═══════════════════════════════════════════════════════════════
function AmFootballGame({W=480,H=380}){
  const canvasRef=useRef(null);
  const state=useRef({phase:"aim",receiverX:W-100,receiverY:H/2,receiverSpd:90,ballX:80,ballY:H-80,bvx:0,bvy:0,score:0,attempts:0,inc:0,result:"",animT:0,targetX:W-100,targetY:H/2,power:0.5});
  const raf=useRef(null);
  const throwBall=useCallback(()=>{const s=state.current;if(s.phase!=="aim")return;s.bvx=(s.targetX-s.ballX)*2.2;s.bvy=(s.targetY-s.ballY)*2.2;s.phase="flight";s.animT=0;},[]);
  const restart=useCallback(()=>{const s=state.current;Object.assign(s,{phase:"aim",receiverX:W-100,receiverY:H/2,ballX:80,ballY:H-80,score:0,attempts:0,inc:0,result:"",animT:0});},[H,W]);
  useEffect(()=>{
    const canvas=canvasRef.current,ctx=canvas.getContext("2d");let last=0;
    const kd=e=>{if(e.code==="Space"){e.preventDefault();const s=state.current;s.phase==="aim"?throwBall():s.phase==="gameover"?restart():null;}};
    canvas.addEventListener("click",e=>{const s=state.current;if(s.phase!=="aim"){s.phase==="gameover"&&restart();return;}const r=canvas.getBoundingClientRect();s.targetX=(e.clientX-r.left)*(W/r.width);s.targetY=(e.clientY-r.top)*(H/r.height);throwBall();});
    canvas.addEventListener("mousemove",e=>{const s=state.current;if(s.phase!=="aim")return;const r=canvas.getBoundingClientRect();s.targetX=(e.clientX-r.left)*(W/r.width);s.targetY=(e.clientY-r.top)*(H/r.height);});
    window.addEventListener("keydown",kd);
    const draw=(ts)=>{
      const dt=Math.min((ts-last)/1000,.04);last=ts;const s=state.current;ctx.clearRect(0,0,W,H);
      // Field
      ctx.fillStyle="#15803d";ctx.fillRect(0,0,W,H);
      for(let i=0;i<W;i+=48){ctx.fillStyle=i%96===0?"rgba(0,0,0,.07)":"rgba(255,255,255,.03)";ctx.fillRect(i,0,48,H);}
      // Yard lines
      ctx.strokeStyle="rgba(255,255,255,0.2)";ctx.lineWidth=1.5;
      for(let x=60;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,20);ctx.lineTo(x,H-20);ctx.stroke();}
      // End zone
      ctx.fillStyle="rgba(255,165,0,.08)";ctx.fillRect(W-60,0,60,H);
      ctx.strokeStyle="rgba(255,165,0,.4)";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(W-60,20);ctx.lineTo(W-60,H-20);ctx.stroke();
      ctx.fillStyle="rgba(255,165,0,.6)";ctx.font="bold 11px Inter";ctx.textAlign="center";ctx.fillText("END ZONE",W-30,H/2);
      // Goal post
      ctx.strokeStyle="#fbbf24";ctx.lineWidth=4;ctx.shadowColor="#fbbf24";ctx.shadowBlur=8;
      ctx.beginPath();ctx.moveTo(W-20,H/2-40);ctx.lineTo(W-20,H/2+40);ctx.stroke();
      ctx.beginPath();ctx.moveTo(W-20,H/2);ctx.lineTo(W-4,H/2);ctx.stroke();ctx.shadowBlur=0;
      // Receiver
      if(s.phase==="aim"){
        s.receiverX+=Math.sin(ts/600)*s.receiverSpd*dt*1.5;
        s.receiverY+=Math.cos(ts/700)*s.receiverSpd*dt;
        s.receiverX=Math.max(W-200,Math.min(W-20,s.receiverX));
        s.receiverY=Math.max(30,Math.min(H-30,s.receiverY));
        // Route trail
        ctx.strokeStyle="rgba(96,165,250,0.2)";ctx.lineWidth=1;ctx.setLineDash([4,6]);
        ctx.beginPath();ctx.moveTo(80,H-80);ctx.lineTo(s.receiverX,s.receiverY);ctx.stroke();ctx.setLineDash([]);
        // Target indicator
        ctx.strokeStyle="rgba(251,191,36,0.5)";ctx.lineWidth=1.5;ctx.setLineDash([3,4]);
        ctx.beginPath();ctx.arc(s.targetX,s.targetY,16,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      }
      ctx.fillStyle="#60a5fa";ctx.shadowColor="#60a5fa";ctx.shadowBlur=8;
      ctx.beginPath();ctx.roundRect(s.receiverX-10,s.receiverY-14,20,28,3);ctx.fill();ctx.shadowBlur=0;
      ctx.fillStyle="#fff";ctx.font="bold 8px Inter";ctx.textAlign="center";ctx.fillText("WR",s.receiverX,s.receiverY+3);
      // QB
      ctx.fillStyle="#f87171";ctx.beginPath();ctx.roundRect(70,H-94,20,28,3);ctx.fill();
      ctx.fillStyle="#fff";ctx.font="bold 8px Inter";ctx.fillText("QB",80,H-78);
      // Ball
      if(s.phase==="aim"){
        const t=ts/1000;
        ctx.fillStyle="#c8692a";ctx.save();ctx.translate(80,H-80);ctx.rotate(Math.sin(t)*.1);
        ctx.beginPath();ctx.ellipse(0,0,8,5,Math.PI*.25,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle="rgba(255,255,255,0.4)";ctx.lineWidth=0.8;ctx.beginPath();ctx.arc(0,0,4,0,Math.PI*2);ctx.stroke();
        ctx.restore();
      }
      if(s.phase==="flight"){
        s.animT+=dt;const prog=Math.min(s.animT/.45,1);
        const e=1-(1-prog)*(1-prog);
        s.ballX=80+(s.targetX-80)*e;s.ballY=(H-80)+(s.targetY-(H-80))*e-Math.sin(prog*Math.PI)*40;
        // Ball arc
        ctx.fillStyle="#c8692a";ctx.save();ctx.translate(s.ballX,s.ballY);ctx.rotate(prog*Math.PI*2);
        ctx.beginPath();ctx.ellipse(0,0,9,5.5,0,0,Math.PI*2);ctx.fill();ctx.restore();
        if(prog>=1){
          const dist=Math.hypot(s.targetX-s.receiverX,s.targetY-s.receiverY);
          const caught=dist<50;
          s.result=caught?"COMPLETION! 🏈":"INCOMPLETE";
          if(caught)s.score+=6;else s.inc++;s.attempts++;
          s.phase="result";s.animT=0;
          setTimeout(()=>{
            Object.assign(s,{phase:"aim",ballX:80,ballY:H-80,receiverX:W-100,receiverY:H/2,targetX:W-100,targetY:H/2,result:""});
            if(s.attempts>=6)Object.assign(s,{phase:"gameover"});
          },1300);
        }
      }
      if(s.result){const col=s.result.includes("COMP")?T.green:T.red;ctx.fillStyle=col;ctx.font="bold 32px 'Sora',sans-serif";ctx.textAlign="center";ctx.shadowColor=col;ctx.shadowBlur=20;ctx.fillText(s.result,W/2,H/2);ctx.shadowBlur=0;}
      if(s.phase==="gameover"){ctx.fillStyle="rgba(0,0,0,.7)";ctx.fillRect(0,0,W,H);ctx.fillStyle=T.gold;ctx.font="bold 24px 'Sora',sans-serif";ctx.textAlign="center";ctx.fillText("🏈 Final Stats",W/2,H/2-42);ctx.fillStyle=T.green;ctx.font="bold 42px 'JetBrains Mono',monospace";ctx.fillText(`${s.score} pts`,W/2,H/2+4);ctx.fillStyle=T.muted;ctx.font="11px Inter";ctx.fillText(`${s.attempts-s.inc}/${s.attempts} completions`,W/2,H/2+32);ctx.fillText("Tap to play again",W/2,H/2+50);}
      // HUD
      ctx.fillStyle="rgba(0,0,0,.55)";ctx.fillRect(0,0,W,26);ctx.fillStyle=T.orange;ctx.font="bold 11px 'JetBrains Mono',monospace";ctx.textAlign="center";ctx.fillText("🏈 QB PASS",W/2,18);ctx.fillStyle=T.green;ctx.textAlign="left";ctx.fillText(`${s.score} pts`,10,18);ctx.fillStyle=T.muted;ctx.textAlign="right";ctx.fillText(`${s.attempts}/6 drives`,W-10,18);
      if(s.phase==="aim"){ctx.fillStyle="rgba(255,255,255,0.5)";ctx.font="10px Inter";ctx.textAlign="center";ctx.fillText("Click receiver or target to throw",W/2,H-8);}
      raf.current=requestAnimationFrame(draw);
    };
    raf.current=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(raf.current);window.removeEventListener("keydown",kd);};
  },[W,H,throwBall,restart]);
  return <canvas ref={canvasRef} width={W} height={H} style={{display:"block",borderRadius:12,cursor:"crosshair"}}/>;
}

// ═══════════════════════════════════════════════════════════════
// GAME 12 — Number Slide (2048 style)
// ═══════════════════════════════════════════════════════════════
function NumberSlideGame(){
  const init=()=>{const b=Array(16).fill(0);[Math.floor(Math.random()*16),Math.floor(Math.random()*16)].forEach(i=>b[i]=2);return b;};
  const [board,setBoard]=useState(init);const [score,setScore]=useState(0);const [best,setBest]=useState(0);const [over,setOver]=useState(false);
  const addTile=useCallback((b)=>{const empty=b.reduce((a,v,i)=>v===0?[...a,i]:a,[]);if(!empty.length)return b;const nb=[...b];nb[empty[Math.floor(Math.random()*empty.length)]]=Math.random()<.9?2:4;return nb;},[]);
  const slide=useCallback((dir)=>{
    if(over)return;
    let b=[...board],sc=0,moved=false;
    const rowOp=(row)=>{const r=row.filter(Boolean);for(let i=0;i<r.length-1;i++){if(r[i]===r[i+1]){r[i]*=2;sc+=r[i];r.splice(i+1,1);moved=true;}}while(r.length<4)r.push(0);return r;};
    if(dir==="left"||dir==="right"){
      for(let r=0;r<4;r++){let row=b.slice(r*4,r*4+4);if(dir==="right")row=row.reverse();const nr=rowOp(row);if(JSON.stringify(nr)!==JSON.stringify(dir==="right"?[...row].reverse():row))moved=true;const fr=dir==="right"?nr.reverse():nr;fr.forEach((v,c)=>b[r*4+c]=v);}
    }else{
      for(let c=0;c<4;c++){let col=[b[c],b[c+4],b[c+8],b[c+12]];if(dir==="down")col=col.reverse();const nc=rowOp(col);if(JSON.stringify(nc)!==JSON.stringify(dir==="down"?[...col].reverse():col))moved=true;const fc=dir==="down"?nc.reverse():nc;fc.forEach((v,r)=>b[c+r*4]=v);}
    }
    if(!moved)return;
    const nb=addTile(b);setBoard(nb);
    const ns=score+sc;setScore(ns);setBest(m=>Math.max(m,ns));
    if(!nb.some(v=>v===0)&&!nb.some((v,i)=>v===nb[i+1]&&i%4!==3||v===nb[i+4]))setOver(true);
  },[board,score,over,addTile]);
  useEffect(()=>{const kd=e=>{const map={ArrowLeft:"left",ArrowRight:"right",ArrowUp:"up",ArrowDown:"down"};if(map[e.key]){e.preventDefault();slide(map[e.key]);}};window.addEventListener("keydown",kd);return()=>window.removeEventListener("keydown",kd);},[slide]);
  const COLORS={0:"rgba(255,255,255,0.03)",2:"#1e3a5f",4:"#1e4a6f",8:"#7c2d12",16:"#9a3412",32:"#b45309",64:"#c2410c",128:"#1e6e4e",256:"#166534",512:"#0f5436",1024:"#5b21b6",2048:"#7c3aed"};
  const reset=()=>{setBoard(init());setScore(0);setOver(false);};
  return(
    <div style={{height:420,display:"flex",flexDirection:"column",background:"rgba(8,12,24,0.98)",borderRadius:12,overflow:"hidden"}}>
      <div style={{padding:"10px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,fontWeight:900,color:T.gold,fontFamily:"Sora,sans-serif"}}>2048</span>
        <div style={{display:"flex",gap:10}}>
          {[["SCORE",score,T.blue],["BEST",best,T.green]].map(([l,v,col])=>(
            <div key={l} style={{textAlign:"center",padding:"4px 10px",borderRadius:7,background:"rgba(255,255,255,0.04)"}}>
              <div style={{fontSize:8,color:T.muted,fontFamily:"Inter,sans-serif"}}>{l}</div>
              <div style={{fontSize:15,fontWeight:900,color:col,fontFamily:"JetBrains Mono,monospace"}}>{v}</div>
            </div>
          ))}
          <button onClick={reset} style={{padding:"4px 10px",borderRadius:7,background:"rgba(192,132,252,0.12)",border:"1px solid rgba(192,132,252,0.25)",color:T.purple,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>New</button>
        </div>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:12,position:"relative"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,width:"100%",maxWidth:280}}>
          {board.map((v,i)=>(
            <div key={i} style={{aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8,background:COLORS[Math.min(v,2048)]||COLORS[2048],border:`1px solid rgba(255,255,255,${v?0.1:0.04})`,transition:"background 150ms",fontSize:v>=1024?12:v>=128?16:20,fontWeight:900,color:v?T.text:"transparent",fontFamily:"JetBrains Mono,monospace"}}>
              {v||""}
            </div>
          ))}
        </div>
        {over&&<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.75)",borderRadius:12}}>
          <div style={{fontSize:24,fontWeight:900,color:T.gold,fontFamily:"Sora,sans-serif",marginBottom:8}}>Game Over!</div>
          <div style={{fontSize:14,fontWeight:700,color:T.green,fontFamily:"JetBrains Mono,monospace",marginBottom:16}}>{score} points</div>
          <button onClick={reset} style={{padding:"8px 22px",borderRadius:9,background:"rgba(192,132,252,0.15)",border:"1px solid rgba(192,132,252,0.3)",color:T.purple,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Play Again</button>
        </div>}
      </div>
      <div style={{padding:"6px 16px",borderTop:"1px solid rgba(255,255,255,0.05)"}}>
        <div style={{display:"flex",gap:6,justifyContent:"center"}}>
          {["↑","←↓→"].map((k,i)=><span key={i} style={{fontSize:9,color:T.muted,fontFamily:"JetBrains Mono,monospace"}}>{k}</span>)}
          <span style={{fontSize:9,color:T.muted,fontFamily:"Inter,sans-serif"}}>Arrow keys to slide tiles</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// GAME REGISTRY + PAGE LAYOUT
// ═══════════════════════════════════════════════════════════════

const GAMES = [
  { id:"football",    title:"Penalty Shootout", sport:"Football",        color:T.green,  tag:"⚽",  tagLabel:"FOOTBALL",  keys:"SPACE to shoot",       desc:"Time your shot against a diving keeper. 5 chances — score as many as you can.", Component:FootballGame,      W:480,H:400 },
  { id:"tennis",      title:"Tennis Rally",      sport:"Tennis",          color:T.lime,   tag:"🎾",  tagLabel:"TENNIS",    keys:"← → arrows",           desc:"Keep the rally going. Beat the CPU 7 points in a full green-court match.", Component:TennisGame,         W:480,H:360 },
  { id:"tictactoe",   title:"Tic Tac Toe",       sport:"Strategy",        color:T.purple, tag:"✕◯",  tagLabel:"STRATEGY",  keys:"Click",                desc:"Classic game with a strategic AI opponent. Can you force a win?", Component:TicTacToeGame,       W:400,H:400 },
  { id:"f1",          title:"F1 Race",           sport:"Formula 1",       color:T.red,    tag:"🏎",  tagLabel:"FORMULA 1", keys:"Arrow keys + SPACE",   desc:"Race 3 laps on a twisting track. Drift around corners, dodge obstacles, hit SPACE for boost.", Component:F1Game, W:480,H:380 },
  { id:"cricket",     title:"Cricket Batting",   sport:"Cricket",         color:T.gold,   tag:"🏏",  tagLabel:"CRICKET",   keys:"SPACE to swing",       desc:"Face the bowler — time your shot for boundaries. 6 wickets, score big.", Component:CricketGame,        W:480,H:360 },
  { id:"basketball",  title:"Free Throw",        sport:"Basketball",      color:T.orange, tag:"🏀",  tagLabel:"BASKETBALL",keys:"SPACE / click",         desc:"Line up the perfect arc. Power bar, trajectory preview — sink 5 shots.", Component:BasketballGame,     W:480,H:400 },
  { id:"hopper",      title:"Pitch Hopper",      sport:"Arcade",          color:T.teal,   tag:"⬆",   tagLabel:"ARCADE",    keys:"Arrow keys / tap",     desc:"Cross 6 lanes of rushing defenders to reach the goal zone. Don't get tackled.", Component:PitchHopperGame, W:480,H:420 },
  { id:"badminton",   title:"Badminton Smash",   sport:"Badminton",       color:T.cyan,   tag:"🏸",  tagLabel:"BADMINTON", keys:"← → arrows",           desc:"Shuttlecock rally on a wood-floor court. First to 11 points wins.", Component:BadmintonGame,      W:480,H:360 },
  { id:"tabletennis", title:"Table Tennis",      sport:"Table Tennis",    color:T.pink,   tag:"🏓",  tagLabel:"TT",        keys:"↑ ↓ arrows",           desc:"Fast-paced table tennis with topspin. Beat the AI to 11 on the blue table.", Component:TableTennisGame,    W:480,H:320 },
  { id:"archery",     title:"Archery Range",     sport:"Archery",         color:T.red,    tag:"🏹",  tagLabel:"ARCHERY",   keys:"Mouse + SPACE",        desc:"Wind-affected target shooting. Move cursor to aim, adjust for wind, 10 arrows.", Component:ArcheryGame,    W:480,H:380 },
  { id:"amfootball",  title:"QB Pass",           sport:"Am. Football",    color:T.orange, tag:"🏈",  tagLabel:"NFL",       keys:"Click to target",      desc:"Lead the receiver with a precise QB throw. Click where to throw the spiral.", Component:AmFootballGame,    W:480,H:380 },
  { id:"numbers",     title:"2048 Tiles",        sport:"Puzzle",          color:T.blue,   tag:"#",   tagLabel:"PUZZLE",    keys:"Arrow keys",           desc:"Merge tiles to reach 2048. Classic sliding puzzle with a sports analytics twist.", Component:NumberSlideGame,   W:400,H:420 },
];

// ── Mini pitch SVG preview per sport ──────────────────────────
function GamePreview({ id, color }) {
  const previews = {
    football:    <><rect x="12" y="8" width="76" height="42" rx="2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/><path d="M18 68 Q35 38 82 28" stroke={color} strokeWidth="2" strokeDasharray="4 3" fill="none"/><circle cx="82" cy="28" r="6" fill={color}/><circle cx="50" cy="46" r="8" fill="rgba(255,77,109,0.6)"/></>,
    tennis:      <><rect x="10" y="10" width="80" height="80" rx="2" fill="#166534" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/><line x1="50" y1="10" x2="50" y2="90" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/><line x1="10" y1="50" x2="90" y2="50" stroke="rgba(255,255,255,0.8)" strokeWidth="2"/><circle cx="68" cy="35" r="7" fill="#a3e635"/></>,
    tictactoe:   <><line x1="33" y1="10" x2="33" y2="90" stroke={color} strokeWidth="2.5" opacity=".6"/><line x1="66" y1="10" x2="66" y2="90" stroke={color} strokeWidth="2.5" opacity=".6"/><line x1="10" y1="33" x2="90" y2="33" stroke={color} strokeWidth="2.5" opacity=".6"/><line x1="10" y1="66" x2="90" y2="66" stroke={color} strokeWidth="2.5" opacity=".6"/><text x="20" y="28" fontSize="14" fill="#f87171" fontWeight="bold">✕</text><circle cx="50" cy="50" r="10" fill="none" stroke="#60a5fa" strokeWidth="2.5"/></>,
    f1:          <><path d="M10 70 Q30 20 50 18 Q70 16 90 35" stroke={color} strokeWidth="2.5" fill="none"/><rect x="36" y="28" width="22" height="12" rx="5" fill="#1e40af"/><ellipse cx="40" cy="44" rx="6" ry="5" fill="#333" stroke="#888" strokeWidth="1"/><ellipse cx="58" cy="44" rx="6" ry="5" fill="#333" stroke="#888" strokeWidth="1"/></>,
    cricket:     <><rect x="30" y="12" width="14" height="60" rx="3" fill="#f5e642"/><rect x="56" y="42" width="32" height="24" rx="3" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/><circle cx="72" cy="54" r="8" fill="#dc2626"/></>,
    basketball:  <><rect x="8" y="8" width="84" height="84" rx="4" fill="#7c3f00"/><circle cx="50" cy="50" r="22" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/><circle cx="68" cy="36" r="14" fill="none" stroke={color} strokeWidth="2.5"/><circle cx="30" cy="72" r="8" fill={color}/></>,
    hopper:      <>{[0,1,2,3,4,5].map(i=><rect key={i} x="4" y={4+i*15} width="92" height="13" rx="2" fill={i%2===0?"#0f172a":"#1e293b"} stroke="rgba(255,255,255,0.04)" strokeWidth=".5"/>)}<rect x="38" y="64" width="24" height="20" rx="3" fill={color}/></>,
    badminton:   <><rect x="10" y="10" width="80" height="80" rx="2" fill="#7c2d12" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/><line x1="10" y1="50" x2="90" y2="50" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5"/><circle cx="50" cy="30" r="7" fill="#fff"/></>,
    tabletennis: <><rect x="10" y="22" width="80" height="56" rx="3" fill="#1d4ed8" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/><line x1="50" y1="22" x2="50" y2="78" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5"/><circle cx="65" cy="42" r="6" fill="#fff"/></>,
    archery:     <><circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/><circle cx="50" cy="50" r="26" fill="none" stroke="rgba(251,191,36,0.4)" strokeWidth="1"/><circle cx="50" cy="50" r="14" fill="none" stroke={color} strokeWidth="1.5"/><circle cx="50" cy="50" r="4" fill={color}/><path d="M22 22L50 50" stroke="#c8a043" strokeWidth="2" strokeLinecap="round"/></>,
    amfootball:  <><rect x="8" y="22" width="84" height="56" rx="3" fill="#15803d" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/><line x1="70" y1="22" x2="70" y2="78" stroke="rgba(255,165,0,0.4)" strokeWidth="2"/><ellipse cx="24" cy="50" rx="10" ry="7" fill="#c8692a"/><path d="M24 50 L70 38" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeDasharray="4 3"/></>,
    numbers:     <>{[[0,0,"2","#1e3a5f"],[1,0,"4","#1e4a6f"],[0,1,"8","#7c2d12"],[1,1,"16","#9a3412"]].map(([col,row,n,bg])=><g key={n}><rect x={8+col*44} y={8+row*44} width="40" height="40" rx="5" fill={bg}/><text x={8+col*44+20} y={8+row*44+26} textAnchor="middle" fontSize="14" fontWeight="900" fill="white">{n}</text></g>)}</>,
  };
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" style={{display:"block"}}>
      <rect width="100" height="100" fill="rgba(0,0,0,0.3)" rx="4"/>
      {previews[id] || null}
    </svg>
  );
}

// ── Game Card ──────────────────────────────────────────────────
function GameCard({ game, onPlay }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      onClick={onPlay}
      style={{
        background: hov ? `rgba(16,24,40,0.99)` : "rgba(10,16,30,0.95)",
        border: `1.5px solid ${hov ? game.color+"55" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 16, cursor: "pointer",
        transform: hov ? "translateY(-4px) scale(1.01)" : "none",
        transition: "all 200ms cubic-bezier(0.22,1,0.36,1)",
        boxShadow: hov ? `0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px ${game.color}20` : "0 2px 12px rgba(0,0,0,0.3)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
      {/* Top — sport preview */}
      <div style={{
        height: 108, position: "relative", overflow: "hidden",
        background: `linear-gradient(135deg, ${game.color}18 0%, rgba(0,0,0,0) 70%)`,
        borderBottom: `1px solid ${hov ? game.color+"25" : "rgba(255,255,255,0.05)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {/* Animated gradient bg */}
        <div style={{position:"absolute",inset:0,opacity:hov?0.35:0.15,background:`radial-gradient(ellipse at 50% 100%, ${game.color}33, transparent 70%)`,transition:"opacity 200ms"}}/>
        <GamePreview id={game.id} color={game.color}/>
        {/* Big emoji */}
        <div style={{position:"absolute",top:8,left:12,fontSize:22}}>{game.tag}</div>
        {/* Sport label */}
        <div style={{position:"absolute",top:8,right:10,padding:"2px 7px",borderRadius:999,background:game.color+"22",border:`1px solid ${game.color}40`,fontSize:8,fontWeight:900,color:game.color,fontFamily:"Inter,sans-serif",letterSpacing:".08em"}}>{game.tagLabel}</div>
        {/* Play overlay */}
        {hov && (
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(2px)"}}>
            <div style={{width:44,height:44,borderRadius:"50%",background:game.color,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 24px ${game.color}88`,animation:"pgrow .2s ease"}}>
              <svg width="16" height="16" viewBox="0 0 12 12" fill="none"><path d="M3 1.5l7.5 4.5L3 10.5V1.5z" fill="white"/></svg>
            </div>
          </div>
        )}
      </div>
      {/* Info */}
      <div style={{padding:"12px 14px 14px",flex:1,display:"flex",flexDirection:"column",gap:5}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <div style={{width:3,height:16,borderRadius:2,background:game.color,boxShadow:`0 0 6px ${game.color}88`,flexShrink:0}}/>
          <span style={{fontSize:13,fontWeight:800,color:"#e2eeff",fontFamily:"Sora,sans-serif",lineHeight:1.2}}>{game.title}</span>
        </div>
        <p style={{margin:0,fontSize:10.5,color:T.muted,fontFamily:"Inter,sans-serif",lineHeight:1.6}}>{game.desc}</p>
        <div style={{marginTop:3,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:9,color:game.color,fontFamily:"JetBrains Mono,monospace",fontWeight:700,background:game.color+"12",padding:"2px 7px",borderRadius:5}}>⌨ {game.keys}</div>
          <span style={{fontSize:9,color:T.muted,fontFamily:"Inter,sans-serif"}}>{game.sport}</span>
        </div>
      </div>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────
function GameModal({ game, onClose }) {
  useEffect(()=>{
    const k=e=>{if(e.key==="Escape")onClose();};
    window.addEventListener("keydown",k);return()=>window.removeEventListener("keydown",k);
  },[onClose]);
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.85)",backdropFilter:"blur(6px)"}}>
      <div style={{background:"rgba(8,13,24,0.99)",border:`1.5px solid ${game.color}40`,borderTop:`3px solid ${game.color}`,borderRadius:20,overflow:"hidden",maxWidth:"94vw",maxHeight:"94vh",display:"flex",flexDirection:"column",boxShadow:`0 40px 100px rgba(0,0,0,0.7)`}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",background:`linear-gradient(135deg,${game.color}0e,rgba(0,0,0,0))`}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:20}}>{game.tag}</span>
            <div>
              <div style={{fontSize:16,fontWeight:800,color:"#e2eeff",fontFamily:"Sora,sans-serif"}}>{game.title}</div>
              <div style={{fontSize:9,color:T.muted,fontFamily:"Inter,sans-serif"}}>{game.sport} · {game.keys}</div>
            </div>
          </div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:9,background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",color:"#f87171",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,fontFamily:"Inter,sans-serif"}}>✕</button>
        </div>
        {/* Game canvas */}
        <div style={{padding:"16px 20px 20px",overflowY:"auto"}}>
          <game.Component W={game.W||480} H={game.H||400}/>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function MiniGamesPage() {
  const [activeGame, setActiveGame] = useState(null);
  const game = GAMES.find(g=>g.id===activeGame);

  return (
    <div style={{maxWidth:1440,margin:"0 auto",padding:"28px 24px 80px",minHeight:"100vh"}}>
      {/* Page header */}
      <div style={{marginBottom:28}}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:8}}>
          <div style={{width:5,height:40,borderRadius:3,background:`linear-gradient(to bottom,${T.purple},${T.blue})`,boxShadow:`0 0 14px ${T.purple}66`}}/>
          <div>
            <h1 style={{fontSize:30,fontWeight:900,color:"#f1f5ff",margin:0,fontFamily:"Sora,sans-serif",letterSpacing:"-0.03em"}}>Sports Arena</h1>
            <p style={{fontSize:12,color:T.muted,margin:0,fontFamily:"Inter,sans-serif",marginTop:2}}>12 interactive sports games — click any card to play instantly</p>
          </div>
          <div style={{marginLeft:"auto",padding:"6px 14px",borderRadius:999,background:"rgba(192,132,252,0.1)",border:"1px solid rgba(192,132,252,0.25)",fontSize:11,fontWeight:700,color:T.purple,fontFamily:"Inter,sans-serif"}}>{GAMES.length} GAMES</div>
        </div>
      </div>

      {/* Sport filter chips */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:22}}>
        {["All",...new Set(GAMES.map(g=>g.sport))].map(sport=>(
          <div key={sport} style={{padding:"4px 12px",borderRadius:999,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",fontSize:10,fontWeight:600,color:T.muted,fontFamily:"Inter,sans-serif",cursor:"pointer",transition:"all 150ms"}}>
            {sport}
          </div>
        ))}
      </div>

      {/* Game grid — 4 columns, dense */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>
        {GAMES.map(g=><GameCard key={g.id} game={g} onPlay={()=>setActiveGame(g.id)}/>)}
      </div>

      {/* Controls strip */}
      <div style={{marginTop:24,padding:"14px 20px",borderRadius:14,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",display:"flex",flexWrap:"wrap",gap:16,alignItems:"center"}}>
        <span style={{fontSize:9,fontWeight:900,color:T.muted,letterSpacing:".12em",fontFamily:"Inter,sans-serif"}}>UNIVERSAL KEYS</span>
        {[["ESC","Close game"],["SPACE","Action"],["↑↓←→","Move"],["Enter","Start/Restart"],["Click","Interact"]].map(([k,v])=>(
          <div key={k} style={{display:"flex",alignItems:"center",gap:6}}>
            <code style={{fontSize:10,fontWeight:700,color:T.blue,fontFamily:"JetBrains Mono,monospace",background:"rgba(96,165,250,0.1)",padding:"2px 7px",borderRadius:5,border:"1px solid rgba(96,165,250,0.2)"}}>{k}</code>
            <span style={{fontSize:10,color:T.muted,fontFamily:"Inter,sans-serif"}}>{v}</span>
          </div>
        ))}
      </div>

      {game && <GameModal game={game} onClose={()=>setActiveGame(null)}/>}
      <style>{`
        @keyframes pgrow{from{transform:scale(.7)opacity:0}to{transform:scale(1)opacity:1}}
      `}</style>
    </div>
  );
}