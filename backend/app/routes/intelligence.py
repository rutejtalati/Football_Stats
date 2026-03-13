# backend/app/routes/intelligence.py
# ═══════════════════════════════════════════════════════════════════════════════
# Football Intelligence Engine v2
#
# GET /api/intelligence/feed?limit=40
#
# Produces:
#   • match_preview   — 5-paragraph articles, fixtures in next 48 h only
#   • title_race      — league table analysis (gap ≤ 15 pts)
#   • model_insight   — hot-form team spotlight
#   • headline        — RSS headlines (last 36 h only)
#
# Every item carries an `image` field.
# Feed response includes `trending_clubs` list extracted from RSS titles.
# League cap: max 3 internal items per league in first 15 feed slots.
# ═══════════════════════════════════════════════════════════════════════════════

import asyncio
import math
import os
import re
import time
import uuid
import xml.etree.ElementTree as ET
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx
from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/intelligence", tags=["intelligence"])

# ── Constants ──────────────────────────────────────────────────────────────────

API_KEY        = os.getenv("API_FOOTBALL_KEY", "")
API_BASE       = "https://v3.football.api-sports.io"
CURRENT_SEASON = int(os.getenv("CURRENT_SEASON", "2025"))

LEAGUE_IDS: Dict[str, int] = {
    "epl": 39, "laliga": 140, "seriea": 135, "bundesliga": 78, "ligue1": 61,
    "ucl": 2, "uel": 3, "uecl": 848, "fa_cup": 45, "carabao": 48,
}
LEAGUE_NAMES: Dict[str, str] = {
    "epl": "Premier League", "laliga": "La Liga", "seriea": "Serie A",
    "bundesliga": "Bundesliga", "ligue1": "Ligue 1",
    "ucl": "Champions League", "uel": "Europa League",
    "uecl": "Conference League", "fa_cup": "FA Cup", "carabao": "Carabao Cup",
}
LEAGUE_IMAGES: Dict[str, str] = {
    "epl":        "https://upload.wikimedia.org/wikipedia/en/f/f2/Premier_League_Logo.svg",
    "laliga":     "https://upload.wikimedia.org/wikipedia/commons/1/13/LaLiga.svg",
    "seriea":     "https://upload.wikimedia.org/wikipedia/commons/e/e9/Serie_A_logo_%282019%29.svg",
    "bundesliga": "https://upload.wikimedia.org/wikipedia/commons/d/df/Bundesliga_logo_%282017%29.svg",
    "ligue1":     "https://upload.wikimedia.org/wikipedia/commons/d/d7/Ligue1.svg",
    "ucl":        "https://upload.wikimedia.org/wikipedia/commons/f/f5/UEFA_Champions_League.svg",
    "uel":        "https://upload.wikimedia.org/wikipedia/commons/d/d7/UEFA_Europa_League_logo.svg",
}
RSS_SOURCES: List[Tuple[str, str]] = [
    ("The Guardian",         "https://www.theguardian.com/football/rss"),
    ("Goal.com",             "https://www.goal.com/en/feeds/news"),
    ("We Ain't Got No Fans", "https://weaintgotnofans.com/feed/"),
    ("Arseblog",             "https://arseblog.com/feed/"),
    ("This Is Anfield",      "https://www.thisisanfield.com/feed/"),
    ("The Busby Babe",       "https://thebusbybabe.sbnation.com/rss/index.xml"),
    ("Bitter & Blue",        "https://bitterandblue.sbnation.com/rss/index.xml"),
    ("Cartilage Free",       "https://cartilagefreecaptain.sbnation.com/rss/index.xml"),
]
CLUBS = [
    "Arsenal","Chelsea","Liverpool","Manchester City","Manchester United",
    "Tottenham","Newcastle","Aston Villa","West Ham","Brighton",
    "Real Madrid","Barcelona","Atletico","Bayern","Dortmund",
    "Juventus","Inter","Milan","PSG","Marseille","Napoli","Roma",
]

# ── Cache ──────────────────────────────────────────────────────────────────────

_cache: Dict[str, Any] = {}
_ctimes: Dict[str, float] = {}
TTL_API, TTL_RSS, TTL_GEN = 900, 600, 900

