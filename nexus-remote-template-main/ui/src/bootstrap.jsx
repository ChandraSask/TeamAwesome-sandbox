// Standalone dev/deploy shell. The NEXUS host NEVER runs this file — it imports the
// exposed "./App" module directly. This only renders when you run the remote by itself.
import { createRoot } from 'react-dom/client'
import RemoteApp from './RemoteApp'

const el = document.getElementById('root')
if (el) {
  // Standalone → no host props. callApi() will fall back to standaloneAuth (its own MSAL).
  createRoot(el).render(<RemoteApp serviceId="myapp" />)
}
