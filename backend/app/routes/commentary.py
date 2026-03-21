"""
GET  /api/commentary/{fixture_id}   → cooldown status
POST /api/commentary/{fixture_id}   → generate commentary

Proxies OpenRouter (OPENROUTER_API_KEY) and returns 2-4 AI commentary
entries as JSON.  All new fields map directly to match_intelligence.py
response keys so the frontend can pass them through with zero transform.

NEW vs original
───────────────
Request schema
  + stats:  shots_inside/outside_box, total_passes, fouls, offsides,
            yellow_cards, red_cards, goalkeeper_saves  (7 new stat fields)
  + h2h:    full H2HBlock with per-result list
  + home_form / away_form: last-5 results with scorelines
  + home_season_stats / away_season_stats: W/D/L, goals avg, clean sheets, form
  + injuries: split home/away InjuriesBlock
  + venue: name, city, capacity, surface
  + referee, league_round
  + home_lineup_formation / away_lineup_formation
  + player_ratings: per-player rating + minutes
  + prediction: p_home_win, p_draw, p_away_win, xg, btts, over_2_5
  + insights: pre-computed insight bullets from match_intelligence

Prompt improvements
  + Structured sections with clear headings
  + References player ratings, season form, H2H history, injuries
  + Mode-aware: prematch gets 3 preview entries, live 2, fulltime 3
  + temperature=0.85 for more natural language
  + max_tokens 500 → 750

Bug fixes
  + _strip_json_fences() replaces the broken lstrip() logic
  + Model string corrected to "anthropic/claude-haiku-4-5-20251001"
  + GET /api/commentary/{id} now implemented (cooldown status)
  + max 4 entries returned (was always 2)
"""

import os
import re
import time
import logging
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)

OPENROUTER_KEY   = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_URL   = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = "anthropic/claude-haiku-4-5-20251001"

_last_gen: Dict[str, float] = {}
_RATE_GAP = 20


# ═══════════════════════════════════════════════════════════════════════
# REQUEST SCHEMA
# ═══════════════════════════════════════════════════════════════════════

class EventItem(BaseModel):
    minute:  Any
    type:    str
    detail:  Optional[str] = None
    player:  str
    team:    str
    assist:  Optional[str] = None

class StatsBlock(BaseModel):
    possession:         Optional[str] = None
    shots_total:        Optional[str] = None
    shots_on_target:    Optional[str] = None
    shots_inside_box:   Optional[str] = None
    shots_outside_box:  Optional[str] = None
    xg:                 Optional[str] = None
    corners:            Optional[str] = None
    pass_accuracy:      Optional[str] = None
    total_passes:       Optional[str] = None
    fouls:              Optional[str] = None
    offsides:           Optional[str] = None
    yellow_cards:       Optional[str] = None
    red_cards:          Optional[str] = None
    goalkeeper_saves:   Optional[str] = None

class MomentumBlock(BaseModel):
    home_pct:        Optional[int] = None
    away_pct:        Optional[int] = None
    dominant_period: Optional[str] = None

class H2HResult(BaseModel):
    date:       Optional[str] = None
    home_team:  Optional[str] = None
    away_team:  Optional[str] = None
    home_goals: Optional[int] = None
    away_goals: Optional[int] = None

class H2HBlock(BaseModel):
    count:     Optional[int]   = None
    home_wins: Optional[int]   = None
    draws:     Optional[int]   = None
    away_wins: Optional[int]   = None
    avg_goals: Optional[float] = None
    results:   List[H2HResult] = []

class FormEntry(BaseModel):
    date:          Optional[str] = None
    opponent:      Optional[str] = None
    result:        Optional[str] = None
    goals_for:     Optional[int] = None
    goals_against: Optional[int] = None
    home_away:     Optional[str] = None

class SeasonStats(BaseModel):
    played:            Optional[int] = None
    wins:              Optional[int] = None
    draws:             Optional[int] = None
    losses:            Optional[int] = None
    goals_for_avg:     Optional[str] = None
    goals_against_avg: Optional[str] = None
    clean_sheets:      Optional[int] = None
    form:              Optional[str] = None

