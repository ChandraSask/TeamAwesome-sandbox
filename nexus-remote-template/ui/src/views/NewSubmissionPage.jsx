import { useMemo, useState } from 'react'
import { createSubmission, teamForCategory } from '../data/submissions'
import { teamChip } from '../lib/workflow'

/**
 * New Submission — a guided, multi-step form.
 *
 * Shape (kept deliberately close to a real intake flow):
 *   • a journey stepper that always shows the whole path
 *   • per-field help, required markers and "who fills this" chips
 *   • conditional fields (Urban ↔ Rural location)
 *   • early location validation that blocks the step until it passes
 *   • a rule-based "quick check" per step (swap for an AI service if you have one)
 *   • a review step, then Submit or Save draft
 *
 * Field definitions are plain data (STEPS below) — edit them to change the form.
 */

const PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']
const TODAY = new Date().toISOString().slice(0, 10)

/** fill: "green" = filled by the app from your sign-in · "purple" = the requester fills it. */
const STEPS = [
  {
    key: 'requester',
    title: 'Requester',
    tip: 'Name and email come from your sign-in. Add a number where the reviewing team can reach you quickly.',
    fields: [
      { id: 'requester_name', label: 'Requester name', req: true, fill: 'green', help: 'The person raising this request. Reviewers contact them first.' },
      { id: 'requester_email', label: 'Requester email', req: true, fill: 'green', kind: 'email', help: 'Status updates and clarification requests are sent here.' },
      { id: 'employee_id', label: 'Employee ID', req: true, fill: 'purple', placeholder: 'e.g. JDOE1', help: 'Your user ID. It is used to track the submission and notify you.' },
      { id: 'requester_phone', label: 'Phone & extension', req: true, fill: 'purple', kind: 'phone', placeholder: '306-555-0100 x123', help: 'So a reviewer can reach you without email.' },
      { id: 'backup_name', label: 'Backup contact name', fill: 'purple', help: 'Optional. A second person who can answer questions.' },
      { id: 'backup_phone', label: 'Backup contact phone', fill: 'purple', kind: 'phone' },
    ],
  },
  {
    key: 'account',
    title: 'Account',
    tip: 'Use the main billing address here. The place the work happens is captured separately in the Location step.',
    fields: [
      { id: 'account_name', label: 'Account name', req: true, placeholder: 'Business name', help: 'The account this work is for.' },
      { id: 'account_number', label: 'Account number', placeholder: 'e.g. A-104522', help: 'Leave blank for a brand-new account.' },
      { id: 'address', label: 'Billing address', req: true, span: 2 },
      { id: 'city', label: 'City', req: true },
      { id: 'province', label: 'Province', req: true, type: 'select', options: PROVINCES },
      { id: 'postal_code', label: 'Postal code', placeholder: 'A1A 1A1' },
      { id: 'contact_name', label: 'Contact name', req: true },
      { id: 'contact_email', label: 'Contact email', kind: 'email' },
      { id: 'may_contact', label: 'Reviewers may contact them', req: true, type: 'select', options: ['Yes', 'No'], help: 'Choose No if all questions must go through the requester.' },
    ],
  },
  {
    key: 'general',
    title: 'General',
    tip: 'Expedited and Custom requests are routed to Team B; Standard and Renewal go to Team A.',
    fields: [
      { id: 'category', label: 'Category', req: true, type: 'select', options: ['Standard', 'Expedited', 'Custom', 'Renewal'], help: 'Drives which team receives the submission.' },
      { id: 'priority', label: 'Priority', req: true, type: 'select', options: ['Low', 'Normal', 'High', 'Urgent'] },
      { id: 'requested_date', label: 'Requested date', req: true, type: 'date', help: 'When the work is needed by. It cannot be in the past.' },
      { id: 'reference_type', label: 'Reference type', type: 'select', options: ['Purchase order', 'Project', 'Ticket'], help: 'Optional. Pair it with a reference ID.' },
      { id: 'reference_id', label: 'Reference ID', placeholder: 'e.g. PO-88121' },
      { id: 'related_submission', label: 'Related submission #', placeholder: 'e.g. SUB-000104', help: 'Link an earlier or expired submission for the same work.' },
    ],
  },
  {
    key: 'location',
    title: 'Location',
    tip: 'Validate the location before you continue — an address can be valid but wrong for the work. Editing it clears the result.',
    fields: [
      { id: 'onsite_name', label: 'Onsite name', req: true, placeholder: 'e.g. Riverside Depot' },
      { id: 'community', label: 'Community', req: true },
      { id: 'street_address', label: 'Street address', req: true, span: 2, when: (v) => v.location_type !== 'Rural', placeholder: '123 Main St' },
      { id: 'land_location', label: 'Land location', req: true, when: (v) => v.location_type === 'Rural', placeholder: 'e.g. NE23-12-5-W2', help: 'Legal land description: quarter-section, township, range, meridian.' },
      { id: 'road_name', label: 'Road name', req: true, when: (v) => v.location_type === 'Rural' },
      { id: 'rm_number', label: 'RM number', when: (v) => v.location_type === 'Rural' },
      { id: 'onsite_contact', label: 'Onsite contact', fill: 'purple' },
      { id: 'onsite_phone', label: 'Onsite phone', kind: 'phone', fill: 'purple' },
    ],
  },
  {
    key: 'request',
    title: 'Request',
    tip: 'Be specific: reviewers send vague requests back for clarification, which slows everyone down.',
    fields: [
      { id: 'title', label: 'Title', req: true, span: 2, placeholder: 'A short summary' },
      { id: 'description', label: 'Description', req: true, span: 2, type: 'textarea', help: 'What is needed, why, and any constraints.' },
      { id: 'quantity', label: 'Quantity', req: true, type: 'number', placeholder: '1' },
      { id: 'term', label: 'Contract term', type: 'select', options: ['None', '1 year', '3 years', '5 years'] },
      { id: 'ownership', label: 'Own / Lease', req: true, type: 'select', options: ['Own', 'Lease'] },
      { id: 'notes', label: 'Notes', span: 2, type: 'textarea' },
    ],
  },
]

