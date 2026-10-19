# NEXUS Remote Integration Guide (template)

How a Module-Federation **remote** (micro-frontend tile) integrates with the **NEXUS
host**: the `remoteEntry.js` contract, the auth/token handshake, and everything required
to load and authenticate successfully inside the host — **without triggering an auth
storm**.

> This is the generic, remote-author-facing version of the host's integration guide, with
> placeholders instead of a specific app name, client id, or scope. Replace every
> `<placeholder>` with your own values. For the host-side registry details (how the
> platform team wires your origin into `remotes.json`, CSP, and the tile registry), see
> the host repo's `docs/remote-integration-guide.md` and `docs/onboarding-a-remote.md`.

> **The auth method in one line:** the host mints your remote's token by calling
> **`getSecureToken(<api-scope>)`** internally (`acquireTokenSilent` against your scope),
> then **passes the token STRING to your remote** — via the `bearerToken` prop
> (pre-acquired) and/or the `getSecureToken` prop (on-demand). Your remote **never**
> receives an MSAL instance, and **never** runs its own SSO redirect while embedded.

---

## 0. Choosing an auth pattern — direct-bearer vs BFF (read this first)

Your remote receives the same host contract either way (`bearerToken`, `getSecureToken`,
`onSessionExpired`). What differs is **what your remote does with the token** once its own
backend is reached.

|                              | **Direct-bearer**                                                     | **BFF / Option-C**                                                                                               |
| ---------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Token B lifetime in browser  | Held in memory, sent on every backend call as `Authorization: Bearer` | POSTed **once** to your backend `/session/init`; browser then carries only an opaque **`sid`**                   |
| What your API trusts         | The **JWT** on every request                                          | A **server-side session** keyed by `sid`                                                                         |
| Downstream (multi-hop) calls | Best when your backend is the final audience                          | Your backend does **On-Behalf-Of (OBO)** server-side, minting a correctly-audienced token per downstream service |
| XSS exposure                 | A live JWT sits in browser JS for the token's lifetime                | Only an opaque `sid`; the JWT stays server-side after init                                                       |
| Operational cost             | Lower — no session store to run                                       | Session store + `sid` lifecycle + `/session/init`                                                                |

### The decision rule

> **Single-audience, single-hop tile** (SPA → your own API): use **direct-bearer** — no
> session store, native `getSecureToken()` → Token B → `Bearer` handshake. This is the
> template's default (see [`backend/`](./backend)).
>
> **Distributed / multi-hop backend** (your API calls further services that each need
> their own token): use the **BFF** pattern — token forwarding and confidentiality are
> handled server-side. See [`backend/integration.md`](./backend/integration.md).

---

## 1. Architecture at a glance

```
┌──────────────────── NEXUS host (its own MSAL) ────────────────────┐
│  bootstrap → window.__NEXUS_HOST__ = true ; window.__NEXUS__ = {…} │
│  AuthContext → owns interactive login + silent renewal (Token A)   │
│  getSecureToken(scope) → acquireTokenSilent → Token B (per remote) │
│  remoteLoader → <script src=remoteEntry.js> → container.get(module)│
│                                                                    │
│   <RemoteApp bearerToken=… getSecureToken=… onSessionExpired=… />  │
└───────────────────────────│────────────────────────────────────────┘
              token STRING (props) ▼   (NEVER an MSAL instance)
┌──────────────────── Your remote (this template) ──────────────────┐
│  webpack MF: name "<your-scope>", exposes "./App": "./src/RemoteApp"│
│  RemoteApp → isEmbedded() ? use host token : standalone own MSAL    │
│  outbound calls → <your-backend-origin> with Bearer <Token B>      │
└────────────────────────────────────────────────────────────────────┘
```

**Two tokens, two purposes:**

| Token       | Audience                           | Acquired by                  | Used for                       |
| ----------- | ---------------------------------- | ---------------------------- | ------------------------------ |
| **Token A** | host API (`idToken`)               | host                         | the host's own backend         |
| **Token B** | **your** API scope (`<api-scope>`) | host `getSecureToken(scope)` | your remote → **your** backend |

Never forward Token A to your backend, and never present Token B to the host.

---

## 2. The remote build: `remoteEntry.js` contract

### Three values that MUST line up host ↔ remote

If any mismatch, the host throws `Remote container "<scope>" not found` or
`container.get("<module>") failed`.

