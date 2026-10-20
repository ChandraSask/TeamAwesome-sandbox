export const sourceOptions = [
  "Manual Entry",
  "Uploaded Document (demo label)",
  "Email (demo label)",
  "OneNote (demo label)",
  "Loop (demo label)",
  "Trello (demo label)",
  "Other",
];

export const sectionOptions = [
  "Values and Behaviours",
  "Business Objectives",
  "Overall Comments",
  "Development Planning",
];

export function formatDate(value, options = {}) {
  if (!value) return "Not yet";
  const safeValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T12:00:00`
    : value;
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: options.dateStyle || "medium",
    timeStyle: options.includeTime ? "short" : undefined,
  }).format(new Date(safeValue));
}

export function monthEndCountdown(today = new Date()) {
  const year = today.getFullYear();
  const month = today.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const daysRemaining = lastDay - today.getDate();
  return {
    daysRemaining,
    monthEnd: new Date(year, month, lastDay, 12).toISOString(),
    reminderDue: daysRemaining < 10,
    tone: daysRemaining === 0 ? "urgent" : daysRemaining < 10 ? "upcoming" : "on-track",
  };
}

export function calculateProgress(workspace) {
  const included = workspace.accomplishments.filter(
    (item) => item.status === "Included",
  );
  const mapped = included.filter((item) => item.goalId);
  const overallComments = workspace.draft.sections.overallComments.trim();
  const sectionMappings = [
    ["valuesAndBehaviours", "Values and Behaviours"],
    ["businessObjectives", "Business Objectives"],
    ["overallComments", "Overall Comments"],
    ["developmentPlanning", "Development Planning"],
  ];
  const hasDraftText = (value) => {
    const text = value.trim();
    return (
      Boolean(text) &&
      text !== "No supporting evidence has been selected for this section."
    );
  };
  const hasObjectiveResults = Object.entries(workspace.draft.sections).some(
    ([key, value]) => key.startsWith("goal-") && hasDraftText(value),
  );
  const sectionsPrepared = sectionMappings.every(
    ([key, mapping]) =>
      hasDraftText(workspace.draft.sections[key]) ||
      included.some((item) => item.pfeSection === mapping) ||
      (mapping === "Business Objectives" && hasObjectiveResults),
  );
  const milestones = [
    {
      label: "Goals added",
      weight: 15,
      complete: workspace.goals.length > 0,
    },
    {
      label: "Accomplishments captured",
      weight: 25,
      complete: included.length > 0,
    },
    {
      label: "Accomplishments mapped to goals",
      weight: 15,
      complete: included.length > 0 && mapped.length === included.length,
    },
    {
      label: "PFE sections prepared",
      weight: 25,
      complete:
        sectionsPrepared &&
        workspace.draft.status !== "Not Started",
    },
    {
      label: "Overall comments prepared",
      weight: 10,
      complete:
        Boolean(overallComments) &&
        overallComments !==
          "No supporting evidence has been selected for this section.",
    },
    {
      label: "Final review complete",
      weight: 10,
      complete: workspace.draft.finalReviewComplete,
    },
  ];
  return {
    percent: milestones.reduce(
      (total, item) => total + (item.complete ? item.weight : 0),
      0,
    ),
    milestones,
  };
}

export function nextReminderDate(reminder, from = new Date()) {
  if (!reminder?.enabled) return null;
  const next = new Date(from);
  next.setSeconds(0, 0);
  const [hours, minutes] = reminder.time.split(":").map(Number);

  if (reminder.frequency === "Weekly" || reminder.frequency === "Biweekly") {
    const interval = reminder.frequency === "Weekly" ? 7 : 14;
    let days = (Number(reminder.dayOfWeek) - next.getDay() + 7) % 7;
    next.setDate(next.getDate() + days);
    next.setHours(hours, minutes, 0, 0);
    if (next <= from) next.setDate(next.getDate() + interval);
    return next.toISOString();
  }

  const months = reminder.frequency === "Quarterly" ? 3 : 1;
  next.setDate(Math.min(Number(reminder.dayOfMonth), 28));
  next.setHours(hours, minutes, 0, 0);
  if (next <= from) next.setMonth(next.getMonth() + months);
  return next.toISOString();
}

export function currentNextReminder(reminder, from = new Date()) {
  if (!reminder?.enabled) return null;
  if (!reminder.nextRun) return nextReminderDate(reminder, from);

  const next = new Date(reminder.nextRun);
  if (Number.isNaN(next.getTime())) return nextReminderDate(reminder, from);
  while (next <= from) {
    if (reminder.frequency === "Weekly") next.setDate(next.getDate() + 7);
    else if (reminder.frequency === "Biweekly")
      next.setDate(next.getDate() + 14);
    else if (reminder.frequency === "Quarterly")
      next.setMonth(next.getMonth() + 3);
    else next.setMonth(next.getMonth() + 1);
  }
  return next.toISOString();
}

export function refineText(text, mode, attempt = 0) {
  let result = text.trim().replace(/\s+/g, " ");
  result = result.charAt(0).toUpperCase() + result.slice(1);

  if (mode === "clearer" && /^worked on\b/i.test(result)) {
    result = result.replace(/^worked on\b/i, "Contributed to");
  }
  if (mode === "professional" && /^helped with\b/i.test(result)) {
    result = result.replace(/^helped with\b/i, "Supported");
  }
  if (mode === "concise") {
    result = result
      .replace(/\b(really|very|basically|actually)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  if (!/[.!?]$/.test(result)) result += ".";
  if (attempt % 2 === 1 && /^I /i.test(result)) {
    result = result.replace(/^I /i, "");
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }
  return result;
}
