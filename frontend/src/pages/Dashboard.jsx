import { useEffect, useState } from "react";
import Card from "../components/Card";
import PageHeading from "../components/PageHeading";
import {
  calculateProgress,
  currentNextReminder,
  formatDate,
  monthEndCountdown,
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

function MonthEndReminder({ countdown, onAdd }) {
  return (
    <div className={`month-end-reminder countdown-${countdown.tone}`}>
      <strong>
        {countdown.reminderDue ? "Month-end reminder" : "Monthly check-in"}
      </strong>
      <p>
        {countdown.daysRemaining === 0
          ? "Today is the last day of the month. Take a moment to capture your accomplishments."
          : `${countdown.daysRemaining} days until month end. ${
              countdown.reminderDue
                ? "Capture your accomplishments before the month ends."
                : "Keep adding accomplishments as you go."
            }`}
      </p>
      <p className="small">
        Automatic in-app reminders appear with fewer than 10 days remaining.
        They are separate from the demo schedule below. No email is sent.
      </p>
      {countdown.reminderDue && (
        <button className="text-button" type="button" onClick={onAdd}>
          Add this month's accomplishments
        </button>
      )}
    </div>
  );
}

function ReminderForm({ workspace, commit, onClose, countdown, onAdd }) {
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
      <MonthEndReminder countdown={countdown} onAdd={onAdd} />
      <form onSubmit={save}>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => update("enabled", event.target.checked)}
          />
          Enable this demo schedule
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
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setToday(new Date());
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const countdown = monthEndCountdown(today);
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
        <Card className="dashboard-metric metric-status">
          <span className="metric-label">PFE status</span>
          <strong className="metric-text">{status}</strong>
          <span className="muted">
            Last updated {formatDate(workspace.updatedAt)}
          </span>
        </Card>
        <Card className="dashboard-metric metric-progress">
          <span className="metric-label">Completion progress</span>
          <strong className="metric-value">{progress.percent}%</strong>
          <span className="muted">Preparation only, not performance</span>
        </Card>
        <Card className="dashboard-metric metric-goals">
          <span className="metric-label">Goals</span>
          <strong className="metric-value">{workspace.goals.length}</strong>
          <span className="muted">
            {workspace.goals.filter((goal) => goal.status === "Active").length}{" "}
            active
          </span>
        </Card>
        <Card className="dashboard-metric metric-accomplishments">
          <span className="metric-label">Accomplishments</span>
          <strong className="metric-value">
            {workspace.accomplishments.length}
          </strong>
          <span className="muted">Evidence captured this cycle</span>
        </Card>
      </div>
      <Card className={`month-end-card countdown-${countdown.tone}`}>
        <div>
          <span className="metric-label">Month-end countdown</span>
          <h2>
            {countdown.daysRemaining === 0
              ? "Month ends today"
              : `${countdown.daysRemaining} ${countdown.daysRemaining === 1 ? "day" : "days"} to month end`}
          </h2>
          <p>
            Monthly check-in: {formatDate(countdown.monthEnd, { dateStyle: "long" })}.
            {" "}Capture your accomplishments while they are fresh.
          </p>
          <span className="countdown-status">
            {countdown.daysRemaining === 0
              ? "Last day to update this month"
              : countdown.reminderDue
                ? "Reminder active: fewer than 10 days left"
                : "Time to prepare"}
          </span>
        </div>
        <button className="primary" onClick={() => navigate("accomplishments")}>
          + Add accomplishment
        </button>
      </Card>
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
              <div
                className={`milestone-row ${item.complete ? "milestone-complete" : "milestone-pending"}`}
                key={item.label}
              >
                <span aria-hidden="true">{item.complete ? "✓" : "○"}</span>
                <span>
                  {item.label}
                  <span className="sr-only">
                    {item.complete ? " - Complete" : " - To do"}
                  </span>
                </span>
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
                {workspace.reminder?.enabled ? "Demo schedule enabled" : "Demo schedule off"}
              </span>
            </div>
            <MonthEndReminder
              countdown={countdown}
              onAdd={() => navigate("accomplishments")}
            />
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
            countdown={countdown}
            onAdd={() => navigate("accomplishments")}
          />
        </div>
      )}
    </>
  );
}
