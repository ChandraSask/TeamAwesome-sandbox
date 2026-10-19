"""Role-based access for the NEXUS remote backend.

THE MODEL (three roles, one file to edit)
-----------------------------------------
    admin    everything
    role_1   create + review
    role_2   create only

Rename them, add more, change what each may do — it is all in the ROLES /
PERMISSIONS block below. The UI keeps a mirror of this table in
`ui/src/lib/roles.js` so it can run offline; the backend is the AUTHORITY, and in
production the UI reads its permissions from `GET /api/me`.

WHERE A ROLE COMES FROM
-----------------------
Entra ID, never the browser. Two supported sources, both read from the validated
Token B (see `auth.validate_token`):

  1. App roles (recommended)   the token's `roles` claim. You define the app roles
                               on the app registration and ASSIGN AN ENTRA GROUP to
                               each one; Entra puts the role in the token for every
                               member. Values are listed in APP_ROLE_TO_ROLE.
  2. Group object ids          the token's `groups` claim, matched against the env
                               vars AAD_GROUP_ADMIN / AAD_GROUP_ROLE_1 / AAD_GROUP_ROLE_2.
                               Needs the "groups" optional claim on the app
                               registration. Entra stops sending the list above 200
                               groups ("overage") — prefer app roles at scale.

If a user holds several, the most privileged wins (ROLE_PRECEDENCE). A valid token
with NO recognised role is a 403 `no_role`, not a 401: the sign-in worked, the
person just has not been put in a group yet.

LOCAL DEVELOPMENT WITHOUT ENTRA
-------------------------------
With APP_ENV=local a request that carries NO Authorization header is treated as a
dev persona: `X-Dev-Role` picks the role (default: the least privileged),
`X-Dev-User` picks the email. The UI's role drop-down on the Home page sends these.

This bypass is the most dangerous thing in this file, so:
  * it is OFF unless APP_ENV is exactly "local" (the default is "production"),
  * it is never used when a bearer token is present (headers cannot upgrade a JWT),
  * `startup_auth_check()` refuses to boot a deployed container that has it on.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Any, Iterable, Optional

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials

from .auth import _bearer, validate_token

log = logging.getLogger(__name__)

# ── Roles & permissions — EDIT THIS BLOCK ─────────────────────────────────────

#: Most privileged first. This order is also the precedence when a user holds several.
ROLES: tuple[str, ...] = ("admin", "role_1", "role_2")
ROLE_PRECEDENCE = ROLES

#: Entra *app role values* -> internal role. The value is what you type in the
#: "Value" box when you create the app role on the app registration.
APP_ROLE_TO_ROLE: dict[str, str] = {
    "app.admin": "admin",
    "app.role_1": "role_1",
    "app.role_2": "role_2",
}

#: Env var holding an Entra GROUP OBJECT ID -> internal role (the `groups` claim path).
GROUP_ENV_TO_ROLE: dict[str, str] = {
    "AAD_GROUP_ADMIN": "admin",
    "AAD_GROUP_ROLE_1": "role_1",
    "AAD_GROUP_ROLE_2": "role_2",
}

#: Permission -> roles allowed. Keep in step with `ui/src/lib/roles.js`.
PERMISSIONS: dict[str, tuple[str, ...]] = {
    "submission.create": ("admin", "role_1", "role_2"),
    "submission.review": ("admin", "role_1"),
    "admin.view": ("admin",),
}

#: What a dev persona gets when the UI sends no X-Dev-Role: the LEAST privileged.
DEFAULT_DEV_ROLE = "role_2"
DEFAULT_DEV_USER = "dev@example.com"


def permissions_for(role: Optional[str]) -> list[str]:
    return [p for p, allowed in PERMISSIONS.items() if role in allowed]


# ── Role resolution ───────────────────────────────────────────────────────────


def _group_map() -> dict[str, str]:
    """Group object id (lower-case) -> role. Read per call so env changes apply."""
    out: dict[str, str] = {}
    for env, role in GROUP_ENV_TO_ROLE.items():
        gid = os.getenv(env, "").strip().lower()
        if gid:
            out[gid] = role
    return out


def role_from_claims(roles: Iterable[Any] | None, groups: Iterable[Any] | None = None) -> Optional[str]:
    """Map the token's `roles` and `groups` claims to ONE role (most privileged wins).

    Returns None when nothing matches, which the caller turns into 403 `no_role`.
    Anything that is not a string, or not a known value, is ignored.
    """
    mapped: set[str] = set()
    for r in roles or []:
        if isinstance(r, str) and r.strip().lower() in APP_ROLE_TO_ROLE:
            mapped.add(APP_ROLE_TO_ROLE[r.strip().lower()])
    group_map = _group_map()
    if group_map:
        for g in groups or []:
            if isinstance(g, str) and g.strip().lower() in group_map:
                mapped.add(group_map[g.strip().lower()])
    for candidate in ROLE_PRECEDENCE:
        if candidate in mapped:
            return candidate
    return None


@dataclass(frozen=True)
class User:
    email: str
    name: str
    role: str
    #: "entra" (validated token) or "dev" (local persona bypass).
    source: str = "entra"

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"

    def can(self, permission: str) -> bool:
        return self.role in PERMISSIONS.get(permission, ())


# ── Dev persona bypass (APP_ENV=local only) ───────────────────────────────────


def dev_auth_enabled() -> bool:
    """True only when APP_ENV is exactly 'local'. Unset means production (fail closed)."""
    return os.getenv("APP_ENV", "production").strip().lower() == "local"


def _dev_user(request: Request) -> User:
    role = (request.headers.get("X-Dev-Role") or DEFAULT_DEV_ROLE).strip().lower()
    if role not in ROLES:
        raise HTTPException(
            status_code=400,
            detail={"error": "unknown_dev_role", "role": role[:40], "allowed": list(ROLES)},
        )
    email = (request.headers.get("X-Dev-User") or DEFAULT_DEV_USER).strip().lower()[:254]
    name = email.split("@")[0].replace(".", " ").replace("_", " ").title() or "Dev User"
    return User(email=email, name=name, role=role, source="dev")


# ── Dependencies ──────────────────────────────────────────────────────────────


async def current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> User:
    """Who is calling, and in which role. Use as `Depends(current_user)`.

    A bearer token is ALWAYS validated, even in local mode, so a request can never
    combine a real token with a forged X-Dev-Role. The dev persona is only for a
    request with no Authorization header at all.
    """
    if credentials is None and dev_auth_enabled():
        return _dev_user(request)

    auth = await validate_token(request, credentials)  # 401/403 raised here
    claims = auth.raw
    role = role_from_claims(auth.roles, claims.get("groups"))
    if role is None:
        if "groups" not in claims and "groups" in (claims.get("_claim_names") or {}):
            log.warning(
                "Token for %s has a groups OVERAGE (>200 groups) — the list was not "
                "sent. Use app roles instead of group ids.",
                auth.email,
            )
        else:
            log.info("Access denied: %s holds no app role", auth.email)
        raise HTTPException(
            status_code=403,
            detail={
                "error": "no_role",
                "detail": "Signed in, but you are not in any group mapped to a role. "
                "Ask an administrator to add you to the app's access group.",
            },
        )
    email = (auth.email or "").lower()
    return User(email=email, name=auth.name or email, role=role, source="entra")


def require_role(*roles: str):
    """Dependency factory: allow only the given roles. `admin` always passes.

        @router.get("/x")
        async def x(user: User = Depends(require_role("role_1"))): ...
    """
    allowed = frozenset(r.strip().lower() for r in roles)
    unknown = allowed - set(ROLES)
    if unknown:  # a typo here would otherwise silently lock everyone out
        raise ValueError(f"require_role: unknown role(s) {sorted(unknown)}; known: {list(ROLES)}")

    async def _dep(user: User = Depends(current_user)) -> User:
        if user.role == "admin" or user.role in allowed:
            return user
        raise HTTPException(
            status_code=403,
            detail={"error": "forbidden_role", "role": user.role, "required": sorted(allowed)},
        )

    return _dep


def require_permission(permission: str):
    """Dependency factory: allow any role that holds `permission` (see PERMISSIONS)."""
    if permission not in PERMISSIONS:
        raise ValueError(f"require_permission: unknown permission {permission!r}")

    async def _dep(user: User = Depends(current_user)) -> User:
        if user.can(permission):
            return user
        raise HTTPException(
            status_code=403,
            detail={"error": "forbidden_permission", "role": user.role, "required": permission},
        )

    return _dep


# ── Startup safety net ────────────────────────────────────────────────────────


def is_containerised() -> bool:
    """True when running in a platform-managed container (Container Apps, App Service, AKS).

    These variables are injected by the platform, so — unlike an app flag — they
    cannot be forgotten.
    """
    return any(
        os.getenv(v)
        for v in ("CONTAINER_APP_NAME", "CONTAINER_APP_REVISION", "WEBSITE_SITE_NAME", "KUBERNETES_SERVICE_HOST")
    )


def startup_auth_check(app: Any | None = None) -> None:
    """Refuse to serve with an unsafe auth configuration. Raises RuntimeError.

    Called from the app lifespan, so the revision fails its health check instead of
    quietly serving an unauthenticated API.

      * APP_ENV=local inside a container: X-Dev-Role would be a full auth bypass on a
        public ingress.
      * a `current_user` dependency override in a container: that is a test seam that
        would authenticate every request as one fixed user.
      * tenant / audience still the REPLACE-WITH-… placeholders in a container: the
        API could not validate a single token.

    Outside a container it only warns, so local work is never blocked.
    """
    from .auth import AUDIENCE, TENANT_ID

    dev = dev_auth_enabled()
    placeholders = "REPLACE-WITH" in TENANT_ID or "REPLACE-WITH" in AUDIENCE

    if dev:
        log.warning(
            "APP_ENV=local: the X-Dev-Role / X-Dev-User bypass is ACTIVE. "
            "Requests with no Authorization header are trusted. Never deploy this."
        )
    elif placeholders:
        log.warning(
            "AAD_TENANT_ID / AAD_AUDIENCE are still placeholders: every token will be "
            "rejected. Set them (see INTEGRATION_GUIDE.md §8), or run with APP_ENV=local."
        )

    if not is_containerised():
        return

    if dev:
        raise RuntimeError(
            "APP_ENV=local inside a container: the X-Dev-Role bypass would accept any "
            "caller with no token. Set APP_ENV=production."
        )
    if app is not None and current_user in getattr(app, "dependency_overrides", {}):
        raise RuntimeError(
            "current_user is overridden in dependency_overrides. That is a TEST-ONLY "
            "seam; in a container it authenticates every request as one fixed user."
        )
    if placeholders:
        raise RuntimeError(
            "AAD_TENANT_ID / AAD_AUDIENCE are not set: this API cannot validate tokens, "
            "and a placeholder audience would be a misconfiguration waiting to be "
            "'fixed' by widening it. Set both (see deployment/containerapp.bicep)."
        )
