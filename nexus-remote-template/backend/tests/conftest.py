"""Shared fixtures for the auth / role tests.

Every test starts from a clean, FAIL-CLOSED environment (APP_ENV unset = production,
no group ids, not containerised) so nothing leaks in from the developer's shell, and
opts in to whatever it needs.
"""

from __future__ import annotations

import time
from types import SimpleNamespace

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from app import auth

TENANT = "11111111-1111-1111-1111-111111111111"
CLIENT_ID = "22222222-2222-2222-2222-222222222222"


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    for var in (
        "APP_ENV",
        "AAD_GROUP_ADMIN",
        "AAD_GROUP_ROLE_1",
        "AAD_GROUP_ROLE_2",
        "CONTAINER_APP_NAME",
        "CONTAINER_APP_REVISION",
        "WEBSITE_SITE_NAME",
        "KUBERNETES_SERVICE_HOST",
    ):
        monkeypatch.delenv(var, raising=False)


@pytest.fixture
def local(monkeypatch):
    """APP_ENV=local — the dev persona bypass is on."""
    monkeypatch.setenv("APP_ENV", "local")


@pytest.fixture
def client():
    from app.main import app

    app.dependency_overrides.clear()
    # No `with`: the lifespan (startup guard) is exercised explicitly in its own tests.
    return TestClient(app)


@pytest.fixture(scope="session")
def _keypair():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture
def make_token(monkeypatch, _keypair):
    """Mint a Token B signed by a throwaway key, and make `auth` trust that key.

    The real JWKS endpoint is replaced by the test key; issuer, audience and
    required scope are pointed at known values. Everything else in
    `auth.validate_token` (RS256 only, audience, scope, expiry) runs for real.
    """
    issuer = f"https://login.microsoftonline.com/{TENANT}/v2.0"
    monkeypatch.setattr(auth, "ISSUER", issuer)
    monkeypatch.setattr(auth, "NORMALIZED_AUDIENCE", CLIENT_ID)
    monkeypatch.setattr(auth, "REQUIRED_SCOPE", "access_as_user")
    monkeypatch.setattr(
        auth,
        "_jwk_client",
        SimpleNamespace(get_signing_key_from_jwt=lambda _t: SimpleNamespace(key=_keypair.public_key())),
    )

    def _make(*, roles=None, groups=None, scp="access_as_user", aud=f"api://{CLIENT_ID}", extra=None) -> str:
        now = int(time.time())
        claims = {
            "iss": issuer,
            "aud": aud,
            "iat": now,
            "exp": now + 600,
            "scp": scp,
            "oid": "oid-123",
            "name": "Test User",
            "preferred_username": "test.user@example.com",
        }
        if roles is not None:
            claims["roles"] = roles
        if groups is not None:
            claims["groups"] = groups
        claims.update(extra or {})
        return jwt.encode(claims, _keypair, algorithm="RS256", headers={"kid": "test"})

    return _make


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}
