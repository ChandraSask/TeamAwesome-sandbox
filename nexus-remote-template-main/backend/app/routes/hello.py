"""Example protected endpoint. Mirrors backend/src/routes/hello.ts."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from ..auth import AuthContext, validate_token

router = APIRouter()


@router.get("/hello")
async def hello(auth: AuthContext = Depends(validate_token)) -> dict:
    """Protected: requires a valid Token B (validated by the dependency)."""
    return {
        "message": "Hello from the NEXUS remote backend 👋",
        "caller": {
            "name": auth.name,
            "email": auth.email,
            "oid": auth.oid,
            "scopes": auth.scopes,
            "roles": auth.roles,
        },
        "serverTime": datetime.now(timezone.utc).isoformat(),
    }