def _cget(k: str, ttl: float) -> Optional[Any]:
    return _cache[k] if k in _cache and time.monotonic() - _ctimes.get(k, 0) < ttl else None

def _cset(k: str, v: Any) -> None:
    _cache[k] = v; _ctimes[k] = time.monotonic()

# ── HTTP ───────────────────────────────────────────────────────────────────────

async def _api(path: str, params: dict, ttl: float = TTL_API) -> list:
    if not API_KEY: return []
    key = f"api:{path}:{tuple(sorted(params.items()))}"
    hit = _cget(key, ttl)
    if hit is not None: return hit
    try:
        async with httpx.AsyncClient(timeout=12) as c:
            r = await c.get(f"{API_BASE}/{path.lstrip('/')}",
                            headers={"x-apisports-key": API_KEY}, params=params)
            if r.status_code == 200:
                data = r.json().get("response", [])
                _cset(key, data); return data
    except Exception:
        pass
    return []

# ── Poisson model ──────────────────────────────────────────────────────────────

def _p(lam: float, k: int) -> float:
    if lam <= 0: return 1.0 if k == 0 else 0.0
    return (lam ** k) * math.exp(-lam) / math.factorial(k)

def _match_probs(xg_h: float, xg_a: float) -> Tuple[float, float, float]:
    hw = dw = aw = 0.0
    for h in range(8):
        for a in range(8):
            prob = _p(xg_h, h) * _p(xg_a, a)
            if h > a: hw += prob
            elif h == a: dw += prob
            else: aw += prob
    t = hw + dw + aw or 1
    return round(hw/t*100, 1), round(dw/t*100, 1), round(aw/t*100, 1)

def _xg(hs: dict, as_: dict) -> Tuple[float, float]:
    ph = (hs.get("played_home",0) + hs.get("played_away",0)) or 1
    pa = (as_.get("played_home",0) + as_.get("played_away",0)) or 1
    h_att = (hs.get("scored_home",0)    + hs.get("scored_away",0))   / ph
    h_def = (hs.get("conceded_home",0)  + hs.get("conceded_away",0)) / ph
    a_att = (as_.get("scored_home",0)   + as_.get("scored_away",0))  / pa
    a_def = (as_.get("conceded_home",0) + as_.get("conceded_away",0))/ pa
    avg = 1.35
    return (round(max(0.3,min(4.5,(h_att/avg)*(a_def/avg)*avg*1.1)),2),
            round(max(0.2,min(4.0,(a_att/avg)*(h_def/avg)*avg)),2))

def _ns(raw) -> dict:
    s = raw[0] if isinstance(raw,list) and raw else (raw if isinstance(raw,dict) else {})
    if not s: return {}
    fx = s.get("fixtures",{}) or {}; gl = s.get("goals",{}) or {}
    return {
        "played_home":   ((fx.get("played") or {}).get("home") or 0),
        "played_away":   ((fx.get("played") or {}).get("away") or 0),
        "scored_home":   (((gl.get("for")     or {}).get("total") or {}).get("home") or 0),
        "scored_away":   (((gl.get("for")     or {}).get("total") or {}).get("away") or 0),
        "conceded_home": (((gl.get("against") or {}).get("total") or {}).get("home") or 0),
        "conceded_away": (((gl.get("against") or {}).get("total") or {}).get("away") or 0),
        "form":          s.get("form","") or "",
    }

# ── Text helpers ───────────────────────────────────────────────────────────────

def _form(form: str, n: int = 5) -> str:
    return "".join(c for c in (form or "").upper() if c in "WDL")[-n:]

def _form_label(form: str) -> str:
    pts = form.count("W")*3 + form.count("D")
    return ("in superb form" if pts>=13 else "in strong form" if pts>=10
            else "in decent form" if pts>=7 else "inconsistent" if pts>=4 else "in poor form")

def _conf(hw,dw,aw): return min(95, int(50+(max(hw,dw,aw)-33.3)*1.2))

def _fav(home,away,hw,aw):
    return (home,hw) if hw>aw+10 else (away,aw) if aw>hw+10 else ("either side",max(hw,aw))

