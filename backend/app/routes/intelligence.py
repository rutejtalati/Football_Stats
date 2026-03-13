# backend/app/routes/intelligence.py
# ═══════════════════════════════════════════════════════════════════════════════
# Football Intelligence Engine
#
# GET /api/intelligence/feed?limit=40
#
# Produces a merged, time-sorted feed of:
#   1. AI-generated match previews  (upcoming fixtures, all major competitions)
#   2. League table / title-race insights  (form + points analysis)
#   3. Model insights  (xG over/under-performance, form streaks)
#   4. RSS news headlines  (Guardian, Goal, fan blogs)
#
# All external fetches are cached in-memory:
#   • RSS feeds       → 10 minutes
#   • API-Football    → 15 minutes
#   • Generated items → 15 minutes
#
# RULES:
#   • Router prefix stays /api/intelligence
#   • Endpoint stays /feed
#   • main.py is NOT touched
# ═══════════════════════════════════════════════════════════════════════════════

import asyncio
import hashlib
import math
import os
import time
import uuid
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx
from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/intelligence", tags=["intelligence"])

# ── Constants ─────────────────────────────────────────────────────────────────

API_KEY        = os.getenv("API_FOOTBALL_KEY", "")
API_BASE       = "https://v3.football.api-sports.io"
CURRENT_SEASON = int(os.getenv("CURRENT_SEASON", "2025"))

LEAGUE_IDS: Dict[str, int] = {
    "epl":         39,
    "laliga":     140,
    "seriea":     135,
    "bundesliga":  78,
    "ligue1":      61,
    "ucl":          2,   # Champions League
    "uel":          3,   # Europa League
    "uecl":        848,  # Conference League
    "fa_cup":       45,
    "carabao":      48,
}

LEAGUE_NAMES: Dict[str, str] = {
    "epl":        "Premier League",
    "laliga":     "La Liga",
    "seriea":     "Serie A",
    "bundesliga": "Bundesliga",
    "ligue1":     "Ligue 1",
    "ucl":        "Champions League",
    "uel":        "Europa League",
    "uecl":       "Conference League",
    "fa_cup":     "FA Cup",
    "carabao":    "Carabao Cup",
}

# RSS sources: (display_name, url)
RSS_SOURCES: List[Tuple[str, str]] = [
    ("The Guardian",   "https://www.theguardian.com/football/rss"),
    ("Goal.com",       "https://www.goal.com/en/feeds/news"),
    ("We Ain't Got No Fans",  "https://weaintgotnofans.com/feed/"),
    ("Arseblog",       "https://arseblog.com/feed/"),
    ("This Is Anfield","https://www.thisisanfield.com/feed/"),
    ("The Busby Babe", "https://thebusbybabe.sbnation.com/rss/index.xml"),
    ("Bitter & Blue",  "https://bitterandblue.sbnation.com/rss/index.xml"),
    ("Cartilage Free", "https://cartilagefreecaptain.sbnation.com/rss/index.xml"),
]

# ── In-memory cache ────────────────────────────────────────────────────────────

_cache:  Dict[str, Any]   = {}
_ctimes: Dict[str, float] = {}

def _cget(key: str, ttl: float) -> Optional[Any]:
    if key in _cache and time.monotonic() - _ctimes[key] < ttl:
        return _cache[key]
    return None

def _cset(key: str, val: Any) -> None:
    _cache[key]  = val
    _ctimes[key] = time.monotonic()

TTL_API = 900   # 15 min
TTL_RSS = 600   # 10 min
TTL_GEN = 900   # 15 min

# ── HTTP helpers ───────────────────────────────────────────────────────────────

async def _api(path: str, params: dict, ttl: float = TTL_API) -> list:
    """Call API-Football with caching. Returns response list."""
    if not API_KEY:
        return []
    key = f"api:{path}:{sorted(params.items())}"
    hit = _cget(key, ttl)
    if hit is not None:
        return hit
    try:
        async with httpx.AsyncClient(timeout=12) as c:
            r = await c.get(
                f"{API_BASE}/{path.lstrip('/')}",
                headers={"x-apisports-key": API_KEY},
                params=params,
            )
            if r.status_code == 200:
                data = r.json().get("response", [])
                _cset(key, data)
                return data
    except Exception:
        pass
    return []


