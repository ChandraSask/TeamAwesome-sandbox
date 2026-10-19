import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { callApi } from './callApi'
import { DEV_USER, devAuthActive, readDevRole, writeDevRole } from './devAuth'
import { ROLE_LABEL, isRole, permissionsFor } from './roles'

/**
 * Who is using the app, in which role, and what may they do?
 *
 * Two sources, chosen ONCE by the build + environment — never by the user:
 *
 *   DEV MODE      `npm run dev`, page opened on its own (not inside NEXUS).
 *                 The role is the one picked in the Home page drop-down, and the
 *                 permissions come from the local table (lib/roles.js). No Entra.
 *
 *   SERVER MODE   everything else — in particular, embedded in the NEXUS host.
 *                 The role and permissions come from `GET /api/me`, which the backend
 *                 derives from the validated token (Entra app roles / groups).
 *                 The browser has no say.
 *
 * `status` is what the shell renders on:
 *   ready      go ahead
 *   loading    waiting for /api/me
 *   no-role    signed in, but not in any role group (backend 403)  -> tell them who to ask
 *   config     API_BASE missing from the build                      -> developer problem
 *   expired    the host session lapsed (the host has been told)
 *   denied     consent / MFA still needed for this app's scope
 *   error      anything else; `retry()` tries again
 */
export function useSession({ hostUser, getSecureToken, onSessionExpired }) {
  const devMode = devAuthActive()
  const [devRole, setDevRoleState] = useState(() => readDevRole())
  const [remote, setRemote] = useState({ status: 'loading', me: null, error: null })

  // The host may hand us a new function identity on every render. Reading the latest
  // through a ref means /api/me is fetched once, not once per render (which would be
  // a request storm against our own backend).
  const hostRef = useRef({ getSecureToken, onSessionExpired })
  hostRef.current = { getSecureToken, onSessionExpired }

  const load = useCallback(async () => {
    setRemote({ status: 'loading', me: null, error: null })
    try {
      const me = await callApi('/api/me', hostRef.current)
      setRemote({ status: 'ready', me, error: null })
    } catch (err) {
      const status =
        { FORBIDDEN: 'no-role', CONFIG: 'config', UNAUTHORIZED: 'expired', INTERACTION_REQUIRED: 'denied' }[err?.code] ??
        'error'
      setRemote({ status, me: null, error: err })
    }
  }, [])

  useEffect(() => {
    if (!devMode) load()
  }, [devMode, load])

  const setDevRole = useCallback((role) => {
    if (!isRole(role)) return
    writeDevRole(role)
    setDevRoleState(role)
  }, [])

  return useMemo(() => {
    const me = remote.me
    const role = devMode ? devRole : (me?.role ?? null)
    const permissions = devMode ? permissionsFor(devRole) : (me?.permissions ?? [])
    const base = devMode ? DEV_USER : {}
    return {
      mode: devMode ? 'dev' : 'server',
      status: devMode ? 'ready' : remote.status,
      error: devMode ? null : remote.error,
      role,
      permissions,
      can: (permission) => permissions.includes(permission),
      user: {
        ...base,
        ...(hostUser || {}),
        ...(me ? { name: me.name, email: me.email } : {}),
        role: role ? ROLE_LABEL[role] || role : undefined,
      },
      setDevRole: devMode ? setDevRole : null,
      retry: devMode ? null : load,
    }
  }, [devMode, devRole, remote, hostUser, setDevRole, load])
}
