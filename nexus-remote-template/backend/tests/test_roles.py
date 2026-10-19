"""Role-based access: where a role comes from, what each role may do, and the guards
that stop the local dev bypass from ever reaching a deployed container."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app import roles
from app.roles import (
    PERMISSIONS,
    ROLES,
    current_user,
    permissions_for,
    require_permission,
    require_role,
    role_from_claims,
    startup_auth_check,
)

from .conftest import bearer

GROUP_ADMIN = "aaaaaaaa-0000-0000-0000-00000000000a"
GROUP_R1 = "bbbbbbbb-0000-0000-0000-00000000000b"


# ── role_from_claims: the mapping ─────────────────────────────────────────────


def test_app_role_maps_to_role():
    assert role_from_claims(["app.role_1"]) == "role_1"


def test_app_role_match_is_case_insensitive_and_trimmed():
    assert role_from_claims(["  APP.Admin "]) == "admin"


def test_most_privileged_role_wins():
    assert role_from_claims(["app.role_2", "app.admin", "app.role_1"]) == "admin"
    assert role_from_claims(["app.role_2", "app.role_1"]) == "role_1"


def test_unknown_and_non_string_values_are_ignored():
    assert role_from_claims(["nope", 7, None, {"x": 1}]) is None
    assert role_from_claims(None, None) is None


def test_group_ids_only_count_when_configured(monkeypatch):
    assert role_from_claims([], [GROUP_ADMIN]) is None  # env not set -> ignored
    monkeypatch.setenv("AAD_GROUP_ADMIN", GROUP_ADMIN)
    assert role_from_claims([], [GROUP_ADMIN.upper()]) == "admin"  # GUIDs compare case-insensitively


def test_app_roles_and_groups_combine_to_the_highest(monkeypatch):
    monkeypatch.setenv("AAD_GROUP_ADMIN", GROUP_ADMIN)
    assert role_from_claims(["app.role_1"], [GROUP_ADMIN]) == "admin"


def test_permissions_table_is_consistent():
    # every permission names only real roles, and admin holds all of them
    for perm, allowed in PERMISSIONS.items():
        assert set(allowed) <= set(ROLES), perm
        assert "admin" in allowed, perm
    assert permissions_for("role_2") == ["submission.create"]
    assert permissions_for(None) == []


def test_require_role_rejects_a_typo_at_import_time():
    with pytest.raises(ValueError):
        require_role("role_one")
    with pytest.raises(ValueError):
        require_permission("submission.nuke")


# ── Fail closed: no dev bypass unless APP_ENV=local ───────────────────────────


def test_no_token_is_401_by_default(client):
    assert client.get("/api/me").status_code == 401


def test_dev_headers_are_ignored_outside_local(client):
    r = client.get("/api/me", headers={"X-Dev-Role": "admin"})
    assert r.status_code == 401


@pytest.mark.parametrize("value", ["prod", "Local-ish", "locally", "true", "1", ""])
def test_only_the_exact_word_local_enables_the_bypass(client, monkeypatch, value):
    monkeypatch.setenv("APP_ENV", value)
    assert client.get("/api/me", headers={"X-Dev-Role": "admin"}).status_code == 401


# ── Local dev persona ─────────────────────────────────────────────────────────


def test_local_default_persona_is_least_privileged(client, local):
    body = client.get("/api/me").json()
    assert body["role"] == "role_2"
    assert body["source"] == "dev"
    assert body["permissions"] == ["submission.create"]


def test_local_persona_picks_role_and_email(client, local):
    body = client.get("/api/me", headers={"X-Dev-Role": "ADMIN", "X-Dev-User": "Pat.Kim@Example.com"}).json()
    assert body["role"] == "admin" and body["is_admin"] is True
    assert body["email"] == "pat.kim@example.com"
    assert body["name"] == "Pat Kim"


def test_local_unknown_role_is_a_clear_400(client, local):
    r = client.get("/api/me", headers={"X-Dev-Role": "root"})
    assert r.status_code == 400
    assert r.json()["detail"]["error"] == "unknown_dev_role"


@pytest.mark.parametrize(
    ("role", "review", "admin"),
    [("admin", 200, 200), ("role_1", 200, 403), ("role_2", 403, 403)],
)
def test_role_gates(client, local, role, review, admin):
    h = {"X-Dev-Role": role}
    assert client.get("/api/demo/review", headers=h).status_code == review
    assert client.get("/api/demo/admin", headers=h).status_code == admin


def test_forbidden_response_names_the_role_and_requirement(client, local):
    d = client.get("/api/demo/review", headers={"X-Dev-Role": "role_2"}).json()["detail"]
    assert d == {"error": "forbidden_role", "role": "role_2", "required": ["role_1"]}


def test_hello_works_with_a_dev_persona(client, local):
    assert client.get("/api/hello", headers={"X-Dev-Role": "role_1"}).json()["caller"]["role"] == "role_1"


# ── Real tokens (Entra) ───────────────────────────────────────────────────────


def test_token_role_from_app_roles(client, make_token):
    body = client.get("/api/me", headers=bearer(make_token(roles=["app.role_1"]))).json()
    assert body["role"] == "role_1"
    assert body["source"] == "entra"
    assert body["email"] == "test.user@example.com"


def test_token_role_from_groups_claim(client, make_token, monkeypatch):
    monkeypatch.setenv("AAD_GROUP_ADMIN", GROUP_ADMIN)
    r = client.get("/api/me", headers=bearer(make_token(groups=[GROUP_ADMIN])))
    assert r.json()["role"] == "admin"


def test_valid_token_with_no_role_is_403_not_401(client, make_token):
    r = client.get("/api/me", headers=bearer(make_token(roles=[])))
    assert r.status_code == 403
    assert r.json()["detail"]["error"] == "no_role"


def test_groups_overage_is_403_and_does_not_crash(client, make_token):
    token = make_token(extra={"_claim_names": {"groups": "src1"}})
    assert client.get("/api/me", headers=bearer(token)).status_code == 403


def test_token_without_the_required_scope_is_refused(client, make_token):
    r = client.get("/api/me", headers=bearer(make_token(roles=["app.admin"], scp="other")))
    assert r.status_code == 403
    assert r.json()["detail"]["error"] == "insufficient_scope"


def test_wrong_audience_is_401(client, make_token):
    r = client.get("/api/me", headers=bearer(make_token(roles=["app.admin"], aud="api://someone-else")))
    assert r.status_code == 401


def test_dev_headers_cannot_upgrade_a_real_token(client, make_token, local):
    """Even in APP_ENV=local, a bearer token wins: headers never raise a JWT's role."""
    h = {**bearer(make_token(roles=["app.role_2"])), "X-Dev-Role": "admin"}
    assert client.get("/api/me", headers=h).json()["role"] == "role_2"