class InjuryEntry(BaseModel):
    player_name: Optional[str] = None
    type:        Optional[str] = None

class InjuriesBlock(BaseModel):
    home: List[InjuryEntry] = []
    away: List[InjuryEntry] = []

class VenueBlock(BaseModel):
    name:     Optional[str] = None
    city:     Optional[str] = None
    capacity: Optional[int] = None
    surface:  Optional[str] = None

class PlayerRating(BaseModel):
    name:    str
    team:    str
    rating:  float
    minutes: Optional[int] = None

class PredictionBlock(BaseModel):
    p_home_win: Optional[float] = None
    p_draw:     Optional[float] = None
    p_away_win: Optional[float] = None
    xg_home:    Optional[float] = None
    xg_away:    Optional[float] = None
    btts:       Optional[float] = None
    over_2_5:   Optional[float] = None

class InsightEntry(BaseModel):
    type:  Optional[str] = None
    title: Optional[str] = None
    body:  Optional[str] = None

class CommentaryRequest(BaseModel):
    home_team:  str
    away_team:  str
    home_score: int = 0
    away_score: int = 0
    elapsed:    int = 0
    mode:       str = "live"

    events:   List[EventItem] = []
    stats:    Optional[StatsBlock]    = None
    momentum: Optional[MomentumBlock] = None

    h2h:               Optional[H2HBlock]    = None
    home_form:         List[FormEntry]        = []
    away_form:         List[FormEntry]        = []
    home_season_stats: Optional[SeasonStats] = None
    away_season_stats: Optional[SeasonStats] = None
    injuries:          Optional[InjuriesBlock] = None

    venue:                 Optional[VenueBlock] = None
    referee:               Optional[str]        = None
    league_round:          Optional[str]        = None
    home_lineup_formation: Optional[str]        = None
    away_lineup_formation: Optional[str]        = None

    player_ratings: List[PlayerRating]   = []
    prediction:     Optional[PredictionBlock] = None
    insights:       List[InsightEntry]        = []


# ═══════════════════════════════════════════════════════════════════════
# PROMPT BUILDER
# ═══════════════════════════════════════════════════════════════════════

def _fmt_form(entries: List[FormEntry]) -> str:
    if not entries:
        return "unavailable"
    parts = []
    for f in entries[:5]:
        gf = f.goals_for if f.goals_for is not None else "?"
        ga = f.goals_against if f.goals_against is not None else "?"
        parts.append(f"{f.result or '?'} {gf}-{ga} vs {f.opponent or '?'} ({f.home_away or '?'})")
    return " | ".join(parts)


def _fmt_season(s: Optional[SeasonStats], name: str) -> str:
    if not s:
        return ""
    parts = []
    if s.played:
        parts.append(f"P{s.played} W{s.wins} D{s.draws} L{s.losses}")
    if s.goals_for_avg:
        parts.append(f"avg {s.goals_for_avg} scored / {s.goals_against_avg or '?'} conceded")
    if s.clean_sheets is not None:
        parts.append(f"{s.clean_sheets} clean sheets")
    if s.form:
        parts.append(f"form {s.form[-5:]}")
    return f"{name}: " + ", ".join(parts) if parts else ""


def _fmt_h2h(h2h: Optional[H2HBlock], hname: str, aname: str) -> str:
    if not h2h or not h2h.count:
        return "unavailable"
    line = (
        f"Last {h2h.count} meetings — "
        f"{hname} {h2h.home_wins}W / {h2h.draws}D / {aname} {h2h.away_wins}W"
    )
    if h2h.avg_goals:
        line += f" · avg {h2h.avg_goals:.1f} goals/game"
    if h2h.results:
        rows = [
            f"  {r.date or '?'}: {r.home_team} {r.home_goals}-{r.away_goals} {r.away_team}"
            for r in h2h.results[:3]
        ]
        line += "\n" + "\n".join(rows)
    return line


def _fmt_injuries(inj: Optional[InjuriesBlock], hname: str, aname: str) -> str:
    if not inj:
        return "none reported"
    parts = []
    if inj.home:
        parts.append(f"{hname} missing: {', '.join(p.player_name or '?' for p in inj.home[:4])}")
    if inj.away:
        parts.append(f"{aname} missing: {', '.join(p.player_name or '?' for p in inj.away[:4])}")
    return " | ".join(parts) if parts else "none reported"


