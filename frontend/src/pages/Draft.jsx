import { useState } from "react";
import Card from "../components/Card";
import PageHeading from "../components/PageHeading";
import SaskTelLogo from "../components/SaskTelLogo";
import { formatDate } from "../pfeUtils";
import { createId } from "../usePfeWorkspace";

function EvidenceList({ evidence }) {
  if (evidence.length === 0) {
    return <p className="pfe-no-evidence">No included evidence in this section yet.</p>;
  }

  return (
    <ul className="pfe-evidence-list">
      {evidence.map((item) => (
        <li key={item.id}>
          <strong>{item.title}</strong>
          <p>{item.contribution}</p>
          {item.outcome && (
            <p>
              <strong>Outcome:</strong> {item.outcome}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

function SectionInput({
  id,
  label,
  value,
  readOnly,
  onChange,
  placeholder = "Add your employee comments here.",
}) {
  return (
    <label className="pfe-entry-field" htmlFor={id}>
      <span>{label}</span>
      <textarea
        id={id}
        className="pfe-entry-input"
        value={value}
        readOnly={readOnly}
        maxLength="4000"
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export default function Draft({ workspace, commit }) {
  const latestSubmission = workspace.submissions[0];
  const submittedAndLocked =
    latestSubmission && workspace.draft.status === "Submitted to Manager";
  const [sections, setSections] = useState(() =>
    submittedAndLocked ? latestSubmission.sections : workspace.draft.sections,
  );
  const [profileDetails, setProfileDetails] = useState(() => {
    const profile = submittedAndLocked
      ? latestSubmission.profile || workspace.profile
      : workspace.profile;
    return {
      jobTitle: profile.jobTitle || "",
      presentJobLength: profile.presentJobLength || "",
    };
  });
  const [finalReview, setFinalReview] = useState(
    workspace.draft.finalReviewComplete,
  );
  const [message, setMessage] = useState("");
  const [showSubmit, setShowSubmit] = useState(false);

  const includedEvidence = submittedAndLocked
    ? latestSubmission.evidence ||
      workspace.accomplishments.filter((item) =>
        (latestSubmission.evidenceIds || []).includes(item.id),
      )
    : workspace.accomplishments.filter((item) => item.status === "Included");

  function evidenceFor(mapping, goalId) {
    return includedEvidence.filter(
      (item) =>
        item.pfeSection === mapping &&
        (goalId === undefined || item.goalId === goalId),
    );
  }

  function updateSection(key, value) {
    setSections((current) => ({ ...current, [key]: value }));
    setFinalReview(false);
  }

  function updateProfile(field, value) {
    setProfileDetails((current) => ({ ...current, [field]: value }));
    setFinalReview(false);
  }

  function saveDraft() {
    const evidenceIds = includedEvidence.map((item) => item.id);
    if (
      commit(
        (current, timestamp) => ({
          ...current,
          profile: { ...current.profile, ...profileDetails },
          draft: {
            ...current.draft,
            status: "Draft",
            sections,
            evidenceIds,
            finalReviewComplete: finalReview,
            lastSavedAt: timestamp,
          },
        }),
        {
          action: "PFE draft saved",
          entityType: "draft",
          entityId: `draft-v${workspace.draft.version}`,
        },
      )
    ) {
      setMessage("Draft saved in this browser. No manager was notified.");
    }
  }

  function submit() {
    if (!finalReview) {
      setMessage("Review the updated draft before submitting.");
      setShowSubmit(false);
      return;
    }
    const timestamp = new Date().toISOString();
    const evidence = includedEvidence.map((item) => ({ ...item }));
    const submission = {
      id: createId("submission"),
      version: workspace.draft.version,
      submittedAt: timestamp,
      submittedBy: workspace.profile.id,
      managerId: workspace.profile.managerId,
      managerName: workspace.profile.managerName,
      status: "Submitted to Manager",
      sections: { ...sections },
      profile: { ...workspace.profile, ...profileDetails },
      goals: workspace.goals.map(({ id, title, description }) => ({
        id,
        title,
        description,
      })),
      evidence,
      evidenceIds: evidence.map((item) => item.id),
    };
    if (
      commit(
        (current) => ({
          ...current,
          profile: { ...current.profile, ...profileDetails },
          draft: {
            ...current.draft,
            status: "Submitted to Manager",
            sections,
            evidenceIds: [...submission.evidenceIds],
            finalReviewComplete: true,
            lastSavedAt: timestamp,
          },
          submissions: [submission, ...current.submissions],
        }),
        {
          action: `PFE version ${submission.version} submitted (demo)`,
          entityType: "submission",
          entityId: submission.id,
        },
      )
    ) {
      setShowSubmit(false);
      setMessage(
        "Version locked as Submitted to Manager. This is a local simulation; no manager was notified.",
      );
    }
  }

  function startRevision() {
    const nextVersion = latestSubmission.version + 1;
    if (
      commit(
        (current) => ({
          ...current,
          draft: {
            version: nextVersion,
            status: "Draft",
            sections: { ...latestSubmission.sections },
            evidenceIds: [...latestSubmission.evidenceIds],
            finalReviewComplete: false,
            lastSavedAt: null,
          },
        }),
        {
          action: `PFE draft version ${nextVersion} started`,
          entityType: "draft",
          entityId: `draft-v${nextVersion}`,
        },
      )
    ) {
      setSections({ ...latestSubmission.sections });
      setFinalReview(false);
      setMessage(`Editable draft version ${nextVersion} started.`);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow={`PFE ${workspace.cycle.label} · VERSION ${workspace.draft.version}`}
        title="PFE Draft"
        description="Review the employee sections in the same order as the 2026–2027 PFE template."
        action={
          submittedAndLocked ? (
            <button className="primary" onClick={startRevision}>
              Start new revision
            </button>
          ) : (
            <button className="primary" onClick={saveDraft}>
              Save as Draft
            </button>
          )
        }
      />
      <div className="sample-notice">
        <strong>Employee draft only</strong>
        <span>
          Included accomplishments appear automatically in their selected
          section. Manager ratings, manager comments, and signatures are not
          included.
        </span>
      </div>
      {submittedAndLocked && (
        <div className="alert success">
          Version {latestSubmission.version} was locked locally on{" "}
          {formatDate(latestSubmission.submittedAt, { includeTime: true })}.
          No message was sent to {latestSubmission.managerName}.
        </div>
      )}
      <p className="status-message" role="status">
        {message}
      </p>

      <article className="pfe-document" aria-label="Employee PFE draft">
        <header className="pfe-document-header">
          <SaskTelLogo />
          <div className="pfe-document-title">
            <strong>PARTNERSHIP FOR EXCELLENCE — {workspace.cycle.label}</strong>
            <span>Objectives and Performance Review: In-scope Employees</span>
          </div>
        </header>
        <p className="pfe-document-intro">
          Employee draft · Fictional information saved only in this browser.
        </p>

        <section className="pfe-document-section">
          <h2><span>1.</span> General Information</h2>
          <div className="pfe-information-grid">
            <div className="pfe-information-field">
              <span>Employee Name</span>
              <strong>
                {workspace.profile.firstName} {workspace.profile.lastName}
              </strong>
            </div>
            <label className="pfe-information-field" htmlFor="job-title">
              <span>Job Title</span>
              <input
                id="job-title"
                value={profileDetails.jobTitle}
                readOnly={submittedAndLocked}
                onChange={(event) =>
                  updateProfile("jobTitle", event.target.value)
                }
                placeholder="Add job title"
              />
            </label>
            <div className="pfe-information-field">
              <span>Length of time in present job</span>
              <input
                aria-label="Length of time in present job"
                value={profileDetails.presentJobLength}
                readOnly={submittedAndLocked}
                onChange={(event) =>
                  updateProfile("presentJobLength", event.target.value)
                }
                placeholder="Add length of time"
              />
            </div>
            <div className="pfe-information-field">
              <span>Employee ID</span>
              <strong>{workspace.profile.id}</strong>
            </div>
            <div className="pfe-information-field pfe-period-field">
              <span>Appraisal Period</span>
              <strong>
                {formatDate(workspace.cycle.startDate, { dateStyle: "long" })} –{" "}
                {formatDate(workspace.cycle.endDate, { dateStyle: "long" })}
              </strong>
            </div>
          </div>
        </section>

        <section className="pfe-document-section">
          <h2><span>2.</span> Values - 50%</h2>
          <div className="pfe-document-subsection">
            <h3>A. Foundational Values</h3>
            <p className="pfe-document-help">
              Foundational-value ratings and comments are manager-assessed and
              are not part of this employee draft.
            </p>
          </div>
          <div className="pfe-document-subsection">
            <h3>B. Cultural Values and Behaviours</h3>
            <p className="pfe-document-help">
              Employee results and supporting evidence
            </p>
            <EvidenceList evidence={evidenceFor("Values and Behaviours")} />
            <SectionInput
              id="values-and-behaviours"
              label="Employee Results — Values and Behaviours"
              value={sections.valuesAndBehaviours}
              readOnly={submittedAndLocked}
              onChange={(value) =>
                updateSection("valuesAndBehaviours", value)
              }
            />
          </div>
        </section>

        <section className="pfe-document-section">
          <h2><span>3.</span> Business Objectives - 50%</h2>
          <p className="pfe-document-help">
            Objectives are drawn from your saved goals. Included accomplishments
            are shown under the matching objective.
          </p>
          {workspace.goals.length === 0 ? (
            <p className="pfe-no-evidence">
              Add a goal to show a Business Objective in this draft.
            </p>
          ) : (
            workspace.goals.map((goal) => (
              <div className="pfe-objective" key={goal.id}>
                <h3>Objective: {goal.title}</h3>
                <p>{goal.description}</p>
                <EvidenceList
                  evidence={evidenceFor("Business Objectives", goal.id)}
                />
                <SectionInput
                  id={`objective-results-${goal.id}`}
                  label="Employee Results"
                  value={sections[`goal-${goal.id}`] || ""}
                  readOnly={submittedAndLocked}
                  onChange={(value) =>
                    updateSection(`goal-${goal.id}`, value)
                  }
                  placeholder="Add employee results for this objective."
                />
              </div>
            ))
          )}
          {evidenceFor("Business Objectives", "").length > 0 && (
            <div className="pfe-objective">
              <h3>Business Objective evidence without a linked goal</h3>
              <EvidenceList evidence={evidenceFor("Business Objectives", "")} />
            </div>
          )}
        </section>

        <section className="pfe-document-section pfe-excluded-section">
          <h2><span>4.</span> Overall Performance Summary</h2>
          <p>
            The template’s overall rating is manager-assessed and is not part
            of this employee draft.
          </p>
        </section>

        <section className="pfe-document-section">
          <h2><span>5.</span> Overall Comments</h2>
          <EvidenceList evidence={evidenceFor("Overall Comments")} />
          <SectionInput
            id="overall-comments"
            label="Employee Comments"
            value={sections.overallComments}
            readOnly={submittedAndLocked}
            onChange={(value) => updateSection("overallComments", value)}
          />
        </section>

        <section className="pfe-document-section">
          <h2><span>6.</span> Development Planning</h2>
          <EvidenceList evidence={evidenceFor("Development Planning")} />
          <SectionInput
            id="development-planning"
            label="Employee Development Planning"
            value={sections.developmentPlanning}
            readOnly={submittedAndLocked}
            onChange={(value) =>
              updateSection("developmentPlanning", value)
            }
          />
        </section>
      </article>

      {!submittedAndLocked && (
        <Card className="review-card">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={finalReview}
              onChange={(event) => setFinalReview(event.target.checked)}
            />
            I reviewed the draft and confirmed it reflects the fictional
            evidence I selected.
          </label>
          <div className="button-row">
            <button className="secondary-button" onClick={saveDraft}>
              Save as Draft
            </button>
            <button
              className="primary"
              disabled={!finalReview}
              onClick={() => setShowSubmit(true)}
            >
              Submit to Manager
            </button>
          </div>
          <p className="small">
            Last saved:{" "}
            {formatDate(workspace.draft.lastSavedAt, { includeTime: true })}
          </p>
        </Card>
      )}

      {showSubmit && (
        <div className="modal-backdrop">
          <Card
            className="confirmation-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-title"
          >
            <h2 id="submit-title">Ready to submit?</h2>
            <p>
              This creates a locked local snapshot for fictional manager{" "}
              {workspace.profile.managerName}. It will not send or share data.
            </p>
            <div className="button-row">
              <button
                className="secondary-button"
                onClick={() => setShowSubmit(false)}
              >
                Cancel
              </button>
              <button className="primary" onClick={submit}>
                Submit local demo version
              </button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
