import { useState } from 'react'
import { resetDemoData } from '../data/submissions'
import { PERMISSIONS, PERMISSION_LABEL, ROLES, ROLE_BLURB, ROLE_LABEL, can } from '../lib/roles'

/**
 * Admin area — visible only to roles holding `admin.view`.
 *
 * It is deliberately small: the role/permission matrix (so everyone can see who may do
 * what), the current session, and a reset for the demo data. Hiding this page is
 * presentation only; any real admin ACTION must be refused by the backend too
 * (`require_permission("admin.view")` — see backend/app/routes/me.py).
 */
export default function AdminPage({ session }) {
  const [done, setDone] = useState(false)

  const reset = async () => {
    resetDemoData()
    setDone(true)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Admin
          </span>
          <h2 className="text-xl font-semibold text-slate-50">Admin area</h2>
        </div>
        <p className="text-slate-400 text-13 mt-1 max-w-2xl">
          Only roles with the “Admin area” permission see this page. The backend enforces the same rule on every admin
          action — hiding a page is not security.
        </p>
      </div>

      <section className="space-y-3" aria-label="Roles and permissions">
        <h3 className="text-sm font-semibold text-slate-100">Roles and permissions</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-13 border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-[11px] uppercase tracking-wide text-slate-400">
                <th className="text-left font-medium px-4 py-2.5">Role</th>
                <th className="text-left font-medium px-4 py-2.5">What it is for</th>
                {Object.keys(PERMISSIONS).map((p) => (
                  <th key={p} className="text-center font-medium px-4 py-2.5">
                    {PERMISSION_LABEL[p]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLES.map((r) => (
                <tr key={r} className={'border-t border-slate-800 ' + (r === session.role ? 'bg-blue-950/30' : '')}>
                  <td className="px-4 py-2.5 font-medium text-slate-100">
                    {ROLE_LABEL[r]}
                    {r === session.role && <span className="ml-2 text-[10px] text-blue-300">you</span>}
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">{ROLE_BLURB[r]}</td>
                  {Object.keys(PERMISSIONS).map((p) => (
                    <td key={p} className="px-4 py-2.5 text-center">
                      {can(r, p) ? (
                        <span className="text-emerald-400" title="Yes">
                          ✓
                        </span>
                      ) : (
                        <span className="text-slate-600" title="No">
                          —
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3" aria-label="Current session">
        <h3 className="text-sm font-semibold text-slate-100">Current session</h3>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-xl border border-slate-800 bg-slate-800/30 p-5 text-13">
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-slate-500">Role</dt>
            <dd className="text-slate-100 mt-0.5">{session.user.role}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-slate-500">User</dt>
            <dd className="text-slate-100 mt-0.5 break-all">{session.user.email}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-slate-500">Role comes from</dt>
            <dd className="text-slate-100 mt-0.5">
              {session.mode === 'dev' ? 'Dev role picker (local)' : 'Entra token via /api/me'}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-slate-500">Permissions</dt>
            <dd className="text-slate-100 mt-0.5">{session.permissions.length}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3" aria-label="Demo data">
        <h3 className="text-sm font-semibold text-slate-100">Demo data</h3>
        <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-5 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-13 text-slate-400 max-w-xl">
            Submissions and review actions in this example are stored in this browser. Reset them to start over.
          </p>
          <button
            onClick={reset}
            className="text-13 px-3 py-1.5 rounded-md border border-slate-600 text-slate-200 hover:bg-slate-800"
          >
            Reset demo data
          </button>
        </div>
        {done && (
          <div role="status" className="text-13 text-emerald-200 bg-emerald-500/10 border border-emerald-500/25 rounded px-3 py-2">
            Demo data reset. Open the Dashboard to see the original list.
          </div>
        )}
      </section>
    </div>
  )
}
