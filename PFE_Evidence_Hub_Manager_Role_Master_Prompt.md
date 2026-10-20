# PFE Evidence Hub - Master Build Prompt: Manager Role

## Purpose
Build the **Manager experience** for the PFE Evidence Hub, a Teams-accessible performance evidence and review application. The Manager role must support employee evidence review, approval workflows, 1-on-1 review scheduling, and role-based goal catalogs.

This prompt is intended to be handed directly to an AI app-building assistant. Treat the requirements below as the functional source of truth for the Manager role.

---

## 1. Product Context

The PFE Evidence Hub helps employees collect evidence of their work throughout the performance cycle and gives managers a structured way to review that evidence.

The current solution direction is:

- **Microsoft Power Apps** for the application experience.
- **SharePoint Lists** as the initial data store rather than Dataverse.
- The app should be accessible through **Microsoft Teams** where practical.
- **Microsoft 365 identity** should be used to determine the signed-in user.
- Calendar integration should support **Teams and/or Outlook** meetings for manager-to-employee 1-on-1 review sessions.

Do not assume Dataverse is available unless the architecture is explicitly changed later.

---

# 2. Manager Role

When a Manager signs in, the application must recognize the user as a Manager and present a Manager-specific experience.

A Manager must be able to:

1. See employees who are their **direct reports**.
2. Open an employee and see that employee's **evidence logs**.
3. Review individual evidence records.
4. Add **comments, suggestions, and review notes**.
5. **Approve or reject** individual evidence records.
6. Schedule a **1-on-1 review session** with the employee through Teams or Outlook.
7. Create and maintain a reusable **catalog of candidate goals** organized by employee role.
8. Ensure employees only see goal candidates applicable to **their assigned role**.

---

# 3. Candidate Employee Roles

For the initial version, support exactly these candidate roles:

- Tester
- Test Lead
- System Analyst
- Programmer Analyst
- Business Analyst

The design should allow additional roles to be added later without rebuilding the application.

Use a configurable Role Catalog rather than hard-coding role behavior into individual screens wherever possible.

---

# 4. Manager Landing Dashboard

Create a Manager Dashboard as the default landing experience for managers.

## Dashboard elements

### My Team
Display only employees who are direct reports of the logged-in Manager.

For each employee show useful high-level information such as:

- Employee name
- Job/role
- Evidence count or evidence summary, when available from the underlying data
- Number/status of items awaiting manager review, when available
- Most recent evidence activity, when available
- Quick action to open the employee's evidence
- Quick action to schedule a 1-on-1

Do not expose employees outside the Manager's permitted team scope merely because records exist in SharePoint.

### Review Queue
Provide a focused area containing evidence requiring Manager action.

Suggested states:

- Submitted / Awaiting Review
- Approved
- Rejected
- Needs Revision

The Manager should be able to filter the queue by employee, status, evidence category, or performance period if those fields exist in the application data model.

### Goal Catalog
Provide an entry point for creating and maintaining role-based candidate goals.

---

# 5. Employee Detail Experience

When the Manager selects a direct report, open an Employee Detail view.

Include:

- Employee identity
- Assigned candidate role
- Evidence history
- Evidence status
- Employee-entered evidence details
- Supporting links or attachments when present
- Manager comments/review history
- Goal information relevant to that employee
- 1-on-1 scheduling action

The Manager must be able to open individual evidence records without editing the employee's original evidence content unless a future requirement explicitly permits it.

Keep employee-authored content and Manager review content logically separate.

---

# 6. Evidence Review Workflow

Each evidence record submitted for review should support a Manager review lifecycle.

## Manager actions

For an evidence item, provide:

- **Approve**
- **Reject**
- **Request Revision / Needs Revision**
- **Add Comment**
- **Add Suggestion**

## Review information to capture

Capture, at minimum:

- Evidence record ID
- Employee
- Manager/reviewer
- Review status
- Manager comment
- Manager suggestion, if used separately
- Review date/time

Preserve historical review information where practical so that a later Manager action does not silently erase the previous review trail.

## Approval

When approved:

