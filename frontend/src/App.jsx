import { useEffect, useState } from "react";
import { appConfig } from "./appConfig";
import { getGreeting } from "./api";
import Card from "./components/Card";
import Notes from "./components/Notes";
import SaskTelLogo from "./components/SaskTelLogo";
import Dashboard from "./pages/Dashboard";

const pages = [
  { id: "home", label: "Home", icon: "⌂" },
  { id: "dashboard", label: "Dashboard", icon: "◫" },
  { id: "notes", label: "My notes", icon: "▤" },
  { id: "about", label: "About", icon: "○" },
];

export default function App() {
  useEffect(() => {
    document.title = appConfig.name;
  }, []);
  const [page, setPage] = useState("home");
  const [connection, setConnection] = useState({ state: "idle", message: "" });
  async function checkConnection() {
    setConnection({ state: "loading", message: "Connecting…" });
    try {
      const result = await getGreeting(appConfig.userName);
      setConnection({ state: "success", message: result.message });
    } catch {
      setConnection({
        state: "error",
        message:
          "Couldn’t reach the app service. Check that the backend window is running, then try again.",
      });
    }
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("home");
          }}
        >
          <SaskTelLogo />
        </a>
        <div className="workspace-name">
          {appConfig.name}
          <span>Performance & development</span>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {pages.map((item) => (
            <button
              key={item.id}
              aria-current={page === item.id ? "page" : undefined}
              className={`nav-item ${page === item.id ? "selected" : ""}`}
              onClick={() => setPage(item.id)}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
              {page === item.id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="demo-pill">Demo workspace</span>
          <p>
            Enterprise AI
            <br />
            Internal hackathon
          </p>
          <div className="profile">
            <span className="avatar">{appConfig.userInitials}</span>
            <div>
              <strong>{appConfig.userName} Morgan</strong>
              <span>Fictional demo profile</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>
            Workspace <span className="breadcrumb">/</span>{" "}
            <strong>{pages.find((item) => item.id === page).label}</strong>
          </span>
          <span className="topbar-label">
            <span className="green-dot" /> SaskTel · Enterprise AI
          </span>
        </header>
        <main id="main" tabIndex={-1}>
          {page === "home" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">MY WORKSPACE</p>
                  <h1>
                    Welcome, {appConfig.userName}
                    <span className="accent">.</span>
                  </h1>
                  <p>{appConfig.tagline}</p>
                </div>
                <span className="outline-pill">Demo environment</span>
              </div>
              <section className="hero">
                <div className="hero-copy">
                  <span className="hero-label">YOUR GROWTH, IN FOCUS</span>
                  <h2>{appConfig.welcomeTitle}</h2>
                  <p>{appConfig.welcomeDescription}</p>
                  <button
                    className="light-button"
                    onClick={() => setPage("dashboard")}
                  >
                    View my dashboard <span aria-hidden="true">↗</span>
                  </button>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="brand-line" />
                  <div className="brand-line" />
                  <div className="brand-line" />
                  <div className="brand-line" />
                  <div className="brand-line" />
                  <div className="brand-line" />
                </div>
              </section>
              <div className="section-heading">
                <h2>Your workspace</h2>
                <span className="muted">Explore the essentials</span>
              </div>
              <div className="home-grid">
                <Card>
                  <span className="tile-icon" aria-hidden="true">
                    ✎
                  </span>
                  <h3>My notes</h3>
                  <p>
                    Capture a contribution, a learning moment, or something to
                    discuss at your next check-in.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => setPage("notes")}
                  >
                    Open my notes <span aria-hidden="true">→</span>
                  </button>
                </Card>
                <Card>
                  <span className="tile-icon" aria-hidden="true">
                    ◫
                  </span>
                  <h3>My goals & development</h3>
                  <p>
                    Explore example goals, recent accomplishments, and learning
                    activities in one view.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => setPage("dashboard")}
                  >
                    Open dashboard <span aria-hidden="true">→</span>
                  </button>
                </Card>
                <Card>
                  <span className="tile-icon" aria-hidden="true">
                    ✳
                  </span>
                  <h3>About this workspace</h3>
                  <p>
                    Understand what this starting workspace includes and where
                    your team can take it next.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => setPage("about")}
                  >
                    Explore this workspace <span aria-hidden="true">→</span>
                  </button>
                </Card>
              </div>
              <div className="bottom-note">
                <span aria-hidden="true">✦</span>
                <p>
                  Start with one reflection. Build a clearer picture of your
                  progress over time.
                </p>
              </div>
            </>
          )}
          {page === "dashboard" && <Dashboard navigate={setPage} />}
          {page === "notes" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">PERSONAL WORKSPACE</p>
                  <h1>
                    My notes<span className="accent">.</span>
                  </h1>
                  <p>
                    Keep track of contributions, learning, and future
                    conversations.
                  </p>
                </div>
              </div>
              <Notes />
            </>
          )}
          {page === "about" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">A STARTING POINT</p>
                  <h1>
                    Yours to shape<span className="accent">.</span>
                  </h1>
                  <p>A simple workspace with space to grow.</p>
                </div>
              </div>
              <Card className="about-card">
                <span className="tile-icon" aria-hidden="true">
                  ✳
                </span>
                <h2>Meet {appConfig.name}</h2>
                <p>
                  This workspace brings goals, accomplishments, development, and
                  personal reflections together. It is an early starting point
                  for your team to shape—not a finished performance review
                  system.
                </p>
                <h3>A few things to know</h3>
                <p>
                  Alex is a fictional demo profile. There is no sign-in, and
                  notes stay in this browser only. They are not shared between
                  people or devices.
                </p>
                <p>
                  The dashboard uses read-only fictional examples. Appraisal
                  forms, manager feedback, shared saving, and AI assistance are
                  not built yet. Your team can choose which journey to develop
                  with your facilitator.
                </p>
                <button
                  className="primary"
                  onClick={() => setPage("dashboard")}
                >
                  Explore dashboard <span aria-hidden="true">↗</span>
                </button>
                <details className="connection-example">
                  <summary>Starter connection example</summary>
                  <p>
                    This small example checks the connection to the app service.
                  </p>
                  <button
                    className="text-button"
                    disabled={connection.state === "loading"}
                    onClick={checkConnection}
                  >
                    {connection.state === "loading"
                      ? "Connecting…"
                      : "Try a greeting"}
                  </button>
                  <p
                    role="status"
                    className={`small connection ${connection.state}`}
                  >
                    {connection.message}
                  </p>
                </details>
              </Card>
            </>
          )}
        </main>
        <footer>
          {appConfig.name}
          <span>SaskTel · Enterprise AI</span>
        </footer>
      </div>
    </div>
  );
}
