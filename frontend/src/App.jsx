import { useEffect, useState } from "react";
import { appConfig } from "./appConfig";
import SaskTelLogo from "./components/SaskTelLogo";
import usePfeWorkspace from "./usePfeWorkspace";
import Accomplishments from "./pages/Accomplishments";
import Dashboard from "./pages/Dashboard";
import Draft from "./pages/Draft";
import Goals from "./pages/Goals";
import History from "./pages/History";
import Refine from "./pages/Refine";

const pages = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "goals", label: "Goals", icon: "◎" },
  { id: "accomplishments", label: "Accomplishments", icon: "✓" },
  { id: "refine", label: "Refine", icon: "✎" },
  { id: "history", label: "History", icon: "◷" },
  { id: "draft", label: "PFE Draft", icon: "▤" },
];

export default function App() {
  const [page, setPage] = useState("dashboard");
  const { workspace, storageMessage, commit } = usePfeWorkspace();

  useEffect(() => {
    document.title = appConfig.name;
  }, []);

  const pageProps = { workspace, commit, navigate: setPage };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <button className="brand brand-button" onClick={() => setPage("dashboard")}>
          <SaskTelLogo />
        </button>
        <div className="workspace-name">
          {appConfig.name}
          <span>Employee workspace</span>
        </div>
        <div className="workspace-label">MY PFE</div>
        <nav aria-label="Employee navigation">
          {pages.map((item) => (
            <button
              key={item.id}
              aria-current={page === item.id ? "page" : undefined}
              className={`nav-item ${page === item.id ? "selected" : ""}`}
              onClick={() => setPage(item.id)}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="demo-pill">Local demo</span>
          <p>
            Data is fictional and saved only in this browser. It is not shared
            with a manager.
          </p>
          <div className="profile">
            <span className="avatar">{workspace.profile.initials}</span>
            <div>
              <strong>
                {workspace.profile.firstName} {workspace.profile.lastName}
              </strong>
              <span>Fictional employee</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>
            My PFE <span className="breadcrumb">/</span>{" "}
            <strong>{pages.find((item) => item.id === page).label}</strong>
          </span>
          <span className="topbar-label">
            <span className="green-dot" /> PFE {workspace.cycle.label}
          </span>
        </header>
        <main id="main" tabIndex={-1}>
          {storageMessage && (
            <div className="alert error" role="alert">
              {storageMessage}
            </div>
          )}
          {page === "dashboard" && <Dashboard {...pageProps} />}
          {page === "goals" && <Goals {...pageProps} />}
          {page === "accomplishments" && (
            <Accomplishments {...pageProps} />
          )}
          {page === "refine" && <Refine {...pageProps} />}
          {page === "history" && <History {...pageProps} />}
          {page === "draft" && <Draft {...pageProps} />}
        </main>
        <footer>
          {appConfig.name}
          <span>Fictional local prototype · SaskTel</span>
        </footer>
      </div>
    </div>
  );
}
