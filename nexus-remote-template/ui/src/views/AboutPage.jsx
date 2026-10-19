import { useEffect, useMemo, useState } from 'react'
import { ALL_STATUSES, LIFECYCLE, statusLabel, statusMeta } from '../lib/workflow'
import { PERMISSIONS, PERMISSION_LABEL, ROLES, ROLE_BLURB, ROLE_LABEL, can } from '../lib/roles'

/**
 * About: what the app does, who can do what, and how a submission moves.
 *
 * Layout: a navigation panel on the left (sticky on wide screens, a scrolling
 * pill row on narrow ones) and the sections on the right. Clicking an entry
 * scrolls to its section; the entry for the section on screen is highlighted.
 */

const NAV = [
  {
    title: 'Start here',
    items: [
      { id: 'overview', label: 'Overview' },
      { id: 'features', label: 'What is in the app' },
    ],
  },
  {
    title: 'Using the app',
    items: [
      { id: 'create', label: 'Create a submission' },
      { id: 'location', label: 'Location validation' },
      { id: 'statuses', label: 'Statuses' },
      { id: 'roles', label: 'Roles and permissions' },
      { id: 'tips', label: 'Tips and troubleshooting' },
    ],
  },
  {
    title: 'How a submission moves',
    items: [{ id: 'lifecycle', label: 'The 5-step lifecycle' }],
  },
  {
    title: 'For developers',
    items: [{ id: 'template', label: 'Using this template' }],
  },
]

const FEATURES = [
  {
    icon: '🏠',
    title: 'Home',
    blurb: 'Start a submission, open the dashboard and see the most recent submissions with their progress.',
    route: '/',
    routeLabel: 'Open Home',
  },
  {
    icon: '🧾',
    title: 'New Submission',
    blurb: 'A guided five-section form with a progress stepper, per-field help, a rule-based quick check and early location validation.',
    route: '/new',
    routeLabel: 'Start one',
  },
  {
    icon: '🗂️',
    title: 'Dashboard',
    blurb: 'A worklist with status chips, team and date filters, search, paging and a detail drawer for each submission.',
    route: '/dashboard',
    routeLabel: 'Open the dashboard',
  },
  {
    icon: '🎨',
    title: 'Themes',
    blurb: 'Natural (a quiet, warm light mode) and Dark. Use the switch in the top bar — your choice is remembered in this browser.',
  },
  {
    icon: '👤',
    title: 'Account menu',
    blurb: 'The avatar shows who you are signed in as and a live list of submissions that still need an action.',
  },
  {
    icon: '🔌',
    title: 'Host-ready',
    blurb: 'Runs standalone for development and embedded inside the NEXUS host, using the host’s sign-in.',
    route: '/about',
    routeLabel: 'See the template guide',
    scrollTo: 'template',
  },
]

const CREATE_STEPS = [
  {
    title: 'Requester',
    detail: 'Who is raising the request and how to reach them. Your name and email are filled in from your sign-in.',
  },
  {
    title: 'Account',
    detail: 'The account the work is for: name, number, billing address and the main contact.',
  },
  {
    title: 'General',
    detail: 'Category, priority, requested date and any references to related submissions.',
  },
  {
    title: 'Location',
    detail:
      'Choose Urban or Rural — the fields change to match — then validate the location before you continue.',
  },
  {
    title: 'Request',
    detail: 'What you need: a title, a description, the quantity and the contract term.',
  },
  {
    title: 'Review and submit',
    detail:
      'Check the summary, then submit. The submission becomes Active and is routed to a team. You can also save a draft at any step.',
  },
]

const STATUS_NOTES = {
  Draft: 'Saved but not submitted. Only you can see it until you submit.',
  Active: 'Submitted and waiting for a team to pick it up.',
  More_Info: 'A reviewer needs more information from the requester before continuing.',
  In_Review: 'A team is working on it.',
  Replied: 'The team has answered; the requester decides what happens next.',
  Completed: 'Accepted and finished.',
  Cancelled: 'Withdrawn by the requester or a reviewer.',
  Rejected: 'Declined by a reviewer.',
  Expired: 'No decision was made within the allowed window.',
}

