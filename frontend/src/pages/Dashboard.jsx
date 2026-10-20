import { useState } from "react";
import Card from "../components/Card";
import { goals, accomplishments, development } from "../data/workspace";

export default function Dashboard({ navigate }) {
  const [filter, setFilter] = useState("all");
  const shownGoals = goals.filter(
    (goal) =>
      filter === "all" ||
      (filter === "completed" ? goal.progress === 100 : goal.progress < 100),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PERFORMANCE & DEVELOPMENT</p>
          <h1>
            My dashboard<span className="accent">.</span>
          </h1>
          <p>A starting view of your goals, contributions, and learning.</p>
        </div>
        <button className="primary" onClick={() => navigate("notes")}>
          Capture a reflection <span aria-hidden="true">↗</span>
        </button>
      </div>
      <div className="sample-notice">
        <strong>Fictional example data</strong>
        <span>
          These records illustrate a possible workspace. Your team decides what
          to build.
        </span>
      </div>
      <div className="summary-grid">
        <Card>
          <span className="metric-label">Active goals</span>
          <strong className="metric-value">
            {goals.filter((goal) => goal.progress < 100).length}
          </strong>
          <span className="muted">Areas to keep moving forward</span>
        </Card>
        <Card>
          <span className="metric-label">Accomplishments</span>
          <strong className="metric-value">{accomplishments.length}</strong>
          <span className="muted">Contributions worth remembering</span>
        </Card>
        <Card>
          <span className="metric-label">Development activities</span>
          <strong className="metric-value">{development.length}</strong>
          <span className="muted">Opportunities to learn and grow</span>
        </Card>
      </div>
      <div className="dashboard-layout">
        <section aria-labelledby="goals-title">
          <div className="section-heading">
            <h2 id="goals-title">My goals</h2>
            <label className="filter-label">
              Show{" "}
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="all">All goals</option>
                <option value="active">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </label>
          </div>
          <div className="goal-list">
            {shownGoals.map((goal) => (
              <Card key={goal.id}>
                <div className="goal-header">
                  <span className="eyebrow">{goal.category}</span>
                  <span
                    className={`status-badge ${goal.progress === 100 ? "complete" : ""}`}
                  >
                    {goal.progress === 100 ? "Completed" : "In progress"}
                  </span>
                </div>
                <h3>{goal.title}</h3>
                <div className="progress-label">
                  <span>Example progress</span>
                  <strong>{goal.progress}%</strong>
                </div>
                <progress
                  value={goal.progress}
                  max="100"
                  aria-label={`${goal.title} example progress`}
                />
                <p className="goal-next">
                  <strong>Next step:</strong> {goal.nextStep}
                </p>
              </Card>
            ))}
          </div>
        </section>
        <div className="dashboard-side">
          <Card>
            <div className="section-heading">
              <h2>My development</h2>
            </div>
            {development.map((item) => (
              <div className="development-row" key={item.id}>
                <span className="muted">{item.type}</span>
                <h3>{item.title}</h3>
                <span className="status-badge">{item.status}</span>
              </div>
            ))}
          </Card>
          <Card className="reflection-card">
            <p className="eyebrow">A MOMENT TO REFLECT</p>
            <h2>What made a difference?</h2>
            <p>
              Think about a contribution, what you learned, or where you would
              like support.
            </p>
            <button className="text-button" onClick={() => navigate("notes")}>
              Write a reflection <span aria-hidden="true">→</span>
            </button>
          </Card>
        </div>
      </div>
      <section
        className="accomplishments-section"
        aria-labelledby="accomplishments-title"
      >
        <div className="section-heading">
          <h2 id="accomplishments-title">Recent accomplishments</h2>
          <span className="muted">Fictional examples</span>
        </div>
        <Card>
          {accomplishments.map((item) => (
            <div key={item.id} className="accomplishment-row">
              <span className="accomplishment-mark" aria-hidden="true">
                ✓
              </span>
              <div>
                <span className="eyebrow">{item.category}</span>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </div>
            </div>
          ))}
        </Card>
      </section>
    </>
  );
}