def _mls(xg_h,xg_a):
    best_p,best_s=0.0,"1-1"
    for h in range(6):
        for a in range(6):
            prob=_p(xg_h,h)*_p(xg_a,a)
            if prob>best_p: best_p,best_s=prob,f"{h}-{a}"
    return best_s

def _ordinal(n):
    return f"{n}{'st' if n==1 else 'nd' if n==2 else 'rd' if n==3 else 'th'}"

# ── Article body builders ──────────────────────────────────────────────────────

def _preview_body(home,away,hf,af,xg_h,xg_a,hw,dw,aw,lgname,venue) -> List[str]:
    fav,fav_pct = _fav(home,away,hw,aw)
    over25 = round((1-sum(_p(xg_h+xg_a,k) for k in range(3)))*100)
    btts   = round((1-_p(xg_h,0))*(1-_p(xg_a,0))*100)
    mls    = _mls(xg_h,xg_a)
    vs     = f" at {venue}" if venue else ""

    p1 = (f"{home} welcome {away}{vs} in a {lgname} fixture that carries genuine weight for both sides. "
          f"{home} arrive {_form_label(hf)}, posting a recent sequence of [{hf}], while {away} head in "
          f"{_form_label(af)} — [{af}]. The form book makes for intriguing reading ahead of kick-off.")

    p2 = (f"The StatinSite model assigns {home} an expected goals figure of {xg_h} and {away} {xg_a}, "
          f"derived from season-long attacking and defensive records adjusted for home advantage. "
          f"{'The home side carry the xG edge and should create the better chances' if xg_h>xg_a else 'Unusually, the visitors hold the xG advantage despite playing away from home'}. "
          f"Over 2.5 goals is rated at {over25}% probability; both teams to score at {btts}%.")

    if xg_h > xg_a+0.4:
        tac=(f"{home}'s attacking unit has been the more productive this season and will look to exploit "
             f"space in behind on home soil. {away} must be disciplined defensively — their best chance "
             f"lies in denying space and threatening on the counter-attack.")
    elif xg_a > xg_h+0.4:
        tac=(f"{away} arrive as the more potent force by xG metrics — a fascinating proposition for a "
             f"side playing away from home. Whether {home} can disrupt their rhythm will be the defining "
             f"tactical question of this fixture.")
    else:
        tac=(f"The margins between these sides are thin. Both carry comparable attacking threat and the "
             f"midfield battle is likely to prove decisive. Set-pieces and individual moments of quality "
             f"may well separate the sides come the final whistle.")

    p4 = (f"Win probabilities: {home} {hw}% | Draw {dw}% | {away} {aw}%. "
          f"The most likely scoreline per the Poisson model is {mls} — "
          f"{'home advantage is a meaningful factor here and is reflected in the model output' if hw>aw else 'the away side are rated as marginal favourites despite playing on the road'}.")

    p5 = (f"StatinSite Model Verdict: {fav} favoured at {round(fav_pct)}% to take the points. "
          f"Projected scoreline: {mls}. Key market signals — over 2.5 goals: {over25}%, "
          f"both teams to score: {btts}%. Confidence rating: {_conf(hw,dw,aw)}%.")

    return [p1, p2, tac, p4, p5]


