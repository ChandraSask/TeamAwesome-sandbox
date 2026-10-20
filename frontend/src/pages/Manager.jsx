import { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import PageHeading from "../components/PageHeading";

const roles = [
  "Tester",
  "Test Lead",
  "System Analyst",
  "Programmer Analyst",
  "Business Analyst",
];

const initialEmployees = [
  { id: "employee-1", name: "Avery Chen", initials: "AC", role: "Tester" },
  { id: "employee-2", name: "Morgan Patel", initials: "MP", role: "Business Analyst" },
  { id: "employee-3", name: "Riley Thompson", initials: "RT", role: "System Analyst" },
  { id: "employee-4", name: "Jamie Okafor", initials: "JO", role: "Programmer Analyst" },
  { id: "employee-5", name: "Casey Martin", initials: "CM", role: "Test Lead" },
];

const initialEvidence = [
  {
    id: "evidence-1",
    employeeId: "employee-1",
    title: "Expanded regression test coverage",
    category: "Quality",
    date: "2026-09-12",
    description:
      "Reviewed repeatable regression scenarios and documented candidates for automation.",
    status: "Awaiting Review",
    reviews: [],
  },
  {
    id: "evidence-2",
    employeeId: "employee-1",
    title: "Updated test handoff checklist",
    category: "Teamwork",
    date: "2026-08-28",
    description:
      "Worked with teammates to clarify the steps used when handing test findings to the next shift.",
    status: "Approved",
    reviews: [
      {
        type: "Approval Note",
        text: "Clear example of improving a shared team process.",
        date: "2026-09-02",
      },
    ],
  },
  {
    id: "evidence-3",
    employeeId: "employee-2",
    title: "Mapped a service request workflow",
    category: "Business Objectives",
    date: "2026-09-18",
    description:
      "Documented the current request steps and reviewed the draft with two process partners.",
    status: "Needs Revision",
    reviews: [
      {
        type: "Revision Request",
        text: "Could you add one example of how the updated map helped a partner?",
        date: "2026-09-23",
      },
    ],
  },
  {
    id: "evidence-4",
    employeeId: "employee-3",
    title: "Prepared system change notes",
    category: "Knowledge Sharing",
    date: "2026-10-02",
    description:
      "Collected system behavior notes and shared a concise reference with the project group.",
    status: "Awaiting Review",
    reviews: [],
  },
  {
    id: "evidence-5",
    employeeId: "employee-4",
    title: "Improved a validation helper",
    category: "Quality",
    date: "2026-09-05",
    description:
      "Adjusted a validation helper and checked the expected behavior using fictional sample values.",
    status: "Rejected",
    reviews: [
      {
        type: "Rejection Reason",
        text: "Please remove the unverified outcome claim and resubmit with the observed result.",
        date: "2026-09-11",
      },
    ],
  },
  {
    id: "evidence-6",
    employeeId: "employee-5",
    title: "Coordinated a test planning session",
    category: "Teamwork",
    date: "2026-10-04",
    description:
      "Facilitated a planning discussion and captured the team's agreed test areas.",
    status: "Awaiting Review",
    reviews: [],
  },
];

const initialGoals = [
  {
    id: "goal-1",
    role: "Tester",
    title: "Improve regression test automation coverage",
    description:
      "Identify suitable regression scenarios and document repeatable automation candidates.",
    measure: "Set a team-agreed measure during a check-in.",
    active: true,
  },
  {
    id: "goal-2",
    role: "Business Analyst",
    title: "Improve process documentation",
    description:
      "Keep a selected process map current and review it with its partners.",
    measure: "Agree on a review cadence with the team.",
    active: true,
  },
  {
    id: "goal-3",
    role: "System Analyst",
    title: "Share system knowledge",
    description:
      "Create concise reference notes for a frequently used system workflow.",
    measure: "Confirm usefulness with the intended readers.",
    active: true,
  },
  {
    id: "goal-4",
    role: "Programmer Analyst",
    title: "Strengthen validation guidance",
    description:
      "Document clear validation examples for a selected development workflow.",
    measure: "Review the examples with a teammate.",
    active: false,
  },
];

const sections = ["Overview", "My Team", "Review Queue", "Goal Catalog", "Review Sessions"];
const sectionIcons = {
  Overview: "▦",
  "My Team": "♙",
  "Review Queue": "✓",
  "Goal Catalog": "◎",
  "Review Sessions": "▣",
};
const reviewStatuses = ["Awaiting Review", "Approved", "Rejected", "Needs Revision"];

function StatusBadge({ status }) {
  const statusClass = status.toLowerCase().replaceAll(" ", "-");
  return <span className={`manager-status manager-status-${statusClass}`}>{status}</span>;
}

function formatDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function Manager({ onNotificationsChange, reviewQueueRequest }) {
  const [section, setSection] = useState("Overview");
  const [employees] = useState(initialEmployees);
  const [evidence, setEvidence] = useState(initialEvidence);
  const [goals, setGoals] = useState(initialGoals);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [goalRoleFilter, setGoalRoleFilter] = useState("All roles");
  const [goalSearch, setGoalSearch] = useState("");
  const [goalFormOpen, setGoalFormOpen] = useState(false);
  const [goalError, setGoalError] = useState("");
  const [reviewType, setReviewType] = useState("Comment");
  const [reviewText, setReviewText] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [scheduleEmployeeId, setScheduleEmployeeId] = useState(null);
  const [schedulePreview, setSchedulePreview] = useState(null);
  const [scheduleError, setScheduleError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId);
  const selectedEvidence = evidence.find((item) => item.id === selectedEvidenceId);
  const awaitingCount = evidence.filter((item) => item.status === "Awaiting Review").length;
  const filteredEvidence = useMemo(
    () =>
      evidence.filter((item) => {
        const employee = employees.find((person) => person.id === item.employeeId);
        return (
          (statusFilter === "All statuses" || item.status === statusFilter) &&
          (!selectedEmployeeId || item.employeeId === selectedEmployeeId) &&
          Boolean(employee)
        );
      }),
    [employees, evidence, selectedEmployeeId, statusFilter],
  );
  const filteredGoals = goals.filter((goal) => {
    const matchesRole = goalRoleFilter === "All roles" || goal.role === goalRoleFilter;
    const search = goalSearch.trim().toLowerCase();
    return (
      matchesRole &&
      (!search ||
        goal.title.toLowerCase().includes(search) ||
        goal.description.toLowerCase().includes(search))
    );
  });
  const managerNotifications = useMemo(
    () =>
      evidence
        .filter((item) => item.status === "Awaiting Review")
        .map((item) => ({
          id: item.id,
          title: item.title,
          message: `${employees.find((person) => person.id === item.employeeId)?.name} has evidence awaiting review.`,
          destination: "manager-review-queue",
        })),
    [employees, evidence],
  );

  useEffect(() => {
    onNotificationsChange(managerNotifications);
  }, [managerNotifications, onNotificationsChange]);

  useEffect(() => {
    if (reviewQueueRequest > 0) setSection("Review Queue");
  }, [reviewQueueRequest]);

  function openReview(item) {
    setSelectedEvidenceId(item.id);
    setReviewType("Comment");
    setReviewText("");
    setReviewError("");
  }

  function saveReview(nextStatus = selectedEvidence?.status) {
    if (!selectedEvidence) return;
    const text = reviewText.trim();
    if (
      (nextStatus === "Rejected" || nextStatus === "Needs Revision") &&
      !text
    ) {
      setReviewError("Add a reason or revision request before continuing.");
      return;
    }
    if (!text && nextStatus === selectedEvidence.status) {
      setReviewError("Write a comment or suggestion before adding feedback.");
      return;
    }
    const type =
      nextStatus !== selectedEvidence.status
        ? nextStatus === "Approved"
          ? "Approval Note"
          : nextStatus === "Rejected"
            ? "Rejection Reason"
            : "Revision Request"
        : reviewType;
    setEvidence((current) =>
      current.map((item) =>
        item.id === selectedEvidence.id
          ? {
              ...item,
              status: nextStatus,
              reviews: [
                ...item.reviews,
                {
                  type,
                  text,
                  author: "Jordan Lee",
                  date: new Date().toISOString().slice(0, 10),
                  reviewedAt: new Date().toISOString(),
                },
              ],
            }
          : item,
      ),
    );
    setSelectedEvidenceId(null);
    setNotice("Review updated for this demo session. No employee data was shared.");
  }

  function addGoal(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") || "").trim();
    const role = String(formData.get("role") || "");
    const description = String(formData.get("description") || "").trim();
    const measure = String(formData.get("measure") || "").trim();
    if (!title || !roles.includes(role) || !description) {
      setGoalError("Add a title, description, and supported role to create a goal.");
      return;
    }
    setGoals((current) => [
      {
        id: `goal-${Date.now()}`,
        role,
        title,
        description,
        measure,
        active: true,
      },
      ...current,
    ]);
    setGoalFormOpen(false);
    setGoalError("");
    setNotice("Candidate goal added for this demo session only.");
  }

  function toggleGoal(goalId) {
    setGoals((current) =>
      current.map((goal) =>
        goal.id === goalId ? { ...goal, active: !goal.active } : goal,
      ),
    );
  }

  function saveSchedule(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const date = String(formData.get("date") || "");
    const start = String(formData.get("start") || "");
    const end = String(formData.get("end") || "");
    const agenda = String(formData.get("agenda") || "").trim();
    if (!date || !start || !end || end <= start) {
      setScheduleError("Choose a date and an end time later than the start time.");
      return;
    }
    const employee = employees.find((person) => person.id === scheduleEmployeeId);
    setSchedulePreview({
      employeeName: employee.name,
      subject: `PFE Review - ${employee.name}`,
      date,
      start,
      end,
      agenda,
    });
    setScheduleError("");
    setScheduleEmployeeId(null);
    setNotice("Meeting details are ready to review. No calendar invite was sent.");
  }

  function navigateToQueue(employeeId = null) {
    setSelectedEmployeeId(employeeId);
    setStatusFilter("Awaiting Review");
    setSection("Review Queue");
  }

  return (
    <div className="manager-page">
      <div className="manager-demo-banner" role="note">
        <strong>Fictional manager demo</strong>
        <span>Actions reset when you refresh. This is not sign-in, approval, or shared storage.</span>
      </div>
      {notice && (
        <div className="alert success" role="status">
          {notice}
        </div>
      )}
      <PageHeading
        eyebrow="PFE MADE EASY · MANAGER DEMO"
        title="Manager workspace"
        description="A sample space to explore evidence review, team goals, and check-in planning."
        icon="▦"
      />
      <nav className="manager-tabs" aria-label="Manager demo sections">
        {sections.map((item) => (
          <button
            key={item}
            type="button"
            className={section === item ? "manager-tab selected" : "manager-tab"}
            aria-current={section === item ? "page" : undefined}
            onClick={() => {
              setSection(item);
              setSelectedEmployeeId(null);
              setNotice("");
            }}
          >
            <span className="manager-tab-icon" aria-hidden="true">{sectionIcons[item]}</span>
            {item}
            {item === "Review Queue" && <span className="manager-tab-count">{awaitingCount}</span>}
          </button>
        ))}
      </nav>

      {section === "Overview" && (
        <>
          <div className="summary-grid manager-metrics">
            <Card>
              <span className="manager-metric-label"><span aria-hidden="true">♙</span> SAMPLE TEAM</span>
              <strong className="metric-text">{employees.length}</strong>
              <p>Fictional direct reports</p>
            </Card>
            <Card>
              <span className="manager-metric-label"><span aria-hidden="true">✓</span> AWAITING REVIEW</span>
              <strong className="metric-text">{awaitingCount}</strong>
              <p>Sample evidence items</p>
            </Card>
            <Card>
              <span className="manager-metric-label"><span aria-hidden="true">◎</span> ROLE GOALS</span>
              <strong className="metric-text">{goals.filter((goal) => goal.active).length}</strong>
              <p>Active sample goals</p>
            </Card>
          </div>
          <div className="manager-overview-grid">
            <Card>
              <div className="section-heading">
                <h2><span className="manager-section-icon" aria-hidden="true">♙</span>My team</h2>
                <button className="text-button" onClick={() => setSection("My Team")}>
                  View team <span aria-hidden="true">→</span>
                </button>
              </div>
              <div className="manager-employee-list">
                {employees.map((employee) => {
                  const employeeEvidence = evidence.filter(
                    (item) => item.employeeId === employee.id,
                  );
                  const waiting = employeeEvidence.filter(
                    (item) => item.status === "Awaiting Review",
                  ).length;
                  return (
                    <div className="manager-employee-row" key={employee.id}>
                      <span className="manager-avatar" aria-hidden="true">{employee.initials}</span>
                      <div className="manager-employee-name">
                        <strong>{employee.name}</strong>
                        <span>{employee.role}</span>
                      </div>
                      <span className="muted">{waiting} to review</span>
                      <button
                        className="text-button"
                        onClick={() => {
                          setSelectedEmployeeId(employee.id);
                          setSection("My Team");
                        }}
                      >
                        Open
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card>
              <div className="section-heading">
                <h2><span className="manager-section-icon" aria-hidden="true">✓</span>Review queue</h2>
                <span className="count">{awaitingCount}</span>
              </div>
              <p>Items submitted in the fictional sample workspace.</p>
              <button className="primary" onClick={() => navigateToQueue()}>
                Review sample evidence
              </button>
              <div className="manager-role-note">
                <strong>Role goal catalog</strong>
                <p>Sample goals are grouped by the five roles from the prompt.</p>
                <button className="text-button" onClick={() => setSection("Goal Catalog")}>
                  Browse goals <span aria-hidden="true">→</span>
                </button>
              </div>
            </Card>
          </div>
        </>
      )}

      {section === "My Team" && (
        <>
          <PageHeading
            eyebrow="SAMPLE TEAM"
            title={selectedEmployee ? selectedEmployee.name : "My team"}
            icon="♙"
            description={
              selectedEmployee
                ? `${selectedEmployee.role} · Sample employee profile and evidence`
                : "Select a fictional team member to view their evidence."
            }
          />
          {selectedEmployee ? (
            <Card>
              <div className="section-heading">
                <h2><span className="manager-section-icon" aria-hidden="true">▤</span>Evidence history</h2>
                <button
                  className="secondary-button"
                  onClick={() => setScheduleEmployeeId(selectedEmployee.id)}
                >
                  Plan a 1-on-1
                </button>
              </div>
              <div className="manager-evidence-list">
                {evidence
                  .filter((item) => item.employeeId === selectedEmployee.id)
                  .map((item) => (
                    <EvidenceRow
                      key={item.id}
                      item={item}
                      onReview={() => openReview(item)}
                    />
                  ))}
              </div>
              <h3 className="manager-subheading">Active goals for {selectedEmployee.role}</h3>
              {goals.filter((goal) => goal.active && goal.role === selectedEmployee.role).length ? (
                goals
                  .filter((goal) => goal.active && goal.role === selectedEmployee.role)
                  .map((goal) => (
                    <div className="manager-goal-row" key={goal.id}>
                      <strong>{goal.title}</strong>
                      <span>{goal.description}</span>
                    </div>
                  ))
              ) : (
                <p>No active sample goals are set up for this role yet.</p>
              )}
            </Card>
          ) : (
            <Card>
              <div className="manager-employee-list">
                {employees.map((employee) => (
                  <div className="manager-employee-row" key={employee.id}>
                    <span className="manager-avatar" aria-hidden="true">{employee.initials}</span>
                    <div className="manager-employee-name">
                      <strong>{employee.name}</strong>
                      <span>{employee.role}</span>
                    </div>
                    <span className="muted">
                      {evidence.filter((item) => item.employeeId === employee.id).length} evidence items
                    </span>
                    <button
                      className="secondary-button"
                      onClick={() => setSelectedEmployeeId(employee.id)}
                    >
                      View profile
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {section === "Review Queue" && (
        <>
          <PageHeading
            eyebrow="EVIDENCE REVIEW"
            title="Review queue"
            description="Read the employee's original entry, then add separate feedback or a sample review decision."
            icon="✓"
          />
          <div className="manager-filter-row">
            <label>
              Employee
              <select
                value={selectedEmployeeId || ""}
                onChange={(event) => setSelectedEmployeeId(event.target.value || null)}
              >
                <option value="">All sample employees</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.name}</option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option>All statuses</option>
                {reviewStatuses.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
          </div>
          <Card>
            {filteredEvidence.length ? (
              <div className="manager-evidence-list">
                {filteredEvidence.map((item) => (
                  <EvidenceRow key={item.id} item={item} onReview={() => openReview(item)} />
                ))}
              </div>
            ) : (
              <div className="manager-empty">
                <strong>No sample evidence matches these filters.</strong>
                <p>Choose another status or employee to see more entries.</p>
              </div>
            )}
          </Card>
        </>
      )}

      {section === "Goal Catalog" && (
        <>
          <PageHeading
            eyebrow="ROLE GOAL CATALOG"
            title="Candidate goals"
            description="Explore fictional goal examples, filter by role, or add a goal for this demo session."
            action={
              <button className="primary" onClick={() => setGoalFormOpen((open) => !open)}>
                {goalFormOpen ? "Close form" : "Add a goal"}
              </button>
            }
            icon="◎"
          />
          <div className="manager-filter-row">
            <label>
              Search goals
              <input
                type="search"
                value={goalSearch}
                onChange={(event) => setGoalSearch(event.target.value)}
                placeholder="Search title or description"
              />
            </label>
            <label>
              Role
              <select value={goalRoleFilter} onChange={(event) => setGoalRoleFilter(event.target.value)}>
                <option>All roles</option>
                {roles.map((role) => <option key={role}>{role}</option>)}
              </select>
            </label>
          </div>
          {goalFormOpen && (
            <Card className="manager-goal-form">
              <h2>Add a candidate goal</h2>
              <p>Choose one of the supported sample roles. This goal is not shared with employees.</p>
              <form onSubmit={addGoal}>
                <div className="form-grid">
                  <label>
                    Role
                    <select name="role" defaultValue="" required>
                      <option value="" disabled>Select a role</option>
                      {roles.map((role) => <option key={role}>{role}</option>)}
                    </select>
                  </label>
                  <label>
                    Goal title
                    <input name="title" required maxLength="120" />
                  </label>
                  <label className="manager-field-full">
                    Description
                    <textarea name="description" required maxLength="600" />
                  </label>
                  <label className="manager-field-full">
                    Suggested success measure
                    <textarea name="measure" maxLength="300" />
                  </label>
                </div>
                {goalError && <p className="field-error" role="alert">{goalError}</p>}
                <div className="button-row">
                  <button className="primary" type="submit">Add sample goal</button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      setGoalFormOpen(false);
                      setGoalError("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </Card>
          )}
          <div className="manager-goal-list">
            {filteredGoals.length ? filteredGoals.map((goal) => (
              <Card key={goal.id} className="manager-goal-card">
                <div className="manager-goal-card-top">
                  <span className="manager-role-chip">{goal.role}</span>
                  <StatusBadge status={goal.active ? "Active" : "Inactive"} />
                </div>
                <h2>{goal.title}</h2>
                <p>{goal.description}</p>
                {goal.measure && (
                  <p className="manager-measure"><strong>Suggested measure:</strong> {goal.measure}</p>
                )}
                <button className="secondary-button" onClick={() => toggleGoal(goal.id)}>
                  {goal.active ? "Deactivate" : "Activate"}
                </button>
              </Card>
            )) : (
              <div className="manager-empty">
                <strong>No goals match your search.</strong>
                <p>Try another role or search phrase.</p>
              </div>
            )}
          </div>
        </>
      )}

      {section === "Review Sessions" && (
        <>
          <PageHeading
            eyebrow="CHECK-IN PLANNING"
            title="Review sessions"
            description="Prepare a meeting preview for a fictional team member. Calendar integration is not connected."
            icon="▣"
          />
          <Card>
            <div className="section-heading">
              <h2>Plan a 1-on-1</h2>
            </div>
            <p>Choose an employee to review meeting details before any action.</p>
            <div className="manager-employee-list">
              {employees.map((employee) => (
                <div className="manager-employee-row" key={employee.id}>
                  <span className="manager-avatar" aria-hidden="true">{employee.initials}</span>
                  <div className="manager-employee-name">
                    <strong>{employee.name}</strong>
                    <span>{employee.role}</span>
                  </div>
                  <button
                    className="secondary-button"
                    onClick={() => setScheduleEmployeeId(employee.id)}
                  >
                    Prepare meeting
                  </button>
                </div>
              ))}
            </div>
          </Card>
          {schedulePreview && (
            <Card className="manager-preview-card">
              <span className="eyebrow">MEETING PREVIEW · NOT SENT</span>
              <h2>{schedulePreview.subject}</h2>
              <p>
                {formatDate(schedulePreview.date)} · {schedulePreview.start}–{schedulePreview.end}
              </p>
              <p><strong>Organizer:</strong> Jordan Lee (fictional manager)</p>
              <p><strong>Attendee:</strong> {schedulePreview.employeeName} (fictional employee)</p>
              <p><strong>Agenda:</strong> {schedulePreview.agenda || "Review recent evidence, feedback, goals, and next steps."}</p>
              <button className="secondary-button" onClick={() => setSchedulePreview(null)}>
                Close preview
              </button>
            </Card>
          )}
        </>
      )}

      {selectedEvidence && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedEvidenceId(null);
        }}>
          <section
            className="card manager-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manager-evidence-title"
          >
            <div className="section-heading">
              <div>
                <span className="eyebrow">EMPLOYEE EVIDENCE · ORIGINAL TEXT</span>
                <h2 id="manager-evidence-title">{selectedEvidence.title}</h2>
              </div>
              <button
                className="manager-close"
                aria-label="Close evidence review"
                onClick={() => setSelectedEvidenceId(null)}
              >
                ×
              </button>
            </div>
            <div className="manager-evidence-meta">
              <span>{employees.find((person) => person.id === selectedEvidence.employeeId)?.name}</span>
              <span>{selectedEvidence.category}</span>
              <span>{formatDate(selectedEvidence.date)}</span>
              <StatusBadge status={selectedEvidence.status} />
            </div>
            <div className="manager-original-evidence">
              <strong>Employee's description</strong>
              <p>{selectedEvidence.description}</p>
            </div>
            <div className="manager-review-history">
              <h3>Manager feedback history</h3>
              {selectedEvidence.reviews.length ? (
                selectedEvidence.reviews.map((review, index) => (
                  <div className="manager-review-entry" key={`${review.date}-${index}`}>
                    <strong>{review.type}</strong>
                    <span>
                      {review.author || "Jordan Lee"} ·{" "}
                      {review.reviewedAt
                        ? new Date(review.reviewedAt).toLocaleString()
                        : formatDate(review.date)}
                    </span>
                    <p>{review.text}</p>
                  </div>
                ))
              ) : <p>No manager feedback has been added to this sample item.</p>}
            </div>
            <label>
              Feedback type
              <select value={reviewType} onChange={(event) => setReviewType(event.target.value)}>
                <option>Comment</option>
                <option>Suggestion</option>
              </select>
            </label>
            <label>
              Manager feedback
              <textarea
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                placeholder="Keep feedback separate from the employee's description."
                maxLength="600"
              />
            </label>
            {reviewError && <p className="field-error" role="alert">{reviewError}</p>}
            <div className="manager-decision-actions">
              <button className="secondary-button" onClick={() => saveReview()}>
                Add feedback
              </button>
              <button className="manager-approve" onClick={() => saveReview("Approved")}>
                Approve sample
              </button>
              <button className="manager-revision" onClick={() => saveReview("Needs Revision")}>
                Request revision
              </button>
              <button className="danger-button" onClick={() => saveReview("Rejected")}>
                Reject sample
              </button>
            </div>
            <p className="small">Actions are examples only and are not saved or sent to an employee.</p>
          </section>
        </div>
      )}

      {scheduleEmployeeId && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setScheduleEmployeeId(null);
        }}>
          <section
            className="card manager-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manager-schedule-title"
          >
            <div className="section-heading">
              <h2 id="manager-schedule-title">Prepare a 1-on-1</h2>
              <button
                className="manager-close"
                aria-label="Close meeting form"
                onClick={() => setScheduleEmployeeId(null)}
              >
                ×
              </button>
            </div>
            <p>
              {`PFE Review - ${employees.find((person) => person.id === scheduleEmployeeId)?.name}`}
              <br />Organizer: Jordan Lee (fictional manager)
            </p>
            <form onSubmit={saveSchedule}>
              <div className="form-grid">
                <label>
                  Date
                  <input name="date" type="date" required />
                </label>
                <label>
                  Start time
                  <input name="start" type="time" required />
                </label>
                <label>
                  End time
                  <input name="end" type="time" required />
                </label>
                <label className="manager-field-full">
                  Agenda
                  <textarea
                    name="agenda"
                    defaultValue="Review recent evidence; discuss feedback and goals; agree on follow-up actions."
                    maxLength="500"
                  />
                </label>
              </div>
              {scheduleError && <p className="field-error" role="alert">{scheduleError}</p>}
              <div className="button-row">
                <button className="primary" type="submit">Review meeting preview</button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setScheduleEmployeeId(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
            <p className="small">This only prepares a preview. No Teams or Outlook invite will be created.</p>
          </section>
        </div>
      )}
    </div>
  );
}

function EvidenceRow({ item, onReview }) {
  const employee = initialEmployees.find((person) => person.id === item.employeeId);
  return (
    <div className="manager-evidence-row">
      <div className="manager-evidence-title">
        <strong>{item.title}</strong>
        <span>{employee?.name} · {item.category} · {formatDate(item.date)}</span>
      </div>
      <StatusBadge status={item.status} />
      <button className="secondary-button" onClick={onReview}>Open review</button>
    </div>
  );
}