async def _fetch_rss(source_name: str, url: str) -> List[dict]:
    """Fetch and parse an RSS feed. Returns list of headline items."""
    key = f"rss:{url}"
    hit = _cget(key, TTL_RSS)
    if hit is not None:
        return hit
    items = []
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as c:
            r = await c.get(url, headers={"User-Agent": "StatinSite/1.0"})
            if r.status_code != 200:
                return []
        root = ET.fromstring(r.text)
        ns   = {"atom": "http://www.w3.org/2005/Atom"}

        # Handle both RSS <item> and Atom <entry>
        entries = root.findall(".//item") or root.findall(".//atom:entry", ns)
        for entry in entries[:8]:
            def _t(tag: str) -> str:
                el = entry.find(tag) or entry.find(f"atom:{tag}", ns)
                return (el.text or "").strip() if el is not None else ""

            title    = _t("title")
            link_el  = entry.find("link") or entry.find("atom:link", ns)
            link     = (link_el.get("href") or link_el.text or "").strip() if link_el is not None else ""
            pub_raw  = _t("pubDate") or _t("published") or _t("updated")
            summary  = _t("description") or _t("summary") or _t("content")

            if not title:
                continue

            # Parse date — try RFC 2822 then ISO 8601
            pub_dt = None
            for fmt in ("%a, %d %b %Y %H:%M:%S %z", "%a, %d %b %Y %H:%M:%S GMT",
                        "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%SZ"):
                try:
                    pub_dt = datetime.strptime(pub_raw[:30], fmt).replace(tzinfo=timezone.utc)
                    break
                except Exception:
                    pass

            pub_str = pub_dt.isoformat() if pub_dt else datetime.now(timezone.utc).isoformat()

            # Strip HTML from summary
            import re
            clean_summary = re.sub(r"<[^>]+>", "", summary)[:280].strip()

            items.append({
                "id":           str(uuid.uuid5(uuid.NAMESPACE_URL, link or title)),
                "type":         "headline",
                "league":       "general",
                "title":        title,
                "standfirst":   clean_summary or title,
                "summary":      clean_summary or title,
                "body":         [clean_summary] if clean_summary else [],
                "published_at": pub_str,
                "source_type":  "external",
                "source":       source_name,
                "url":          link,
                "meta":         {},
            })
    except Exception:
        pass
    _cset(key, items)
    return items


# ── Poisson xG model ──────────────────────────────────────────────────────────

def _poisson(lam: float, k: int) -> float:
    if lam <= 0:
        return 1.0 if k == 0 else 0.0
    return (lam ** k) * math.exp(-lam) / math.factorial(k)


def _match_probs(xg_h: float, xg_a: float, max_g: int = 7) -> Tuple[float, float, float]:
    hw = dw = aw = 0.0
    for h in range(max_g + 1):
        for a in range(max_g + 1):
            p = _poisson(xg_h, h) * _poisson(xg_a, a)
            if h > a:   hw += p
            elif h == a: dw += p
            else:        aw += p
    t = hw + dw + aw or 1
    return round(hw / t * 100, 1), round(dw / t * 100, 1), round(aw / t * 100, 1)


def _xg_from_stats(hs: dict, as_: dict) -> Tuple[float, float]:
    ph = (hs.get("played_home", 0) + hs.get("played_away", 0)) or 1
    pa = (as_.get("played_home", 0) + as_.get("played_away", 0)) or 1
    h_att = ((hs.get("scored_home", 0)   + hs.get("scored_away", 0))   / ph)
    h_def = ((hs.get("conceded_home", 0) + hs.get("conceded_away", 0)) / ph)
    a_att = ((as_.get("scored_home", 0)  + as_.get("scored_away", 0))  / pa)
    a_def = ((as_.get("conceded_home", 0)+ as_.get("conceded_away", 0))/ pa)
    avg   = 1.35
    xg_h  = max(0.3, min(4.5, (h_att / avg) * (a_def / avg) * avg * 1.1))
    xg_a  = max(0.2, min(4.0, (a_att / avg) * (h_def / avg) * avg))
    return round(xg_h, 2), round(xg_a, 2)


