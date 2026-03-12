"""
backend/app/match_intelligence.py  —  StatinSite Match Intelligence v2
═══════════════════════════════════════════════════════════════════════
Aggregates all API-Football data for a single fixture into one response.

Route added to main.py:
    GET /api/match-intelligence/{fixture_id}

Fetches in parallel:
    /fixtures                     core fixture + status + venue
    /fixtures/events              timeline events
    /fixtures/lineups             official lineup (if available)
    /fixtures/statistics          match stats
    /fixtures/headtohead          last 10 meetings
    /injuries                     injury report for this fixture
    /fixtures/players             per-player stats (for lineup model)
    /teams/statistics × 2         season-level team stats
    /venues                       full venue card
    /players/squads × 2           team squads (for predicted lineup)
    /fixtures?team=&last=7 × 2    recent form fixtures

Cache TTLs (per key prefix):
    fixture_core      600  s   10 min
    events            300  s    5 min (live events tick fast)
    statistics        300  s    5 min
    lineups          1800  s   30 min
    h2h             86400  s   24 h
    injuries         21600  s    6 h
    venue           604800  s    7 days
    team_stats       86400  s   24 h
    squad            86400  s   24 h
    recent_fx         3600  s    1 h
    player_stats      1800  s   30 min
    full               300  s    5 min  (assembled response)
"""

import os
import time
import asyncio
from typing import Any, Dict, List, Optional, Tuple

import httpx
from app.lineup_predictor import predict_lineup, detect_formation

# ── API-Football ──────────────────────────────────────────────────────
API_KEY  = os.getenv("API_FOOTBALL_KEY", "")
BASE_URL = "https://v3.football.api-sports.io"
HEADERS  = {"x-apisports-key": API_KEY}
SEASON   = int(os.getenv("CURRENT_SEASON", "2025"))

# ── Cache ─────────────────────────────────────────────────────────────
_store: Dict[str, Any]   = {}
_times: Dict[str, float] = {}

_TTL: Dict[str, int] = {
    "fixture_core":  600,
    "events":        300,
    "statistics":    300,
    "lineups":      1800,
    "h2h":         86400,
    "injuries":    21600,
    "venue":      604800,
    "team_stats":  86400,
    "squad":       86400,
    "recent_fx":    3600,
    "player_stats": 1800,
    "full":          300,
}

def _ttl(key: str) -> int:
    return _TTL.get(key.split(":")[0], 600)

def _get(key: str) -> Optional[Any]:
    if key in _store and time.time() - _times[key] < _ttl(key):
        return _store[key]
    _store.pop(key, None); _times.pop(key, None)
    return None

def _set(key: str, v: Any):
    _store[key] = v; _times[key] = time.time()


# ══════════════════════════════════════════════════════════════════════
# API FETCH HELPERS
# ══════════════════════════════════════════════════════════════════════

async def _api(c: httpx.AsyncClient, ep: str, params: Dict) -> Any:
    try:
        r = await c.get(f"{BASE_URL}/{ep}", headers=HEADERS, params=params, timeout=14.0)
        if r.status_code == 200:
            body = r.json()
            return body.get("response", []) if isinstance(body, dict) else []
    except Exception:
        pass
    return []

async def _fixture_core(c, fid):
    k = f"fixture_core:{fid}"
    if (h := _get(k)) is not None: return h
    raw = await _api(c, "fixtures", {"id": fid})
    v = raw[0] if isinstance(raw, list) and raw else {}
    _set(k, v); return v

async def _events(c, fid):
    k = f"events:{fid}"
    if (h := _get(k)) is not None: return h
    v = await _api(c, "fixtures/events", {"fixture": fid})
    v = v if isinstance(v, list) else []
    _set(k, v); return v

async def _lineups(c, fid):
    k = f"lineups:{fid}"
    if (h := _get(k)) is not None: return h
    v = await _api(c, "fixtures/lineups", {"fixture": fid})
    v = v if isinstance(v, list) else []
    _set(k, v); return v

