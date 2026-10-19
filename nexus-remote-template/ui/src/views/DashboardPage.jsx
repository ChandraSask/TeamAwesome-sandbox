import { useEffect, useMemo, useState } from 'react'
import Pager from '../components/Pager'
import { loadSubmissions, setSubmissionStatus } from '../data/submissions'
import {
  ALL_STATUSES,
  LIFECYCLE,
  NEEDS_ATTENTION,
  TERMINALS,
  fmtDate,
  money,
  progressOf,
  progressPct,
  statusLabel,
  statusMeta,
  teamChip,
} from '../lib/workflow'

const PAGE_SIZE = 10

/** Thin progress bar + status label, used inside the Status cell. */
function StatusProgress({ status }) {
  const terminal = TERMINALS.includes(status)
  const pct = progressPct(status)
  const barCls = terminal
    ? 'bg-slate-600'
    : status === 'Completed'
      ? 'bg-emerald-500'
      : status === 'More_Info'
        ? 'bg-amber-500'
        : status === 'Replied'
          ? 'bg-violet-500'
          : 'bg-blue-500'
  return (
    <div className="w-32" title={`Status: ${statusLabel(status)} · ${pct}%`}>
      <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
        <div className={'h-full rounded-full ' + barCls} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[10px] text-slate-400 mt-0.5">{terminal ? status.toLowerCase() : statusLabel(status)}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-13 text-slate-100 mt-0.5">{children}</div>
    </div>
  )
}

function Cap({ on, label }) {
  return (
    <span
      className={
        'px-2 py-1 rounded-md border ' +
        (on
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          : 'border-slate-700 text-slate-500 line-through')
      }
    >
      {on ? '✓' : '—'} {label}
    </span>
  )
}

/** Reviewer actions available from each status: [label, next status]. */
const REVIEW_ACTIONS = {
  Active: [['Start review', 'In_Review']],
  More_Info: [['Resume review', 'In_Review']],
  In_Review: [
    ['Mark replied', 'Replied'],
    ['Ask for more info', 'More_Info'],
  ],
}

