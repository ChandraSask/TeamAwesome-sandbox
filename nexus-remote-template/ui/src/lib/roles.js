// Roles and permissions — the UI's MIRROR of backend/app/roles.py.
//
// The backend is the authority: it refuses what a role may not do. This table only
// decides what the UI SHOWS, and lets the app run offline with the dev role picker.
// When the app talks to a real backend, the permissions come from `GET /api/me`
// (see useSession) and this table is not consulted.
//
// To change the model, edit BOTH files. The Home page "Check with backend" button
// compares them and tells you when they have drifted.

/** Most privileged first (same order as the backend). */
export const ROLES = ['admin', 'role_1', 'role_2']

/** What the dev picker starts on: the LEAST privileged role, so a fresh checkout never feels like an admin. */
export const DEFAULT_ROLE = 'role_2'

export const ROLE_LABEL = {
  admin: 'Admin',
  role_1: 'Role 1',
  role_2: 'Role 2',
}

/** One line per role, shown in the role picker and on the About page. */
export const ROLE_BLURB = {
  admin: 'Everything: create, review, and the Admin area.',
  role_1: 'Create and review submissions.',
  role_2: 'Create submissions and follow their progress.',
}

/** Permission -> roles allowed. Mirrors PERMISSIONS in backend/app/roles.py. */
export const PERMISSIONS = {
  'submission.create': ['admin', 'role_1', 'role_2'],
  'submission.review': ['admin', 'role_1'],
  'admin.view': ['admin'],
}

export const PERMISSION_LABEL = {
  'submission.create': 'Create submissions',
  'submission.review': 'Review submissions',
  'admin.view': 'Admin area',
}

export function isRole(value) {
  return ROLES.includes(value)
}

/** Does `role` hold `permission` according to the local table? */
export function can(role, permission) {
  return (PERMISSIONS[permission] ?? []).includes(role)
}

/** The permissions a role holds, in table order. */
export function permissionsFor(role) {
  return Object.keys(PERMISSIONS).filter((p) => can(role, p))
}