- Change the review status to Approved.
- Record who approved it.
- Record the approval date/time.
- Retain associated Manager comments.
- Make the resulting status visible to the employee.

## Rejection

When rejected:

- Require or strongly encourage a reason/comment.
- Record who rejected it.
- Record the date/time.
- Make the status and Manager feedback visible to the employee.

## Needs Revision

Use this when the evidence is potentially valid but requires clarification or improvement before approval.

The employee must be able to see the feedback and subsequently update/resubmit the evidence through the Employee experience.

---

# 7. Manager Comments and Suggestions

Manager feedback must not overwrite the employee's evidence description.

Support a distinct Manager feedback area.

Where practical, model review comments as separate records so the system can maintain a chronological review history containing:

- Comment
- Author
- Date/time
- Related evidence item
- Comment/review type

Potential types:

- Comment
- Suggestion
- Revision Request
- Approval Note
- Rejection Reason

---

# 8. 1-on-1 Review Scheduling

From an employee's record, provide a **Schedule 1-on-1** action.

The scheduling workflow should prepare a calendar meeting between:

- The logged-in Manager
- The selected employee

Support Microsoft Teams and/or Outlook calendar integration, subject to the connectors and permissions available in the target Microsoft 365 environment.

Suggested meeting information:

- Subject: `PFE Review - <Employee Name>`
- Manager as organizer
- Employee as attendee
- Date
- Start time
- End time
- Meeting description/agenda
- Teams meeting option when supported

Suggested agenda content:

1. Review recent evidence
2. Discuss Manager feedback
3. Review current goals
4. Identify development opportunities
5. Agree on follow-up actions

The app should not create a meeting silently. The Manager should be able to review the meeting information before the scheduling action is completed unless the final implementation explicitly defines a one-click scheduling workflow.

---

# 9. Role-Based Goal Catalog

Create a configurable **Role Goal Catalog** managed by Managers.

The purpose is to let a Manager define candidate goals and objectives appropriate to specific employee roles.

Example:

> A Manager creates goals for the **Tester** role. Employees assigned the Tester role can see Tester candidate goals in their Employee experience, while users assigned System Analyst, Programmer Analyst, Business Analyst, or Test Lead roles do not see those Tester-only candidate goals.

## Initial supported roles

1. Tester
2. Test Lead
3. System Analyst
4. Programmer Analyst
5. Business Analyst

## Goal record

A candidate goal should support fields such as:

- Goal ID
- Goal title
- Goal description
- Applicable role
- Goal category
- Expected objective/outcome
- Suggested success measure
- Active/Inactive status
- Created by
- Created date
- Modified by
- Modified date

Optional future fields may include:

- Performance year/cycle
- Priority
- Weight
- Suggested target date
- Competency/value alignment

---

# 10. Role Goal Visibility Rules

Role filtering is a core requirement.

An employee must only see candidate goals that are applicable to their assigned candidate role.

Examples:

- Tester -> Tester goals only
- Test Lead -> Test Lead goals only
- System Analyst -> System Analyst goals only
- Programmer Analyst -> Programmer Analyst goals only
- Business Analyst -> Business Analyst goals only

A Manager may maintain goals for multiple supported roles, but the Employee experience must filter goal candidates based on the employee's assigned role.

Do not rely solely on hiding buttons or screen controls as the security model. Apply appropriate data access controls within the constraints of Power Apps, SharePoint, Microsoft 365, and the organization's configured permissions.

---

# 11. Goal Catalog Manager Experience

Create a Manager interface called **Goal Catalog**.

The Manager must be able to:

- View candidate goals
- Filter by role
- Add a new goal
- Edit a goal
- Activate/deactivate a goal
- Search goals
- View goal details

When creating a goal, require selection of one of the supported roles.

Example form:

**Role:** Tester  
**Goal Title:** Improve regression test automation coverage  
**Description:** Identify suitable regression scenarios and increase automated coverage for repeatable test cases.  
**Expected Outcome:** Increased repeatability and reduced manual regression effort.  
**Success Measure:** Defined by the Manager based on the team's agreed expectations.  
**Status:** Active

