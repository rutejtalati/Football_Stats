from datetime import datetime, timezone
from typing import Dict, List, Optional
import os, time
from pathlib import Path

# Load .env automatically so NEWS_API_KEY and API_FOOTBALL_KEY work without
# manually setting $env: in PowerShell every time.
try:
    from dotenv import load_dotenv
    # Walk up to find .env (handles running from /backend or project root)
    _env = Path(__file__).resolve().parent
    for _ in range(4):
        if (_env / ".env").exists():
            load_dotenv(_env / ".env")
            break
        _env = _env.parent
except ImportError:
    pass  # python-dotenv not installed — env vars must be set manually

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.models.season_simulator import monte_carlo_league
from app.football_engine import EloRatings, TTLCache, predict_match, LEAGUE_AVG_GOALS, FALLBACK_AVG

app = FastAPI(title="StatPitch API", version="3.0.0")
app.add_middleware(CORSMiddleware,
    allow_origins=[
        # Local dev
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        # Production
        "https://statinsite.com",
        "https://www.statinsite.com",
        # Vercel preview deploys (any branch)
        "https://football-stats-lw4b.onrender.com",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.getenv("API_FOOTBALL_KEY")
API_FOOTBALL_BASE = "https://v3.football.api-sports.io"
FPL_BASE = "https://fantasy.premierleague.com/api"
CURRENT_SEASON = 2025

LEAGUE_IDS = {
    "epl":        39,
    "laliga":     140,
    "seriea":     135,
    "ligue1":     61,
    "bundesliga": 78,
}
LEAGUE_NAMES = {
    "epl":        "Premier League",
    "laliga":     "La Liga",
    "seriea":     "Serie A",
    "ligue1":     "Ligue 1",
    "bundesliga": "Bundesliga",
}
POSITION_MAP = {1:"GK",2:"DEF",3:"MID",4:"FWD"}

TTL_1H=3600; TTL_24H=86400; TTL_PERM=604800
_cache=TTLCache(ttl_seconds=TTL_1H)
_long_cache=TTLCache(ttl_seconds=TTL_24H)
_perm_cache=TTLCache(ttl_seconds=TTL_PERM)
_elo_cache: Dict[str,EloRatings] = {}
_elo_built_at: Dict[str,float] = {}

def _headers():
    if not API_KEY: raise HTTPException(500,"API_FOOTBALL_KEY not set")
    return {"x-apisports-key": API_KEY}

def api_get(path, params=None, timeout=25):
    try:
        r = requests.get(f"{API_FOOTBALL_BASE}{path}", headers=_headers(), params=params or {}, timeout=timeout)
        r.raise_for_status()
        return r.json()
    except requests.HTTPError:
        raise HTTPException(r.status_code, f"API-Football {r.status_code}: {r.text[:300]}")
    except requests.RequestException as e:
        raise HTTPException(502, f"Upstream: {e}")

def fpl_get(path):
    try:
        r = requests.get(f"{FPL_BASE}/{path}", timeout=20)
        r.raise_for_status()
        return r.json()
    except requests.RequestException as e:
        raise HTTPException(502, f"FPL: {e}")

def safe(d, *keys, default=0):
    for k in keys:
        if not isinstance(d,dict): return default
        d = d.get(k,default)
    return d or default

def parse_standings(raw):
    try: rows = raw["response"][0]["league"]["standings"][0]
    except (KeyError,IndexError,TypeError): return []
    out = []
    for e in rows:
        t=e.get("team",{}); a=e.get("all",{}); h=e.get("home",{}); aw=e.get("away",{}); g=a.get("goals",{})
        out.append({"rank":e.get("rank"),"team_id":t.get("id"),"team_name":t.get("name","—"),
            "logo":t.get("logo",""),"played":a.get("played",0),"won":a.get("win",0),
            "drawn":a.get("draw",0),"lost":a.get("lose",0),"goals_for":g.get("for",0),
            "goals_against":g.get("against",0),"goal_diff":e.get("goalsDiff",0),
            "points":e.get("points",0),"form":e.get("form",""),"description":e.get("description",""),
            "home_played":h.get("played",0),"home_won":h.get("win",0),"home_drawn":h.get("draw",0),"home_lost":h.get("lose",0),
            "away_played":aw.get("played",0),"away_won":aw.get("win",0),"away_drawn":aw.get("draw",0),"away_lost":aw.get("lose",0)})
    return out

def fetch_team_stats_full(team_id, league_id):
    key=f"ts_{team_id}_{league_id}_{CURRENT_SEASON}"
    hit=_long_cache.get(key)
    if hit: return hit
    try:
        data=api_get("/teams/statistics",{"team":team_id,"league":league_id,"season":CURRENT_SEASON})
        s=data.get("response",{})
        if not s: return None
        fx=s.get("fixtures",{}); goals=s.get("goals",{}); shots=s.get("shots",{})
        passes=s.get("passes",{}); cards=s.get("cards",{}); poss=s.get("possession","50%")
        lineups=s.get("lineups",[]); formation=lineups[0]["formation"] if lineups else "Unknown"
        ph=safe(fx,"played","home"); pa=safe(fx,"played","away")
        result={
            "team_id":team_id,"played_home":ph,"scored_home":safe(goals,"for","total","home"),
            "conceded_home":safe(goals,"against","total","home"),"played_away":pa,
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
        }
        _long_cache.set(key,result)
        return result
    except Exception: return None

def get_or_build_elo(code):
    now=time.time()
    if code in _elo_cache and now-_elo_built_at.get(code,0)<TTL_1H: return _elo_cache[code]
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
                    completed.append({"home_team":fx["teams"]["home"]["name"],"away_team":fx["teams"]["away"]["name"],
                        "home_goals":int(hg),"away_goals":int(ag),"date":fx["fixture"].get("date","")})
                except (KeyError,TypeError): continue
            completed.sort(key=lambda x:x["date"])
            elo.build_from_fixtures(completed)
        except HTTPException: pass
    _elo_cache[code]=elo; _elo_built_at[code]=now
    return elo

def fetch_upcoming_fixtures(code, limit=10):
    key=f"upcoming_{code}_{limit}_{CURRENT_SEASON}"
    hit=_cache.get(key)
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
                out.append({"fixture_id":f.get("id"),"date":dt[:10] if dt else "TBD",
                    "time":dt[11:16] if len(dt)>10 else "","home_id":h.get("id"),"away_id":a.get("id"),
                    "home_team":h.get("name",""),"away_team":a.get("name",""),
                    "home_logo":h.get("logo",""),"away_logo":a.get("logo",""),
                    "venue":ven.get("name","") if isinstance(ven,dict) else "","referee":f.get("referee","")})
            except (KeyError,TypeError): continue
        _cache.set(key,out); return out
    except HTTPException: return []

def appearance_probability(p):
    chance=p.get("chance_of_playing_next_round"); s=p.get("status","a")
    if chance is not None: return round(float(chance)/100,2)
    return {"a":0.92,"d":0.50,"i":0.15,"s":0.00}.get(s,0.60)

def official_availability(p):
    chance=p.get("chance_of_playing_next_round"); s=p.get("status","a")
    if s=="a": return "Available"
    if s=="d": return f"Doubtful,{chance or 50}%"
    if s=="i": return f"Injured,{chance or 15}%"
    if s=="s": return "Suspended,0%"
    return "Unknown"

def difficulty_factor(d): return {2:1.18,3:1.06,4:0.92,5:0.78}.get(int(d or 3),1.0)
def player_merit(p):
    form  = float(p.get("form") or 0)
    ep    = float(p.get("ep_next") or 0)
    ict   = float(p.get("ict_index") or 0)
    ppg   = float(p.get("total_points") or 0) / max(float(p.get("minutes") or 45) / 90, 1)
    prob  = appearance_probability(p)
    raw   = ep * 0.40 + form * 0.35 + ppg * 0.15 + (ict / 30) * 0.10
    form_gate = 1.0 if form >= 1.5 else max(form / 1.5, 0.25)
    prob_penalty = prob ** 1.4
    return round(raw * form_gate * prob_penalty, 2)

def next_team_fixtures(fixtures,team_id,start_gw,limit=6):
    out=[]
    for fx in fixtures:
        if fx.get("finished"): continue
        ev=fx.get("event")
        if ev is None or ev<start_gw: continue
        if fx["team_h"]==team_id: out.append({"event":ev,"opp_id":fx["team_a"],"is_home":True,"difficulty":fx["team_h_difficulty"]})
        elif fx["team_a"]==team_id: out.append({"event":ev,"opp_id":fx["team_h"],"is_home":False,"difficulty":fx["team_a_difficulty"]})
    out.sort(key=lambda x:x["event"]); return out[:limit]

# ── Routes ──────────────────────────────────────────────────────────────────

@app.get("/")
def root(): return {"api":"StatPitch","version":"3.0.0"}

@app.get("/health")
def health(): return {"status":"ok","season":CURRENT_SEASON}

@app.get("/api/season-check")
def season_check(): return {"current_season":CURRENT_SEASON}

@app.get("/api/fpl/bootstrap")
def get_fpl_bootstrap(): return fpl_get("bootstrap-static/")

@app.get("/api/fpl/fixtures")
def get_fpl_fixtures(): return fpl_get("fixtures/")

@app.get("/api/fpl/player/{player_id}/summary")
def get_fpl_player_summary(player_id:int): return fpl_get(f"element-summary/{player_id}/")

@app.get("/api/fpl/predictor-table")
def get_fpl_predictor_table(start_gw:int=29,max_cost:float=15.5,min_prob:float=0.0,team:str=None,position:str=None):
    bootstrap=fpl_get("bootstrap-static/"); fixtures=fpl_get("fixtures/")
    teams={t["id"]:t for t in bootstrap["teams"]}; rows=[]
    for p in bootstrap["elements"]:
        pos=POSITION_MAP.get(p["element_type"],"UNK"); ts=teams[p["team"]]["short_name"]
        cost=round(float(p["now_cost"])/10,1); prob=appearance_probability(p)
        if cost>max_cost or prob<min_prob: continue
        if team and team!="ALL" and ts!=team: continue
        if position and position!="ALL" and pos!=position: continue
        tfx=next_team_fixtures(fixtures,p["team"],start_gw,6)
        next_opp="-"
        if tfx: next_opp=f"{teams[tfx[0]['opp_id']]['short_name']} ({'H' if tfx[0]['is_home'] else 'A'})"
        base=float(p.get("ep_next") or p.get("points_per_game") or 0); merit=player_merit(p)
        form_val = float(p.get("form") or 0)
        ict_val  = float(p.get("ict_index") or 0)
        ppg      = float(p.get("total_points") or 0) / max(float(p.get("minutes") or 45) / 90, 1)
        comp_base = base * 0.55 + form_val * 0.30 + ppg * 0.15
        gw_pts = [round(comp_base * difficulty_factor(fx["difficulty"]) * prob, 1) for fx in tfx]
        while len(gw_pts)<6: gw_pts.append(0.0)
        pts_rest=round(sum(gw_pts),1); val=round(pts_rest/cost,2) if cost>0 else 0
        rows.append({"player_id":p["id"],"player":p["web_name"],"code":p.get("code"),
            "team":ts,"position":pos,"cost":cost,"merit":merit,"form":round(float(p.get("form") or 0),2),
            "next_opp":next_opp,"prob_appear":prob,"availability_pct":p.get("chance_of_playing_next_round"),
            "official_availability":official_availability(p),"official_chance":p.get("chance_of_playing_next_round"),
            "selected_by_pct":float(p.get("selected_by_percent") or 0),"transfers_in_gw":p.get("transfers_in_event",0),
            "transfers_out_gw":p.get("transfers_out_event",0),"points_so_far":p.get("total_points",0),
            "pts_rest_season":pts_rest,"value_rest_season":val,"pts_gw_1":gw_pts[0],"pts_gw_2":gw_pts[1],
            "pts_gw_3":gw_pts[2],"pts_gw_4":gw_pts[3],"pts_gw_5":gw_pts[4],"pts_gw_6":gw_pts[5],
            "ict_index":float(p.get("ict_index") or 0),"influence":float(p.get("influence") or 0),
            "creativity":float(p.get("creativity") or 0),"threat":float(p.get("threat") or 0),"bps":p.get("bps",0)})
    rows.sort(key=lambda x:(x["pts_gw_1"],x["merit"],x["form"]),reverse=True)
    return {"start_gw":start_gw,"count":len(rows),"rows":rows}

@app.get("/api/fpl/summary-cards")
def get_fpl_summary_cards(start_gw:int=29):
    rows=get_fpl_predictor_table(start_gw=start_gw)["rows"]
    if not rows: return {k:None for k in["top_projected","best_captain","most_transferred_in","most_transferred_out","form_leader"]}
    return {"top_projected":max(rows,key=lambda x:x["pts_gw_1"]),"best_captain":max(rows,key=lambda x:x["pts_gw_1"]*2),
            "most_transferred_in":max(rows,key=lambda x:x["transfers_in_gw"]),"most_transferred_out":max(rows,key=lambda x:x["transfers_out_gw"]),
            "form_leader":max(rows,key=lambda x:x["form"])}

@app.get("/api/standings/{league}")
def get_standings(league:str, season:int=CURRENT_SEASON):
    if league not in LEAGUE_IDS: raise HTTPException(404,f"Unknown league: {league}")
    key=f"standings_{league}_{season}_v3"; hit=_long_cache.get(key)
    if hit: return {"standings":hit}
    raw=api_get("/standings",{"league":LEAGUE_IDS[league],"season":season})
    rows=parse_standings(raw)
    if not rows: raise HTTPException(502,"No standings data")
    _long_cache.set(key,rows); return {"standings":rows}

@app.get("/api/team/{team_id}/stats")
def get_team_stats(team_id:int, league:str="epl"):
    if league not in LEAGUE_IDS: raise HTTPException(404,"Unknown league")
    stats=fetch_team_stats_full(team_id,LEAGUE_IDS[league])
    if not stats: raise HTTPException(404,"No stats found")
    return stats

@app.get("/api/h2h/{team1_id}/{team2_id}")
def get_h2h(team1_id:int, team2_id:int, last:int=10):
    key=f"h2h_{min(team1_id,team2_id)}_{max(team1_id,team2_id)}_{last}"; hit=_perm_cache.get(key)
    if hit: return hit
    data=api_get("/fixtures/headtohead",{"h2h":f"{team1_id}-{team2_id}","last":last}); results=[]
    for fx in data.get("response",[]):
        try:
            sc=fx["score"]["fulltime"]; t=fx["teams"]
            ven = fx["fixture"].get("venue") or {}
            results.append({"date":fx["fixture"]["date"][:10],
                "home_team":t["home"]["name"],"away_team":t["away"]["name"],
                "home_logo":t["home"]["logo"],"away_logo":t["away"]["logo"],
                "home_goals":sc.get("home",0),"away_goals":sc.get("away",0),
                "venue":ven.get("name","") if isinstance(ven,dict) else ""})
        except (KeyError,TypeError): continue
    results.sort(key=lambda x:x["date"],reverse=True)
    out={"team1_id":team1_id,"team2_id":team2_id,"results":results[:last]}
    _perm_cache.set(key,out); return out

@app.get("/api/injuries/{league}")
def get_league_injuries(league:str):
    if league not in LEAGUE_IDS: raise HTTPException(404,"Unknown league")
    key=f"injuries_{league}_{CURRENT_SEASON}"; hit=_long_cache.get(key)
    if hit: return {"injuries":hit}
    data=api_get("/injuries",{"league":LEAGUE_IDS[league],"season":CURRENT_SEASON}); out=[]
    for entry in data.get("response",[]):
        try:
            p=entry["player"]; t=entry["team"]; fx2=entry.get("fixture") or {}
            out.append({"player_id":p.get("id"),"player_name":p.get("name",""),"player_photo":p.get("photo",""),
                "type":entry.get("type","Injury"),"reason":entry.get("reason",""),
                "team_id":t.get("id"),"team_name":t.get("name",""),"team_logo":t.get("logo",""),
                "date":fx2.get("date","")[:10] if fx2.get("date") else ""})
        except (KeyError,TypeError): continue
    _long_cache.set(key,out); return {"injuries":out}

@app.get("/api/injuries/team/{team_id}")
def get_team_injuries(team_id:int):
    key=f"injuries_team_{team_id}_{CURRENT_SEASON}"; hit=_long_cache.get(key)
    if hit: return {"injuries":hit}
    data=api_get("/injuries",{"team":team_id,"season":CURRENT_SEASON}); out=[]
    for entry in data.get("response",[]):
        try:
            p=entry["player"]
            out.append({"player_id":p.get("id"),"player_name":p.get("name",""),
                "player_photo":p.get("photo",""),"type":entry.get("type","Injury"),"reason":entry.get("reason","")})
        except (KeyError,TypeError): continue
    _long_cache.set(key,out); return {"injuries":out}

@app.get("/api/odds/{fixture_id}")
def get_fixture_odds(fixture_id:int):
    key=f"odds_{fixture_id}"; hit=_cache.get(key)
    if hit: return hit
    data=api_get("/odds",{"fixture":fixture_id}); bookmakers=[]
    resp_list = data.get("response") or [{}]
    for bk in resp_list[0].get("bookmakers",[])[:5]:
        bets={}
        for bet in bk.get("bets",[]):
            if bet["name"] in ("Match Winner","Goals Over/Under","Both Teams Score"):
                bets[bet["name"]]={v["value"]:v["odd"] for v in bet.get("values",[])}
        if bets: bookmakers.append({"name":bk.get("name",""),"bets":bets})
    out={"fixture_id":fixture_id,"bookmakers":bookmakers}; _cache.set(key,out); return out

@app.get("/api/apipred/{fixture_id}")
def get_api_prediction(fixture_id:int):
    key=f"apipred_{fixture_id}"; hit=_cache.get(key)
    if hit: return hit
    data=api_get("/predictions",{"fixture":fixture_id})
    resp_list=data.get("response") or [{}]; resp=resp_list[0]
    pred=resp.get("predictions",{}); teams=resp.get("teams",{}); comp=resp.get("comparison",{})
    out={"winner":pred.get("winner",{}).get("name",""),"winner_comment":pred.get("winner",{}).get("comment",""),
         "advice":pred.get("advice",""),"goals_home":pred.get("goals",{}).get("home",""),
         "goals_away":pred.get("goals",{}).get("away",""),"under_over":pred.get("under_over",""),
         "comparison":{"form":{"home":comp.get("form",{}).get("home",""),"away":comp.get("form",{}).get("away","")},
             "att":{"home":comp.get("att",{}).get("home",""),"away":comp.get("att",{}).get("away","")},
             "def":{"home":comp.get("def",{}).get("home",""),"away":comp.get("def",{}).get("away","")},
             "h2h":{"home":comp.get("h2h",{}).get("home",""),"away":comp.get("h2h",{}).get("away","")},
             "goals":{"home":comp.get("goals",{}).get("home",""),"away":comp.get("goals",{}).get("away","")},
             "total":{"home":comp.get("total",{}).get("home",""),"away":comp.get("total",{}).get("away","")}},
         "home_last5_form":teams.get("home",{}).get("last_5",{}).get("form",""),
         "away_last5_form":teams.get("away",{}).get("last_5",{}).get("form","")}
    _cache.set(key,out); return out

@app.get("/api/topscorers/{league}")
def get_top_scorers(league:str):
    if league not in LEAGUE_IDS: raise HTTPException(404,"Unknown league")
    key=f"topscorers_{league}_{CURRENT_SEASON}"; hit=_long_cache.get(key)
    if hit: return {"scorers":hit}
    data=api_get("/players/topscorers",{"league":LEAGUE_IDS[league],"season":CURRENT_SEASON}); out=[]
    for entry in data.get("response",[])[:15]:
        p=entry.get("player",{}); s=entry.get("statistics",[{}])[0]
        g=s.get("goals",{}); t=s.get("team",{}); ga=s.get("games",{})
        out.append({"player_id":p.get("id"),"name":p.get("name",""),"photo":p.get("photo",""),
            "team_name":t.get("name",""),"team_logo":t.get("logo",""),
            "goals":g.get("total",0) or 0,"assists":g.get("assists",0) or 0,
            "played":ga.get("appearences",0),"mins":ga.get("minutes",0) or 0,"nationality":p.get("nationality","")})
    _long_cache.set(key,out); return {"scorers":out}

@app.get("/api/topassists/{league}")
def get_top_assists(league:str):
    if league not in LEAGUE_IDS: raise HTTPException(404,"Unknown league")
    key=f"topassists_{league}_{CURRENT_SEASON}"; hit=_long_cache.get(key)
    if hit: return {"assists":hit}
    data=api_get("/players/topassists",{"league":LEAGUE_IDS[league],"season":CURRENT_SEASON}); out=[]
    for entry in data.get("response",[])[:15]:
        p=entry.get("player",{}); s=entry.get("statistics",[{}])[0]
        g=s.get("goals",{}); t=s.get("team",{}); ga=s.get("games",{})
        out.append({"player_id":p.get("id"),"name":p.get("name",""),"photo":p.get("photo",""),
            "team_name":t.get("name",""),"team_logo":t.get("logo",""),
            "assists":g.get("assists",0) or 0,"goals":g.get("total",0) or 0,"played":ga.get("appearences",0)})
    _long_cache.set(key,out); return {"assists":out}

@app.get("/api/league/{code}/predictions")
def league_predictions(code:str):
    code=code.lower().strip()
    if code not in LEAGUE_IDS: raise HTTPException(404,f"Unknown league: {code}")
    key=f"predictions_{code}_{CURRENT_SEASON}_v3"; hit=_cache.get(key)
    if hit: return hit
    lid=LEAGUE_IDS[code]; league_avg=LEAGUE_AVG_GOALS.get(lid,FALLBACK_AVG)
    elo=get_or_build_elo(code); upcoming=fetch_upcoming_fixtures(code,limit=10)
    predictions=[]
    for fx in upcoming:
        hid=fx.get("home_id"); aid=fx.get("away_id")
        hstats=fetch_team_stats_full(hid,lid) if hid else None
        astats=fetch_team_stats_full(aid,lid) if aid else None
        pred=predict_match(home_team=fx.get("home_team",""),away_team=fx.get("away_team",""),
            home_stats=hstats,away_stats=astats,league_avg=league_avg,elo=elo,
            home_team_id=hid or 0,away_team_id=aid or 0,
            fixture_date=fx.get("date","TBD"),fixture_time=fx.get("time",""),
            home_logo=fx.get("home_logo",""),away_logo=fx.get("away_logo",""))
        pred["fixture_id"]=fx.get("fixture_id"); pred["venue"]=fx.get("venue","")
        pred["referee"]=fx.get("referee",""); pred["home_id"]=hid; pred["away_id"]=aid
        if hstats: pred["home_stats"]=hstats
        if astats: pred["away_stats"]=astats
        predictions.append(pred)
    predictions.sort(key=lambda x:x["confidence"],reverse=True)
    result={"league_code":code,"league_name":LEAGUE_NAMES[code],
            "model":"Dixon-Coles Poisson + Elo + Real xG (v3)",
            "generated_at":datetime.now(timezone.utc).isoformat(),"predictions":predictions}
    _cache.set(key,result); return result

@app.get("/api/fixtures/{league}")
def get_fixtures(league:str, season:int=CURRENT_SEASON):
    if league not in LEAGUE_IDS: raise HTTPException(404,"Unknown league")
    today=datetime.now(timezone.utc).strftime("%Y-%m-%d")
    raw=api_get("/fixtures",{"league":LEAGUE_IDS[league],"season":season,"from":today,"to":f"{season+1}-06-30"})
    filtered=[fx for fx in raw.get("response",[]) if fx["fixture"]["status"]["short"] in ["NS","TBD","PST"]]
    raw["response"]=filtered[:20]; return raw

@app.get("/api/stats/{fixture_id}")
def get_fixture_stats(fixture_id:int): return api_get("/fixtures/statistics",{"fixture":fixture_id})

@app.get("/api/simulate/{league}")
def simulate_league(league:str):
    if league not in LEAGUE_IDS:
        raise HTTPException(404, f"Unknown league: {league}")
    try: return {"league":league,"results":monte_carlo_league(league)}
    except ValueError as e: raise HTTPException(404,str(e))


# ── Team Profile Bundle ───────────────────────────────────────────────────────
# Single endpoint that aggregates all team page data in one call.
# Avoids the frontend firing 5 parallel requests.
# Cache: 24h (standings + stats + injuries all change slowly).

@app.get("/api/team/{team_id}/profile")
def get_team_profile(team_id: int, league: str = "epl"):
    if league not in LEAGUE_IDS:
        raise HTTPException(404, f"Unknown league: {league}")

    cache_key = f"team_profile_{team_id}_{league}_{CURRENT_SEASON}"
    hit = _long_cache.get(cache_key)
    if hit:
        return hit

    lid = LEAGUE_IDS[league]

    # 1. Team stats (already cached 24h individually)
    stats = fetch_team_stats_full(team_id, lid)

    # 2. Standings — find this team's row
    standing_row = None
    try:
        rows = get_standings(league)["standings"]
        standing_row = next((r for r in rows if r["team_id"] == team_id), None)
    except Exception:
        pass

    # 3. Injuries (already cached 24h individually)
    injuries = []
    try:
        injuries = get_team_injuries(team_id)["injuries"]
    except Exception:
        pass

    # 4. Top scorers for the league — filter to this team
    team_scorers = []
    try:
        all_scorers = get_top_scorers(league)["scorers"]
        team_scorers = [s for s in all_scorers if s.get("team_name") == (standing_row or {}).get("team_name","")]
    except Exception:
        pass

    # 5. Top assists for the league — filter to this team
    team_assists = []
    try:
        all_assists = get_top_assists(league)["assists"]
        team_assists = [a for a in all_assists if a.get("team_name") == (standing_row or {}).get("team_name","")]
    except Exception:
        pass

    # 6. Upcoming fixtures — pull from predictions cache (already built)
    upcoming = []
    try:
        preds = league_predictions(league)["predictions"]
        upcoming = [
            {
                "home_team": p["home_team"],
                "away_team": p["away_team"],
                "home_logo": p["home_logo"],
                "away_logo": p["away_logo"],
                "fixture_date": p.get("fixture_date", "TBD"),
                "home_win_prob": p.get("home_win_prob", 0),
                "draw_prob": p.get("draw_prob", 0),
                "away_win_prob": p.get("away_win_prob", 0),
                "confidence": p.get("confidence", 0),
            }
            for p in preds
            if p.get("home_id") == team_id or p.get("away_id") == team_id
        ][:5]
    except Exception:
        pass

    result = {
        "team_id": team_id,
        "league": league,
        "league_name": LEAGUE_NAMES[league],
        "standing": standing_row,
        "stats": stats,
        "injuries": injuries,
        "top_scorers": team_scorers,
        "top_assists": team_assists,
        "upcoming_fixtures": upcoming,
    }

    _long_cache.set(cache_key, result)
    return result



# ── Live Ticker Endpoints ─────────────────────────────────────────────────────
# /api/live/summary  — 60s cache  → max 1,440 upstream calls/day
# /api/live/featured — 5min cache → max   288 upstream calls/day
# Total added: ~1,728/day, well within the 7,500/day limit.

_live_cache = TTLCache(ttl_seconds=60)
_feat_cache = TTLCache(ttl_seconds=300)

ALL_LEAGUE_IDS = list(LEAGUE_IDS.values())
LIVE_STATUS_SHORT = {"1H", "2H", "ET", "BT", "P", "INT", "HT"}


def _fetch_live_matches() -> list:
    """Single API call for all live fixtures across tracked leagues."""
    try:
        data = api_get("/fixtures", {"live": "all"}, timeout=12)
        matches = []
        for fx in data.get("response", []):
            lid = fx.get("league", {}).get("id")
            if lid not in ALL_LEAGUE_IDS:
                continue
            status  = fx.get("fixture", {}).get("status", {})
            short   = status.get("short", "")
            elapsed = status.get("elapsed") or 0
            teams   = fx.get("teams", {})
            goals   = fx.get("goals", {})
            league  = fx.get("league", {})
            events  = fx.get("events", [])

            home_id = teams.get("home", {}).get("id")
            away_id = teams.get("away", {}).get("id")

            reds_home = sum(
                1 for e in events
                if e.get("type") == "Card"
                and e.get("detail") in ("Red Card", "Second Yellow Card")
                and e.get("team", {}).get("id") == home_id
            )
            reds_away = sum(
                1 for e in events
                if e.get("type") == "Card"
                and e.get("detail") in ("Red Card", "Second Yellow Card")
                and e.get("team", {}).get("id") == away_id
            )

            matches.append({
                "fixture_id":  fx["fixture"]["id"],
                "status":      short,
                "elapsed":     elapsed,
                "home_team":   teams.get("home", {}).get("name", ""),
                "away_team":   teams.get("away", {}).get("name", ""),
                "home_logo":   teams.get("home", {}).get("logo", ""),
                "away_logo":   teams.get("away", {}).get("logo", ""),
                "home_goals":  goals.get("home") or 0,
                "away_goals":  goals.get("away") or 0,
                "reds_home":   reds_home,
                "reds_away":   reds_away,
                "league_name": league.get("name", ""),
                "is_live":     short in {"1H", "2H", "ET", "BT", "P", "INT"},
                "is_ht":       short == "HT",
            })
        return matches
    except Exception:
        return []


@app.get("/api/live/summary")
def get_live_summary():
    """
    Main ticker endpoint. 60s server-side cache shared by all users.
    Auto-detects live vs quiet mode. No extra API calls in quiet mode
    because it reuses already-cached prediction and standings data.
    """
    hit = _live_cache.get("live_summary")
    if hit:
        return hit

    live_matches = _fetch_live_matches()
    has_live = any(m["is_live"] or m["is_ht"] for m in live_matches)

    if has_live:
        chips = []
        for m in live_matches:
            if not (m["is_live"] or m["is_ht"]):
                continue
            time_label = "HT" if m["is_ht"] else f"{m['elapsed']}'"
            score = f"{m['home_goals']}\u2013{m['away_goals']}"
            red_suffix = ""
            if m["reds_home"]:
                red_suffix += f" [{m['home_team'][:3].upper()} R]"
            if m["reds_away"]:
                red_suffix += f" [{m['away_team'][:3].upper()} R]"
            chips.append({
                "type":       "live_score",
                "label":      f"{m['home_team']} {score} {m['away_team']}",
                "detail":     f"{time_label} \u00b7 {m['league_name']}{red_suffix}",
                "glow":       True,
                "fixture_id": m["fixture_id"],
                "home_logo":  m["home_logo"],
                "away_logo":  m["away_logo"],
                "home_goals": m["home_goals"],
                "away_goals": m["away_goals"],
                "elapsed":    m["elapsed"],
                "is_ht":      m["is_ht"],
                "reds_home":  m["reds_home"],
                "reds_away":  m["reds_away"],
            })
        result = {"mode": "live", "chips": chips, "match_count": len(chips)}

    else:
        chips = []

        # Upcoming fixtures — reuses 1h prediction cache, zero new API calls
        try:
            preds = league_predictions("epl").get("predictions", [])
            for p in preds[:3]:
                hw = round(p.get("home_win_prob", 0) * 100)
                aw = round(p.get("away_win_prob", 0) * 100)
                chips.append({
                    "type":     "upcoming",
                    "label":    f"{p['home_team']} vs {p['away_team']}",
                    "detail":   f"{p.get('fixture_date', 'TBD')} \u00b7 {hw}% / {aw}%",
                    "glow":     False,
                    "home_logo": p.get("home_logo", ""),
                    "away_logo": p.get("away_logo", ""),
                })
        except Exception:
            pass

        # Model edge — reuses cached predictions
        try:
            best_edge = None
            best_conf = 0
            for code in ["epl", "laliga", "seriea"]:
                for p in league_predictions(code).get("predictions", []):
                    if p.get("confidence", 0) > best_conf:
                        best_conf = p["confidence"]
                        best_edge = {**p, "_league": LEAGUE_NAMES[code]}
            if best_edge:
                hw = round(best_edge.get("home_win_prob", 0) * 100)
                aw = round(best_edge.get("away_win_prob", 0) * 100)
                winner = best_edge["home_team"] if hw >= aw else best_edge["away_team"]
                chips.append({
                    "type":   "model_edge",
                    "label":  f"Model Edge \u2192 {winner}",
                    "detail": f"{best_conf}% confidence \u00b7 {best_edge['_league']}",
                    "glow":   True,
                    "home_logo": best_edge.get("home_logo", ""),
                    "away_logo": best_edge.get("away_logo", ""),
                })
        except Exception:
            pass

        # Title race — reuses 24h standings cache
        try:
            rows = get_standings("epl")["standings"]
            if rows and len(rows) >= 2:
                leader = rows[0]
                second = rows[1]
                gap = leader["points"] - second["points"]
                chips.append({
                    "type":   "title_race",
                    "label":  f"Title Race: {leader['team_name']} lead by {gap}pts",
                    "detail": f"{second['team_name']} chasing \u00b7 Premier League",
                    "glow":   False,
                })
        except Exception:
            pass

        result = {"mode": "quiet", "chips": chips, "match_count": 0}

    _live_cache.set("live_summary", result)
    return result


@app.get("/api/live/featured")
def get_live_featured():
    """
    Top fixture per league. 5min cache. Reuses prediction cache — zero extra API calls.
    """
    hit = _feat_cache.get("live_featured")
    if hit:
        return hit

    featured = []
    for code in list(LEAGUE_IDS.keys()):
        try:
            preds = league_predictions(code).get("predictions", [])
            if not preds:
                continue
            top = max(preds, key=lambda x: x.get("confidence", 0))
            featured.append({
                "league":       LEAGUE_NAMES[code],
                "league_code":  code,
                "home_team":    top["home_team"],
                "away_team":    top["away_team"],
                "home_logo":    top.get("home_logo", ""),
                "away_logo":    top.get("away_logo", ""),
                "fixture_date": top.get("fixture_date", "TBD"),
                "confidence":   top.get("confidence", 0),
                "home_win_prob": top.get("home_win_prob", 0),
                "draw_prob":     top.get("draw_prob", 0),
                "away_win_prob": top.get("away_win_prob", 0),
                "xg_home":      top.get("expected_home_goals", 0),
                "xg_away":      top.get("expected_away_goals", 0),
            })
        except Exception:
            pass

    result = {"featured": featured, "count": len(featured)}
    _feat_cache.set("live_featured", result)
    return result


# ── News proxy (NewsAPI.org) ─────────────────────────────────────────────────
NEWS_API_KEY = os.getenv("NEWS_API_KEY")

LEAGUE_NEWS_QUERIES = {
    "epl":        "Premier League football",
    "laliga":     "La Liga football",
    "seriea":     "Serie A football",
    "ligue1":     "Ligue 1 football",
    "bundesliga": "Bundesliga football",
}

@app.get("/api/news/{league}")
def get_league_news(league: str):
    if not NEWS_API_KEY:
        return {"articles": [], "error": "NEWS_API_KEY not configured in .env"}
    query = LEAGUE_NEWS_QUERIES.get(league, "football news")
    url = "https://newsapi.org/v2/everything"
    params = {
        "q": query,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": 12,
        "apiKey": NEWS_API_KEY,
    }
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
        articles = [
            a for a in data.get("articles", [])
            if a.get("title") and a["title"] != "[Removed]"
        ][:10]
        return {"articles": articles}
    except Exception as e:
        raise HTTPException(502, f"News fetch failed: {str(e)}")


# ── AI Article Generator ─────────────────────────────────────────────────────
from pydantic import BaseModel

class PromptRequest(BaseModel):
    prompt: str

# IMPORTANT: key is loaded from environment only — never hardcoded here.
# Set OPENROUTER_API_KEY in Render dashboard → Environment Variables.
OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY", "")

@app.post("/api/ai/generate")
def generate_ai_text(body: PromptRequest):
    if not OPENROUTER_KEY:
        raise HTTPException(503, "OPENROUTER_API_KEY not configured on server")
    try:
        r = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {OPENROUTER_KEY}",
                "HTTP-Referer": "https://www.statinsite.com",
                "X-Title": "StatinSite",
            },
            json={
                "model": "meta-llama/llama-3.1-8b-instruct:free",
                "max_tokens": 1100,
                "temperature": 0.7,
                "messages": [{"role": "user", "content": body.prompt}],
            },
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        return {"text": text}
    except requests.HTTPError as e:
        raise HTTPException(502, f"OpenRouter error: {e.response.text[:300]}")
    except Exception as e:
        raise HTTPException(502, f"AI generation failed: {str(e)}")


# ══════════════════════════════════════════════════════════════════════════════
# INTELLIGENCE FEED  —  /api/intelligence/feed
# ══════════════════════════════════════════════════════════════════════════════

import random

TRANSFER_KEYWORDS = [
    "transfer", "signing", "deal", "bid", "loan", "fee", "move",
    "joins", "agrees", "contract", "swap", "approached", "medical",
    "completes", "seals", "unveiled",
]

LEAGUE_FULL = {
    "epl":        "Premier League",
    "laliga":     "La Liga",
    "seriea":     "Serie A",
    "ligue1":     "Ligue 1",
    "bundesliga": "Bundesliga",
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def _form_string(stats: dict, side: str) -> str:
    if not stats:
        return "unknown form"
    ph = stats.get("played_home", 0)
    pa = stats.get("played_away", 0)
    played = ph + pa
    if played == 0:
        return "no data"
    sh = stats.get("scored_home", 0) + stats.get("scored_away", 0)
    ca = stats.get("conceded_home", 0) + stats.get("conceded_away", 0)
    gpg = round(sh / max(played, 1), 2)
    cpg = round(ca / max(played, 1), 2)
    cs  = stats.get("clean_sheets", 0)
    poss = stats.get("possession_avg", 50)
    shots = stats.get("shots_pg", 0)
    formation = stats.get("formation", "")
    lines = []
    lines.append(f"averaging {gpg} goals per game")
    lines.append(f"conceding {cpg} per match")
    if cs:
        lines.append(f"{cs} clean sheets this season")
    if poss:
        lines.append(f"{poss}% average possession")
    if shots:
        lines.append(f"{shots} shots per game")
    if formation:
        lines.append(f"typically lining up in a {formation}")
    return ", ".join(lines)

def _classify_article(title: str, description: str) -> str:
    text = f"{title} {description}".lower()
    if any(k in text for k in TRANSFER_KEYWORDS):
        return "transfer"
    return "headline"

def _winner_label(home: str, away: str, hw: int, dw: int, aw: int) -> str:
    if hw > aw and hw > dw:
        return f"{home} Win ({hw}%)"
    elif aw > hw and aw > dw:
        return f"{away} Win ({aw}%)"
    else:
        return f"Draw ({dw}%)"

def _confidence_prose(conf: int) -> str:
    if conf >= 75:
        return "a high-confidence call"
    elif conf >= 60:
        return "a moderate-confidence selection"
    else:
        return "a close, hard-to-call fixture"

def _xg_prose(xgh: float, xga: float, home: str, away: str) -> str:
    diff = xgh - xga
    if diff > 0.6:
        return (f"The model projects a clear attacking edge for the home side, "
                f"with an expected goals split of {xgh} to {xga} in {home}'s favour.")
    elif diff < -0.6:
        return (f"Despite playing away, {away} carry stronger attacking threat in the model, "
                f"with projected xG of {xga} versus {xgh} for the home side.")
    else:
        return (f"The expected goals projection is closely contested at {xgh}–{xga}, "
                f"underlining just how tight this match could be on the day.")

def _ordinal(n: int) -> str:
    if 11 <= (n % 100) <= 13:
        return f"{n}th"
    return f"{n}{['th','st','nd','rd','th'][min(n % 10, 4)]}"


# ── Article Builders ──────────────────────────────────────────────────────────

def _build_preview_article(p: dict, league_code: str, standings: list) -> dict:
    home = p.get("home_team", "")
    away = p.get("away_team", "")
    date = p.get("fixture_date", "TBD")
    hw   = round(p.get("home_win_prob", 0) * 100)
    dw   = round(p.get("draw_prob", 0) * 100)
    aw   = round(p.get("away_win_prob", 0) * 100)
    conf = p.get("confidence", 0)
    xgh  = round(p.get("expected_home_goals", 0), 2)
    xga  = round(p.get("expected_away_goals", 0), 2)
    hstats = p.get("home_stats") or {}
    astats = p.get("away_stats") or {}
    league_name = LEAGUE_FULL.get(league_code, league_code)
    pred_label  = _winner_label(home, away, hw, dw, aw)
    conf_prose  = _confidence_prose(conf)
    xg_prose    = _xg_prose(xgh, xga, home, away)

    home_rank = away_rank = home_pts = away_pts = None
    for row in standings:
        if row.get("team_name") == home:
            home_rank = row.get("rank"); home_pts = row.get("points")
        if row.get("team_name") == away:
            away_rank = row.get("rank"); away_pts = row.get("points")

    standings_line = ""
    if home_rank and away_rank:
        standings_line = (
            f"{home} currently sit {_ordinal(home_rank)} in the {league_name} "
            f"with {home_pts} points, while {away} are {_ordinal(away_rank)} "
            f"with {away_pts} points."
        )

    home_form = _form_string(hstats, "home")
    away_form = _form_string(astats, "away")

    if hw > aw + 15:
        title = f"{home} vs {away}: Home Dominance Expected in {league_name} Clash"
    elif aw > hw + 15:
        title = f"{home} vs {away}: {away} Travel as Favourites"
    elif abs(hw - aw) <= 8:
        title = f"{home} vs {away}: {league_name} Showdown Too Close to Call"
    else:
        title = f"{home} vs {away}: {league_name} Preview"

    standfirst = (
        f"StatinSite's Dixon-Coles model rates this {conf_prose}, "
        f"projecting {pred_label} on {date}."
    )

    body = []
    if standings_line:
        body.append(standings_line + (
            f" The fixture takes place on {date} and carries significant weight "
            f"in the {league_name} standings."
        ))
    else:
        body.append(
            f"This {league_name} fixture on {date} presents an interesting matchup "
            f"between two sides with contrasting recent trajectories."
        )
    if home_form and home_form != "no data":
        body.append(
            f"{home} come into this match {home_form}. "
            + (f"Their home record this season has been a key asset, "
               f"with {hstats.get('scored_home', 0)} goals scored in "
               f"{hstats.get('played_home', 0)} home outings."
               if hstats.get("played_home") else "")
        )
    if away_form and away_form != "no data":
        body.append(
            f"{away}, meanwhile, arrive {away_form}. "
            + (f"On the road this campaign they have scored "
               f"{astats.get('scored_away', 0)} goals in "
               f"{astats.get('played_away', 0)} away matches."
               if astats.get("played_away") else "")
        )
    body.append(xg_prose)
    body.append(
        f"The model assigns a {hw}% probability to a {home} victory, "
        f"{dw}% to a draw, and {aw}% to {away} claiming all three points. "
        f"With a confidence rating of {conf}%, this is {conf_prose} for the StatinSite model."
    )
    if hw >= 55:
        verdict = (
            f"Home advantage and the underlying numbers both point toward {home}. "
            f"Unless {away} can disrupt the rhythm early, expect {home} to control proceedings."
        )
    elif aw >= 55:
        verdict = (
            f"{away}'s away form and model edge suggest they are capable of taking "
            f"something from this fixture. A disciplined performance could see them leave "
            f"with all three points."
        )
    else:
        verdict = (
            f"With probabilities this evenly split, neither side holds a commanding advantage. "
            f"This looks set to be a tightly contested affair where small margins will decide the outcome."
        )
    body.append(f"**Verdict:** {verdict}")

    return {
        "id": f"preview_{league_code}_{home}_{away}".replace(" ", "_"),
        "type": "match_preview",
        "source_type": "internal",
        "league": league_code,
        "title": title,
        "standfirst": standfirst,
        "summary": f"{pred_label} · xG {xgh}–{xga} · {conf}% confidence",
        "body": body,
        "published_at": datetime.now(timezone.utc).isoformat(),
        "url": f"/predictions/{league_code}",
        "image": None,
        "source": "StatinSite Model",
        "meta": {
            "home_team": home, "away_team": away,
            "home_win": hw, "draw": dw, "away_win": aw,
            "xg_home": xgh, "xg_away": xga, "confidence": conf,
            "fixture_date": date, "prediction": pred_label,
            "home_logo": p.get("home_logo", ""), "away_logo": p.get("away_logo", ""),
        },
    }


def _build_title_race_article(league_code: str, standings: list, predictions: list) -> dict:
    league_name = LEAGUE_FULL.get(league_code, league_code)
    if not standings or len(standings) < 3:
        return None
    leader = standings[0]; second = standings[1]; third = standings[2]
    gap12 = leader["points"] - second["points"]
    gap23 = second["points"] - third["points"]
    played = leader.get("played", 0); gd = leader.get("goal_diff", 0)
    form = leader.get("form", "")
    top_pred = max(predictions, key=lambda x: x.get("confidence", 0)) if predictions else None

    if gap12 >= 10:
        title = f"{leader['team_name']} Pull Clear: {league_name} Title Race All But Over"
    elif gap12 <= 2:
        title = f"{league_name} Title Race: {leader['team_name']} and {second['team_name']} Locked in Battle"
    else:
        title = f"{league_name} Title Race: {leader['team_name']} Hold {gap12}-Point Lead"

    standfirst = (
        f"{leader['team_name']} lead {league_name} with {leader['points']} points "
        f"after {played} games, {gap12} points clear of {second['team_name']}."
    )
    body = []
    body.append(
        f"{leader['team_name']} remain at the summit of {league_name} with "
        f"{leader['points']} points from {played} matches, their goal difference "
        f"of {'+' if gd >= 0 else ''}{gd} underlining their dominance this campaign."
    )
    body.append(
        f"{second['team_name']} occupy second place with {second['points']} points, "
        f"{gap12} point{'s' if gap12 != 1 else ''} adrift of the leaders. "
        + (f"{third['team_name']} sit a further {gap23} point{'s' if gap23 != 1 else ''} back in third, "
           f"keeping the race for European places competitive."
           if gap23 <= 5 else
           f"The gap to {third['team_name']} in third stands at {gap23} points, "
           f"suggesting the podium picture is already fairly settled.")
    )
    if form:
        recent = list(form[-5:])
        wins = recent.count("W"); draws = recent.count("D"); losses = recent.count("L")
        body.append(
            f"Recent form for {leader['team_name']} reads "
            f"{'–'.join(recent)} across their last five outings "
            f"({wins}W {draws}D {losses}L), "
            + ("a run that suggests they are hitting their stride at the right moment."
               if wins >= 3 else
               "a mixed sequence that has allowed the chasing pack to keep the pressure on.")
        )
    if top_pred:
        body.append(
            f"Looking ahead, the StatinSite model's highest-confidence fixture this "
            f"gameweek is {top_pred.get('home_team','')} vs {top_pred.get('away_team','')} "
            f"({top_pred.get('confidence',0)}% confidence, "
            f"projected xG {round(top_pred.get('expected_home_goals',0),2)}–"
            f"{round(top_pred.get('expected_away_goals',0),2)}). Results from key fixtures "
            f"like this could yet reshape the top of the table."
        )
    remaining = max(38 - played, 0)
    if gap12 >= 10 and remaining < 15:
        verdict = (
            f"With {remaining} games remaining and a {gap12}-point cushion, "
            f"{leader['team_name']} are in the driving seat. Barring a dramatic collapse, "
            f"the {league_name} title looks destined for {leader['team_name']}."
        )
    elif gap12 <= 3:
        verdict = (
            f"At just {gap12} point{'s' if gap12 != 1 else ''} separating the top two, "
            f"this title race is far from settled. Every fixture between now and the end "
            f"of the season carries enormous weight."
        )
    else:
        verdict = (
            f"{leader['team_name']} hold a meaningful advantage, but {second['team_name']} "
            f"will not give up without a fight. The next head-to-head fixture between these "
            f"sides could prove pivotal."
        )
    body.append(f"**Model Verdict:** {verdict}")

    return {
        "id": f"insight_titlerace_{league_code}",
        "type": "model_insight",
        "source_type": "internal",
        "league": league_code,
        "title": title,
        "standfirst": standfirst,
        "summary": f"{leader['team_name']} lead by {gap12}pts. {second['team_name']} are closest challengers.",
        "body": body,
        "published_at": datetime.now(timezone.utc).isoformat(),
        "url": f"/predictions/{league_code}",
        "image": None,
        "source": "StatinSite Model",
        "meta": {
            "insight_type": "title_race",
            "leader": leader["team_name"], "second": second["team_name"],
            "leader_pts": leader["points"], "gap": gap12,
        },
    }


def _build_upset_alert(predictions: list, league_code: str) -> dict | None:
    league_name = LEAGUE_FULL.get(league_code, league_code)
    upsets = [
        p for p in predictions
        if p.get("away_win_prob", 0) > 0.55 and p.get("confidence", 0) >= 60
    ]
    if not upsets:
        return None
    p    = max(upsets, key=lambda x: x.get("away_win_prob", 0))
    home = p.get("home_team", ""); away = p.get("away_team", "")
    aw   = round(p.get("away_win_prob", 0) * 100); hw = round(p.get("home_win_prob", 0) * 100)
    conf = p.get("confidence", 0)
    xgh  = round(p.get("expected_home_goals", 0), 2); xga = round(p.get("expected_away_goals", 0), 2)
    date = p.get("fixture_date", "TBD")
    body = [
        f"StatinSite's model is flagging {away}'s trip to {home} on {date} "
        f"as one of the most interesting fixtures in the {league_name} this gameweek. "
        f"Despite playing away from home, {away} are rated as {aw}% favourites.",
        f"The expected goals projection ({xgh}–{xga} in {away}'s favour) suggests the "
        f"travelling side carry a genuine attacking edge. {home} are rated at only {hw}% "
        f"to win on their own patch — a significant disadvantage.",
        f"With {conf}% model confidence, this is a fixture where backing the away side "
        f"offers strong statistical value. Keep an eye on {away}'s early rhythm — "
        f"if they establish control in the opening exchanges, {home} could struggle to respond.",
        f"**Model Edge:** {away} Away Win at {aw}% probability. xG edge: {xga} vs {xgh}. "
        f"Confidence: {conf}%.",
    ]
    return {
        "id": f"upset_{league_code}_{home}_{away}".replace(" ", "_"),
        "type": "model_insight",
        "source_type": "internal",
        "league": league_code,
        "title": f"Model Edge: {away} Favoured to Win Away at {home}",
        "standfirst": (
            f"StatinSite's model rates {away} as {aw}% favourites despite "
            f"visiting {home} in {league_name} on {date}."
        ),
        "summary": f"{away} Away Win {aw}% · xG {xgh}–{xga} · Confidence {conf}%",
        "body": body,
        "published_at": datetime.now(timezone.utc).isoformat(),
        "url": f"/predictions/{league_code}",
        "image": None,
        "source": "StatinSite Model",
        "meta": {
            "insight_type": "upset_alert",
            "home_team": home, "away_team": away,
            "away_win_prob": aw, "xg_home": xgh, "xg_away": xga,
            "confidence": conf, "fixture_date": date,
            "home_logo": p.get("home_logo", ""), "away_logo": p.get("away_logo", ""),
        },
    }


def _build_form_article(standings: list, league_code: str) -> dict | None:
    league_name = LEAGUE_FULL.get(league_code, league_code)
    if not standings or len(standings) < 5:
        return None
    hot  = sorted([s for s in standings if s.get("form","").count("W") >= 3],
                  key=lambda x: -x.get("form","").count("W"))
    cold = [s for s in standings if s.get("form","").count("L") >= 3]
    if not hot:
        return None
    best = hot[0]; best_wins = best.get("form","").count("W")
    title = f"{best['team_name']} Flying: {league_name} Form Table Analysed"
    standfirst = (
        f"{best['team_name']} have won {best_wins} of their last five in {league_name}, "
        f"making them the division's form team heading into the next round of fixtures."
    )
    body = [
        f"The {league_name} form table makes for interesting reading as the season enters "
        f"a pivotal phase. While the top of the standings tells one story, recent results "
        f"reveal which clubs are building momentum — and which are beginning to wobble.",
        f"{best['team_name']} stand out as the division's in-form side, having won "
        f"{best_wins} of their last five league outings. Sitting {_ordinal(best['rank'])} "
        f"in the table with {best['points']} points, their recent run suggests they are "
        f"peaking at an important stage of the campaign.",
    ]
    if len(hot) >= 2:
        runner = hot[1]; runner_wins = runner.get("form","").count("W")
        body.append(
            f"{runner['team_name']} are also in strong recent form, picking up {runner_wins} wins "
            f"in their last five. Currently {_ordinal(runner['rank'])} with {runner['points']} points, "
            f"they represent one of the more dangerous propositions in the division right now."
        )
    if cold:
        struggler = cold[0]; struggler_losses = struggler.get("form","").count("L")
        body.append(
            f"At the other end of the form spectrum, {struggler['team_name']} have endured a "
            f"difficult recent run, losing {struggler_losses} of their last five. "
            f"Sitting {_ordinal(struggler['rank'])} with {struggler['points']} points, "
            f"pressure is beginning to mount on the squad and coaching staff."
        )
    body.append(
        f"**StatinSite Outlook:** The model accounts for recent form weighting in its Dixon-Coles "
        f"calculations. Clubs on strong winning runs benefit from elevated Elo ratings, which feeds "
        f"directly into upcoming fixture predictions. {best['team_name']}'s current trajectory "
        f"makes them a team to watch in the StatinSite model's top picks this week."
    )
    return {
        "id": f"form_{league_code}_{best['team_name'].replace(' ','_')}",
        "type": "model_insight",
        "source_type": "internal",
        "league": league_code,
        "title": title,
        "standfirst": standfirst,
        "summary": f"{best['team_name']} lead the {league_name} form table with {best_wins} wins in 5.",
        "body": body,
        "published_at": datetime.now(timezone.utc).isoformat(),
        "url": f"/predictions/{league_code}",
        "image": None,
        "source": "StatinSite Analysis",
        "meta": {
            "insight_type": "title_race",
            "leader": best["team_name"], "leader_pts": best["points"], "gap": best_wins,
            "second": hot[1]["team_name"] if len(hot) >= 2 else "",
        },
    }


def _build_defence_article(standings: list, predictions: list, league_code: str) -> dict | None:
    league_name = LEAGUE_FULL.get(league_code, league_code)
    if not standings or len(standings) < 5:
        return None
    by_defence = sorted(
        [s for s in standings if s.get("played", 0) >= 10],
        key=lambda x: x.get("goals_against", 999)
    )
    if not by_defence:
        return None
    best = by_defence[0]; ga = best.get("goals_against", 0)
    played = max(best.get("played", 1), 1); cpg = round(ga / played, 2)
    title = f"Defensive Dominance: {best['team_name']} Conceding Just {cpg} Per Game in {league_name}"
    standfirst = (
        f"With only {ga} goals conceded in {played} matches, {best['team_name']} boast "
        f"the meanest defence in {league_name} — and the model rewards them for it."
    )
    body = [
        f"In a division that can be merciless in front of goal, {best['team_name']} have "
        f"built their campaign on a defensive foundation that few rivals can match. "
        f"Just {ga} goals conceded in {played} {league_name} matches gives them a "
        f"miserly average of {cpg} per game — the best in the division.",
    ]
    if len(by_defence) >= 2:
        second = by_defence[1]
        body.append(
            f"{second['team_name']} are the nearest challengers defensively, having "
            f"conceded {second.get('goals_against', 0)} goals in {second.get('played', 1)} games. "
            f"The gap between these two sides and the rest of the division's defences is notable."
        )
    body.append(
        f"The StatinSite model incorporates both attacking and defensive metrics when "
        f"projecting match outcomes. {best['team_name']}'s low goals-against tally feeds "
        f"into a reduced xG-against estimate for their upcoming fixtures, giving them a "
        f"structural edge that goes beyond raw league position."
    )
    if predictions:
        upcoming = next(
            (p for p in predictions if best["team_name"] in (p.get("home_team",""), p.get("away_team",""))),
            None
        )
        if upcoming:
            opp  = upcoming.get("away_team") if upcoming.get("home_team") == best["team_name"] else upcoming.get("home_team")
            date = upcoming.get("fixture_date","")
            body.append(
                f"Next up for {best['team_name']}: a {league_name} clash with {opp} on {date}. "
                f"Their defensive record makes them difficult to score against even for well-organised opponents."
            )
    body.append(
        f"**Model View:** {best['team_name']}'s defensive numbers are among the key drivers "
        f"of their high confidence ratings in StatinSite predictions. Teams that don't concede "
        f"don't lose — and the model's Elo system has taken notice."
    )
    return {
        "id": f"defence_{league_code}_{best['team_name'].replace(' ','_')}",
        "type": "model_insight",
        "source_type": "internal",
        "league": league_code,
        "title": title,
        "standfirst": standfirst,
        "summary": f"{best['team_name']} lead {league_name} with just {ga} goals conceded in {played} games.",
        "body": body,
        "published_at": datetime.now(timezone.utc).isoformat(),
        "url": f"/predictions/{league_code}",
        "image": None,
        "source": "StatinSite Analysis",
        "meta": {
            "insight_type": "title_race",
            "leader": best["team_name"], "leader_pts": best.get("points", 0),
            "gap": by_defence[1].get("goals_against", 0) - ga if len(by_defence) >= 2 else 0,
            "second": by_defence[1]["team_name"] if len(by_defence) >= 2 else "",
        },
    }


def _build_top_pick_article(predictions: list, league_code: str, standings: list) -> dict | None:
    league_name = LEAGUE_FULL.get(league_code, league_code)
    if not predictions:
        return None
    top  = max(predictions, key=lambda x: x.get("confidence", 0))
    conf = top.get("confidence", 0)
    if conf < 60:
        return None
    home   = top.get("home_team", ""); away = top.get("away_team", "")
    hw     = round(top.get("home_win_prob", 0) * 100); dw = round(top.get("draw_prob", 0) * 100)
    aw     = round(top.get("away_win_prob", 0) * 100)
    xgh    = round(top.get("expected_home_goals", 0), 2); xga = round(top.get("expected_away_goals", 0), 2)
    date   = top.get("fixture_date", "TBD")
    hstats = top.get("home_stats") or {}; astats = top.get("away_stats") or {}
    pred_label = _winner_label(home, away, hw, dw, aw)
    home_rank = away_rank = home_pts = away_pts = None
    for row in standings:
        if row.get("team_name") == home:
            home_rank = row.get("rank"); home_pts = row.get("points")
        if row.get("team_name") == away:
            away_rank = row.get("rank"); away_pts = row.get("points")
    title = f"Banker of the Week: {pred_label} in {league_name}"
    standfirst = (
        f"StatinSite's model identifies {home} vs {away} as the highest-confidence "
        f"pick in {league_name} this week at {conf}% — here's the full breakdown."
    )
    body = [
        f"Every gameweek, the StatinSite model scans upcoming {league_name} fixtures "
        f"and flags the pick where it has the most analytical conviction. This week, that "
        f"honour goes to {home} vs {away} on {date}, where the model is operating at "
        f"{conf}% confidence — {_confidence_prose(conf)}.",
    ]
    if home_rank and away_rank:
        body.append(
            f"{home} ({_ordinal(home_rank)}, {home_pts} pts) host {away} "
            f"({_ordinal(away_rank)}, {away_pts} pts). "
            + _xg_prose(xgh, xga, home, away)
        )
    else:
        body.append(_xg_prose(xgh, xga, home, away))
    home_form = _form_string(hstats, "home")
    if home_form and home_form != "no data":
        body.append(
            f"On the home side, {home} have been {home_form} this season. "
            f"Their {hstats.get('scored_home', 0)} home goals and "
            f"{hstats.get('possession_avg', 50)}% average possession reflect "
            f"a side capable of controlling games on their own patch."
        )
    away_form = _form_string(astats, "away")
    if away_form and away_form != "no data":
        body.append(
            f"{away} arrive {away_form}. "
            f"Their {astats.get('formation', 'system')} setup has yielded "
            f"{astats.get('scored_away', 0)} away goals this campaign, "
            f"but the model expects them to be on the back foot here."
        )
    body.append(
        f"Win probability breakdown: {home} {hw}% · Draw {dw}% · {away} {aw}%. "
        f"The model's projected scoreline sits around {xgh}–{xga} in expected goals terms. "
        f"A {conf}% confidence rating places this firmly in the top tier of StatinSite's weekly selections."
    )
    body.append(
        f"**Banker Verdict:** {pred_label}. "
        f"The combination of home advantage, superior xG projection, and Elo rating differential "
        f"all point in the same direction. This is the model's strongest call in {league_name} this week."
    )
    return {
        "id": f"banker_{league_code}_{home}_{away}".replace(" ", "_"),
        "type": "model_insight",
        "source_type": "internal",
        "league": league_code,
        "title": title,
        "standfirst": standfirst,
        "summary": f"{pred_label} · {conf}% confidence · xG {xgh}–{xga}",
        "body": body,
        "published_at": datetime.now(timezone.utc).isoformat(),
        "url": f"/predictions/{league_code}",
        "image": None,
        "source": "StatinSite Model",
        "meta": {
            "insight_type": "title_race",
            "leader": home if hw > aw else away,
            "second": away if hw > aw else home,
            "leader_pts": conf, "gap": abs(hw - aw),
        },
    }


def _build_external_article(a: dict) -> dict:
    t = a.get("title", ""); d = a.get("description", "") or ""
    content = a.get("content", "") or ""
    summary_text = content[:600] if len(content) > len(d) else d
    return {
        "id": f"ext_{hash(t) & 0xFFFFFF}",
        "type": _classify_article(t, d),
        "source_type": "external",
        "league": "multi",
        "title": t,
        "standfirst": d[:200] if d else "",
        "summary": summary_text[:400] if summary_text else d[:200],
        "body": [],
        "published_at": a.get("publishedAt", ""),
        "url": a.get("url", ""),
        "image": a.get("urlToImage", ""),
        "source": a.get("source", {}).get("name", ""),
        "author": a.get("author", ""),
        "meta": None,
    }


# ── AI Enhancement ───────────────────────────────────────────────────────────

def _try_ai_enhance(article: dict) -> dict:
    """
    Attempt to rewrite the article body paragraphs using OpenRouter LLM.
    Falls back to the template body silently on any error or missing key.
    The article dict is mutated in-place and returned.
    """
    if not OPENROUTER_KEY:
        return article

    title = article.get("title", "")
    standfirst = article.get("standfirst", "")
    template_body = article.get("body", [])
    if not template_body:
        return article

    # Build a tight prompt so the model knows exactly what to produce
    template_text = "\n\n".join(template_body)
    prompt = (
        f"You are a football journalist writing for StatinSite, a professional football analytics platform. "
        f"Rewrite the following article body in a sharper, more editorial style — like The Athletic or FiveThirtyEight. "
        f"Keep all statistics and facts exactly as stated. Do not add new facts. "
        f"Preserve any **bold** markers at the start of verdict paragraphs. "
        f"Return ONLY the rewritten paragraphs separated by blank lines. No preamble, no title, no sign-off.\n\n"
        f"ARTICLE TITLE: {title}\n"
        f"STANDFIRST: {standfirst}\n\n"
        f"BODY TO REWRITE:\n{template_text}"
    )

    try:
        r = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_KEY}",
                "HTTP-Referer": "https://www.statinsite.com",
                "X-Title": "StatinSite",
                "Content-Type": "application/json",
            },
            json={
                "model": "meta-llama/llama-3.1-8b-instruct:free",
                "max_tokens": 900,
                "temperature": 0.6,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=14,
        )
        r.raise_for_status()
        text = r.json()["choices"][0]["message"]["content"].strip()
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        if paragraphs:
            article["body"] = paragraphs
            article["ai_enhanced"] = True
    except Exception:
        pass  # Always fall back to template — never crash the feed

    return article


