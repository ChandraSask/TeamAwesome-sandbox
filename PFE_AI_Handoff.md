# PFE Copilot Evidence Hub - AI Build Handoff

## 1. Purpose
Build a working PFE (performance feedback/evaluation) evidence solution in Microsoft 365 that reduces year-end effort by capturing evidence continuously, organizing it, supporting employee-manager conversations, and generating PFE-ready draft content.

**Design principle:** automate evidence capture, organization, routing, summarization, and drafting. Do not automate performance judgment, scoring, ranking, sentiment/personality inference, or final evaluation decisions.

## 2. Current constraints and decisions
- The user cannot create a new SharePoint site.
- The user can create Microsoft Lists, document libraries, and Agents in an existing permitted location.
- A Microsoft List named **PFE Evidence Tool** already exists and will be the primary evidence store.
- The UI target is a **Power Apps canvas app** surfaced inside **Microsoft Teams** as a tab.
- Initial storage should use Microsoft Lists / SharePoint Lists rather than requiring Dataverse.
- The solution must be extensible to external work systems, including **Trello**.

## 3. Original workshop requirements
The solution must:
1. Capture accomplishments throughout the year.
2. Reduce year-end PFE effort.
3. Improve quality and consistency of PFE content.
4. Link accomplishments to corporate values.
5. Incorporate employee and manager perspectives.
6. Maintain privacy and manager discretion.
7. Produce PFE-ready content and summaries.

The process should support conversations rather than burden employees/managers with excessive process.

### Candidate evidence sources
- One-on-ones
- Group meetings
- Meetings / meeting recaps
- Project work
- Customer interactions
- Training
- Email
- Teams
- Recognition
- Innovation ideas
- Coaching
- Trello
- Other

### Quarterly outputs
- Progress against objectives
- Changes in business priorities
- How employee work supports strategic direction
- Development opportunities
- Feedback and coaching
- Recognition of accomplishments
- Course corrections before year-end

### Year-end outputs
- Key Accomplishments
- Business Outcomes
- Cultural Values Examples
- Leadership Examples
- Development Achievements
- Improvement Areas

## 4. Proposed architecture
```text
Microsoft Teams
    |
    +-- PFE Evidence Hub tab
            |
            +-- Power Apps canvas app
                    |
                    +-- PFE Evidence Tool list
                    +-- PFE Review Cycles list
                    +-- PFE Manager Observations list
                    +-- PFE Review Decisions list
                    +-- PFE Configuration list
                    |
                    +-- Power Automate workflows
                    |
                    +-- Copilot / Agent drafting
                    |
                    +-- Trello candidate-evidence integration
```

## 5. Primary list: PFE Evidence Tool
Keep the existing SharePoint **Title** column.

Create these columns with these names.

### Core fields
- `Title` - Single line of text. Short evidence/accomplishment title.
- `EmployeeEmail` - Single line of text.
- `EmployeeName` - Single line of text.
- `EvidenceDate` - Date and time, configured as date only.
- `Contribution` - Multiple lines of text. Employee's specific contribution.
- `BusinessImpact` - Multiple lines of text. Value/outcome created. Impact may be unknown initially and should not be invented.
- `SourceType` - Choice.
- `SourceReference` - Hyperlink. Link back to source when permitted.
- `Objective` - Single line of text.
- `CulturalValue` - Single line of text.
- `PFESection` - Choice.
- `EmployeeStatus` - Choice. Default `Draft`.
- `ManagerStatus` - Choice. Default `Not submitted`.
- `Visibility` - Choice. Default `Employee Only`.
- `AITracked` - Yes/No. Default No.
- `EmployeeConfirmed` - Yes/No. Default No.
- `ManagerConfirmed` - Yes/No. Default No.
- `Period` - Single line of text, e.g. Q1, Q2, Q3, Q4.
- `ReviewCycleKey` - Single line of text. Suggested logical key: employee email + PFE year.

### External-source fields
Add these so Trello and later integrations use a generic external-source model rather than Trello-specific storage:
- `ExternalSourceID` - Single line of text. E.g. Trello card ID.
- `SourceSystem` - Choice. Suggested choices: Manual, Trello, Teams, Outlook, Meeting, Project, Training, Other.
- `ImportedDate` - Date and time.