| Concept        | This repo — `ui/webpack.config.js` | HOST registry entry              |
| -------------- | ---------------------------------- | -------------------------------- |
| Container name | `name: "<your-scope>"`             | `"scope": "<your-scope>"`        |
| Exposed module | `exposes: { "./App": … }`          | `"module": "./App"`              |
| Entry filename | `filename: "remoteEntry.js"`       | `"entryPath": "/remoteEntry.js"` |

`scripts/scaffold.sh` writes all three from the same arguments so they can't drift.

### Supported module contracts

Your exposed `./App` may either:

1. **default-export a React component** (share `react`/`react-dom` as singletons), or
2. export an imperative **`{ mount }`** function.

Do **not** set `window.React` on the host to "fix" a render error — that pushes your
remote into a fallback branch and can cause it to render nested inside itself.

### Serving requirements (non-negotiable)

- **`output.publicPath`** MUST be the **absolute origin of THIS remote**
  (`<your-ui-origin>/`), baked at build time via the `PUBLIC_PATH` build arg, or lazy
  chunks 404 in the host.
- **`API_BASE`** MUST be the **absolute origin of YOUR backend** (`<your-backend-origin>`),
  baked at build time (see §3 — this is an auth-storm trap).
- **`API_SCOPE`** MUST equal the host registry `.authScope` for your tile (`<api-scope>`),
  baked at build time.
- `remoteEntry.js` + hashed chunks **and your extracted `.css` chunks** served with
  **CORS** so the host can `<script src>` / `<link rel=stylesheet>`-load them (the
  template `ui/Dockerfile` + `nginx.conf.template` do this).
- `remoteEntry.js` and `index.html` MUST be served `Cache-Control: no-store`; hashed
  chunks may be long-cached `immutable`.
- Your bundle MUST satisfy the **host CSP** — no `eval`, no inline `<script>`, no
  self-hosted fonts/media. See **§3b**; `npm run build` enforces it.

> **Build command (all three baked together):**
>
> ```bash
> docker build \
>   --build-arg PUBLIC_PATH=<your-ui-origin>/ \
>   --build-arg API_BASE=<your-backend-origin> \
>   --build-arg API_SCOPE=<api-scope> \
>   -t <acr>/<your-app>-ui:latest ui/
> ```

---

## 3. The auth contract (the important part)

The host hands the remote a **token STRING only** — never an MSAL instance. When embedded:

- ✅ Call `getSecureToken(<api-scope>)` **fresh before every** outbound API call — never
  cache Token B.
- ✅ On `InteractionRequiredAuthError` → show YOUR OWN "access denied / needs consent" UI.
  Do **not** redirect. This is a **per-scope** consent gap for your tile only; the host
  session is still valid.
- ✅ On a true 401 from **YOUR OWN backend** (reached via the absolute `API_BASE`) → call
  `onSessionExpired()` and **stop**. The host is the single SSO authority.
- ❌ Never fire `onSessionExpired()` for a 401 you are not certain came from your own
  backend (see §5, the relative-URL storm).
- ❌ Never call `loginRedirect` / `acquireTokenRedirect` / `window.location.reload()`
  while embedded.
- ❌ Never run your own MSAL instance while `isEmbedded()` is `true`.

The canonical implementation is already in
[`ui/src/lib/callApi.js`](./ui/src/lib/callApi.js) and
[`ui/src/lib/isEmbedded.js`](./ui/src/lib/isEmbedded.js). Read them once; they are the
whole handshake.

### The two expiry situations (handled differently on purpose)

| Situation                 | What it means                                                                          | What the remote does                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Host session expired**  | The host token can no longer be silently renewed (true logout-level expiry)            | Call **`onSessionExpired()`**. The host flushes activity → logout → SSO login.                                                            |
| **Per-scope consent gap** | Only _your_ API scope is missing consent/entitlement — the host session is still valid | `getSecureToken()` **rejects to your remote** with `InteractionRequiredAuthError`. Show your own "access denied" UI. **Do not** redirect. |

