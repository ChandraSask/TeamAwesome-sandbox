/**
 * What the shell shows instead of the app when the session is not `ready`.
 *
 * Each case says WHO has to do something: the user, an admin, or you (the developer).
 * The golden rule of the host contract applies here too: never redirect or reload to
 * "fix" an auth state — show it, and let the host own sign-in.
 */

const COPY = {
  loading: {
    tone: 'info',
    title: 'Checking your access…',
    body: 'Asking the server which role you hold.',
  },
  'no-role': {
    tone: 'warn',
    title: 'You are signed in, but have no role yet',
    body: 'Your account is not in any of this app’s access groups. Ask an administrator to add you to one of them, then reload. Nothing is wrong with your sign-in.',
  },
  config: {
    tone: 'error',
    title: 'This build is missing its backend address',
    body: 'API_BASE was empty when this remote was built, so calls would go to the host instead of our API. Rebuild with the API_BASE build arg set to the backend origin (see ui/Dockerfile and INTEGRATION_GUIDE.md §2).',
  },
  expired: {
    tone: 'error',
    title: 'Your session has expired',
    body: 'Please sign in again from the NEXUS shell. The host has been told.',
  },
  denied: {
    tone: 'warn',
    title: 'More consent is needed',
    body: 'Your account must approve access to this app before it can load. Contact your administrator.',
  },
  error: {
    tone: 'error',
    title: 'Something went wrong',
    body: 'The server could not confirm your access.',
  },
}

const TONE = {
  info: 'border-slate-700 bg-slate-800/60',
  warn: 'border-amber-500/30 bg-amber-500/10',
  error: 'border-red-500/30 bg-red-500/10',
}

export default function AccessState({ status, onRetry, children }) {
  const c = COPY[status] ?? COPY.error
  return (
    <div
      role={status === 'loading' ? 'status' : 'alert'}
      className={`max-w-lg mx-auto mt-16 rounded-xl border p-8 text-center ${TONE[c.tone]}`}
    >
      <h2 className="text-xl font-semibold text-slate-50 mb-2">{c.title}</h2>
      <p className="text-slate-400 text-sm leading-relaxed">{c.body}</p>
      {children}
      {onRetry && status !== 'loading' && status !== 'expired' && (
        <button
          onClick={onRetry}
          className="mt-6 px-4 py-2 rounded border border-slate-600 text-slate-200 hover:bg-slate-700 text-sm"
        >
          Try again
        </button>
      )}
    </div>
  )
}

/** Shown inside the shell when a signed-in user opens a view their role may not use. */
export function NotAllowed({ role, onHome }) {
  return (
    <div role="alert" className="max-w-lg mx-auto mt-16 rounded-xl border border-slate-700 bg-slate-800/60 p-8 text-center">
      <h2 className="text-xl font-semibold text-slate-50 mb-2">Not available to your role</h2>
      <p className="text-slate-400 text-sm leading-relaxed">
        {role ? `The ${role} role` : 'Your role'} cannot open this page. If you need it, ask an administrator.
      </p>
      <button
        onClick={onHome}
        className="mt-6 px-4 py-2 rounded border border-slate-600 text-slate-200 hover:bg-slate-700 text-sm"
      >
        Back to Home
      </button>
    </div>
  )
}