### SourceType choices
- One-on-one
- Meeting
- Meeting recap
- Email
- Teams
- Project work
- Training
- Recognition
- Innovation idea
- Customer interaction
- Manager observation
- Trello
- Other

### PFESection choices
- Key Accomplishment
- Business Outcome
- Cultural Value
- Leadership
- Development
- Improvement Area

### EmployeeStatus choices
- Draft
- Submitted
- Withdrawn

### ManagerStatus choices
- Not submitted
- Pending
- Accepted
- Needs edit
- Discuss
- Excluded

### Visibility choices
- Employee Only
- Employee and Manager

## 6. Supporting lists

### PFE Review Cycles
Purpose: employee-manager relationship and active PFE period.
Suggested columns:
- Title
- EmployeeEmail
- EmployeeName
- ManagerEmail
- PFEYear
- Stage: Active / Quarterly / YearEnd / Closed
- TemplateVersion
- FinalDocumentUrl

### PFE Manager Observations
Purpose: manager-created observations separate from employee evidence.
Suggested columns:
- Title
- EmployeeEmail
- ManagerEmail
- ObservationDate
- ObservationCategory: Recognition / Coaching / Development / Leadership / Priority Change / Improvement
- Observation
- Visibility: Manager Private / Shared with Employee
- DiscussedInOneOnOne - Yes/No
- ConvertedEvidenceId - Number

Default the observation to **Manager Private**. Do not automatically expose it to the employee or convert it to final evidence.

### PFE Review Decisions
Purpose: immutable-ish review history rather than relying only on current evidence status.
Suggested columns:
- Title
- EvidenceId - Number
- ReviewerEmail
- Decision: Accepted / Needs edit / Discuss / Excluded
- Comments
- DecisionDate
- PreviousStatus
- NewStatus

### PFE Configuration
Purpose: avoid hard-coding annual objectives, values, sections, and settings.
Suggested columns:
- Title
- ConfigType: Objective / Cultural Value / PFE Section / Setting
- Description
- PFEYear
- SortOrder
- Active - Yes/No

## 7. Power Apps UX
Build a responsive canvas app named **PFE Copilot Evidence Hub**.

### `scrHome`
- Header with app name, signed-in user, active PFE year.
- KPI cards: My Evidence; Accepted; Awaiting Review; Values Represented.
- Recent evidence gallery.
- Entry points: Add Evidence; Evidence Log; Quarterly Conversation; Year-End Draft.

### `scrEvidence`
- Current employee's evidence only.
- Search.
- Status filters: All / Draft / Pending / Accepted / Needs edit / Discuss / Excluded.
- New Evidence button.

### `scrEvidenceEdit`
Fields:
- Title
- Evidence date
- Source type
- Specific contribution
- Business impact
- Objective
- Cultural value
- PFE section
- Source reference

Actions:
- **Save private draft**
- **Submit for review**
- Cancel

A new record must not default to manager-visible.

### `scrManagerReview`
Only show when the signed-in user is an authorized manager based on PFE Review Cycles.
Show Pending submitted evidence for authorized employees.
Actions:
- Accept
- Needs edit
- Discuss
- Exclude
- Manager comment

Every decision should create a PFE Review Decisions record.

### `scrManagerObservations`
Manager-only area for recognition, coaching, development, leadership, priority changes, or improvement observations.
Default to Manager Private.

### `scrQuarterly`
Conversation workspace for the seven quarterly outcomes. Accepted evidence is supporting context, not an automated rating.

### `scrYearEnd`
Generate/edit six PFE-ready sections from **Accepted** evidence only:
- Key Accomplishments
- Business Outcomes
- Cultural Values Examples
- Leadership Examples
- Development Achievements
- Improvement Areas

### `scrGovernance`
Display user-facing privacy principles, source traceability, employee control, manager discretion, and the rule that AI does not make performance judgments.

## 8. Core Power Fx behavior

