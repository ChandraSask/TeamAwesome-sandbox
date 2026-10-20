import { useState } from "react";
import Card from "./Card";

const STORAGE_KEY = "hackathon-starter-notes-v1";
function readNotes() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved)
      ? saved.filter(
          (note) =>
            typeof note?.id === "string" && typeof note?.text === "string",
        )
      : [];
  } catch {
    return [];
  }
}

export default function Notes() {
  const [notes, setNotes] = useState(readNotes);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("");

  function saveNotes(next) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setNotes(next);
      return true;
    } catch {
      setMessage(
        "Your browser could not save this change. Copy your note somewhere safe and try again.",
      );
      return false;
    }
  }
  function addNote(event) {
    event.preventDefault();
    if (!draft.trim()) return;
    if (
      saveNotes([{ id: crypto.randomUUID(), text: draft.trim() }, ...notes])
    ) {
      setDraft("");
      setMessage("Note saved in this browser.");
    }
  }
  return (
    <div className="notes-layout">
      <Card>
        <div className="eyebrow">YOUR REFLECTIONS</div>
        <h2>Capture a reflection</h2>
        <p>
          What did you contribute? What did you learn? What would you like to
          discuss next?
        </p>
        <form onSubmit={addNote}>
          <label htmlFor="note">Your note</label>
          <textarea
            id="note"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
            rows={6}
            placeholder="For example: I helped a teammate solve a problem and learned…"
          />
          <div className="form-footer">
            <span className="muted">{draft.length}/2,000</span>
            <button className="primary" disabled={!draft.trim()}>
              Save note <span aria-hidden="true">↗</span>
            </button>
          </div>
        </form>
        <p className="small">
          Saved only in this browser. Use fictional information.
        </p>
        <p role="status" className="small status-message">
          {message}
        </p>
      </Card>
      <section aria-labelledby="saved-title">
        <div className="section-heading">
          <h2 id="saved-title">Your notes</h2>
          <span className="count">{notes.length}</span>
        </div>
        {notes.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">
              ✎
            </span>
            <h3>A fresh page.</h3>
            <p>
              Your first note will appear here.
              <br />
              Start with something small.
            </p>
          </div>
        ) : (
          <div className="note-list">
            {notes.map((note) => (
              <Card key={note.id}>
                <p className="note-text">{note.text}</p>
                <button
                  className="text-button"
                  onClick={() => {
                    if (saveNotes(notes.filter((item) => item.id !== note.id)))
                      setMessage("Note removed.");
                  }}
                  aria-label={`Remove note: ${note.text.slice(0, 40)}`}
                >
                  Remove
                </button>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
