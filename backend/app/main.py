"""
StatinSite FastAPI Backend — main.py v4.0
══════════════════════════════════════════
STABILITY RULES (never break these):
  1. imports → dotenv → app = FastAPI() → middleware → routers
  2. FastAPI() is instantiated EXACTLY ONCE
  3. include_router() is called AFTER app exists
  4. No circular imports: routes never import from main.py
"""

# ── 1. stdlib ─────────────────────────────────────────────────────────────────
import os, time, asyncio, logging, requests
from datetime import datetime, date, timezone, timedelta
from typing import Dict, List, Optional
from pathlib import Path

# ── 2. dotenv (walk up to find .env) ─────────────────────────────────────────
try:
    from dotenv import load_dotenv
    _p = Path(__file__).resolve().parent
    for _ in range(4):
        if (_p / ".env").exists():
            load_dotenv(_p / ".env"); break
        _p = _p.parent
except ImportError:
    pass

# ── 3. FastAPI & httpx ────────────────────────────────────────────────────────
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── 4. Internal helpers (no routes yet) ──────────────────────────────────────
from app.football_engine import EloRatings, TTLCache, predict_match, LEAGUE_AVG_GOALS, FALLBACK_AVG

# ── 5. THE ONE AND ONLY APP ───────────────────────────────────────────────────
app = FastAPI(title="StatinSite API", version="4.0.0")

# ── 6. Middleware ─────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://localhost:5174",
        "http://127.0.0.1:5173", "http://127.0.0.1:5174",
        "https://statinsite.com", "https://www.statinsite.com",
        "https://football-stats-lw4b.onrender.com",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

# ── 7. Routers (AFTER app is created) ────────────────────────────────────────
from app.routes.lineups       import router as lineups_router
from app.routes.momentum      import router as momentum_router
from app.routes.win_prob      import router as win_prob_router
from app.routes.shot_map      import router as shot_map_router
from app.routes.squad_builder import router as squad_builder_router

app.include_router(lineups_router)
app.include_router(momentum_router)
app.include_router(win_prob_router)
app.include_router(shot_map_router)
app.include_router(squad_builder_router)

# Optional routers — registered only when the files exist in the repo
try:
    from app.routes.intelligence import router as intelligence_router
    app.include_router(intelligence_router)
except ImportError:
    pass

try:
    from app.routes.fpl import router as fpl_router
    app.include_router(fpl_router)
except ImportError:
    pass

try:
    from app.routes.players import router as players_router
    app.include_router(players_router)
except ImportError:
    pass

try:
    from app.routes.predictions import router as predictions_router
    app.include_router(predictions_router)
except ImportError:
    pass

try:
    from app.routes.simulation import router as simulation_router
    app.include_router(simulation_router)
except ImportError:
    pass

try:
    from app.routes.model_diagnostics import router as diagnostics_router
    app.include_router(diagnostics_router)
except ImportError:
    pass

try:
    from app.routes.home import router as home_router
    app.include_router(home_router)
except ImportError:
    pass

# ══════════════════════════════════════════════════════════════════════════════
# Constants
# ══════════════════════════════════════════════════════════════════════════════
logging.basicConfig(level=logging.INFO)

API_KEY           = os.getenv("API_FOOTBALL_KEY")
API_FOOTBALL_BASE = "https://v3.football.api-sports.io"
NEWS_API_KEY      = os.getenv("NEWS_API_KEY")
OPENROUTER_KEY    = os.getenv("OPENROUTER_API_KEY", "")
CURRENT_SEASON    = 2025

LEAGUE_IDS = {"epl":39,"laliga":140,"seriea":135,"ligue1":61,"bundesliga":78}
LEAGUE_NAMES = {"epl":"Premier League","laliga":"La Liga","seriea":"Serie A","ligue1":"Ligue 1","bundesliga":"Bundesliga"}
LEAGUE_FULL    = LEAGUE_NAMES
TOP5_LEAGUES   = {v: k for k, v in LEAGUE_IDS.items()}
ALL_LEAGUE_IDS = list(LEAGUE_IDS.values())

TTL_1H=3600; TTL_24H=86400; TTL_PERM=604800
_cache      = TTLCache(ttl_seconds=TTL_1H)
_long_cache = TTLCache(ttl_seconds=TTL_24H)
_perm_cache = TTLCache(ttl_seconds=TTL_PERM)
_live_cache = TTLCache(ttl_seconds=60)
_feat_cache = TTLCache(ttl_seconds=300)
_elo_cache:    Dict[str, EloRatings] = {}
_elo_built_at: Dict[str, float]      = {}

# ══════════════════════════════════════════════════════════════════════════════
# HTTP helpers
# ══════════════════════════════════════════════════════════════════════════════

def _headers():
    if not API_KEY: raise HTTPException(500, "API_FOOTBALL_KEY not set")
    return {"x-apisports-key": API_KEY}

