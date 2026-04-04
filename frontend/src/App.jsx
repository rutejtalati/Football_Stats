import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

/* ───────────────── Components ───────────────── */
import Navbar from "./components/Navbar";

/* ───────────────── Pages ───────────────── */
import HomePage from "./pages/HomePage";
import LivePage from "./pages/LivePage";
import PredictionsPage from "./pages/PredictionsPage";
import SeasonSimulator from "./pages/SeasonSimulator";
import SquadBuilderPage from "./pages/SquadBuilderPage";
import PlayerBrowsePage from "./pages/PlayerBrowsePage";
import PlayerInsightPage from "./pages/PlayerInsightPage";
import TeamPage from "./pages/TeamPage";
import MiniGamesPage from "./pages/MiniGamesPage";
import NewsTrackerPage from "./pages/NewsTrackerPage";
import LeaguePage from "./pages/LeaguePage";
import LiveMatchPage from "./pages/LiveMatchPage";
import TransferPlannerPage from "./pages/TransferPlannerPage";
import HowItWorksPage from "./pages/HowItWorksPage";
import CaptaincyPage from "./pages/CaptaincyPage";
import BestTeamPage from "./pages/BestTeamPage";
import FplTablePage from "./pages/FplTablePage";
import GameweekInsightsPage from "./pages/GameweekInsightsPage";
import DifferentialFinderPage from "./pages/DifferentialFinderPage";
import FixtureDifficultyHeatmap from "./pages/FixtureDifficultyHeatmap";
import LeaguesPage from "./pages/LeaguesPage";
import FplIntelligencePage from "./pages/FplIntelligencePage";

/* ── Stub for pages not yet built ── */
const ComingSoon = ({ name }) => (
  <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, background: "#080808" }}>
    <div style={{ fontSize: 28, fontFamily: "'Inter',sans-serif", fontWeight: 700, letterSpacing: "-.02em", color: "rgba(255,255,255,.2)" }}>{name}</div>
    <div style={{ fontSize: 11, color: "rgba(255,255,255,.12)", fontFamily: "'Inter',sans-serif", letterSpacing: ".14em", textTransform: "uppercase" }}>Coming soon</div>
  </div>
);

/* ───────────────── League slug mapping ───────────────── */
const SLUG_MAP = {
  "premier-league": "epl", "la-liga": "laliga", "serie-a": "seriea", "ligue-1": "ligue1",
  "bundesliga": "bundesliga", "champions-league": "ucl", "europa-league": "uel",
  "conference-league": "uecl", "fa-cup": "facup",
  "epl": "epl", "laliga": "laliga", "seriea": "seriea", "ligue1": "ligue1",
  "ucl": "ucl", "uel": "uel", "uecl": "uecl", "facup": "facup",
  "wcq-uefa": "wcq_uefa", "wcq-conmebol": "wcq_conmebol", "wcq-concacaf": "wcq_concacaf",
  "wcq-caf": "wcq_caf", "wcq-afc": "wcq_afc",
  "nations-league": "nations_league", "euros": "euro", "euro-qual": "euro_q",
  "afcon": "afcon", "copa-america": "copa_america", "gold-cup": "gold_cup",
  "world-cup": "world_cup", "intl-friendly": "international_friendly",
  "wcq_uefa": "wcq_uefa", "wcq_conmebol": "wcq_conmebol", "wcq_concacaf": "wcq_concacaf",
  "wcq_caf": "wcq_caf", "wcq_afc": "wcq_afc",
  "nations_league": "nations_league", "euro": "euro", "euro_q": "euro_q",
  "copa_america": "copa_america", "gold_cup": "gold_cup", "world_cup": "world_cup",
  "international_friendly": "international_friendly",
};

