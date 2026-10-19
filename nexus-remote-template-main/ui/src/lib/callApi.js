import { isEmbedded } from './isEmbedded'
import { getStandaloneToken } from './standaloneAuth'

// The scope for YOUR backend's Token B. Must equal the host remotes.json ".authScope".
// (Left as a placeholder; scaffold.sh / your build should inject the real value.)
export const API_SCOPE =
  process.env.API_SCOPE || 'api://REPLACE-WITH-YOUR-CLIENT-ID/access_as_user'

// Base URL of YOUR backend — the ABSOLUTE origin of your API, baked at BUILD time via
// the API_BASE build arg (see ui/webpack.config.js DefinePlugin + ui/Dockerfile).
//
// ⚠️ AUTH-STORM TRAP: this MUST be your backend's absolute origin, e.g.
//   "https://ca-demo-myapp-be.<suffix>.canadaeast.azurecontainerapps.io"
// If API_BASE is EMPTY while embedded, `${API_BASE}${path}` becomes a RELATIVE URL
// (e.g. "/api/hello") that the browser resolves against the HOST origin. The host
// returns 401 for that unknown path with the wrong-audience token, callApi below reads
// it as "our backend said the session is dead", fires onSessionExpired(), the host does
// an SSO redirect + reload, the remote re-mounts and re-fires → an INFINITE AUTH STORM.
// (This is the exact failure that took down the Balance Tool remote.) So an empty
// API_BASE while embedded is treated as a hard CONFIG error, NOT a session expiry.
// In the host it must also be an origin listed in remotes.json ".connectOrigins"
// (otherwise CSP connect-src blocks the fetch).
export const API_BASE = process.env.API_BASE || ''

/**
 * The ONE correct way for a NEXUS remote to call its backend.
 *
 * Contract (see docs/remote-integration-guide.md in the host repo):
 *  - Mint a FRESH token before EVERY call. Never cache Token B.
 *  - Embedded  → use host-provided getSecureToken(scope).
 *  - Standalone→ use our own MSAL (standaloneAuth).
 *  - InteractionRequiredAuthError → surface OUR access-denied UI (do NOT redirect).
 *  - true 401 / unrecoverable → call onSessionExpired() and STOP. No self-reload/redirect.
 *
 * @param {string} path                  e.g. "/api/things"
 * @param {object} opts
 * @param {Function} [opts.getSecureToken] host-supplied when embedded: (scope) => Promise<string>
 * @param {Function} [opts.onSessionExpired] host-supplied; call on unrecoverable auth failure
 * @param {object}  [opts.fetchInit]      extra fetch options (method, body, headers…)
 * @param {string}  [opts.scope]          override API_SCOPE if needed
 */
export async function callApi(path, opts = {}) {
  const {
    getSecureToken,
    onSessionExpired,
    fetchInit = {},
    scope = API_SCOPE,
  } = opts

  // AUTH-STORM GUARD: an empty API_BASE while embedded means `${API_BASE}${path}`
  // would resolve to the HOST origin. A 401 from the host would then be misread as
  // OUR backend rejecting the session and would fire onSessionExpired() → SSO redirect
  // → reload → re-fire = infinite auth storm. Fail LOUD as a config error instead; do
  // NOT call onSessionExpired(). Surfaced as CONFIG in the UI (see RemoteApp switch).
  if (isEmbedded() && !API_BASE) {
    const e = new Error(
      'API_BASE is empty while embedded — set the API_BASE build arg to your backend origin (see ui/Dockerfile / webpack DefinePlugin). Refusing to fetch a relative URL against the host.'
    )
    e.code = 'CONFIG'
    throw e
  }

  let token
  try {
    if (isEmbedded()) {
      if (typeof getSecureToken !== 'function') {
        throw new Error(
          'Embedded remote missing getSecureToken prop from host — cannot mint Token B.'
        )
      }
      // FRESH token per call — the host handles silent renewal / caching.
      token = await getSecureToken(scope)
    } else {
      // Standalone dev/deploy: our own MSAL.
      token = await getStandaloneToken(scope)
    }
  } catch (err) {
    // Consent / MFA / conditional-access → show our own gate, never redirect while embedded.
    if (isInteractionRequired(err)) {
      const e = new Error('interaction_required')
      e.code = 'INTERACTION_REQUIRED'
      throw e
    }
    // Token could not be obtained at all → treat as session gone.
    if (isEmbedded() && typeof onSessionExpired === 'function') onSessionExpired()
    throw err
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchInit,
    headers: {
      Accept: 'application/json',
      ...(fetchInit.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  })

  if (res.status === 401) {
    // True 401 from OUR backend = token no longer valid → host is the authority.
    if (isEmbedded() && typeof onSessionExpired === 'function') {
      onSessionExpired()
    }
    const e = new Error('unauthorized')
    e.code = 'UNAUTHORIZED'
    throw e
  }

  if (res.status === 403) {
    // Authenticated but not allowed → OUR access-denied UI, not a redirect.
    const e = new Error('forbidden')
    e.code = 'FORBIDDEN'
    throw e
  }

  if (!res.ok) {
    const e = new Error(`api_error_${res.status}`)
    e.code = 'API_ERROR'
    e.status = res.status
    throw e
  }

  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json') ? res.json() : res.text()
}

function isInteractionRequired(err) {
  if (!err) return false
  const name = err.name || ''
  const code = err.errorCode || err.code || ''
  return (
    name === 'InteractionRequiredAuthError' ||
    /interaction_required|consent_required|login_required/i.test(String(code)) ||
    /interaction_required|consent_required|login_required/i.test(String(err.message || ''))
  )
}
