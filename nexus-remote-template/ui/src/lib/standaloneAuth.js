// Standalone (non-embedded) authentication.
//
// This module's MSAL instance is created LAZILY and is ONLY ever used when
// isEmbedded() === false. When embedded, the host is the SSO authority and this file
// must never run loginRedirect / acquireToken* — hence the guard in getStandaloneToken.
//
// MSAL is imported LAZILY, on first use. An embedded remote never calls this module, so it
// never downloads MSAL at all (~250 KB) — the host owns sign-in.
import { isEmbedded } from './isEmbedded'

let instancePromise = null

function config() {
  return {
    auth: {
      clientId: process.env.MSAL_CLIENT_ID || 'REPLACE-WITH-YOUR-CLIENT-ID',
      authority:
        process.env.MSAL_AUTHORITY ||
        'https://login.microsoftonline.com/REPLACE-WITH-YOUR-TENANT-ID',
      redirectUri: process.env.MSAL_REDIRECT_URI || window.location.origin,
    },
    cache: { cacheLocation: 'sessionStorage', storeAuthStateInCookie: false },
  }
}

// ONE shared in-flight promise: the lazy import yields, so two callers racing on first use
// must not each build their own PublicClientApplication.
function getInstance() {
  if (!instancePromise) {
    instancePromise = (async () => {
      const { PublicClientApplication } = await import(/* webpackChunkName: "msal" */ '@azure/msal-browser')
      const pca = new PublicClientApplication(config())
      await pca.initialize()
      return pca
    })().catch((err) => {
      instancePromise = null // a failed init (e.g. offline chunk load) may be retried
      throw err
    })
  }
  return instancePromise
}

/**
 * Acquire a token for standalone mode. Silent first; interactive popup on fallback.
 * Throws InteractionRequiredAuthError up to callApi if popups are blocked/denied.
 */
export async function getStandaloneToken(scope) {
  if (isEmbedded()) {
    // Hard guard: this path must NEVER execute inside the host.
    throw new Error(
      'standaloneAuth called while embedded — use the host getSecureToken prop instead.'
    )
  }

  const pca = await getInstance()
  const scopes = [scope]

  let account = pca.getActiveAccount() || pca.getAllAccounts()[0]
  if (!account) {
    const login = await pca.loginPopup({ scopes })
    account = login.account
    pca.setActiveAccount(account)
  }

  try {
    const r = await pca.acquireTokenSilent({ scopes, account })
    return r.accessToken
  } catch (err) {
    if (err?.name === 'InteractionRequiredAuthError') {
      const r = await pca.acquireTokenPopup({ scopes, account })
      return r.accessToken
    }
    throw err
  }
}
