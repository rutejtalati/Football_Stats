// App.jsx — StatinSite  ·  Part 3 refactor
// ─────────────────────────────────────────────────────────────────────────
// Route changes from previous version:
//   /best-team              → /fpl/best-xi     (BestTeamPage)
//   /fpl-intelligence       → /fpl/gw          (FplIntelligencePage)
//   /captaincy              → /fpl/captain     (CaptaincyPage)
//   /transfer-planner       → /fpl/transfers   (TransferPlannerPage)
//   /squad-builder          → /fpl/squad       (SquadBuilderPage)
//   /differentials          → /fpl/differentials
//   /fixture-difficulty     → /fpl/fixtures    (FixtureDifficultyHeatmap)
//   /gameweek-insights      → /fpl/stats       (GameweekInsightsPage)
//   /fpl-table              → /fpl/table       (FplTablePage)
//   /player                 → /players         (PlayerInsightPage)
//   /player/:id             → /player/:id      (PlayerProfile — unchanged)
//
// New routes:
//   /fpl                    → FplDashboardPage (to be built in Part 4)
//   /players                → PlayerInsightPage (was /player)
//
// All existing routes kept as redirects for backwards compat.
// ─────────────────────────────────────────────────────────────────────────

import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";

import Navbar     from "@/components/Navbar";
import LiveTicker from "@/components/LiveTicker";

// ── Lazy-loaded pages ────────────────────────────────────────────────────────
const HomePage                = lazy(() => import("@/pages/HomePage"));
const LivePage                = lazy(() => import("@/pages/LivePage"));
const LiveMatchPage           = lazy(() => import("@/pages/LiveMatchPage"));
const MatchCentrePage         = lazy(() => import("@/pages/MatchCentrePage"));
const MatchIntelligencePage   = lazy(() => import("@/pages/MatchIntelligencePage"));
const PredictionsPage         = lazy(() => import("@/pages/PredictionsPage"));
const LeaguePage              = lazy(() => import("@/pages/LeaguePage"));
const LeaguesPage             = lazy(() => import("@/pages/LeaguesPage"));
const TeamPage                = lazy(() => import("@/pages/TeamPage"));
const SeasonSimulator         = lazy(() => import("@/pages/SeasonSimulator"));
const PlayerInsightPage       = lazy(() => import("@/pages/PlayerInsightPage"));
const PlayerBrowsePage        = lazy(() => import("@/pages/PlayerBrowsePage"));
const PlayerProfilePage       = lazy(() => import("@/pages/PlayerProfile"));
const NewsTrackerPage         = lazy(() => import("@/pages/NewsTrackerPage"));
const HowItWorksPage          = lazy(() => import("@/pages/HowItWorksPage"));
const MiniGamesPage           = lazy(() => import("@/pages/MiniGamesPage"));
// FPL pages
const BestTeamPage            = lazy(() => import("@/pages/BestTeamPage"));
const FplIntelligencePage     = lazy(() => import("@/pages/FplIntelligencePage"));
const CaptaincyPage           = lazy(() => import("@/pages/CaptaincyPage"));
const TransferPlannerPage     = lazy(() => import("@/pages/TransferPlannerPage"));
const SquadBuilderPage        = lazy(() => import("@/pages/SquadBuilderPage"));
const DifferentialFinderPage  = lazy(() => import("@/pages/DifferentialFinderPage"));
const FixtureDifficultyHeatmap = lazy(() => import("@/pages/FixtureDifficultyHeatmap"));
const GameweekInsightsPage    = lazy(() => import("@/pages/GameweekInsightsPage"));
const FplTablePage            = lazy(() => import("@/pages/FplTablePage"));

// ── Slug map (PredictionsPage needs this to resolve :slug → league code) ─────
const SLUG_MAP = {
  "premier-league":    "epl",
  "la-liga":           "laliga",
  "bundesliga":        "bundesliga",
  "serie-a":           "seriea",
  "ligue-1":           "ligue1",
  "champions-league":  "ucl",
  "europa-league":     "uel",
  "conference-league": "uecl",
  "fa-cup":            "facup",
  "wcq-uefa":          "wcq_uefa",
  "wcq-conmebol":      "wcq_conmebol",
  "wcq-concacaf":      "wcq_concacaf",
  "wcq-caf":           "wcq_caf",
  "wcq-afc":           "wcq_afc",
  "nations-league":    "nations_league",
  "euros":             "euro",
  "euro-qual":         "euro_q",
  "afcon":             "afcon",
  "copa-america":      "copa_america",
  "gold-cup":          "gold_cup",
  "world-cup":         "world_cup",
  "intl-friendly":     "international_friendly",
};

