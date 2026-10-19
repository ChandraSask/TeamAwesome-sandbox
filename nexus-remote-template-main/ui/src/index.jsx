// Module-Federation entry MUST be an async boundary so shared singletons (React) are
// negotiated before any app code runs. Do NOT import RemoteApp statically here.
import('./bootstrap')