export default function DashboardPage({ navigate, session, state }) {
  const { user } = session
  const canCreate = session.can('submission.create')
  const canReview = session.can('submission.review')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [myQueue, setMyQueue] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [teamFilter, setTeamFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)

  const justSubmitted = state?.justSubmitted ?? null

  useEffect(() => {
    let dead = false
    setLoading(true)
    loadSubmissions().then((r) => {
      if (dead) return
      setRows(r)
      setLoading(false)
      if (state?.open) setSelected(r.find((x) => x.id === state.open) ?? null)
    })
    return () => {
      dead = true
    }
  }, [state?.open])

  const counts = useMemo(() => {
    const c = {}
    rows.forEach((r) => {
      c[r.status] = (c[r.status] ?? 0) + 1
    })
    return c
  }, [rows])

  const myQueueCount = useMemo(() => rows.filter((r) => NEEDS_ATTENTION.includes(r.status)).length, [rows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (myQueue && !NEEDS_ATTENTION.includes(r.status)) return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (teamFilter !== 'all' && r.team !== teamFilter) return false
      if (dateFrom && r.createdAt.slice(0, 10) < dateFrom) return false
      if (dateTo && r.createdAt.slice(0, 10) > dateTo) return false
      if (!q) return true
      return [r.id, r.account, r.title, r.site, r.region, r.owner, r.category]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [rows, myQueue, statusFilter, teamFilter, dateFrom, dateTo, query])

  // A reviewer action. The UI only OFFERS it to roles with `submission.review`; the real
  // enforcement is the backend refusing the call for everyone else.
  const act = async (id, status) => {
    if (!canReview) return
    await setSubmissionStatus(id, status)
    const fresh = await loadSubmissions()
    setRows(fresh)
    setSelected(fresh.find((x) => x.id === id) ?? null)
  }

  // Any filter change goes back to page 1.
  useEffect(() => {
    setPage(1)
  }, [myQueue, statusFilter, teamFilter, dateFrom, dateTo, query])

  const total = filtered.length
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const roleLabel = user?.role || 'No role'

  return (
    <div className="space-y-6">
      {/* ── Just-submitted confirmation ───────────────────────────────── */}
      {justSubmitted && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 flex items-start gap-3">
          <span className="text-emerald-300 text-lg leading-none">✓</span>
          <div className="text-13 text-emerald-100">
            <div className="font-semibold">
              Submission <code className="text-emerald-200">{justSubmitted.id}</code>{' '}
              {justSubmitted.status === 'Draft' ? 'saved as a draft.' : 'submitted — status Active.'}
            </div>
            <div className="text-emerald-200/80 mt-0.5">
              {justSubmitted.status === 'Draft'
                ? 'Open it from the list below to keep working on it.'
                : `Routed to ${teamChip(justSubmitted.team).label}, which will pick it up from the worklist below.`}
            </div>
          </div>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              Workflow
            </span>
            <h2 className="text-xl font-semibold text-slate-50">Dashboard</h2>
            <span
              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 border border-slate-600 text-slate-200 font-semibold"
              title="Total submissions available in this dashboard"
            >
              {loading && rows.length === 0 ? 'Counting…' : `${rows.length.toLocaleString()} submissions`}
            </span>
          </div>
          <p className="text-slate-400 text-13 mt-1 max-w-2xl">
            The worklist across the full lifecycle and both review teams. Filter by status or team, search, and open a
            row for the details.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Acting as</span>
            <span className="text-13 px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-200 border border-amber-500/30 font-medium">
              {roleLabel}
            </span>
          </div>
          {canCreate && (
            <button
              onClick={() => navigate('/new')}
              className="text-13 px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
            >
              + New Submission
            </button>
          )}
        </div>
      </div>

      {/* Capability strip */}
      <div className="flex flex-wrap gap-2 text-[11px]">
        <Cap on label="Track / view all submissions" />
        <Cap on={canCreate} label="Create and save drafts" />
        <Cap on={canReview} label="Review and reply" />
        <Cap on={session.can('admin.view')} label="Admin area" />
      </div>

      {/* ── My queue vs. everything ────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setMyQueue(true)}
          className={
            'px-3 py-1.5 rounded-md border text-13 font-medium flex items-center gap-2 ' +
            (myQueue ? 'bg-blue-600 text-white border-blue-500' : 'border-slate-700 text-slate-300 hover:bg-slate-800')
          }
          title="Only submissions that need attention right now"
        >
          🎯 Needs attention
          <span
            className={
              'text-[10px] px-1.5 py-0.5 rounded-full ' + (myQueue ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300')
            }
          >
            {myQueueCount}
          </span>
        </button>
        <button
          onClick={() => setMyQueue(false)}
          className={
            'px-3 py-1.5 rounded-md border text-13 font-medium ' +
            (!myQueue ? 'bg-slate-700 text-slate-100 border-slate-600' : 'border-slate-700 text-slate-400 hover:bg-slate-800')
          }
          title="Show every submission regardless of who owns the next step"
        >
          Show all ({rows.length})
        </button>
        <span className="text-[11px] text-slate-500">
          {myQueue ? 'Filtered to what needs a next step.' : 'Showing every submission across the lifecycle.'}
        </span>
      </div>

      {/* ── Status count chips + team filter ───────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter((f) => (f === s ? 'all' : s))}
            className={
              'px-2.5 py-1 rounded-md border text-13 ' +
              (statusFilter === s ? statusMeta(s).cls : 'border-slate-700 text-slate-400 hover:bg-slate-800')
            }
          >
            {statusLabel(s)} · {(counts[s] ?? 0).toLocaleString()}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          {['all', 'A', 'B'].map((t) => (
            <button
              key={t}
              onClick={() => setTeamFilter(t)}
              className={
                'px-2.5 py-1 rounded-md border text-13 ' +
                (teamFilter === t
                  ? t === 'B'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : t === 'A'
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                      : 'bg-slate-700 text-slate-100 border-slate-600'
                  : 'border-slate-700 text-slate-400 hover:bg-slate-800')
              }
            >
              {t === 'all' ? 'All teams' : `Team ${t}`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Search + dates ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search #, account, request, site, owner…"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg text-13 text-slate-100 pl-9 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-400 placeholder:text-slate-500"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-sm px-1"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg text-13 text-slate-100 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-400"
          />
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg text-13 text-slate-100 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-400"
          />
        </label>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => {
              setDateFrom('')
              setDateTo('')
            }}
            className="text-[11px] text-slate-400 hover:text-slate-200 underline"
          >
            Clear dates
          </button>
        )}
        <span className="text-[11px] text-slate-500">
          {total.toLocaleString()} submission{total === 1 ? '' : 's'} match
          {total === 1 ? 'es' : ''}
          {query ? ` “${query}”` : ''} · showing {pageRows.length.toLocaleString()} on page {page.toLocaleString()} of{' '}
          {pages.toLocaleString()}
        </span>
      </div>

      {/* ── List ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 text-13">Loading dashboard…</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-slate-500 text-13">
          {myQueue
            ? 'Nothing needs attention right now — switch to “Show all” to browse every submission.'
            : query
              ? `No submissions match “${query}”.`
              : 'No submissions match the current filters.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full text-13 border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-[11px] uppercase tracking-wide text-slate-400">
                {['Submission #', 'Submitted', 'Status', 'Region', 'Site', 'Owner', 'Account', 'Request', 'Category', 'Team'].map(
                  (h) => (
                    <th key={h} className="text-left font-medium px-3 py-2.5 whitespace-nowrap">
                      {h}
                    </th>
                  ),
                )}
                <th className="text-right font-medium px-3 py-2.5 whitespace-nowrap">Amount</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, idx) => {
                const chip = teamChip(r.team)
                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className={
                      'cursor-pointer border-t border-slate-800 hover:bg-slate-800/60 transition ' +
                      (idx % 2 ? 'bg-slate-900/40' : 'bg-slate-900/10')
                    }
                  >
                    <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px] text-slate-300">
                      <div className="flex items-center gap-1.5">
                        {r.id}
                        {r.needsReply && (
                          <span title="A reviewer is waiting for a reply" className="text-amber-300">
                            💬
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-400">{fmtDate(r.createdAt)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <StatusProgress status={r.status} />
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-400">{r.region}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-400">{r.site}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-300">{r.owner}</td>
                    <td className="px-3 py-2.5 text-slate-100 font-medium max-w-[220px] truncate" title={r.account}>
                      {r.account}
                    </td>
                    <td className="px-3 py-2.5 text-slate-300 max-w-[200px] truncate" title={r.title}>
                      {r.title}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-400">{r.category}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={'text-[10px] px-1.5 py-0.5 rounded border ' + chip.cls}>{chip.label}</span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right">
                      {r.amount != null ? (
                        <span className="text-emerald-300">{money(r.amount)}</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={page} pages={pages} total={total} pageSize={PAGE_SIZE} onPage={setPage} disabled={loading} />

      {/* ── Detail drawer ──────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end" onClick={() => setSelected(null)}>
          <div
            role="dialog"
            aria-label={`Submission ${selected.id}`}
            className="w-full max-w-xl h-full bg-slate-900 border-l border-slate-700 shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-700 px-5 py-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-slate-50">{selected.title}</div>
                <div className="text-[11px] text-slate-500">{selected.id}</div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-slate-400 hover:text-slate-200 text-lg leading-none px-2"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <Field label="Status">
                  <span className={'text-[10px] px-1.5 py-0.5 rounded border ' + statusMeta(selected.status).cls}>
                    {statusLabel(selected.status)}
                  </span>
                </Field>
                <Field label="Team">
                  <span className={'text-[10px] px-1.5 py-0.5 rounded border ' + teamChip(selected.team).cls}>
                    {teamChip(selected.team).label}
                  </span>
                </Field>
                <Field label="Submitted">{fmtDate(selected.createdAt)}</Field>
                <Field label="Owner">{selected.owner}</Field>
                <Field label="Account">{selected.account}</Field>
                <Field label="Category">{selected.category}</Field>
                <Field label="Site">{selected.site}</Field>
                <Field label="Region">{selected.region}</Field>
                <Field label="Amount">{money(selected.amount)}</Field>
              </div>

              {/* Review actions — only for roles that hold `submission.review` */}
              {REVIEW_ACTIONS[selected.status] && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">Review</div>
                  {canReview ? (
                    <div className="flex flex-wrap gap-2">
                      {REVIEW_ACTIONS[selected.status].map(([label, next]) => (
                        <button
                          key={next}
                          onClick={() => act(selected.id, next)}
                          className="text-13 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] text-slate-500">
                      Your role can follow this submission but not review it. Ask a reviewer.
                    </p>
                  )}
                </div>
              )}

              {/* Lifecycle progress */}
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">Progress</div>
                <ol className="space-y-2">
                  {LIFECYCLE.map((s, i) => {
                    const terminal = TERMINALS.includes(selected.status)
                    const reached = !terminal && i <= progressOf(selected.status)
                    const current = !terminal && i === progressOf(selected.status)
                    return (
                      <li key={s} className="flex items-center gap-2 text-13">
                        <span
                          className={
                            'w-4 h-4 rounded-full grid place-items-center text-[9px] ' +
                            (reached ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-500')
                          }
                        >
                          {reached ? '✓' : ''}
                        </span>
                        <span className={current ? 'text-slate-50 font-medium' : reached ? 'text-slate-300' : 'text-slate-500'}>
                          {statusLabel(s)}
                        </span>
                        {current && <span className="text-[10px] text-blue-300">current</span>}
                      </li>
                    )
                  })}
                  {TERMINALS.includes(selected.status) && (
                    <li className="flex items-center gap-2 text-13 text-slate-400">
                      <span className="w-4 h-4 rounded-full bg-slate-600" />
                      Ended: {statusLabel(selected.status)}
                    </li>
                  )}
                </ol>
              </div>

              {/* Answers captured by the New Submission form */}
              {selected.answers && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">Captured answers</div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                    {Object.entries(selected.answers)
                      .filter(([, v]) => String(v ?? '').trim() !== '')
                      .map(([k, v]) => (
                        <div key={k}>
                          <dt className="text-[10px] uppercase tracking-wide text-slate-500">{k.replace(/_/g, ' ')}</dt>
                          <dd className="text-slate-200 break-words">{String(v)}</dd>
                        </div>
                      ))}
                  </dl>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