def _ns(raw) -> dict:
    """Normalise team/statistics API response."""
    s = raw[0] if isinstance(raw, list) and raw else (raw if isinstance(raw, dict) else {})
    if not s:
        return {}
    fx = s.get("fixtures", {}) or {}
    gl = s.get("goals",    {}) or {}
    ph = (fx.get("played") or {}).get("home", 0) or 0
    pa = (fx.get("played") or {}).get("away", 0) or 0
    return {
        "played_home":   ph,
        "played_away":   pa,
        "scored_home":   ((gl.get("for")     or {}).get("total") or {}).get("home", 0) or 0,
        "scored_away":   ((gl.get("for")     or {}).get("total") or {}).get("away", 0) or 0,
        "conceded_home": ((gl.get("against") or {}).get("total") or {}).get("home", 0) or 0,
        "conceded_away": ((gl.get("against") or {}).get("total") or {}).get("away", 0) or 0,
        "form":          s.get("form", "") or "",
    }


# ── Text generation helpers ───────────────────────────────────────────────────

def _form_str(form: str, n: int = 5) -> str:
    return "".join(c for c in form.upper() if c in "WDL")[-n:]


def _form_label(form: str) -> str:
    w = form.count("W"); d = form.count("D"); l = form.count("L")
    pts = w * 3 + d
    if pts >= 13: return "in superb form"
    if pts >= 10: return "in strong form"
    if pts >= 7:  return "in decent form"
    if pts >= 4:  return "struggling for consistency"
    return "in poor form"


def _confidence(hw: float, dw: float, aw: float) -> int:
    top = max(hw, dw, aw)
    return min(95, int(50 + (top - 33.3) * 1.2))


def _favourite(home: str, away: str, hw: float, aw: float) -> Tuple[str, float]:
    if hw > aw + 10:   return home, hw
    if aw > hw + 10:   return away, aw
    return "either side", max(hw, aw)


def _tactical_insight(home_form: str, away_form: str,
                       xg_h: float, xg_a: float,
                       home: str, away: str) -> str:
    lines = []
    if xg_h > 1.8 and xg_a < 1.2:
        lines.append(f"{home} hold a significant attacking edge — their season xG profile dominates at home.")
    elif xg_a > 1.8 and xg_h < 1.2:
        lines.append(f"{away} travel with a strong attacking record that could trouble {home}'s defence.")
    else:
        lines.append(f"The StatinSite model rates this as a closely contested fixture — both sides carry genuine attacking threat.")

    hf = _form_label(home_form); af = _form_label(away_form)
    if hf != af:
        better = home if "superb" in hf or "strong" in hf else away
        lines.append(f"Form favours {better} heading into this encounter.")
    else:
        lines.append(f"Both teams are {hf}, making the psychological edge harder to call.")

    btts = round((1 - _poisson(xg_h, 0)) * (1 - _poisson(xg_a, 0)) * 100)
    o25  = round((1 - sum(_poisson(xg_h + xg_a, k) for k in range(3))) * 100)
    lines.append(
        f"The model projects {xg_h} xG for {home} and {xg_a} xG for {away} — "
        f"over 2.5 goals at {o25}%, both teams to score at {btts}%."
    )
    return " ".join(lines)


# ── Item builders ──────────────────────────────────────────────────────────────

