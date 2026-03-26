import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

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
import MatchIntelligencePage from "./pages/MatchIntelligencePage";
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

/* ── Stub for pages not yet built ── */
const ComingSoon = ({ name }) => (
  <div style={{minHeight:"60vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,background:"#080808"}}>
    <div style={{fontSize:28,fontFamily:"'Inter',sans-serif",fontWeight:700,letterSpacing:"-.02em",color:"rgba(255,255,255,.2)"}}>{name}</div>
    <div style={{fontSize:11,color:"rgba(255,255,255,.12)",fontFamily:"'Inter',sans-serif",letterSpacing:".14em",textTransform:"uppercase"}}>Coming soon</div>
  </div>
);

/* ── iOS-style global footer — inlined, no extra import ── */
function SiteFooter() {
  return (
    <footer className="sn-site-footer" style={{position:"relative",zIndex:2,flexShrink:0,fontFamily:"'Inter',system-ui,sans-serif"}}>
      <style>{`
        .sn-site-footer { margin-left: 220px; }
        @media (max-width: 820px) {
          .sn-site-footer { margin-left: 0 !important; padding-bottom: 76px; }
        }
      `}</style>

      <div style={{height:"0.5px",background:"linear-gradient(90deg,transparent,rgba(255,255,255,.12) 20%,rgba(255,255,255,.12) 80%,transparent)",marginBottom:32}}/>

      <div style={{maxWidth:1360,margin:"0 auto",padding:"0 28px 48px",display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:24}}>

        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <rect x="4" y="3"  width="14" height="3.5" rx="1.75" fill="#0a84ff"/>
              <rect x="4" y="9"  width="10" height="3.5" rx="1.75" fill="#0a84ff" opacity="0.65"/>
              <rect x="4" y="15" width="14" height="3.5" rx="1.75" fill="#0a84ff" opacity="0.4"/>
              <rect x="4" y="21" width="7"  height="3.5" rx="1.75" fill="#0a84ff" opacity="0.22"/>
              <rect x="20" y="15" width="3" height="10"  rx="1.5"  fill="#30d158"/>
              <rect x="20" y="10" width="3" height="3"   rx="1.5"  fill="#30d158" opacity="0.45"/>
            </svg>
            <span style={{fontSize:18,fontWeight:700,color:"#ffffff",letterSpacing:"-.04em"}}>StatinSite</span>
          </div>
          <span style={{fontSize:11,color:"rgba(255,255,255,.3)",paddingLeft:34,letterSpacing:".01em"}}>Football Intelligence · ELO · Dixon-Coles · xG</span>
        </div>

        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"14px 32px",background:"rgba(255,255,255,.04)",border:"0.5px solid rgba(255,255,255,.1)",borderRadius:14,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)"}}>
          <span style={{fontSize:10,fontWeight:500,color:"rgba(255,255,255,.28)",letterSpacing:".14em",textTransform:"uppercase"}}>Built by</span>
          <span style={{fontSize:17,fontWeight:700,color:"#ffffff",letterSpacing:"-.025em"}}>Rutej Talati</span>
        </div>

        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
          <span style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,.45)",letterSpacing:".02em"}}>statinsite.com</span>
          <span style={{fontSize:11,color:"rgba(255,255,255,.18)"}}>© {new Date().getFullYear()} StatinSite. All rights reserved.</span>
        </div>

      </div>
    </footer>
  );
}

/* ───────────────── League slug mapping ───────────────── */
const SLUG_MAP = {
  "premier-league":"epl","la-liga":"laliga","serie-a":"seriea","ligue-1":"ligue1",
  "bundesliga":"bundesliga","champions-league":"ucl","europa-league":"uel",
  "conference-league":"uecl","fa-cup":"facup",
  "epl":"epl","laliga":"laliga","seriea":"seriea","ligue1":"ligue1",
  "ucl":"ucl","uel":"uel","uecl":"uecl","facup":"facup",
};

/* ───────────────── App Root ───────────────── */
export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">

        <Navbar />

        <main className="sn-page-wrap">
          <Routes>
            <Route path="/"                          element={<HomePage />} />
            <Route path="/live"                      element={<LivePage />} />
            <Route path="/predictions"               element={<Navigate to="/predictions/premier-league" replace />} />
            <Route path="/ucl"                       element={<Navigate to="/predictions/champions-league" replace />} />
            <Route path="/uel"                       element={<Navigate to="/predictions/europa-league" replace />} />
            <Route path="/uecl"                      element={<Navigate to="/predictions/conference-league" replace />} />
            <Route path="/facup"                     element={<Navigate to="/predictions/fa-cup" replace />} />
            <Route path="/predictions/:league"       element={<PredictionsPage slugMap={SLUG_MAP} />} />
            <Route path="/leagues"                   element={<LeaguesPage />} />
            <Route path="/league/epl"                element={<ComingSoon name="Premier League" />} />
            <Route path="/league/laliga"             element={<ComingSoon name="La Liga" />} />
            <Route path="/league/seriea"             element={<ComingSoon name="Serie A" />} />
            <Route path="/league/ligue1"             element={<ComingSoon name="Ligue 1" />} />
            <Route path="/simulation/:league"        element={<SeasonSimulator />} />
            <Route path="/squad-builder"             element={<SquadBuilderPage />} />
            <Route path="/best-team"                 element={<BestTeamPage />} />
            <Route path="/gameweek-insights"         element={<GameweekInsightsPage />} />
            <Route path="/fpl-table"                 element={<FplTablePage />} />
            <Route path="/captaincy"                 element={<CaptaincyPage />} />
            <Route path="/fixture-difficulty"        element={<FixtureDifficultyHeatmap />} />
            <Route path="/transfer-planner"          element={<TransferPlannerPage />} />
            <Route path="/differentials"             element={<DifferentialFinderPage />} />
            <Route path="/player"                    element={<PlayerInsightPage />} />
            <Route path="/player/:id"                element={<PlayerInsightPage />} />
            <Route path="/players"                   element={<ComingSoon name="Player Profiles" />} />
            <Route path="/team/:teamId/:league"      element={<TeamPage />} />
            <Route path="/match/:fixtureId"          element={<LiveMatchPage />} />
            <Route path="/match-preview/:fixtureId"  element={<LiveMatchPage />} />
            <Route path="/games"                     element={<MiniGamesPage />} />
            <Route path="/learn"                     element={<HowItWorksPage />} />
            <Route path="/news"                      element={<NewsTrackerPage />} />
          </Routes>
        </main>

        <SiteFooter />

      </div>
    </BrowserRouter>
  );
}