def api_get(path, params=None, timeout=25):
    try:
        r = requests.get(f"{API_FOOTBALL_BASE}{path}", headers=_headers(), params=params or {}, timeout=timeout)
        r.raise_for_status(); return r.json()
    except requests.HTTPError: raise HTTPException(r.status_code, f"API-Football {r.status_code}")
    except requests.RequestException as e: raise HTTPException(502, f"Upstream: {e}")

async def async_api_get(path: str, params: dict) -> dict:
    if not API_KEY: raise HTTPException(500, "API_FOOTBALL_KEY not set")
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{API_FOOTBALL_BASE}/{path.lstrip('/')}",
            headers={"x-apisports-key": API_KEY}, params=params,
        )
        resp.raise_for_status(); return resp.json()

def fpl_get(path):
    try:
        r = requests.get(f"https://fantasy.premierleague.com/api/{path}", timeout=20)
        r.raise_for_status(); return r.json()
    except requests.RequestException as e: raise HTTPException(502, f"FPL: {e}")

# ══════════════════════════════════════════════════════════════════════════════
# Utilities
# ══════════════════════════════════════════════════════════════════════════════

def safe(d, *keys, default=0):
    for k in keys:
        if not isinstance(d, dict): return default
        d = d.get(k, default)
    return d or default

def league_slug(lid: int) -> str: return TOP5_LEAGUES.get(lid, str(lid))
def extract_form(s: Optional[str]) -> List[str]:
    return [c for c in (s or "").upper() if c in "WDL"][-5:]

def _ordinal(n: int) -> str:
    if 11 <= (n % 100) <= 13: return f"{n}th"
    return f"{n}{['th','st','nd','rd','th'][min(n%10,4)]}"

def parse_standings(raw):
    try: rows = raw["response"][0]["league"]["standings"][0]
    except (KeyError, IndexError, TypeError): return []
    out = []
    for e in rows:
        t=e.get("team",{}); a=e.get("all",{}); h=e.get("home",{}); aw=e.get("away",{}); g=a.get("goals",{})
        out.append({"rank":e.get("rank"),"team_id":t.get("id"),"team_name":t.get("name","—"),"logo":t.get("logo",""),
            "played":a.get("played",0),"won":a.get("win",0),"drawn":a.get("draw",0),"lost":a.get("lose",0),
            "goals_for":g.get("for",0),"goals_against":g.get("against",0),"goal_diff":e.get("goalsDiff",0),
            "points":e.get("points",0),"form":e.get("form",""),"description":e.get("description",""),
            "home_played":h.get("played",0),"home_won":h.get("win",0),"home_drawn":h.get("draw",0),"home_lost":h.get("lose",0),
            "away_played":aw.get("played",0),"away_won":aw.get("win",0),"away_drawn":aw.get("draw",0),"away_lost":aw.get("lose",0)})
    return out

def fetch_team_stats_full(team_id, league_id):
    key = f"ts_{team_id}_{league_id}_{CURRENT_SEASON}"
    hit = _long_cache.get(key)
    if hit: return hit
    try:
        data = api_get("/teams/statistics", {"team": team_id, "league": league_id, "season": CURRENT_SEASON})
        s = data.get("response", {})
        if not s: return None
        fx=s.get("fixtures",{}); goals=s.get("goals",{}); shots=s.get("shots",{})
        passes=s.get("passes",{}); cards=s.get("cards",{}); poss=s.get("possession","50%")
        lineups=s.get("lineups",[]); formation=lineups[0]["formation"] if lineups else "Unknown"
        ph=safe(fx,"played","home"); pa=safe(fx,"played","away")
        result = {
            "team_id":team_id,"played_home":ph,"played_away":pa,
            "scored_home":safe(goals,"for","total","home"),"conceded_home":safe(goals,"against","total","home"),
            "scored_away":safe(goals,"for","total","away"),"conceded_away":safe(goals,"against","total","away"),
            "shots_pg":round(safe(shots,"total","total",0)/max(ph+pa,1),2),
            "shots_on_target_pct":round(safe(shots,"on_target","total",0)/max(safe(shots,"total","total",1),1)*100,1),
            "possession_avg":int(str(poss).replace("%","") or 50),
            "pass_accuracy":round(safe(passes,"accuracy","total",0),1),
            "passes_pg":round(safe(passes,"total","total",0)/max(ph+pa,1),1),
            "yellow_pg":round(safe(cards,"yellow","total",0)/max(ph+pa,1),2),
            "red_pg":round(safe(cards,"red","total",0)/max(ph+pa,1),3),
            "goals_by_minute":goals.get("for",{}).get("minute",{}),
            "conceded_by_minute":goals.get("against",{}).get("minute",{}),
            "formation":formation,"clean_sheets":safe(s,"clean_sheet","total",0),
            "failed_to_score":safe(s,"failed_to_score","total",0),
            "form":s.get("form",""),"goals":goals,"fixtures":fx,"clean_sheet":s.get("clean_sheet",{}),
        }
        _long_cache.set(key, result); return result
    except Exception: return None