def _make_preview(fixture: dict, home_stats: dict, away_stats: dict,
                  league_slug: str) -> dict:
    teams   = fixture.get("teams",   {}) or {}
    league  = fixture.get("league",  {}) or {}
    fix     = fixture.get("fixture", {}) or {}

    home    = (teams.get("home") or {}).get("name", "Home")
    away    = (teams.get("away") or {}).get("name", "Away")
    h_logo  = (teams.get("home") or {}).get("logo", "")
    a_logo  = (teams.get("away") or {}).get("logo", "")
    kickoff = fix.get("date") or datetime.now(timezone.utc).isoformat()
    venue   = (fix.get("venue") or {}).get("name", "")

    xg_h, xg_a = _xg_from_stats(home_stats, away_stats)
    hw, dw, aw  = _match_probs(xg_h, xg_a)
    conf        = _confidence(hw, dw, aw)
    fav, fav_pct= _favourite(home, away, hw, aw)

    home_form_raw = home_stats.get("form", "")
    away_form_raw = away_stats.get("form", "")
    hf = _form_str(home_form_raw)
    af = _form_str(away_form_raw)

    # Build article body
    venue_str = f" at {venue}" if venue else ""
    body = [
        f"{home} host {away}{venue_str} in {LEAGUE_NAMES.get(league_slug, league.get('name', ''))}.",
        f"Recent form: {home} [{hf}] — {away} [{af}].",
        _tactical_insight(hf, af, xg_h, xg_a, home, away),
        f"StatinSite model verdict: {fav} are slight favourites at {round(fav_pct)}% to take the points. "
        f"Win probabilities — {home} {hw}% | Draw {dw}% | {away} {aw}%.",
    ]

    over25 = round((1 - sum(_poisson(xg_h + xg_a, k) for k in range(3))) * 100)
    btts   = round((1 - _poisson(xg_h, 0)) * (1 - _poisson(xg_a, 0)) * 100)

    item_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"preview:{fix.get('id', '')}"))
    return {
        "id":           item_id,
        "type":         "match_preview",
        "league":       league_slug,
        "title":        f"{home} vs {away} — Match Preview",
        "standfirst":   f"StatinSite model: {home} {hw}% | Draw {dw}% | {away} {aw}%.",
        "summary":      f"{fav} favoured at {round(fav_pct)}% — xG: {home} {xg_h}, {away} {xg_a}.",
        "body":         body,
        "published_at": kickoff,
        "source_type":  "internal",
        "source":       "StatinSite Model",
        "url":          None,
        "meta": {
            "fixture_id": fix.get("id"),
            "home_team":  home,
            "away_team":  away,
            "home_logo":  h_logo,
            "away_logo":  a_logo,
            "home_win":   hw,
            "draw":       dw,
            "away_win":   aw,
            "xg_home":    xg_h,
            "xg_away":    xg_a,
            "over_2_5":   over25,
            "btts":       btts,
            "confidence": conf,
            "kickoff":    kickoff,
        },
    }


def _make_title_race(standings: list, league_slug: str) -> Optional[dict]:
    if len(standings) < 4:
        return None

    top4 = standings[:4]
    leader     = top4[0]
    second     = top4[1]
    gap        = (leader.get("points", 0) or 0) - (second.get("points", 0) or 0)
    leader_name= leader.get("team_name", "")
    second_name= second.get("team_name", "")
    lgname     = LEAGUE_NAMES.get(league_slug, league_slug)

    # Only generate if race is remotely interesting (gap ≤ 15)
    if gap > 15:
        return None

    if gap == 0:
        standfirst = f"{leader_name} and {second_name} are level on points at the top of {lgname}."
    elif gap <= 3:
        standfirst = f"{leader_name} lead {second_name} by just {gap} point{'s' if gap > 1 else ''} in {lgname}."
    else:
        standfirst = f"{leader_name} hold a {gap}-point advantage over {second_name} in {lgname}."

    body = [standfirst]

    # Form for top 4
    for t in top4:
        form = _form_str(t.get("form", ""))
        label= _form_label(form)
        body.append(
            f"{t['team_name']} ({t.get('points',0)} pts, {t.get('rank','-')}{'st' if t.get('rank')==1 else 'th'}) — "
            f"recent form: [{form}] — {label}."
        )

    # Relegation mentions
    if len(standings) >= 18:
        bottom3 = standings[-3:]
        names   = ", ".join(t.get("team_name","") for t in bottom3)
        pts     = [t.get("points",0) for t in bottom3]
        body.append(
            f"At the foot of the table, {names} are embroiled in the relegation battle "
            f"({pts[0]}, {pts[1]}, {pts[2]} points respectively)."
        )

    item_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"title-race:{league_slug}"))
    return {
        "id":           item_id,
        "type":         "title_race",
        "league":       league_slug,
        "title":        f"{lgname} Title Race: {leader_name} in front",
        "standfirst":   standfirst,
        "summary":      standfirst,
        "body":         body,
        "published_at": datetime.now(timezone.utc).isoformat(),
        "source_type":  "internal",
        "source":       "StatinSite Model",
        "url":          None,
        "meta": {
            "leader":      leader_name,
            "second":      second_name,
            "gap":         gap,
            "top_4":       [t.get("team_name") for t in top4],
        },
    }


