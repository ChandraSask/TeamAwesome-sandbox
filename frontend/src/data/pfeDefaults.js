const createdAt = "2026-10-15T15:00:00.000Z";

export function createDefaultWorkspace() {
  return {
    schemaVersion: 1,
    updatedAt: createdAt,
    profile: {
      id: "employee-demo-001",
      firstName: "Tosin",
      lastName: "Ayo",
      initials: "TM",
      email: "tosin.ayo@example.com",
      jobTitle: "",
      presentJobLength: "",
      managerId: "manager-demo-001",
      managerName: "Jordan Lee",
    },
    cycle: {
      id: "2026-2027",
      label: "2026-2027",
      startDate: "2026-04-01",
      endDate: "2027-03-31",
    },
    goals: [
      {
        id: "goal-reliability",
        title: "Improve workflow reliability",
        description:
          "Reduce recurring manual intervention in a monthly processing workflow.",
        targetDate: "2027-02-28",
        status: "Active",
        notes: "Review progress during monthly check-ins.",
        pfeYear: "2026-2027",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "goal-knowledge",
        title: "Share practical team knowledge",
        description:
          "Create and improve reusable guidance for common team processes.",
        targetDate: "2027-03-15",
        status: "Active",
        notes: "",
        pfeYear: "2026-2027",
        createdAt,
        updatedAt: createdAt,
      },
    ],
    accomplishments: [
      {
        id: "accomplishment-validation",
        title: "Improved monthly validation steps",
        accomplishmentDate: "2026-08-12",
        contribution:
          "Updated the validation checklist and tested the revised steps in a QA environment.",
        outcome:
          "The team had a clearer repeatable process for reviewing the monthly files.",
        goalId: "goal-reliability",
        source: "Manual Entry",
        tags: ["workflow", "quality"],
        status: "Included",
        pfeSection: "Business Objectives",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "accomplishment-guide",
        title: "Created a team reference guide",
        accomplishmentDate: "2026-09-18",
        contribution:
          "Collected common questions and documented the agreed process in a short guide.",
        outcome: "Teammates had one place to find the current process steps.",
        goalId: "goal-knowledge",
        source: "Manual Entry",
        tags: ["documentation", "knowledge sharing"],
        status: "Included",
        pfeSection: "Values and Behaviours",
        createdAt,
        updatedAt: createdAt,
      },
    ],
    reminder: null,
    draft: {
      version: 1,
      status: "Not Started",
      sections: {
        generalInformation: "",
        foundationalValues: "",
        valuesAndBehaviours: "",
        businessObjectives: "",
        overallPerformanceSummary: "",
        overallComments: "",
        developmentPlanning: "",
        policyAcknowledgements: "",
      },
      evidenceIds: [],
      finalReviewComplete: false,
      lastSavedAt: null,
    },
    managerComments: {},
    submissions: [],
    activity: [
      {
        id: "activity-demo-start",
        action: "Demo workspace prepared",
        entityType: "workspace",
        entityId: "employee-demo-001",
        timestamp: createdAt,
      },
    ],
  };
}

export const syntheticPriorCycle = {
  cycle: "2025-2026",
  status: "Submitted",
  submittedAt: "2026-03-20T19:30:00.000Z",
  label: "Synthetic example",
};
