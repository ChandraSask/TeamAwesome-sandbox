// Single source of truth for "am I running inside the NEXUS host?"
//
// The host sets TWO embed markers before it loads any remote (see the host's
// src/bootstrap.tsx):
//   • window.__NEXUS_HOST__ = true            (canonical flag)
//   • window.__NEXUS__      = { host: true }  (legacy back-compat marker that
//                                              some existing remotes' isEmbedded()
//                                              key on instead)
// We MUST honour BOTH: a remote copied from an older sibling may only look for
// one of them, and missing the marker makes the remote wrongly think it is
// standalone and boot its own (empty-cache) MSAL while embedded → the
// "[MSAL] silent failed: no active account" auth failure.
//
// When embedded, the remote MUST NOT run its own SSO (no MSAL init, no
// loginRedirect) — the host is the sole authentication authority and hands us a
// token string via props.
export function isEmbedded() {
  try {
    if (typeof window === 'undefined') return false
    return window.__NEXUS_HOST__ === true || Boolean(window.__NEXUS__)
  } catch {
    return false
  }
}
