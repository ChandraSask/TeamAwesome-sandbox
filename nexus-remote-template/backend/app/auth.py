"""Token B validation for the NEXUS remote backend (FastAPI variant).

This is the Python/FastAPI port of backend/src/auth/validateToken.ts. It MUST stay
behaviourally identical to the TS backend and to the host's server/lib/entraJwt.ts:

  * verify signature via AAD JWKS
  * RS256 ONLY (reject alg:none / HS*)
  * validate issuer (v2 by default; v1 form configurable)
  * BIDIRECTIONAL audience: accept both `<clientId>` and `api://<clientId>`
  * clock-skew tolerance (leeway) of 60s
  * require a delegated scope (scp) OR an app role (roles)
  * 401 for missing/invalid token, 403 for insufficient scope

Uses pyjwt + PyJWKClient (JWKS fetch + key caching).
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

# ── Configuration (set via env / Container App secrets) ──────────────────────
TENANT_ID = os.getenv("AAD_TENANT_ID", "REPLACE-WITH-YOUR-TENANT-ID")
# The audience of Token B = YOUR API's App ID URI or client id.
AUDIENCE = os.getenv("AAD_AUDIENCE", "api://REPLACE-WITH-YOUR-CLIENT-ID")
# v2.0 issuer. If your app registration is v1, use the /sts.windows.net form.
ISSUER = os.getenv(
    "AAD_ISSUER", f"https://login.microsoftonline.com/{TENANT_ID}/v2.0"
)
# Required scope (space-delimited "scp") OR app role ("roles").
REQUIRED_SCOPE = os.getenv("AAD_REQUIRED_SCOPE", "access_as_user")
JWKS_URI = os.getenv(
    "AAD_JWKS_URI",
    f"https://login.microsoftonline.com/{TENANT_ID}/discovery/v2.0/keys",
)
# Clock-skew tolerance in seconds (matches TS clockTolerance: 60).
LEEWAY_SECONDS = int(os.getenv("AAD_LEEWAY_SECONDS", "60"))


def normalize_aud(a: str) -> str:
    """Strip a single leading `api://` App-ID-URI scheme.

    Entra mints the SAME registration's audience as either the bare client id
    (`<guid>`) or the App-ID-URI form (`api://<guid>`) depending on token type.
    Comparing on the normalized form makes the check BIDIRECTIONAL without
    widening it: a *different* id wrapped in `api://` still fails because only the
    scheme prefix is removed, not the id. (Mirrors the host's normalizeAud().)
    """
    prefix = "api://"
    return a[len(prefix):] if a.startswith(prefix) else a


NORMALIZED_AUDIENCE = normalize_aud(AUDIENCE)

# PyJWKClient caches signing keys and refreshes on rotation (kid miss).
_jwk_client = PyJWKClient(JWKS_URI, cache_keys=True, lifespan=24 * 60 * 60)

# Do NOT auto_error: we want to return our own 401 shape, not FastAPI's default.
_bearer = HTTPBearer(auto_error=False)


@dataclass
class AuthContext:
    """Populated on success and attached to request.state.auth."""

    oid: str | None
    name: str | None
    email: str | None
    scopes: list[str] = field(default_factory=list)
    roles: list[str] = field(default_factory=list)
    raw: dict[str, Any] = field(default_factory=dict)


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"error": "invalid_token", "detail": detail},
        headers={"WWW-Authenticate": "Bearer"},
    )


async def validate_token(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> AuthContext:
    """FastAPI dependency: validate the host-minted Token B (direct-bearer).

    Use as `Depends(validate_token)` on any protected route. Returns AuthContext
    and also stores it on `request.state.auth`.
    """
    if credentials is None or credentials.scheme.lower() != "bearer" or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "missing_bearer_token"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # Resolve signing key from the token's kid (raises on missing/unknown kid).
    try:
        signing_key = _jwk_client.get_signing_key_from_jwt(token)
    except Exception as exc:  # noqa: BLE001 - map any JWKS failure to 401
        raise _unauthorized("signing key not found") from exc

    # NOTE: audience is deliberately NOT passed to jwt.decode. pyjwt matches the
    # `aud` claim by EXACT string, which would reject a token minted as the bare
    # client id when we configured `api://<clientId>` (or vice-versa). We verify
    # signature / issuer / expiry here (RS256 only) and check the audience
    # ourselves below on the scheme-normalized form.
    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=ISSUER,
            leeway=LEEWAY_SECONDS,
            options={"verify_aud": False, "require": ["exp", "iss"]},
        )
    except jwt.PyJWTError as exc:
        raise _unauthorized(str(exc)) from exc

    # Audience check (bidirectional, scheme-normalized). `aud` may be a string or
    # a list. Accept when ANY value normalizes to our expected id.
    aud_claim = payload.get("aud")
    if aud_claim is None:
        aud_values: list[str] = []
    elif isinstance(aud_claim, list):
        aud_values = [str(a) for a in aud_claim]
    else:
        aud_values = [str(aud_claim)]

    if not any(normalize_aud(a) == NORMALIZED_AUDIENCE for a in aud_values):
        raise _unauthorized("bad audience")

    scopes = [s for s in str(payload.get("scp", "")).split(" ") if s]
    roles = payload.get("roles") if isinstance(payload.get("roles"), list) else []

    # Delegated scope OR app role must satisfy the requirement.
    if REQUIRED_SCOPE not in scopes and REQUIRED_SCOPE not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "insufficient_scope", "required": REQUIRED_SCOPE},
        )

    auth = AuthContext(
        oid=payload.get("oid"),
        name=payload.get("name"),
        email=payload.get("preferred_username") or payload.get("upn"),
        scopes=scopes,
        roles=list(roles),
        raw=payload,
    )
    request.state.auth = auth
    return auth
