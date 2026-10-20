import { useMemo, useState } from "react";
import Card from "../components/Card";
import PageHeading from "../components/PageHeading";
import { formatDate, sectionOptions, sourceOptions } from "../pfeUtils";
import { createId } from "../usePfeWorkspace";

function emptyAccomplishment() {
  return {
    title: "",
    accomplishmentDate: new Date().toISOString().slice(0, 10),
    contribution: "",
    outcome: "",
    goalId: "",
    source: "Manual Entry",
    tags: "",
    status: "Included",
    pfeSection: "Business Objectives",
  };
}

export default function Accomplishments({ workspace, commit, navigate }) {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyAccomplishment);
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState({
    goalId: "all",
    source: "all",
    status: "all",
  });

  const records = useMemo(
    () =>
      [...workspace.accomplishments]
        .filter(
          (item) =>
            (filters.goalId === "all" || item.goalId === filters.goalId) &&
            (filters.source === "all" || item.source === filters.source) &&
            (filters.status === "all" || item.status === filters.status),
        )
        .sort(
          (left, right) =>
            new Date(right.accomplishmentDate) -
            new Date(left.accomplishmentDate),
        ),
    [filters, workspace.accomplishments],
  );

  function startNew() {
    setEditingId("new");
    setForm(emptyAccomplishment());
    setMessage("");
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({ ...item, tags: item.tags.join(", ") });
    setMessage("");
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function save(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.contribution.trim()) {
      setMessage("Add a title and describe your contribution.");
      return;
    }
    const id =
      editingId === "new" ? createId("accomplishment") : editingId;
    const existing = workspace.accomplishments.find((item) => item.id === id);
    const record = {
      ...form,
      id,
      title: form.title.trim(),
      contribution: form.contribution.trim(),
      outcome: form.outcome.trim(),
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (
      commit(
        (current, timestamp) => {
          const accomplishments = existing
            ? current.accomplishments.map((item) =>
                item.id === id ? record : item,
              )
            : [record, ...current.accomplishments];
          const evidenceIds = accomplishments
            .filter((item) => item.status === "Included")
            .map((item) => item.id);
          const evidenceChanged =
            JSON.stringify(evidenceIds) !==
            JSON.stringify(current.draft.evidenceIds);
          const draftNeedsReview =
            evidenceChanged ||
            record.status === "Included" ||
            existing?.status === "Included";

          return {
            ...current,
            accomplishments,
            draft:
              current.draft.status === "Submitted to Manager"
                ? current.draft
                : {
                    ...current.draft,
                    status:
                      current.draft.status === "Not Started" &&
                      evidenceIds.length > 0
                        ? "Draft"
                        : current.draft.status,
                    evidenceIds,
                    finalReviewComplete: draftNeedsReview
                      ? false
                      : current.draft.finalReviewComplete,
                    lastSavedAt: draftNeedsReview
                      ? timestamp
                      : current.draft.lastSavedAt,
                  },
          };
        },
        {
          action: existing
            ? "Accomplishment updated"
            : "Accomplishment added",
          entityType: "accomplishment",
          entityId: id,
        },
      )
    ) {
      setEditingId(null);
      setMessage(
        workspace.draft.status === "Submitted to Manager"
          ? "Accomplishment saved. Start a new PFE revision to include it in a draft."
          : existing
            ? "Accomplishment updated and reflected in its PFE Draft section."
            : "Accomplishment saved and reflected in its PFE Draft section.",
      );
    }
  }

  function remove(item) {
    if (!window.confirm(`Delete “${item.title}”?`)) return;
    if (
      commit(
        (current, timestamp) => {
          const accomplishments = current.accomplishments.filter(
            (record) => record.id !== item.id,
          );
          const evidenceIds = accomplishments
            .filter((record) => record.status === "Included")
            .map((record) => record.id);
          const evidenceChanged =
            JSON.stringify(evidenceIds) !==
            JSON.stringify(current.draft.evidenceIds);

          return {
            ...current,
            accomplishments,
            draft:
              current.draft.status === "Submitted to Manager"
                ? current.draft
                : {
                    ...current.draft,
                    evidenceIds,
                    finalReviewComplete: evidenceChanged
                      ? false
                      : current.draft.finalReviewComplete,
                    lastSavedAt: evidenceChanged
                      ? timestamp
                      : current.draft.lastSavedAt,
                  },
          };
        },
        {
          action: "Accomplishment deleted",
          entityType: "accomplishment",
          entityId: item.id,
        },
      )
    ) {
      setMessage(
        workspace.draft.status === "Submitted to Manager"
          ? "Accomplishment deleted from current evidence. The locked submission is unchanged."
          : "Accomplishment deleted from its PFE Draft section.",
      );
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="YEAR-ROUND EVIDENCE"
        title="Accomplishments"
        description="Capture what you contributed while the details are still fresh."
        action={
          <button className="primary" onClick={startNew}>
            + Add accomplishment
          </button>
        }
      />
      <div className="sample-notice">
        <strong>Source labels are simulated</strong>
        <span>
          No email, document, OneNote, Loop, or Trello connection is active.
        </span>
      </div>
      <p className="status-message" role="status">
        {message}
      </p>
      {editingId && (
        <Card className="form-card">
          <div className="section-heading">
            <h2>
              {editingId === "new"
                ? "Add accomplishment"
                : "Edit accomplishment"}
            </h2>
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
              Title
              <input
                value={form.title}
                maxLength="140"
                onChange={(event) => update("title", event.target.value)}
                required
              />
            </label>
            <div className="form-grid">
              <label>
                Accomplishment date
                <input
                  type="date"
                  value={form.accomplishmentDate}
                  min={workspace.cycle.startDate}
                  max={workspace.cycle.endDate}
                  onChange={(event) =>
                    update("accomplishmentDate", event.target.value)
                  }
                  required
                />
              </label>
              <label>
                Related goal
                <select
                  value={form.goalId}
                  onChange={(event) => update("goalId", event.target.value)}
                >
                  <option value="">No goal</option>
                  {workspace.goals.map((goal) => (
                    <option value={goal.id} key={goal.id}>
                      {goal.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              What did you contribute?
              <textarea
                value={form.contribution}
                maxLength="2000"
                onChange={(event) =>
                  update("contribution", event.target.value)
                }
                required
              />
            </label>
            <label>
              Supported outcome or result (optional)
              <textarea
                value={form.outcome}
                maxLength="1500"
                onChange={(event) => update("outcome", event.target.value)}
                placeholder="Leave blank when the outcome is not known. Do not guess."
              />
            </label>
            <div className="form-grid">
              <label>
                Source
                <select
                  value={form.source}
                  onChange={(event) => update("source", event.target.value)}
                >
                  {sourceOptions.map((source) => (
                    <option key={source}>{source}</option>
                  ))}
                </select>
              </label>
              <label>
                PFE section
                <select
                  value={form.pfeSection}
                  onChange={(event) => update("pfeSection", event.target.value)}
                >
                  {sectionOptions.map((section) => (
                    <option key={section}>{section}</option>
                  ))}
                </select>
              </label>
              <label>
                Evidence status
                <select
                  value={form.status}
                  onChange={(event) => update("status", event.target.value)}
                >
                  <option>Included</option>
                  <option>Needs Review</option>
                  <option>Excluded</option>
                </select>
              </label>
              <label>
                Tags
                <input
                  value={form.tags}
                  onChange={(event) => update("tags", event.target.value)}
                  placeholder="workflow, quality"
                />
              </label>
            </div>
            <button className="primary">Save accomplishment</button>
          </form>
        </Card>
      )}
      <Card className="filter-bar">
        <strong>Filter evidence</strong>
        <label>
          Goal
          <select
            value={filters.goalId}
            onChange={(event) =>
              setFilters({ ...filters, goalId: event.target.value })
            }
          >
            <option value="all">All goals</option>
            <option value="">No goal</option>
            {workspace.goals.map((goal) => (
              <option value={goal.id} key={goal.id}>
                {goal.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Source
          <select
            value={filters.source}
            onChange={(event) =>
              setFilters({ ...filters, source: event.target.value })
            }
          >
            <option value="all">All sources</option>
            {sourceOptions.map((source) => (
              <option key={source}>{source}</option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            value={filters.status}
            onChange={(event) =>
              setFilters({ ...filters, status: event.target.value })
            }
          >
            <option value="all">All statuses</option>
            <option>Included</option>
            <option>Needs Review</option>
            <option>Excluded</option>
          </select>
        </label>
      </Card>
      {records.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">
            ✓
          </span>
          <h2>No accomplishments found</h2>
          <p>Capture your work throughout the year or change the filters.</p>
          <button className="primary" onClick={startNew}>
            Add an accomplishment
          </button>
        </div>
      ) : (
        <div className="record-list">
          {records.map((item) => {
            const goal = workspace.goals.find(
              (record) => record.id === item.goalId,
            );
            return (
              <Card key={item.id}>
                <div className="goal-header">
                  <span className="eyebrow">
                    {formatDate(item.accomplishmentDate)}
                  </span>
                  <span
                    className={`status-badge ${item.status === "Included" ? "complete" : ""}`}
                  >
                    {item.status}
                  </span>
                </div>
                <h2>{item.title}</h2>
                <p>{item.contribution}</p>
                {item.outcome && (
                  <p>
                    <strong>Outcome:</strong> {item.outcome}
                  </p>
                )}
                <dl className="record-details">
                  <div>
                    <dt>Goal</dt>
                    <dd>{goal?.title || "No goal"}</dd>
                  </div>
                  <div>
                    <dt>PFE section</dt>
                    <dd>{item.pfeSection}</dd>
                  </div>
                  <div>
                    <dt>Source</dt>
                    <dd>{item.source}</dd>
                  </div>
                </dl>
                {item.tags.length > 0 && (
                  <div className="tag-list">
                    {item.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                )}
                <div className="button-row">
                  <button
                    className="text-button"
                    onClick={() => startEdit(item)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-button"
                    onClick={() => navigate("refine")}
                  >
                    Refine
                  </button>
                  <button
                    className="danger-link"
                    onClick={() => remove(item)}
                  >
                    Delete
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
