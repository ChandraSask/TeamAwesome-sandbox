# Auth patterns: direct-bearer (default) vs BFF / Option-C (optional)

> **TL;DR — you do NOT need a BFF.** This template ships with **direct-bearer**
> (pass the JWT). **BFF is an alternative option**, documented below for teams that
> outgrow single-hop. Pick exactly one:
>
> | Option | When | Cost | Status in this template |
> |--------|------|------|-------------------------|
> | **A. Direct-bearer** (default) | Single-hop: browser → your API → your DB/compute | None extra | ✅ **Implemented** |
> | **B. BFF / Option-C (OBO)** | Multi-hop: your API calls a downstream API *as the user*, or you need server-side sessions | Session store + OBO + CSRF/cookies | 📄 Documented only (opt-in) |

The template ships with **direct-bearer** (the AI Intake pattern): the browser sends
Token B straight to this backend, which validates it (`app/auth.py`). That's the right
choice for a **single-hop** service (browser → your API → your DB/compute).

Switch to the **BFF / Option-C** pattern (the cs_ops pattern) only if:

- Your backend must call **downstream APIs on the user's behalf** (multi-hop), needing
  **On-Behalf-Of (OBO)** token exchange, OR
- You need a **server-side session store** with an opaque session id (`sid`) instead of
  passing the JWT to the browser on every call, OR
- You have long-running work / websockets where re-minting Token B per call is awkward.

## What changes (FastAPI specifics)

1. **Session store** — add a store (Redis/Cosmos) keyed by opaque `sid`. The browser
   holds only the `sid`; the backend maps `sid → cached tokens`.
2. **OBO exchange** — in `validate_token` (`app/auth.py`), after verifying Token B, use
   **MSAL for Python** (`msal.ConfidentialClientApplication.acquire_token_on_behalf_of`)
   to exchange Token B for a downstream token, and cache it against the session.
3. **CSRF / cookies** — if you move to cookie-based `sid`, add CSRF protection and set
   `allow_credentials=True` in the CORS middleware (`app/main.py`) and `credentials: 'include'`
   on the client `fetch`.
4. **Host registry** — nothing changes in `remotes.json` shape; the UI still uses
   `getSecureToken(authScope)` to obtain Token B. Only your backend's internals differ.

Keep the front-end auth handshake identical — the host contract does not change.
