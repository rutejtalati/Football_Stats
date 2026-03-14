# backend/app/routes/fpl.py
# FPL proxy — keeps frontend calls on the same origin, avoids CORS issues.
import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/fpl", tags=["fpl"])

FPL_BASE = "https://fantasy.premierleague.com/api"
HEADERS  = {"User-Agent": "StatinSite/4.0"}


async def _fpl(path: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as c:
            r = await c.get(f"{FPL_BASE}/{path.lstrip('/')}", headers=HEADERS)
            r.raise_for_status()
            return r.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(e.response.status_code, f"FPL upstream: {e}")
    except Exception as e:
        raise HTTPException(502, f"FPL unreachable: {e}")


@router.get("/bootstrap")
async def fpl_bootstrap():
    """Proxy for FPL bootstrap-static — used by the frontend."""
    return await _fpl("/bootstrap-static/")


@router.get("/fixtures")
async def fpl_fixtures():
    return await _fpl("/fixtures/")


@router.get("/element-summary/{element_id}")
async def fpl_element_summary(element_id: int):
    return await _fpl(f"/element-summary/{element_id}/")


@router.get("/gameweek/{gw}/live")
async def fpl_gw_live(gw: int):
    return await _fpl(f"/event/{gw}/live/")