def test_a_bad_token_in_local_mode_is_still_rejected(client, local):
    assert client.get("/api/me", headers={"Authorization": "Bearer not-a-jwt", "X-Dev-Role": "admin"}).status_code == 401


# ── Startup guard ─────────────────────────────────────────────────────────────


def test_guard_is_quiet_on_a_laptop(local):
    startup_auth_check(FastAPI())  # APP_ENV=local, not containerised -> only warns


def test_guard_refuses_local_auth_in_a_container(monkeypatch, local):
    monkeypatch.setenv("CONTAINER_APP_NAME", "ca-demo-myapp-be")
    with pytest.raises(RuntimeError, match="APP_ENV=local inside a container"):
        startup_auth_check(FastAPI())


@pytest.mark.parametrize("var", ["CONTAINER_APP_NAME", "CONTAINER_APP_REVISION", "WEBSITE_SITE_NAME", "KUBERNETES_SERVICE_HOST"])
def test_guard_recognises_each_platform_marker(monkeypatch, local, var):
    monkeypatch.setenv(var, "x")
    with pytest.raises(RuntimeError):
        startup_auth_check(FastAPI())


def test_guard_refuses_placeholder_tenant_in_a_container(monkeypatch):
    monkeypatch.setenv("CONTAINER_APP_NAME", "x")
    monkeypatch.setattr("app.auth.TENANT_ID", "REPLACE-WITH-YOUR-TENANT-ID")
    with pytest.raises(RuntimeError, match="AAD_TENANT_ID"):
        startup_auth_check(FastAPI())


def test_guard_refuses_a_current_user_override_in_a_container(monkeypatch):
    monkeypatch.setenv("CONTAINER_APP_NAME", "x")
    monkeypatch.setattr("app.auth.TENANT_ID", "11111111-1111-1111-1111-111111111111")
    monkeypatch.setattr("app.auth.AUDIENCE", "api://22222222-2222-2222-2222-222222222222")
    app = FastAPI()
    app.dependency_overrides[current_user] = lambda: None
    with pytest.raises(RuntimeError, match="dependency_overrides"):
        startup_auth_check(app)


def test_guard_passes_a_correctly_configured_container(monkeypatch):
    monkeypatch.setenv("CONTAINER_APP_NAME", "x")
    monkeypatch.setattr("app.auth.TENANT_ID", "11111111-1111-1111-1111-111111111111")
    monkeypatch.setattr("app.auth.AUDIENCE", "api://22222222-2222-2222-2222-222222222222")
    startup_auth_check(FastAPI())


def test_the_real_app_runs_the_guard_at_startup(monkeypatch, local):
    """Wiring check: the guard must actually be called by the app's lifespan."""
    from app.main import app

    monkeypatch.setenv("CONTAINER_APP_NAME", "x")
    with pytest.raises(RuntimeError, match="inside a container"):
        with TestClient(app):
            pass


def test_roles_module_exposes_the_documented_roles():
    assert roles.ROLES == ("admin", "role_1", "role_2")
