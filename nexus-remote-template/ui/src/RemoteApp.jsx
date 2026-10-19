import { useEffect, useState } from 'react'
import './index.css'
import './theme/themeSwitch.css'
import './theme/natural.generated.css'
import './theme/natural.css'
import './theme/natural-dark.generated.css'
import './theme/natural-dark.css'
import ThemeSwitch from './components/ThemeSwitch'
import UserMenu from './components/UserMenu'
import HomePage from './views/HomePage'
import AboutPage from './views/AboutPage'
import DashboardPage from './views/DashboardPage'
import NewSubmissionPage from './views/NewSubmissionPage'
import AdminPage from './views/AdminPage'
import AccessState, { NotAllowed } from './views/AccessState'
import { isEmbedded } from './lib/isEmbedded'
import { useSession } from './lib/useSession'
import { ensureThemeFonts, readStoredTheme, themeClassName, writeStoredTheme } from './lib/theme'

/**
 * The component the NEXUS host mounts. This is the module exposed as "./App".
 *
 * PROPS CONTRACT (supplied by the host when embedded):
 *   - user            {object}   the signed-in user (name, email, role, title…)
 *   - bearerToken     {string}   Token B string (convenience; prefer getSecureToken)
 *   - getSecureToken  {(scope)=>Promise<string>}  mint a FRESH token per call
 *   - onSessionExpired{()=>void} call this on unrecoverable auth failure, then STOP
 *   - serviceId       {string}   this remote's id from remotes.json (optional)
 *
 * Golden rules: never cache the token, never self-redirect while embedded, and on a
 * true 401 call onSessionExpired() and stop. Backend calls go through
 * src/lib/callApi.js — see src/examples/ApiHello.jsx for the reference usage.
 *
 * ROLES: who the user is and what they may do comes from `useSession` — the Entra
 * role via GET /api/me when embedded, the Home page role picker in local dev. Every
 * view below is gated on a PERMISSION (never a role name), so renaming a role only
 * touches lib/roles.js and backend/app/roles.py. Hiding a view is presentation; the
 * backend refuses the same action on its own.
 *
 * Navigation is state-based (no router): a router would fight the host's own
 * history and URL handling when this runs embedded.
 */

const ROUTE_TO_VIEW = {
  '/': 'home',
  home: 'home',
  '/about': 'about',
  '/dashboard': 'dashboard',
  '/new': 'new',
  '/admin': 'admin',
}

/** A view listed here needs that permission; any other view is open to every role. */
const VIEW_PERMISSION = {
  new: 'submission.create',
  admin: 'admin.view',
}

export default function RemoteApp(props) {
  const { user: hostUser, getSecureToken, onSessionExpired, serviceId } = props
  const session = useSession({ hostUser, getSecureToken, onSessionExpired })
  const { user } = session

  const [view, setView] = useState('home')
  const [navState, setNavState] = useState(null)
  const [theme, setTheme] = useState(() => readStoredTheme())

  useEffect(() => {
    writeStoredTheme(theme)
    // Both themes use the login typefaces; fetch them only once.
    ensureThemeFonts()
  }, [theme])

  const navigate = (target, state) => {
    const next = ROUTE_TO_VIEW[target] ?? 'home'
    setNavState(state ?? null)
    setView(next)
    // A new view should start at the top, not wherever the last one was scrolled.
    if (typeof window !== 'undefined' && !state?.scrollTo) window.scrollTo?.({ top: 0 })
  }

  const allowed = (v) => !VIEW_PERMISSION[v] || session.can(VIEW_PERMISSION[v])
  const ready = session.status === 'ready'

  const navBtn = (id, label) => (
    <button
      key={id}
      onClick={() => navigate(id === 'home' ? '/' : `/${id}`)}
      className={
        'px-3 py-1.5 rounded-md text-13 ' +
        (view === id ? 'bg-slate-800 text-slate-100' : 'hover:bg-slate-800 text-slate-300')
      }
    >
      {label}
    </button>
  )

  return (
    <div data-theme={theme} className={themeClassName(theme) + ' min-h-screen bg-slate-900 text-slate-50'}>
      {/* Header — brand + Home / About / Dashboard / + New Submission */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur border-b border-slate-800 shadow-lg">
        <div className="w-full px-6 flex items-center justify-between gap-3 py-3">
          {/* Brand */}
          <button onClick={() => navigate('/')} className="flex items-center gap-3 group" aria-label="Home">
            <span className="inline-flex items-center gap-2 group-hover:scale-[1.03] transition origin-left">
              <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
                <rect x="1" y="1" width="28" height="28" rx="7" fill="#5b9bd5" opacity="0.18" />
                <g fill="#5b9bd5">
                  <rect x="7" y="8" width="16" height="2.6" rx="1.3" />
                  <rect x="7" y="13.7" width="12" height="2.6" rx="1.3" />
                  <rect x="7" y="19.4" width="8" height="2.6" rx="1.3" />
                </g>
              </svg>
              <span className="text-lg font-semibold tracking-tight text-slate-50 whitespace-nowrap">My App</span>
            </span>
            <span className="hidden xl:block h-6 w-px bg-slate-700" />
            <span className="text-left hidden xl:block">
              <span className="block text-slate-200 font-semibold text-13 leading-none">Submission Workflow</span>
              <span className="block text-slate-500 text-[11px] leading-none mt-0.5 whitespace-nowrap">
                {isEmbedded() ? 'Embedded in NEXUS' : 'Running standalone'}
                {serviceId ? ` · ${serviceId}` : ''}
              </span>
            </span>
          </button>

          {/* Nav — only what this role may open */}
          <nav className="flex items-center gap-1">
            {navBtn('home', 'Home')}
            {navBtn('about', 'About')}
            {ready && navBtn('dashboard', 'Dashboard')}
            {ready && allowed('admin') && navBtn('admin', 'Admin')}
            {/* Primary CTA — prominent blue button */}
            {ready && allowed('new') && (
              <button
                onClick={() => navigate('/new')}
                className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-13 font-medium ml-1 whitespace-nowrap"
              >
                + New Submission
              </button>
            )}
            <ThemeSwitch theme={theme} onChange={setTheme} />
            <UserMenu user={user} navigate={navigate} />
          </nav>
        </div>
      </header>

      <main className="w-full px-6 py-8">
        {!ready ? (
          // No role yet, or auth needs attention: say why instead of showing a broken app.
          // About stays readable so a new user can still learn what the app is.
          view === 'about' ? (
            <AboutPage navigate={navigate} state={navState} session={session} />
          ) : (
            <AccessState status={session.status} onRetry={session.retry} />
          )
        ) : !allowed(view) ? (
          <NotAllowed role={user.role} onHome={() => navigate('/')} />
        ) : (
          <>
            {view === 'home' && <HomePage navigate={navigate} session={session} />}
            {view === 'about' && <AboutPage navigate={navigate} state={navState} session={session} />}
            {view === 'dashboard' && <DashboardPage navigate={navigate} session={session} state={navState} />}
            {view === 'new' && <NewSubmissionPage navigate={navigate} user={user} />}
            {view === 'admin' && <AdminPage session={session} />}
          </>
        )}
      </main>
    </div>
  )
}