```js
// The one correct way for this remote to call its backend.
async function callApi(path, { getSecureToken, onSessionExpired } = {}) {
  // AUTH-STORM GUARD: an empty API_BASE while embedded would make this a relative URL
  // that resolves against the HOST origin — fail loud, never storm (see §5).
  if (isEmbedded() && !API_BASE) {
    const e = new Error(
      "API_BASE is empty while embedded — set the build arg.",
    );
    e.code = "CONFIG";
    throw e;
  }

  let token = "";
  try {
    token = await getSecureToken(API_SCOPE); // fresh scoped Token B every call
  } catch (err) {
    if (err?.name === "InteractionRequiredAuthError") return showAccessDenied();
    onSessionExpired?.(); // truly unrecoverable → host's single SSO authority
    return;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  // 401 from YOUR backend after a fresh token = host session lapsed. Hand off.
  if (res.status === 401) {
    onSessionExpired?.();
    return;
  }
  return res;
}
```

---

## 3b. The CSP contract — what your bundle may and may not contain ⚠️

> **The one-line version:** your remote is loaded **into the host document**, so the
> browser enforces the **HOST's** Content-Security-Policy against **your** assets.
> Nothing your Container App serves can relax it. Build to
> [`ui/nexus-csp.json`](./ui/nexus-csp.json) or your tile renders blank in prod.

### Why this bites late (and hard)

|                 | dev / demo                                        | **prod**                                           |
| --------------- | ------------------------------------------------- | -------------------------------------------------- |
| Host CSP mode   | `Content-Security-Policy-**Report-Only**`         | `Content-Security-Policy` (**enforcing**)          |
| A violation is… | logged to the console, **everything still works** | **blocked** — script never executes, tile is blank |

That asymmetry is the trap: **"it worked in demo" proves nothing.** The host runs
`CSP_REPORT_ONLY=true` in dev/demo and `false` in prod, so a violating bundle behaves
perfectly right up until go-live. This template therefore enforces the policy at **your**
build time — `npm run build` runs `scripts/check-csp.cjs` and **fails** on a violation.

### `'self'` means the HOST, not you

This is the single most misread part of the policy. Once embedded, the document origin is
the host's, so every `'self'` in the table below resolves to the **host** origin. Only
these directives are extended to **your** origin (via your `remotes.json` registration):

**`script-src` · `style-src` · `connect-src` · `img-src`** — everything else is host-only.

| Directive          | Host value                                                                | What it means for your bundle                                                                   |
| ------------------ | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `script-src`       | `'self'` + registered remote origins                                      | ✅ your hashed `.js` chunks — ❌ **no `'unsafe-eval'`**, **no `'unsafe-inline'`**, **no nonce** |
| `style-src`        | `'self' 'unsafe-inline'` + remote origins + `fonts.googleapis.com`        | ✅ your extracted `.css` **and** inline `style={{}}` / `<style>`                                |
| `connect-src`      | `'self'`, Entra, Graph, App Insights + remote `origin`/`connectOrigins[]` | ✅ your `API_BASE` **once registered** (§4)                                                     |
| `img-src`          | `'self' data: blob: https:`                                               | ✅ images from anywhere over https                                                              |
| `font-src`         | `'self' data:` + `fonts.gstatic.com` + `cdn.jsdelivr.net`                 | ❌ **your origin is NOT here** — a self-hosted `.woff2` is blocked                              |
| `worker-src`       | `'self' blob:`                                                            | ❌ `new Worker('/w.js')` blocked — construct from a `Blob`                                      |
| `manifest-src`     | `'self'`                                                                  | ❌ no `.webmanifest` from your origin                                                           |
| `object-src`       | `'none'`                                                                  | ❌ no `<object>` / `<embed>` (including PDF embeds)                                             |
| _(no `media-src`)_ | falls back to `default-src 'self'`                                        | ❌ `<audio>`/`<video>` files served from your origin are blocked                                |

### What the template already does for you

You get a compliant build **by default** — these are deliberate, not incidental:

| Setting (`ui/webpack.config.js`)                                          | Reason                                                                                                                                            |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `devtool: 'source-map'` / `'cheap-module-source-map'` — **never `eval*`** | every `eval*` devtool wraps each module in `eval()`; with no `'unsafe-eval'` the **entire** bundle is dead                                        |
| `output.environment.globalThis: true`                                     | stops webpack's runtime emitting its `new Function("return this")` polyfill, keeping the bundle provably eval-free                                |
| `MiniCssExtractPlugin` in prod                                            | real `.css` chunks from your origin (allowed by `style-src`) instead of relying on the host's `'unsafe-inline'`, which is documented as temporary |
| fonts → `type: 'asset/inline'`                                            | `data:` is allowed by `font-src`; a separate font file would not be                                                                               |
| `HtmlWebpackPlugin` with `inject: true`, `minifyJS/CSS: false`            | never inlines the runtime chunk into HTML (blocked — no `'unsafe-inline'`)                                                                        |
| dev-server + `public/index.html` carry a **mirror** of the host CSP       | the violation surfaces on your machine, not in prod                                                                                               |
| `nginx.conf.template` serves `.css` with CORS, and **404s font files**    | a blocked font is otherwise an invisible fallback-typeface regression                                                                             |

