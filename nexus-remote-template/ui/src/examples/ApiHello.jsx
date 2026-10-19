import { useEffect, useState, useCallback } from 'react'
import { callApi } from '../lib/callApi'
import { isEmbedded } from '../lib/isEmbedded'

/**
 * EXAMPLE — the minimal "call my backend" screen (GET /api/hello).
 *
 * Not wired into the app shell. It is kept as the reference for how a screen uses
 * `callApi` and maps its error codes (CONFIG / INTERACTION_REQUIRED / UNAUTHORIZED)
 * to UI states. To try it, render <ApiHello {...props} /> from src/RemoteApp.jsx.
 * The module the NEXUS host actually mounts is src/RemoteApp.jsx ("./App").
 *
 * PROPS CONTRACT (supplied by the host when embedded):
 *   - user            {object}   the signed-in user (name, email, oid, roles…)
 *   - bearerToken     {string}   Token B string (convenience; prefer getSecureToken)
 *   - getSecureToken  {(scope)=>Promise<string>}  mint a FRESH token per call
 *   - onSessionExpired{()=>void} call this on unrecoverable auth failure, then STOP
 *   - serviceId       {string}   this remote's id from remotes.json (optional)
 *
 * Golden rules: never cache the token, never self-redirect while embedded, and on a
 * true 401 call onSessionExpired() and stop.
 */
export default function ApiHello(props) {
  const { user, getSecureToken, onSessionExpired, serviceId } = props

  const [state, setState] = useState('loading') // loading | ok | denied | expired | error
  const [data, setData] = useState(null)

  const load = useCallback(async () => {
    setState('loading')
    try {
      const result = await callApi('/api/hello', {
        getSecureToken,
        onSessionExpired,
      })
      setData(result)
      setState('ok')
    } catch (err) {
      switch (err.code) {
        case 'INTERACTION_REQUIRED':
        case 'FORBIDDEN':
          setState('denied') // our own access-denied UI — NOT a redirect
          break
        case 'UNAUTHORIZED':
          setState('expired') // host was already notified via onSessionExpired()
          break
        case 'CONFIG':
          setState('config') // build misconfig (e.g. empty API_BASE) — NOT a storm
          break
        default:
          setState('error')
      }
    }
  }, [getSecureToken, onSessionExpired])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>My App {serviceId ? `(${serviceId})` : ''}</h1>
        <small style={{ color: '#666' }}>
          {isEmbedded() ? 'Embedded in NEXUS host' : 'Running standalone'}
          {user?.name ? ` · ${user.name}` : ''}
        </small>
      </header>

      {state === 'loading' && <p>Loading…</p>}

      {state === 'ok' && (
        <pre
          style={{
            background: '#0b1021',
            color: '#a6e3a1',
            padding: 16,
            borderRadius: 8,
            overflow: 'auto',
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}

      {state === 'denied' && (
        <div style={{ padding: 16, background: '#fff3cd', borderRadius: 8 }}>
          <strong>Access denied.</strong> You don’t have consent/permission for this
          service. Contact your administrator.
        </div>
      )}

      {state === 'expired' && (
        <div style={{ padding: 16, background: '#f8d7da', borderRadius: 8 }}>
          <strong>Session expired.</strong> Please sign in again from the NEXUS shell.
        </div>
      )}

      {state === 'config' && (
        <div style={{ padding: 16, background: '#f8d7da', borderRadius: 8 }}>
          <strong>Configuration error.</strong> This remote was built without an{' '}
          <code>API_BASE</code> origin, so API calls would resolve against the host and
          fail. Rebuild with the <code>API_BASE</code> build arg set to your backend
          origin. (See <code>ui/Dockerfile</code> / <code>ui/webpack.config.js</code>.)
        </div>
      )}

      {state === 'error' && (
        <div style={{ padding: 16, background: '#f8d7da', borderRadius: 8 }}>
          <strong>Something went wrong.</strong>{' '}
          <button onClick={load} style={{ marginLeft: 8 }}>
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
