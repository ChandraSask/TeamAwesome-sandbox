// Status model shared by the Home, Dashboard and detail views.
//
// Replace these with your own domain statuses. Every colour class here is a
// plain Tailwind utility that the active theme (natural / dark) re-maps, so
// you never hard-code a palette in a component.

/** The happy path, in order. */
export const LIFECYCLE = ['Draft', 'Active', 'In_Review', 'Replied', 'Completed']

/** Terminal states that end a submission without completing it. */
export const TERMINALS = ['Cancelled', 'Rejected', 'Expired']

/** All statuses in the order the Dashboard shows its count chips. */
export const ALL_STATUSES = [
  'Draft',
  'Active',
  'More_Info',
  'In_Review',
  'Replied',
  'Completed',
  'Expired',
  'Cancelled',
  'Rejected',
]

export const STATUS_META = {
  Draft: { cls: 'bg-slate-500/15 text-slate-300 border-slate-500/30', dot: 'bg-slate-400' },
  Active: { cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30', dot: 'bg-blue-400' },
  More_Info: { cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30', dot: 'bg-amber-400' },
  In_Review: { cls: 'bg-teal-500/15 text-teal-300 border-teal-500/30', dot: 'bg-teal-400' },
  Replied: { cls: 'bg-violet-500/15 text-violet-300 border-violet-500/30', dot: 'bg-violet-400' },
  Completed: { cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-400' },
  Cancelled: { cls: 'bg-slate-600/20 text-slate-400 border-slate-600/40', dot: 'bg-slate-500' },
  Rejected: { cls: 'bg-red-500/15 text-red-300 border-red-500/30', dot: 'bg-red-400' },
  Expired: { cls: 'bg-slate-600/20 text-slate-400 border-slate-600/40', dot: 'bg-slate-500' },
}

export function statusMeta(status) {
  return STATUS_META[status] ?? STATUS_META.Draft
}

export function statusLabel(status) {
  return String(status).replace('_', ' ')
}

/** Statuses where somebody still owes the submission an action. */
export const NEEDS_ATTENTION = ['Active', 'More_Info', 'In_Review']

/** Number of lifecycle steps completed (0-based index of the current step). */
export function progressOf(status) {
  if (TERMINALS.includes(status)) return LIFECYCLE.length
  if (status === 'More_Info') return 1 // sits at "Active"
  return Math.max(0, LIFECYCLE.indexOf(status))
}

export function progressPct(status) {
  if (TERMINALS.includes(status)) return 100
  return Math.round(((progressOf(status) + 1) / LIFECYCLE.length) * 100)
}

/** Team chip used by the Dashboard and Home lists. */
export function teamChip(team) {
  if (team === 'A') return { label: 'Team A', cls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' }
  if (team === 'B') return { label: 'Team B', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
  return { label: 'unassigned', cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30' }
}

export function money(n) {
  if (n == null) return '—'
  return n.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })
}

export function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: '2-digit' })
}
