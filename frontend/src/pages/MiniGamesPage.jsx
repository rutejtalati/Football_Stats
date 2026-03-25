// MiniGamesPage.jsx — Head Soccer · Deep Navy + Electric Orange
import { useState, useEffect, useRef, useCallback } from "react";

const C = {
  bg:"#050d1a", bgDeep:"#020810", panel:"#071120",
  border:"rgba(255,100,0,0.2)", accent:"#ff6400", accentBright:"#ff8c00",
  accentGlow:"rgba(255,100,0,0.5)", accentDim:"rgba(255,100,0,0.15)",
  blue:"#0a4fff", blueGlow:"rgba(10,79,255,0.4)",
  text:"#e8f4ff", muted:"#5a7a99", soft:"#1a3050",
  line:"rgba(255,100,0,0.12)", cyan:"#00d4ff", red:"#ff3355", yellow:"#ffd700",
};

const GW=800,GH=400,GRND=80,SR=40,BR=10,GWD=80,GHT=120;
const GRAV=0.6,SPEED=5,JUMP=-12,BDAMP=0.99,BBOUNCE=0.8,MAXSPD=13;

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,700;0,900;1,900&family=Share+Tech+Mono&family=Exo+2:wght@400;600;800;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html{scroll-behavior:smooth;}
  body{background:#050d1a;overflow-x:hidden;}
  ::-webkit-scrollbar{width:5px;}
  ::-webkit-scrollbar-track{background:#020810;}
  ::-webkit-scrollbar-thumb{background:rgba(255,100,0,0.4);border-radius:3px;}
  @keyframes flicker{0%,100%{opacity:1}92%{opacity:1}93%{opacity:0.8}94%{opacity:1}96%{opacity:0.85}97%{opacity:1}}
  @keyframes slideUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideRight{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
  @keyframes pulseRing{0%{transform:scale(1);opacity:0.9}100%{transform:scale(2);opacity:0}}
  @keyframes orbFloat{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(28px,-18px) scale(1.04)}66%{transform:translate(-18px,14px) scale(0.97)}}
  @keyframes scanV{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
  @keyframes borderTrace{0%{background-position:0% 50%}100%{background-position:200% 50%}}
  @keyframes popIn{0%{transform:scale(0.5);opacity:0}70%{transform:scale(1.07)}100%{transform:scale(1);opacity:1}}
  @keyframes dashRotate{from{stroke-dashoffset:0}to{stroke-dashoffset:-40}}
  @keyframes glowPulse{0%,100%{opacity:0.6}50%{opacity:1}}
  @keyframes countBounce{0%{transform:scale(1.5)}100%{transform:scale(1)}}
  .btn-primary{position:relative;overflow:hidden;padding:12px 32px;border-radius:3px;border:1px solid rgba(255,100,0,0.5);background:rgba(255,100,0,0.1);color:#ff8c00;font-weight:900;font-size:13px;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.14em;cursor:pointer;transition:all 180ms;text-transform:uppercase;}
  .btn-primary::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,140,0,0.18),transparent);transform:translateX(-100%);transition:transform 400ms;}
  .btn-primary:hover{background:rgba(255,100,0,0.2);border-color:rgba(255,140,0,0.9);color:#fff;box-shadow:0 0 28px rgba(255,100,0,0.4);}
  .btn-primary:hover::after{transform:translateX(100%);}
  .btn-primary:active{transform:scale(0.97);}
  .btn-blue{padding:12px 32px;border-radius:3px;border:1px solid rgba(10,79,255,0.5);background:rgba(10,79,255,0.1);color:#4d8aff;font-weight:900;font-size:13px;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.14em;cursor:pointer;transition:all 180ms;text-transform:uppercase;}
  .btn-blue:hover{background:rgba(10,79,255,0.2);border-color:rgba(77,138,255,0.9);color:#fff;box-shadow:0 0 28px rgba(10,79,255,0.4);}
  .btn-blue:active{transform:scale(0.97);}
  .btn-ghost{padding:10px 24px;border-radius:3px;border:1px solid rgba(90,122,153,0.3);background:transparent;color:#5a7a99;font-weight:700;font-size:12px;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.1em;cursor:pointer;transition:all 180ms;text-transform:uppercase;}
  .btn-ghost:hover{border-color:rgba(90,122,153,0.7);color:#8aaccc;}
  .tb{padding:10px 18px;border-radius:3px;border:1px solid rgba(255,100,0,0.3);background:rgba(255,100,0,0.07);color:#e8f4ff;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:manipulation;font-family:'Share Tech Mono',monospace;font-size:15px;transition:background 120ms;}
  .tb:active{background:rgba(255,100,0,0.22);}
  .card{position:relative;border-radius:4px;border:1px solid rgba(255,100,0,0.18);background:rgba(7,17,32,0.92);overflow:hidden;}
  .card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,140,0,0.7),transparent);}
  .card::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(10,79,255,0.4),transparent);}
`;

/* Animated hex grid background */
function BgCanvas() {
  const ref = useRef(null);
  useEffect(()=>{
    const cv=ref.current; if(!cv)return;
    const ctx=cv.getContext("2d");
    let w,h,raf;
    const pts=[];
    const resize=()=>{w=cv.width=window.innerWidth;h=cv.height=window.innerHeight;};
    resize(); window.addEventListener("resize",resize);
    for(let i=0;i<70;i++) pts.push({x:Math.random()*2000,y:Math.random()*1200,vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.25,r:Math.random()*1.4+.3,orange:Math.random()>.5,a:Math.random()*.45+.1});
    let t=0;
    const tick=()=>{
      t++;
      ctx.clearRect(0,0,w,h);
      const HEX=56;
      ctx.strokeStyle=`rgba(255,100,0,${.022+Math.sin(t*.007)*.008})`;
      ctx.lineWidth=.5;
      for(let x=-HEX;x<w+HEX;x+=HEX*1.5){
        for(let y=-HEX;y<h+HEX;y+=HEX*Math.sqrt(3)){
          for(let s=0;s<6;s++){
            const a1=s*Math.PI/3,a2=(s+1)*Math.PI/3;
            ctx.beginPath();ctx.moveTo(x+HEX*Math.cos(a1),y+HEX*Math.sin(a1));ctx.lineTo(x+HEX*Math.cos(a2),y+HEX*Math.sin(a2));ctx.stroke();
          }
        }
      }
      pts.forEach(p=>{
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0)p.x=w;if(p.x>w)p.x=0;if(p.y<0)p.y=h;if(p.y>h)p.y=0;
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=p.orange?`rgba(255,100,0,${p.a})`:`rgba(10,79,255,${p.a})`;
        ctx.fill();
      });
      const sy=(t*.35)%h;
      const sg=ctx.createLinearGradient(0,sy-5,0,sy+5);
      sg.addColorStop(0,"transparent");sg.addColorStop(.5,"rgba(255,100,0,0.035)");sg.addColorStop(1,"transparent");
      ctx.fillStyle=sg;ctx.fillRect(0,sy-5,w,10);
      raf=requestAnimationFrame(tick);
    };
    tick();
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);};
  },[]);
  return <canvas ref={ref} style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",opacity:.75}}/>;
}

/* Spinning radar ring */
function RadarRing({size=120,col="#ff6400",delay=0}) {
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{position:"absolute",inset:0}}>
        <circle cx={size/2} cy={size/2} r={size/2-4} fill="none" stroke={col+"22"} strokeWidth="1"/>
        <circle cx={size/2} cy={size/2} r={size/2-4} fill="none" stroke={col} strokeWidth="1"
          strokeDasharray="20 160" style={{animation:`dashRotate 3s linear infinite`,animationDelay:`${delay}s`}}/>
        <circle cx={size/2} cy={size/2} r={size/2-12} fill="none" stroke={col+"33"} strokeWidth=".5"/>
        <line x1={size/2} y1="8" x2={size/2} y2={size-8} stroke={col+"22"} strokeWidth=".5"/>
        <line x1="8" y1={size/2} x2={size-8} y2={size/2} stroke={col+"22"} strokeWidth=".5"/>
        <circle cx={size/2} cy={size/2} r="3" fill={col} style={{animation:"glowPulse 1.5s ease-in-out infinite",animationDelay:`${delay}s`}}/>
      </svg>
    </div>
  );
}

/* Animated hero title */
function HeroTitle() {
  return (
    <div style={{position:"relative",lineHeight:1,userSelect:"none"}}>
      <div style={{
        fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontStyle:"italic",
        fontSize:"clamp(50px,7.5vw,92px)",letterSpacing:"-0.01em",
        color:"transparent",WebkitTextStroke:"1px rgba(255,100,0,0.25)",
        position:"absolute",top:4,left:4,animation:"flicker 7s ease-in-out infinite",
      }}>HEAD SOCCER</div>
      <div style={{
        fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontStyle:"italic",
        fontSize:"clamp(50px,7.5vw,92px)",letterSpacing:"-0.01em",
        background:"linear-gradient(120deg,#ff8c00 0%,#ff4000 35%,#ff9500 65%,#ffd700 100%)",
        WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
        backgroundSize:"200% auto",animation:"borderTrace 2.5s linear infinite",position:"relative",zIndex:1,
      }}>HEAD SOCCER</div>
      <div style={{position:"absolute",bottom:-10,left:0,right:0,height:2,
        background:"linear-gradient(90deg,transparent,#ff6400 30%,#0a4fff 70%,transparent)",
        animation:"borderTrace 2s linear infinite",backgroundSize:"200% auto"}}/>
    </div>
  );
}

/* Stat badge */
function Stat({label,val,col}) {
  return (
    <div style={{padding:"10px 16px",borderRadius:3,border:`1px solid ${col}30`,background:`${col}08`,minWidth:72,textAlign:"center",position:"relative"}}>
      <div style={{position:"absolute",top:0,left:6,right:6,height:1,background:`linear-gradient(90deg,transparent,${col},transparent)`,opacity:.5}}/>
      <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:22,fontWeight:700,color:col,lineHeight:1}}>{val}</div>
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,letterSpacing:"0.18em",color:C.muted,marginTop:3,textTransform:"uppercase"}}>{label}</div>
    </div>
  );
}

/* ══════════════════════════════════
   HEAD SOCCER GAME
   ══════════════════════════════════ */
function HeadSoccerGame() {
  const cvRef=useRef(null),animRef=useRef(null),timerRef=useRef(null);
  const gsRef=useRef({}),keysRef=useRef({});
  const touchRef=useRef({l1:false,r1:false,j1:false,g1:false,l2:false,r2:false,j2:false,g2:false});
  const [screen,setScreen]=useState("menu");
  const [playerMode,setPlayerMode]=useState("single");
  const [scoreState,setScoreState]=useState({l:0,r:0});
  const [timeLeft,setTimeLeft]=useState(0);
  const [gameDur,setGameDur]=useState(60);
  const [winnerText,setWinnerText]=useState("");
  const [finalScore,setFinalScore]=useState("");
  const gameRunning=useRef(false);
  const [cvW,setCvW]=useState(Math.min(typeof window!=="undefined"?window.innerWidth-32:800,800));
  useEffect(()=>{const fn=()=>setCvW(Math.min(window.innerWidth-32,800));window.addEventListener("resize",fn);return()=>window.removeEventListener("resize",fn);},[]);
  const scaleX=cvW/GW,cvH=GH*scaleX;

  useEffect(()=>{
    const dn=e=>{keysRef.current[e.key]=true;if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault();};
    const up=e=>{keysRef.current[e.key]=false;};
    window.addEventListener("keydown",dn);window.addEventListener("keyup",up);
    return()=>{window.removeEventListener("keydown",dn);window.removeEventListener("keyup",up);};
  },[]);

  const mkSlime=(x,side)=>({x,y:GH-GRND,vx:0,vy:0,side,isGrab:false,hasBall:false,goalTime:0,stuckCount:0,lastBallY:0});
  const mkBall=()=>({x:GW/2,y:150,vx:(Math.random()>.5?3:-3),vy:0,grabbedBy:null,grabAngle:0,grabAV:0});
  const initGs=useCallback(()=>{gsRef.current={left:mkSlime(200,1),right:mkSlime(600,2),ball:mkBall()};},[]);
  const resetPos=useCallback((as)=>{
    gsRef.current.left=mkSlime(200,1);gsRef.current.right=mkSlime(600,2);gsRef.current.ball=mkBall();
    if(as===1)gsRef.current.ball.vx=3;else if(as===2)gsRef.current.ball.vx=-3;
  },[]);
  const scoreRef=useRef({l:0,r:0});
  const addGoal=useCallback(side=>{if(side==='l')scoreRef.current.l++;else scoreRef.current.r++;setScoreState({...scoreRef.current});},[]);

  const aiUpdate=useCallback(()=>{
    const gs=gsRef.current,ai=gs.left,ball=gs.ball,rnd=Math.random();
    let tx=ai.x,dj=false,dg=false;
    const bH=GH-GRND-ball.y,dB=Math.abs(ai.x-ball.x),bTA=ball.vx<-1;
    if(!ai.lastBallY)ai.lastBallY=ball.y;
    const stk=Math.abs(ball.y-ai.lastBallY)<5&&Math.abs(ball.vx)<2;
    ai.stuckCount=stk?ai.stuckCount+1:0;ai.lastBallY=ball.y;
    if(ball.x>GW*.35&&!bTA){
      if(bH>60&&dB<150)tx=ball.x-45;else if(bH<30&&dB<100)tx=ball.x-20;else tx=ball.x-30+(rnd-.5)*20;
      if(dB<100){if(ai.stuckCount>30){dj=true;tx=ball.x-40;}else if(bH<35&&dB<60&&!ai.hasBall&&ball.vy>-2)dg=true;else if(bH>30&&bH<90)dj=true;}
    } else if(ball.x<GW*.65||bTA){
      tx=ball.x;if(ball.x<GWD*2.5&&bTA){tx=Math.max(ball.x-10,SR);if(dB<120&&bH<100)dj=true;}
      if(ai.stuckCount>20&&ball.x<GW*.3){dj=true;tx=ball.x+30;}
    } else tx=GW*.35+(rnd-.5)*80;
    ai.isGrab=dg;const diff=tx-ai.x;
    if(Math.abs(diff)>3)ai.vx=Math.sign(diff)*Math.min(Math.abs(diff)/50,1.5)*SPEED;else ai.vx=0;
    if(dj&&ai.vy===0&&!ai.isGrab)ai.vy=JUMP*(0.9+rnd*.2);
  },[]);

  const updateSlime=useCallback((sl,gL,gR,gJ,gG)=>{
    if(gL)sl.vx=Math.max(sl.vx-1.8,-SPEED);if(gR)sl.vx=Math.min(sl.vx+1.8,SPEED);
    if(!gL&&!gR)sl.vx*=.82;if(gJ&&sl.y>=GH-GRND-1&&!sl.isGrab)sl.vy=JUMP;
    sl.isGrab=gG;sl.vy+=GRAV;sl.x+=sl.vx;sl.y+=sl.vy;
    if(sl.y>=GH-GRND){sl.y=GH-GRND;sl.vy=0;}if(sl.y<SR){sl.y=SR;sl.vy=Math.abs(sl.vy)*.5;}
    sl.x=Math.max(SR,Math.min(GW-SR,sl.x));const N=GW/2;
    if(sl.side===1&&sl.x>N-SR)sl.x=N-SR;if(sl.side===2&&sl.x<N+SR)sl.x=N+SR;
    const inG=(sl.side===1&&sl.x<GWD)||(sl.side===2&&sl.x>GW-GWD);
    if(inG){sl.goalTime+=1/60;if(sl.goalTime>=1){if(sl.side===1)addGoal('r');else addGoal('l');resetPos(0);}}else sl.goalTime=0;
  },[addGoal,resetPos]);

  const slimeCollide=useCallback(()=>{
    const a=gsRef.current.left,b=gsRef.current.right,dx=b.x-a.x,dy=b.y-a.y,d=Math.sqrt(dx*dx+dy*dy),m=SR*2;
    if(d<m&&d>.1){const nx=dx/d,ny=dy/d,p=(m-d)/2;a.x-=nx*p;b.x+=nx*p;const dv=a.vx-b.vx,dot=dv*nx;if(dot>0){a.vx-=dot*nx;b.vx+=dot*nx;}}
  },[]);

  const updateBall=useCallback(()=>{
    const gs=gsRef.current,ball=gs.ball;
    if(ball.grabbedBy){
      const gr=ball.grabbedBy==='l'?gs.left:gs.right,sd=ball.grabbedBy==='l'?1:-1;
      ball.grabAV+=(-gr.vx*.008*sd);ball.grabAV*=.85;ball.grabAngle+=ball.grabAV;
      if(ball.grabbedBy==='l')ball.grabAngle=Math.max(-Math.PI/2,Math.min(Math.PI/2,ball.grabAngle));
      else{while(ball.grabAngle<0)ball.grabAngle+=Math.PI*2;while(ball.grabAngle>Math.PI*2)ball.grabAngle-=Math.PI*2;if(ball.grabAngle<Math.PI/2)ball.grabAngle=Math.PI/2;if(ball.grabAngle>3*Math.PI/2)ball.grabAngle=3*Math.PI/2;}
      const hd=SR+BR-5;ball.x=gr.x+Math.cos(ball.grabAngle)*hd;ball.y=gr.y+Math.sin(ball.grabAngle)*hd;ball.vx=gr.vx;ball.vy=gr.vy;
      if(!gr.isGrab){const rs=Math.abs(ball.grabAV)*20;ball.vx=gr.vx*1.5+Math.cos(ball.grabAngle)*(3+rs);ball.vy=gr.vy-2+Math.sin(ball.grabAngle)*rs*.5;const sp=Math.sqrt(ball.vx*ball.vx+ball.vy*ball.vy);if(sp>MAXSPD){ball.vx=ball.vx/sp*MAXSPD;ball.vy=ball.vy/sp*MAXSPD;}ball.grabbedBy=null;ball.grabAngle=0;ball.grabAV=0;gr.hasBall=false;}
      return;
    }
    ball.vy+=GRAV;ball.vx*=BDAMP;ball.x+=ball.vx;ball.y+=ball.vy;
    if(ball.x-BR<0){ball.x=BR;ball.vx=-ball.vx*BBOUNCE;}if(ball.x+BR>GW){ball.x=GW-BR;ball.vx=-ball.vx*BBOUNCE;}
    if(ball.y-BR<0){ball.y=BR;ball.vy=-ball.vy*BBOUNCE;}if(ball.y+BR>GH-GRND){ball.y=GH-GRND-BR;ball.vy=-ball.vy*BBOUNCE;ball.vx*=.93;}
    const N=GW/2,nT=GH-GRND-GHT*1.5;
    if(ball.x+BR>N-4&&ball.x-BR<N+4&&ball.y>nT){if(ball.x<N){ball.x=N-4-BR;ball.vx=-Math.abs(ball.vx)*BBOUNCE;}else{ball.x=N+4+BR;ball.vx=Math.abs(ball.vx)*BBOUNCE;}}
    if(ball.x-BR<=0&&ball.y>GH-GRND-GHT){addGoal('r');resetPos(2);return;}
    if(ball.x+BR>=GW&&ball.y>GH-GRND-GHT){addGoal('l');resetPos(1);return;}
    [gs.left,gs.right].forEach((sl,i)=>{
      const sn=i===0?'l':'r',other=i===0?gs.right:gs.left;
      const dx=ball.x-sl.x,dy=ball.y-sl.y,d=Math.sqrt(dx*dx+dy*dy);
      if(d<SR+BR){
        if(ball.grabbedBy&&ball.grabbedBy!==sn){const sp=Math.sqrt(sl.vx*sl.vx+sl.vy*sl.vy);if(sp>2||Math.abs(sl.vy)>5){const a=Math.atan2(dy,dx);ball.grabbedBy=null;ball.grabAngle=0;ball.grabAV=0;other.hasBall=false;ball.vx=Math.cos(a)*8+sl.vx;ball.vy=Math.sin(a)*8+sl.vy;const s2=Math.sqrt(ball.vx*ball.vx+ball.vy*ball.vy);if(s2>MAXSPD){ball.vx=ball.vx/s2*MAXSPD;ball.vy=ball.vy/s2*MAXSPD;}}}
        else if(sl.isGrab&&!ball.grabbedBy){ball.grabbedBy=sn;ball.grabAngle=Math.atan2(dy,dx);ball.grabAV=0;sl.hasBall=true;}
        else if(!ball.grabbedBy){const a=Math.atan2(dy,dx);if(ball.y<sl.y+5){ball.x=sl.x+Math.cos(a)*(SR+BR);ball.y=sl.y+Math.sin(a)*(SR+BR);const sp=Math.sqrt(ball.vx*ball.vx+ball.vy*ball.vy);ball.vx=Math.cos(a)*Math.max(sp,4)*1.4+sl.vx*.5;ball.vy=Math.sin(a)*Math.max(sp,4)*1.4+sl.vy*.5;const ns=Math.sqrt(ball.vx*ball.vx+ball.vy*ball.vy);if(ns>MAXSPD){ball.vx=ball.vx/ns*MAXSPD;ball.vy=ball.vy/ns*MAXSPD;}}}
      }
    });
  },[addGoal,resetPos]);

  const draw=useCallback(()=>{
    const cv=cvRef.current;if(!cv)return;
    const ctx=cv.getContext("2d"),gs=gsRef.current,s=v=>v*scaleX;
    ctx.fillStyle="#02080f";ctx.fillRect(0,0,cv.width,cv.height);
    // Grid
    ctx.strokeStyle="rgba(10,79,255,0.06)";ctx.lineWidth=.5;const gs2=s(40);
    for(let x=0;x<cv.width;x+=gs2){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,cv.height);ctx.stroke();}
    for(let y=0;y<cv.height;y+=gs2){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(cv.width,y);ctx.stroke();}
    // Center arc
    ctx.beginPath();ctx.arc(s(GW/2),s(GH-GRND),s(68),Math.PI,0);ctx.strokeStyle="rgba(255,100,0,0.16)";ctx.lineWidth=s(1.5);ctx.stroke();
    // Ground
    const gg=ctx.createLinearGradient(0,s(GH-GRND),0,s(GH));gg.addColorStop(0,"#071428");gg.addColorStop(1,"#030c1a");
    ctx.fillStyle=gg;ctx.fillRect(0,s(GH-GRND),s(GW),s(GRND));
    for(let i=0;i<10;i++){ctx.fillStyle=i%2?"rgba(10,79,255,0.05)":"rgba(255,100,0,0.025)";ctx.fillRect(i*s(GW/10),s(GH-GRND),s(GW/10),s(GRND));}
    const lg=ctx.createLinearGradient(0,0,s(GW),0);lg.addColorStop(0,"transparent");lg.addColorStop(.3,"rgba(255,100,0,0.65)");lg.addColorStop(.7,"rgba(10,79,255,0.45)");lg.addColorStop(1,"transparent");
    ctx.fillStyle=lg;ctx.fillRect(0,s(GH-GRND),s(GW),s(2));
    // Goals
    const dGoal=iL=>{
      const x0=iL?0:s(GW-GWD),gy=s(GH-GRND),nH=s(GHT),nW=s(GWD);
      ctx.fillStyle="rgba(10,79,255,0.04)";ctx.fillRect(x0,gy-nH,nW,nH);
      ctx.strokeStyle="rgba(10,79,255,0.15)";ctx.lineWidth=.6;
      for(let i=0;i<=nW;i+=s(10)){ctx.beginPath();ctx.moveTo(x0+i,gy-nH);ctx.lineTo(x0+i,gy);ctx.stroke();}
      for(let j=0;j<=nH;j+=s(10)){ctx.beginPath();ctx.moveTo(x0,gy-nH+j);ctx.lineTo(x0+nW,gy-nH+j);ctx.stroke();}
      const px=iL?x0+nW:x0;
      ctx.shadowColor="rgba(255,100,0,0.8)";ctx.shadowBlur=s(10);
      ctx.strokeStyle="rgba(255,100,0,0.9)";ctx.lineWidth=s(3);
      ctx.beginPath();ctx.moveTo(px,gy);ctx.lineTo(px,gy-nH);ctx.stroke();ctx.shadowBlur=0;
    };
    dGoal(true);dGoal(false);
    const nT=s(GH-GRND-GHT*1.5);
    ctx.shadowColor="rgba(255,100,0,0.9)";ctx.shadowBlur=s(14);
    ctx.fillStyle="#ff6400";ctx.fillRect(s(GW/2)-s(3.5),nT,s(7),s(GH-GRND)-nT);
    ctx.beginPath();ctx.arc(s(GW/2),nT,s(6),0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    // Heads
    const dHead=(sl,isBlue)=>{
      const x=s(sl.x),y=s(sl.y),r=s(SR);
      ctx.beginPath();ctx.ellipse(x,s(GH-GRND)+4,r*.55,4,0,0,Math.PI*2);ctx.fillStyle="rgba(0,0,0,0.4)";ctx.fill();
      const hc=isBlue?"#0a4fff":"#ff3355";
      ctx.shadowColor=isBlue?"rgba(10,79,255,0.75)":"rgba(255,51,85,0.75)";ctx.shadowBlur=s(16);
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=hc;ctx.fill();ctx.shadowBlur=0;
      ctx.beginPath();ctx.arc(x,y,r*.72,0,Math.PI*2);ctx.strokeStyle=isBlue?"rgba(100,160,255,0.28)":"rgba(255,120,140,0.28)";ctx.lineWidth=s(2.5);ctx.stroke();
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.strokeStyle=isBlue?"rgba(77,138,255,0.55)":"rgba(255,80,100,0.55)";ctx.lineWidth=s(1.5);ctx.stroke();
      ctx.beginPath();ctx.ellipse(x-r*.27,y-r*.27,r*.17,r*.1,-.5,0,Math.PI*2);ctx.fillStyle="rgba(255,255,255,0.26)";ctx.fill();
      const ball=gs.ball,ang=Math.atan2(s(ball.y)-y,s(ball.x)-x),eo=r*.3,er=r*.13,pr=r*.07;
      [ang+.55,ang-.55].forEach(a=>{
        const ex=x+Math.cos(a)*eo*1.1,ey=y+Math.sin(a)*eo*.85;
        ctx.beginPath();ctx.arc(ex,ey,er,0,Math.PI*2);ctx.fillStyle="white";ctx.fill();
        ctx.beginPath();ctx.arc(ex+Math.cos(ang)*pr*.5,ey+Math.sin(ang)*pr*.5,pr,0,Math.PI*2);ctx.fillStyle="#08111e";ctx.fill();
        ctx.beginPath();ctx.arc(ex-pr*.28,ey-pr*.38,pr*.32,0,Math.PI*2);ctx.fillStyle="rgba(255,255,255,0.65)";ctx.fill();
      });
      ctx.beginPath();ctx.arc(x,y+r*.36,r*.11,0,Math.PI,false);ctx.strokeStyle="rgba(0,0,0,0.55)";ctx.lineWidth=s(1.5);ctx.stroke();
      const sc2=isBlue?"#3d78ff":"#ff5570";
      for(let i=0;i<5;i++){const ha=-Math.PI/2+(i-2)*.38,rx=x+Math.cos(ha)*r,ry=y+Math.sin(ha)*r,tx2=x+Math.cos(ha)*(r+s(12)),ty=y+Math.sin(ha)*(r+s(12));ctx.beginPath();ctx.moveTo(rx-Math.sin(ha)*s(4),ry+Math.cos(ha)*s(4));ctx.lineTo(tx2,ty);ctx.lineTo(rx+Math.sin(ha)*s(4),ry-Math.cos(ha)*s(4));ctx.closePath();ctx.fillStyle=sc2;ctx.fill();}
      if(sl.isGrab){ctx.beginPath();ctx.arc(x,y,r+s(7),0,Math.PI*2);ctx.strokeStyle="rgba(255,215,0,0.8)";ctx.lineWidth=s(2.5);ctx.setLineDash([s(6),s(4)]);ctx.stroke();ctx.setLineDash([]);}
      ctx.fillStyle="rgba(255,255,255,0.5)";ctx.font=`700 ${s(10)}px 'Share Tech Mono',monospace`;ctx.textAlign="center";
      ctx.fillText(isBlue?(playerMode==="multi"?"P1":"AI"):"P2",x,y+r*.64);
    };
    dHead(gs.left,true);dHead(gs.right,false);
    // Ball
    const bx=s(gs.ball.x),by=s(gs.ball.y),br=s(BR);
    ctx.beginPath();ctx.ellipse(bx,s(GH-GRND)+3,br*.5,3,0,0,Math.PI*2);ctx.fillStyle="rgba(0,0,0,0.35)";ctx.fill();
    ctx.shadowColor="rgba(255,215,0,0.65)";ctx.shadowBlur=s(9);
    ctx.beginPath();ctx.arc(bx,by,br,0,Math.PI*2);ctx.fillStyle="#ffd700";ctx.fill();ctx.shadowBlur=0;
    ctx.strokeStyle="rgba(0,0,0,0.3)";ctx.lineWidth=.7;
    for(let i=0;i<5;i++){const a=(i/5)*Math.PI*2;ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx+Math.cos(a)*br,by+Math.sin(a)*br);ctx.stroke();}
    ctx.beginPath();ctx.arc(bx,by,br*.45,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(bx-br*.3,by-br*.3,br*.17,0,Math.PI*2);ctx.fillStyle="rgba(255,255,255,0.42)";ctx.fill();
    // Camping timers
    [gs.left,gs.right].forEach(sl=>{
      if(sl.goalTime>0){const p=sl.goalTime,bw=s(GWD),bx2=sl.side===1?0:s(GW-GWD);ctx.fillStyle="rgba(0,0,0,0.5)";ctx.fillRect(bx2,s(GH-GRND+6),bw,s(7));const tg=ctx.createLinearGradient(bx2,0,bx2+bw*p,0);tg.addColorStop(0,"#ff6400");tg.addColorStop(1,p>.5?"#ff3355":"#ffd700");ctx.fillStyle=tg;ctx.fillRect(bx2,s(GH-GRND+6),bw*p,s(7));}
    });
  },[scaleX,playerMode]);

  const loop=useCallback(()=>{
    if(!gameRunning.current)return;
    const K=keysRef.current,T=touchRef.current,gs=gsRef.current;
    if(playerMode==="multi"){updateSlime(gs.left,(K['a']||K['A']||T.l1),(K['d']||K['D']||T.r1),(K['w']||K['W']||T.j1),(K['s']||K['S'])||T.g1);updateSlime(gs.right,(K['ArrowLeft']||T.l2),(K['ArrowRight']||T.r2),(K['ArrowUp']||T.j2),(K['ArrowDown']||T.g2));}
    else{aiUpdate();updateSlime(gs.left,false,false,false,gs.left.isGrab);updateSlime(gs.right,(K['ArrowLeft']||T.l1),(K['ArrowRight']||T.r1),(K['ArrowUp']||T.j1),(K['ArrowDown']||T.g1));}
    slimeCollide();updateBall();draw();animRef.current=requestAnimationFrame(loop);
  },[playerMode,aiUpdate,updateSlime,slimeCollide,updateBall,draw]);

  const doStart=useCallback((dur)=>{
    scoreRef.current={l:0,r:0};setScoreState({l:0,r:0});setGameDur(dur);setTimeLeft(dur);initGs();setScreen("playing");gameRunning.current=true;
    if(animRef.current)cancelAnimationFrame(animRef.current);if(timerRef.current)clearInterval(timerRef.current);
    let t=dur;
    timerRef.current=setInterval(()=>{t--;setTimeLeft(t);if(t<=0){clearInterval(timerRef.current);gameRunning.current=false;cancelAnimationFrame(animRef.current);const sc=scoreRef.current;let w="DRAW";if(sc.l>sc.r)w="BLUE WINS";else if(sc.r>sc.l)w="RED WINS";setWinnerText(w);setFinalScore(`${sc.l} — ${sc.r}`);setScreen("winner");}},1000);
    setTimeout(()=>{if(animRef.current)cancelAnimationFrame(animRef.current);animRef.current=requestAnimationFrame(loop);},50);
  },[initGs,loop]);

  useEffect(()=>{if(screen==="playing"){if(animRef.current)cancelAnimationFrame(animRef.current);animRef.current=requestAnimationFrame(loop);}return()=>{if(animRef.current)cancelAnimationFrame(animRef.current);};},[screen,loop]);
  useEffect(()=>()=>{gameRunning.current=false;if(animRef.current)cancelAnimationFrame(animRef.current);if(timerRef.current)clearInterval(timerRef.current);},[]);

  const bindT=useCallback(k=>node=>{
    if(!node)return;const T=touchRef.current,dn=()=>T[k]=true,up=()=>T[k]=false;
    node.addEventListener("mousedown",dn);node.addEventListener("mouseup",up);node.addEventListener("mouseleave",up);
    node.addEventListener("touchstart",e=>{e.preventDefault();dn();},{passive:false});
    node.addEventListener("touchend",e=>{e.preventDefault();up();},{passive:false});
  },[]);

  const fmt=t=>`${String(Math.floor(t/60)).padStart(2,"0")}:${String(t%60).padStart(2,"0")}`;
  const pct=gameDur>0?timeLeft/gameDur:0;

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:"100%"}}>

      {screen==="menu"&&(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:26,padding:"36px 20px",textAlign:"center",animation:"slideUp .5s ease"}}>
          <div style={{display:"flex",gap:24,alignItems:"center",justifyContent:"center"}}>
            <RadarRing size={96} col="#0a4fff" delay={0}/>
            <div>
              <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,letterSpacing:"0.28em",color:C.muted,marginBottom:10}}>ARCADE · PHYSICS ENGINE</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontStyle:"italic",fontSize:36,
                background:"linear-gradient(120deg,#ff8c00,#ff4000,#ffd700)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
                backgroundSize:"200% auto",animation:"borderTrace 2.5s linear infinite"}}>HEAD SOCCER</div>
            </div>
            <RadarRing size={96} col="#ff3355" delay={1.5}/>
          </div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
            <button className="btn-blue" onClick={()=>{setPlayerMode("single");setScreen("modesel");}}>Single Player</button>
            <button className="btn-primary" onClick={()=>{setPlayerMode("multi");setScreen("modesel");}}>2 Players</button>
          </div>
          <div style={{padding:"14px 22px",borderRadius:3,border:"1px solid rgba(255,100,0,0.14)",background:"rgba(255,100,0,0.03)",
            fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:C.muted,lineHeight:2.2}}>
            <span style={{color:"#4d8aff"}}>SINGLE</span> &nbsp;·&nbsp; Arrow keys &nbsp;|&nbsp; Down = Grab<br/>
            <span style={{color:"#4d8aff"}}>P1</span> &nbsp;·&nbsp; WASD + S grab &nbsp;&nbsp;&nbsp; <span style={{color:"#ff6680"}}>P2</span> &nbsp;·&nbsp; Arrows + Down grab
          </div>
        </div>
      )}

      {screen==="modesel"&&(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:20,padding:"36px 20px",textAlign:"center",animation:"slideUp .4s ease"}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:26,letterSpacing:"0.12em",color:C.text}}>SELECT MATCH DURATION</div>
          <div style={{display:"flex",gap:14,alignItems:"center",fontFamily:"'Share Tech Mono',monospace",fontSize:13}}>
            <span style={{color:"#4d8aff",fontWeight:700}}>BLUE</span>
            <svg width="60" height="8"><line x1="0" y1="4" x2="60" y2="4" stroke="url(#lg1)" strokeWidth="1.5"/><defs><linearGradient id="lg1" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#4d8aff"/><stop offset="100%" stopColor="#ff3355"/></linearGradient></defs></svg>
            <span style={{color:"#ff6680",fontWeight:700}}>RED</span>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}>
            {[[60,"1 MIN"],[120,"2 MIN"],[240,"4 MIN"],[480,"8 MIN"],[300,"WORLD CUP"]].map(([t,l])=>(
              <button key={t} className="btn-primary" onClick={()=>doStart(t)}>{l}</button>
            ))}
          </div>
          <button className="btn-ghost" onClick={()=>setScreen("menu")}>← BACK</button>
        </div>
      )}

      {screen==="playing"&&(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:"100%"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",maxWidth:800,padding:"8px 16px",
            background:"rgba(2,8,16,0.97)",borderRadius:"4px 4px 0 0",border:`1px solid ${C.border}`,borderBottom:"none",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,#ff6400,#0a4fff,transparent)"}}/>
            <div>
              <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:8,letterSpacing:"0.2em",color:C.muted}}>BLUE</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:38,color:"#4d8aff",lineHeight:1,textShadow:"0 0 22px rgba(10,79,255,0.85)"}}>{scoreState.l}</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:22,fontWeight:700,color:C.yellow,letterSpacing:5,textShadow:"0 0 18px rgba(255,215,0,0.65)"}}>{fmt(timeLeft)}</div>
              <div style={{width:150,height:3,background:"rgba(255,255,255,0.06)",borderRadius:2,marginTop:5,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${pct*100}%`,background:"linear-gradient(90deg,#0a4fff,#ff6400)",transition:"width 1s linear"}}/>
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:8,letterSpacing:"0.2em",color:C.muted}}>RED</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:38,color:"#ff3355",lineHeight:1,textShadow:"0 0 22px rgba(255,51,85,0.85)"}}>{scoreState.r}</div>
            </div>
          </div>
          <canvas ref={cvRef} width={cvW} height={cvH} style={{border:`1px solid ${C.border}`,borderTop:"none",borderRadius:"0 0 4px 4px",display:"block"}}/>
          <div style={{display:"flex",justifyContent:"space-between",width:"100%",maxWidth:800,padding:"8px 0 0",gap:8}}>
            <div style={{display:"flex",gap:5}}>
              <div ref={bindT("l1")} className="tb">◀</div><div ref={bindT("j1")} className="tb">▲</div>
              <div ref={bindT("r1")} className="tb">▶</div>
              <div ref={bindT("g1")} className="tb" style={{color:C.yellow,borderColor:"rgba(255,215,0,0.35)"}}>G</div>
            </div>
            {playerMode==="multi"&&(
              <div style={{display:"flex",gap:5}}>
                <div ref={bindT("g2")} className="tb" style={{color:C.yellow,borderColor:"rgba(255,215,0,0.35)"}}>G</div>
                <div ref={bindT("l2")} className="tb">◀</div><div ref={bindT("j2")} className="tb">▲</div><div ref={bindT("r2")} className="tb">▶</div>
              </div>
            )}
          </div>
        </div>
      )}

      {screen==="winner"&&(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:22,padding:"44px 20px",textAlign:"center",animation:"popIn .5s cubic-bezier(0.22,1,0.36,1)"}}>
          <svg width="72" height="72" viewBox="0 0 72 72">
            <path d="M36 4 L64 14 L64 38 C64 52 52 64 36 68 C20 64 8 52 8 38 L8 14 Z" fill="none" stroke="#ff6400" strokeWidth="1.5"/>
            <path d="M36 12 L56 20 L56 38 C56 49 47 58 36 62 C25 58 16 49 16 38 L16 20 Z" fill="rgba(255,100,0,0.08)" stroke="rgba(255,100,0,0.3)" strokeWidth="1"/>
            <circle cx="36" cy="36" r="12" fill="rgba(255,215,0,0.12)" stroke="#ffd700" strokeWidth="1.5"/>
            <path d="M29 36 L34 41 L43 30" fill="none" stroke="#ffd700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontStyle:"italic",fontSize:52,lineHeight:1,
            background:winnerText==="BLUE WINS"?"linear-gradient(135deg,#4d8aff,#00d4ff)":winnerText==="RED WINS"?"linear-gradient(135deg,#ff3355,#ff8c00)":"linear-gradient(135deg,#ff6400,#ffd700)",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
            {winnerText}
          </div>
          <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:44,fontWeight:700,color:C.text,letterSpacing:10,textShadow:"0 0 30px rgba(255,100,0,0.5)"}}>{finalScore}</div>
          <div style={{display:"flex",gap:12,marginTop:4}}>
            <button className="btn-primary" onClick={()=>{
              scoreRef.current={l:0,r:0};setScoreState({l:0,r:0});initGs();setScreen("playing");gameRunning.current=true;
              if(timerRef.current)clearInterval(timerRef.current);let t=gameDur;setTimeLeft(t);
              timerRef.current=setInterval(()=>{t--;setTimeLeft(t);if(t<=0){clearInterval(timerRef.current);gameRunning.current=false;cancelAnimationFrame(animRef.current);const sc=scoreRef.current;let w="DRAW";if(sc.l>sc.r)w="BLUE WINS";else if(sc.r>sc.l)w="RED WINS";setWinnerText(w);setFinalScore(`${sc.l} — ${sc.r}`);setScreen("winner");}},1000);
              setTimeout(()=>{if(animRef.current)cancelAnimationFrame(animRef.current);animRef.current=requestAnimationFrame(loop);},50);
            }}>PLAY AGAIN</button>
            <button className="btn-ghost" onClick={()=>{gameRunning.current=false;setScreen("menu");}}>MAIN MENU</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════
   PAGE
   ══════════════════════════════════ */
