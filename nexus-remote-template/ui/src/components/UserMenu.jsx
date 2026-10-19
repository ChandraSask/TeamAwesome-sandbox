import { useEffect, useRef, useState } from 'react'
import { loadSubmissions } from '../data/submissions'
import { NEEDS_ATTENTION, statusLabel } from '../lib/workflow'

function initialsOf(user) {
  const src = user?.name || user?.email || 'U'
  return (
    src
      .split(/[.\s@]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join('') || 'U'
  )
}

/**
 * Clickable avatar → dropdown with identity + a live "Pending jobs" list.
 * `user` is the object the NEXUS host passes as a prop (name, email, role, title).
 */
export default function UserMenu({ user, navigate }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(null)
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  // Fetch pending jobs each time the menu opens
  useEffect(() => {
    if (!open) return
    let dead = false
    loadSubmissions().then((rows) => {
      if (!dead) setPending(rows.filter((r) => NEEDS_ATTENTION.includes(r.status)))
    })
    return () => {
      dead = true
    }
  }, [open])

  const name = user?.name || user?.email || 'Signed-in user'
  const email = user?.email || '—'
  const role = user?.role || 'Member'
  const team = (user?.title || '').trim()

  return (
    <div className="relative ml-2" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-[11px] font-semibold text-slate-200 hover:border-blue-500 transition"
        title={name}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {initialsOf(user)}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Identity */}
          <div className="p-4 border-b border-slate-700">
            <div className="text-slate-50 font-semibold truncate">{name}</div>
            <div className="text-xs text-slate-400 truncate">{email}</div>
            <div className="flex gap-2 mt-2">
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-900/40 text-blue-300">{role}</span>
              {team && <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300">{team}</span>}
            </div>
          </div>

          {/* Pending jobs */}
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wide text-slate-500">Pending jobs</span>
              {pending && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300">
                  {pending.length}
                </span>
              )}
            </div>

            {pending === null ? (
              <div className="text-slate-500 text-sm py-2">Loading…</div>
            ) : pending.length === 0 ? (
              <div className="text-slate-500 text-sm py-2">Nothing pending — you're all caught up.</div>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {pending.slice(0, 6).map((j) => (
                  <button
                    key={j.id}
                    onClick={() => {
                      setOpen(false)
                      navigate('/dashboard', { open: j.id })
                    }}
                    className="w-full text-left rounded-lg bg-slate-900 border border-slate-700 hover:border-blue-500/60 px-3 py-2 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-slate-400">{j.id}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                        {statusLabel(j.status)}
                      </span>
                    </div>
                    <div className="text-sm text-slate-100 truncate">{j.title}</div>
                  </button>
                ))}
                {pending.length > 6 && (
                  <button
                    onClick={() => {
                      setOpen(false)
                      navigate('/dashboard')
                    }}
                    className="w-full text-center text-xs text-blue-300 hover:text-blue-200 py-1"
                  >
                    +{pending.length - 6} more → open dashboard
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="p-2 border-t border-slate-700">
            <button
              onClick={() => {
                setOpen(false)
                navigate('/dashboard')
              }}
              className="w-full text-center text-sm text-slate-300 hover:text-slate-100 py-1.5 rounded hover:bg-slate-700"
            >
              Open dashboard →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