async def _statistics(c, fid):
    k = f"statistics:{fid}"
    if (h := _get(k)) is not None: return h
    v = await _api(c, "fixtures/statistics", {"fixture": fid})
    v = v if isinstance(v, list) else []
    _set(k, v); return v

async def _h2h(c, t1, t2):
    k = f"h2h:{min(t1,t2)}-{max(t1,t2)}"
    if (h := _get(k)) is not None: return h
    v = await _api(c, "fixtures/headtohead", {"h2h": f"{t1}-{t2}", "last": 10})
    v = v if isinstance(v, list) else []
    _set(k, v); return v

async def _injuries(c, fid):
    k = f"injuries:{fid}"
    if (h := _get(k)) is not None: return h
    v = await _api(c, "injuries", {"fixture": fid})
    v = v if isinstance(v, list) else []
    _set(k, v); return v

async def _venue(c, vid):
    if not vid: return {}
    k = f"venue:{vid}"
    if (h := _get(k)) is not None: return h
    raw = await _api(c, "venues", {"id": vid})
    v = raw[0] if isinstance(raw, list) and raw else {}
    _set(k, v); return v

async def _team_stats(c, tid, lid):
    k = f"team_stats:{tid}:{lid}"
    if (h := _get(k)) is not None: return h
    raw = await _api(c, "teams/statistics", {"team": tid, "league": lid, "season": SEASON})
    v = raw if isinstance(raw, dict) else (raw[0] if isinstance(raw, list) and raw else {})
    _set(k, v); return v

async def _squad(c, tid):
    k = f"squad:{tid}"
    if (h := _get(k)) is not None: return h
    raw = await _api(c, "players/squads", {"team": tid})
    v = (raw[0].get("players", []) if isinstance(raw, list) and raw and isinstance(raw[0], dict) else [])
    _set(k, v); return v

async def _recent_fixtures(c, tid, lid):
    k = f"recent_fx:{tid}:{lid}"
    if (h := _get(k)) is not None: return h
    v = await _api(c, "fixtures", {"team": tid, "league": lid, "season": SEASON, "status": "FT", "last": 7})
    v = v if isinstance(v, list) else []
    _set(k, v); return v

async def _player_stats_for_fixture(c, fid):
    k = f"player_stats:{fid}"
    if (h := _get(k)) is not None: return h
    v = await _api(c, "fixtures/players", {"fixture": fid})
    v = v if isinstance(v, list) else []
    _set(k, v); return v

async def _recent_lineups_for_team(c, tid, lid):
    """Fetch lineups from last 5 completed fixtures for a team."""
    k = f"lineups:team:{tid}:{lid}"
    if (h := _get(k)) is not None: return h
    recent = await _recent_fixtures(c, tid, lid)
    result = []
    for fx in recent[:5]:
        fid = ((fx.get("fixture") or {}).get("id"))
        if fid:
            raw = await _api(c, "fixtures/lineups", {"fixture": fid, "team": tid})
            if isinstance(raw, list) and raw:
                result.append(raw[0])
    _set(k, result); return result


# ══════════════════════════════════════════════════════════════════════
# NORMALIZERS
# ══════════════════════════════════════════════════════════════════════

