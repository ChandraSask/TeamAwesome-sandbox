from pathlib import Path

from reportlab.graphics.shapes import Drawing, Line, Polygon, Rect, String
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from pypdf import PdfReader


OUTPUT_PATH = Path(__file__).with_name("Innovation_Pod_Readiness_Checklist.pdf")

NAVY = HexColor("#122B45")
TEAL = HexColor("#1E9E92")
CORAL = HexColor("#E76F51")
BLUE = HexColor("#3F67D7")
INK = HexColor("#1C2733")
MUTED = HexColor("#5E6D7C")
PALE = HexColor("#F3F6F8")
PALE_TEAL = HexColor("#E8F5F3")
PALE_BLUE = HexColor("#EDF1FC")
PALE_CORAL = HexColor("#FCEFEB")
RULE = HexColor("#D7E0E7")


def build_styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=27,
            leading=31,
            textColor=NAVY,
            alignment=TA_LEFT,
            spaceAfter=12,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=12,
            leading=18,
            textColor=MUTED,
        ),
        "h1": ParagraphStyle(
            "H1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=17,
            leading=21,
            textColor=NAVY,
            spaceBefore=4,
            spaceAfter=10,
            keepWithNext=True,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=TEAL,
            spaceBefore=7,
            spaceAfter=5,
            keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.2,
            leading=13.2,
            textColor=INK,
            spaceAfter=5,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.8,
            leading=10.5,
            textColor=MUTED,
        ),
        "check": ParagraphStyle(
            "Check",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.7,
            leading=11.6,
            textColor=INK,
        ),
        "table": ParagraphStyle(
            "Table",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.6,
            leading=10,
            textColor=INK,
        ),
        "table_head": ParagraphStyle(
            "TableHead",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9.5,
            textColor=colors.white,
        ),
        "callout": ParagraphStyle(
            "Callout",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=14,
            textColor=NAVY,
            alignment=TA_CENTER,
        ),
    }


STYLES = build_styles()


def p(text, style="body"):
    return Paragraph(text, STYLES[style])


def section(number, title):
    return [p(f"{number}. {title}", "h1")]


def checklist(items):
    rows = [[p("[ ]", "check"), p(item, "check")] for item in items]
    table = Table(rows, colWidths=[0.27 * inch, 6.05 * inch], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TEXTCOLOR", (0, 0), (0, -1), TEAL),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                ("TOPPADDING", (0, 0), (-1, -1), 2.2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2.2),
            ]
        )
    )
    return table


def data_table(headers, rows, widths, alternating=True):
    values = [[p(value, "table_head") for value in headers]]
    values.extend([[p(str(value), "table") for value in row] for row in rows])
    table = Table(values, colWidths=widths, repeatRows=1, hAlign="LEFT")
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.35, RULE),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    if alternating:
        for row_index in range(2, len(values), 2):
            commands.append(("BACKGROUND", (0, row_index), (-1, row_index), PALE))
    table.setStyle(TableStyle(commands))
    return table


def callout(text, background=PALE_TEAL):
    table = Table([[p(text, "callout")]], colWidths=[6.35 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), background),
                ("BOX", (0, 0), (-1, -1), 0.8, TEAL),
                ("LEFTPADDING", (0, 0), (-1, -1), 16),
                ("RIGHTPADDING", (0, 0), (-1, -1), 16),
                ("TOPPADDING", (0, 0), (-1, -1), 11),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
            ]
        )
    )
    return table


def architecture_diagram():
    drawing = Drawing(455, 155)

    def box(x, y, width, height, label, fill, stroke=NAVY):
        drawing.add(Rect(x, y, width, height, 4, 4, fillColor=fill, strokeColor=stroke, strokeWidth=0.8))
        drawing.add(String(x + width / 2, y + height / 2 - 3, label, textAnchor="middle", fontName="Helvetica-Bold", fontSize=7.6, fillColor=NAVY))

    def arrow(x1, y1, x2, y2):
        drawing.add(Line(x1, y1, x2, y2, strokeColor=MUTED, strokeWidth=1.2))
        direction = 1 if x2 >= x1 else -1
        drawing.add(Polygon([x2, y2, x2 - 5 * direction, y2 + 3, x2 - 5 * direction, y2 - 3], fillColor=MUTED, strokeColor=MUTED))

    box(3, 58, 74, 34, "Web UI", PALE_BLUE, BLUE)
    box(108, 58, 86, 34, "Authenticated API", PALE_TEAL, TEAL)
    box(236, 103, 92, 32, "Microsoft Entra ID", PALE_BLUE, BLUE)
    box(236, 58, 92, 34, "Azure AI model", PALE_CORAL, CORAL)
    box(236, 13, 92, 32, "Synthetic data", PALE_TEAL, TEAL)
    box(371, 103, 80, 32, "Key Vault", PALE, MUTED)
    box(371, 58, 80, 34, "App Insights", PALE, MUTED)
    box(371, 13, 80, 32, "Mock adapters", PALE_BLUE, BLUE)

    arrow(77, 75, 108, 75)
    arrow(194, 75, 236, 75)
    arrow(194, 78, 236, 119)
    arrow(194, 72, 236, 29)
    arrow(328, 75, 371, 75)
    arrow(328, 119, 371, 119)
    arrow(328, 29, 371, 29)
    drawing.add(String(411, 2, "Future: Microsoft 365 / HR", textAnchor="middle", fontName="Helvetica-Oblique", fontSize=6.5, fillColor=MUTED))
    return drawing


