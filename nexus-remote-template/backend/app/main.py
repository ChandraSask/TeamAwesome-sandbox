"""NEXUS remote backend — FastAPI variant.

Mirrors backend/src/index.ts:
  * security headers
  * CORS scoped to the UI origin(s) via ALLOWED_ORIGINS (comma-list)
  * public health endpoints ("/" and "/healthz")
  * protected /api routes requiring a valid Token B and a role (see roles.py)
  * a startup guard that refuses to boot with an unsafe auth configuration
Listens on 8080 (Container Apps default).
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from .roles import dev_auth_enabled, startup_auth_check
from .routes.hello import router as hello_router
from .routes.me import router as me_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Raises (and so fails the revision's health check) on an unsafe auth config.
    startup_auth_check(app)
    yield


app = FastAPI(title="nexus-remote-backend", docs_url=None, redoc_url=None, lifespan=lifespan)

# ── CORS ─────────────────────────────────────────────────────────────────────
# The browser calls this API directly from the remote UI's origin (which itself
# runs inside the host). Allow the UI origin(s) via ALLOWED_ORIGINS (comma-list).
# Empty list in production = no cross-origin access; "*" is dev-only.
_allowed = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    # If nothing is configured, reflect origin for DEV ONLY. In production ALWAYS
    # set ALLOWED_ORIGINS to the exact UI origin(s).
    allow_origins=_allowed or ["*"],
    allow_credentials=False,  # direct-bearer: token in Authorization header, no cookies
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    # The dev-persona headers are only ever allowed through CORS in APP_ENV=local, so
    # a deployed API does not even advertise them.
    allow_headers=["Authorization", "Content-Type"]
    + (["X-Dev-Role", "X-Dev-User"] if dev_auth_enabled() else []),
)


# ── Security headers (helmet-equivalent baseline) ────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault(
            "Referrer-Policy", "strict-origin-when-cross-origin"
        )
        response.headers.setdefault(
            "Strict-Transport-Security",
            "max-age=63072000; includeSubDomains; preload",
        )
        response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        return response


app.add_middleware(SecurityHeadersMiddleware)


# ── Health (public — no token). Referenced by remotes.json ".healthPath". ─────
@app.get("/")
async def root() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


# ── Protected API. Every /api route requires a valid Token B (see router). ────
app.include_router(hello_router, prefix="/api")
app.include_router(me_router, prefix="/api")


if __name__ == "__main__":  # pragma: no cover - convenience for local dev
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",  # noqa: S104 - container listens on all interfaces
        port=int(os.getenv("PORT", "8080")),
        reload=bool(os.getenv("DEV_RELOAD")),
    )