### App startup
```powerfx
Set(varUserEmail, Lower(User().Email));
Set(varUserName, User().FullName);
Set(varActiveYear, "2026-2027");
Set(
    varIsManager,
    CountRows(
        Filter(
            'PFE Review Cycles',
            Lower(ManagerEmail) = varUserEmail && Stage <> "Closed"
        )
    ) > 0
);
ClearCollect(
    colObjectives,
    Filter(
        'PFE Configuration',
        ConfigType.Value = "Objective" && PFEYear = varActiveYear && Active = true
    )
);
ClearCollect(
    colValues,
    Filter(
        'PFE Configuration',
        ConfigType.Value = "Cultural Value" && PFEYear = varActiveYear && Active = true
    )
);
```

### My evidence gallery
```powerfx
SortByColumns(
    Filter('PFE Evidence Tool', Lower(EmployeeEmail) = varUserEmail),
    "EvidenceDate",
    SortOrder.Descending
)
```

### Save private draft
```powerfx
Patch(
    'PFE Evidence Tool',
    If(IsBlank(varEvidenceRecord), Defaults('PFE Evidence Tool'), varEvidenceRecord),
    {
        Title: txtTitle.Text,
        EmployeeEmail: varUserEmail,
        EmployeeName: varUserName,
        EvidenceDate: dpEvidenceDate.SelectedDate,
        Contribution: txtContribution.Text,
        BusinessImpact: txtImpact.Text,
        SourceType: {Value: ddSource.Selected.Value},
        Objective: ddObjective.Selected.Title,
        CulturalValue: ddValue.Selected.Title,
        PFESection: {Value: ddSection.Selected.Value},
        EmployeeStatus: {Value: "Draft"},
        ManagerStatus: {Value: "Not submitted"},
        Visibility: {Value: "Employee Only"},
        EmployeeConfirmed: false,
        Period: "Q" & RoundUp(Month(dpEvidenceDate.SelectedDate) / 3, 0),
        ReviewCycleKey: varUserEmail & "|" & varActiveYear
    }
);
Notify("Private evidence draft saved.", NotificationType.Success);
Back()
```

### Submit for review
Validate required fields first. Then patch:
```powerfx
Patch(
    'PFE Evidence Tool',
    varEvidenceRecord,
    {
        EmployeeStatus: {Value: "Submitted"},
        ManagerStatus: {Value: "Pending"},
        Visibility: {Value: "Employee and Manager"},
        EmployeeConfirmed: true
    }
)
```

### Year-end evidence set
```powerfx
ClearCollect(
    colYearEndEvidence,
    Filter(
        'PFE Evidence Tool',
        Lower(EmployeeEmail) = varUserEmail &&
        ManagerStatus.Value = "Accepted" &&
        ReviewCycleKey = varUserEmail & "|" & varActiveYear
    )
)
```

## 9. Trello integration design
Some employees track work in **Trello**. Treat Trello as a source of **candidate evidence**, not as automatically approved PFE evidence.

### Desired flow
```text
Employee Trello cards
    -> relevant candidate cards
    -> employee reviews/selects
    -> employee adds/confirms contribution and impact
    -> map objective/value
    -> save to PFE Evidence Tool
    -> manager review
```

### Candidate fields from Trello
If available through the approved integration:
- Card ID -> `ExternalSourceID`
- Card title -> `Title`
- Card URL -> `SourceReference`
- Source system -> `SourceSystem = Trello`
- Source type -> `SourceType = Trello`
- Import timestamp -> `ImportedDate`
- Card description/context may be shown to the employee as source context.

Do **not** assume that being assigned to or associated with a Trello card proves the employee's individual contribution, outcome, or performance. Ask the employee to confirm/enrich those fields before the record becomes evidence.

### Candidate UX
Example:
```text
Potential evidence from Trello
"Automate regression reporting"

[Use as PFE evidence]  [Ignore]
```

If selected:
```text
What specifically did you contribute?
What changed because of your work?
Which PFE objective does it support?
Which cultural value applies?
Save private draft / Submit for review
```

### Integration constraint
The current Copilot session did not expose a Trello enterprise connector/action, so the actual Trello retrieval mechanism must be selected based on the connectors and integrations permitted in the target Microsoft 365/Power Platform environment. Do not assume a specific Trello authentication or Power Automate action exists until verified in that tenant.

## 10. Power Automate flows

### Flow 1 - Employee evidence submitted
Trigger when EmployeeStatus becomes Submitted and ManagerStatus becomes Pending.
Lookup manager from PFE Review Cycles.
Notify manager with evidence context and deep link to manager review.

