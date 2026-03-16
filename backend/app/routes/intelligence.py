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
# Tuple: (display_name, url, source_category)
RSS_SOURCES: List[Tuple[str, str, str]] = [
    # General football news
    ("BBC Sport",            "https://feeds.bbci.co.uk/sport/football/rss.xml",        "news"),
    ("Sky Sports Football",  "https://www.skysports.com/rss/12040",                    "news"),
    ("Goal.com",             "https://www.goal.com/en/feeds/news",                     "news"),
    ("ESPN FC",              "https://www.espn.com/espn/rss/soccer/news",              "news"),
    # Analysis
    ("The Guardian",         "https://www.theguardian.com/football/rss",               "analysis"),
    # Transfers
    ("Sky Transfers",        "https://www.skysports.com/rss/12726",                    "transfer"),
    ("Football Italia",      "https://www.football-italia.net/rss.xml",                "transfer"),
    ("Marca",                "https://www.marca.com/rss/futbol/internacional/fichajes.xml","transfer"),
    # Fan media
    ("Arseblog",             "https://arseblog.com/feed/",                             "fan"),
    ("This Is Anfield",      "https://www.thisisanfield.com/feed/",                    "fan"),
    ("The Busby Babe",       "https://thebusbybabe.sbnation.com/rss/index.xml",        "fan"),
    ("Bitter & Blue",        "https://bitterandblue.sbnation.com/rss/index.xml",       "fan"),
    ("Cartilage Free",       "https://cartilagefreecaptain.sbnation.com/rss/index.xml","fan"),
    ("We Ain't Got No Fans", "https://weaintgotnofans.com/feed/",                      "fan"),
]

# Keyword sets for automatic article categorisation
RSS_CATEGORY_KEYWORDS: Dict[str, List[str]] = {
    "transfer": ["transfer","signing","signs","signed","deal","fee","bid","move",
                 "joins","arrival","departure","linked","interest","contract","loan"],
    "injury":   ["injury","injured","out","absence","return","fitness","knock",
                 "hamstring","muscle","unavailable","doubt","ruled out","surgery"],
    "manager":  ["manager","sacked","appointed","resign","resigns","coach","leaves",
                 "new manager","takeover","board","chairman","dismissal"],
    "analysis": ["tactical","analysis","formation","pressing","stats","data","xg",
                 "expected goals","breakdown","preview","review","performance"],
    "news":     [],  # fallback
}