const REVIEW_INDEX = STEPS.length // 0-based index of the review step
const JOURNEY = [...STEPS.map((s) => s.title), 'Review']
const LOCATION_FIELDS = ['location_type', 'street_address', 'land_location', 'road_name', 'community', 'rm_number']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^\+?[0-9 ()-]{7,}(\s?(x|ext\.?)\s?\d+)?$/i

const visible = (f, v) => !f.when || f.when(v)
const blank = (x) => String(x ?? '').trim() === ''

function missingFor(step, v, locOk) {
  const out = step.fields.filter((f) => visible(f, v) && f.req && blank(v[f.id])).map((f) => f.id)
  if (step.key === 'location' && !locOk) out.push('location_validated')
  return out
}

/** Rule-based advisory checks. Returns [{ level: 'warn' | 'ok', label, note }]. */
function quickCheck(stepIdx, v, locOk) {
  const out = []
  const stepsToCheck = stepIdx === REVIEW_INDEX ? STEPS : [STEPS[stepIdx]]
  stepsToCheck.forEach((step) => {
    step.fields.filter((f) => visible(f, v)).forEach((f) => {
      const val = String(v[f.id] ?? '').trim()
      if (f.req && !val) out.push({ level: 'warn', label: f.label, note: 'Required — still empty.' })
      if (val && f.kind === 'email' && !EMAIL_RE.test(val)) out.push({ level: 'warn', label: f.label, note: 'This does not look like an email address.' })
      if (val && f.kind === 'phone' && !PHONE_RE.test(val)) out.push({ level: 'warn', label: f.label, note: 'Use digits with an optional extension, e.g. 306-555-0100 x123.' })
    })
    if (step.key === 'location' && !locOk) out.push({ level: 'warn', label: 'Location', note: 'Not validated yet — press “Validate now”.' })
  })
  if (v.requested_date && v.requested_date < TODAY) out.push({ level: 'warn', label: 'Requested date', note: 'The date is in the past.' })
  if (!blank(v.reference_type) !== !blank(v.reference_id)) out.push({ level: 'warn', label: 'Reference', note: 'Fill in both the reference type and ID, or neither.' })
  if (!blank(v.description) && v.description.trim().length < 20) out.push({ level: 'warn', label: 'Description', note: 'Add more detail — short descriptions are often sent back for clarification.' })
  if (out.length === 0) out.push({ level: 'ok', label: 'Looks good', note: 'No issues found in this section.' })
  return out
}

/** Deterministic stand-in for a geocoder: complete fields validate, with a stable score. */
function validateLocation(v) {
  const rural = v.location_type === 'Rural'
  const key = rural ? [v.land_location, v.road_name, v.community] : [v.street_address, v.community]
  if (key.some(blank)) return { ok: false, message: 'Fill in every location field first.' }
  const text = key.join('|')
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 997
  const confidence = 82 + (h % 17)
  return { ok: true, confidence, message: `Located “${key[0]}, ${v.community}”.` }
}