const LIFECYCLE_NOTES = {
  Draft: 'The requester fills in the form and can save at any point.',
  Active: 'The submission is sent and routed to Team A or Team B.',
  In_Review: 'The owning team reviews it and may ask for more information.',
  Replied: 'The team replies with its answer and, where relevant, a price.',
  Completed: 'The requester accepts and the submission is closed out.',
}

const TIPS = [
  ['I cannot continue to the next step', 'A required field (marked with *) is empty. It is outlined in red — fill it in and try again.'],
  ['The location will not validate', 'Check the address or land location for typos and press Validate now again.'],
  ['My draft is missing', 'Drafts are stored in this browser. Open the Dashboard and filter on Draft.'],
  ['The text looks different in the other theme', 'Natural and Dark use the same typefaces; only colour and surfaces change.'],
]

const TEMPLATE_CARDS = [
  {
    title: 'Host contract',
    body: 'RemoteApp receives user, getSecureToken, onSessionExpired and serviceId from the host. It never starts its own sign-in while embedded.',
    file: 'ui/src/RemoteApp.jsx',
  },
  {
    title: 'Themes',
    body: 'Two themes share one set of Tailwind classes; a theme only re-maps them. Add or change colours in the theme CSS, not in components.',
    file: 'ui/src/theme/ · ui/src/lib/theme.js',
  },
  {
    title: 'Roles',
    body: 'Roles come from Entra groups (app roles). The backend maps them and refuses what a role may not do; the UI hides what it cannot use. Locally, a Home page drop-down stands in for Entra.',
    file: 'backend/app/roles.py · ui/src/lib/roles.js',
  },
  {
    title: 'Data seam',
    body: 'Submissions here are mock data kept in this browser. Replace the two functions in the data module with calls to your backend.',
    file: 'ui/src/data/submissions.js',
  },
  {
    title: 'Backend calls',
    body: 'callApi mints a fresh token per call and hands real 401s to the host. Use it for every request to your own API.',
    file: 'ui/src/lib/callApi.js',
  },
  {
    title: 'CSP build guard',
    body: 'npm run build fails if the bundle would break the host Content-Security-Policy (eval, inline script, self-hosted fonts).',
    file: 'ui/scripts/check-csp.cjs',
  },
  {
    title: 'Registration',
    body: 'The platform team adds your origin to the host registry. The container name, exposed module and entry file must match.',
    file: 'INTEGRATION_GUIDE.md §2, §4',
  },
]

/* ── Small atoms ─────────────────────────────────────────────────────────── */