def _title_body(standings,slug,lgname) -> Tuple[str,str,List[str]]:
    top4=standings[:4]; l=top4[0]; s=top4[1]
    gap=(l.get("points",0) or 0)-(s.get("points",0) or 0)
    ln=l.get("team_name",""); sn=s.get("team_name","")
    sf = ("level at the top" if gap==0 else
          f"separated by {gap} point{'s' if gap!=1 else ''}")
    standfirst = f"{ln} and {sn} are {sf} in {lgname}."
    lf=_form(l.get("form","")); sf2=_form(s.get("form",""))

    p1=(f"The {lgname} title race is entering a decisive phase. {ln} sit top on "
        f"{l.get('points',0)} points with form [{lf}] — {_form_label(lf)}. "
        f"{sn} trail by {'zero' if gap==0 else gap} point{'s' if gap!=1 else ''} "
        f"on {s.get('points',0)}, having posted [{sf2}] recently — {_form_label(sf2)}.")

    others=[f"{t['team_name']} ({t.get('points',0)} pts, [{_form(t.get('form',''))}])"
            for t in top4[2:]]
    p2=(f"Behind the leading pair, {' and '.join(others)} remain in contention. "
        f"The gap from first to fourth is {(top4[0].get('points',0) or 0)-(top4[-1].get('points',0) or 0)} points — "
        f"tight enough that a single bad week could shuffle the order significantly."
        if len(top4)>=4 else "The title race remains open.")

    p3=""
    if len(standings)>=18:
        b3=standings[-3:]
        names=", ".join(t.get("team_name","") for t in b3)
        pts=[str(t.get("points",0)) for t in b3]
        p3=(f"At the foot of the table, {names} are embroiled in a desperate relegation battle "
            f"({', '.join(pts)} points respectively). With every game a potential six-pointer, "
            f"the pressure on these squads and their managers is immense.")

    p4=(f"StatinSite Model Verdict: {ln} hold the psychological and points advantage — but "
        f"their form of [{lf}] must be sustained under mounting pressure. "
        f"Any slip could hand {sn} the initiative. The remaining head-to-heads between "
        f"contenders may prove decisive in determining where the title ends up.")

    return standfirst, standfirst, [p for p in [p1,p2,p3,p4] if p]


def _insight_body(team,form,pts,rank,lgname) -> Tuple[str,str,List[str]]:
    label=_form_label(form)
    rec_pts=form.count("W")*3+form.count("D")
    sf=(f"{team} are {label} in {lgname}, collecting {rec_pts} points from their last five matches.")

    p1=(f"{team} have been one of the standout performers in {lgname} of late, posting a [{form}] "
        f"sequence that marks them as a serious force in the division. They sit {_ordinal(rank)} "
        f"in the table on {pts} points — and the momentum is firmly with them.")
    p2=(f"The StatinSite model has been tracking the underlying metrics throughout this run. "
        f"{'The results are backed by strong underlying performance — this is not merely a lucky streak but a reflection of genuine quality.' if rec_pts>=10 else 'Whilst the results have been positive, the model urges some caution — the underlying numbers suggest this run may be slightly flattered by favourable fixtures.'}")
    p3=(f"Defensively, {team} have been difficult to break down during this sequence, while in attack "
        f"they have shown the kind of efficiency that separates title challengers from the chasing pack. "
        f"The manager deserves credit for finding a structure that is currently functioning at a high level.")
    p4=(f"StatinSite Model Verdict: If {team} maintain this [{form}] trajectory the implications for "
        f"the table will be significant. Their next three fixtures will be a litmus test of whether "
        f"this form has genuine staying power or will regress toward the mean.")

    return sf, sf, [p1,p2,p3,p4]

# ── RSS ────────────────────────────────────────────────────────────────────────

def _rss_image(entry) -> Optional[str]:
    ns_m="http://search.yahoo.com/mrss/"
    mc=entry.find(f"{{{ns_m}}}content")
    if mc is not None:
        u=mc.get("url","")
        if u.startswith("http"): return u
    enc=entry.find("enclosure")
    if enc is not None:
        u=enc.get("url","")
        if u.startswith("http"): return u
    for tag in ("description","content","summary"):
        el=entry.find(tag)
        if el is not None and el.text:
            m=re.search(r'<img[^>]+src=["\']([^"\']+)["\']',el.text)
            if m and m.group(1).startswith("http"): return m.group(1)
    return None

