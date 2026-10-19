// Local "pretend to be somebody" auth, for developing BEFORE Entra ID is set up.
//
// WHAT IT IS
//   A role you pick from a drop-down on the Home page. The UI sends it to the backend
//   as X-Dev-Role / X-Dev-User headers, and the backend honours them ONLY when it is
//   running with APP_ENV=local (see backend/app/roles.py).
//
// WHY IT IS SAFE
//   1. It only exists in a development build: DEV_AUTH is baked in at build time and
//      defaults to OFF for `npm run build`. (ui/webpack.config.js)
//   2. It is never active inside the NEXUS host — `isEmbedded()` wins. Embedded, the
//      role always comes from the real token via GET /api/me.
//   3. The BACKEND is the gate: a deployed backend ignores these headers and refuses
//      to start with them enabled. Nothing the browser does can grant a role.
import { isEmbedded } from './isEmbedded'
import { DEFAULT_ROLE, isRole } from './roles'

/** Baked in by webpack's DefinePlugin: true for `npm run dev`, false for a production build. */
export const DEV_AUTH = process.env.DEV_AUTH === 'true'

export const DEV_ROLE_KEY = 'nx-dev-role'
export const DEV_USER = { name: 'Local Developer', email: 'dev@example.com' }

/** True when the dev role picker should exist and callApi should send dev headers. */
export function devAuthActive() {
  return DEV_AUTH && !isEmbedded()
}

export function readDevRole(storage) {
  try {
    const s = storage === undefined ? (typeof localStorage === 'undefined' ? null : localStorage) : storage
    const v = s ? s.getItem(DEV_ROLE_KEY) : null
    return isRole(v) ? v : DEFAULT_ROLE
  } catch {
    return DEFAULT_ROLE
  }
}

export function writeDevRole(role, storage) {
  try {
    const s = storage === undefined ? (typeof localStorage === 'undefined' ? null : localStorage) : storage
    if (s && isRole(role)) s.setItem(DEV_ROLE_KEY, role)
  } catch {
    /* storage can be blocked in a sandboxed host — never break the UI */
  }
}

/** Headers that make the local backend treat this request as `role`. */
export function devAuthHeaders(role = readDevRole()) {
  return { 'X-Dev-Role': role, 'X-Dev-User': DEV_USER.email }
}
