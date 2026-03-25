// pages/LeaguePage.jsx — StatinSite · Neobrutalist Edition
// Design: #0a0a0a black · #e8ff47 yellow · #ff2744 red
// All data fetching, caching, tabs, sub-components — 100% preserved.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getFixtures,
  getStandings,
  getLeaguePredictions,
  getSeasonSimulation,
} from "../api/api";
import FixturesTable   from "../components/FixturesTable";
import StandingsTable  from "../components/StandingsTable";
import PredictionTable from "../components/PredictionTable";
import SimulationTable from "../components/SimulationTable";
import SectionTabs     from "../components/SectionTabs";

const Y = "#e8ff47";
const K = "#0a0a0a";
const R = "#ff2744";

const PRETTY = {
  epl:    "Premier League",
  laliga: "La Liga",
  seriea: "Serie A",
  ligue1: "Ligue 1",
};

const LEAGUE_COLOR = {
  epl:    Y,
  laliga: "#ff6600",
  seriea: "#00d4aa",
  ligue1: "#b388ff",
  bundesliga: "#ffcc00",
};

export default function LeaguePage({ league }) {
  const [fixtures,    setFixtures]    = useState([]);
  const [table,       setTable]       = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [simulation,  setSimulation]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [activeTab,   setActiveTab]   = useState("Predictions");
  const navigate = useNavigate();

  const accent = LEAGUE_COLOR[league] || Y;

  useEffect(() => {
    setLoading(true);
    setError(null);

    function fromCache(key) {
      try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts < 3_600_000) return data;
      } catch (_) {}
      return null;
    }
    function toCache(key, data) {
      try { sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch (_) {}
    }
    async function cached(key, fn) {
      const hit = fromCache(key);
      if (hit !== null) return { status: "fulfilled", value: hit };
      try {
        const value = await fn();
        toCache(key, value);
        return { status: "fulfilled", value };
      } catch (e) {
        return { status: "rejected", reason: e };
      }
    }

    async function load() {
      const [standingsRes, predictionRes, fixtureRes, simulationRes] = await Promise.all([
        cached(`lp_standings_${league}`,   () => getStandings(league)),
        cached(`lp_predictions_${league}`, () => getLeaguePredictions(league)),
        cached(`lp_fixtures_${league}`,    () => getFixtures(league)),
        cached(`lp_simulation_${league}`,  () => getSeasonSimulation(league)),
      ]);
      if (fixtureRes.status   === "fulfilled") setFixtures(fixtureRes.value.response || []);
      if (standingsRes.status === "fulfilled") {
        const d = standingsRes.value;
        if (Array.isArray(d.standings))              setTable(d.standings);
        else if (d.response?.[0]?.league?.standings?.[0]) setTable(d.response[0].league.standings[0]);
        else                                         setTable([]);
      }
      if (predictionRes.status === "fulfilled") setPredictions(predictionRes.value.predictions || predictionRes.value || []);
      if (simulationRes.status === "fulfilled") setSimulation(simulationRes.value.results || []);
      setLoading(false);
    }
    load();
  }, [league]);

  const prettyName = PRETTY[league] || league.toUpperCase();

  return (
    <div style={{ background:K, minHeight:"100vh", fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", position:"relative" }}>
      <style>{`
        @keyframes nb-stripes { to{background-position:60px 0} }
        @keyframes nb-spin { to{transform:rotate(360deg)} }
      `}</style>

      {/* Animated bg stripes */}
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",background:"repeating-linear-gradient(92deg,transparent 0,transparent 44px,rgba(232,255,71,.02) 44px,rgba(232,255,71,.02) 45px)",animation:"nb-stripes 25s linear infinite"}}/>

      <div style={{ maxWidth:1280, margin:"0 auto", padding:"0 20px 60px", position:"relative", zIndex:1 }}>

        {/* ── Page header ── */}
        <div style={{ padding:"32px 0 20px", borderBottom:`4px solid ${accent}`, marginBottom:24 }}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:accent,color:K,padding:"3px 12px",fontFamily:"'DM Mono',monospace",fontSize:8,letterSpacing:".2em",textTransform:"uppercase",marginBottom:14}}>
            <span style={{width:5,height:5,background:K,flexShrink:0}}/>
            SEASON 2025/26 · {prettyName}
          </div>
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
            <h1 style={{ margin:0, fontSize:"clamp(44px,7vw,88px)", fontWeight:900, color:accent, fontFamily:"'Bebas Neue',sans-serif", letterSpacing:".04em", lineHeight:.9 }}>
              {prettyName}
            </h1>
            <button
              onClick={() => navigate("/")}
              style={{
                padding:"9px 22px", background:"transparent",
                border:`2px solid rgba(232,255,71,.25)`, color:"rgba(232,255,71,.5)",
                fontSize:10, fontWeight:900, letterSpacing:".1em", textTransform:"uppercase",
                cursor:"pointer", fontFamily:"'DM Mono',monospace",
                boxShadow:"none", transition:"all .12s",
              }}
              onMouseEnter={e=>{e.currentTarget.style.background=Y;e.currentTarget.style.color=K;e.currentTarget.style.borderColor=Y;e.currentTarget.style.transform="translate(-2px,-2px)";e.currentTarget.style.boxShadow=`3px 3px 0 ${Y}`;}}
              onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="rgba(232,255,71,.5)";e.currentTarget.style.borderColor="rgba(232,255,71,.25)";e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}
            >
              ← Back to Home
            </button>
          </div>
        </div>

        {/* ── Tab bar — neo style ── */}
        <div style={{ display:"flex", gap:0, marginBottom:24, borderBottom:`2px solid rgba(232,255,71,.1)` }}>
          {["Predictions","Fixtures","Table","Simulation"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding:"12px 22px", background:"none", border:"none",
              borderBottom:activeTab===tab?`3px solid ${accent}`:"3px solid transparent",
              color:activeTab===tab?accent:"rgba(232,255,71,.28)",
              fontSize:10, fontWeight:900, letterSpacing:".12em", textTransform:"uppercase",
              cursor:"pointer", transition:"color .15s",
              fontFamily:"'DM Mono',monospace", marginBottom:-2,
            }}>
              {tab}
            </button>
          ))}
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div style={{ padding:"56px", textAlign:"center", color:Y, fontSize:13 }}>
            <div style={{width:26,height:26,border:`3px solid rgba(232,255,71,.15)`,borderTopColor:accent,margin:"0 auto 12px",animation:"nb-spin .8s linear infinite"}}/>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:".1em",color:"rgba(232,255,71,.4)"}}>Loading {prettyName} data…</span>
          </div>
        )}

        {/* ── Content ── */}
        {!loading && (
          <div>
            {activeTab === "Predictions" && <PredictionTable predictions={predictions}/>}
            {activeTab === "Fixtures"    && <FixturesTable   fixtures={fixtures}/>}
            {activeTab === "Table"       && <StandingsTable  table={table}/>}
            {activeTab === "Simulation"  && <SimulationTable rows={simulation}/>}
          </div>
        )}
      </div>
    </div>
  );
}