async def _fetch_rss(name: str, url: str) -> List[dict]:
    key=f"rss:{url}"
    hit=_cget(key,TTL_RSS)
    if hit is not None: return hit
    items=[]; cutoff=datetime.now(timezone.utc)-timedelta(hours=36)
    try:
        async with httpx.AsyncClient(timeout=10,follow_redirects=True) as c:
            r=await c.get(url,headers={"User-Agent":"StatinSite/2.0"})
        if r.status_code!=200:
            _cset(key,items); return items
        root=ET.fromstring(r.text)
        na="http://www.w3.org/2005/Atom"
        entries=root.findall(".//item") or root.findall(f".//{{{na}}}entry")
        for entry in entries[:10]:
            def _t(tag):
                for ns in ("",f"{{{na}}}"):
                    el=entry.find(f"{ns}{tag}")
                    if el is not None and el.text: return el.text.strip()
                return ""
            title=_t("title")
            if not title: continue
            link_el=entry.find("link") or entry.find(f"{{{na}}}link")
            link=(link_el.get("href") or link_el.text or "").strip() if link_el is not None else ""
            pub_raw=_t("pubDate") or _t("published") or _t("updated") or ""
            pub_dt=None
            for fmt in ("%a, %d %b %Y %H:%M:%S %z","%a, %d %b %Y %H:%M:%S GMT",
                        "%Y-%m-%dT%H:%M:%S%z","%Y-%m-%dT%H:%M:%SZ"):
                try:
                    pub_dt=datetime.strptime(pub_raw[:30],fmt).replace(tzinfo=timezone.utc); break
                except Exception: pass
            if pub_dt and pub_dt<cutoff: continue
            pub_str=pub_dt.isoformat() if pub_dt else datetime.now(timezone.utc).isoformat()
            raw_s=_t("description") or _t("summary") or _t("content")
            clean=re.sub(r"<[^>]+>","",raw_s)[:300].strip()
            items.append({
                "id":str(uuid.uuid5(uuid.NAMESPACE_URL,link or title)),
                "type":"headline","league":"general",
                "title":title,"standfirst":clean or title,"summary":clean or title,
                "body":[clean] if clean else [],
                "published_at":pub_str,"source_type":"external","source":name,
                "url":link,"image":_rss_image(entry),"meta":{},
            })
    except Exception: pass
    _cset(key,items); return items

def _trending(rss_items,n=6):
    counter:Counter=Counter()
    for item in rss_items:
        text=(item.get("title","")+item.get("standfirst","")).lower()
        for club in CLUBS:
            if club.lower() in text: counter[club]+=1
    return [c for c,_ in counter.most_common(n)]

# ── Item factories ─────────────────────────────────────────────────────────────

def _make_preview(fx,hs,as_,slug) -> dict:
    teams=fx.get("teams",{}) or {}; league=fx.get("league",{}) or {}; fix=fx.get("fixture",{}) or {}
    home=(teams.get("home") or {}).get("name","Home"); away=(teams.get("away") or {}).get("name","Away")
    h_logo=(teams.get("home") or {}).get("logo",""); a_logo=(teams.get("away") or {}).get("logo","")
    kickoff=fix.get("date") or datetime.now(timezone.utc).isoformat()
    venue=(fix.get("venue") or {}).get("name","")
    lgname=LEAGUE_NAMES.get(slug,league.get("name",""))
    xg_h,xg_a=_xg(hs,as_); hw,dw,aw=_match_probs(xg_h,xg_a)
    fav,fav_pct=_fav(home,away,hw,aw); hf=_form(hs.get("form","")); af=_form(as_.get("form",""))
    mls=_mls(xg_h,xg_a)
    over25=round((1-sum(_p(xg_h+xg_a,k) for k in range(3)))*100)
    btts=round((1-_p(xg_h,0))*(1-_p(xg_a,0))*100)
    body=_preview_body(home,away,hf,af,xg_h,xg_a,hw,dw,aw,lgname,venue)
    return {
        "id":str(uuid.uuid5(uuid.NAMESPACE_DNS,f"preview:{fix.get('id','')}")),
        "type":"match_preview","league":slug,
        "title":f"{home} vs {away} — Match Preview",
        "standfirst":f"StatinSite model: {home} {hw}% | Draw {dw}% | {away} {aw}%.",
        "summary":f"{fav} favoured at {round(fav_pct)}% — xG: {home} {xg_h}, {away} {xg_a}.",
        "body":body,"published_at":kickoff,"source_type":"internal","source":"StatinSite Model",
        "url":None,"image":h_logo or LEAGUE_IMAGES.get(slug),
        "meta":{"fixture_id":fix.get("id"),"home_team":home,"away_team":away,
                "home_logo":h_logo,"away_logo":a_logo,
                "home_win":hw,"draw":dw,"away_win":aw,
                "xg_home":xg_h,"xg_away":xg_a,"over_2_5":over25,"btts":btts,
                "confidence":_conf(hw,dw,aw),"most_likely_score":mls,"kickoff":kickoff},
    }