def page_chrome(canvas, document):
    canvas.saveState()
    width, height = letter
    canvas.setFillColor(NAVY)
    canvas.rect(0, height - 13, width, 13, fill=1, stroke=0)
    canvas.setFillColor(TEAL)
    canvas.rect(0, height - 16, width, 3, fill=1, stroke=0)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(42, 24, "PFE ASSISTANT  |  INNOVATION POD READINESS")
    canvas.drawRightString(width - 42, 24, f"PAGE {document.page}")
    canvas.setStrokeColor(RULE)
    canvas.line(42, 33, width - 42, 33)
    canvas.restoreState()


def build_story():
    story = []
    story.extend(
        [
            Spacer(1, 0.55 * inch),
            p("INNOVATION POD", "h2"),
            p("Readiness Checklist", "title"),
            p("PFE Assistant proof-of-concept build and validation session", "subtitle"),
            Spacer(1, 0.24 * inch),
            callout(
                "Objective: ensure participants spend the event building and validating priority journeys, not resolving environments, access, data, or tooling.",
                PALE_TEAL,
            ),
            Spacer(1, 0.28 * inch),
            p("Recommended delivery position", "h1"),
            p(
                "Run the event as a controlled prototype exercise using synthetic employee records, pre-provisioned identities, an approved AI endpoint, and mock integration adapters. Treat live Microsoft 365 and HR integration as a governed follow-on unless all permissions and test environments are already approved.",
                "body",
            ),
            Spacer(1, 0.12 * inch),
            data_table(
                ["NOW: BUILD DAY", "NEXT: GOVERNED PILOT", "LATER: ENTERPRISE"],
                [
                    [
                        "Mock profiles and records<br/>Employee and manager journeys<br/>Demonstrated AI interaction",
                        "Approved authentication<br/>Volunteer user group<br/>Privacy and workflow review",
                        "Microsoft 365 and HR sources<br/>Permission-aware access<br/>Production security and support",
                    ]
                ],
                [2.12 * inch, 2.12 * inch, 2.12 * inch],
                alternating=False,
            ),
            Spacer(1, 0.25 * inch),
            p("Working assumptions", "h2"),
            checklist(
                [
                    "One-day event with a tightly controlled scope and a five-minute final demonstration.",
                    "Two or three user journeys only: employee appraisal, AI-assisted drafting, and manager/development visibility.",
                    "Synthetic data only; no real employee performance or personal information.",
                    "A single starter repository and reference architecture are supplied to all participants.",
                    "Production hardening, live Graph/HR integration, and broad user rollout are outside build-day scope.",
                ]
            ),
            PageBreak(),
        ]
    )

    story.extend(section("1", "Minimum Readiness Gate"))
    story.append(p("The event should not start unless every item below is green 48 hours beforehand."))
    story.append(
        checklist(
            [
                "Every participant can access the repository, install dependencies, and run the starter application.",
                "Authentication and an AI model call succeed from participant devices and the shared environment.",
                "Synthetic data and the agreed user journeys are ready, documented, and accepted by the product owner.",
                "A shared deployment target exists and a named technical owner can deploy to it.",
                "Product, technical, cloud/identity, and privacy decision-makers are available during the session.",
                "Mock integrations and deterministic AI fallback responses can keep teams moving through an outage.",
                "The demo script, acceptance criteria, success measures, and required deliverables are agreed.",
            ]
        )
    )
    story.append(Spacer(1, 10))
    story.append(callout("GO / NO-GO RULE: any unresolved identity, model-access, data-approval, or deployment blocker triggers a scope reduction or postponement.", PALE_CORAL))
    story.append(Spacer(1, 14))

    story.extend(section("2", "Development Environments"))
    story.append(
        checklist(
            [
                "Single GitHub repository with starter application, README, issue board, and simple branch/merge convention.",
                "Runtime and package versions pinned; package lockfiles committed and dependency restore tested.",
                "VS Code workspace settings or a dev container supplied with required extensions.",
                "One-command setup, start, seed, test, and build scripts available.",
                "Sample environment file contains placeholders only; no credentials are committed.",
                "Local mock APIs cover employee profiles, accomplishments, goals, training, and manager relationships.",
                "Shared integration environment is deployed, healthy, observable, and resettable.",
                "Clean-machine setup is verified by someone who did not create the starter project.",
                "Offline/mock AI mode is documented and can be enabled without code changes.",
            ]
        )
    )

    story.extend(section("3", "Access, Permissions, and Licensing"))
    story.append(
        checklist(
            [
                "GitHub organization, repository, package registry, and pull-request access granted and tested.",
                "GitHub Copilot Business/Enterprise seats assigned where required by the chosen workflow.",
                "Azure subscription, resource group, spending guardrail, regional availability, and AI model quota confirmed.",
                "Participants receive least-privilege development roles; deployment authority remains with designated leads.",
                "Microsoft Entra test users/groups, app registration, redirect URIs, and API permissions are configured.",
                "Azure AI endpoint access works for every team without sharing API keys.",
                "Power Platform or Microsoft 365 developer licenses are assigned only if those services are in scope.",
                "VPN, proxy, firewall, browser, package feed, and corporate device restrictions are tested in advance.",
                "No build-day dependency remains on pending tenant-admin consent or procurement.",
            ]
        )
    )
    story.append(PageBreak())

    story.extend(section("4", "AI and Developer Tooling"))
    story.append(
        checklist(
            [
                "Approved model and region selected; endpoint deployed and capacity tested before the event.",
                "Model access occurs server-side through the approved SDK; the browser never receives model credentials.",
                "Prompt templates, grounding fields, expected output structure, and representative examples are supplied.",
                "Content-safety controls are enabled and refusal/error behavior is visible to users.",
                "Token limits, timeouts, retry policy, rate limits, concurrency, and event-day cost ceiling are defined.",
                "Application Insights or equivalent diagnostics capture latency, failures, correlation IDs, and token usage without sensitive prompt content.",
                "A small evaluation set covers normal, incomplete, adversarial, cross-user, and unsafe requests.",
                "AI output is clearly labelled and requires user confirmation before saving or submission.",
                "AI assists with drafting, summarization, and gap detection; it does not determine ratings, promotion, compensation, or employment outcomes.",
            ]
        )
    )
    story.append(Spacer(1, 12))
    story.extend(section("5", "Reference Architecture and Integration"))
    story.append(architecture_diagram())
    story.append(
        checklist(
            [
                "Employee/manager authorization is enforced by the API and tested for cross-user access.",
                "Secrets and configuration are stored outside source control; managed identity is preferred for Azure access.",
                "Microsoft 365 and HR dependencies sit behind versioned, mockable adapter interfaces.",
                "Frontend/backend teams agree API contracts and sample payloads before parallel development begins.",
                "AI calls include correlation, timeout, retry, graceful degradation, and user-safe error states.",
                "Live integration remains excluded unless test tenants, permissions, sample data, and an integration owner are ready.",
            ]
        )
    )

    story.extend(section("6", "Data, Privacy, and Security"))
    story.append(
        checklist(
            [
                "Use synthetic records only; mark the dataset clearly as fictitious.",
                "Exclude real reviews, employee identifiers, compensation, health, demographic, disciplinary, and other sensitive HR information.",
                "Define employee, manager, administrator, and support visibility rules before implementation.",
                "Redact or suppress sensitive free text from prompts, logs, traces, screenshots, and telemetry.",
                "Define retention and deletion behavior for prompts, outputs, uploaded content, and test records.",
                "Test prompt injection, data exfiltration, cross-user access, harmful content, and accidental disclosure.",
                "Show AI provenance and require human review; provide a clear path to discard or edit generated content.",
                "Privacy, security, HR, and employee-relations stakeholders approve the prototype boundaries.",
            ]
        )
    )
    story.append(PageBreak())

    story.extend(section("7", "Technical Resources and SMEs"))
    story.append(
        data_table(
            ["ROLE", "BUILD-DAY RESPONSIBILITY", "AVAILABILITY"],
            [
                ["Event lead", "Own scope, agenda, decisions, timeboxes, and blocker escalation.", "Full day"],
                ["Product owner / HR SME", "Clarify PFE workflow, policy, terminology, and acceptance criteria.", "Full day"],
                ["Technical lead", "Own architecture, interfaces, implementation decisions, and code quality.", "Full day"],
                ["Azure / Entra administrator", "Resolve resources, roles, identity, quota, and deployment access.", "Full day or immediate on-call"],
                ["AI engineer", "Guide model use, prompts, safety, grounding, and evaluation.", "Core build blocks"],
                ["Security / privacy SME", "Review data flows, threat boundaries, logging, and demo content.", "Opening and review gates"],
                ["UX representative", "Keep employee and manager journeys coherent and testable.", "Core build blocks"],
                ["DevOps support", "Maintain repository, pipelines, shared environment, and observability.", "Full day or immediate on-call"],
                ["Integration SME", "Advise on Microsoft Graph, HR, learning, and enterprise constraints.", "Scheduled office hours"],
            ],
            [1.25 * inch, 3.88 * inch, 1.22 * inch],
        )
    )
    story.append(Spacer(1, 14))

    story.extend(section("8", "Pre-Event Plan"))
    story.append(
        data_table(
            ["WHEN", "REQUIRED ACTIVITY", "EXIT EVIDENCE"],
            [
                ["T-3 to 4 weeks", "Confirm sponsor, product owner, participants, problem statement, scope, and success measures.", "Approved event charter"],
                ["T-2 weeks", "Select journeys; agree architecture, data policy, AI boundary, and integration mocks.", "Architecture and acceptance criteria"],
                ["T-1 week", "Provision resources, identities, licenses, model, repository, starter app, and synthetic data.", "Access matrix and healthy environment"],
                ["T-3 days", "Run a complete clean-account dry run, including setup, AI call, tests, deployment, and demo path.", "Dry-run report; blockers assigned"],
                ["T-2 days", "Freeze infrastructure and dependencies; execute the formal go/no-go readiness gate.", "Signed readiness decision"],
                ["T-1 day", "Reset data, verify backup demo, publish agenda, teams, contacts, and escalation route.", "Event pack distributed"],
            ],
            [0.9 * inch, 3.75 * inch, 1.7 * inch],
        )
    )
    story.append(Spacer(1, 12))
    story.append(p("Suggested build-day cadence", "h2"))
    story.append(
        data_table(
            ["TIMEBOX", "OUTCOME"],
            [
                ["Kickoff: 30 min", "Scope, guardrails, teams, acceptance tests, and architecture confirmed."],
                ["Build block 1: 2 hr", "End-to-end thin slice running with synthetic data."],
                ["Checkpoint: 20 min", "Integration test, blocker triage, and scope adjustment."],
                ["Build block 2: 2.5 hr", "Priority experience completed; AI and authorization tests added."],
                ["Validation: 60 min", "Product, UX, safety, privacy, and technical acceptance performed."],
                ["Demo: 45 min", "Five-minute demonstration, findings, recommendation, and next steps."],
            ],
            [1.4 * inch, 4.95 * inch],
        )
    )
    story.append(PageBreak())

    story.extend(section("9", "Expected Outputs and Deliverables"))
    story.append(
        checklist(
            [
                "Working end-to-end prototype demonstrating the selected employee and manager journeys.",
                "Five-minute live or recorded demonstration using deterministic synthetic scenarios.",
                "Source code with setup, run, test, deployment, and troubleshooting instructions; no embedded secrets.",
                "Current architecture, integration boundaries, data flow, and authorization model.",
                "AI prompt set, evaluation results, observed limitations, safety findings, and example failures.",
                "Security/privacy assumptions, unresolved decisions, and proposed mitigations.",
                "Prioritized backlog separating governed-pilot work from production/enterprise integration.",
                "Sponsor recommendation: proceed, revise, or stop, with owners and estimated next steps.",
            ]
        )
    )
    story.append(Spacer(1, 12))
    story.extend(section("10", "Risks, Dependencies, and Common Pitfalls"))
    story.append(
        data_table(
            ["RISK / DEPENDENCY", "IMPACT", "PREVENTION OR FALLBACK"],
            [
                ["Access or admin-consent delay", "Team cannot authenticate, call services, or deploy.", "Pre-provision accounts; test each identity; keep mocks."],
                ["Model quota, throttling, or outage", "AI journey becomes unreliable or unavailable.", "Reserve/test quota; cap concurrency; provide deterministic responses."],
                ["Scope expansion", "Multiple partial features with no demonstrable journey.", "Fix two or three journeys; product owner controls backlog."],
                ["Real HR data introduced", "Privacy, policy, and reputational exposure.", "Synthetic-only rule; inspect seeds, prompts, logs, and demos."],
                ["AI bias or unsupported claims", "Unsafe performance-management recommendations.", "Restrict AI role; human review; evaluate refusal and edge cases."],
                ["Frontend/API contract mismatch", "Late integration failure.", "Agree contracts and fixtures; deliver a thin slice first."],
                ["Corporate network restrictions", "Packages, endpoints, or authentication are blocked.", "Test on participant devices and networks during dry run."],
                ["Secrets copied into code/chat", "Credential exposure.", "Managed identity/Key Vault; scanning; rotate immediately."],
                ["Telemetry captures personal text", "Sensitive content persists outside intended stores.", "Redaction, allow-listed fields, short retention, access control."],
                ["Demo instability", "Session cannot show the outcome reliably.", "Seed deterministic cases; rehearse; keep a recorded backup."],
                ["Prototype treated as production", "Controls and integration gaps are overlooked.", "Label limitations; document pilot and production exit criteria."],
            ],
            [1.55 * inch, 2.05 * inch, 2.75 * inch],
        )
    )
    story.append(PageBreak())

    story.extend(section("11", "Readiness Sign-Off"))
    story.append(p("Each owner should confirm readiness using evidence, not verbal assurance."))
    story.append(
        data_table(
            ["AREA", "ACCOUNTABLE OWNER", "STATUS", "EVIDENCE / OPEN ACTION"],
            [
                ["Scope and acceptance", "Product owner", "Red / Amber / Green", ""],
                ["Starter repository", "Technical lead", "Red / Amber / Green", ""],
                ["Participant environments", "DevOps lead", "Red / Amber / Green", ""],
                ["Azure and model capacity", "Cloud owner", "Red / Amber / Green", ""],
                ["Identity and permissions", "Entra administrator", "Red / Amber / Green", ""],
                ["Synthetic data", "Data owner", "Red / Amber / Green", ""],
                ["Privacy and security", "Security/privacy owner", "Red / Amber / Green", ""],
                ["AI evaluation and safety", "AI lead", "Red / Amber / Green", ""],
                ["Shared deployment", "Technical lead", "Red / Amber / Green", ""],
                ["Demo and fallback", "Event lead", "Red / Amber / Green", ""],
            ],
            [1.3 * inch, 1.35 * inch, 1.2 * inch, 2.5 * inch],
        )
    )
    story.append(Spacer(1, 18))
    story.append(callout("RECOMMENDATION: approve the event only when all minimum-gate items are green and every amber item has a named owner, workaround, and deadline.", PALE_TEAL))
    story.append(Spacer(1, 24))
    story.append(
        data_table(
            ["DECISION", "NAME", "DATE", "NOTES"],
            [["Proceed / Revise / Postpone", "", "", ""]],
            [1.7 * inch, 1.55 * inch, 1.05 * inch, 2.05 * inch],
            alternating=False,
        )
    )
    return story


