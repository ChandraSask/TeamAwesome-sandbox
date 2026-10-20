import { useState } from "react";
import Card from "../components/Card";
import PageHeading from "../components/PageHeading";
import {
  calculateProgress,
  currentNextReminder,
  formatDate,
  nextReminderDate,
} from "../pfeUtils";

const blankReminder = {
  enabled: true,
  frequency: "Monthly",
  dayOfWeek: "5",
  dayOfMonth: "20",
  time: "14:00",
  email: "",
};

function ReminderForm({ workspace, commit, onClose }) {
  const [form, setForm] = useState(
    workspace.reminder || {
      ...blankReminder,
      email: workspace.profile.email,
    },
  );
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function save(event) {
    event.preventDefault();
    if (!form.email.trim() || !form.email.includes("@")) {
      setError("Enter a valid demo email address.");
      return;
    }
    const reminder = {
      ...form,
      email: form.email.trim(),
      nextRun: nextReminderDate(form),
    };
    if (
      commit(
        (current) => ({ ...current, reminder }),
        {
          action: workspace.reminder
            ? "Reminder updated"
            : "Reminder configured",
          entityType: "reminder",
          entityId: "employee-reminder",
        },
      )
    ) {
      onClose();
    }
  }

  function remove() {
    if (!window.confirm("Delete this local reminder configuration?")) return;
    if (
      commit(
        (current) => ({ ...current, reminder: null }),
        {
          action: "Reminder deleted",
          entityType: "reminder",
          entityId: "employee-reminder",
        },
      )
    ) {
      onClose();
    }
  }

  const usesWeekday = ["Weekly", "Biweekly"].includes(form.frequency);

  return (
    <Card className="form-card">
      <div className="section-heading">
        <h2>Reminder configuration</h2>
        <button className="text-button" type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <form onSubmit={save}>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => update("enabled", event.target.checked)}
          />
          Enable this reminder
        </label>
        <div className="form-grid">
          <label>
            Frequency
            <select
              value={form.frequency}
              onChange={(event) => update("frequency", event.target.value)}
            >
              <option>Weekly</option>
              <option>Biweekly</option>
              <option>Monthly</option>
              <option>Quarterly</option>
            </select>
          </label>
          {usesWeekday ? (
            <label>
              Day
              <select
                value={form.dayOfWeek}
                onChange={(event) => update("dayOfWeek", event.target.value)}
              >
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
              </select>
            </label>
          ) : (
            <label>
              Day of month
              <input
                type="number"
                min="1"
                max="28"
                value={form.dayOfMonth}
                onChange={(event) => update("dayOfMonth", event.target.value)}
              />
            </label>
          )}
          <label>
            Time
            <input
              type="time"
              value={form.time}
              onChange={(event) => update("time", event.target.value)}
              required
            />
          </label>
          <label>
            Demo email
            <input
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              required
            />
          </label>
        </div>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <p className="small">
          This saves a schedule for the demo. No email is sent.
        </p>
        <div className="button-row">
          <button className="primary">Save reminder</button>
          {workspace.reminder && (
            <button className="danger-button" type="button" onClick={remove}>
              Delete reminder
            </button>
          )}
        </div>
      </form>
    </Card>
  );
}

export default function Dashboard({ workspace, commit, navigate }) {
  const [showReminder, setShowReminder] = useState(false);
  const progress = calculateProgress(workspace);
  const reminderDate = workspace.reminder?.enabled
    ? currentNextReminder(workspace.reminder)
    : null;
  const latestSubmission = workspace.submissions[0];
  const status = latestSubmission
    ? workspace.draft.status === "Draft"
      ? "New Revision"
      : "Submitted to Manager"
    : workspace.draft.status;

  return (
    <>
      <PageHeading
        eyebrow={`PFE ${workspace.cycle.label}`}
        title={`Welcome, ${workspace.profile.firstName}`}
        description="Capture evidence throughout the year and prepare your employee draft."
        action={
          <button
            className="primary"
            onClick={() => navigate("accomplishments")}
          >
            + Add accomplishment
          </button>
        }
      />
      <div className="sample-notice">
        <strong>Fictional local demo</strong>
        <span>
          Data stays in this browser. There is no sign-in, shared storage, or
          manager notification.
        </span>
      </div>
      <div className="summary-grid summary-grid-four">
        <Card>
          <span className="metric-label">PFE status</span>
          <strong className="metric-text">{status}</strong>
          <span className="muted">
            Last updated {formatDate(workspace.updatedAt)}
          </span>
        </Card>
        <Card>
          <span className="metric-label">Completion progress</span>
          <strong className="metric-value">{progress.percent}%</strong>
          <span className="muted">Preparation only, not performance</span>
        </Card>
        <Card>
          <span className="metric-label">Goals</span>
          <strong className="metric-value">{workspace.goals.length}</strong>
          <span className="muted">
            {workspace.goals.filter((goal) => goal.status === "Active").length}{" "}
            active
          </span>
        </Card>
        <Card>
          <span className="metric-label">Accomplishments</span>
          <strong className="metric-value">
            {workspace.accomplishments.length}
          </strong>
          <span className="muted">Evidence captured this cycle</span>
        </Card>
      </div>
      <div className="dashboard-layout">
        <Card>
          <div className="section-heading">
            <h2>What contributes to completion</h2>
            <strong>{progress.percent}%</strong>
          </div>
          <progress
            value={progress.percent}
            max="100"
            aria-label={`${progress.percent}% PFE completion`}
          />
          <div className="milestone-list">
            {progress.milestones.map((item) => (
              <div className="milestone-row" key={item.label}>
                <span aria-hidden="true">{item.complete ? "✓" : "○"}</span>
                <span>{item.label}</span>
                <strong>{item.weight}%</strong>
              </div>
            ))}
          </div>
        </Card>
        <div className="dashboard-side">
          <Card>
            <div className="section-heading">
              <h2>Reminder</h2>
              <span
                className={`status-badge ${workspace.reminder?.enabled ? "complete" : ""}`}
              >
                {workspace.reminder?.enabled ? "Enabled" : "Not scheduled"}
              </span>
            </div>
            {workspace.reminder ? (
              <>
                <p>
                  {workspace.reminder.frequency} at {workspace.reminder.time}
                </p>
                <p className="small">
                  Next: {formatDate(reminderDate, { includeTime: true })}
                </p>
              </>
            ) : (
              <p>
                Set a local prompt to remember to capture accomplishments.
              </p>
            )}
            <button
              className="text-button"
              onClick={() => setShowReminder(true)}
            >
              {workspace.reminder ? "Change reminder" : "Schedule reminder"}{" "}
              <span aria-hidden="true">→</span>
            </button>
          </Card>
          <Card>
            <h2>Quick actions</h2>
            <div className="quick-actions">
              <button onClick={() => navigate("goals")}>+ Add goal</button>
              <button onClick={() => navigate("accomplishments")}>
                + Add accomplishment
              </button>
              <button onClick={() => navigate("refine")}>Refine writing</button>
              <button onClick={() => navigate("draft")}>View draft</button>
            </div>
          </Card>
        </div>
      </div>
      {showReminder && (
        <div className="inline-panel">
          <ReminderForm
            workspace={workspace}
            commit={commit}
            onClose={() => setShowReminder(false)}
          />
        </div>
      )}
    </>
  );
}