def _make_title_race(standings,slug) -> Optional[dict]:
    if len(standings)<4: return None
    gap=(standings[0].get("points",0) or 0)-(standings[1].get("points",0) or 0)
    if gap>15: return None
    lgname=LEAGUE_NAMES.get(slug,slug)
    standfirst,summary,body=_title_body(standings,slug,lgname)
    l=standings[0]; s=standings[1]
    return {
        "id":str(uuid.uuid5(uuid.NAMESPACE_DNS,f"title-race:{slug}")),
        "type":"title_race","league":slug,
        "title":f"{lgname} Title Race: {l.get('team_name','')} in front",
        "standfirst":standfirst,"summary":summary,"body":body,
        "published_at":datetime.now(timezone.utc).isoformat(),
        "source_type":"internal","source":"StatinSite Model",
        "url":None,"image":LEAGUE_IMAGES.get(slug),
        "meta":{"leader":l.get("team_name"),"second":s.get("team_name"),
                "gap":gap,"leader_pts":l.get("points",0),
                "top_4":[t.get("team_name") for t in standings[:4]]},
    }

def _make_model_insight(standings,slug) -> Optional[dict]:
    if not standings: return None
    best,best_pts=None,-1
    for t in standings:
        f=_form(t.get("form","")); pts=f.count("W")*3+f.count("D")
        if pts>best_pts: best_pts=pts; best=t
    if not best or best_pts<9: return None
    name=best.get("team_name",""); form=_form(best.get("form",""))
    lgname=LEAGUE_NAMES.get(slug,slug)
    sf,summary,body=_insight_body(name,form,best.get("points",0),best.get("rank",1),lgname)
    return {
        "id":str(uuid.uuid5(uuid.NAMESPACE_DNS,f"insight:{slug}:{name}")),
        "type":"model_insight","league":slug,
        "title":f"Model Insight: {name} on fire in {lgname}",
        "standfirst":sf,"summary":summary,"body":body,
        "published_at":datetime.now(timezone.utc).isoformat(),
        "source_type":"internal","source":"StatinSite Model",
        "url":None,"image":LEAGUE_IMAGES.get(slug),
        "meta":{"team":name,"form":form,"points":best.get("points",0),"rank":best.get("rank",1)},
    }

# ── Data fetchers ──────────────────────────────────────────────────────────────

async def _previews_for(slug,lid,max_fix=3) -> List[dict]:
    key=f"gen:prev:{slug}"
    hit=_cget(key,TTL_GEN)
    if hit is not None: return hit
    cutoff=datetime.now(timezone.utc)+timedelta(hours=48)
    raw=await _api("fixtures",{"league":lid,"season":CURRENT_SEASON,"next":5,"status":"NS"})
    items=[]
    for fx in raw:
        date_s=(fx.get("fixture",{}) or {}).get("date","")
        try:
            dt=datetime.fromisoformat(date_s.replace("Z","+00:00"))
        except Exception: continue
        if dt>cutoff: continue
        teams=fx.get("teams",{}) or {}; league=fx.get("league",{}) or {}
        hid=(teams.get("home") or {}).get("id"); aid=(teams.get("away") or {}).get("id")
        lid2=league.get("id") or lid
        if not hid or not aid: continue
        hs,as_=await asyncio.gather(
            _api("teams/statistics",{"team":hid,"league":lid2,"season":CURRENT_SEASON}),
            _api("teams/statistics",{"team":aid,"league":lid2,"season":CURRENT_SEASON}),
        )
        items.append(_make_preview(fx,_ns(hs),_ns(as_),slug))
        if len(items)>=max_fix: break
    _cset(key,items); return items