def _fmt_stats(s: Optional[StatsBlock]) -> str:
    if not s:
        return "unavailable"
    items = [
        ("Possession",     s.possession),
        ("Shots",          s.shots_total),
        ("On target",      s.shots_on_target),
        ("Inside box",     s.shots_inside_box),
        ("xG",             s.xg),
        ("Corners",        s.corners),
        ("Pass acc",       s.pass_accuracy),
        ("Total passes",   s.total_passes),
        ("Fouls",          s.fouls),
        ("Offsides",       s.offsides),
        ("Yellow cards",   s.yellow_cards),
        ("GK saves",       s.goalkeeper_saves),
    ]
    return ", ".join(f"{k} {v}" for k, v in items if v)


def _fmt_ratings(ratings: List[PlayerRating]) -> str:
    if not ratings:
        return "unavailable"
    top = sorted(ratings, key=lambda x: x.rating, reverse=True)[:4]
    return "Top rated: " + " | ".join(
        f"{p.name} ({p.team}) {p.rating:.1f}" for p in top
    )


def _fmt_prediction(pred: Optional[PredictionBlock], hname: str, aname: str) -> str:
    if not pred:
        return "unavailable"
    parts = []
    if pred.p_home_win is not None:
        parts.append(
            f"{hname} {round(pred.p_home_win)}% / "
            f"Draw {round(pred.p_draw or 0)}% / {aname} {round(pred.p_away_win or 0)}%"
        )
    if pred.xg_home is not None:
        parts.append(f"xG {pred.xg_home:.2f}–{pred.xg_away:.2f}")
    if pred.btts is not None:
        parts.append(f"BTTS {round(pred.btts * 100)}%")
    if pred.over_2_5 is not None:
        parts.append(f"O2.5 {round(pred.over_2_5 * 100)}%")
    return " | ".join(parts)


def _build_prompt(req: CommentaryRequest) -> str:
    event_lines = "\n".join(
        f"  {e.minute}' {e.type.upper()}"
        + (f" ({e.detail})" if e.detail else "")
        + f": {e.player}"
        + (f" (ast {e.assist})" if e.assist else "")
        + f" — {e.team}"
        for e in req.events[-10:]
    ) or "  none yet"

    momentum_line = ""
    if req.momentum and req.momentum.home_pct is not None:
        m = req.momentum
        dom = req.home_team if (m.home_pct or 0) >= (m.away_pct or 0) else req.away_team
        momentum_line = (
            f"Momentum: {req.home_team} {m.home_pct}% / {req.away_team} {m.away_pct}%"
            + (f" — {dom} dominant mins {m.dominant_period}" if m.dominant_period else "")
        )

    formation_line = ""
    if req.home_lineup_formation or req.away_lineup_formation:
        formation_line = (
            f"Formations: {req.home_team} {req.home_lineup_formation or '?'} "
            f"vs {req.away_team} {req.away_lineup_formation or '?'}"
        )

    venue_line = ""
    if req.venue and req.venue.name:
        cap = f", cap {req.venue.capacity:,}" if req.venue.capacity else ""
        venue_line = f"Venue: {req.venue.name}, {req.venue.city or ''}{cap}"
    if req.referee:
        venue_line += f" | Ref: {req.referee}"

    n_entries   = 3 if req.mode in ("prematch", "fulltime") else 2
    entry_types = (
        "chance|duel|pressure|insight|tactical|set_piece|substitution"
        if req.mode == "live"
        else "preview|insight|h2h|form|tactical|prediction"
    )

    return f"""You are a world-class football commentator for StatinSite, a premium analytics platform.
Write {n_entries} commentary entries — vivid, specific, analytically grounded.

MATCH
{req.home_team} {req.home_score}–{req.away_score} {req.away_team} | {req.elapsed}' | {req.mode.upper()}
{f"Round: {req.league_round}" if req.league_round else ""}
{venue_line}
{formation_line}

EVENTS (most recent last)
{event_lines}

LIVE STATS
{_fmt_stats(req.stats)}
{momentum_line}

PLAYER RATINGS
{_fmt_ratings(req.player_ratings)}

SEASON STATS
{_fmt_season(req.home_season_stats, req.home_team)}
{_fmt_season(req.away_season_stats, req.away_team)}
{req.home_team} recent: {_fmt_form(req.home_form)}
{req.away_team} recent: {_fmt_form(req.away_form)}

HEAD TO HEAD
{_fmt_h2h(req.h2h, req.home_team, req.away_team)}

INJURIES
{_fmt_injuries(req.injuries, req.home_team, req.away_team)}

MODEL PREDICTION
{_fmt_prediction(req.prediction, req.home_team, req.away_team)}

PRE-COMPUTED INSIGHTS
{chr(10).join(f"  • {i.title}: {i.body}" for i in req.insights[:4]) or "  none"}

INSTRUCTIONS
- Bold key player names: **name**
- Use actual numbers from above — no vague generalisations
- Each entry must cover a different angle/topic
- Live: focus on minute {req.elapsed} right now
- Prematch: build anticipation using H2H, injuries, form, prediction
- Fulltime: reflect on turning points and standout performers
- Write fluent broadcast English — confident, colourful, precise

Return ONLY a valid JSON array of exactly {n_entries} objects, no markdown fences:
[
  {{"minute": "{req.elapsed if req.mode == 'live' else 'pre'}'",
    "type": "<one of: {entry_types}>",
    "text": "2-3 vivid sentences referencing specific stats or events."}}
]"""


