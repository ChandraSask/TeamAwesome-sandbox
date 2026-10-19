"""Example protected endpoint. Mirrors backend/src/routes/hello.ts."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from ..roles import User, current_user

router = APIRouter()


@router.get("/hello")
async def hello(user: User = Depends(current_user)) -> dict:
    """Protected: any signed-in caller that holds a role (validated by the dependency)."""
    return {
        "message": "Hello from the NEXUS remote backend 👋",
        "caller": {
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "source": user.source,
        },
        "serverTime": datetime.now(timezone.utc).isoformat(),
    }
