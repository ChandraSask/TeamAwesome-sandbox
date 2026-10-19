"""NEXUS remote backend — FastAPI variant.

Mirrors backend/src/index.ts:
  * security headers
  * CORS scoped to the UI origin(s) via ALLOWED_ORIGINS (comma-list)
  * public health endpoints ("/" and "/healthz")
  * protected /api routes requiring a valid Token B
Listens on 8080 (Container Apps default).
"""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from .routes.hello import router as hello_router

app = FastAPI(title="nexus-remote-backend", docs_url=None, redoc_url=None)

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
    allow_headers=["Authorization", "Content-Type"],
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


if __name__ == "__main__":  # pragma: no cover - convenience for local dev
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",  # noqa: S104 - container listens on all interfaces
        port=int(os.getenv("PORT", "8080")),
        reload=bool(os.getenv("DEV_RELOAD")),
    )
