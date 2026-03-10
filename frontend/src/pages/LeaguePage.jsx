// pages/LeaguePage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getFixtures,
  getStandings,
  getLeaguePredictions,
  getSeasonSimulation,
} from "../api/api";
import FixturesTable  from "../components/FixturesTable";
import StandingsTable from "../components/StandingsTable";
import PredictionTable from "../components/PredictionTable";
import SimulationTable from "../components/SimulationTable";
import SectionTabs    from "../components/SectionTabs";

const PRETTY = {
  epl:    "EPL",
  laliga: "La Liga",
  seriea: "Serie A",
  ligue1: "Ligue 1",
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

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Helper: read from 1-hour sessionStorage cache
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

    // Wrap each call: return cache if fresh, otherwise fetch
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

    // Fire sequentially with small gaps to avoid rate-limit bursts
    // Simulation is cheap (local Monte Carlo) so always runs
    async function load() {
      const [standingsRes, predictionRes, fixtureRes, simulationRes] = await Promise.all([
        cached(`lp_standings_${league}`,   () => getStandings(league)),
        cached(`lp_predictions_${league}`, () => getLeaguePredictions(league)),
        cached(`lp_fixtures_${league}`,    () => getFixtures(league)),
        cached(`lp_simulation_${league}`,  () => getSeasonSimulation(league)),
      ]);

      if (fixtureRes.status === "fulfilled") {
        const d = fixtureRes.value;
        setFixtures(d.response || []);
      }

      if (standingsRes.status === "fulfilled") {
        const d = standingsRes.value;
        if (Array.isArray(d.standings)) {
          setTable(d.standings);
        } else if (d.response?.[0]?.league?.standings?.[0]) {
          setTable(d.response[0].league.standings[0]);
        } else {
          setTable([]);
        }
      }

      if (predictionRes.status === "fulfilled") {
        const d = predictionRes.value;
        setPredictions(d.predictions || d || []);
      }

      if (simulationRes.status === "fulfilled") {
        const d = simulationRes.value;
        setSimulation(d.results || []);
      }

      setLoading(false);
    }

    load();
  }, [league]);

  const prettyName = PRETTY[league] || league.toUpperCase();

  return (
    <div className="page-shell">
      <div className="page-header-row">
        <h1 className="page-title-left">{prettyName} — Next Matches &amp; Predictions</h1>
        <button className="back-button" onClick={() => navigate("/")}>
          Back to Home / Table
        </button>
      </div>

      <SectionTabs
        active={activeTab}
        setActive={setActiveTab}
        tabs={["Predictions", "Fixtures", "Table", "Simulation"]}
      />

      {loading && (
        <div style={{ padding:"40px", textAlign:"center", color:"#2a4a6a", fontSize:14 }}>
          Loading {prettyName} data…
        </div>
      )}

      {!loading && (
        <>
          {activeTab === "Predictions" && (
            <PredictionTable predictions={predictions} />
          )}
          {activeTab === "Fixtures" && (
            <FixturesTable fixtures={fixtures} />
          )}
          {activeTab === "Table" && (
            <StandingsTable table={table} />
          )}
          {activeTab === "Simulation" && (
            <SimulationTable rows={simulation} />
          )}
        </>
      )}
    </div>
  );
}