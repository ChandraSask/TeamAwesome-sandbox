import { useEffect, useState } from 'react'
import DevRolePanel from '../components/DevRolePanel'
import { loadSubmissions } from '../data/submissions'
import { LIFECYCLE, TERMINALS, progressOf, progressPct, statusLabel, statusMeta, teamChip } from '../lib/workflow'

/** Compact workflow progress strip (mirrors the dashboard). */
function DotStrip({ status }) {
  const terminal = TERMINALS.includes(status)
  const progress = progressOf(status)
  return (
    <div className="flex items-center gap-1">
      {LIFECYCLE.map((stage, i) => {
        const done = terminal ? false : i < progress
        const active = !terminal && i === progress
        const cls = terminal
          ? 'bg-slate-600'
          : done
            ? 'bg-emerald-400'
            : active
              ? 'bg-blue-400 ring-2 ring-blue-500/40 animate-pulse'
              : 'bg-slate-600'
        return <span key={stage} title={statusLabel(stage)} className={`w-1.5 h-1.5 rounded-full ${cls}`} />
      })}
    </div>
  )
}

function Tile({ onClick, hover, tint, title, text, icon }) {
  return (
    <button
      onClick={onClick}
      className={`group bg-slate-800 rounded-xl border border-slate-700 ${hover} transition-all p-6 flex flex-col items-center text-center`}
    >
      <div
        className={`w-14 h-14 rounded-xl ${tint.bg} flex items-center justify-center mb-4 ${tint.hoverBg} transition-colors`}
      >
        <svg className={`w-7 h-7 ${tint.fg}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          {icon}
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-50 mb-1.5">{title}</h3>
      <p className="text-slate-400 text-sm">{text}</p>
    </button>
  )
}

export default function HomePage({ navigate, session }) {
  const { user } = session
  const canCreate = session.can('submission.create')
  const [recent, setRecent] = useState([])

  useEffect(() => {
    let dead = false
    loadSubmissions().then((rows) => {
      if (!dead) setRecent(rows.slice(0, 6))
    })
    return () => {
      dead = true
    }
  }, [])

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 p-8 sm:p-10 mb-8">
        <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 text-xs font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Guided intake · capture once, route smart
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-50 tracking-tight">My App</h2>
          <p className="text-slate-300/80 mt-3 max-w-2xl leading-relaxed">
            Capture a new submission with guided fields and early location validation, watch it flow through the
            review teams, and track every request to a decision — all in one place.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-6">
            {canCreate && (
              <button
                onClick={() => navigate('/new')}
                className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold transition-all hover:-translate-y-0.5"
              >
                + Start a new submission
              </button>
            )}
            <button
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2.5 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-700 transition-all"
            >
              Open dashboard →
            </button>
            <span className="text-slate-500 text-sm ml-1">
              Signed in as <span className="text-slate-300">{user.name}</span>
              {user.role && (
                <span className="ml-2 px-2 py-0.5 rounded bg-amber-700/40 text-amber-300 text-xs">{user.role}</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* ── Developer mode: stand-in for Entra ID while you build (never in prod / NEXUS) ── */}
      {session.mode === 'dev' && <DevRolePanel role={session.role} onRole={session.setDevRole} />}

      {/* ── Two-column body: tiles (left) · live submissions (right) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-10 items-start">
        {/* LEFT column (spans 2/3): action tiles */}
        <div className="xl:col-span-2 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {canCreate && (
              <Tile
                onClick={() => navigate('/new')}
                hover="hover:border-amber-500"
                tint={{ bg: 'bg-amber-500/20', hoverBg: 'group-hover:bg-amber-500/30', fg: 'text-amber-400' }}
                title="New Submission"
                text="Start a guided submission. Per-section coaching and early location validation built in."
                icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />}
              />
            )}
            <Tile
              onClick={() => navigate('/dashboard')}
              hover="hover:border-blue-500"
              tint={{ bg: 'bg-blue-500/20', hoverBg: 'group-hover:bg-blue-500/30', fg: 'text-blue-400' }}
              title="Dashboard"
              text="Resume drafts, review what needs attention and track the status of every submission."
              icon={
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              }
            />
            <Tile
              onClick={() => navigate('/about')}
              hover="hover:border-emerald-500"
              tint={{ bg: 'bg-emerald-500/20', hoverBg: 'group-hover:bg-emerald-500/30', fg: 'text-emerald-400' }}
              title="About"
              text="What the app does, how a submission moves, statuses and roles."
              icon={
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              }
            />
            <Tile
              onClick={() => navigate('/about', { scrollTo: 'template' })}
              hover="hover:border-violet-500"
              tint={{ bg: 'bg-violet-500/20', hoverBg: 'group-hover:bg-violet-500/30', fg: 'text-violet-400' }}
              title="Template guide"
              text="How this remote plugs into the NEXUS host: auth, themes and the files to change."
              icon={
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              }
            />
          </div>
        </div>

        {/* RIGHT column: Live submissions panel */}
        <div className="xl:col-span-1">
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden xl:sticky xl:top-24">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-200">Live submissions</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <button onClick={() => navigate('/dashboard')} className="text-xs text-blue-300 hover:text-blue-200">
                View all →
              </button>
            </div>
            {recent.length > 0 ? (
              <div className="divide-y divide-slate-700/60 max-h-[520px] overflow-y-auto">
                {recent.map((it) => {
                  const chip = teamChip(it.team)
                  return (
                    <button
                      key={it.id}
                      onClick={() => navigate('/dashboard', { open: it.id })}
                      className="w-full text-left px-5 py-3 hover:bg-slate-700/40 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-sm text-slate-100 font-medium">{it.id}</code>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${statusMeta(it.status).cls}`}>
                          {statusLabel(it.status)}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${chip.cls}`}>{chip.label}</span>
                      </div>
                      <div className="text-xs text-slate-400 truncate mt-0.5">
                        {it.account} · {it.site}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <DotStrip status={it.status} />
                        <div className="flex-1 h-1 rounded-full bg-slate-700 overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${progressPct(it.status)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 w-8 text-right">{progressPct(it.status)}%</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="px-5 py-8 text-center text-sm text-slate-500">
                No submissions yet. Start a new submission to see it here.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