def get_or_build_elo(code):
    now = time.time()
    if code in _elo_cache and now - _elo_built_at.get(code,0) < TTL_1H: return _elo_cache[code]
    elo=EloRatings(); lid=LEAGUE_IDS.get(code)
    if lid and API_KEY:
        try:
            today=datetime.now(timezone.utc).strftime("%Y-%m-%d")
            data=api_get("/fixtures",{"league":lid,"season":CURRENT_SEASON,"from":f"{CURRENT_SEASON}-07-01","to":today,"status":"FT"},timeout=30)
            completed=[]
            for fx in data.get("response",[]):
                try:
                    sc=fx["score"]["fulltime"]; hg,ag=sc.get("home"),sc.get("away")
                    if hg is None or ag is None: continue
                    completed.append({"home_team":fx["teams"]["home"]["name"],"away_team":fx["teams"]["away"]["name"],"home_goals":int(hg),"away_goals":int(ag),"date":fx["fixture"].get("date","")})
                except (KeyError,TypeError): continue
            completed.sort(key=lambda x:x["date"]); elo.build_from_fixtures(completed)
        except HTTPException: pass
    _elo_cache[code]=elo; _elo_built_at[code]=now; return elo

def fetch_upcoming_fixtures(code, limit=10):
    key=f"upcoming_{code}_{limit}_{CURRENT_SEASON}"; hit=_cache.get(key)
    if hit: return hit
    lid=LEAGUE_IDS.get(code)
    if not lid: return []
    today=datetime.now(timezone.utc).strftime("%Y-%m-%d")
    try:
        data=api_get("/fixtures",{"league":lid,"season":CURRENT_SEASON,"from":today,"to":f"{CURRENT_SEASON+1}-07-31","status":"NS-TBD-PST"},timeout=25)
        out=[]
        for fx in data.get("response",[])[:limit]:
            try:
                f=fx["fixture"]; h=fx["teams"]["home"]; a=fx["teams"]["away"]
                dt=f.get("date",""); ven=fx.get("venue") or {}
                out.append({"fixture_id":f.get("id"),"date":dt[:10] if dt else "TBD","time":dt[11:16] if len(dt)>10 else "",
                    "home_id":h.get("id"),"away_id":a.get("id"),"home_team":h.get("name",""),"away_team":a.get("name",""),
                    "home_logo":h.get("logo",""),"away_logo":a.get("logo",""),"venue":ven.get("name","") if isinstance(ven,dict) else ""})
            except (KeyError,TypeError): continue
        _cache.set(key,out); return out
    except HTTPException: return []

