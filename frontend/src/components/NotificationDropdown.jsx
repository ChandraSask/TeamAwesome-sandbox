import { useEffect, useMemo, useRef, useState } from "react";

function getEmployeeNotifications(workspace) {
  const notifications = [
    {
      id: "workspace-ready",
      title: "Your PFE workspace is ready",
      message: "Add goals and accomplishments as you work through your cycle.",
      destination: "dashboard",
    },
  ];

  if (workspace.reminder?.enabled) {
    notifications.push({
      id: "reminder-set",
      title: "You have a reminder set",
      message: "Your reminder is stored in this browser. It does not send email.",
      destination: "dashboard",
    });
  }

  if (workspace.draft.lastSavedAt) {
    notifications.push({
      id: "draft-saved",
      title: "Your PFE draft was saved",
      message: "Continue editing your draft whenever you are ready.",
      destination: "draft",
    });
  }

  if (workspace.submissions.length) {
    notifications.push({
      id: "draft-submitted",
      title: "A sample submission is in your history",
      message: "This is a local simulation and was not sent to a manager.",
      destination: "history",
    });
  }

  return notifications;
}

export default function NotificationDropdown({
  isManager,
  managerNotifications,
  workspace,
  navigate,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notifications = useMemo(
    () =>
      isManager
        ? managerNotifications
        : getEmployeeNotifications(workspace),
    [isManager, managerNotifications, workspace],
  );

  useEffect(() => {
    if (!isOpen) return undefined;
    function closeOnOutsideClick(event) {
      if (!dropdownRef.current?.contains(event.target)) setIsOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div className="notification-dropdown" ref={dropdownRef}>
      <button
        className="notification-trigger"
        type="button"
        aria-label={`Notifications, ${notifications.length} notifications`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={() => setIsOpen((open) => !open)}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="notification-bell"
          focusable="false"
        >
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
        <span className="notification-count" aria-hidden="true">
          {notifications.length > 99 ? "99+" : notifications.length}
        </span>
      </button>
      {isOpen && (
        <section
          className="notification-menu"
          aria-label="Notifications"
          aria-live="polite"
        >
          <div className="notification-menu-heading">
            <div>
              <strong>Notifications</strong>
              <span>{isManager ? "Manager demo" : "Employee workspace"}</span>
            </div>
            <span className="notification-menu-count">{notifications.length}</span>
          </div>
          {notifications.length ? (
            <ul className="notification-list">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    className="notification-item"
                    onClick={() => {
                      setIsOpen(false);
                      navigate(notification.destination);
                    }}
                  >
                    <span className="notification-item-icon" aria-hidden="true">
                      {isManager ? "✓" : "•"}
                    </span>
                    <span className="notification-item-copy">
                      <strong>{notification.title}</strong>
                      <span>{notification.message}</span>
                    </span>
                    <span className="notification-item-arrow" aria-hidden="true">›</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="notification-empty">
              <span aria-hidden="true">✓</span>
              <strong>You’re all caught up</strong>
              <p>No evidence is waiting for review in this sample queue.</p>
            </div>
          )}
          <p className="notification-demo-note">
            Demo only · Notifications are not sent or shared.
          </p>
        </section>
      )}
    </div>
  );
}
