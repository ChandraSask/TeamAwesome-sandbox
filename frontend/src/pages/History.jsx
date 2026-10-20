import { useState } from "react";
import Card from "../components/Card";
import PageHeading from "../components/PageHeading";
import { syntheticPriorCycle } from "../data/pfeDefaults";
import { formatDate } from "../pfeUtils";

export default function History({ workspace }) {
  const [viewing, setViewing] = useState(null);

  return (
    <>
      <PageHeading
        eyebrow="LOCAL ACTIVITY"
        title="History"
        description="Review changes and submitted demo snapshots from this browser."
      />
      <div className="history-layout">
        <section aria-labelledby="versions-title">
          <div className="section-heading">
            <h2 id="versions-title">PFE versions</h2>
          </div>
          <div className="record-list">
            {workspace.submissions.map((submission) => (
              <Card key={submission.id}>
                <div className="goal-header">
                  <strong>
                    {workspace.cycle.label} · Version {submission.version}
                  </strong>
                  <span className="status-badge complete">
                    {submission.status}
                  </span>
                </div>
                <p>
                  Submitted locally{" "}
                  {formatDate(submission.submittedAt, { includeTime: true })}
                </p>
                <button
                  className="text-button"
                  onClick={() => setViewing(submission)}
                >
                  View locked snapshot
                </button>
              </Card>
            ))}
            <Card>
              <div className="goal-header">
                <strong>{syntheticPriorCycle.cycle}</strong>
                <span className="status-badge">
                  {syntheticPriorCycle.status}
                </span>
              </div>
              <p>
                {syntheticPriorCycle.label} ·{" "}
                {formatDate(syntheticPriorCycle.submittedAt)}
              </p>
            </Card>
          </div>
        </section>
        <section aria-labelledby="activity-title">
          <div className="section-heading">
            <h2 id="activity-title">Activity</h2>
            <span className="count">{workspace.activity.length}</span>
          </div>
          <Card>
            <ol className="activity-list">
              {workspace.activity.map((item) => (
                <li key={item.id}>
                  <span className="activity-mark" aria-hidden="true" />
                  <div>
                    <strong>{item.action}</strong>
                    <span>
                      {formatDate(item.timestamp, { includeTime: true })}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </section>
      </div>
      {viewing && (
        <div className="modal-backdrop">
          <Card
            className="confirmation-dialog snapshot-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="snapshot-title"
          >
            <div className="section-heading">
              <h2 id="snapshot-title">Submitted version {viewing.version}</h2>
              <button
                className="text-button"
                onClick={() => setViewing(null)}
              >
                Close
              </button>
            </div>
            {viewing.evidence?.length > 0 && (
              <div className="snapshot-section">
                <strong>Included evidence</strong>
                <ul className="pfe-evidence-list">
                  {viewing.evidence.map((item) => (
                    <li key={item.id}>
                      <strong>{item.title}</strong>
                      <p>{item.contribution}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {Object.entries(viewing.sections).map(([key, text]) => (
              <div className="snapshot-section" key={key}>
                <strong>
                  {key.startsWith("goal-")
                    ? `Employee Results — ${
                        viewing.goals?.find(
                          (goal) => `goal-${goal.id}` === key,
                        )?.title || "Business Objective"
                      }`
                    : key.replace(/([A-Z])/g, " $1")}
                </strong>
                <p className="preserve-lines">{text}</p>
              </div>
            ))}
          </Card>
        </div>
      )}
    </>
  );
}