/* ───────────────── App Root ───────────────── */
export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <div className="app-shell">

          <Navbar />

          <main className="sn-page-wrap" style={{ minHeight: "100vh" }}>
            <Routes>
              <Route path="/"                         element={<HomePage />} />
              <Route path="/live"                     element={<LivePage />} />
              <Route path="/predictions"              element={<Navigate to="/predictions/premier-league" replace />} />
              <Route path="/ucl"                      element={<Navigate to="/predictions/champions-league" replace />} />
              <Route path="/uel"                      element={<Navigate to="/predictions/europa-league" replace />} />
              <Route path="/uecl"                     element={<Navigate to="/predictions/conference-league" replace />} />
              <Route path="/facup"                    element={<Navigate to="/predictions/fa-cup" replace />} />
              <Route path="/predictions/:league"      element={<PredictionsPage slugMap={SLUG_MAP} />} />
              <Route path="/leagues"                  element={<LeaguesPage />} />
              <Route path="/league/epl"               element={<LeaguePage league="epl" />} />
              <Route path="/league/laliga"            element={<LeaguePage league="laliga" />} />
              <Route path="/league/seriea"            element={<LeaguePage league="seriea" />} />
              <Route path="/league/ligue1"            element={<LeaguePage league="ligue1" />} />
              <Route path="/simulation/:league"       element={<SeasonSimulator />} />
              {/* ── FPL Tools — new canonical URLs ── */}
              <Route path="/fpl/captain-picks"        element={<CaptaincyPage />} />
              <Route path="/fpl/captain-picks/gw:gw" element={<CaptaincyPage />} />
              <Route path="/fpl/differential-picks"   element={<DifferentialFinderPage />} />
              <Route path="/fpl/differential-picks/gw:gw" element={<DifferentialFinderPage />} />
              <Route path="/fpl/fixture-ticker"       element={<FixtureDifficultyHeatmap />} />
              <Route path="/fpl/fixture-ticker/gw:gw" element={<FixtureDifficultyHeatmap />} />
              <Route path="/fpl/best-xi"              element={<BestTeamPage />} />
              <Route path="/fpl/gw-guide"             element={<FplIntelligencePage />} />
              <Route path="/fpl/stats"                element={<GameweekInsightsPage />} />
              <Route path="/fpl/transfers"            element={<TransferPlannerPage />} />
              <Route path="/fpl/standings"            element={<FplTablePage />} />
              <Route path="/fpl/squad-builder"        element={<SquadBuilderPage />} />

              {/* ── Old URLs → permanent redirects (keeps any existing links working) ── */}
              <Route path="/captaincy"                element={<Navigate to="/fpl/captain-picks" replace />} />
              <Route path="/differentials"            element={<Navigate to="/fpl/differential-picks" replace />} />
              <Route path="/fpl/fixtures"             element={<Navigate to="/fpl/fixture-ticker" replace />} />
              <Route path="/best-team"                element={<Navigate to="/fpl/best-xi" replace />} />
              <Route path="/fpl-intelligence"         element={<Navigate to="/fpl/gw-guide" replace />} />
              <Route path="/gameweek-insights"        element={<Navigate to="/fpl/stats" replace />} />
              <Route path="/transfer-planner"         element={<Navigate to="/fpl/transfers" replace />} />
              <Route path="/fpl-table"                element={<Navigate to="/fpl/standings" replace />} />
              <Route path="/squad-builder"            element={<Navigate to="/fpl/squad-builder" replace />} />
              <Route path="/player"                   element={<PlayerInsightPage />} />
              <Route path="/player/:id"               element={<PlayerInsightPage />} />
              <Route path="/players"                  element={<ComingSoon name="Player Profiles" />} />
              <Route path="/team/:teamId/:league"     element={<TeamPage />} />
              <Route path="/match/:fixtureId"         element={<LiveMatchPage />} />
              <Route path="/match-preview/:fixtureId" element={<LiveMatchPage />} />
              <Route path="/games"                    element={<MiniGamesPage />} />
              <Route path="/learn"                    element={<HowItWorksPage />} />
              <Route path="/news"                     element={<NewsTrackerPage />} />
            </Routes>
          </main>

        </div>
      </BrowserRouter>
    </HelmetProvider>
  );
}