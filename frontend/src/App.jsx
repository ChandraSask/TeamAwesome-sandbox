import { useEffect, useState } from "react";
import { appConfig } from "./appConfig";
import Card from "./components/Card";
import LoginScreen from "./components/LoginScreen";
import NotificationDropdown from "./components/NotificationDropdown";
import PageHeading from "./components/PageHeading";
import SaskTelLogo from "./components/SaskTelLogo";
import usePfeWorkspace from "./usePfeWorkspace";
import Accomplishments from "./pages/Accomplishments";
import Dashboard from "./pages/Dashboard";
import Draft from "./pages/Draft";
import Goals from "./pages/Goals";
import History from "./pages/History";
import Manager from "./pages/Manager";
import Refine from "./pages/Refine";

const employeePages = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "goals", label: "Goals", icon: "◎" },
  { id: "accomplishments", label: "Accomplishments", icon: "✓" },
  { id: "refine", label: "Refine", icon: "✎" },
  { id: "history", label: "History", icon: "◷" },
  { id: "draft", label: "PFE Draft", icon: "▤" },
];
const managerPages = [{ id: "manager", label: "Manager demo", icon: "▣" }];
const adminPages = [{ id: "admin", label: "Admin", icon: "⚙" }];

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [session, setSession] = useState(null);
  const [managerNotifications, setManagerNotifications] = useState([]);
  const [managerQueueRequest, setManagerQueueRequest] = useState(0);
  const { workspace, storageMessage, commit } = usePfeWorkspace();

  useEffect(() => {
    document.title = appConfig.name;
  }, []);

  const pages =
    session?.role === "manager"
      ? managerPages
      : session?.role === "admin"
        ? adminPages
        : employeePages;
  const pageProps = { workspace, commit, navigate: setPage };

  function handleLogin(nextSession) {
    setSession(nextSession);
    setManagerNotifications([]);
    setPage(
      nextSession.role === "manager"
        ? "manager"
        : nextSession.role === "admin"
          ? "admin"
          : "dashboard",
    );
  }

  function handleLogout() {
    setSession(null);
    setManagerNotifications([]);
    setPage("dashboard");
  }

  function openNotification(destination) {
    if (destination === "manager-review-queue") {
      setManagerQueueRequest((request) => request + 1);
      setPage("manager");
      return;
    }
    setPage(destination);
  }

  if (!session) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const roleLabel =
    session.role === "manager"
      ? "Manager demo"
      : session.role === "admin"
        ? "Admin demo"
        : "Employee workspace";

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
          <span>{roleLabel}</span>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav aria-label={`${roleLabel} navigation`}>
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
            {session.role === "employee"
              ? "Data is fictional and saved only in this browser. It is not shared with a manager."
              : "Role selection is for this demo only. It does not provide access control."}
          </p>
          <div className="profile">
            <span className="avatar">
              {session.displayName.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{session.displayName}</strong>
              <span>{session.role} demo role</span>
            </div>
          </div>
          <button
            className="logout-button"
            type="button"
            onClick={handleLogout}
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>
            {session.role === "employee" ? "My PFE" : appConfig.name}
            <span className="breadcrumb">/</span>{" "}
            <strong>{pages.find((item) => item.id === page).label}</strong>
          </span>
          {session.role === "employee" && (
            <span className="topbar-label">
              <span className="green-dot" /> PFE {workspace.cycle.label}
            </span>
          )}
          {session.role !== "admin" && (
            <NotificationDropdown
              isManager={session.role === "manager"}
              managerNotifications={managerNotifications}
              workspace={workspace}
              navigate={openNotification}
            />
          )}
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
          {page === "manager" && (
            <Manager
              onNotificationsChange={setManagerNotifications}
              reviewQueueRequest={managerQueueRequest}
            />
          )}
          {page === "admin" && (
            <section className="admin-placeholder">
              <PageHeading
                eyebrow="ADMIN DEMO"
                title="Admin"
                description="This branded placeholder marks the Admin role in the demo."
              />
              <Card>
                <h2>Admin features are not implemented yet</h2>
                <p>
                  This role selection is only a local UI demo. There are no
                  admin tools, real sign-in, or access restrictions.
                </p>
              </Card>
            </section>
          )}
        </main>
        <footer>
          {appConfig.name}
          <span>Fictional local prototype · SaskTel</span>
        </footer>
      </div>
    </div>
  );
}