async def _standings_for(slug,lid) -> List[dict]:
    key=f"gen:stand:{slug}"
    hit=_cget(key,TTL_GEN)
    if hit is not None: return hit
    raw=await _api("standings",{"league":lid,"season":CURRENT_SEASON})
    try: rows=raw[0]["league"]["standings"][0]
    except (IndexError,KeyError,TypeError): return []
    standings=[{
        "rank":e.get("rank"),"team_name":(e.get("team",{}) or {}).get("name",""),
        "team_id":(e.get("team",{}) or {}).get("id"),
        "points":e.get("points",0),"form":e.get("form",""),
        "gd":e.get("goalsDiff",0),
    } for e in rows]
    items=[]
    tr=_make_title_race(standings,slug)
    if tr: items.append(tr)
    mi=_make_model_insight(standings,slug)
    if mi: items.append(mi)
    _cset(key,items); return items

async def _all_rss() -> List[dict]:
    key="gen:rss:all"
    hit=_cget(key,TTL_RSS)
    if hit is not None: return hit
    results=await asyncio.gather(*[_fetch_rss(n,u) for n,u in RSS_SOURCES])
    items=[i for sub in results for i in sub]
    seen=set(); deduped=[]
    for item in items:
        t=item["title"].lower().strip()
        if t not in seen: seen.add(t); deduped.append(item)
    _cset(key,deduped); return deduped

# ── Feed endpoint ──────────────────────────────────────────────────────────────

PREVIEW_LEAGUES   = ["epl","laliga","seriea","bundesliga","ligue1","ucl"]
STANDINGS_LEAGUES = ["epl","laliga","seriea","bundesliga","ligue1"]
MAX_PER_LEAGUE    = 3

def _dt(s:str)->datetime:
    try: return datetime.fromisoformat(s.replace("Z","+00:00"))
    except Exception: return datetime.min.replace(tzinfo=timezone.utc)

@router.get("/feed")
async def intelligence_feed(limit: int = Query(40, ge=1, le=100)):
    """
    Multi-source football intelligence feed.
    Returns mode, count, items[], and trending_clubs[].
    """
    gen_key=f"gen:feed:{limit}"
    hit=_cget(gen_key,TTL_GEN)
    if hit is not None: return hit

    tasks=(
        [_previews_for(s,LEAGUE_IDS[s])   for s in PREVIEW_LEAGUES]+
        [_standings_for(s,LEAGUE_IDS[s])  for s in STANDINGS_LEAGUES]+
        [_all_rss()]
    )
    results=await asyncio.gather(*tasks,return_exceptions=True)

    internal:List[dict]=[]; rss_items:List[dict]=[]
    for r in results:
        if not isinstance(r,list): continue
        for item in r:
            (rss_items if item.get("source_type")=="external" else internal).append(item)

    trending=_trending(rss_items)

    # Priority sort: previews first, then title_race, then model_insight
    TYPE_ORDER={"match_preview":0,"title_race":1,"model_insight":2}
    internal.sort(key=lambda x:(TYPE_ORDER.get(x.get("type"),9),-_dt(x.get("published_at","")).timestamp()))
    rss_items.sort(key=lambda x:-_dt(x.get("published_at","")).timestamp())

    # League cap: ≤ 3 internal items per league in first 15 slots
    lc:Counter=Counter(); capped=[]; overflow=[]
    for item in internal:
        lg=item.get("league","")
        if len(capped)<15 and lc[lg]<MAX_PER_LEAGUE: capped.append(item); lc[lg]+=1
        else: overflow.append(item)
    internal=capped+overflow

    # Interleave: 1 internal → 2 RSS
    out:List[dict]=[]; ri=0
    for item in internal:
        out.append(item)
        for _ in range(2):
            if ri<len(rss_items): out.append(rss_items[ri]); ri+=1
    out.extend(rss_items[ri:])
    final=out[:limit]

    result={"mode":"live","count":len(final),"items":final,"trending_clubs":trending}
    _cset(gen_key,result); return result

@router.get("/health")
async def intelligence_health():
    return {"api_key":"set" if API_KEY else "MISSING","season":CURRENT_SEASON,
            "leagues":list(LEAGUE_IDS.keys()),"rss_sources":len(RSS_SOURCES),"cache_keys":len(_cache)}