### The guard rail

```bash
npm run build            # postbuild → check-csp.cjs (fails on violations)
npm run check:csp        # re-run on its own
npm run check:csp:strict # warnings fail too — this is what CI runs
```

> ### 🚫 Do not "fix" a failure by editing `ui/nexus-csp.json`
>
> That file is a **frozen mirror** of the host policy (`server/lib/csp.ts` +
> `deployment/lib/common.sh` in the host repo). Widening it makes your build go green and
> changes **nothing** about what the browser does — it just moves the failure to prod.
>
> The same applies to `CSP_*_SRC_EXTRA` App Settings on the host: they are **derived from
> `remotes.json` and reset on every host deploy**, so a hand-typed
> `az webapp config appsettings set CSP_SCRIPT_SRC_EXTRA=…` hotfix is **silently wiped**
> the next time the host ships. If you genuinely need a directive the host does not grant,
> that is a **host change** — raise it with the platform team.

### If you hit a violation

| Violation              | Fix                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `no-unsafe-eval`       | check `devtool`; find the dependency calling `eval` / `new Function` and replace it |
| `no-inline-script`     | remove runtime-chunk inlining; all script must be external files                    |
| `no-self-hosted-font`  | inline it (`asset/inline`) or load from `fonts.gstatic.com` / `cdn.jsdelivr.net`    |
| `worker-must-be-blob`  | `new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })))`     |
| `no-self-hosted-media` | inline small clips as `data:`, or host the media elsewhere                          |
| `no-service-worker`    | remove it — a remote must never register one; it would hijack the host scope        |
| `no-widened-meta-csp`  | revert `public/index.html` to the mirrored policy                                   |

---

## 4. Register in the HOST (done by the platform team)

You **cannot** self-onboard. The platform team adds ONE entry to the host registry — the
single source of truth that feeds the client bundle, the CSP allow-list, the seed tiles,
and the health probes:

```jsonc
{
  "id": "<your-app>", // unique slug; also the tile id
  "scope": "<your-scope>", // MF container name (ui/webpack.config.js `name`)
  "module": "./App", // exposed module (ui/webpack.config.js `exposes` key)
  "origin": "<your-ui-origin>", // scheme://host — lands in CSP script-src/connect-src
  "entryPath": "/remoteEntry.js",
  "authScope": "<api-scope>", // OPTIONAL — your backend's Token B scope
  "healthPath": "/",
  "connectOrigins": ["<your-backend-origin>"], // OPTIONAL — added to CSP connect-src
}
```

The three values in the table in §2 must match your `ui/webpack.config.js` exactly.
`connectOrigins` (or `origin`) MUST cover your absolute `API_BASE`, or CSP `connect-src`
blocks the fetch.

---

## 5. Why it's designed this way — the auth-storm problem

The whole model — the host renews silently, your remote just pulls a fresh scoped token
per call, and true expiry defers to `onSessionExpired()` — exists to prevent **auth
storms / infinite redirect loops** where multiple independently-deployed remotes share
**one** browser session.

**1. There can only be _one_ SSO authority per page.**
If two remotes could each trigger `loginRedirect`, they would fight over the same
redirect, remount each other, and re-fire — a loop. The host designates itself the single
SSO-redirect authority; every remote defers via `onSessionExpired()`. The host backs this
with reload-surviving storm guards, but your remote must not add fuel to the fire.

**2. "Pull a fresh token every call" makes expiry a _non-event_.**
`getSecureToken(scope)` mints Token B on demand. Because you re-mint immediately before
each call and never cache it, "the token expired mid-session" simply cannot happen.

**3. The two failure types are distinguished on purpose.**
A per-scope `InteractionRequiredAuthError` is a _local_ problem for your tile and must
**not** tear down the shared host session. Only a genuine host-session expiry justifies
the platform-wide logout. Mapping a per-scope consent gap to `onSessionExpired()` was the
classic bug that produced a storm.