def _n_header(core: Dict) -> Dict:
    fx  = core.get("fixture", {}) or {}
    lg  = core.get("league",  {}) or {}
    hm  = (core.get("teams",  {}) or {}).get("home", {}) or {}
    aw  = (core.get("teams",  {}) or {}).get("away", {}) or {}
    gls = core.get("goals",   {}) or {}
    sc  = core.get("score",   {}) or {}
    vn  = fx.get("venue", {}) or {}
    return {
        "fixture_id":   fx.get("id"),
        "date":         fx.get("date"),
        "timestamp":    fx.get("timestamp"),
        "status":       (fx.get("status") or {}).get("long", "Not Started"),
        "status_short": (fx.get("status") or {}).get("short", "NS"),
        "elapsed":      (fx.get("status") or {}).get("elapsed"),
        "referee":      fx.get("referee"),
        "timezone":     fx.get("timezone"),
        "venue_name":   vn.get("name"),
        "venue_city":   vn.get("city"),
        "league":       {"id": lg.get("id"), "name": lg.get("name"), "season": lg.get("season"), "round": lg.get("round"), "logo": lg.get("logo"), "flag": lg.get("flag"), "country": lg.get("country")},
        "home":         {"id": hm.get("id"), "name": hm.get("name"), "logo": hm.get("logo"), "winner": hm.get("winner")},
        "away":         {"id": aw.get("id"), "name": aw.get("name"), "logo": aw.get("logo"), "winner": aw.get("winner")},
        "score": {
            "home": gls.get("home"), "away": gls.get("away"),
            "ht_home":  (sc.get("halftime")  or {}).get("home"), "ht_away":  (sc.get("halftime")  or {}).get("away"),
            "ft_home":  (sc.get("fulltime")  or {}).get("home"), "ft_away":  (sc.get("fulltime")  or {}).get("away"),
            "et_home":  (sc.get("extratime") or {}).get("home"), "et_away":  (sc.get("extratime") or {}).get("away"),
            "pen_home": (sc.get("penalty")   or {}).get("home"), "pen_away": (sc.get("penalty")   or {}).get("away"),
        },
    }


def _n_events(raw: List) -> List[Dict]:
    out = []
    for e in raw or []:
        t = e.get("team", {}) or {}; p = e.get("player", {}) or {}; a = e.get("assist", {}) or {}; tm = e.get("time", {}) or {}
        out.append({"minute": tm.get("elapsed"), "extra": tm.get("extra"), "team_id": t.get("id"), "team_name": t.get("name"), "team_logo": t.get("logo"), "player_id": p.get("id"), "player_name": p.get("name"), "assist_id": a.get("id"), "assist_name": a.get("name"), "type": e.get("type"), "detail": e.get("detail"), "comments": e.get("comments")})
    return sorted(out, key=lambda x: (x.get("minute") or 0, x.get("extra") or 0))


def _n_official_lineups(raw: List) -> List[Dict]:
    out = []
    for lu in raw or []:
        team = lu.get("team", {}) or {}; coach = lu.get("coach", {}) or {}
        def _p(obj): p = (obj.get("player") or {}); return {"id": p.get("id"), "name": p.get("name"), "number": p.get("number"), "pos": p.get("pos"), "grid": p.get("grid")}
        out.append({"team_id": team.get("id"), "team_name": team.get("name"), "team_logo": team.get("logo"), "formation": lu.get("formation"), "coach": {"id": coach.get("id"), "name": coach.get("name"), "photo": coach.get("photo")}, "start_xi": [_p(p) for p in lu.get("startXI", []) or []], "subs": [_p(p) for p in lu.get("substitutes", []) or []], "predicted": False})
    return out


def _n_statistics(raw: List, hid: int, aid: int) -> Dict:
    hd, ad = {}, {}
    for ts in raw or []:
        tgt = hd if (ts.get("team") or {}).get("id") == hid else ad
        for s in ts.get("statistics") or []: tgt[s.get("type", "")] = s.get("value")
    def b(k): return {"home": hd.get(k), "away": ad.get(k)}
    return {
        "shots_total": b("Total Shots"), "shots_on_target": b("Shots on Goal"), "shots_off_target": b("Shots off Goal"),
        "shots_inside_box": b("Shots insidebox"), "shots_outside_box": b("Shots outsidebox"), "shots_blocked": b("Blocked Shots"),
        "fouls": b("Fouls"), "corner_kicks": b("Corner Kicks"), "offsides": b("Offsides"),
        "possession": b("Ball Possession"), "yellow_cards": b("Yellow Cards"), "red_cards": b("Red Cards"),
        "goalkeeper_saves": b("Goalkeeper Saves"), "total_passes": b("Total passes"),
        "accurate_passes": b("Passes accurate"), "pass_accuracy": b("Passes %"), "expected_goals": b("expected_goals"),
    }


