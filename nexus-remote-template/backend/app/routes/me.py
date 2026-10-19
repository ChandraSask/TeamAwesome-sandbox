"""Identity and role endpoints.

`GET /api/me` is how the UI learns who the caller is and what they may do, so it
never has to trust a role the browser claims for itself. The two `/demo/*` routes
exist to show `require_role` and to give the tests something to refuse — delete
them once you have real role-protected routes of your own.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..roles import ROLES, User, current_user, permissions_for, require_permission, require_role

router = APIRouter()


@router.get("/me")
async def me(user: User = Depends(current_user)) -> dict:
    """The caller's identity, role and permissions. Any role may call this."""
    return {
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "is_admin": user.is_admin,
        "permissions": permissions_for(user.role),
        "source": user.source,  # "entra" or "dev" (local persona) — handy when debugging
        "roles": list(ROLES),
    }


@router.get("/demo/review")
async def demo_review(user: User = Depends(require_role("role_1"))) -> dict:
    """Example: role_1 and admin only (by role name)."""
    return {"ok": True, "message": "You can review.", "role": user.role}


@router.get("/demo/admin")
async def demo_admin(user: User = Depends(require_permission("admin.view"))) -> dict:
    """Example: guarded by a PERMISSION rather than a role name — admin only."""
    return {"ok": True, "message": "You are an admin.", "role": user.role}
