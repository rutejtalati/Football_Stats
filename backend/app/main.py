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
    pass  # python-dotenv not installed â€” env vars must be set manually

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

# â”€â”€ Bundesliga added (API-Football league ID: 78) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
LEAGUE_IDS = {
    "epl":        39,
    "laliga":     140,
    "seriea":     135,
    "ligue1":     61,
    "bundesliga": 78,   # â† ADDED
}
LEAGUE_NAMES = {
    "epl":        "Premier League",
    "laliga":     "La Liga",
    "seriea":     "Serie A",
    "ligue1":     "Ligue 1",
    "bundesliga": "Bundesliga",   # â† ADDED
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
        out.append({"rank":e.get("rank"),"team_id":t.get("id"),"team_name":t.get("name","â€”"),
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

# â”€â”€ Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    # Ensure bundesliga is supported â€” season_simulator must also know it
    if league not in LEAGUE_IDS:
        raise HTTPException(404, f"Unknown league: {league}")
    try: return {"league":league,"results":monte_carlo_league(league)}
    except ValueError as e: raise HTTPException(404,str(e))


# â”€â”€ News proxy (NewsAPI.org) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
NEWS_API_KEY = os.getenv("NEWS_API_KEY")

LEAGUE_NEWS_QUERIES = {
    "epl":        "Premier League football",
    "laliga":     "La Liga football",
    "seriea":     "Serie A football",
    "ligue1":     "Ligue 1 football",
    "bundesliga": "Bundesliga football",   # â† ADDED
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


# â”€â”€ AI Article Generator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Calls OpenRouter from the backend â€” no CORS issues on frontend.
# FREE models available at openrouter.ai (no credit card needed).
# Set OPENROUTER_API_KEY in Render environment variables.
from pydantic import BaseModel

class PromptRequest(BaseModel):
    prompt: str

OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY", "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")

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