def _n_h2h(raw: List, hid: int, aid: int) -> Dict:
    results = []; hw = dw = aw = 0
    for fx in raw or []:
        teams = fx.get("teams", {}) or {}; goals = fx.get("goals", {}) or {}; lg = fx.get("league", {}) or {}; f = fx.get("fixture", {}) or {}
        hg = goals.get("home") or 0; ag = goals.get("away") or 0
        h_id = (teams.get("home") or {}).get("id")
        wid  = h_id if hg > ag else ((teams.get("away") or {}).get("id") if ag > hg else None)
        results.append({"fixture_id": f.get("id"), "date": (f.get("date") or "")[:10], "league": lg.get("name"), "home_team": (teams.get("home") or {}).get("name"), "home_logo": (teams.get("home") or {}).get("logo"), "away_team": (teams.get("away") or {}).get("name"), "away_logo": (teams.get("away") or {}).get("logo"), "home_goals": hg, "away_goals": ag})
        if wid == hid: hw += 1
        elif wid == aid: aw += 1
        else: dw += 1
    return {"count": len(results), "home_wins": hw, "draws": dw, "away_wins": aw, "results": results}


def _n_injuries(raw: List, hid: int, aid: int) -> Dict:
    hi, ai = [], []
    for inj in raw or []:
        p = inj.get("player") or {}; t = inj.get("team") or {}; tid = t.get("id")
        entry = {"player_id": p.get("id"), "player_name": p.get("name"), "player_photo": p.get("photo"), "type": p.get("type"), "reason": p.get("reason")}
        if tid == hid: hi.append(entry)
        elif tid == aid: ai.append(entry)
    return {"home": hi, "away": ai}


def _n_venue(raw: Dict) -> Dict:
    if not raw: return {}
    return {"id": raw.get("id"), "name": raw.get("name"), "city": raw.get("city"), "country": raw.get("country"), "capacity": raw.get("capacity"), "surface": raw.get("surface"), "image": raw.get("image"), "address": raw.get("address")}


def _n_team_stats(raw: Dict) -> Dict:
    if not raw: return {}
    gf = (raw.get("goals") or {}).get("for",     {}) or {}
    ga = (raw.get("goals") or {}).get("against",  {}) or {}
    fx = raw.get("fixtures", {}) or {}
    return {
        "played":   (fx.get("played")  or {}).get("total"), "wins":   (fx.get("wins")    or {}).get("total"),
        "draws":    (fx.get("draws")   or {}).get("total"), "losses": (fx.get("loses")   or {}).get("total"),
        "goals_for_avg":       (gf.get("average") or {}).get("total"),
        "goals_against_avg":   (ga.get("average") or {}).get("total"),
        "goals_for_total":     (gf.get("total")   or {}).get("total"),
        "goals_against_total": (ga.get("total")   or {}).get("total"),
        "clean_sheets":        (raw.get("clean_sheet")    or {}).get("total"),
        "failed_to_score":     (raw.get("failed_to_score") or {}).get("total"),
        "form":                raw.get("form"),
        "lineups_used": [{"formation": l.get("formation"), "played": l.get("played")} for l in (raw.get("lineups") or [])[:4]],
        "avg_goals_home": (gf.get("average") or {}).get("home"),
        "avg_goals_away": (gf.get("average") or {}).get("away"),
        "biggest_wins":   (raw.get("biggest") or {}).get("wins"),
        "biggest_losses": (raw.get("biggest") or {}).get("loses"),
    }


def _n_recent_form(fxs: List, tid: int) -> List[Dict]:
    out = []
    for fx in fxs or []:
        teams = fx.get("teams", {}) or {}; goals = fx.get("goals", {}) or {}; lg = fx.get("league", {}) or {}; f = fx.get("fixture", {}) or {}
        hm = teams.get("home") or {}; aw = teams.get("away") or {}
        is_home = hm.get("id") == tid
        gf = (goals.get("home") if is_home else goals.get("away")) or 0
        ga = (goals.get("away") if is_home else goals.get("home")) or 0
        opp = (aw if is_home else hm).get("name", "")
        result = "W" if gf > ga else ("L" if gf < ga else "D")
        out.append({"date": (f.get("date") or "")[:10], "opponent": opp, "home_away": "H" if is_home else "A", "goals_for": gf, "goals_against": ga, "result": result, "league": lg.get("name")})
    return out