/* ── Form primitives ───────────────────────────────────────────────────── */

const inputCls =
  'w-full bg-slate-900 border border-slate-600 rounded-md text-13 text-slate-100 px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50'

function F({ label, req, miss, fill, help, span, children }) {
  const fillBox =
    fill === 'green'
      ? 'ring-1 ring-emerald-500/50 bg-emerald-500/10 rounded-md p-1'
      : fill === 'purple'
        ? 'ring-1 ring-purple-500/50 bg-purple-500/10 rounded-md p-1'
        : ''
  return (
    <label className={'block ' + (span === 2 ? 'sm:col-span-2' : '')}>
      <span className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
        <span>
          {label} {req && <span className={miss ? 'text-red-400' : 'text-slate-500'}>*</span>}
        </span>
        {help && (
          <span className="relative inline-flex group/help align-middle">
            <span
              tabIndex={0}
              role="button"
              aria-label={help}
              className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full text-[9px] font-bold bg-slate-700 text-slate-300 border border-slate-600 cursor-help select-none hover:bg-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-400"
            >
              ?
            </span>
            <span
              role="tooltip"
              className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 w-64 -translate-x-1/2 rounded-md border border-slate-600 bg-slate-900 px-2.5 py-1.5 text-[11px] font-normal leading-snug text-slate-200 shadow-xl opacity-0 invisible transition-opacity duration-100 group-hover/help:opacity-100 group-hover/help:visible group-focus-within/help:opacity-100 group-focus-within/help:visible"
            >
              {help}
            </span>
          </span>
        )}
        {fill === 'green' && (
          <span
            title="Filled in by the app from your sign-in."
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 whitespace-nowrap"
          >
            ✓ App-filled
          </span>
        )}
        {fill === 'purple' && (
          <span
            title="The requester fills this in."
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30 whitespace-nowrap"
          >
            ✎ You fill
          </span>
        )}
      </span>
      <div className={(miss ? 'ring-1 ring-red-500/50 rounded-md ' : '') + fillBox}>{children}</div>
    </label>
  )
}