def generate_pdf():
    document = SimpleDocTemplate(
        str(OUTPUT_PATH),
        pagesize=letter,
        rightMargin=42,
        leftMargin=42,
        topMargin=35,
        bottomMargin=46,
        title="Innovation Pod Readiness Checklist",
        author="Innovation Pod",
        subject="PFE Assistant build and validation event readiness",
    )
    document.build(build_story(), onFirstPage=page_chrome, onLaterPages=page_chrome)

    reader = PdfReader(str(OUTPUT_PATH))
    extracted_text = "\n".join(page.extract_text() or "" for page in reader.pages)
    required_phrases = [
        "Innovation Pod",
        "Minimum Readiness Gate",
        "Development Environments",
        "Data, Privacy, and Security",
        "Expected Outputs and Deliverables",
        "Risks, Dependencies, and Common Pitfalls",
    ]
    missing = [phrase for phrase in required_phrases if phrase.lower() not in extracted_text.lower()]
    if missing:
        raise RuntimeError(f"PDF validation failed; missing text: {missing}")
    if len(reader.pages) < 5:
        raise RuntimeError(f"PDF validation failed; expected at least 5 pages, found {len(reader.pages)}")
    print(f"Created {OUTPUT_PATH.name}: {len(reader.pages)} pages, {OUTPUT_PATH.stat().st_size:,} bytes")


if __name__ == "__main__":
    generate_pdf()