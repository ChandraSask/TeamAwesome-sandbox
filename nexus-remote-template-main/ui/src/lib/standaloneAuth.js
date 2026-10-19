// Standalone (non-embedded) authentication.
//
// This module's MSAL instance is created LAZILY and is ONLY ever used when
// isEmbedded() === false. When embedded, the host is the SSO authority and this file
// must never run loginRedirect / acquireToken* — hence the guard in getStandaloneToken.
import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser'
import { isEmbedded } from './isEmbedded'

let msalInstance = null
let initPromise = null

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

async function getInstance() {
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(config())
    initPromise = msalInstance.initialize()
  }
  await initPromise
  return msalInstance
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
    if (err instanceof InteractionRequiredAuthError) {
      const r = await pca.acquireTokenPopup({ scopes, account })
      return r.accessToken
    }
    throw err
  }
}