# ── Intelligence Health Check ─────────────────────────────────────────────────

@app.get("/api/intelligence/health")
def intelligence_health():
    """Debug endpoint — confirms which API keys are present on the server."""
    return {
        "api_football_key": "set" if API_KEY else "MISSING",
        "news_api_key": "set" if NEWS_API_KEY else "MISSING",
        "openrouter_key": "set" if OPENROUTER_KEY else "not set",
        "season": CURRENT_SEASON,
        "leagues": list(LEAGUE_IDS.keys()),
    }


# ── Main Feed Endpoint ────────────────────────────────────────────────────────

@app.get("/api/intelligence/feed")
def get_intelligence_feed(leagues: str = "epl,laliga,seriea,bundesliga,ligue1"):
    """
    Intelligence feed v5 — clean, no duplicates.
    Per league: preview + banker + title race + form + defence + upset alert.
    External: 3 NewsAPI queries, no image filter.
    """
    cache_key = f"intel_v5_{leagues}"
    hit = _cache.get(cache_key)
    if hit:
        return hit

    league_list = [l.strip() for l in leagues.split(",") if l.strip() in LEAGUE_IDS]
    feed_items: List[dict] = []

    for code in league_list[:3]:
        try:
            preds_resp = league_predictions(code)
            predictions = preds_resp.get("predictions", [])
        except Exception:
            predictions = []

        try:
            standings = get_standings(code)["standings"]
        except Exception:
            standings = []

        if predictions:
            try:
                top_p = max(predictions, key=lambda x: x.get("confidence", 0))
                feed_items.append(_try_ai_enhance(_build_preview_article(top_p, code, standings)))
            except Exception:
                pass

        try:
            b = _build_top_pick_article(predictions, code, standings)
            if b:
                feed_items.append(_try_ai_enhance(b))
        except Exception:
            pass

        try:
            tr = _build_title_race_article(code, standings, predictions)
            if tr:
                feed_items.append(_try_ai_enhance(tr))
        except Exception:
            pass

        try:
            fa = _build_form_article(standings, code)
            if fa:
                feed_items.append(_try_ai_enhance(fa))
        except Exception:
            pass

        try:
            da = _build_defence_article(standings, predictions, code)
            if da:
                feed_items.append(_try_ai_enhance(da))
        except Exception:
            pass

        try:
            ua = _build_upset_alert(predictions, code)
            if ua:
                feed_items.append(_try_ai_enhance(ua))
        except Exception:
            pass

    # External headlines — 3 queries, no image filter
    seen_ids: set = {x["id"] for x in feed_items}
    if NEWS_API_KEY:
        for query in [
            "Premier League football news",
            "La Liga Serie A Bundesliga football",
            "football transfer signing deal",
        ]:
            try:
                r = requests.get(
                    "https://newsapi.org/v2/everything",
                    params={
                        "q": query,
                        "language": "en",
                        "sortBy": "publishedAt",
                        "pageSize": 10,
                        "apiKey": NEWS_API_KEY,
                    },
                    timeout=8,
                )
                r.raise_for_status()
                for a in r.json().get("articles", []):
                    if not a.get("title") or a["title"] == "[Removed]":
                        continue
                    built = _build_external_article(a)
                    if built["id"] not in seen_ids:
                        feed_items.append(built)
                        seen_ids.add(built["id"])
            except Exception:
                pass

    type_order = {"match_preview": 0, "model_insight": 1, "transfer": 2, "headline": 3}

    def _sort_key(item):
        return (
            type_order.get(item.get("type", "headline"), 3),
            0 if item.get("source_type") == "internal" else 1,
            item.get("published_at", ""),
        )

    feed_items.sort(key=_sort_key)

    result = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "count": len(feed_items),
        "schema_version": "v5",
        "items": feed_items,
    }
    _cache.set(cache_key, result)
    return result