### Flow 2 - Manager decision completed
When ManagerStatus changes from Pending, notify employee and create a review-decision record.

### Flow 3 - Monthly evidence reminder
For active cycles, notify employee of Draft/Pending/Accepted counts and provide app link. Never characterize evidence-count volume as performance quality.

### Flow 4 - Quarterly conversation draft
Input: accepted evidence plus intentionally shared manager observations.
Output: draft material for the seven quarterly conversation outcomes.

### Flow 5 - Year-end PFE draft
Input: accepted evidence only, grouped by PFE section, objective and value.
Output: the six year-end draft sections. Require human review.

### Flow 6 - Trello candidate intake
Only implement if an approved Trello connector/API path exists.
Retrieve candidate cards appropriate to the signed-in/identified employee, normalize them to candidate evidence, and require employee confirmation before creating/submitting PFE evidence.

## 11. Copilot / Agent instructions
Use an agent for collection guidance, mapping, summarization, and drafting.

Instruction baseline:
```text
You are the PFE Evidence Assistant.

Help employees and managers capture, organize, review and draft evidence for the PFE process.

You must:
- use only data the signed-in user is authorized to access;
- treat discovered source content as candidate evidence until confirmed by the employee;
- preserve the employee's specific contribution and business impact;
- distinguish team activity from individual contribution;
- map only to configured PFE objectives and cultural values;
- preserve uncertainty when outcomes are unknown;
- use accepted evidence only for year-end drafting;
- respect manager-private observations;
- retain source references where permitted;
- require human review before final PFE content is finalized.

You must not:
- rate, rank, score, compare or predict employee performance;
- infer sentiment, personality, attitude, motivation, feelings or intent;
- invent metrics, outcomes, contributions or source details;
- convert manager-private observations to shared evidence automatically;
- finalize a PFE without employee/manager review.
```

## 12. Privacy/security requirements
- Employee drafts are private until intentionally submitted.
- Managers can review only employees within their authorized PFE review scope.
- Manager-private observations are stored separately from employee evidence.
- AI candidate discovery must not become broad employee surveillance.
- Intentional selection/confirmation is preferred for sources such as Teams, email, meetings and Trello.
- App filtering is **not** a sufficient security boundary. Enforce access at the underlying data source / platform level according to organizational governance.
- Keep traceability: source system, source reference, status changes, reviewer and timestamps.

## 13. Acceptance criteria
1. Employee can create private evidence.
2. Employee can submit evidence for manager review.
3. Authorized manager can Accept / Needs edit / Discuss / Exclude.
4. Review decisions are recorded separately.
5. Manager-private observations stay private until intentionally shared.
6. Year-end generation uses accepted evidence only.
7. Objective/value configuration can change without redesigning app screens.
8. Another employee cannot access another employee's evidence through either UI or underlying permissions.
9. AI does not invent metrics or impact.
10. AI does not score/rank employees or infer internal traits.
11. Trello cards remain candidates until employee confirms contribution/impact.
12. Source links/IDs are preserved when permitted.
13. Power App is usable as a Microsoft Teams tab.

## 14. Build order for the next AI
1. Validate the existing `PFE Evidence Tool` list schema.
2. Add missing columns, including the generic external-source fields.
3. Create supporting lists in the same permitted SharePoint/Microsoft Lists location when possible.
4. Create responsive canvas app.
5. Connect lists.
6. Implement employee draft + submit workflow.
7. Implement manager review + audit trail.
8. Implement quarterly/year-end views.
9. Add Power Automate notifications/drafting flows.
10. Add Copilot/Agent drafting with the guardrails above.
11. Verify tenant-approved method for Trello integration before implementing Trello retrieval.
12. Test permissions with at least separate employee and manager identities.
13. Publish/share app and surface it as a Teams tab.

## 15. Current state
- `PFE Evidence Tool` list exists.
- User has permission to create lists, document libraries, and Agents, but not a SharePoint site.
- Column design has been established but may not all be created yet.
- Trello has been identified as an additional required evidence source for employees who use it to track tasks.
- No Trello retrieval integration has yet been verified in the target tenant.