function SectionHead({ id, kicker, title, sub }) {
  return (
    <div id={id} className="scroll-mt-24">
      <div className="text-[11px] font-mono uppercase tracking-widest text-blue-400/80">{kicker}</div>
      <h2 className="text-xl font-semibold text-slate-100 mt-0.5">{title}</h2>
      {sub && <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">{sub}</p>}
    </div>
  )
}

function YesNo({ on }) {
  return on ? (
    <span className="text-emerald-400" title="Yes">
      ✓
    </span>
  ) : (
    <span className="text-slate-600" title="No">
      —
    </span>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function AboutPage({ navigate, state, session }) {
  const nav = NAV
  const ids = useMemo(() => nav.flatMap((g) => g.items.map((i) => i.id)), [nav])
  const [active, setActive] = useState('overview')

  // Highlight the section that is on screen.
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean)
    if (els.length === 0 || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-90px 0px -65% 0px', threshold: 0 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [ids])

  const goTo = (id) => {
    setActive(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Arrived with { scrollTo: "template" } (the Home "Template guide" tile).
  useEffect(() => {
    const want = state?.scrollTo
    if (!want) return
    const raf = requestAnimationFrame(() =>
      document.getElementById(want)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
    return () => cancelAnimationFrame(raf)
  }, [state?.scrollTo])

  return (
    <div className="max-w-7xl mx-auto pb-16">
      <div className="lg:grid lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-8">
        {/* ── Navigation panel ── */}
        <aside className="lg:self-start lg:sticky lg:top-20">
          <nav
            aria-label="About sections"
            className="flex gap-2 overflow-x-auto pb-3 lg:pb-0 lg:block lg:overflow-visible lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1"
          >
            {nav.map((g) => (
              <div key={g.title} className="flex gap-2 lg:block lg:mb-4">
                <div className="hidden lg:block text-[10px] font-mono uppercase tracking-widest text-slate-500 px-3 mb-1">
                  {g.title}
                </div>
                {g.items.map((i) => {
                  const on = active === i.id
                  return (
                    <button
                      key={i.id}
                      onClick={() => goTo(i.id)}
                      aria-current={on ? 'true' : undefined}
                      className={
                        'whitespace-nowrap text-left rounded-md px-3 py-1.5 text-13 border transition lg:block lg:w-full ' +
                        (on
                          ? 'border-blue-500 bg-blue-950/40 text-slate-100'
                          : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-100')
                      }
                    >
                      {i.label}
                    </button>
                  )
                })}
              </div>
            ))}
          </nav>
        </aside>

        {/* ── Content ── */}
        <div className="min-w-0 space-y-12">
          {/* Overview */}
          <section className="space-y-4">
            <SectionHead id="overview" kicker="About" title="About My App" />
            <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-800/60 to-slate-900 p-6">
              <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
                My App is how requests are captured, routed and tracked. It helps a requester get the details{' '}
                <span className="text-slate-100">right the first time</span>, so reviewers spend their time on the
                work instead of chasing missing information.
              </p>
              <p className="text-sm text-slate-400 mt-3 leading-relaxed max-w-3xl">
                A requester fills in a guided form with checks on each section and validates the location before
                anything is sent. The submission is then routed to Team A or Team B, reviewed, answered and closed —
                and every step is visible on the Dashboard.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-[11px] px-2.5 py-1 rounded border border-emerald-700/60 bg-emerald-900/20 text-emerald-200">
                  Example data · no backend required
                </span>
                <button
                  onClick={() => goTo('lifecycle')}
                  className="text-[11px] px-2.5 py-1 rounded border border-blue-700/60 bg-blue-900/20 text-blue-200 hover:bg-blue-900/40"
                >
                  See how a submission moves →
                </button>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="space-y-4">
            <SectionHead
              id="features"
              kicker="Features"
              title="What is in the app"
              sub="Each card is a place you can go from the top bar, or a feature that is always on."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-xl border border-slate-800 bg-slate-800/30 p-5 flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{f.icon}</span>
                    <h3 className="text-sm font-semibold text-slate-100">{f.title}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed flex-1">{f.blurb}</p>
                  {f.route && (
                    <button
                      onClick={() => (f.scrollTo ? goTo(f.scrollTo) : navigate(f.route))}
                      className="mt-3 self-start text-[12px] text-blue-300 hover:text-blue-200 font-medium"
                    >
                      {f.routeLabel} →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Create */}
          <section className="space-y-4">
            <SectionHead
              id="create"
              kicker="Using the app"
              title="Create a submission, step by step"
              sub="From the first field to a submitted, routed request."
            />
            <div className="rounded-xl border border-slate-800 bg-slate-800/20 p-6">
              <ol className="space-y-4">
                {CREATE_STEPS.map((s, i) => (
                  <li key={s.title} className="flex gap-4">
                    <span className="flex-none w-7 h-7 rounded-full bg-blue-600/20 border border-blue-600 text-blue-200 text-sm font-semibold grid place-items-center">
                      {i + 1}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-slate-100">{s.title}</div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed max-w-3xl">{s.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/new')}
                  className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
                >
                  + Start a new submission
                </button>
              </div>
            </div>
          </section>

          {/* Location */}
          <section className="space-y-4">
            <SectionHead
              id="location"
              kicker="Using the app"
              title="Early location validation"
              sub="An address can be valid but wrong for the work, so the location is checked before you can continue."
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-6">
                <h3 className="text-sm font-semibold text-slate-100">How you validate</h3>
                <ul className="mt-3 space-y-2 text-xs text-slate-400 leading-relaxed">
                  <li className="flex gap-2">
                    <span className="text-blue-300">1.</span> Pick <span className="text-slate-200">Urban</span> or{' '}
                    <span className="text-slate-200">Rural</span> — the fields below change.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-300">2.</span> Fill in the street address, or the land location and road
                    name.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-300">3.</span> Press <span className="text-slate-200">Validate now</span>.
                    A green result with a confidence score lets you continue.
                  </li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-6">
                <h3 className="text-sm font-semibold text-slate-100">What to expect</h3>
                <ul className="mt-3 space-y-2 text-xs text-slate-400 leading-relaxed">
                  <li className="flex gap-2">
                    <span className="text-emerald-400">✓</span> Editing the location clears the result so a stale
                    check can never pass.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-400">✓</span> This demo checks that the fields look complete;
                    connect a real geocoder for live matching.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Statuses */}
          <section className="space-y-4">
            <SectionHead
              id="statuses"
              kicker="Using the app"
              title="Statuses"
              sub="The status chips on the Dashboard filter the list; click one to focus on it."
            />
            <div className="overflow-hidden rounded-xl border border-slate-800">
              <table className="w-full text-13 border-collapse">
                <tbody>
                  {ALL_STATUSES.map((s, i) => (
                    <tr key={s} className={'border-t border-slate-800 first:border-t-0 ' + (i % 2 ? 'bg-slate-900/40' : '')}>
                      <td className="px-4 py-2.5 whitespace-nowrap w-40">
                        <span className={'text-[11px] px-2 py-0.5 rounded border ' + statusMeta(s).cls}>
                          {statusLabel(s)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400">{STATUS_NOTES[s]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Roles */}
          <section className="space-y-4">
            <SectionHead
              id="roles"
              kicker="Using the app"
              title="Roles and permissions"
              sub={
                session?.mode === 'dev'
                  ? 'You are in developer mode: pick a role on the Home page to try each one. Inside NEXUS the role comes from the user’s Entra group.'
                  : 'Your role comes from your Entra group. The backend enforces it on every request; the pages you cannot use are simply hidden.'
              }
            />
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-13 border-collapse">
                <thead>
                  <tr className="bg-slate-800/80 text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="text-left font-medium px-4 py-2.5">Role</th>
                    <th className="text-left font-medium px-4 py-2.5">What it is for</th>
                    {Object.keys(PERMISSIONS).map((p) => (
                      <th key={p} className="text-center font-medium px-4 py-2.5">{PERMISSION_LABEL[p]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROLES.map((r) => (
                    <tr key={r} className={'border-t border-slate-800 ' + (r === session?.role ? 'bg-blue-950/30' : '')}>
                      <td className="px-4 py-2.5 font-medium text-slate-100">
                        {ROLE_LABEL[r]}
                        {r === session?.role && <span className="ml-2 text-[10px] text-blue-300">you</span>}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400">{ROLE_BLURB[r]}</td>
                      {Object.keys(PERMISSIONS).map((p) => (
                        <td key={p} className="px-4 py-2.5 text-center"><YesNo on={can(r, p)} /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Tips */}
          <section className="space-y-4">
            <SectionHead id="tips" kicker="Using the app" title="Tips and troubleshooting" sub="The quick answers to what people hit most often." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TIPS.map(([q, a]) => (
                <div key={q} className="rounded-xl border border-slate-800 bg-slate-800/30 p-5">
                  <div className="text-[13px] font-medium text-slate-100">{q}</div>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Lifecycle */}
          <section className="space-y-4">
            <SectionHead
              id="lifecycle"
              kicker="How a submission moves"
              title="The 5-step lifecycle"
              sub="Every submission follows the same path. Cancelled, Rejected and Expired end it early."
            />
            <div className="rounded-xl border border-slate-800 bg-slate-800/20 p-6">
              <ol className="relative space-y-5 border-l border-slate-700 pl-6 ml-2">
                {LIFECYCLE.map((s, i) => (
                  <li key={s} className="relative">
                    <span className="absolute -left-[34px] top-0.5 w-5 h-5 rounded-full bg-slate-800 border border-slate-600 text-[10px] text-slate-300 grid place-items-center">
                      {i + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={'text-[11px] px-2 py-0.5 rounded border ' + statusMeta(s).cls}>{statusLabel(s)}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-2xl">{LIFECYCLE_NOTES[s]}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* Template */}
          <section className="space-y-4">
            <SectionHead
              id="template"
              kicker="For developers"
              title="Using this template"
              sub="This UI is a NEXUS Module Federation remote. These are the places you change when you make it yours."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {TEMPLATE_CARDS.map((c) => (
                <div key={c.title} className="rounded-xl border border-slate-800 bg-slate-800/30 p-5 flex flex-col">
                  <h3 className="text-sm font-semibold text-slate-100">{c.title}</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed flex-1">{c.body}</p>
                  <code className="mt-3 text-[11px] text-blue-300 break-words">{c.file}</code>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
