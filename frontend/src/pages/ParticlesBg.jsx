import { useEffect, useRef } from "react";

/*
  ParticlesBg — football-themed animated background for StatinSite

  Usage:
    <ParticlesBg />                          default: xg heatmap
    <ParticlesBg mode="pass" />              pass network
    <ParticlesBg mode="radar" />             player radar
    <ParticlesBg mode="ticker" />            live ticker feed
    <ParticlesBg mode="xg" speed={0.5} />   xg with slower speed

  Props:
    mode       "xg" | "pass" | "radar" | "ticker"   default "xg"
    speed      number  1–10    default 4
    density    number  1–10    default 5
    gridLines  boolean         default true  (grid overlay matching LiveBg)
*/
export default function ParticlesBg({
  mode     = "xg",
  speed    = 4,
  density  = 5,
  gridLines = true,
}) {
  const canvasRef = useRef(null);
  const state = useRef({
    xgBlobs: [], passPts: [], passLinks: [], radarPts: [], tickerData: [],
    mx: -1, my: -1, raf: null, W: 0, H: 0,
  });

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const cx = cv.getContext("2d");
    const s = state.current;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      s.W = window.innerWidth;
      s.H = window.innerHeight;
      cv.width  = s.W * dpr;
      cv.height = s.H * dpr;
      cv.style.width  = s.W + "px";
      cv.style.height = s.H + "px";
      cx.scale(dpr, dpr);
    }

    const GRASS = "#0a1a0d";
    const LINE  = "rgba(255,255,255,0.15)";

    function drawPitch() {
      const { W, H } = s;
      cx.fillStyle = GRASS;
      cx.fillRect(0, 0, W, H);
      const px = W * 0.06, py = H * 0.08;
      const pw = W - px * 2, ph = H - py * 2;
      cx.strokeStyle = LINE;
      cx.lineWidth = 1;
      cx.strokeRect(px, py, pw, ph);
      cx.beginPath();
      cx.moveTo(px + pw / 2, py);
      cx.lineTo(px + pw / 2, py + ph);
      cx.stroke();
      cx.beginPath();
      cx.arc(px + pw / 2, py + ph / 2, ph * 0.22, 0, Math.PI * 2);
      cx.stroke();
      cx.beginPath();
      cx.arc(px + pw / 2, py + ph / 2, 3, 0, Math.PI * 2);
      cx.fillStyle = LINE; cx.fill();
      const bw = pw * 0.16, bh = ph * 0.36;
      const gw = pw * 0.055, gh = ph * 0.18;
      cx.strokeRect(px, py + ph / 2 - bh / 2, bw, bh);
      cx.strokeRect(px + pw - bw, py + ph / 2 - bh / 2, bw, bh);
      cx.strokeRect(px, py + ph / 2 - gh / 2, gw, gh);
      cx.strokeRect(px + pw - gw, py + ph / 2 - gh / 2, gw, gh);
      const pr = ph * 0.08;
      cx.beginPath();
      cx.arc(px + bw * 0.68, py + ph / 2, pr, Math.PI * 0.65, Math.PI * 1.35, true);
      cx.stroke();
      cx.beginPath();
      cx.arc(px + pw - bw * 0.68, py + ph / 2, pr, Math.PI * 1.65, -Math.PI * 0.35, true);
      cx.stroke();
      [
        [px, py], [px + pw, py], [px, py + ph], [px + pw, py + ph]
      ].forEach(([cx2, cy2]) => {
        cx.beginPath();
        const a = cx2 === px ? 0 : Math.PI;
        const b = cy2 === py ? Math.PI / 2 : -Math.PI / 2;
        cx.arc(cx2, cy2, ph * 0.05, Math.min(a, b), Math.max(a, b));
        cx.stroke();
      });
    }

    function px(n) { return s.W * 0.06 + n * (s.W * 0.88); }
    function py(n) { return s.H * 0.08 + n * (s.H * 0.84); }

    function initXG() {
      const zones = [
        [0.12,0.5,0.06,1.8],[0.22,0.38,0.08,1.2],[0.22,0.62,0.08,1.2],
        [0.08,0.5,0.04,2.5],[0.18,0.5,0.06,1.4],[0.3,0.45,0.07,0.8],
        [0.3,0.55,0.07,0.8],[0.85,0.5,0.05,0.4],[0.78,0.4,0.06,0.5],
        [0.78,0.6,0.06,0.5],[0.65,0.5,0.07,0.3],[0.5,0.5,0.09,0.2],
      ];
      const n = 8 + density * 3;
      s.xgBlobs = Array.from({ length: n }, (_, i) => {
        const z = zones[i % zones.length];
        return {
          nx: Math.max(0.02, Math.min(0.98, z[0] + (Math.random() - 0.5) * z[2])),
          ny: Math.max(0.05, Math.min(0.95, z[1] + (Math.random() - 0.5) * z[2])),
          r:  (8 + Math.random() * 28) * ((density + 2) / 7),
          xg: z[3] * (0.4 + Math.random() * 0.8),
          phase: Math.random() * Math.PI * 2,
          pulse: 0.004 + Math.random() * 0.008,
        };
      });
    }

    function drawXG(t) {
      drawPitch();
      for (const b of s.xgBlobs) {
        const x = px(b.nx), y = py(b.ny);
        const heat = Math.min(b.xg / 2.5, 1);
        const r2 = b.r * (0.85 + Math.sin(t * b.pulse * speed * 0.25 + b.phase) * 0.15);
        const red = Math.round(heat > 0.5 ? 255 : heat * 2 * 255);
        const grn = Math.round(heat < 0.5 ? heat * 2 * 180 : 180 - (heat - 0.5) * 2 * 180);
        const al  = 0.10 + heat * 0.28;
        cx.beginPath();
        cx.arc(x, y, r2 * 2.2, 0, Math.PI * 2);
        cx.fillStyle = `rgba(${red},${grn},30,${al * 0.4})`;
        cx.fill();
        cx.beginPath();
        cx.arc(x, y, r2, 0, Math.PI * 2);
        cx.fillStyle = `rgba(${red},${grn},30,${al})`;
        cx.fill();
        cx.beginPath();
        cx.arc(x, y, r2 * 0.35, 0, Math.PI * 2);
        cx.fillStyle = `rgba(255,255,255,${0.12 + heat * 0.18})`;
        cx.fill();
      }
    }

    function initPass() {
      const positions = [
        [0.5,0.92],[0.18,0.72],[0.38,0.72],[0.62,0.72],[0.82,0.72],
        [0.12,0.52],[0.32,0.48],[0.5,0.52],[0.68,0.48],[0.88,0.52],
        [0.28,0.28],[0.5,0.22],[0.72,0.28],[0.5,0.38],
      ];
      const n = Math.min(6 + Math.round(density * 1.4), positions.length);
      s.passPts = positions.slice(0, n).map(p => ({
        nx: p[0], ny: p[1],
        vx: (Math.random() - 0.5) * 0.0003,
        vy: (Math.random() - 0.5) * 0.0003,
        passes: Math.floor(20 + Math.random() * 60),
      }));
      s.passLinks = [];
      for (let i = 0; i < s.passPts.length; i++) {
        const k = 2 + Math.floor(Math.random() * 3);
        for (let j = 0; j < k; j++) {
          const t2 = Math.floor(Math.random() * s.passPts.length);
          if (t2 !== i) s.passLinks.push({ a: i, b: t2, w: 0.3 + Math.random() * 0.7, progress: Math.random(), active: Math.random() < 0.3 });
        }
      }
    }

    function drawPass() {
      drawPitch();
      for (const l of s.passLinks) {
        const a = s.passPts[l.a], b = s.passPts[l.b];
        const ax2 = px(a.nx), ay2 = py(a.ny);
        const bx2 = px(b.nx), by2 = py(b.ny);
        cx.beginPath();
        cx.moveTo(ax2, ay2);
        cx.lineTo(bx2, by2);
        cx.strokeStyle = `rgba(96,165,250,${0.06 + l.w * 0.12})`;
        cx.lineWidth = l.w * 1.8;
        cx.stroke();
        if (l.active) {
          l.progress = (l.progress + 0.004 * speed) % 1;
          const lpx = ax2 + (bx2 - ax2) * l.progress;
          const lpy = ay2 + (by2 - ay2) * l.progress;
          cx.beginPath();
          cx.arc(lpx, lpy, 2.5, 0, Math.PI * 2);
          cx.fillStyle = "rgba(255,255,255,0.85)";
          cx.fill();
        }
      }
      for (const p of s.passPts) {
        p.nx = Math.max(0.05, Math.min(0.95, p.nx + p.vx * speed));
        p.ny = Math.max(0.08, Math.min(0.92, p.ny + p.vy * speed));
        const x2 = px(p.nx), y2 = py(p.ny);
        const sc = Math.min(1, p.passes / 80);
        cx.beginPath();
        cx.arc(x2, y2, 5 + sc * 9, 0, Math.PI * 2);
        cx.fillStyle = `rgba(59,130,246,${0.18 + sc * 0.35})`;
        cx.fill();
        cx.beginPath();
        cx.arc(x2, y2, 5 + sc * 9, 0, Math.PI * 2);
        cx.strokeStyle = "rgba(147,197,253,0.5)";
        cx.lineWidth = 1.2;
        cx.stroke();
        cx.beginPath();
        cx.arc(x2, y2, 3, 0, Math.PI * 2);
        cx.fillStyle = "rgba(255,255,255,0.9)";
        cx.fill();
      }
    }

    function initRadar() {
      const attrs = ["Pace", "Shot", "Pass", "Dribble", "Defence", "Physical"];
      s.radarPts = attrs.map((a, i) => ({
        label: a,
        vals:  [0.45 + Math.random() * 0.5, 0.35 + Math.random() * 0.55],
        angle: (i / attrs.length) * Math.PI * 2 - Math.PI / 2,
      }));
    }

    function drawRadar(t) {
      const { W, H } = s;
      cx.fillStyle = GRASS;
      cx.fillRect(0, 0, W, H);
      const cx2 = W / 2, cy2 = H / 2, maxR = Math.min(W, H) * 0.33;
      for (let ring = 1; ring <= 5; ring++) {
        const r2 = maxR * ring / 5;
        cx.beginPath();
        for (let i = 0; i < s.radarPts.length; i++) {
          const x2 = cx2 + Math.cos(s.radarPts[i].angle) * r2;
          const y2 = cy2 + Math.sin(s.radarPts[i].angle) * r2;
          i === 0 ? cx.moveTo(x2, y2) : cx.lineTo(x2, y2);
        }
        cx.closePath();
        cx.strokeStyle = "rgba(255,255,255,0.07)";
        cx.lineWidth = 0.8;
        cx.stroke();
      }
      for (const p of s.radarPts) {
        cx.beginPath();
        cx.moveTo(cx2, cy2);
        cx.lineTo(cx2 + Math.cos(p.angle) * maxR, cy2 + Math.sin(p.angle) * maxR);
        cx.strokeStyle = "rgba(255,255,255,0.07)";
        cx.lineWidth = 0.8;
        cx.stroke();
      }
      const cols = ["rgba(59,130,246,", "rgba(239,68,68,"];
      for (let pl = 0; pl < 2; pl++) {
        const pulse = 0.97 + Math.sin(t * 0.0015 * (pl + 1) * speed * 0.3) * 0.03;
        cx.beginPath();
        for (let i = 0; i < s.radarPts.length; i++) {
          const r2 = maxR * s.radarPts[i].vals[pl] * pulse;
          const x2 = cx2 + Math.cos(s.radarPts[i].angle) * r2;
          const y2 = cy2 + Math.sin(s.radarPts[i].angle) * r2;
          i === 0 ? cx.moveTo(x2, y2) : cx.lineTo(x2, y2);
        }
        cx.closePath();
        cx.fillStyle   = cols[pl] + (pl === 0 ? "0.12" : "0.10") + ")";
        cx.fill();
        cx.strokeStyle = cols[pl] + "0.7)";
        cx.lineWidth   = 1.5;
        cx.stroke();
        for (let i = 0; i < s.radarPts.length; i++) {
          const r2 = maxR * s.radarPts[i].vals[pl] * pulse;
          cx.beginPath();
          cx.arc(cx2 + Math.cos(s.radarPts[i].angle) * r2, cy2 + Math.sin(s.radarPts[i].angle) * r2, 3.5, 0, Math.PI * 2);
          cx.fillStyle = cols[pl] + "0.9)";
          cx.fill();
        }
      }
      cx.font = "bold 11px monospace";
      cx.textAlign = "center";
      for (const p of s.radarPts) {
        cx.fillStyle = "rgba(255,255,255,0.45)";
        cx.fillText(p.label.toUpperCase(), cx2 + Math.cos(p.angle) * (maxR + 22), cy2 + Math.sin(p.angle) * (maxR + 22) + 4);
      }
      cx.textAlign = "left";
    }

    const TICKER_EVENTS = [
      { t:"1H",  m:3,  txt:"Shot on target · Salah",     c:"rgba(52,211,153,0.9)"  },
      { t:"1H",  m:11, txt:"Yellow card · Casemiro",     c:"rgba(251,191,36,0.9)"  },
      { t:"1H",  m:18, txt:"GOAL · Haaland (pen)",        c:"rgba(74,222,128,1)"    },
      { t:"1H",  m:27, txt:"Corner · Man City",           c:"rgba(148,163,184,0.7)" },
      { t:"1H",  m:34, txt:"Substitution · Foden off",   c:"rgba(96,165,250,0.9)"  },
      { t:"1H",  m:41, txt:"GOAL · Salah (assist Diaz)",  c:"rgba(74,222,128,1)"    },
      { t:"HT",  m:45, txt:"Half time · 1 – 1",           c:"rgba(255,255,255,0.5)" },
      { t:"2H",  m:52, txt:"Red card · Rúben Dias",       c:"rgba(239,68,68,0.95)"  },
      { t:"2H",  m:61, txt:"GOAL · Salah (free kick)",    c:"rgba(74,222,128,1)"    },
      { t:"2H",  m:73, txt:"xG: 2.31 – 1.04",             c:"rgba(167,139,250,0.9)" },
      { t:"2H",  m:79, txt:"Shot blocked · Gvardiol",    c:"rgba(148,163,184,0.7)" },
      { t:"2H",  m:88, txt:"GOAL · Haaland (header)",     c:"rgba(74,222,128,1)"    },
      { t:"FT",  m:90, txt:"Full time · 2 – 2",           c:"rgba(255,255,255,0.55)"},
    ];

    function initTicker() {
      const n = Math.min(TICKER_EVENTS.length, 5 + density);
      s.tickerData = Array.from({ length: n }, (_, i) => ({
        ...TICKER_EVENTS[i % TICKER_EVENTS.length],
        y: s.H * (0.1 + i * 0.075),
        vy: -0.12 * speed,
      }));
    }

    function drawTicker() {
      const { W, H } = s;
      cx.fillStyle = "#060d0f";
      cx.fillRect(0, 0, W, H);
      const barH = 28;
      for (const e of s.tickerData) {
        e.vy = -0.12 * speed;
        e.y += e.vy;
        if (e.y < -barH) e.y = H + barH;
        const alpha = Math.min(1, Math.min(e.y / 40, (H - e.y) / 60));
        if (alpha <= 0) continue;
        cx.fillStyle = `rgba(255,255,255,${0.03 * alpha})`;
        cx.fillRect(W * 0.04, e.y - barH / 2, W * 0.92, barH - 2);
        cx.font = "bold 10px monospace";
        cx.fillStyle = `rgba(255,255,255,${0.22 * alpha})`;
        cx.fillText(e.t, W * 0.055, e.y + 4);
        cx.fillStyle = e.c.replace(/[\d.]+\)$/, `${alpha})`);
        cx.fillText(e.m + "'", W * 0.12, e.y + 4);
        cx.font = "13px monospace";
        cx.fillStyle = `rgba(255,255,255,${0.65 * alpha})`;
        cx.fillText(e.txt, W * 0.19, e.y + 4);
        cx.fillStyle = e.c.replace(/[\d.]+\)$/, `${0.7 * alpha})`);
        cx.fillRect(W * 0.04, e.y - barH / 2, 3, barH - 2);
      }
    }

    function init() {
      initXG(); initPass(); initRadar(); initTicker();
    }

    function loop(ts) {
      if      (mode === "xg")     drawXG(ts);
      else if (mode === "pass")   drawPass();
      else if (mode === "radar")  drawRadar(ts);
      else if (mode === "ticker") drawTicker();
      s.raf = requestAnimationFrame(loop);
    }

    function onMove(e) { s.mx = e.clientX; s.my = e.clientY; }
    function onLeave()  { s.mx = -1; s.my = -1; }

    resize();
    init();
    s.raf = requestAnimationFrame(loop);
    window.addEventListener("resize",    resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(s.raf);
      window.removeEventListener("resize",    resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, [mode, speed, density]);

  return (
    <div
      aria-hidden="true"
      className="sn-fixed-bg"
      style={{
        position: "fixed", inset: 0,
        pointerEvents: "none", zIndex: 0,
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0 }}
      />
      {gridLines && (
        <>
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px)",
            backgroundSize: "44px 44px",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "linear-gradient(rgba(255,255,255,.036) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.036) 1px,transparent 1px)",
            backgroundSize: "176px 176px",
          }} />
        </>
      )}
    </div>
  );
}