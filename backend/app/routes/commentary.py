"""
GET  /api/commentary/{fixture_id}
POST /api/commentary/{fixture_id}

Proxies OpenRouter using the server-side OPENROUTER_API_KEY.
Accepts match context in the request body and returns 2 commentary
entries as JSON — the frontend key never needs to exist.

POST body (JSON):
{
  "home_team":     "Liverpool",
  "away_team":     "Arsenal",
  "home_score":    2,
  "away_score":    1,
  "elapsed":       67,
  "mode":          "live",
  "events": [
    {"minute": "23'", "type": "goal",   "player": "Salah",  "team": "Liverpool", "assist": "Trent"},
    {"minute": "44'", "type": "goal",   "player": "Saka",   "team": "Arsenal",   "assist": "Ødegaard"},
    {"minute": "51'", "type": "yellow", "player": "Partey", "team": "Arsenal"},
    {"minute": "59'", "type": "goal",   "player": "Jota",   "team": "Liverpool", "assist": "Díaz"}
  ],
  "stats": {
    "possession":   "57-43",
    "shots":        "8-5",
    "on_target":    "5-2",
    "xg":           "1.82-0.94",
    "corners":      "3-4",
    "pass_acc":     "88-84"
  },
  "momentum": {
    "home_pct": 63,
    "away_pct": 37,
    "dominant_period": "61-75"
  }
}

Response:
[
  {"minute": "67'", "type": "chance",  "text": "Núñez drives low…"},
  {"minute": "65'", "type": "duel",    "text": "Rice wins the ball…"}
]
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

# In-memory rate-limit: max 1 generation per fixture per 20 seconds
_last_gen: Dict[str, float] = {}
_RATE_GAP = 20


# ── Request schema ────────────────────────────────────────────────────────────

class EventItem(BaseModel):
    minute:  Any                     # int or str ("67'")
    type:    str
    detail:  Optional[str] = None
    player:  str
    team:    str
    assist:  Optional[str] = None

class StatsBlock(BaseModel):
    possession: Optional[str] = None
    shots:      Optional[str] = None
    on_target:  Optional[str] = None
    xg:         Optional[str] = None
    corners:    Optional[str] = None
    pass_acc:   Optional[str] = None

class MomentumBlock(BaseModel):
    home_pct:        Optional[int] = None
    away_pct:        Optional[int] = None
    dominant_period: Optional[str] = None

class CommentaryRequest(BaseModel):
    home_team:  str
    away_team:  str
    home_score: int = 0
    away_score: int = 0
    elapsed:    int = 0
    mode:       str = "live"     # prematch | live | fulltime
    events:     List[EventItem] = []
    stats:      Optional[StatsBlock] = None
    momentum:   Optional[MomentumBlock] = None


# ── Prompt builder ────────────────────────────────────────────────────────────

def _build_prompt(req: CommentaryRequest) -> str:
    event_lines = "\n".join(
        f"  {e.minute}' {e.type.upper()}"
        + (f" ({e.detail})" if e.detail else "")
        + f": {e.player}"
        + (f" (ast {e.assist})" if e.assist else "")
        + f" — {e.team}"
        for e in req.events[-10:]
    ) or "  none yet"

    stat_lines = ""
    if req.stats:
        s = req.stats
        parts = []
        if s.possession: parts.append(f"Possession {s.possession}")
        if s.shots:      parts.append(f"Shots {s.shots}")
        if s.on_target:  parts.append(f"On target {s.on_target}")
        if s.xg:         parts.append(f"xG {s.xg}")
        if s.corners:    parts.append(f"Corners {s.corners}")
        if s.pass_acc:   parts.append(f"Pass acc {s.pass_acc}%")
        stat_lines = ", ".join(parts)

    momentum_line = ""
    if req.momentum and req.momentum.home_pct is not None:
        m = req.momentum
        dom = req.home_team if (m.home_pct or 0) >= (m.away_pct or 0) else req.away_team
        momentum_line = (
            f"Momentum: {req.home_team} {m.home_pct}% / {req.away_team} {m.away_pct}%"
            + (f" — {dom} dominant in mins {m.dominant_period}" if m.dominant_period else "")
        )

    n_entries = 3 if req.mode in ("prematch", "fulltime") else 2

    return f"""You are an electrifying live football commentator for StatinSite. Write {n_entries} commentary entries that feel like a real broadcast — passionate, specific, vivid. Use exclamation marks where appropriate, reference actual player names and stats, build tension and excitement.

Match: {req.home_team} {req.home_score}–{req.away_score} {req.away_team}
Time: {req.elapsed}' | Mode: {req.mode}

Recent events:
{event_lines}

Live stats: {stat_lines or "unavailable"}
{momentum_line}

TONE: Excited broadcast commentary. Bold player names with **name**. Reference specific stats and events. Use vivid language — "rockets into the top corner", "magnificent save", "relentless pressure".

Return ONLY a valid JSON array of exactly {n_entries} objects, NO markdown fences:
[
  {{
    "minute": "{req.elapsed}'",
    "type": "goal|chance|pressure|duel|tactical|insight",
    "text": "2-3 vivid, excited sentences referencing real match data."
  }}
]"""


# ── Route ─────────────────────────────────────────────────────────────────────

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
                    "max_tokens":  700,
                    "temperature": 0.9,
                    "messages":    [{"role": "user", "content": prompt}],
                },
            )

        if resp.status_code != 200:
            logger.error("OpenRouter error %s: %s", resp.status_code, resp.text[:300])
            raise HTTPException(502, f"OpenRouter returned {resp.status_code}")

        body  = resp.json()
        raw   = (body.get("choices") or [{}])[0].get("message", {}).get("content", "[]")

        # Correctly strip markdown fences — lstrip/rstrip only strip single chars,
        # so we use re.sub to strip the full ```json ... ``` wrapper
        clean = re.sub(r"^```(?:json)?\s*", "", raw.strip())
        clean = re.sub(r"\s*```$",          "", clean).strip()

        import json as _json
        entries = _json.loads(clean)

        if not isinstance(entries, list):
            entries = [entries]

        _last_gen[str(fixture_id)] = time.time()
        return entries[:4]

    except __import__("json").JSONDecodeError as e:
        logger.warning("Commentary JSON parse error: %s | raw: %.200s", e, raw)
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
    """Returns remaining cooldown seconds so the frontend can show a live countdown."""
    last = _last_gen.get(str(fixture_id), 0)
    wait = max(0, round(_RATE_GAP - (time.time() - last)))
    return {"fixture_id": fixture_id, "cooldown_secs": wait, "ready": wait == 0}