def _make_model_insight(standings: list, league_slug: str) -> Optional[dict]:
    """Find the team most over/under-performing their xG baseline."""
    if not standings:
        return None
    lgname = LEAGUE_NAMES.get(league_slug, league_slug)

    # Find team with best form streak
    best = None
    best_pts = -1
    for t in standings:
        form = _form_str(t.get("form", ""))
        pts  = form.count("W") * 3 + form.count("D")
        if pts > best_pts:
            best_pts = pts
            best     = t

    if not best or best_pts < 9:
        return None

    name  = best.get("team_name", "")
    form  = _form_str(best.get("form", ""))
    label = _form_label(form)
    pos   = best.get("rank", "-")

    body = [
        f"{name} are {label} with a [{form}] run — one of the standout sequences in {lgname} right now.",
        f"They currently sit {pos}{'st' if pos == 1 else 'th'} in the table on {best.get('points', 0)} points.",
        f"The StatinSite model has been tracking {name}'s momentum shift — if this form continues, "
        f"they could prove decisive in the end-of-season picture.",
    ]

    item_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"model-insight:{league_slug}:{name}"))
    return {
        "id":           item_id,
        "type":         "model_insight",
        "league":       league_slug,
        "title":        f"Model Insight: {name} on fire in {lgname}",
        "standfirst":   f"{name} [{form}] — {label}. StatinSite model deep-dive.",
        "summary":      f"{name} have been outstanding recently. [{form}]",
        "body":         body,
        "published_at": datetime.now(timezone.utc).isoformat(),
        "source_type":  "internal",
        "source":       "StatinSite Model",
        "url":          None,
        "meta":         {"team": name, "form": form, "points": best.get("points", 0)},
    }


# ── Data fetchers ──────────────────────────────────────────────────────────────

async def _fetch_upcoming_previews(league_slug: str, league_id: int,
                                    limit: int = 3) -> List[dict]:
    """Fetch upcoming fixtures + stats, return preview items."""
    key = f"gen:previews:{league_slug}"
    hit = _cget(key, TTL_GEN)
    if hit is not None:
        return hit

    fixtures_raw = await _api("fixtures", {
        "league": league_id, "season": CURRENT_SEASON,
        "next": limit, "status": "NS",
    })

    if not fixtures_raw:
        return []

    items = []
    for fx in fixtures_raw[:limit]:
        teams    = fx.get("teams",   {}) or {}
        league   = fx.get("league",  {}) or {}
        home_id  = (teams.get("home") or {}).get("id")
        away_id  = (teams.get("away") or {}).get("id")
        lid      = league.get("id") or league_id

        if not home_id or not away_id:
            continue

        home_s, away_s = await asyncio.gather(
            _api("teams/statistics", {"team": home_id, "league": lid, "season": CURRENT_SEASON}),
            _api("teams/statistics", {"team": away_id, "league": lid, "season": CURRENT_SEASON}),
        )

        items.append(_make_preview(fx, _ns(home_s), _ns(away_s), league_slug))

    _cset(key, items)
    return items