function Control({ f, value, onChange }) {
  if (f.type === 'select') {
    return (
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        <option value="">Select…</option>
        {f.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    )
  }
  if (f.type === 'textarea') {
    return (
      <textarea
        rows={3}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={f.placeholder}
        className={inputCls}
      />
    )
  }
  return (
    <input
      type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
      min={f.type === 'date' ? TODAY : f.type === 'number' ? 1 : undefined}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={f.placeholder}
      className={inputCls}
    />
  )
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function NewSubmissionPage({ navigate, user }) {
  const [values, setValues] = useState(() => ({
    requester_name: user?.name ?? '',
    requester_email: user?.email ?? '',
    location_type: 'Urban',
    province: 'SK',
    category: 'Standard',
    priority: 'Normal',
    may_contact: 'Yes',
  }))
  const [step, setStep] = useState(0)
  const [furthest, setFurthest] = useState(0)
  const [showMissing, setShowMissing] = useState(false)
  const [loc, setLoc] = useState(null)
  const [check, setCheck] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (id, v) => {
    setValues((prev) => ({ ...prev, [id]: v }))
    setCheck(null)
    if (LOCATION_FIELDS.includes(id)) setLoc(null) // a stale validation must never pass
  }

  const locOk = !!loc?.ok
  const current = STEPS[step]
  const missing = useMemo(
    () => (current ? missingFor(current, values, locOk) : []),
    [current, values, locOk],
  )
  const allMissing = useMemo(
    () => STEPS.flatMap((s, i) => missingFor(s, values, locOk).map((id) => ({ id, step: i }))),
    [values, locOk],
  )
  const team = teamChip(teamForCategory(values.category))

  const go = (i) => {
    setStep(i)
    setFurthest((f) => Math.max(f, i))
    setShowMissing(false)
    setCheck(null)
    setError('')
  }

  const next = () => {
    if (missing.length > 0) {
      setShowMissing(true)
      setError(
        missing.includes('location_validated') && missing.length === 1
          ? 'Validate the location before continuing.'
          : 'Fill in the highlighted required fields to continue.',
      )
      return
    }
    go(step + 1)
  }

  const submit = async (asDraft) => {
    if (!asDraft && allMissing.length > 0) {
      setError('Some required fields are still empty — use the review list to jump to them.')
      return
    }
    setBusy(true)
    try {
      const sub = await createSubmission(values, { asDraft, owner: user?.name || 'You' })
      navigate('/dashboard', { justSubmitted: sub })
    } catch {
      setError('Could not save the submission. Please try again.')
      setBusy(false)
    }
  }

  const doValidate = () => {
    const r = validateLocation(values)
    setLoc(r)
    setError('')
  }

  const reviewing = step === REVIEW_INDEX

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-cyan-500/15 text-cyan-300 border-cyan-500/30">
              New Submission
            </span>
            <h2 className="text-xl font-semibold text-slate-50">New submission</h2>
          </div>
          <p className="text-slate-400 text-13 mt-1 max-w-2xl">
            A guided form with five sections and a review. Each section is checked on the way through, and the
            submission is routed to{' '}
            <span className={team.label === 'Team B' ? 'text-amber-300' : 'text-cyan-300'}>{team.label}</span> based
            on its category.
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-13 px-3 py-1.5 rounded-md border border-slate-600 text-slate-200 hover:bg-slate-800"
        >
          ← Dashboard
        </button>
      </div>

      {/* Journey stepper */}
      <div className="flex items-center gap-1 flex-wrap">
        {JOURNEY.map((label, idx) => {
          const active = idx === step
          const done = idx < step
          const reachable = idx <= furthest
          return (
            <button
              key={label}
              type="button"
              disabled={!reachable}
              onClick={() => go(idx)}
              aria-current={active ? 'step' : undefined}
              className={
                'px-3 py-1.5 rounded-md text-13 flex items-center gap-1.5 select-none ' +
                (active
                  ? 'bg-slate-800 text-slate-100 border border-slate-600'
                  : reachable
                    ? 'text-slate-300 border border-transparent hover:bg-slate-800'
                    : 'text-slate-600 border border-transparent cursor-default')
              }
            >
              <span
                className={
                  'text-[10px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center ' +
                  (done ? 'bg-emerald-600/70 text-white' : 'bg-slate-700')
                }
              >
                {done ? '✓' : idx + 1}
              </span>
              {label}
            </button>
          )
        })}
      </div>

      {error && (
        <div className="text-13 text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded px-3 py-2" role="alert">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── Form / review ── */}
        <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700 rounded-xl p-5 space-y-4">
          {!reviewing && (
            <>
              <div>
                <h3 className="text-lg font-semibold text-slate-50">
                  {step + 1}. {current.title}
                </h3>
                <p className="text-13 text-slate-400 mt-0.5">{current.tip}</p>
              </div>

              {/* Urban ↔ Rural switch */}
              {current.key === 'location' && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Location type</span>
                  <div role="radiogroup" aria-label="Location type" className="inline-flex rounded-md border border-slate-600 overflow-hidden">
                    {['Urban', 'Rural'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        role="radio"
                        aria-checked={values.location_type === t}
                        onClick={() => set('location_type', t)}
                        className={
                          'px-3 py-1.5 text-13 ' +
                          (values.location_type === t
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-900 text-slate-300 hover:bg-slate-800')
                        }
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                {current.fields
                  .filter((f) => visible(f, values))
                  .map((f) => (
                    <F
                      key={f.id}
                      label={f.label}
                      req={f.req}
                      miss={showMissing && missing.includes(f.id)}
                      fill={f.fill}
                      help={f.help}
                      span={f.span}
                    >
                      <Control f={f} value={values[f.id]} onChange={(v) => set(f.id, v)} />
                    </F>
                  ))}
              </div>

              {/* Early location validation */}
              {current.key === 'location' && (
                <div
                  className={
                    'rounded-lg border p-4 flex items-center justify-between gap-3 flex-wrap ' +
                    (loc?.ok
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : showMissing && missing.includes('location_validated')
                        ? 'border-red-500/40 bg-red-500/10'
                        : 'border-slate-700 bg-slate-900/40')
                  }
                >
                  <div className="text-13">
                    {loc?.ok ? (
                      <>
                        <div className="text-emerald-200 font-medium">✓ Location validated · {loc.confidence}% confidence</div>
                        <div className="text-emerald-200/80 text-[12px] mt-0.5">{loc.message}</div>
                      </>
                    ) : loc ? (
                      <div className="text-amber-300">{loc.message}</div>
                    ) : (
                      <div className="text-slate-300">The location has not been validated yet.</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={doValidate}
                    className="text-13 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium"
                  >
                    Validate now
                  </button>
                </div>
              )}
            </>
          )}

          {reviewing && (
            <>
              <div>
                <h3 className="text-lg font-semibold text-slate-50">Review and submit</h3>
                <p className="text-13 text-slate-400 mt-0.5">
                  Check each section. Required fields that are still empty are listed first.
                </p>
              </div>

              {allMissing.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <div className="text-13 font-medium text-amber-200">
                    {allMissing.length} required item{allMissing.length > 1 ? 's' : ''} missing
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {allMissing.map((m) => {
                      const f = STEPS[m.step].fields.find((x) => x.id === m.id)
                      return (
                        <li key={m.id} className="text-[12px] text-amber-100/90">
                          {STEPS[m.step].title} · {f ? f.label : 'Location validation'} ·{' '}
                          <button type="button" onClick={() => go(m.step)} className="underline hover:text-amber-50">
                            Fix
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              <div className="space-y-4">
                {STEPS.map((s, i) => (
                  <div key={s.key} className="rounded-lg border border-slate-700 bg-slate-900/30 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-13 font-semibold text-slate-100">
                        {i + 1}. {s.title}
                      </div>
                      <button type="button" onClick={() => go(i)} className="text-[12px] text-blue-300 hover:text-blue-200">
                        Edit
                      </button>
                    </div>
                    <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                      {s.fields
                        .filter((f) => visible(f, values) && !blank(values[f.id]))
                        .map((f) => (
                          <div key={f.id}>
                            <dt className="text-[10px] uppercase tracking-wide text-slate-500">{f.label}</dt>
                            <dd className="text-13 text-slate-200 break-words">{String(values[f.id])}</dd>
                          </div>
                        ))}
                      {s.key === 'location' && (
                        <div>
                          <dt className="text-[10px] uppercase tracking-wide text-slate-500">Validation</dt>
                          <dd className="text-13">
                            {locOk ? (
                              <span className="text-emerald-300">✓ {loc.confidence}% confidence</span>
                            ) : (
                              <span className="text-amber-300">Not validated</span>
                            )}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
            <button
              type="button"
              onClick={() => go(Math.max(0, step - 1))}
              disabled={step === 0 || busy}
              className="text-13 px-3 py-1.5 rounded-md border border-slate-600 text-slate-200 hover:bg-slate-800 disabled:opacity-40"
            >
              ← Back
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => submit(true)}
                disabled={busy}
                className="text-13 px-3 py-1.5 rounded-md border border-slate-600 text-slate-200 hover:bg-slate-800 disabled:opacity-40"
              >
                Save draft
              </button>
              {reviewing ? (
                <button
                  type="button"
                  onClick={() => submit(false)}
                  disabled={busy || allMissing.length > 0}
                  className="text-13 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-40"
                >
                  {busy ? 'Submitting…' : 'Submit →'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={next}
                  className="text-13 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium"
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Guidance panel ── */}
        <aside className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden lg:sticky lg:top-24">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
            <span className="text-sm font-semibold text-slate-200">Guidance</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-slate-600 text-slate-400">
              rule-based demo
            </span>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-13 text-slate-400 leading-relaxed">
              {reviewing
                ? 'Run a check across the whole submission before you send it.'
                : current.tip}
            </p>
            <button
              type="button"
              onClick={() => setCheck(quickCheck(step, values, locOk))}
              className="w-full text-13 px-3 py-1.5 rounded-md border border-blue-500/50 text-blue-200 hover:bg-blue-500/10"
            >
              ✨ Check {reviewing ? 'everything' : 'this section'}
            </button>
            {check && (
              <ul className="space-y-2" aria-live="polite">
                {check.map((c, i) => (
                  <li
                    key={`${c.label}-${i}`}
                    className={
                      'rounded-lg border p-3 ' +
                      (c.level === 'ok'
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-amber-500/25 bg-amber-500/5')
                    }
                  >
                    <div className={'text-13 font-semibold ' + (c.level === 'ok' ? 'text-emerald-300' : 'text-amber-300')}>
                      {c.label}
                    </div>
                    <div className="text-[12px] text-slate-300 mt-0.5">{c.note}</div>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-slate-500 leading-relaxed">
              These checks run in your browser. Connect an AI or rules service to give per-field coaching.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
