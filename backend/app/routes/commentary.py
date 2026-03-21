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
import time
import logging
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)

OPENROUTER_KEY  = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_URL  = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = "anthropic/claude-haiku-4-5"   # fast + cheap for commentary

# Simple in-memory rate-limit: max 1 generation per fixture per 20 seconds
_last_gen: Dict[str, float] = {}
_RATE_GAP = 20  # seconds


# ── Request schema ────────────────────────────────────────────────────────────

class EventItem(BaseModel):
    minute:  str
    type:    str          # goal | yellow | red_card | sub | info
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
        f"  {e.minute} {e.type.upper()}: {e.player}"
        + (f" (ast {e.assist})" if e.assist else "")
        + f" — {e.team}"
        for e in req.events[-8:]
    ) or "  None yet"

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
        momentum_line = (
            f"Momentum: {req.home_team} {m.home_pct}% vs "
            f"{req.away_team} {m.away_pct}%"
            + (f" — {req.home_team if m.home_pct > m.away_pct else req.away_team} dominant in {m.dominant_period}" if m.dominant_period else "")
        )

    return f"""You are a live football commentator for StatinSite, a sports analytics platform. Write 2 fresh commentary entries for the current moment.

Match: {req.home_team} vs {req.away_team}
Score: {req.home_score}–{req.away_score} ({req.elapsed}' elapsed)
Status: {req.mode}

Recent events:
{event_lines}

Live stats: {stat_lines or "unavailable"}
{momentum_line}

Return ONLY a JSON array with exactly 2 entries, no markdown, no preamble:
[
  {{
    "minute": "{req.elapsed}'",
    "type": "chance|duel|pressure|insight|tactical",
    "text": "2-3 vivid sentences. Bold key player names with **name** syntax. Reference specific stats or events above."
  }},
  {{
    "minute": "{max(req.elapsed - 2, 1)}'",
    "type": "chance|duel|pressure|insight|tactical",
    "text": "Another vivid moment from this match."
  }}
]"""


# ── Route ─────────────────────────────────────────────────────────────────────

@router.post("/api/commentary/{fixture_id}")
async def generate_commentary(fixture_id: int, req: CommentaryRequest):
    if not OPENROUTER_KEY:
        raise HTTPException(500, "OPENROUTER_API_KEY not configured on server")

    # Rate limiting per fixture
    now = time.time()
    last = _last_gen.get(str(fixture_id), 0)
    if now - last < _RATE_GAP:
        wait = round(_RATE_GAP - (now - last))
        raise HTTPException(429, f"Rate limited — wait {wait}s before generating again")

    prompt = _build_prompt(req)

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {OPENROUTER_KEY}",
                    "Content-Type":  "application/json",
                    "HTTP-Referer":  "https://statinsite.com",
                    "X-Title":       "StatinSite",
                },
                json={
                    "model":      OPENROUTER_MODEL,
                    "max_tokens": 500,
                    "messages":   [{"role": "user", "content": prompt}],
                },
            )

        if resp.status_code != 200:
            logger.error("OpenRouter error %s: %s", resp.status_code, resp.text[:200])
            raise HTTPException(502, f"OpenRouter returned {resp.status_code}")

        body    = resp.json()
        raw     = (body.get("choices") or [{}])[0].get("message", {}).get("content", "[]")
        clean   = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        entries = __import__("json").loads(clean)

        if not isinstance(entries, list):
            entries = [entries]

        _last_gen[str(fixture_id)] = time.time()
        return entries[:2]

    except __import__("json").JSONDecodeError as e:
        logger.warning("Commentary JSON parse error: %s | raw: %s", e, raw[:200])
        raise HTTPException(502, "Model returned malformed JSON")
    except httpx.TimeoutException:
        raise HTTPException(504, "OpenRouter timed out")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Commentary generation failed")
        raise HTTPException(500, str(e))