Treat example goal wording as sample content, not mandatory organizational policy.

---

# 12. SharePoint-Oriented Data Model

Design the solution so it can initially operate with SharePoint Lists.

Recommended logical lists/entities:

## Employees / User Profiles

Purpose: application-specific employee profile and role mapping.

Suggested fields:

- Employee
- Employee Email / UPN
- Manager
- Manager Email / UPN
- Candidate Role
- Active

## Evidence Log

Purpose: employee evidence records.

Suggested fields:

- Evidence ID
- Employee
- Employee Email
- Title
- Description
- Evidence Category
- Evidence Date
- Source
- Link
- Attachment(s)
- Review Status
- Submitted Date

## Evidence Reviews

Purpose: Manager review history.

Suggested fields:

- Review ID
- Evidence ID / lookup
- Employee
- Reviewer
- Review Status
- Comment
- Suggestion
- Review Date

## Role Catalog

Purpose: supported employee roles.

Suggested fields:

- Role Name
- Role Description
- Active

Seed it with:

- Tester
- Test Lead
- System Analyst
- Programmer Analyst
- Business Analyst

## Role Goal Catalog

Purpose: reusable candidate goals.

Suggested fields:

- Goal ID
- Goal Title
- Goal Description
- Applicable Role
- Category
- Expected Outcome
- Success Measure
- Active
- Created By
- Created Date
- Modified By
- Modified Date

## Review Sessions

Purpose: optional application-level tracking of scheduled PFE review meetings.

Suggested fields:

- Session ID
- Employee
- Manager
- Scheduled Date
- Start Time
- End Time
- Calendar Event ID, when available
- Teams Meeting Link, when available
- Session Status

The implementation AI may refine column types and relationships, but it must preserve these logical capabilities.

---

# 13. Permissions and Access Rules

Implement access with least privilege in mind.

## Manager

A Manager can:

- See their permitted direct reports.
- See evidence belonging to those employees.
- Review applicable evidence.
- Add Manager review comments/suggestions.
- Approve/reject/request revision.
- Manage candidate goals they are authorized to maintain.
- Schedule a 1-on-1 with a permitted employee.

## Employee

An Employee can:

- See their own evidence.
- See Manager feedback on their evidence.
- See candidate goals applicable to their assigned role.
- Not see another employee's evidence simply because they share the same role.

## Administrative considerations

Do not assume that Power Apps filtering alone constitutes full security. Account for SharePoint list permissions, application permissions, and connector permissions during implementation.

If automatic Microsoft 365 reporting-line retrieval is unavailable or unsuitable, use the application Employee/User Profile mapping as the controlled source for Manager-to-employee relationships.

---

# 14. Suggested Navigation

Manager navigation should include:

1. **Dashboard**
2. **My Team**
3. **Review Queue**
4. **Goal Catalog**
5. **Review Sessions**

Possible employee detail path:

`My Team -> Employee -> Evidence -> Evidence Review`

Possible goal path:

`Goal Catalog -> Select Role -> View Goals -> Add/Edit Goal`

---

# 15. UX Requirements

Build a clean, professional Microsoft 365-style interface suitable for embedding in Teams.

Priorities:

- Simple navigation
- Clear status indicators
- Minimal clicks for evidence review
- Strong separation between employee evidence and Manager feedback
- Accessible controls
- Responsive layout where practical
- Confirmation before destructive or final actions such as rejection
- Consistent role and status labels

Suggested status colors:

- Awaiting Review: amber
- Approved: green
- Rejected: red
- Needs Revision: orange
- Draft: neutral gray

Do not make color the only indicator of status; include visible text labels.

---

# 16. Core Business Rules

Implement these rules consistently:

1. A Manager can only access employees within their authorized Manager scope.
2. Evidence ownership remains with the employee.
3. Manager feedback must be stored separately from employee-authored evidence wherever practical.
4. Approval/rejection must record reviewer identity and date/time.
5. Rejection/Revision feedback must be visible to the employee.
6. Candidate goals must be assigned to a role.
7. Employees only see active candidate goals for their assigned role.
8. Goal visibility must not expose other employees' information.
9. The five initial roles must be configurable and extensible.
10. Meeting scheduling must use the selected employee and signed-in Manager, not manually inferred identities.
11. Do not assume Dataverse availability.
12. Preserve an auditable review history wherever practical.

---

# 17. Key Screens to Build

Build, at minimum:

## Manager Dashboard
Team overview, review queue summary, and shortcuts.

## My Team
Direct-report listing with employee lookup/filtering.

## Employee Detail
Employee profile, evidence summary, goal information, and 1-on-1 action.

## Evidence Detail / Review
Evidence content plus Manager feedback and approve/reject/revision actions.

## Goal Catalog
Role filters and candidate goal management.

## Goal Edit
Create/edit goal with applicable role.

## Review Sessions
Display review sessions recorded by the application when that tracking feature is implemented.

---

# 18. Implementation Expectations for the AI Builder

When generating the application:

1. Prefer reusable components and configuration-driven role/status values.
2. Do not hard-code individual Manager or employee names.
3. Use the signed-in Microsoft 365 identity.
4. Keep SharePoint delegation limitations in mind when designing Power Apps queries.
5. Keep Manager/employee access rules centralized rather than duplicating inconsistent logic across screens.
6. Validate required fields before saving review decisions or goals.
7. Provide clear success/error feedback after data operations.
8. Avoid silently overwriting review history.
9. Keep the architecture compatible with a later migration from SharePoint to Dataverse if required, without making Dataverse a dependency now.
10. Treat calendar/Teams functionality as an integration boundary and handle connector permission failures gracefully.

---

# 19. Acceptance Criteria

The Manager role is successful when these scenarios work:

### Direct reports
Given a signed-in Manager, the app displays only employees within that Manager's authorized direct-report scope.

### Evidence review
The Manager can select an employee, open evidence, add feedback, and set the evidence to Approved, Rejected, or Needs Revision.

### Review audit
The app records the reviewer and review date/time without replacing the employee's original evidence content.

### Employee feedback
The employee can subsequently see the Manager's review status and relevant feedback for their evidence.

### 1-on-1
The Manager can initiate a Teams/Outlook 1-on-1 scheduling workflow for the selected employee using the correct identities.

### Goal creation
The Manager can create a candidate goal and assign it to one of the five supported roles.

### Role filtering
A Tester sees active Tester candidate goals and does not see candidate goals belonging exclusively to Test Lead, System Analyst, Programmer Analyst, or Business Analyst.

The same rule applies correspondingly to every supported role.

### Extensibility
A future authorized administrator can add a new role to the catalog without requiring a fundamental redesign of the app's role/goal data model.

---

# 20. Out of Scope Unless Added Later

Do not automatically introduce the following as mandatory dependencies:

- Dataverse
- AI-generated employee performance ratings
- Automatic employee scoring
- Forced ranking of employees
- Payroll/compensation decisions
- HR disciplinary workflows

The app's purpose is to organize evidence, goals, Manager feedback, review status, and review conversations. It should support human review rather than make performance judgments automatically.

---

# 21. Build Priority

Implement in this order:

1. Manager identity and authorized team scope
2. My Team
3. Employee evidence visibility
4. Evidence review and comments
5. Approve / Reject / Needs Revision workflow
6. Role Catalog
7. Role Goal Catalog
8. Employee role-based goal visibility
9. 1-on-1 scheduling integration
10. Review Sessions tracking
11. Dashboard refinements and reporting

---

# Final Instruction to the Building AI

Build the Manager experience as a practical, deployable module of the PFE Evidence Hub using **Power Apps + SharePoint Lists + Microsoft 365 integration** as the initial architecture.

Prioritize correct access scoping, traceable review actions, simple evidence review, configurable role-based goals, and a clean Teams-friendly user experience.

Do not invent organizational policies, performance criteria, reporting relationships, or security permissions. Where environment-specific configuration is required, expose it clearly as configuration rather than hard-coding an assumption.