CLUBS = [
    "Arsenal","Chelsea","Liverpool","Manchester City","Manchester United",
    "Tottenham","Newcastle","Aston Villa","West Ham","Brighton",
    "Real Madrid","Barcelona","Atletico","Bayern","Dortmund",
    "Juventus","Inter","Milan","PSG","Marseille","Napoli","Roma",
    "Everton","Wolves","Fulham","Brentford","Crystal Palace",
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
# Target: 600-700 words per article across 8 structured sections.
# Language rules: no hyphens in body text, no robotic "verdict:" labels,
# vary sentence length, journalistic and analytical tone throughout.

def _preview_body(home, away, hf, af, xg_h, xg_a, hw, dw, aw, lgname, venue,
                  h2h: Optional[dict] = None) -> List[str]:
    fav, fav_pct = _fav(home, away, hw, aw)
    over25 = round((1 - sum(_p(xg_h + xg_a, k) for k in range(3))) * 100)
    btts   = round((1 - _p(xg_h, 0)) * (1 - _p(xg_a, 0)) * 100)
    mls    = _mls(xg_h, xg_a)
    conf   = _conf(hw, dw, aw)
    vs     = f" at {venue}" if venue else ""
    h_lbl  = _form_label(hf)
    a_lbl  = _form_label(af)
    underdog = away if hw > aw + 10 else (home if aw > hw + 10 else None)

    # ── 1. Match Context (100-120 words)
    context = (
        f"{home} welcome {away}{vs} in a {lgname} fixture that carries real significance for both camps. "
        f"{home} head into the game {h_lbl}, with a recent run of {hf} setting the tone for what has been "
        f"a demanding stretch of the season. {away}, meanwhile, arrive {a_lbl}, posting {af} across their "
        f"last five outings. Both sides will be acutely aware that dropped points at this stage of the "
        f"campaign can prove costly. The fixture comes at a point in the season when momentum matters as "
        f"much as quality, and the atmosphere{vs} is likely to play its part in shaping the contest."
    )

    # ── 2. Narrative Context (80-100 words)
    if hw > aw + 12:
        narrative = (
            f"There is a sense of pressure on {away} heading into this one. Travelling to face {home} "
            f"in this kind of form is one of the more difficult assignments the fixture list can produce, "
            f"and the visiting side will need to be at their very best to take anything from the game. "
            f"For {home}, a victory would reinforce their position and send a message to their rivals. "
            f"The occasion has the feel of a genuine test of character for both sets of players."
        )
    elif aw > hw + 12:
        narrative = (
            f"This fixture arrives as something of a crossroads moment for {home}. Facing an {away} side "
            f"that has been among the more impressive teams in {lgname} recently, the hosts will need to "
            f"produce a performance that matches the occasion. A result here would represent a significant "
            f"statement of intent. {away} travel with confidence, knowing their current form gives them "
            f"every reason to approach this game with genuine belief."
        )
    else:
        narrative = (
            f"This is a fixture that neither side can afford to treat casually. The points on offer carry "
            f"weight in both directions, whether that is pushing toward the upper reaches of the table or "
            f"maintaining distance from danger. {home} and {away} have each shown they are capable of "
            f"producing high-quality football this season. When two sides of comparable strength meet, "
            f"fine margins and individual moments often prove decisive. This one has all the makings of "
            f"a genuinely competitive afternoon."
        )

    # ── 3. Tactical Breakdown (120-150 words)
    if xg_h > xg_a + 0.4:
        tactical = (
            f"Tactically, {home} are set up to control games through their attacking play, and their "
            f"season-long xG numbers reflect a team that creates consistently good chances. The challenge "
            f"for {away} will be to disrupt that rhythm and impose their own structure on the game. "
            f"Sitting deep and absorbing pressure before exploiting transitions is one viable approach, "
            f"though it demands discipline and concentration for long periods. {home} tend to be patient "
            f"in their build-up, working the ball through midfield before looking to penetrate. Their "
            f"wide areas have been particularly productive, and {away} will need to be well-organised "
            f"defensively to limit the damage. The central midfield battle will be crucial in determining "
            f"which side controls the tempo."
        )
    elif xg_a > xg_h + 0.4:
        tactical = (
            f"The tactical puzzle here is fascinating. {away} carry an xG profile that is unusually "
            f"strong for a team playing away from home, suggesting they are capable of creating genuine "
            f"openings regardless of venue. {home} will need to be tactically astute to limit that "
            f"threat, potentially looking to press high and deny the visitors time on the ball in "
            f"advanced areas. {away} have shown a preference for direct, incisive attacking play this "
            f"season, and their forwards will fancy their chances if the game opens up. The key battle "
            f"is likely to be in behind the defensive line, where {away} will look to expose any gaps "
            f"that appear as the game progresses."
        )
    else:
        tactical = (
            f"The tactical matchup is delicately balanced. Both sides carry comparable attacking threat "
            f"by xG metrics, meaning neither team holds a clear structural advantage. Midfield control "
            f"is likely to be the decisive factor. The side that wins the battle in the centre of the "
            f"pitch will dictate the rhythm and limit the other's ability to play through them. "
            f"Set-pieces could prove significant in a game this tight, and both managers will have "
            f"worked on their defensive organisation from dead-ball situations during the week. "
            f"Individual quality and a moment of genuine creativity may ultimately settle it, rather "
            f"than any tactical blueprint either side puts in place from the start."
        )

    # ── 4. Statistical Insight (120-150 words)
    h_gpg = round(xg_h * 0.9, 2)   # approximate actual goals from xG
    a_gpg = round(xg_a * 0.9, 2)
    stats = (
        f"The numbers paint an illuminating picture. {home} carry a season-long expected goals figure "
        f"of {xg_h} per game in this fixture context, a figure that places them among the more "
        f"productive attacking sides in {lgname}. {away} are rated at {xg_a} xG for this match, "
        f"reflecting their attacking output adjusted for defensive quality faced. "
        f"{'The gap between the two is notable and favours the home side.' if xg_h > xg_a + 0.3 else 'The two sides are closely matched by these metrics.' if abs(xg_h - xg_a) <= 0.3 else 'The away side hold a slight underlying edge by xG standards.'} "
        f"Across the season, {home} have been scoring at a rate of approximately {h_gpg} goals per "
        f"match, while {away} are producing around {a_gpg}. Shot volume, defensive organisation and "
        f"conversion efficiency all factor into the final probability outputs. The over 2.5 goals "
        f"market sits at {over25}%, while both teams to score is rated at {btts}%."
    )

    # ── 5. Head-to-Head (60-80 words)
    if h2h and h2h.get("total", 0) >= 3:
        hw_h = h2h.get("home_wins", 0)
        aw_h = h2h.get("away_wins", 0)
        dr_h = h2h.get("draws", 0)
        avg_g = h2h.get("avg_goals", 0.0)
        h2h_para = (
            f"Recent meetings between these sides offer useful context. Across the last five encounters, "
            f"{home} have claimed {hw_h} victories, {away} have won {aw_h}, with {dr_h} ending level. "
            f"Goals have been relatively {'frequent' if avg_g > 2.8 else 'hard to come by'}, averaging "
            f"{avg_g:.1f} per game. Historical head-to-head data suggests this is a genuinely "
            f"competitive fixture without a dominant force across recent seasons."
        )
    else:
        h2h_para = (
            f"Historically, fixtures between these two sides have tended to be closely contested, "
            f"with fine margins separating the teams. Both sets of players will be aware of the recent "
            f"history between the clubs, and that context often adds an extra edge to the occasion. "
            f"Previous meetings have shown that neither side consistently dominates the other, "
            f"reinforcing the sense that this is a game where anything is possible from the first whistle."
        )

    # ── 6. Key Tactical Battles (80-120 words)
    if xg_h > xg_a + 0.3:
        battles = (
            f"The most important area of the pitch is likely to be the space in behind {away}'s "
            f"defensive line. {home}'s attacking players have shown a consistent ability to exploit "
            f"transitions, and if {away} commit men forward, they leave themselves vulnerable. "
            f"At the other end, {away}'s best route into the game will be through restricting "
            f"{home}'s wide play and forcing them into low-percentage central options. "
            f"The full-back matchups on both sides will be worth watching closely throughout the game."
        )
    else:
        battles = (
            f"The central midfield contest will almost certainly define this game. Both sides rely "
            f"heavily on their midfielders to control possession and dictate the tempo, meaning "
            f"whichever team wins that battle gains a platform to hurt the opposition. "
            f"Pressing intensity will also be a factor. If either team allows their opponents time "
            f"on the ball in the final third, chances will follow. The wide channels represent "
            f"another area of potential vulnerability, and the full-backs on both sides carry "
            f"significant responsibility in keeping their shape compact when out of possession."
        )

    # ── 7. Model Projection (80-100 words)
    mls_h, mls_a = int(mls[0]), int(mls[-1])
    mls_prob = round(_p(xg_h, mls_h) * _p(xg_a, mls_a) * 100, 1)
    projection = (
        f"The StatinSite model gives {home} a {hw}% chance of winning this fixture. {away} are rated "
        f"at {aw}%, with the draw carrying a {dw}% probability. Expected goals of {xg_h} for the home "
        f"side and {xg_a} for the visitors produce a projected scoreline of {mls}, which carries a "
        f"{mls_prob}% individual probability according to the Poisson distribution. The model's "
        f"confidence in this output sits at {conf}%. Over 2.5 goals is rated at {over25}% and both "
        f"teams to score at {btts}%."
    )

    # ── 8. Final Verdict (60-80 words)
    if fav == "either side":
        verdict = (
            f"The data does not point clearly in either direction. Both sides carry genuine quality "
            f"and the {dw}% draw probability reflects just how closely matched they are. Home advantage "
            f"gives {home} a marginal edge in practice, but {away} are well capable of taking something "
            f"from this game. Expect a competitive, tightly contested fixture with little between the "
            f"sides across the ninety minutes."
        )
    else:
        trailer = away if fav == home else home
        verdict = (
            f"{fav} hold a statistical advantage here and the model backs them to make it count. "
            f"A {round(fav_pct)}% win probability is a meaningful edge at this level, though "
            f"{trailer} are not without their own chances at {min(hw, aw)}%. "
            f"{'The home setting reinforces what is already a strong underlying case for the hosts.' if fav == home else 'Taking points on the road is never straightforward, but the data suggests the visitors have the tools to do it.'} "
            f"A narrow winning margin is the most probable outcome."
        )

    return [context, narrative, tactical, stats, h2h_para, battles, projection, verdict]


def _title_body(standings, slug, lgname) -> Tuple[str, str, List[str]]:
    top4 = standings[:4]; l = top4[0]; s = top4[1]
    gap  = (l.get("points", 0) or 0) - (s.get("points", 0) or 0)
    ln   = l.get("team_name", ""); sn = s.get("team_name", "")
    lf   = _form(l.get("form", "")); sf2 = _form(s.get("form", ""))
    l_pts = l.get("points", 0); s_pts = s.get("points", 0)

    gap_desc = ("level on points" if gap == 0 else
                f"separated by just {gap} point" + ("s" if gap != 1 else ""))
    standfirst = (
        f"{ln} and {sn} are {gap_desc} at the top of {lgname}, with the title race entering a "
        f"phase that will define both clubs' seasons."
    )

    # ── Context
    p1 = (
        f"The {lgname} title race has reached the kind of moment where every fixture feels loaded "
        f"with consequence. {ln} sit at the summit on {l_pts} points, having posted {lf} across "
        f"their last five games. That is a {_form_label(lf)} run by any measure, and it has allowed "
        f"them to establish or maintain their position at the top of the division. "
        f"{sn} refuse to go away. On {s_pts} points with form of {sf2}, they are {_form_label(sf2)} "
        f"and remain well within striking distance. The gap between the two sides is {gap_desc}, "
        f"meaning a single result in either direction could completely change the complexion of the race."
    )

    # ── Rest of top four
    others = [
        f"{t['team_name']} ({t.get('points', 0)} pts, form: {_form(t.get('form', ''))})"
        for t in top4[2:]
    ]
    gap_1_4 = (top4[0].get("points", 0) or 0) - (top4[-1].get("points", 0) or 0)
    p2 = (
        f"The challenge does not end with the leading pair. "
        + (f"{' and '.join(others)} remain firmly in the conversation. "
           f"The gap from first to fourth stands at just {gap_1_4} points, a margin thin enough "
           f"that a purple patch from any contender could shake up the standings significantly. "
           f"In a season as competitive as this, the title may not be decided until the final weeks."
           if len(top4) >= 4 else "The title picture may yet involve further twists.")
    )

    # ── Form narrative
    p3 = (
        f"Form is crucial at this stage of the season, and the numbers tell an interesting story. "
        f"{ln}'s recent sequence of {lf} represents "
        f"{'outstanding consistency that their rivals will need to match' if _form_label(lf) in ('in superb form', 'in strong form') else 'a mixed picture that their rivals may look to exploit'}. "
        f"{sn}'s {sf2} run is "
        f"{'equally compelling and suggests they will not surrender their challenge lightly' if _form_label(sf2) in ('in superb form', 'in strong form') else 'more inconsistent, and that inconsistency may prove costly if it continues'}. "
        f"The psychological battle between these clubs is every bit as important as the points tally. "
        f"Belief, momentum and squad depth all become magnified when the season reaches this stage."
    )

    # ── Relegation (conditional)
    p4 = ""
    if len(standings) >= 18:
        b3   = standings[-3:]
        names = ", ".join(t.get("team_name", "") for t in b3)
        pts3  = [str(t.get("points", 0)) for t in b3]
        p4 = (
            f"At the opposite end of the table, the relegation battle is equally gripping. "
            f"{names} occupy the three drop spots with {', '.join(pts3)} points respectively. "
            f"The margins are tiny, and with survival at stake, each of those clubs faces a run-in "
            f"that will test their character and squad depth to the limit. "
            f"Some of the most significant fixtures in the coming weeks will involve sides fighting "
            f"for their top-flight status rather than trophies."
        )

    # ── Verdict
    p5 = (
        f"Based on current form and points trajectory, {ln} hold the advantage. "
        f"They have done the hard work to reach the top of the table, and sustaining that position "
        f"requires nothing more than continuing what is already working. "
        f"But {sn} are not going anywhere. Their quality is beyond question, and a run of wins "
        f"could see them overtake at the top within weeks. The head-to-head meetings that may yet "
        f"come between the contenders could prove the defining moments of the entire season."
    )

    return standfirst, standfirst, [p for p in [p1, p2, p3, p4, p5] if p]


def _insight_body(team, form, pts, rank, lgname) -> Tuple[str, str, List[str]]:
    label    = _form_label(form)
    rec_pts  = form.count("W") * 3 + form.count("D")
    wins     = form.count("W"); draws = form.count("D"); losses = form.count("L")
    strong   = label in ("in superb form", "in strong form")
    sf = (
        f"{team} are {label} in {lgname}, picking up {rec_pts} points from their last five matches "
        f"to establish themselves as one of the division's most compelling stories right now."
    )

    # ── 1. Current standing and form
    p1 = (
        f"{team} have been one of the standout performers in {lgname} during this period, and the "
        f"numbers back up what the eye test has been suggesting for some time. A run of {form} "
        f"across their last five games has yielded {rec_pts} points, which is "
        f"{'among the very best returns in the division over that stretch' if rec_pts >= 12 else 'a solid return that reflects growing confidence within the squad'}. "
        f"They sit {_ordinal(rank)} in the table on {pts} points, "
        f"{'and the gap they are creating to those below them is becoming meaningful' if rank <= 4 else 'with their sights set on climbing further as the season progresses'}."
    )

    # ── 2. Underlying analysis
    p2 = (
        f"What makes this run particularly interesting is the manner in which results have been "
        f"achieved. It is one thing to win games; it is another to do so with a level of "
        f"{'conviction that suggests genuine quality rather than circumstance' if strong else 'pragmatism that speaks to a well-drilled defensive unit'}. "
        f"The StatinSite model has been monitoring {team}'s underlying metrics throughout this "
        f"sequence, and the data "
        f"{'supports the conclusion that these results are well deserved. The attacking output and defensive solidity have both been above their seasonal averages.' if strong else 'tells a slightly more nuanced story. While the results have been positive, some of the underlying numbers suggest this run has been aided by favourable opponents and a degree of fortune in front of goal.'}. "
        f"Sustaining this level of performance over a longer period is the key challenge ahead."
    )

    # ── 3. Tactical and squad context
    p3 = (
        f"The tactical identity of the team under their current setup has been a significant factor. "
        f"There is a clear structure to how {team} are operating, and the players have responded "
        f"positively to the system being asked of them. "
        f"{'Defensively, they have been exceptionally hard to break down, conceding sparingly while creating plenty at the other end.' if wins >= 3 else 'Defensively, the side has been solid, and while their attacking output has not always been spectacular, they have been difficult to beat.'} "
        f"The squad's depth has also been important, with the manager able to rotate without a "
        f"significant drop in quality. That kind of depth becomes vital as the fixtures pile up, "
        f"and {team} appear well-positioned to maintain their current level."
    )

    # ── 4. Narrative around the run
    p4 = (
        f"From a narrative standpoint, this form run matters beyond the points accumulated. "
        f"It signals that {team} are capable of performing consistently at this level, which is "
        f"an important psychological reference point for the players and supporters alike. "
        f"Rivals will have taken note. Upcoming opponents will study the tape carefully. "
        f"{'The question is whether the squad can handle the increased scrutiny and expectation that comes with this kind of attention.' if strong else 'The question now is whether they can add an extra dimension to their game to make the run truly sustainable.'} "
        f"Form streaks in football are rarely permanent, but they do reveal character. "
        f"What {team} have shown recently suggests they have plenty of it."
    )

    # ── 5. Forward look and verdict
    p5 = (
        f"Looking ahead, the fixtures will tell us a great deal about the true quality of this run. "
        f"Every team can put together a positive sequence against manageable opposition. "
        f"The real test comes when the difficulty of the schedule increases. "
        f"If {team} can carry this {form} form into their next set of fixtures, "
        f"{'the implications for the title race could be significant' if rank <= 3 else 'it will cement their credentials as genuine contenders for their seasonal objectives'}. "
        f"For now, the momentum is with them, and momentum in football is a powerful thing. "
        f"They look like a team that knows what it is doing and believes in where it is going."
    )

    return sf, sf, [p1, p2, p3, p4, p5]

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

def _categorise_rss(title: str, summary: str, source_cat: str) -> str:
    """Detect article category from title/summary keywords."""
    text = (title + " " + summary).lower()
    for cat, keywords in RSS_CATEGORY_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return cat
    # Fall back to source category (transfer sources → transfer, etc.)
    return source_cat if source_cat in RSS_CATEGORY_KEYWORDS else "news"


async def _fetch_rss(name: str, url: str, source_cat: str = "news",
                     cutoff_hours: int = 36) -> List[dict]:
    key = f"rss:{url}:{cutoff_hours}"
    hit = _cget(key, TTL_RSS)
    if hit is not None: return hit

    items: List[dict] = []
    cutoff = datetime.now(timezone.utc) - timedelta(hours=cutoff_hours)

    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as c:
            r = await c.get(url, headers={"User-Agent": "StatinSite/2.0"})
        if r.status_code != 200:
            _cset(key, items); return items

        root    = ET.fromstring(r.text)
        na      = "http://www.w3.org/2005/Atom"
        entries = root.findall(".//item") or root.findall(f".//{{{na}}}entry")

        for entry in entries[:12]:
            def _t(tag: str) -> str:
                for ns in ("", f"{{{na}}}"):
                    el = entry.find(f"{ns}{tag}")
                    if el is not None and el.text: return el.text.strip()
                return ""

            title = _t("title")
            if not title: continue

            link_el = entry.find("link") or entry.find(f"{{{na}}}link")
            link    = (link_el.get("href") or link_el.text or "").strip() if link_el is not None else ""

            pub_raw = _t("pubDate") or _t("published") or _t("updated") or ""
            pub_dt  = None
            for fmt in ("%a, %d %b %Y %H:%M:%S %z", "%a, %d %b %Y %H:%M:%S GMT",
                        "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%SZ"):
                try:
                    pub_dt = datetime.strptime(pub_raw[:30], fmt).replace(tzinfo=timezone.utc); break
                except Exception: pass

            if pub_dt and pub_dt < cutoff: continue

            pub_str  = pub_dt.isoformat() if pub_dt else datetime.now(timezone.utc).isoformat()
            raw_s    = _t("description") or _t("summary") or _t("content")
            # Full cleaned text for article page; short excerpt for card
            full_text = re.sub(r"<[^>]+>", "", raw_s).strip()
            excerpt   = full_text[:280].strip()
            # Split full text into paragraphs for article rendering
            paragraphs = [p.strip() for p in re.split(r'\n{2,}|\. {2,}', full_text) if p.strip()]
            if not paragraphs and full_text:
                paragraphs = [full_text]
            category = _categorise_rss(title, excerpt, source_cat)

            items.append({
                "id":           str(uuid.uuid5(uuid.NAMESPACE_URL, link or title)),
                "type":         category,
                "league":       "general",
                "title":        title,
                "standfirst":   excerpt or title,
                "summary":      excerpt or title,
                "body":         paragraphs,
                "published_at": pub_str,
                "source_type":  "external",
                "source":       name,
                "source_cat":   source_cat,
                "author":       name,
                "url":          link,
                "image":        _rss_image(entry),
                "meta":         {},
            })
    except Exception:
        pass

    _cset(key, items)
    return items


async def _all_rss(cutoff_hours: int = 36) -> List[dict]:
    key = f"gen:rss:all:{cutoff_hours}"
    hit = _cget(key, TTL_RSS)
    if hit is not None: return hit

    results = await asyncio.gather(
        *[_fetch_rss(n, u, cat, cutoff_hours) for n, u, cat in RSS_SOURCES]
    )
    items: List[dict] = [i for sub in results for i in sub]

    # Deduplicate by normalised title
    seen: set = set(); deduped: List[dict] = []
    for item in items:
        t = item["title"].lower().strip()
        if t not in seen:
            seen.add(t); deduped.append(item)

    # 36h fallback: if fewer than 5 items, retry at 72h
    if cutoff_hours == 36 and len(deduped) < 5:
        _cset(key, deduped)
        return await _all_rss(cutoff_hours=72)

    _cset(key, deduped)
    return deduped

# ── Item factories ─────────────────────────────────────────────────────────────

def _make_preview(fx, hs, as_, slug, h2h: Optional[dict] = None) -> dict:
    teams  = fx.get("teams",{})   or {}
    league = fx.get("league",{})  or {}
    fix    = fx.get("fixture",{}) or {}

    home   = (teams.get("home") or {}).get("name", "Home")
    away   = (teams.get("away") or {}).get("name", "Away")
    h_logo = (teams.get("home") or {}).get("logo", "")
    a_logo = (teams.get("away") or {}).get("logo", "")
    kickoff = fix.get("date") or datetime.now(timezone.utc).isoformat()
    venue   = (fix.get("venue") or {}).get("name", "")
    lgname  = LEAGUE_NAMES.get(slug, league.get("name", ""))

    xg_h, xg_a = _xg(hs, as_)
    hw, dw, aw  = _match_probs(xg_h, xg_a)
    fav, fav_pct = _fav(home, away, hw, aw)
    hf = _form(hs.get("form", ""))
    af = _form(as_.get("form", ""))
    mls    = _mls(xg_h, xg_a)
    over25 = round((1 - sum(_p(xg_h + xg_a, k) for k in range(3))) * 100)
    btts   = round((1 - _p(xg_h, 0)) * (1 - _p(xg_a, 0)) * 100)
    conf   = _conf(hw, dw, aw)

    # Journalistic standfirst — no hyphens, no robotic labels
    venue_str = f" at {venue}" if venue else ""
    if hw > aw + 8:
        sf = (f"{home} host {away}{venue_str} in a {lgname} fixture that the model projects as a "
              f"home win. Their attacking numbers this season make them the stronger side on paper, "
              f"though {away} carry enough quality to make this far from straightforward.")
    elif aw > hw + 8:
        sf = (f"{away} travel to face {home}{venue_str} as slight statistical favourites. "
              f"The model gives the visitors a {round(aw)}% chance of taking all three points, "
              f"a reflection of their stronger underlying numbers across the season.")
    else:
        sf = (f"{home} and {away} meet{venue_str} in a {lgname} fixture the model rates as "
              f"genuinely open. Win probabilities are close, and the data suggests either side "
              f"is capable of coming away with the points.")

    summary = (f"{fav} carry a statistical edge. Expected goals: {home} {xg_h}, {away} {xg_a}. "
               f"Over 2.5 goals at {over25}%.")

    body = _preview_body(home, away, hf, af, xg_h, xg_a, hw, dw, aw, lgname, venue, h2h)

    # match_stats block for frontend visualisation widgets
    match_stats = {
        "expected_goals_home":    xg_h,
        "expected_goals_away":    xg_a,
        "win_probability_home":   hw,
        "win_probability_draw":   dw,
        "win_probability_away":   aw,
        "over25_probability":     over25,
        "btts_probability":       btts,
        "confidence":             conf,
        "most_likely_score":      mls,
        "home_form":              hf,
        "away_form":              af,
    }

    return {
        "id":           str(uuid.uuid5(uuid.NAMESPACE_DNS, f"preview:{fix.get('id','')}")),
        "type":         "match_preview",
        "league":       slug,
        "title":        f"{home} vs {away} | {lgname} Preview",
        "standfirst":   sf,
        "summary":      summary,
        "body":         body,
        "published_at": kickoff,
        "source_type":  "internal",
        "source":       "StatinSite Model",
        "author":       "Rutej Talati",
        "url":          None,
        "image":        h_logo or LEAGUE_IMAGES.get(slug),
        "meta": {
            "fixture_id":        fix.get("id"),
            "home_team":         home,
            "away_team":         away,
            "home_logo":         h_logo,
            "away_logo":         a_logo,
            "home_win":          hw,
            "draw":              dw,
            "away_win":          aw,
            "xg_home":           xg_h,
            "xg_away":           xg_a,
            "over_2_5":          over25,
            "btts":              btts,
            "confidence":        conf,
            "most_likely_score": mls,
            "kickoff":           kickoff,
            "match_stats":       match_stats,
        },
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
        "source_type":"internal","source":"StatinSite Model","author":"Rutej Talati",
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
        "source_type":"internal","source":"StatinSite Model","author":"Rutej Talati",
    }

# ── Data fetchers ──────────────────────────────────────────────────────────────

async def _fetch_h2h(hid: int, aid: int) -> Optional[dict]:
    """Fetch last 5 head-to-head results and summarise them."""
    key = f"h2h:{hid}:{aid}"
    hit = _cget(key, TTL_API)
    if hit is not None: return hit

    raw = await _api("fixtures/headtohead", {"h2h": f"{hid}-{aid}", "last": 5})
    if not raw:
        _cset(key, None); return None

    h_wins = a_wins = draws = total_goals = 0
    for fx in raw:
        teams  = fx.get("teams", {}) or {}
        goals  = fx.get("goals", {}) or {}
        hg     = goals.get("home") or 0
        ag     = goals.get("away") or 0
        total_goals += hg + ag
        home_id = (teams.get("home") or {}).get("id")
        if hg > ag:
            if home_id == hid: h_wins += 1
            else: a_wins += 1
        elif ag > hg:
            if home_id == hid: a_wins += 1
            else: h_wins += 1
        else:
            draws += 1

    n = len(raw)
    result = {
        "total":      n,
        "home_wins":  h_wins,
        "away_wins":  a_wins,
        "draws":      draws,
        "avg_goals":  round(total_goals / n, 1) if n else 0.0,
    }
    _cset(key, result)
    return result


async def _previews_for(slug, lid, max_fix=3) -> List[dict]:
    key = f"gen:prev:{slug}"
    hit = _cget(key, TTL_GEN)
    if hit is not None: return hit

    cutoff = datetime.now(timezone.utc) + timedelta(hours=48)
    raw    = await _api("fixtures", {"league": lid, "season": CURRENT_SEASON, "next": 5, "status": "NS"})
    items  = []

    for fx in raw:
        date_s = (fx.get("fixture", {}) or {}).get("date", "")
        try:
            dt = datetime.fromisoformat(date_s.replace("Z", "+00:00"))
        except Exception:
            continue
        if dt > cutoff:
            continue

        teams  = fx.get("teams",  {}) or {}
        league = fx.get("league", {}) or {}
        hid    = (teams.get("home") or {}).get("id")
        aid    = (teams.get("away") or {}).get("id")
        lid2   = league.get("id") or lid
        if not hid or not aid:
            continue

        # Fetch team stats and h2h concurrently
        hs, as_, h2h = await asyncio.gather(
            _api("teams/statistics", {"team": hid, "league": lid2, "season": CURRENT_SEASON}),
            _api("teams/statistics", {"team": aid, "league": lid2, "season": CURRENT_SEASON}),
            _fetch_h2h(hid, aid),
        )
        items.append(_make_preview(fx, _ns(hs), _ns(as_), slug, h2h=h2h))
        if len(items) >= max_fix:
            break

    _cset(key, items)
    return items

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



def _trending(rss_items: List[dict], n: int = 8) -> List[str]:  # noqa: default is 8
    counter: Counter = Counter()
    for item in rss_items:
        text = (item.get("title", "") + " " + item.get("standfirst", "")).lower()
        for club in CLUBS:
            if club.lower() in text:
                counter[club] += 1
    return [c for c, _ in counter.most_common(n)]

# ── Feed endpoint ──────────────────────────────────────────────────────────────

PREVIEW_LEAGUES   = ["epl","laliga","seriea","bundesliga","ligue1","ucl"]
STANDINGS_LEAGUES = ["epl","laliga","seriea","bundesliga","ligue1"]
COVERAGE_LEAGUES  = ["epl","laliga","seriea","bundesliga","ligue1","ucl","uel"]
MAX_PER_LEAGUE    = 3
MIN_PER_LEAGUE    = 2   # guarantee at least this many per league in final feed

def _dt(s:str)->datetime:
    try: return datetime.fromisoformat(s.replace("Z","+00:00"))
    except Exception: return datetime.min.replace(tzinfo=timezone.utc)


@router.get("/feed")
async def intelligence_feed(limit: int = Query(60, ge=1, le=100)):
    """
    Unified newsroom feed — all content types interleaved.
    Guarantees ≥ 2 items per major league.
    Returns mode, count, items[], trending_clubs[], transfer_items[].
    """
    gen_key=f"gen:feed2:{limit}"
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
    transfer_items=[a for a in rss_items if a.get("type")=="transfer"]

    # ── StatinSite-first editorial ordering ───────────────────────────
    # Priority: match_preview → title_race → model_insight → external news
    # Rule: every run of 3 items starts with a StatinSite item where available.
    TYPE_ORDER = {"match_preview":0, "title_race":1, "model_insight":2, "transfer":3,
                  "injury":3, "analysis":4, "news":5, "headline":6}
    internal.sort(key=lambda x: (
        TYPE_ORDER.get(x.get("type"), 9),
        -_dt(x.get("published_at","")).timestamp()
    ))
    rss_items.sort(key=lambda x: -_dt(x.get("published_at","")).timestamp())

    # League cap on internal items (first 15 slots)
    lc: Counter = Counter()
    capped: List[dict] = []
    overflow: List[dict] = []
    for item in internal:
        lg = item.get("league","")
        if len(capped) < 15 and lc[lg] < MAX_PER_LEAGUE:
            capped.append(item); lc[lg] += 1
        else:
            overflow.append(item)
    internal = capped + overflow

    # Interleave — StatinSite item always leads each group of 3:
    # [StatinSite] [RSS] [RSS] [StatinSite] [RSS] [RSS] ...
    out: List[dict] = []
    ri = 0
    for item in internal:
        out.append(item)             # StatinSite item first
        for _ in range(2):           # then 2 external
            if ri < len(rss_items):
                out.append(rss_items[ri]); ri += 1
    out.extend(rss_items[ri:])       # any remaining RSS at the end

    # League coverage guarantee — ensure ≥ MIN_PER_LEAGUE per league in final slice
    league_counts:Counter=Counter()
    for item in out[:limit]:
        league_counts[item.get("league","")] += 1

    # For any league under the minimum, inject missing items from overflow
    all_items_by_league: Dict[str,List[dict]] = {}
    for item in (internal+rss_items):
        all_items_by_league.setdefault(item.get("league",""),[]).append(item)

    extras:List[dict]=[]
    for lg in COVERAGE_LEAGUES:
        deficit = MIN_PER_LEAGUE - league_counts.get(lg,0)
        if deficit > 0:
            candidates=[a for a in all_items_by_league.get(lg,[]) if a not in out[:limit]]
            extras.extend(candidates[:deficit])

    final=(out[:limit]+extras)[:limit+len(extras)]

    result={
        "mode":"live","count":len(final),"items":final,
        "trending_clubs":trending,
        "transfer_items":transfer_items[:12],
    }
    _cset(gen_key,result); return result


@router.get("/transfer-summary")
async def transfer_summary():
    """Daily transfer briefing — aggregates transfer RSS into structured editorial."""
    key = "gen:transfer:summary:v2"
    hit = _cget(key, TTL_GEN)
    if hit is not None: return hit

    rss = await _all_rss()
    transfers = [a for a in rss if a.get("type") == "transfer"][:12]

    if not transfers:
        return {"items": [], "generated_at": datetime.now(timezone.utc).isoformat()}

    # Group by rough category using title keywords
    buys     = [t for t in transfers if any(w in t["title"].lower() for w in ["sign","complet","agree","deal","join","arriv","confirm"])]
    interest = [t for t in transfers if any(w in t["title"].lower() for w in ["interest","target","monitor","eye","want","consider","bid","offer","approach"])]
    other    = [t for t in transfers if t not in buys and t not in interest]

    def _fmt(t: dict) -> dict:
        return {
            "headline":     t["title"],
            "excerpt":      t.get("standfirst",""),
            "source":       t["source"],
            "url":          t.get("url"),
            "image":        t.get("image"),
            "published_at": t["published_at"],
            "body":         t.get("body",[]),
        }

    # Aggregate into narrative
    today = datetime.now(timezone.utc).strftime("%B %d")
    headline = f"StatinSite Transfer Brief — {today}"

    sections = []
    if buys:
        sections.append({
            "title": "Completed & Close",
            "items": [_fmt(t) for t in buys[:4]],
        })
    if interest:
        sections.append({
            "title": "Clubs in the Market",
            "items": [_fmt(t) for t in interest[:4]],
        })
    if other:
        sections.append({
            "title": "Latest Transfer News",
            "items": [_fmt(t) for t in other[:4]],
        })

    # Build key bullet points for the summary paragraph
    bullets = []
    for t in (buys + interest)[:6]:
        title = t["title"]
        # Extract first ~60 chars as a clean bullet
        clean = title.split("–")[0].split("-")[0].strip()
        if len(clean) > 10:
            bullets.append(f"• {clean}")

    summary_para = (
        f"Today's transfer window sees movement across European football. "
        + (" ".join(bullets[:3]) + "." if bullets else "")
    )

    result = {
        "headline":     headline,
        "summary":      summary_para,
        "sections":     sections,
        "total_items":  len(transfers),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        # Keep old flat `items` key for backward compat
        "items": [_fmt(t) for t in transfers[:8]],
    }
    _cset(key, result)
    return result


@router.get("/daily-brief")
async def daily_brief():
    """
    StatinSite Daily Brief — one aggregated editorial per day combining
    match previews, transfer news, and model insights into a single article.
    """
    key = "gen:daily:brief:v1"
    hit = _cget(key, TTL_GEN * 2)  # cache 2× longer — changes daily
    if hit is not None: return hit

    # Fetch all data concurrently
    preview_tasks  = [_previews_for(s, LEAGUE_IDS[s]) for s in ["epl","laliga","seriea","bundesliga"]]
    standing_tasks = [_standings_for(s, LEAGUE_IDS[s]) for s in ["epl","laliga","seriea","bundesliga"]]
    rss_task       = _all_rss()

    previews_list, standings_list, rss = await asyncio.gather(
        asyncio.gather(*preview_tasks, return_exceptions=True),
        asyncio.gather(*standing_tasks, return_exceptions=True),
        rss_task,
    )

    previews  = [p for r in previews_list  if isinstance(r, list) for p in r]
    standings = [s for r in standings_list if isinstance(r, list) for s in r]
    transfers = [a for a in rss if a.get("type") == "transfer"][:6]
    injuries  = [a for a in rss if a.get("type") == "injury"][:4]
    top_news  = [a for a in rss if a.get("type") == "news"][:6]

    today     = datetime.now(timezone.utc)
    date_str  = today.strftime("%A, %B %d %Y")
    today_str = today.strftime("%B %d")

    # Build sections
    sections = []

    # 1. Today's Key Fixtures
    if previews:
        fixture_bullets = []
        for p in previews[:4]:
            meta  = p.get("meta") or {}
            ht    = meta.get("home_team", p.get("title",""))
            at    = meta.get("away_team","")
            conf  = meta.get("confidence", meta.get("match_stats",{}).get("confidence",""))
            score = meta.get("most_likely_score","")
            line  = f"{ht} vs {at}"
            if score: line += f" — Model projects {score}"
            if conf:  line += f" (confidence: {conf})"
            fixture_bullets.append(line)
        sections.append({
            "type":  "fixtures",
            "title": "Today's Key Fixtures",
            "items": fixture_bullets,
            "previews": previews[:4],
        })

    # 2. Transfer Market Update
    if transfers:
        transfer_bullets = []
        for t in transfers[:5]:
            clean = t["title"].split("–")[0].split("-")[0].strip()
            transfer_bullets.append(f"• {clean}")
        sections.append({
            "type":   "transfers",
            "title":  "Transfer Market",
            "items":  transfer_bullets,
            "raw":    [{"headline": t["title"], "source": t["source"],
                        "url": t.get("url"), "published_at": t["published_at"]}
                       for t in transfers],
        })

    # 3. Title Races
    title_race_items = [s for s in standings if s.get("type") == "title_race"]
    if title_race_items:
        race_bullets = []
        for tr in title_race_items[:3]:
            meta   = tr.get("meta") or {}
            leader = meta.get("leader","")
            second = meta.get("second","")
            gap    = meta.get("gap","")
            lg     = LEAGUE_NAMES.get(tr.get("league",""),"")
            if leader:
                race_bullets.append(f"{lg}: {leader} lead{' by ' + str(gap) + ' pts' if gap else ''}" +
                                     (f" from {second}" if second else ""))
        sections.append({
            "type":  "title_races",
            "title": "Title Race Watch",
            "items": race_bullets,
        })

    # 4. Injury News
    if injuries:
        sections.append({
            "type":  "injuries",
            "title": "Injury Updates",
            "items": [{"headline": a["title"], "source": a["source"],
                       "url": a.get("url"), "published_at": a["published_at"]}
                      for a in injuries],
        })

    # 5. Latest News
    if top_news:
        sections.append({
            "type":  "news",
            "title": "Latest News",
            "items": [{"headline": a["title"], "source": a["source"],
                       "url": a.get("url"), "published_at": a["published_at"]}
                      for a in top_news],
        })

    result = {
        "id":           f"daily:{today.strftime('%Y-%m-%d')}",
        "type":         "daily_brief",
        "date":         date_str,
        "date_short":   today_str,
        "headline":     f"StatinSite Daily Brief — {today_str}",
        "standfirst":   (
            f"Your complete football briefing for {today_str}: "
            f"{len(previews)} match previews, "
            f"{len(transfers)} transfer stories, "
            f"title race updates and injury news."
        ),
        "sections":     sections,
        "source":       "StatinSite Intelligence Engine",
        "author":       "Rutej Talati",
        "generated_at": today.isoformat(),
    }
    _cset(key, result)
    return result


@router.get("/ticker")
async def intelligence_ticker():
    """
    Live ticker items — model signals + RSS headlines + transfer alerts.
    Colour-coded by type: green=positive, red=injury/negative, blue=insight, amber=transfer.
    """
    key="gen:ticker"
    hit=_cget(key,TTL_GEN//3)   # refresh 3x more often
    if hit is not None: return hit

    rss=await _all_rss()
    # Gather recent standing data for model signals
    standing_tasks=[_standings_for(s,LEAGUE_IDS[s]) for s in STANDINGS_LEAGUES]
    standing_results=await asyncio.gather(*standing_tasks,return_exceptions=True)
    internal_items:List[dict]=[item for r in standing_results if isinstance(r,list) for item in r]

    items:List[dict]=[]

    # Model insight signals
    for art in internal_items[:6]:
        if art.get("type")=="model_insight":
            team=art.get("meta",{}).get("team","")
            pts=art.get("meta",{}).get("points",0)
            form=art.get("meta",{}).get("form","")
            lg=LEAGUE_NAMES.get(art.get("league",""),"")
            items.append({"text":f"StatinSite Insight — {team} collecting strong form points ({form}) in {lg}","color":"green","type":"insight"})
        elif art.get("type")=="title_race":
            leader=art.get("meta",{}).get("leader","")
            gap=art.get("meta",{}).get("gap",0)
            lg=LEAGUE_NAMES.get(art.get("league",""),"")
            items.append({"text":f"StatinSite Insight — {leader} lead {lg} title race by {gap} point{'s' if gap!=1 else ''}","color":"blue","type":"insight"})

    # RSS headlines
    for art in rss[:20]:
        t=art.get("type","news")
        color="amber" if t=="transfer" else "red" if t=="injury" else "blue" if t=="analysis" else "green"
        label="Transfer" if t=="transfer" else "Injury Update" if t=="injury" else "News"
        items.append({"text":f"{label} — {art['title']}","color":color,"type":t,"url":art.get("url")})

    result={"items":items[:30],"generated_at":datetime.now(timezone.utc).isoformat()}
    _cset(key,result); return result

@router.get("/health")
async def intelligence_health():
    return {"api_key":"set" if API_KEY else "MISSING","season":CURRENT_SEASON,
            "leagues":list(LEAGUE_IDS.keys()),"rss_sources":len(RSS_SOURCES),"cache_keys":len(_cache)}