export default function MiniGamesPage() {
  return (
    <>
      <style>{CSS}</style>
      <BgCanvas/>

      {/* Ambient glow orbs */}
      <div style={{position:"fixed",top:"8%",left:"4%",width:480,height:480,borderRadius:"50%",
        background:"radial-gradient(circle,rgba(10,79,255,0.07) 0%,transparent 70%)",
        animation:"orbFloat 9s ease-in-out infinite",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",bottom:"12%",right:"6%",width:440,height:440,borderRadius:"50%",
        background:"radial-gradient(circle,rgba(255,100,0,0.08) 0%,transparent 70%)",
        animation:"orbFloat 11s ease-in-out infinite",animationDelay:"2s",pointerEvents:"none",zIndex:0}}/>

      {/* Horizontal scan line */}
      <div style={{position:"fixed",top:0,left:0,width:"100vw",height:1,
        background:"linear-gradient(90deg,transparent,rgba(255,100,0,0.2),transparent)",
        animation:"scanV 9s linear infinite",pointerEvents:"none",zIndex:1}}/>

      <div style={{position:"relative",zIndex:2,minHeight:"100vh",fontFamily:"'Exo 2',sans-serif",paddingBottom:80}}>

        {/* Nav */}
        <nav style={{position:"sticky",top:0,zIndex:20,height:52,
          borderBottom:"1px solid rgba(255,100,0,0.13)",
          background:"rgba(2,8,16,0.94)",backdropFilter:"blur(18px)",
          padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            {/* Hex logo mark */}
            <svg width="26" height="26" viewBox="0 0 26 26">
              <polygon points="13,1 24,7 24,19 13,25 2,19 2,7" fill="none" stroke="#ff6400" strokeWidth="1.4"/>
              <polygon points="13,5 20,9 20,17 13,21 6,17 6,9" fill="rgba(255,100,0,0.1)" stroke="rgba(255,100,0,0.25)" strokeWidth=".7"/>
              <circle cx="13" cy="13" r="2.5" fill="#ff6400"/>
            </svg>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:17,
              letterSpacing:"0.16em",color:C.text}}>GAMES</span>
            <div style={{width:1,height:18,background:"rgba(255,100,0,0.22)"}}/>
            <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,letterSpacing:"0.22em",color:C.muted}}>HEAD SOCCER</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{position:"relative",width:8,height:8}}>
              <div style={{position:"absolute",inset:0,borderRadius:"50%",background:"#ff6400",animation:"pulseRing 1.6s ease-out infinite"}}/>
              <div style={{position:"absolute",inset:0,borderRadius:"50%",background:"#ff6400"}}/>
            </div>
            <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,letterSpacing:"0.2em",color:"#ff6400"}}>LIVE</span>
          </div>
        </nav>

        <div style={{maxWidth:920,margin:"0 auto",padding:"0 20px"}}>

          {/* Hero */}
          <div style={{padding:"48px 0 32px",animation:"slideUp .6s ease",position:"relative"}}>
            {/* Corner brackets */}
            <svg width="60" height="60" viewBox="0 0 60 60" style={{position:"absolute",top:48,left:0,opacity:.45}}>
              <path d="M0 0 L32 0 L32 2 L2 2 L2 32 L0 32 Z" fill="#ff6400"/>
              <circle cx="32" cy="2" r="2" fill="#ff6400" opacity=".5"/>
            </svg>
            <svg width="60" height="60" viewBox="0 0 60 60" style={{position:"absolute",top:48,right:0,opacity:.45}}>
              <path d="M60 0 L28 0 L28 2 L58 2 L58 32 L60 32 Z" fill="#ff6400"/>
              <circle cx="28" cy="2" r="2" fill="#ff6400" opacity=".5"/>
            </svg>
            <div style={{paddingLeft:16}}>
              <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,letterSpacing:"0.28em",color:"#ff6400",marginBottom:14,animation:"slideRight .5s ease .1s both"}}>
                // ARCADE · PHYSICS ENGINE · V2.0
              </div>
              <div style={{animation:"slideRight .5s ease .15s both"}}>
                <HeroTitle/>
              </div>
              <p style={{fontFamily:"'Exo 2',sans-serif",fontSize:14,color:C.muted,marginTop:18,maxWidth:480,lineHeight:1.75,animation:"slideRight .5s ease .2s both"}}>
                Physics-based arcade soccer with grab mechanics. Build momentum, time your throws, and outmaneuver your opponent.
              </p>
              <div style={{display:"flex",gap:14,marginTop:22,flexWrap:"wrap",animation:"slideRight .5s ease .25s both"}}>
                <Stat label="Max Speed" val="13" col="#ff6400"/>
                <Stat label="Gravity" val="0.6" col="#4d8aff"/>
                <Stat label="Players" val="1-2" col="#ffd700"/>
                <Stat label="Modes" val="5" col="#ff3355"/>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{height:1,background:"linear-gradient(90deg,transparent,rgba(255,100,0,0.45),rgba(10,79,255,0.3),transparent)",marginBottom:24}}/>

          {/* Game card */}
          <div className="card" style={{padding:20,animation:"slideUp .6s ease .15s both",
            boxShadow:"0 0 90px rgba(255,100,0,0.07),0 0 180px rgba(10,79,255,0.04),inset 0 0 60px rgba(0,0,0,0.3)"}}>
            <HeadSoccerGame/>
          </div>

          {/* How to play */}
          <div style={{marginTop:28,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(195px,1fr))",gap:12,animation:"slideUp .6s ease .25s both"}}>
            {[
              {num:"01",title:"MOVE",desc:"Arrow keys left and right to sprint across the field",col:"#4d8aff"},
              {num:"02",title:"JUMP",desc:"Press Up to leap — time aerial contacts to head the ball",col:"#ff6400"},
              {num:"03",title:"GRAB",desc:"Hold Down when near the ball to grab and carry it",col:"#ffd700"},
              {num:"04",title:"THROW",desc:"Sprint while holding, release Down to launch with power",col:"#ff3355"},
            ].map(t=>(
              <div key={t.num} className="card" style={{padding:"15px 17px",position:"relative"}}>
                <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:t.col,letterSpacing:"0.22em",marginBottom:7,opacity:.65}}>{t.num}</div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:15,letterSpacing:"0.1em",color:C.text,marginBottom:6}}>{t.title}</div>
                <div style={{fontSize:12,color:C.muted,lineHeight:1.65,fontFamily:"'Exo 2',sans-serif"}}>{t.desc}</div>
                <div style={{position:"absolute",bottom:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${t.col}55,transparent)`,opacity:.55}}/>
              </div>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}