import { useEffect, useState } from "react";
import Card from "../components/Card";
import PageHeading from "../components/PageHeading";
import SaskTelLogo from "../components/SaskTelLogo";
import { formatDate } from "../pfeUtils";
import { createId } from "../usePfeWorkspace";

const valueThemes = [
  "Honesty",
  "Integrity",
  "Respect",
  "OneSaskTel Team",
  "Think Big",
  "Customer First",
  "Focus on Experiences",
  "Agility",
];
const MIN_DRAFT_ZOOM = 70;
const MAX_DRAFT_ZOOM = 130;
const DRAFT_ZOOM_STEP = 10;

function EvidenceList({ evidence }) {
  if (evidence.length === 0) {
    return (
      <p className="pfe-no-evidence">
        No included evidence in this section yet.
      </p>
    );
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

function EmployeeComments({ id, value, locked, onSave }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  useEffect(() => {
    if (!editing) setText(value);
  }, [editing, value]);

  return (
    <div className="pfe-comment-panel">
      <div className="pfe-comment-heading">
        <strong>Employee Comments</strong>
        {!locked && !editing && (
          <button
            className="text-button"
            type="button"
            onClick={() => setEditing(true)}
          >
            Edit employee comments
          </button>
        )}
      </div>
      {editing && !locked ? (
        <>
          <label className="pfe-entry-field" htmlFor={id}>
            <span className="sr-only">Edit employee comments</span>
            <textarea
              id={id}
              className="pfe-entry-input"
              value={text}
              maxLength="4000"
              placeholder="Add your employee comments here."
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <div className="pfe-comment-actions">
            <button
              className="primary"
              type="button"
              onClick={() => {
                if (onSave(text)) setEditing(false);
              }}
            >
              Save comments
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <p className="pfe-comment-text">
          {value || "No employee comments added."}
        </p>
      )}
    </div>
  );
}

function ManagerComments({ comments = "" }) {
  return (
    <div className="pfe-manager-comments" aria-label="Read-only manager comments">
      <strong>Manager Comments · Read only</strong>
      <p>{comments || "No manager comments provided."}</p>
    </div>
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
  const [draftZoom, setDraftZoom] = useState(100);
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

  function updateProfile(field, value) {
    setProfileDetails((current) => ({ ...current, [field]: value }));
    setFinalReview(false);
  }

  function saveEmployeeComments(key, value) {
    const nextSections = { ...sections, [key]: value };
    const evidenceIds = includedEvidence.map((item) => item.id);
    if (
      commit(
        (current, timestamp) => ({
          ...current,
          profile: { ...current.profile, ...profileDetails },
          draft: {
            ...current.draft,
            status: "Draft",
            sections: nextSections,
            evidenceIds,
            finalReviewComplete: false,
            lastSavedAt: timestamp,
          },
        }),
        {
          action: "PFE employee comments saved",
          entityType: "draft",
          entityId: `draft-v${workspace.draft.version}-${key}`,
        },
      )
    ) {
      setSections(nextSections);
      setFinalReview(false);
      setMessage("Employee comments saved in this browser.");
      return true;
    }
    return false;
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
      managerComments: { ...(workspace.managerComments || {}) },
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
      setProfileDetails({
        jobTitle: latestSubmission.profile?.jobTitle || "",
        presentJobLength: latestSubmission.profile?.presentJobLength || "",
      });
      setFinalReview(false);
      setMessage(`Editable draft version ${nextVersion} started.`);
    }
  }

  const readOnlyManagerComments =
    submittedAndLocked
      ? latestSubmission.managerComments || workspace.managerComments || {}
      : workspace.managerComments || {};

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
          Employee comments can be edited section by section. Manager comments
          are read-only and appear only if provided. This prototype does not
          collect ratings, signatures, or policy acknowledgements.
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

      <div className="pfe-zoom-controls" role="group" aria-label="PFE draft zoom">
        <span>Draft size</span>
        <button
          className="secondary-button"
          type="button"
          aria-label="Zoom out PFE draft"
          title="Zoom out"
          disabled={draftZoom <= MIN_DRAFT_ZOOM}
          onClick={() =>
            setDraftZoom((zoom) =>
              Math.max(MIN_DRAFT_ZOOM, zoom - DRAFT_ZOOM_STEP),
            )
          }
        >
          −
        </button>
        <output aria-live="polite" aria-atomic="true">
          {draftZoom}%
        </output>
        <button
          className="secondary-button"
          type="button"
          aria-label="Zoom in PFE draft"
          title="Zoom in"
          disabled={draftZoom >= MAX_DRAFT_ZOOM}
          onClick={() =>
            setDraftZoom((zoom) =>
              Math.min(MAX_DRAFT_ZOOM, zoom + DRAFT_ZOOM_STEP),
            )
          }
        >
          +
        </button>
        <button
          className="text-button"
          type="button"
          aria-label="Reset PFE draft zoom"
          onClick={() => setDraftZoom(100)}
          disabled={draftZoom === 100}
        >
          Reset
        </button>
      </div>

      <article
        className="pfe-document"
        aria-label="Employee PFE draft"
        style={{ zoom: `${draftZoom}%` }}
      >
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
            <label className="pfe-information-field" htmlFor="present-job-length">
              <span>Length of time in present job</span>
              <input
                id="present-job-length"
                value={profileDetails.presentJobLength}
                readOnly={submittedAndLocked}
                onChange={(event) =>
                  updateProfile("presentJobLength", event.target.value)
                }
                placeholder="Add length of time"
              />
            </label>
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
          <EmployeeComments
            id="general-information-comments"
            value={sections.generalInformation || ""}
            locked={submittedAndLocked}
            onSave={(value) => saveEmployeeComments("generalInformation", value)}
          />
          <ManagerComments
            comments={readOnlyManagerComments.generalInformation}
          />
        </section>

        <section className="pfe-document-section">
          <h2><span>2.</span> Values - 50%</h2>
          <div className="pfe-document-subsection">
            <h3>A. Foundational Values</h3>
            <p className="pfe-document-help">
              Shared values expected across roles.
            </p>
            <div className="pfe-value-themes">
              {valueThemes.slice(0, 3).map((value) => (
                <span key={value}>{value}</span>
              ))}
            </div>
            <EmployeeComments
              id="foundational-values-comments"
              value={sections.foundationalValues || ""}
              locked={submittedAndLocked}
              onSave={(value) =>
                saveEmployeeComments("foundationalValues", value)
              }
            />
            <ManagerComments
              comments={readOnlyManagerComments.foundationalValues}
            />
          </div>
          <div className="pfe-document-subsection">
            <h3>B. Cultural Values and Behaviours</h3>
            <p className="pfe-document-help">
              Workplace behaviour themes included in the PFE template.
            </p>
            <div className="pfe-value-themes">
              {valueThemes.slice(3).map((value) => (
                <span key={value}>{value}</span>
              ))}
            </div>
            <EvidenceList evidence={evidenceFor("Values and Behaviours")} />
            <EmployeeComments
              id="values-and-behaviours"
              value={sections.valuesAndBehaviours}
              locked={submittedAndLocked}
              onSave={(value) =>
                saveEmployeeComments("valuesAndBehaviours", value)
              }
            />
            <ManagerComments
              comments={readOnlyManagerComments.valuesAndBehaviours}
            />
          </div>
        </section>

        <section className="pfe-document-section">
          <h2><span>3.</span> Business Objectives - 50%</h2>
          <p className="pfe-document-help">
            Objectives come from saved goals. Included accomplishments appear
            beneath the goal they support.
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
                <EmployeeComments
                  id={`objective-results-${goal.id}`}
                  value={sections[`goal-${goal.id}`] || ""}
                  locked={submittedAndLocked}
                  onSave={(value) =>
                    saveEmployeeComments(`goal-${goal.id}`, value)
                  }
                />
                <ManagerComments
                  comments={readOnlyManagerComments[`goal-${goal.id}`]}
                />
              </div>
            ))
          )}
          <EmployeeComments
            id="business-objectives-comments"
            value={sections.businessObjectives || ""}
            locked={submittedAndLocked}
            onSave={(value) => saveEmployeeComments("businessObjectives", value)}
          />
          <ManagerComments
            comments={readOnlyManagerComments.businessObjectives}
          />
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
            This is a manager-assessed area. Performance ratings and
            employment decisions are not collected or displayed in this
            employee prototype.
          </p>
          <ManagerComments
            comments={readOnlyManagerComments.overallPerformanceSummary}
          />
          <EmployeeComments
            id="performance-summary-comments"
            value={sections.overallPerformanceSummary || ""}
            locked={submittedAndLocked}
            onSave={(value) =>
              saveEmployeeComments("overallPerformanceSummary", value)
            }
          />
        </section>

        <section className="pfe-document-section">
          <h2><span>5.</span> Overall Comments</h2>
          <EvidenceList evidence={evidenceFor("Overall Comments")} />
          <EmployeeComments
            id="overall-comments"
            value={sections.overallComments}
            locked={submittedAndLocked}
            onSave={(value) => saveEmployeeComments("overallComments", value)}
          />
          <ManagerComments
            comments={readOnlyManagerComments.overallComments}
          />
        </section>

        <section className="pfe-document-section">
          <h2><span>6.</span> Development Planning</h2>
          <EvidenceList evidence={evidenceFor("Development Planning")} />
          <EmployeeComments
            id="development-planning"
            value={sections.developmentPlanning}
            locked={submittedAndLocked}
            onSave={(value) =>
              saveEmployeeComments("developmentPlanning", value)
            }
          />
          <ManagerComments
            comments={readOnlyManagerComments.developmentPlanning}
          />
        </section>

        <section className="pfe-document-section pfe-excluded-section">
          <h2><span>7.</span> Signatures and Acknowledgement</h2>
          <p>
            Signature and policy acknowledgement workflows are not collected
            in this local employee draft. Refer to the official form for
            required acknowledgements.
          </p>
          <EmployeeComments
            id="acknowledgement-comments"
            value={sections.policyAcknowledgements || ""}
            locked={submittedAndLocked}
            onSave={(value) =>
              saveEmployeeComments("policyAcknowledgements", value)
            }
          />
          <ManagerComments
            comments={readOnlyManagerComments.policyAcknowledgements}
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
