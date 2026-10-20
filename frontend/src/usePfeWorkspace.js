import { useState } from "react";
import { createDefaultWorkspace } from "./data/pfeDefaults";

const STORAGE_KEY = "pfe-made-easy-workspace-v1";
const MAX_ACTIVITY_ITEMS = 200;

function isValidWorkspace(value) {
  return (
    value?.schemaVersion === 1 &&
    value.profile &&
    value.cycle &&
    Array.isArray(value.goals) &&
    Array.isArray(value.accomplishments) &&
    value.draft &&
    Array.isArray(value.submissions) &&
    Array.isArray(value.activity)
  );
}

function loadWorkspace() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { workspace: createDefaultWorkspace(), message: "" };
    const parsed = JSON.parse(saved);
    if (isValidWorkspace(parsed)) return { workspace: parsed, message: "" };
    return {
      workspace: createDefaultWorkspace(),
      message:
        "Saved demo data had an unsupported format, so a fresh fictional workspace was opened. No saved data was overwritten.",
    };
  } catch {
    return {
      workspace: createDefaultWorkspace(),
      message:
        "Saved demo data could not be read, so a fresh fictional workspace was opened. No saved data was overwritten.",
    };
  }
}

export function createId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export default function usePfeWorkspace() {
  const [initial] = useState(loadWorkspace);
  const [workspace, setWorkspace] = useState(initial.workspace);
  const [storageMessage, setStorageMessage] = useState(initial.message);

  function commit(change, activity) {
    const timestamp = new Date().toISOString();
    const changed = change(workspace, timestamp);
    const next = {
      ...changed,
      updatedAt: timestamp,
      activity: activity
        ? [
            {
              id: createId("activity"),
              action: activity.action,
              entityType: activity.entityType,
              entityId: activity.entityId,
              timestamp,
            },
            ...changed.activity,
          ].slice(0, MAX_ACTIVITY_ITEMS)
        : changed.activity,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setWorkspace(next);
      setStorageMessage("");
      return true;
    } catch {
      setStorageMessage(
        "This browser could not save the change. Copy any important text somewhere safe and try again.",
      );
      return false;
    }
  }

  return { workspace, storageMessage, commit };
}