# ══════════════════════════════════════════════════════════════════════
# INSIGHTS ENGINE
# ══════════════════════════════════════════════════════════════════════

def _generate_insights(header, h2h, home_stats, away_stats, home_form, away_form, injuries, prediction) -> List[Dict]:
    insights = []
    hname = (header.get("home") or {}).get("name", "Home")
    aname = (header.get("away") or {}).get("name", "Away")

    def pts(form_list):
        return sum(3 if r.get("result") == "W" else (1 if r.get("result") == "D" else 0) for r in form_list[:5])

    hp5 = pts(home_form); ap5 = pts(away_form)

    # Form trends
    if hp5 >= 12:
        insights.append({"type": "form", "icon": "🔥", "title": f"{hname} in outstanding form", "body": f"{hname} have collected {hp5}/15 points in their last 5 matches.", "severity": "positive"})
    elif hp5 <= 4:
        insights.append({"type": "form", "icon": "⚠️", "title": f"{hname} struggling", "body": f"{hname} have taken only {hp5}/15 points — under pressure at home.", "severity": "warning"})
    if ap5 >= 12:
        insights.append({"type": "form", "icon": "🔥", "title": f"{aname} arriving in form", "body": f"{aname} have taken {ap5}/15 points recently — dangerous travelers.", "severity": "positive"})
    elif ap5 <= 4:
        insights.append({"type": "form", "icon": "📉", "title": f"{aname} poor run", "body": f"{aname} have won only {sum(1 for r in away_form[:5] if r.get('result')=='W')} of their last 5.", "severity": "warning"})

    # H2H trends
    cnt = h2h.get("count", 0)
    if cnt >= 5:
        hw = h2h.get("home_wins", 0); aw_h2h = h2h.get("away_wins", 0); dw = h2h.get("draws", 0)
        tot = hw + aw_h2h + dw or 1
        if hw / tot >= 0.6:
            insights.append({"type": "h2h", "icon": "📊", "title": f"{hname} dominate this fixture", "body": f"{hname} have won {hw} of the last {cnt} meetings ({round(hw/tot*100)}%).", "severity": "info"})
        elif aw_h2h / tot >= 0.6:
            insights.append({"type": "h2h", "icon": "📊", "title": f"{aname} hold strong H2H edge", "body": f"{aname} have won {aw_h2h} of the last {cnt} meetings ({round(aw_h2h/tot*100)}%).", "severity": "info"})
        total_g = sum((r.get("home_goals", 0) + r.get("away_goals", 0)) for r in h2h.get("results", []))
        avg_g = total_g / cnt
        if avg_g >= 3.0:
            insights.append({"type": "goals", "icon": "⚽", "title": "Typically a high-scoring H2H", "body": f"These teams average {avg_g:.1f} goals per meeting. Expect an open game.", "severity": "info"})
        elif avg_g <= 1.5:
            insights.append({"type": "goals", "icon": "🔒", "title": "Tight H2H historically", "body": f"Only {avg_g:.1f} goals per game on average — tactical battle expected.", "severity": "info"})

    # Injuries
    h_inj = len(injuries.get("home", [])); a_inj = len(injuries.get("away", []))
    if h_inj >= 3:
        insights.append({"type": "injury", "icon": "🏥", "title": f"{hname} hit by injuries", "body": f"{hname} are missing {h_inj} players — could disrupt their usual shape.", "severity": "warning"})
    elif h_inj == 1 or h_inj == 2:
        insights.append({"type": "injury", "icon": "🩹", "title": f"{hname} have {h_inj} doubt(s)", "body": f"{', '.join(p['player_name'] for p in injuries['home'])} listed as doubtful.", "severity": "neutral"})
    if a_inj >= 3:
        insights.append({"type": "injury", "icon": "🏥", "title": f"{aname} travelling with depleted squad", "body": f"{aname} are without {a_inj} first-team players.", "severity": "warning"})

    # Model edge
    pred = prediction or {}
    hp = pred.get("p_home_win", pred.get("home_win_prob", 0))
    ap = pred.get("p_away_win", pred.get("away_win_prob", 0))
    conf = pred.get("confidence", 0)
    if conf >= 68:
        fav = hname if hp > ap else aname
        fav_pct = round(max(hp, ap) * 100)
        insights.append({"type": "model", "icon": "🤖", "title": f"Strong model signal for {fav}", "body": f"Model rates {fav} at {fav_pct}% with {conf}% confidence — above-average clarity.", "severity": "positive"})

    # Betting markets
    btts = pred.get("btts", 0)
    if btts >= 0.65:
        insights.append({"type": "market", "icon": "🎯", "title": "Both teams to score likely", "body": f"Model rates BTTS at {round(btts*100)}% — both attacks look sharp.", "severity": "positive"})
    o25 = pred.get("over_2_5", 0)
    if o25 >= 0.68:
        insights.append({"type": "market", "icon": "📈", "title": "Over 2.5 goals favoured", "body": f"Model puts over 2.5 goals at {round(o25*100)}% based on combined attack/defence rates.", "severity": "positive"})

    # Defensive context
    h_cs = (home_stats.get("clean_sheets") or 0); h_pl = (home_stats.get("played") or 1)
    if h_cs / h_pl >= 0.4:
        insights.append({"type": "defence", "icon": "🛡️", "title": f"{hname} solid at home", "body": f"{h_cs} clean sheets in {h_pl} games ({round(h_cs/h_pl*100)}%) — hard to break down.", "severity": "info"})

    return insights[:8]