// ── Wrappers that extract URL params ──────────────────────────────────────────

function PredictionsWrapper() {
  const { slug } = useParams();
  const league = SLUG_MAP[slug] || slug || "epl";
  return <PredictionsPage league={league} slugMap={SLUG_MAP} />;
}

function LeagueWrapper() {
  const { league } = useParams();
  return <LeaguePage league={league || "epl"} />;
}

function TeamWrapper() {
  const { league } = useParams();
  return <TeamPage league={league} />;
}

// ── Loading fallback ──────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d0f14",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        width: 28, height: 28,
        borderRadius: "50%",
        border: "2px solid rgba(255,255,255,0.08)",
        borderTopColor: "#0a84ff",
        animation: "app-spin 0.7s linear infinite",
      }} />
      <style>{`@keyframes app-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <LiveTicker />

      <div className="sn-page-wrap">
        <Suspense fallback={<PageLoader />}>
          <Routes>

            {/* ── Core ─────────────────────────────────────────────────── */}
            <Route path="/"              element={<HomePage />} />
            <Route path="/live"          element={<LivePage />} />
            <Route path="/match-centre"  element={<MatchCentrePage />} />

            {/* ── Match detail ─────────────────────────────────────────── */}
            <Route path="/match/:id"     element={<LiveMatchPage />} />

            {/* ── Predictions ──────────────────────────────────────────── */}
            <Route path="/predictions/:slug"      element={<PredictionsWrapper />} />
            {/* Default redirect to Premier League */}
            <Route path="/predictions"            element={<Navigate to="/predictions/premier-league" replace />} />

            {/* ── Leagues / Teams ──────────────────────────────────────── */}
            <Route path="/leagues"                element={<LeaguesPage />} />
            <Route path="/league/:league"         element={<LeagueWrapper />} />
            <Route path="/team/:teamId"           element={<TeamPage />} />
            <Route path="/team/:teamId/:league"   element={<TeamWrapper />} />
            <Route path="/season-sim/:league"     element={<SeasonSimulator />} />

            {/* ── Players ──────────────────────────────────────────────── */}
            <Route path="/players"       element={<PlayerInsightPage />} />
            <Route path="/players/browse" element={<PlayerBrowsePage />} />
            <Route path="/player/:id"    element={<PlayerProfilePage />} />

            {/* ── FPL Hub ──────────────────────────────────────────────── */}
            {/* /fpl → FPL Dashboard (placeholder redirects to best-xi until built) */}
            <Route path="/fpl"                element={<Navigate to="/fpl/best-xi" replace />} />
            <Route path="/fpl/best-xi"        element={<BestTeamPage />} />
            <Route path="/fpl/gw"             element={<FplIntelligencePage />} />
            <Route path="/fpl/captain"        element={<CaptaincyPage />} />
            <Route path="/fpl/transfers"      element={<TransferPlannerPage />} />
            <Route path="/fpl/squad"          element={<SquadBuilderPage />} />
            <Route path="/fpl/differentials"  element={<DifferentialFinderPage />} />
            <Route path="/fpl/fixtures"       element={<FixtureDifficultyHeatmap />} />
            <Route path="/fpl/stats"          element={<GameweekInsightsPage />} />
            <Route path="/fpl/table"          element={<FplTablePage />} />

            {/* ── Content ──────────────────────────────────────────────── */}
            <Route path="/news"    element={<NewsTrackerPage />} />
            <Route path="/learn"   element={<HowItWorksPage />} />
            <Route path="/games"   element={<MiniGamesPage />} />

            {/* ── Legacy redirects (old routes → new routes) ───────────── */}
            <Route path="/best-team"          element={<Navigate to="/fpl/best-xi"       replace />} />
            <Route path="/fpl-intelligence"   element={<Navigate to="/fpl/gw"            replace />} />
            <Route path="/captaincy"          element={<Navigate to="/fpl/captain"        replace />} />
            <Route path="/transfer-planner"   element={<Navigate to="/fpl/transfers"      replace />} />
            <Route path="/squad-builder"      element={<Navigate to="/fpl/squad"          replace />} />
            <Route path="/differentials"      element={<Navigate to="/fpl/differentials"  replace />} />
            <Route path="/fixture-difficulty" element={<Navigate to="/fpl/fixtures"       replace />} />
            <Route path="/gameweek-insights"  element={<Navigate to="/fpl/stats"          replace />} />
            <Route path="/fpl-table"          element={<Navigate to="/fpl/table"          replace />} />
            <Route path="/player"             element={<Navigate to="/players"            replace />} />

            {/* ── 404 fallback ─────────────────────────────────────────── */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  );
}