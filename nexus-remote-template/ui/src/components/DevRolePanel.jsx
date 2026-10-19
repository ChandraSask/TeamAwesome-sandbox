import { useState } from 'react'
import { API_BASE, callApi } from '../lib/callApi'
import { PERMISSIONS, PERMISSION_LABEL, ROLES, ROLE_BLURB, ROLE_LABEL, permissionsFor } from '../lib/roles'

/**
 * Developer-mode role picker (Home page).
 *
 * Stands in for Entra ID while you build: pick a role, and the whole app behaves as
 * that role. "Check with backend" sends the same identity to the local API and shows
 * what IT thinks — which is also how you notice that the UI's permission table
 * (lib/roles.js) and the backend's (backend/app/roles.py) have drifted apart.
 *
 * Rendered only in dev mode (see lib/devAuth.js): never in production, never embedded.
 */

const sameSet = (a, b) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|')

function explain(err) {
  if (err?.code === 'API_ERROR') {
    return `The backend answered ${err.status}. Is it running with APP_ENV=local? (./scripts/run-backend.sh does that.)`
  }
  if (err?.code === 'UNAUTHORIZED') {
    return 'The backend refused the request (401). It only trusts the role picker when started with APP_ENV=local — use ./scripts/run-backend.sh.'
  }
  if (err?.code === 'CONFIG') return err.message
  return `Could not reach the backend at ${API_BASE || '(API_BASE is empty)'}. Start it with ./scripts/run-backend.sh.`
}

export default function DevRolePanel({ role, onRole }) {
  const [check, setCheck] = useState(null) // null | { state: 'busy' } | { state: 'ok', me } | { state: 'fail', message }

  const verify = async () => {
    setCheck({ state: 'busy' })
    try {
      setCheck({ state: 'ok', me: await callApi('/api/me') })
    } catch (err) {
      setCheck({ state: 'fail', message: explain(err) })
    }
  }

  const mine = permissionsFor(role)

  return (
    <section
      aria-label="Developer mode"
      className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-5 mb-8"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Developer mode
            </span>
            <h3 className="text-sm font-semibold text-slate-100">Act as a role</h3>
          </div>
          <p className="text-[12px] text-slate-400 mt-1.5 max-w-xl leading-relaxed">
            Entra ID is not needed to build. Pick a role and the whole app behaves as that role. Inside NEXUS this panel
            disappears and the role comes from the user’s Entra group instead.
          </p>
        </div>

        <label className="block min-w-[220px]">
          <span className="block text-[11px] text-slate-400 mb-1">Act as</span>
          <select
            value={role}
            onChange={(e) => onRole(e.target.value)}
            aria-label="Act as role"
            className="w-full bg-slate-900 border border-slate-600 rounded-md text-13 text-slate-100 px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-[12px] text-slate-300 mt-3">
        <span className="font-medium text-slate-100">{ROLE_LABEL[role]}</span> — {ROLE_BLURB[role]}
      </p>

      <ul className="flex flex-wrap gap-2 mt-3 text-[11px]" aria-label="Permissions of this role">
        {Object.keys(PERMISSIONS).map((p) => {
          const on = mine.includes(p)
          return (
            <li
              key={p}
              className={
                'px-2 py-1 rounded-md border ' +
                (on
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-slate-700 text-slate-500 line-through')
              }
            >
              {on ? '✓' : '—'} {PERMISSION_LABEL[p]}
            </li>
          )
        })}
      </ul>

      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={verify}
          disabled={check?.state === 'busy'}
          className="text-13 px-3 py-1.5 rounded-md border border-slate-600 text-slate-200 hover:bg-slate-800 disabled:opacity-50"
        >
          {check?.state === 'busy' ? 'Checking…' : 'Check with backend'}
        </button>
        <span className="text-[11px] text-slate-500">
          Sends this role to the local API ({API_BASE || 'no API_BASE'}) and shows what it sees.
        </span>
      </div>

      {check?.state === 'ok' && (
        <div
          role="status"
          className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-100"
        >
          <div>
            ✓ Backend sees <code className="text-emerald-200">{check.me.role}</code> as{' '}
            <code className="text-emerald-200">{check.me.email}</code> · source{' '}
            <code className="text-emerald-200">{check.me.source}</code>
          </div>
          {sameSet(check.me.permissions, mine) ? (
            <div className="text-emerald-200/80 mt-0.5">The UI and backend permission tables agree.</div>
          ) : (
            <div className="text-amber-200 mt-0.5">
              ⚠ The tables differ. Backend grants [{check.me.permissions.join(', ') || 'nothing'}], the UI table says [
              {mine.join(', ') || 'nothing'}]. Update lib/roles.js or backend/app/roles.py so they match.
            </div>
          )}
        </div>
      )}
      {check?.state === 'fail' && (
        <div role="alert" className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200">
          {check.message}
        </div>
      )}
    </section>
  )
}
