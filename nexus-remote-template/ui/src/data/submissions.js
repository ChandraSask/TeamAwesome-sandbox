// Mock data + a tiny persistent store for the example UI.
//
// This is the ONE seam to replace when you wire a real backend: swap the bodies
// of `loadSubmissions` and `createSubmission` for `callApi('/api/submissions')`
// (see ui/src/lib/callApi.js — it mints a fresh Token B per call and handles the
// host session contract). Nothing else in the UI knows the data is fake.

const STORAGE_KEY = 'nx-submissions'
const OVERRIDES_KEY = 'nx-submission-overrides'

const REGIONS = ['North', 'South', 'East', 'West', 'Central']
const SITES = [
  'Riverside Depot',
  'Harbour Point',
  'Elm Street Office',
  'Summit Plaza',
  'Maple Yard',
  'Lakeside Campus',
  'Granite Park',
  'Cedar Hub',
]
const OWNERS = ['Avery Chen', 'Jordan Patel', 'Sam Rivera', 'Taylor Brooks', 'Morgan Lee', 'Riley Nguyen']
const ACCOUNTS = [
  'Northwind Traders',
  'Contoso Ltd',
  'Fabrikam Inc',
  'Adatum Corp',
  'Tailspin Toys',
  'Litware Inc',
  'Proseware',
  'Wingtip Supplies',
  'Lucerne Publishing',
  'Alpine Ski House',
]
const CATEGORIES = ['Standard', 'Expedited', 'Custom', 'Renewal']
const TITLES = [
  'Site access upgrade',
  'New equipment install',
  'Capacity expansion',
  'Relocation request',
  'Service extension',
  'Quarterly maintenance',
  'Compliance review',
  'Integration setup',
]

// A fixed status mix so the Dashboard chips, filters and pager all have something to show.
const STATUS_PATTERN = [
  'Active',
  'In_Review',
  'Completed',
  'Replied',
  'More_Info',
  'Active',
  'Draft',
  'Completed',
  'In_Review',
  'Rejected',
  'Replied',
  'Active',
  'Completed',
  'Cancelled',
  'In_Review',
  'Active',
  'Expired',
  'Replied',
  'Completed',
  'More_Info',
  'Draft',
  'Active',
  'In_Review',
  'Completed',
  'Replied',
  'Active',
  'Cancelled',
  'Completed',
  'In_Review',
  'Active',
  'Replied',
  'Draft',
  'Completed',
  'Active',
]

const DAY = 24 * 60 * 60 * 1000
const BASE = Date.UTC(2026, 9, 12) // 2026-10-12

/** Routing rule shared by the seed data and the New Submission form. */
export function teamForCategory(category) {
  return category === 'Expedited' || category === 'Custom' ? 'B' : 'A'
}

function buildSeed() {
  return STATUS_PATTERN.map((status, i) => {
    const priced = status === 'Replied' || status === 'Completed'
    const n = STATUS_PATTERN.length - i
    const category = CATEGORIES[i % CATEGORIES.length]
    return {
      id: `SUB-${String(100 + n).padStart(6, '0')}`,
      status,
      team: teamForCategory(category),
      createdAt: new Date(BASE - i * 2 * DAY).toISOString(),
      region: REGIONS[i % REGIONS.length],
      site: SITES[(i * 3) % SITES.length],
      owner: OWNERS[(i * 5) % OWNERS.length],
      account: ACCOUNTS[(i * 7) % ACCOUNTS.length],
      title: TITLES[(i * 3 + 1) % TITLES.length],
      category,
      amount: priced ? 1000 * (5 + ((i * 7) % 55)) : null,
      needsReply: status === 'More_Info',
      seeded: true,
    }
  })
}

function readExtra() {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeExtra(list) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* storage may be blocked inside an embedded host — never break the UI */
  }
}

// Status changes made by reviewers. Kept as an id -> patch overlay so it applies to the
// generated seed rows and to rows created through the form alike.
function readOverrides() {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(OVERRIDES_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function writeOverrides(map) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(OVERRIDES_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

/** All submissions, newest first. */
export async function loadSubmissions() {
  const overrides = readOverrides()
  const all = [...readExtra(), ...buildSeed()].map((s) => (overrides[s.id] ? { ...s, ...overrides[s.id] } : s))
  return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

/**
 * Move a submission to a new status (a reviewer action).
 * In a real app this is `callApi(`/api/submissions/${id}/status`, { fetchInit: { method: 'POST', ... } })`
 * — and the BACKEND must check the caller's role (`require_permission("submission.review")`).
 */
export async function setSubmissionStatus(id, status) {
  const map = readOverrides()
  map[id] = { ...(map[id] || {}), status, needsReply: false }
  writeOverrides(map)
}

function nextId() {
  const nums = [...readExtra(), ...buildSeed()].map((s) => Number(String(s.id).replace(/\D/g, '')) || 0)
  return `SUB-${String(Math.max(0, ...nums) + 1).padStart(6, '0')}`
}

/**
 * Persist a submission made in the New Submission form.
 * `asDraft` keeps it in "Draft"; otherwise it is "Active" and routed to a team.
 */
export async function createSubmission(values, { asDraft = false, owner = 'You' } = {}) {
  const sub = {
    id: nextId(),
    status: asDraft ? 'Draft' : 'Active',
    team: teamForCategory(values.category),
    createdAt: new Date().toISOString(),
    region: values.province || '—',
    site: values.onsite_name || values.city || '—',
    owner,
    account: values.account_name || '(unnamed account)',
    title: values.title || 'Untitled submission',
    category: values.category || 'Standard',
    amount: null,
    needsReply: false,
    seeded: false,
    answers: values,
  }
  writeExtra([sub, ...readExtra()])
  return sub
}

/** Remove everything created or changed in this browser (handy while developing). */
export function resetDemoData() {
  writeExtra([])
  writeOverrides({})
}