# ══════════════════════════════════════════════════════════════════════
# PREDICTED LINEUPS BUILDER
# ══════════════════════════════════════════════════════════════════════

def _build_predicted_lineup_response(
    predicted: Dict, team_id: int, team_name: str, team_logo: str
) -> Dict:
    """Wrap a predict_lineup() result in the standard lineup response shape."""
    return {
        "team_id":    team_id,
        "team_name":  team_name,
        "team_logo":  team_logo,
        "formation":  predicted["formation"],
        "coach":      {},
        "start_xi": [
            {"id": p["player_id"], "name": p["name"], "number": p.get("number"), "pos": p["pos"], "grid": p["grid"], "confidence": p["confidence"], "reason": p["reason"]}
            for p in predicted["start_xi"]
        ],
        "subs": [
            {"id": p["player_id"], "name": p["name"], "number": p.get("number"), "pos": p["pos"], "confidence": p["confidence"], "reason": p["reason"]}
            for p in predicted["bench"]
        ],
        "unavailable": predicted.get("unavailable", []),
        "predicted":   True,
        "confidence":  predicted["confidence"],
    }


# ══════════════════════════════════════════════════════════════════════
# MAIN ENTRY POINT
# ══════════════════════════════════════════════════════════════════════

async def get_match_intelligence(
    fixture_id: int,
    prediction: Optional[Dict] = None,
) -> Dict:
    """
    Unified match intelligence response for one fixture.

    Behavior:
      - Live / completed: uses official lineup from API-Football
      - Upcoming (NS / TBD): runs lineup prediction model
      - All cases: generates insights and merges prediction from caller
    """
    full_key = f"full:{fixture_id}"
    if (cached := _get(full_key)) is not None:
        return cached

    async with httpx.AsyncClient() as c:

        # ── Phase 1: core (sequential — need IDs) ────────────────────
        core = await _fixture_core(c, fixture_id)
        if not core:
            return {"error": "Fixture not found", "fixture_id": fixture_id}

        home_id  = ((core.get("teams") or {}).get("home") or {}).get("id", 0)
        away_id  = ((core.get("teams") or {}).get("away") or {}).get("id", 0)
        lid      = (core.get("league") or {}).get("id", 0)
        venue_id = ((core.get("fixture") or {}).get("venue") or {}).get("id", 0)
        s_short  = ((core.get("fixture") or {}).get("status") or {}).get("short", "NS")
        upcoming = s_short in ("NS", "TBD", "PST")

        # ── Phase 2: fire all requests in parallel ────────────────────
        (
            events_raw, lineups_raw, stats_raw,
            h2h_raw, injuries_raw,
            h_ts_raw, a_ts_raw,
            venue_raw,
            h_recent_fx, a_recent_fx,
        ) = await asyncio.gather(
            _events(c, fixture_id),
            _lineups(c, fixture_id),
            _statistics(c, fixture_id),
            _h2h(c, home_id, away_id),
            _injuries(c, fixture_id),
            _team_stats(c, home_id, lid),
            _team_stats(c, away_id, lid),
            _venue(c, venue_id),
            _recent_fixtures(c, home_id, lid),
            _recent_fixtures(c, away_id, lid),
        )

        # ── Phase 3: predicted lineup (upcoming only) ─────────────────
        home_predicted = None
        away_predicted = None

        if upcoming and not lineups_raw:
            (
                h_squad, a_squad,
                h_recent_lu, a_recent_lu,
            ) = await asyncio.gather(
                _squad(c, home_id),
                _squad(c, away_id),
                _recent_lineups_for_team(c, home_id, lid),
                _recent_lineups_for_team(c, away_id, lid),
            )

            # Enrich recent fixtures with per-player stats
            async def enrich(fx_list):
                out = []
                for fx in fx_list[:5]:
                    fid = ((fx.get("fixture") or {}).get("id"))
                    if fid:
                        ps = await _player_stats_for_fixture(c, fid)
                        out.append({**fx, "players": ps})
                    else:
                        out.append(fx)
                return out

            h_enriched, a_enriched = await asyncio.gather(
                enrich(h_recent_fx), enrich(a_recent_fx)
            )

            home_inj_list = [
                {"player": {"id": p["player_id"], "type": p.get("type", "Injury")}}
                for p in _n_injuries(injuries_raw, home_id, away_id).get("home", [])
            ]
            away_inj_list = [
                {"player": {"id": p["player_id"], "type": p.get("type", "Injury")}}
                for p in _n_injuries(injuries_raw, home_id, away_id).get("away", [])
            ]

            home_predicted = predict_lineup(h_squad, h_enriched, h_recent_lu, home_inj_list)
            away_predicted = predict_lineup(a_squad, a_enriched, a_recent_lu, away_inj_list)

    # ── Normalise ─────────────────────────────────────────────────────
    header    = _n_header(core)
    events    = _n_events(events_raw)
    stats     = _n_statistics(stats_raw, home_id, away_id)
    h2h       = _n_h2h(h2h_raw, home_id, away_id)
    injuries  = _n_injuries(injuries_raw, home_id, away_id)
    venue     = _n_venue(venue_raw)
    h_season  = _n_team_stats(h_ts_raw)
    a_season  = _n_team_stats(a_ts_raw)
    h_form    = _n_recent_form(h_recent_fx, home_id)
    a_form    = _n_recent_form(a_recent_fx, away_id)

    # ── Lineups: official → predicted → empty ─────────────────────────
    if lineups_raw:
        lineups = _n_official_lineups(lineups_raw)
    elif home_predicted and away_predicted:
        lineups = [
            _build_predicted_lineup_response(home_predicted, home_id, header["home"]["name"], header["home"]["logo"]),
            _build_predicted_lineup_response(away_predicted, away_id, header["away"]["name"], header["away"]["logo"]),
        ]
    else:
        lineups = []

    insights = _generate_insights(header, h2h, h_season, a_season, h_form, a_form, injuries, prediction or {})

    result = {
        "header":            header,
        "events":            events,
        "lineups":           lineups,
        "statistics":        stats,
        "h2h":               h2h,
        "injuries":          injuries,
        "venue":             venue,
        "home_season_stats": h_season,
        "away_season_stats": a_season,
        "home_recent_form":  h_form,
        "away_recent_form":  a_form,
        "insights":          insights,
        "prediction":        prediction or {},
        "_meta": {
            "fixture_id":           fixture_id,
            "is_upcoming":          upcoming,
            "has_official_lineups": bool(lineups_raw),
            "fetched_at":           time.time(),
        },
    }

    _set(full_key, result)
    return result