def _compute_prediction_from_stats(home_stats:dict, away_stats:dict) -> dict:
    try:
        ph=(home_stats.get("played_home") or 0)+(home_stats.get("played_away") or 0)
        pa=(away_stats.get("played_home") or 0)+(away_stats.get("played_away") or 0)
        hs=(home_stats.get("scored_home") or 0)+(home_stats.get("scored_away") or 0)
        hc=(home_stats.get("conceded_home") or 0)+(home_stats.get("conceded_away") or 0)
        as_=(away_stats.get("scored_home") or 0)+(away_stats.get("scored_away") or 0)
        ac=(away_stats.get("conceded_home") or 0)+(away_stats.get("conceded_away") or 0)
        ha=hs/max(ph,1); hd=hc/max(ph,1); aa=as_/max(pa,1); ad=ac/max(pa,1)
        xgh=round((ha+ad)/2,2); xga=round((aa+hd)/2,2)
        tot=xgh+xga+0.001
        hw=round(min(90,max(10,(xgh/tot)*90+5))); aw=round(min(90,max(10,(xga/tot)*90))); d=max(5,100-hw-aw)
        s=hw+d+aw; hw=round(hw/s*100); aw=round(aw/s*100); d=100-hw-aw
        return {"home_win":hw,"draw":d,"away_win":aw,"xg_home":xgh,"xg_away":xga,
                "over25":round(min(95,max(5,(xgh+xga)*25))),"btts":round(min(90,max(10,min(xgh,xga)*40))),
                "scorelines":[{"score":"1-0","probability":max(2,hw//4)},{"score":"2-1","probability":max(2,hw//5)},
                               {"score":"1-1","probability":max(2,d//3)},{"score":"0-1","probability":max(2,aw//4)},
                               {"score":"2-0","probability":max(2,hw//6)}]}
    except Exception: return {}

# ══════════════════════════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/")
def root():
    return {"api": "StatinSite", "version": "4.0.0"}
@app.get("/health")
def health(): return {"status":"ok","season":CURRENT_SEASON,"version":"4.0.0"}

@app.get("/api/season-check")
def season_check(): return {"current_season":CURRENT_SEASON}

@app.get("/api/matches/upcoming")
async def upcoming_matches():
    today=date.today(); end=today+timedelta(days=7)
    season=today.year if today.month>=7 else today.year-1

    async def fetch_league(lid: int):
        try:
            data=await async_api_get("/fixtures",{"league":lid,"season":season,"from":today.isoformat(),"to":end.isoformat(),"timezone":"UTC"})
            return data.get("response",[])
        except Exception: return []

    async def fetch_live():
        try:
            data=await async_api_get("/fixtures",{"live":"all"})
            return [f for f in data.get("response",[]) if f.get("league",{}).get("id") in TOP5_LEAGUES]
        except Exception: return []

    results=await asyncio.gather(*[fetch_league(lid) for lid in TOP5_LEAGUES],fetch_live())
    seen=set(); matches=[]
    for fl in results:
        for f in fl:
            fid=f.get("fixture",{}).get("id")
            if not fid or fid in seen: continue
            seen.add(fid)
            fix=f.get("fixture",{}); teams=f.get("teams",{}); goals=f.get("goals",{}); lg=f.get("league",{})
            matches.append({"fixture_id":fid,"league":league_slug(lg.get("id")),"league_id":lg.get("id"),
                "league_name":lg.get("name"),"home_team":teams.get("home",{}).get("name"),
                "away_team":teams.get("away",{}).get("name"),"home_logo":teams.get("home",{}).get("logo"),
                "away_logo":teams.get("away",{}).get("logo"),"home_score":goals.get("home"),
                "away_score":goals.get("away"),"status":fix.get("status",{}).get("short"),
                "minute":fix.get("status",{}).get("elapsed"),"kickoff":fix.get("date"),
                "venue_name":fix.get("venue",{}).get("name")})
    live_s={"1H","2H","HT","ET","BT","P"}
    matches.sort(key=lambda m:(0 if m.get("status") in live_s else 1, m.get("kickoff") or "9999"))
    return {"matches":matches,"count":len(matches)}

@app.get("/api/match-intelligence/{fixture_id}")
async def match_intelligence_endpoint(fixture_id: int):
    async def _get(path, params):
        try:
            d=await async_api_get(path,params); return d.get("response",[])
        except Exception: return []

    fixture_r, events_raw, lineups_raw, stats_raw = await asyncio.gather(
        _get("/fixtures",{"id":fixture_id}), _get("/fixtures/events",{"fixture":fixture_id}),
        _get("/fixtures/lineups",{"fixture":fixture_id}), _get("/fixtures/statistics",{"fixture":fixture_id}),
    )
    if not fixture_r: raise HTTPException(404,"Fixture not found")
    fixture=fixture_r[0] if isinstance(fixture_r,list) else fixture_r
    fix=fixture.get("fixture",{}); teams=fixture.get("teams",{}); goals=fixture.get("goals",{})
    league=fixture.get("league",{}); score=fixture.get("score",{}); venue=fix.get("venue",{})
    home_id=teams.get("home",{}).get("id"); away_id=teams.get("away",{}).get("id")
    league_id=league.get("id"); season=league.get("season") or CURRENT_SEASON

    h2h_raw,home_s_raw,away_s_raw=await asyncio.gather(
        _get("/fixtures/headtohead",{"h2h":f"{home_id}-{away_id}","last":10}) if home_id and away_id else asyncio.coroutine(lambda:[])(),
        _get("/teams/statistics",{"team":home_id,"season":season,"league":league_id}) if home_id and league_id else asyncio.coroutine(lambda:[])(),
        _get("/teams/statistics",{"team":away_id,"season":season,"league":league_id}) if away_id and league_id else asyncio.coroutine(lambda:[])(),
    )

    def ns(raw):
        s=raw[0] if isinstance(raw,list) and raw else raw if isinstance(raw,dict) else {}
        if not s: return {}
        fx=s.get("fixtures",{}); gl=s.get("goals",{}); shots=s.get("shots",{})
        poss=s.get("possession","50%"); ll=s.get("lineups",[]); ph=safe(fx,"played","home"); pa=safe(fx,"played","away")
        return {"played_home":ph,"played_away":pa,
            "scored_home":safe(gl,"for","total","home"),"scored_away":safe(gl,"for","total","away"),
            "conceded_home":safe(gl,"against","total","home"),"conceded_away":safe(gl,"against","total","away"),
            "form":s.get("form",""),"clean_sheets":safe(s,"clean_sheet","total",0),
            "possession_avg":int(str(poss).replace("%","") or 50),
            "shots_pg":round(safe(shots,"total","total",0)/max(ph+pa,1),2),
            "formation":ll[0]["formation"] if ll else "","fixtures":fx,"goals":gl}

    home_stats=ns(home_s_raw); away_stats=ns(away_s_raw)
    home_name=teams.get("home",{}).get("name","Home"); away_name=teams.get("away",{}).get("name","Away")

    header={"fixture_id":fix.get("id"),"home_team":home_name,"away_team":away_name,
        "home_logo":teams.get("home",{}).get("logo"),"away_logo":teams.get("away",{}).get("logo"),
        "home_id":home_id,"away_id":away_id,"home_score":goals.get("home"),"away_score":goals.get("away"),
        "status":fix.get("status",{}).get("short"),"minute":fix.get("status",{}).get("elapsed"),
        "kickoff":fix.get("date"),"league_name":league.get("name"),"league_logo":league.get("logo"),
        "league_id":league_id,"round":league.get("round"),"venue_name":venue.get("name"),
        "venue_city":venue.get("city"),"referee":fix.get("referee"),
        "score":{"ht_home":(score.get("halftime") or {}).get("home"),"ht_away":(score.get("halftime") or {}).get("away")}}

    events=[{"minute":e.get("time",{}).get("elapsed"),"extra_minute":e.get("time",{}).get("extra"),
        "team":e.get("team",{}).get("name"),"team_id":e.get("team",{}).get("id"),
        "player":e.get("player",{}).get("name"),"assist":e.get("assist",{}).get("name"),
        "type":e.get("type"),"detail":e.get("detail"),"comments":e.get("comments")} for e in events_raw]

    lineups={}
    for lu in lineups_raw:
        is_home=lu.get("team",{}).get("id")==home_id; k="home" if is_home else "away"
        def mp(p): pl=p.get("player",{}); return {"id":pl.get("id"),"name":pl.get("name"),"number":pl.get("number"),"pos":pl.get("pos"),"grid":pl.get("grid")}
        lineups[k]={"team_name":lu.get("team",{}).get("name"),"formation":lu.get("formation"),
            "startXI":[mp(p) for p in lu.get("startXI",[])],"bench":[mp(p) for p in lu.get("substitutes",[])],"coach":lu.get("coach",{}).get("name")}

    statistics={"home":[],"away":[]}
    for sb in stats_raw:
        tid=sb.get("team",{}).get("id"); k="home" if tid==home_id else "away"
        for s in sb.get("statistics",[]): statistics[k].append({"type":s.get("type"),"value":s.get("value")})

    hw=dw=aw_wins=0; h2h_matches=[]
    for m in (h2h_raw or []):
        mfix=m.get("fixture",{}); mt=m.get("teams",{}); mg=m.get("goals",{}); ml=m.get("league",{})
        gh=mg.get("home") or 0; ga=mg.get("away") or 0; mhid=mt.get("home",{}).get("id")
        if gh>ga: (hw if mhid==home_id else aw_wins); hw+=1 if mhid==home_id else 0; aw_wins+=1 if mhid!=home_id and gh>ga else 0
        elif ga>gh: aw_wins+=1 if mhid==away_id else 0; hw+=1 if mhid!=away_id and ga>gh else 0
        else: dw+=1
        h2h_matches.append({"date":mfix.get("date"),"home_team":mt.get("home",{}).get("name"),"away_team":mt.get("away",{}).get("name"),"home_score":gh,"away_score":ga,"league":ml.get("name")})

    # ── Use the full prediction engine (replaces _compute_prediction_from_stats)
    _elo = get_or_build_elo(league_slug(league_id)) if league_id else None
    _lavg = LEAGUE_AVG_GOALS.get(league_id, FALLBACK_AVG)
    prediction = predict_match(
        home_team=home_name, away_team=away_name,
        home_stats=home_stats, away_stats=away_stats,
        league_avg=_lavg, elo=_elo,
        home_team_id=home_id or 0, away_team_id=away_id or 0,
        fixture_date=(fix.get("date","") or "")[:10],
        fixture_time=(fix.get("date","") or "")[11:16],
        home_logo=teams.get("home",{}).get("logo",""),
        away_logo=teams.get("away",{}).get("logo",""),
        home_form=home_stats.get("form",""),
        away_form=away_stats.get("form",""),
        h2h_results=h2h_raw or [],
    )

    return {"header":header,"events":events,"lineups":lineups,"statistics":statistics,
        "h2h":{"matches":h2h_matches,"summary":{"home_wins":hw,"draws":dw,"away_wins":aw_wins}},
        "prediction":prediction,"venue":{"name":venue.get("name"),"city":venue.get("city")},
        "insights":[],"home_recent_form":extract_form(home_stats.get("form","")),"away_recent_form":extract_form(away_stats.get("form",""))}

@app.get("/api/standings/{league}")
def get_standings(league: str, season: int = CURRENT_SEASON):
    if league not in LEAGUE_IDS: raise HTTPException(404,f"Unknown league: {league}")
    key=f"standings_{league}_{season}_v3"; hit=_long_cache.get(key)
    if hit: return {"standings":hit}
    raw=api_get("/standings",{"league":LEAGUE_IDS[league],"season":season})
    rows=parse_standings(raw)
    if not rows: raise HTTPException(502,"No standings data")
    _long_cache.set(key,rows); return {"standings":rows}

@app.get("/api/team/{team_id}/stats")
def get_team_stats(team_id: int, league: str = "epl"):
    if league not in LEAGUE_IDS: raise HTTPException(404,"Unknown league")
    stats=fetch_team_stats_full(team_id,LEAGUE_IDS[league])
    if not stats: raise HTTPException(404,"No stats found")
    return stats

@app.get("/api/topscorers/{league}")
def get_top_scorers(league: str):
    if league not in LEAGUE_IDS: raise HTTPException(404,"Unknown league")
    key=f"topscorers_{league}_{CURRENT_SEASON}"; hit=_long_cache.get(key)
    if hit: return {"scorers":hit}
    data=api_get("/players/topscorers",{"league":LEAGUE_IDS[league],"season":CURRENT_SEASON})
    out=[]
    for entry in data.get("response",[])[:15]:
        p=entry.get("player",{}); s=entry.get("statistics",[{}])[0]; g=s.get("goals",{}); t=s.get("team",{}); ga=s.get("games",{})
        out.append({"player_id":p.get("id"),"name":p.get("name",""),"photo":p.get("photo",""),
            "team_name":t.get("name",""),"team_logo":t.get("logo",""),
            "goals":g.get("total",0) or 0,"assists":g.get("assists",0) or 0,"played":ga.get("appearences",0)})
    _long_cache.set(key,out); return {"scorers":out}

@app.get("/api/league/{code}/predictions")
def league_predictions(code: str):
    code=code.lower().strip()
    if code not in LEAGUE_IDS: raise HTTPException(404,f"Unknown league: {code}")
    key=f"predictions_{code}_{CURRENT_SEASON}_v4"; hit=_cache.get(key)
    if hit: return hit
    lid=LEAGUE_IDS[code]; elo=get_or_build_elo(code); upcoming=fetch_upcoming_fixtures(code,limit=10)

    def _fetch_h2h(hid, aid):
        """Fetch last 10 H2H results; returns [] on any error."""
        if not (hid and aid): return []
        k = f"h2h_{hid}_{aid}"
        hit = _long_cache.get(k)
        if hit is not None: return hit
        try:
            data = api_get("/fixtures/headtohead", {"h2h": f"{hid}-{aid}", "last": 10}, timeout=15)
            result = data.get("response", [])
            _long_cache.set(k, result)
            return result
        except Exception:
            return []

    preds=[]
    for fx in upcoming:
        hid=fx.get("home_id"); aid=fx.get("away_id")
        hs=fetch_team_stats_full(hid,lid) if hid else None
        as_=fetch_team_stats_full(aid,lid) if aid else None
        h2h_raw=_fetch_h2h(hid, aid)
        pred=predict_match(home_team=fx.get("home_team",""),away_team=fx.get("away_team",""),
            home_stats=hs,away_stats=as_,league_avg=LEAGUE_AVG_GOALS.get(lid,FALLBACK_AVG),elo=elo,
            home_team_id=hid or 0,away_team_id=aid or 0,fixture_date=fx.get("date","TBD"),
            fixture_time=fx.get("time",""),home_logo=fx.get("home_logo",""),away_logo=fx.get("away_logo",""),
            home_form=(hs or {}).get("form",""),away_form=(as_ or {}).get("form",""),
            h2h_results=h2h_raw)
        pred["fixture_id"]=fx.get("fixture_id"); pred["venue"]=fx.get("venue","")
        if hs: pred["home_stats"]=hs
        if as_: pred["away_stats"]=as_
        preds.append(pred)
        # Record for accountability tracking
        try:
            from app.routes.predictions import record_prediction as _rp
            _rp(
                fixture_id=fx.get("fixture_id") or 0,
                home_team=fx.get("home_team",""),
                away_team=fx.get("away_team",""),
                league=LEAGUE_NAMES.get(code, code),
                predicted_outcome=pred.get("predicted_outcome","home"),
                confidence=pred.get("confidence",50),
                xg_home=pred.get("xg_home",0),
                xg_away=pred.get("xg_away",0),
                p_home=pred.get("p_home_win",0),
                p_draw=pred.get("p_draw",0),
                p_away=pred.get("p_away_win",0),
                fixture_date=fx.get("date",""),
            )
        except Exception:
            pass
    preds.sort(key=lambda x:x["confidence"],reverse=True)
    result={"league_code":code,"league_name":LEAGUE_NAMES[code],"generated_at":datetime.now(timezone.utc).isoformat(),"predictions":preds}
    _cache.set(key,result); return result

# /api/intelligence/health — served by app.routes.intelligence router

# ══════════════════════════════════════════════════════════════════════════════
# INJURIES  — GET /api/injuries/{league}
# Uses API-Football /injuries endpoint. Cached 1h.
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/injuries/{league}")
def get_injuries(league: str):
    league = league.lower().strip()
    if league not in LEAGUE_IDS:
        raise HTTPException(404, f"Unknown league: {league}")
    lid = LEAGUE_IDS[league]
    key = f"injuries_{league}_{CURRENT_SEASON}"
    hit = _cache.get(key)
    if hit:
        return {"injuries": hit, "league": league}
    try:
        data = api_get("/injuries", {"league": lid, "season": CURRENT_SEASON})
        out = []
        for entry in (data.get("response") or [])[:30]:
            pl = entry.get("player", {})
            tm = entry.get("team",   {})
            fx = entry.get("fixture", {})
            out.append({
                "player_id":   pl.get("id"),
                "name":        pl.get("name", ""),
                "photo":       pl.get("photo", ""),
                "team_name":   tm.get("name", ""),
                "team_logo":   tm.get("logo", ""),
                "type":        pl.get("type", ""),
                "reason":      pl.get("reason", ""),
                "fixture_date": fx.get("date", "") if isinstance(fx, dict) else "",
            })
        _cache.set(key, out)
        return {"injuries": out, "league": league}
    except Exception as e:
        raise HTTPException(502, f"Injury data unavailable: {e}")


# ══════════════════════════════════════════════════════════════════════════════
# TOP ASSISTS  — GET /api/topassists/{league}
# Uses API-Football /players/topassists. Cached 24h.
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/topassists/{league}")
def get_top_assists(league: str):
    league = league.lower().strip()
    if league not in LEAGUE_IDS:
        raise HTTPException(404, f"Unknown league: {league}")
    lid = LEAGUE_IDS[league]
    key = f"topassists_{league}_{CURRENT_SEASON}"
    hit = _long_cache.get(key)
    if hit:
        return {"assists": hit, "league": league}
    try:
        data = api_get("/players/topassists", {"league": lid, "season": CURRENT_SEASON})
        out = []
        for entry in (data.get("response") or [])[:15]:
            p = entry.get("player", {})
            s = (entry.get("statistics") or [{}])[0]
            g = s.get("goals", {})
            t = s.get("team",  {})
            ga = s.get("games", {})
            out.append({
                "player_id": p.get("id"),
                "name":      p.get("name", ""),
                "photo":     p.get("photo", ""),
                "team_name": t.get("name",  ""),
                "team_logo": t.get("logo",  ""),
                "assists":   g.get("assists", 0) or 0,
                "goals":     g.get("total",   0) or 0,
                "played":    ga.get("appearences", 0),
            })
        _long_cache.set(key, out)
        return {"assists": out, "league": league}
    except Exception as e:
        raise HTTPException(502, f"Top assists data unavailable: {e}")


# ══════════════════════════════════════════════════════════════════════════════
# TEAM PROFILE  — GET /api/team/{team_id}/profile?league=epl
#
# Aggregates in one call:
#   standing  — from league standings
#   stats     — from team statistics
#   injuries  — from /injuries (current active injuries for this team)
#   top_scorers / top_assists — filtered to this team from league leaders
#   upcoming_fixtures — next 5 fixtures for the team
#
# TeamPage.jsx destructures:
#   { standing, stats, injuries, top_scorers, top_assists,
#     upcoming_fixtures, league_name }
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/team/{team_id}/profile")
def get_team_profile(team_id: int, league: str = "epl"):
    league = league.lower().strip()
    if league not in LEAGUE_IDS:
        raise HTTPException(404, f"Unknown league: {league}")
    lid = LEAGUE_IDS[league]

    cache_key = f"team_profile_{team_id}_{league}_{CURRENT_SEASON}"
    hit = _cache.get(cache_key)
    if hit:
        return hit

    # ── 1. Standings ──────────────────────────────────────────────────────────
    standing = None
    try:
        raw = api_get("/standings", {"league": lid, "season": CURRENT_SEASON})
        rows = parse_standings(raw)
        for row in rows:
            if row.get("team_id") == team_id:
                standing = row
                break
    except Exception:
        pass

    # ── 2. Team stats ─────────────────────────────────────────────────────────
    stats = fetch_team_stats_full(team_id, lid) or {}

    # ── 3. Injuries (team-filtered) ───────────────────────────────────────────
    injuries = []
    try:
        inj_key = f"inj_team_{team_id}_{CURRENT_SEASON}"
        inj_hit = _cache.get(inj_key)
        if inj_hit is not None:
            injuries = inj_hit
        else:
            data = api_get("/injuries", {"league": lid, "season": CURRENT_SEASON,
                                         "team": team_id})
            for entry in (data.get("response") or [])[:20]:
                pl = entry.get("player", {})
                tm = entry.get("team",   {})
                injuries.append({
                    "player_id": pl.get("id"),
                    "name":      pl.get("name", ""),
                    "photo":     pl.get("photo", ""),
                    "team_name": tm.get("name", ""),
                    "type":      pl.get("type", ""),
                    "reason":    pl.get("reason", ""),
                })
            _cache.set(inj_key, injuries)
    except Exception:
        pass

    # ── 4. Top scorers (team-filtered from league leaders) ────────────────────
    top_scorers = []
    try:
        sc_key = f"topscorers_{league}_{CURRENT_SEASON}"
        cached_sc = _long_cache.get(sc_key)
        if cached_sc is None:
            sc_data = api_get("/players/topscorers",
                              {"league": lid, "season": CURRENT_SEASON})
            cached_sc = []
            for entry in (sc_data.get("response") or [])[:20]:
                p = entry.get("player", {})
                s = (entry.get("statistics") or [{}])[0]
                g = s.get("goals", {})
                t = s.get("team",  {})
                ga = s.get("games", {})
                cached_sc.append({
                    "player_id": p.get("id"),
                    "name":      p.get("name", ""),
                    "photo":     p.get("photo", ""),
                    "team_id":   t.get("id"),
                    "team_name": t.get("name", ""),
                    "goals":     g.get("total",   0) or 0,
                    "assists":   g.get("assists",  0) or 0,
                    "played":    ga.get("appearences", 0),
                })
            _long_cache.set(sc_key, cached_sc)
        top_scorers = [p for p in cached_sc if p.get("team_id") == team_id][:5]
    except Exception:
        pass

    # ── 5. Top assists (team-filtered from league leaders) ────────────────────
    top_assists = []
    try:
        ast_key = f"topassists_{league}_{CURRENT_SEASON}"
        cached_ast = _long_cache.get(ast_key)
        if cached_ast is None:
            ast_data = api_get("/players/topassists",
                               {"league": lid, "season": CURRENT_SEASON})
            cached_ast = []
            for entry in (ast_data.get("response") or [])[:20]:
                p = entry.get("player", {})
                s = (entry.get("statistics") or [{}])[0]
                g = s.get("goals", {})
                t = s.get("team",  {})
                ga = s.get("games", {})
                cached_ast.append({
                    "player_id": p.get("id"),
                    "name":      p.get("name", ""),
                    "photo":     p.get("photo", ""),
                    "team_id":   t.get("id"),
                    "team_name": t.get("name", ""),
                    "assists":   g.get("assists", 0) or 0,
                    "goals":     g.get("total",   0) or 0,
                    "played":    ga.get("appearences", 0),
                })
            _long_cache.set(ast_key, cached_ast)
        top_assists = [p for p in cached_ast if p.get("team_id") == team_id][:5]
    except Exception:
        pass

    # ── 6. Upcoming fixtures ──────────────────────────────────────────────────
    upcoming_fixtures = []
    try:
        fx_key = f"team_fx_{team_id}_{league}_{CURRENT_SEASON}"
        fx_hit = _cache.get(fx_key)
        if fx_hit is not None:
            upcoming_fixtures = fx_hit
        else:
            from datetime import datetime, timezone
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            data = api_get("/fixtures", {
                "team": team_id, "league": lid,
                "season": CURRENT_SEASON,
                "from": today,
                "to": f"{CURRENT_SEASON + 1}-07-31",
                "status": "NS-TBD-PST",
            })
            for fx in (data.get("response") or [])[:5]:
                try:
                    f = fx["fixture"]
                    h = fx["teams"]["home"]
                    a = fx["teams"]["away"]
                    upcoming_fixtures.append({
                        "fixture_id": f.get("id"),
                        "date":       f.get("date", "")[:10],
                        "time":       f.get("date", "")[11:16] if len(f.get("date","")) > 10 else "",
                        "home_team":  h.get("name", ""),
                        "home_logo":  h.get("logo", ""),
                        "away_team":  a.get("name", ""),
                        "away_logo":  a.get("logo", ""),
                        "venue":      (fx.get("fixture") or {}).get("venue", {}).get("name", "") if isinstance((fx.get("fixture") or {}).get("venue"), dict) else "",
                        "is_home":    h.get("id") == team_id,
                    })
                except (KeyError, TypeError):
                    continue
            _cache.set(fx_key, upcoming_fixtures)
    except Exception:
        pass

    result = {
        "standing":          standing,
        "stats":             stats,
        "injuries":          injuries,
        "top_scorers":       top_scorers,
        "top_assists":       top_assists,
        "upcoming_fixtures": upcoming_fixtures,
        "league_name":       LEAGUE_NAMES.get(league, league),
        "league":            league,
        "team_id":           team_id,
    }
    _cache.set(cache_key, result)
    return result