**3b. Never issue a host-relative API call — the "empty API base" storm.** ⚠️
If your remote builds backend calls from an **empty/omitted `API_BASE`** (e.g.
`fetch('/api/…')` because the build arg was never baked in), the browser resolves that
**relative** URL against the **HOST origin**. The host returns `401` for that unknown path
(you are presenting a Token B whose audience is _your_ backend, not the host), and if you
misread it as _your backend_ expiring the session → `onSessionExpired()` → SSO redirect →
reload → remount → re-fire = **infinite auth storm**.

| Root cause                                        | Symptom                                                                                       | Fix                                                                                                                                 |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| API base empty/relative → fetch hits the **host** | Repeated `401` on `/api/*` served by the **host** origin, then SSO redirect + reload flapping | Bake an **absolute** `API_BASE`; treat an empty `API_BASE` while embedded as a hard **config error**, never a session-expiry signal |

> **Rule:** always call your backend via its **absolute origin** (baked at build time via
> the webpack `DefinePlugin` in `ui/webpack.config.js` + the `API_BASE` build arg in
> `ui/Dockerfile`). This template **fails loud** (a `CONFIG` error in your own UI) when
> embedded with an empty API base, instead of storming the host.

**4. The host hands the remote a _token string only_ — never its MSAL instance.**
This is both **security** (you can't mint arbitrary tokens or inspect other scopes) and
**isolation** (you physically cannot run the SSO authority even if your code tried).

---

## 6. Detecting embedded vs standalone

`isEmbedded()` returns `true` when `window.__NEXUS_HOST__ === true` or `window.__NEXUS__`
is set (the host sets these in its bootstrap). Use it to branch:

- **Embedded** → consume the host's `getSecureToken` / `bearerToken` props; never run MSAL.
- **Standalone** (dev / direct URL) → use your own MSAL config (`ui/src/lib/standaloneAuth.js`).

See [`ui/src/lib/isEmbedded.js`](./ui/src/lib/isEmbedded.js).

---

## 7. Troubleshooting

| Symptom                                                                                                           | Cause                                                                                               | Fix                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `Remote container "<scope>" not found on window`                                                                  | host `scope` ≠ remote MF `name`                                                                     | align names (§2)                                                                                       |
| `container.get("./App") failed`                                                                                   | host `module` ≠ remote `exposes` key                                                                | align module path (§2)                                                                                 |
| `Failed to load remote entry` / 404                                                                               | wrong entry URL or CORS blocked                                                                     | fix `PUBLIC_PATH` / CORS (§2)                                                                          |
| Remote renders NESTED inside itself                                                                               | host set `window.React`, remote took its iframe fallback                                            | remove `window.React` on the host; share React as a singleton                                          |
| Remote loads but backend 401                                                                                      | wrong scope (Token A vs Token B) or audience mismatch                                               | use `getSecureToken(<api-scope>)`; verify your API audience                                            |
| **Remote flaps / infinite redirect after a data call** (repeated `401` on `/api/*` served by the **HOST** origin) | empty/relative `API_BASE` → fetch hits the host → misread as session expiry → storm (§5 point 3b)   | bake an **absolute** `API_BASE`; the template now fails loud with a `CONFIG` error instead of storming |
| Config error UI ("built without an API_BASE")                                                                     | `API_BASE` build arg not passed                                                                     | rebuild with `--build-arg API_BASE=<your-backend-origin>` (§2)                                         |
| `InteractionRequiredAuthError` on one action                                                                      | per-scope consent gap for your tile                                                                 | show your own access-denied UI; do **not** redirect (§3)                                               |
| Two Reacts / hook errors                                                                                          | React not a shared singleton                                                                        | `shared: { react: { singleton: true } }` both sides                                                    |
| `[MSAL] no local account (standalone)`                                                                            | `isEmbedded()` false                                                                                | host must set `__NEXUS_HOST__`/`__NEXUS__`; remote must check them (§6)                                |
| **Tile blank in PROD but fine in demo**, console shows `Refused to execute… violates Content-Security-Policy`     | dev/demo run the host CSP **report-only**; prod **enforces** it                                     | run `npm run check:csp:strict` and fix the bundle (§3b). Do **not** widen `ui/nexus-csp.json`          |
| `Refused to evaluate a string as JavaScript` / `EvalError`                                                        | `eval*` webpack devtool, or a dep using `eval`/`new Function` — `script-src` has no `'unsafe-eval'` | `devtool: 'source-map'`; keep `output.environment.globalThis: true` (§3b)                              |
| Remote loads but is **completely unstyled**                                                                       | extracted `.css` served without CORS, or blocked                                                    | ensure nginx sends CORS for `.css` (template does); confirm your origin is registered (§4)             |
| Text renders in a **fallback typeface** only                                                                      | self-hosted font blocked — `font-src` excludes remote origins                                       | inline as `data:` (`asset/inline`) or use `fonts.gstatic.com` / `cdn.jsdelivr.net` (§3b)               |
| `fetch` to your backend fails with a CSP `connect-src` error                                                      | your `API_BASE` origin isn't in the host registry                                                   | platform team adds it to `origin`/`connectOrigins[]` in `remotes.json` (§4)                            |
| UI says **"signed in, but have no role yet"** (backend `403 no_role`)                                             | the user is in none of the Entra groups mapped to a role                                            | add them to a role group (§8.2); roles are only ever read from the token                               |

---

## 8. Roles — Entra groups → app roles → your backend

Authentication answers _who are you_ (§3). **Roles answer _what may you do_.** This template ships a
small, complete role system so you do not have to invent one — and a way to build and test it
**before you have any Entra ID setup**.

### 8.1 The model

Three roles and three permissions. Edit them; the shape is what matters.

| Role     | `submission.create` | `submission.review` | `admin.view` |
| -------- | :-----------------: | :-----------------: | :----------: |
| `admin`  |          ✓          |          ✓          |      ✓       |
| `role_1` |          ✓          |          ✓          |      —       |
| `role_2` |          ✓          |          —          |      —       |

- A user holds **one** role. If their token carries several, the most privileged wins (`admin` > `role_1` > `role_2`).
- Code checks a **permission**, never a role name: `Depends(require_permission("submission.review"))` on the
  backend, `session.can('submission.review')` in the UI. Renaming a role then touches one table, not every screen.
- **The backend is the authority.** The UI hides what a role cannot use, but a hidden button is not security — the
  API refuses the same action on its own. Always add the backend check first.

| File                                         | What it holds                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------------- |
| [`backend/app/roles.py`](./backend/app/roles.py) | roles, the Entra → role mapping, `PERMISSIONS`, `current_user`, `require_role/permission`, the startup guard |
| [`backend/app/routes/me.py`](./backend/app/routes/me.py) | `GET /api/me` (the UI reads its role from here) and two demo role-protected routes |
| [`ui/src/lib/roles.js`](./ui/src/lib/roles.js) | the UI's mirror of the table, for offline development                                 |
| [`ui/src/lib/useSession.js`](./ui/src/lib/useSession.js) | decides where the role comes from, exposes `session.can(...)`                  |
| [`backend/tests/test_roles.py`](./backend/tests/test_roles.py) | the contract, as tests                                                          |

When you change the table, change **both** `roles.py` and `roles.js`. The **Check with backend** button on the
Home page compares the two and warns if they have drifted.

### 8.2 Setting it up in Entra ID (when you are ready)

A role reaches your backend as a claim in Token B. You create **app roles** on your API's app registration and
**assign an Entra group to each one**; Entra then puts the role in the token of every member.

1. **App registrations → _your API app_ → App roles → Create app role**, three times:

   | Display name | Allowed member types | Value (must match `APP_ROLE_TO_ROLE`) |
   | ------------ | -------------------- | -------------------------------------- |
   | Admin        | Users/Groups         | `app.admin`                            |
   | Role 1       | Users/Groups         | `app.role_1`                           |
   | Role 2       | Users/Groups         | `app.role_2`                           |

2. **Enterprise applications → _the same app_ → Users and groups → Add user/group** → pick the Entra group →
   pick the role. **One group per role.** (Assign groups, not people: membership is then managed in one place.)
3. **Enterprise applications → _the app_ → Properties → "Assignment required?" = Yes.** Anyone outside the
   groups cannot get a token for your API at all, rather than getting one that then fails with `no_role`.
4. Sign in as a member and decode the token (e.g. at jwt.ms). You should see `"roles": ["app.role_1"]` and
   `"scp": "access_as_user"`.

> **Who can do this?** Creating app roles needs _Application Administrator_ (or owner of the registration);
> assigning groups needs the same on the enterprise app. That is usually the platform team — ask early, it is the
> slow part. Everything else in this section you can finish without it (§8.4).

**Alternative: group object IDs.** If you cannot define app roles, add the **groups claim** (App registration →
Token configuration → Add groups claim → _Groups assigned to the application_), then give the backend the group
object IDs: `AAD_GROUP_ADMIN`, `AAD_GROUP_ROLE_1`, `AAD_GROUP_ROLE_2` (Bicep params `groupAdminId`, `groupRole1Id`,
`groupRole2Id`). Both sources work together and the highest role wins. Prefer app roles: Entra stops sending the
group list above **200 groups** (_overage_), and such a user would land on `no_role`. The backend logs when it
sees this.

### 8.3 What the backend returns

| Situation                                                  | Status | `detail.error`           |
| ---------------------------------------------------------- | :----: | ------------------------ |
| No / invalid / expired token, wrong audience               |  401   | `missing_bearer_token` … |
| Valid token but not for your scope (`access_as_user`)      |  403   | `insufficient_scope`     |
| Valid token, **no mapped role** (user in no group)         |  403   | `no_role`                |
| Role is real but not allowed here                          |  403   | `forbidden_role` / `forbidden_permission` |

The UI reacts to these exactly as §3 requires: `no_role` and `forbidden_*` show **your own** "no access" panel —
never a redirect, and never `onSessionExpired()` (the host session is fine); only a real 401 goes to the host.

### 8.4 Building before Entra exists — the developer role picker

You do not need any of §8.2 to develop. Run both halves in **developer mode**:

```bash
./scripts/run-dev.sh   # API on :8080 (APP_ENV=local) + UI on :3001
```

Open the UI and use **Developer mode → Act as** on the Home page. The whole app (nav, buttons, pages) now behaves
as that role, and **Check with backend** sends the same identity to the API and shows what it sees. Run the
backend tests with `cd backend && python -m pytest`.

How it works: the UI sends `X-Dev-Role` / `X-Dev-User` headers; the backend honours them **only** when it runs
with `APP_ENV=local` **and** the request carries no `Authorization` header. This is the most dangerous code in
the template, so it is locked down in layers:

| Guard                                                                  | Where                                   |
| ---------------------------------------------------------------------- | --------------------------------------- |
| Off unless `APP_ENV` is **exactly** `local`; unset means production     | `roles.dev_auth_enabled`                |
| A bearer token is always validated — headers can never upgrade a JWT    | `roles.current_user`                    |
| Backend **refuses to start** with it on in a container (Container Apps, App Service, AKS) | `roles.startup_auth_check` (lifespan) |
| CORS does not even allow the dev headers unless `APP_ENV=local`         | `main.py`                               |
| Picker exists only in a development build (`DEV_AUTH`, off for `npm run build`) | `webpack.config.js`, `devAuth.js` |
| Picker is inert when embedded — the real role comes from `/api/me`      | `useSession.js`                         |
| Bicep sets `APP_ENV=production` explicitly                              | `deployment/containerapp.bicep`         |

Each guard has a test that fails if it is removed.

### 8.5 Switching from the picker to real Entra

Nothing in the UI changes: embedded, `useSession` already asks `GET /api/me` and the picker disappears. You supply
the configuration:

1. Backend: `AAD_TENANT_ID`, `AAD_AUDIENCE` (and group ids if you chose that route) — the container will not start
   without the first two. `APP_ENV` stays `production`.
2. UI build: `API_BASE`, `API_SCOPE`, `PUBLIC_PATH` (§2).
3. Platform team: your `remotes.json` entry (§4), with `authScope` equal to your `API_SCOPE`.
4. Entra: the app roles and group assignments from §8.2.
5. Smoke test from the host as a member of each group: `/api/me` returns that role; a user in no group sees the
   "no role" panel.

### 8.6 Adding or renaming a role

1. `backend/app/roles.py`: add it to `ROLES`, `APP_ROLE_TO_ROLE`, `GROUP_ENV_TO_ROLE` and `PERMISSIONS`.
2. `ui/src/lib/roles.js`: the same, plus its label and blurb.
3. Entra: a matching app role **Value** and a group assignment (§8.2).
4. Run `python -m pytest` — the table is checked for consistency (every permission names real roles; `admin`
   holds all of them).
