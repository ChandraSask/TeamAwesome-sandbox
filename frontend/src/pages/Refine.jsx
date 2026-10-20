import { useState } from "react";
import Card from "../components/Card";
import PageHeading from "../components/PageHeading";
import { refineText } from "../pfeUtils";

export default function Refine({ workspace, commit }) {
  const [selectedId, setSelectedId] = useState("");
  const [original, setOriginal] = useState("");
  const [mode, setMode] = useState("clearer");
  const [suggestion, setSuggestion] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState("");

  function selectAccomplishment(id) {
    setSelectedId(id);
    const item = workspace.accomplishments.find((record) => record.id === id);
    setOriginal(item?.contribution || "");
    setSuggestion("");
    setMessage("");
  }

  function generate() {
    if (!original.trim()) {
      setMessage("Enter text or select an accomplishment first.");
      return;
    }
    setSuggestion(refineText(original, mode, attempt));
    setAttempt((current) => current + 1);
    setMessage("");
  }

  function useSuggestion() {
    if (!selectedId) {
      setOriginal(suggestion);
      setSuggestion("");
      setMessage(
        "Suggestion moved to the original field. It is not attached to an accomplishment.",
      );
      return;
    }
    const item = workspace.accomplishments.find(
      (record) => record.id === selectedId,
    );
    if (!item) {
      setMessage("The selected accomplishment is no longer available.");
      return;
    }
    if (
      commit(
        (current, timestamp) => ({
          ...current,
          accomplishments: current.accomplishments.map((record) =>
            record.id === selectedId
              ? { ...record, contribution: suggestion, updatedAt: timestamp }
              : record,
          ),
          draft:
            current.draft.status === "Submitted to Manager" ||
            item.status !== "Included"
              ? current.draft
              : {
                  ...current.draft,
                  status: "Draft",
                  evidenceIds: current.accomplishments
                    .filter((record) => record.status === "Included")
                    .map((record) => record.id),
                  finalReviewComplete: false,
                  lastSavedAt: timestamp,
                },
        }),
        {
          action: "Refined wording accepted",
          entityType: "accomplishment",
          entityId: selectedId,
        },
      )
    ) {
      setOriginal(suggestion);
      setSuggestion("");
      setMessage(`Updated “${item.title}” with the accepted wording.`);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="SIMULATED WRITING SUPPORT"
        title="Refine"
        description="Improve presentation without changing the facts or adding unsupported impact."
      />
      <div className="sample-notice">
        <strong>Demo suggestion, not AI</strong>
        <span>
          Local rules adjust wording only. Review every suggestion before using
          it.
        </span>
      </div>
      <Card className="form-card">
        <label>
          Select an accomplishment (optional)
          <select
            value={selectedId}
            onChange={(event) => selectAccomplishment(event.target.value)}
          >
            <option value="">Standalone text</option>
            {workspace.accomplishments.map((item) => (
              <option value={item.id} key={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Original
          <textarea
            value={original}
            maxLength="2000"
            onChange={(event) => {
              setOriginal(event.target.value);
              setSuggestion("");
            }}
            placeholder="Describe only what happened. The demo will not add facts."
          />
        </label>
        <label>
          Refinement
          <select value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="clearer">Make clearer</option>
            <option value="concise">Make concise</option>
            <option value="professional">Professional wording</option>
            <option value="grammar">Fix basic grammar</option>
          </select>
        </label>
        <button className="primary" type="button" onClick={generate}>
          Create demo suggestion
        </button>
      </Card>
      {suggestion && (
        <div className="comparison-grid">
          <Card>
            <p className="eyebrow">ORIGINAL</p>
            <p className="preserve-lines">{original}</p>
          </Card>
          <Card className="suggestion-card">
            <p className="eyebrow">DEMO SUGGESTION</p>
            <textarea
              aria-label="Editable demo suggestion"
              value={suggestion}
              onChange={(event) => setSuggestion(event.target.value)}
            />
            <div className="button-row">
              <button className="primary" onClick={useSuggestion}>
                Use refined version
              </button>
              <button className="secondary-button" onClick={generate}>
                Try again
              </button>
              <button
                className="text-button"
                onClick={() => setSuggestion("")}
              >
                Cancel
              </button>
            </div>
          </Card>
        </div>
      )}
      <p className="status-message" role="status">
        {message}
      </p>
    </>
  );
}