async def _fetch_standings_items(league_slug: str, league_id: int) -> List[dict]:
    """Fetch standings, generate title-race + model-insight items."""
    key = f"gen:standings:{league_slug}"
    hit = _cget(key, TTL_GEN)
    if hit is not None:
        return hit

    raw = await _api("standings", {"league": league_id, "season": CURRENT_SEASON})
    try:
        rows = raw[0]["league"]["standings"][0]
    except (IndexError, KeyError, TypeError):
        return []

    standings = []
    for e in rows:
        t  = e.get("team", {}) or {}
        al = e.get("all",  {}) or {}
        standings.append({
            "rank":      e.get("rank"),
            "team_name": t.get("name", ""),
            "team_id":   t.get("id"),
            "points":    e.get("points", 0),
            "form":      e.get("form", ""),
            "played":    (al.get("played") or 0),
            "gd":        e.get("goalsDiff", 0),
        })

    items = []
    tr = _make_title_race(standings, league_slug)
    if tr:
        items.append(tr)
    mi = _make_model_insight(standings, league_slug)
    if mi:
        items.append(mi)

    _cset(key, items)
    return items


async def _fetch_all_rss() -> List[dict]:
    """Fetch all RSS sources concurrently."""
    key = "gen:rss:all"
    hit = _cget(key, TTL_RSS)
    if hit is not None:
        return hit
    results = await asyncio.gather(*[
        _fetch_rss(name, url) for name, url in RSS_SOURCES
    ])
    items = [item for sublist in results for item in sublist]
    # Deduplicate by title
    seen = set()
    deduped = []
    for item in items:
        t = item["title"].lower().strip()
        if t not in seen:
            seen.add(t)
            deduped.append(item)
    _cset(key, deduped)
    return deduped


# ── Main feed endpoint ────────────────────────────────────────────────────────

@router.get("/feed")
async def intelligence_feed(limit: int = Query(40, ge=1, le=100)):
    """
    Returns the Football Intelligence feed — merges match previews,
    league analysis, model insights, and external RSS headlines.
    Sorted by published_at descending (newest first).
    """
    gen_key = f"gen:feed:full:{limit}"
    hit = _cget(gen_key, TTL_GEN)
    if hit is not None:
        return hit

    # ── Fetch everything in parallel ──────────────────────────────────
    #    3 preview leagues + 5 standings leagues + RSS
    PREVIEW_LEAGUES  = ["epl", "laliga", "ucl"]
    STANDINGS_LEAGUES = ["epl", "laliga", "seriea", "bundesliga", "ligue1"]

    tasks = []

    for slug in PREVIEW_LEAGUES:
        tasks.append(_fetch_upcoming_previews(slug, LEAGUE_IDS[slug], limit=2))

    for slug in STANDINGS_LEAGUES:
        tasks.append(_fetch_standings_items(slug, LEAGUE_IDS[slug]))

    tasks.append(_fetch_all_rss())

    results = await asyncio.gather(*tasks, return_exceptions=True)

    all_items: List[dict] = []
    for r in results:
        if isinstance(r, list):
            all_items.extend(r)

    # ── Sort by published_at descending ───────────────────────────────
    def _parse_dt(s: str) -> datetime:
        try:
            return datetime.fromisoformat(s.replace("Z", "+00:00"))
        except Exception:
            return datetime.now(timezone.utc)

    all_items.sort(key=lambda x: _parse_dt(x.get("published_at", "")), reverse=True)

    # ── Interleave: don't let RSS flood internal items ─────────────────
    internal = [i for i in all_items if i.get("source_type") == "internal"]
    external = [i for i in all_items if i.get("source_type") == "external"]

    interleaved: List[dict] = []
    ei = 0
    for idx, item in enumerate(internal):
        interleaved.append(item)
        # Insert 2 RSS items after every internal item
        for _ in range(2):
            if ei < len(external):
                interleaved.append(external[ei])
                ei += 1

    # Append any remaining external items
    interleaved.extend(external[ei:])

    final = interleaved[:limit]

    result = {
        "mode":  "live",
        "count": len(final),
        "items": final,
    }

    _cset(gen_key, result)
    return result


# ── Health check ───────────────────────────────────────────────────────────────

@router.get("/health")
async def intelligence_health():
    return {
        "api_key":   "set" if API_KEY else "MISSING",
        "season":    CURRENT_SEASON,
        "leagues":   list(LEAGUE_IDS.keys()),
        "rss_sources": len(RSS_SOURCES),
        "cache_keys": len(_cache),
    }