# ═══════════════════════════════════════════════════════════════════════
# JSON STRIP  (replaces the broken lstrip logic in the original)
# ═══════════════════════════════════════════════════════════════════════

def _strip_fences(raw: str) -> str:
    s = raw.strip()
    s = re.sub(r"^```(?:json)?\s*", "", s)
    s = re.sub(r"\s*```$",           "", s)
    return s.strip()


# ═══════════════════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════════════════

@router.post("/api/commentary/{fixture_id}")
async def generate_commentary(fixture_id: int, req: CommentaryRequest):
    if not OPENROUTER_KEY:
        raise HTTPException(500, "OPENROUTER_API_KEY not configured on server")

    now  = time.time()
    last = _last_gen.get(str(fixture_id), 0)
    if now - last < _RATE_GAP:
        wait = round(_RATE_GAP - (now - last))
        raise HTTPException(429, f"Rate limited — wait {wait}s before generating again")

    prompt = _build_prompt(req)

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {OPENROUTER_KEY}",
                    "Content-Type":  "application/json",
                    "HTTP-Referer":  "https://statinsite.com",
                    "X-Title":       "StatinSite",
                },
                json={
                    "model":       OPENROUTER_MODEL,
                    "max_tokens":  750,
                    "temperature": 0.85,
                    "messages":    [{"role": "user", "content": prompt}],
                },
            )

        if resp.status_code != 200:
            logger.error("OpenRouter %s: %s", resp.status_code, resp.text[:300])
            raise HTTPException(502, f"OpenRouter returned {resp.status_code}")

        body  = resp.json()
        raw   = (body.get("choices") or [{}])[0].get("message", {}).get("content", "[]")
        clean = _strip_fences(raw)

        import json as _json
        entries = _json.loads(clean)
        if not isinstance(entries, list):
            entries = [entries]

        _last_gen[str(fixture_id)] = time.time()
        return entries[:4]

    except __import__("json").JSONDecodeError as e:
        logger.warning("Commentary parse error: %s | raw: %.200s", e, raw)
        raise HTTPException(502, "Model returned malformed JSON")
    except httpx.TimeoutException:
        raise HTTPException(504, "OpenRouter timed out")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Commentary generation failed")
        raise HTTPException(500, str(e))


@router.get("/api/commentary/{fixture_id}")
async def commentary_status(fixture_id: int):
    """Returns remaining cooldown seconds — lets the frontend show a live countdown."""
    last = _last_gen.get(str(fixture_id), 0)
    wait = max(0, round(_RATE_GAP - (time.time() - last)))
    return {"fixture_id": fixture_id, "cooldown_secs": wait, "ready": wait == 0}