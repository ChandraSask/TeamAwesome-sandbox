import { useState } from "react";
import Card from "../components/Card";
import PageHeading from "../components/PageHeading";
import { createId } from "../usePfeWorkspace";
import { formatDate } from "../pfeUtils";

const emptyGoal = {
  title: "",
  description: "",
  targetDate: "",
  status: "Active",
  notes: "",
};

export default function Goals({ workspace, commit }) {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyGoal);
  const [message, setMessage] = useState("");

  function startNew() {
    setEditingId("new");
    setForm(emptyGoal);
    setMessage("");
  }
  function startEdit(goal) {
    setEditingId(goal.id);
    setForm({
      title: goal.title,
      description: goal.description,
      targetDate: goal.targetDate,
      status: goal.status,
      notes: goal.notes,
    });
    setMessage("");
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function save(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      setMessage("Add a goal title and description.");
      return;
    }
    const id = editingId === "new" ? createId("goal") : editingId;
    const existing = workspace.goals.find((goal) => goal.id === id);
    const goal = {
      ...form,
      id,
      title: form.title.trim(),
      description: form.description.trim(),
      notes: form.notes.trim(),
      pfeYear: workspace.cycle.label,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (
      commit(
        (current) => ({
          ...current,
          goals: existing
            ? current.goals.map((item) => (item.id === id ? goal : item))
            : [goal, ...current.goals],
        }),
        {
          action: existing ? "Goal updated" : "Goal added",
          entityType: "goal",
          entityId: id,
        },
      )
    ) {
      setEditingId(null);
      setMessage(existing ? "Goal updated." : "Goal saved.");
    }
  }

  function remove(goal) {
    if (
      !window.confirm(
        `Delete “${goal.title}”? Linked accomplishments will be changed to No goal.`,
      )
    )
      return;
    if (
      commit(
        (current, timestamp) => ({
          ...current,
          goals: current.goals.filter((item) => item.id !== goal.id),
          accomplishments: current.accomplishments.map((item) =>
            item.goalId === goal.id
              ? { ...item, goalId: "", updatedAt: timestamp }
              : item,
          ),
        }),
        {
          action: "Goal deleted",
          entityType: "goal",
          entityId: goal.id,
        },
      )
    ) {
      setMessage("Goal deleted. Linked accomplishments now show No goal.");
    }
  }

  return (
    <>
      <PageHeading
        eyebrow={`PFE ${workspace.cycle.label}`}
        title="Goals"
        description="Keep your current objectives clear and connect evidence as the year progresses."
        action={
          <button className="primary" onClick={startNew}>
            + Add goal
          </button>
        }
      />
      <p className="status-message" role="status">
        {message}
      </p>
      {editingId && (
        <Card className="form-card">
          <div className="section-heading">
            <h2>{editingId === "new" ? "Add goal" : "Edit goal"}</h2>
            <button
              className="text-button"
              type="button"
              onClick={() => setEditingId(null)}
            >
              Cancel
            </button>
          </div>
          <form onSubmit={save}>
            <label>
              Goal title
              <input
                value={form.title}
                maxLength="120"
                onChange={(event) => update("title", event.target.value)}
                required
              />
            </label>
            <label>
              Description
              <textarea
                value={form.description}
                maxLength="1200"
                onChange={(event) => update("description", event.target.value)}
                required
              />
            </label>
            <div className="form-grid">
              <label>
                Target date (optional)
                <input
                  type="date"
                  value={form.targetDate}
                  min={workspace.cycle.startDate}
                  max={workspace.cycle.endDate}
                  onChange={(event) => update("targetDate", event.target.value)}
                />
              </label>
              <label>
                Status
                <select
                  value={form.status}
                  onChange={(event) => update("status", event.target.value)}
                >
                  <option>Active</option>
                  <option>Completed</option>
                </select>
              </label>
            </div>
            <label>
              Notes (optional)
              <textarea
                value={form.notes}
                maxLength="1000"
                onChange={(event) => update("notes", event.target.value)}
              />
            </label>
            <button className="primary">Save goal</button>
          </form>
        </Card>
      )}
      {workspace.goals.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">
            ◎
          </span>
          <h2>No goals yet</h2>
          <p>Add a goal so accomplishments can be connected to it.</p>
          <button className="primary" onClick={startNew}>
            Add your first goal
          </button>
        </div>
      ) : (
        <div className="record-grid">
          {workspace.goals.map((goal) => (
            <Card key={goal.id}>
              <div className="goal-header">
                <span className="eyebrow">PFE {goal.pfeYear}</span>
                <span
                  className={`status-badge ${goal.status === "Completed" ? "complete" : ""}`}
                >
                  {goal.status}
                </span>
              </div>
              <h2>{goal.title}</h2>
              <p>{goal.description}</p>
              <dl className="record-details">
                <div>
                  <dt>Target</dt>
                  <dd>{formatDate(goal.targetDate)}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>{formatDate(goal.updatedAt)}</dd>
                </div>
              </dl>
              {goal.notes && <p className="small">{goal.notes}</p>}
              <div className="button-row">
                <button className="text-button" onClick={() => startEdit(goal)}>
                  Edit
                </button>
                <button
                  className="danger-link"
                  onClick={() => remove(goal)}
                >
                  Delete
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
