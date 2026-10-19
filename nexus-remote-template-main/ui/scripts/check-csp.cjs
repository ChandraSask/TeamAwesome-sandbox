#!/usr/bin/env node
/* ============================================================================
 * check-csp.cjs — fail the build when this remote's bundle would violate the
 * NEXUS HOST Content-Security-Policy.
 * ----------------------------------------------------------------------------
 * WHY THIS EXISTS
 *   A Module-Federation remote is loaded INTO the host document. The browser
 *   therefore evaluates the HOST's CSP against YOUR assets — your Container App
 *   serves no CSP of its own that matters. Worse, dev/demo run the host in
 *   Content-Security-Policy-Report-Only mode, so a violation is merely LOGGED
 *   there and only becomes a hard BLOCK in prod (CSP_REPORT_ONLY=false).
 *
 *   The result is the classic remote failure: "it worked in demo, the tile is
 *   blank in prod". This script moves that failure LEFT — to your own build.
 *
 * WHAT IT CHECKS (all derived from ui/nexus-csp.json, the frozen host mirror)
 *   1. devtool eval        — script-src has no 'unsafe-eval'
 *   2. inline <script>     — script-src has no 'unsafe-inline' and no nonce
 *   3. self-hosted fonts   — font-src excludes remote origins
 *   4. self-origin Workers — worker-src is 'self' blob: only
 *   5. .webmanifest        — manifest-src is 'self'
 *   6. media assets        — no media-src ⇒ falls back to default-src 'self'
 *   7. <object>/<embed>    — object-src 'none'
 *   8. CSP escape hatches  — a widened meta CSP smuggled into emitted HTML
 *
 * USAGE
 *   node scripts/check-csp.cjs               # lint dist/, warn-only findings ok
 *   node scripts/check-csp.cjs --strict      # any finding (incl. warn) fails
 *   node scripts/check-csp.cjs --dist ./out  # alternate build dir
 *
 * EXIT CODES:  0 = clean   1 = violation(s)   2 = bad invocation
 * ==========================================================================*/
'use strict';

const fs = require('fs');
const path = require('path');

const UI_ROOT = path.resolve(__dirname, '..');
const CSP_SPEC_PATH = path.join(UI_ROOT, 'nexus-csp.json');

// ── args ─────────────────────────────────────────────────────────────────────
function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.split('=').slice(1).join('=');
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) {
    return process.argv[i + 1];
  }
  return fallback;
}
const STRICT = process.argv.includes('--strict');
const DIST = path.resolve(UI_ROOT, arg('dist', 'dist'));

// ── output helpers ───────────────────────────────────────────────────────────
const C = { red: '\x1b[31m', yellow: '\x1b[33m', green: '\x1b[32m', dim: '\x1b[2m', off: '\x1b[0m' };
const findings = [];
function fail(rule, file, detail, fix) {
  findings.push({ level: 'error', rule, file, detail, fix });
}
function warn(rule, file, detail, fix) {
  findings.push({ level: 'warn', rule, file, detail, fix });
}

// ── load the frozen host policy ──────────────────────────────────────────────
if (!fs.existsSync(CSP_SPEC_PATH)) {
  console.error(
    `${C.red}[check-csp] ui/nexus-csp.json is MISSING.${C.off}\n` +
      '  That file is the frozen mirror of the NEXUS host CSP and is the contract\n' +
      '  this remote is built against. Restore it from the template — do not delete\n' +
      '  it to make the build pass.'
  );
  process.exit(2);
}
const SPEC = JSON.parse(fs.readFileSync(CSP_SPEC_PATH, 'utf8'));
const D = SPEC.directives || {};
const has = (dir, token) => Array.isArray(D[dir]) && D[dir].includes(token);
const grantsRemote = (dir) => (SPEC.grantsRemoteOrigin || []).includes(dir);

// Derived capability flags — read from the spec, never hardcoded here, so the
// checker automatically relaxes if the platform team ever widens the host CSP
// and re-syncs nexus-csp.json.
const ALLOW_EVAL = has('script-src', "'unsafe-eval'");
const ALLOW_INLINE_SCRIPT = has('script-src', "'unsafe-inline'");
const ALLOW_ORIGIN_FONTS = grantsRemote('font-src');
const ALLOW_ORIGIN_WORKERS = grantsRemote('worker-src');
const ALLOW_ORIGIN_MEDIA = grantsRemote('media-src') || Boolean(D['media-src']);
const ALLOW_MANIFEST = grantsRemote('manifest-src');
const ALLOW_OBJECT = !has('object-src', "'none'");

// ── file walking ─────────────────────────────────────────────────────────────
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
const rel = (p) => path.relative(UI_ROOT, p);

if (!fs.existsSync(DIST)) {
  console.error(
    `${C.red}[check-csp] build output not found: ${rel(DIST)}${C.off}\n` +
      '  Run `npm run build` first, or pass --dist <dir>.'
  );
  process.exit(2);
}

const files = walk(DIST);
const js = files.filter((f) => /\.(js|mjs)$/i.test(f));
const html = files.filter((f) => /\.html?$/i.test(f));
const css = files.filter((f) => /\.css$/i.test(f));

// ── 1. eval / new Function (script-src has no 'unsafe-eval') ─────────────────
// webpack's `eval*` devtools wrap EVERY module in eval(), so one hit here means
// the whole bundle is dead under the host CSP — not a stray call site.
if (!ALLOW_EVAL) {
  const EVAL_PATTERNS = [
    { re: /\beval\s*\(/, what: 'eval(' },
    { re: /\bnew\s+Function\s*\(/, what: 'new Function(' },
    // webpack devtool:'eval*' signature — the sourceURL comment it appends.
    { re: /\/\/#\s*sourceURL=webpack/, what: "webpack devtool 'eval*' output" },
  ];
  for (const f of js) {
    const src = fs.readFileSync(f, 'utf8');
    for (const { re, what } of EVAL_PATTERNS) {
      if (re.test(src)) {
        fail(
          'no-unsafe-eval',
          rel(f),
          `contains ${what} — the host script-src does NOT include 'unsafe-eval'`,
          "Build with devtool 'source-map' (never 'eval*'), and remove eval()/new Function() from your code and dependencies."
        );
        break; // one report per file is enough
      }
    }
  }
}

// ── 2. inline <script> in emitted HTML ───────────────────────────────────────
// Only matters for HTML this remote emits. The host never renders your HTML when
// embedded, but a standalone deploy of the same bundle must not train you into a
// pattern that breaks the moment it is embedded.
if (!ALLOW_INLINE_SCRIPT) {
  for (const f of html) {
    const src = fs.readFileSync(f, 'utf8');
    const inline = src.match(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi) || [];
    // An empty/whitespace-only <script></script> is harmless.
    const real = inline.filter((s) => s.replace(/<\/?script[^>]*>/gi, '').trim().length > 0);
    if (real.length) {
      fail(
        'no-inline-script',
        rel(f),
        `${real.length} inline <script> block(s) — the host script-src has no 'unsafe-inline' and issues no nonce to remotes`,
        'Move the code into an external bundled file. HtmlWebpackPlugin: set inject:true and do not use runtimeChunk inlining.'
      );
    }
    // `on*="..."` attribute handlers are inline script too.
    if (/<[^>]+\son(?:click|load|error|submit|change|mouseover)\s*=/i.test(src)) {
      fail(
        'no-inline-event-handler',
        rel(f),
        "inline on*= event-handler attribute — also blocked by script-src without 'unsafe-inline'",
        'Attach handlers with addEventListener / React props instead.'
      );
    }
  }
}

// ── 3. self-hosted font files (font-src excludes remote origins) ─────────────
if (!ALLOW_ORIGIN_FONTS) {
  const fontFiles = files.filter((f) => /\.(woff2?|ttf|otf|eot)$/i.test(f));
  for (const f of fontFiles) {
    fail(
      'no-self-hosted-font',
      rel(f),
      'font emitted as a separate file — it will load from YOUR origin, which is NOT in the host font-src',
      "Inline it: webpack `{ test: /\\.(woff2?|ttf|otf|eot)$/, type: 'asset/inline' }` (data: is allowed), " +
        `or reference an allowed CDN (${(SPEC.envExtras?.CSP_FONT_SRC_EXTRA?.lockedValue || []).join(', ')}).`
    );
  }
  // Also catch @font-face rules in extracted CSS that point at a non-data URL.
  for (const f of css) {
    const src = fs.readFileSync(f, 'utf8');
    const faces = src.match(/@font-face\s*\{[\s\S]*?\}/gi) || [];
    for (const face of faces) {
      const urls = face.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi) || [];
      const bad = urls.filter((u) => !/url\(\s*['"]?data:/i.test(u));
      if (bad.length) {
        fail(
          'no-self-hosted-font',
          rel(f),
          `@font-face references a non-data: URL (${bad[0]}) — blocked by the host font-src`,
          'Inline the font as a data: URL, or use an allowed font CDN.'
        );
        break;
      }
    }
  }
}

// ── 4. Workers constructed from a same-origin URL ────────────────────────────
// worker-src is "'self' blob:" — 'self' is the HOST when embedded, so a URL
// pointing at your own origin is refused. Blob URLs are fine.
if (!ALLOW_ORIGIN_WORKERS) {
  for (const f of js) {
    const src = fs.readFileSync(f, 'utf8');

    // Flag Worker/SharedWorker construction that is NOT obviously blob-based.
    // NOTE: these two checks are INDEPENDENT — a file can both construct a
    // same-origin Worker and register a Service Worker, and the Service Worker
    // case is the more serious of the two (it hijacks the HOST scope). An early
    // `break` here would mask it, so neither branch short-circuits the other.
    const m = src.match(/new\s+(?:Shared)?Worker\s*\(([^)]{0,120})/);
    if (m && !/createObjectURL|blob:/i.test(m[1])) {
      warn(
        'worker-must-be-blob',
        rel(f),
        `new Worker(${m[1].trim().slice(0, 60)}…) does not look blob-based — worker-src is ${JSON.stringify(D['worker-src'])} and 'self' means the HOST origin`,
        'Construct the worker from a Blob: new Worker(URL.createObjectURL(new Blob([src], {type:"text/javascript"}))). ' +
          "webpack: output.workerChunkLoading / `new Worker(new URL(...))` emits a same-origin URL and will be blocked."
      );
    }

    if (/navigator\.serviceWorker\.register\s*\(/.test(src)) {
      fail(
        'no-service-worker',
        rel(f),
        'registers a Service Worker — a remote must never register one; it would take over the HOST scope',
        'Remove the service-worker registration from the embedded build.'
      );
    }
  }
}

// ── 5. web app manifest (manifest-src 'self') ────────────────────────────────
if (!ALLOW_MANIFEST) {
  for (const f of files.filter((x) => /\.webmanifest$/i.test(x))) {
    warn(
      'no-web-manifest',
      rel(f),
      "manifest-src is 'self' (the HOST) — a manifest served from your origin is blocked",
      'Drop the manifest from the remote build; PWA concerns belong to the host.'
    );
  }
  for (const f of html) {
    if (/<link[^>]+rel=["']?manifest/i.test(fs.readFileSync(f, 'utf8'))) {
      warn(
        'no-web-manifest',
        rel(f),
        '<link rel="manifest"> present — blocked by manifest-src when embedded',
        'Remove the manifest link.'
      );
    }
  }
}

// ── 6. media assets (no media-src ⇒ default-src 'self') ─────────────────────
if (!ALLOW_ORIGIN_MEDIA) {
  for (const f of files.filter((x) => /\.(mp3|mp4|webm|ogg|wav|m4a|mov)$/i.test(x))) {
    fail(
      'no-self-hosted-media',
      rel(f),
      "media file emitted to your origin — the host declares NO media-src, so it falls back to default-src 'self' (the HOST)",
      'Serve media from the host, inline small clips as data: URLs, or ask the platform team to add a media-src directive.'
    );
  }
}

// ── 7. <object> / <embed> (object-src 'none') ───────────────────────────────
if (!ALLOW_OBJECT) {
  for (const f of [...html, ...js]) {
    const src = fs.readFileSync(f, 'utf8');
    if (/<(object|embed)\b/i.test(src) || /createElement\(\s*['"](object|embed)['"]/i.test(src)) {
      warn(
        'no-object-embed',
        rel(f),
        "uses <object>/<embed> — object-src is 'none' in the host policy",
        'Render PDFs/plugins another way; <iframe> requires your origin in frame-src (a host change).'
      );
    }
  }
}

// ── 8. smuggled / widened CSP in emitted HTML ───────────────────────────────
// A meta CSP can only ever RESTRICT further, never widen — but finding a widened
// one means someone "fixed" a violation locally and will be surprised in prod.
for (const f of html) {
  const src = fs.readFileSync(f, 'utf8');
  const meta = src.match(/<meta[^>]+http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi) || [];
  for (const tag of meta) {
    if (/unsafe-eval/i.test(tag)) {
      fail(
        'no-widened-meta-csp',
        rel(f),
        "meta CSP grants 'unsafe-eval', which the HOST does not — this masks the failure locally and blocks in prod",
        'Keep the standalone meta CSP in lock-step with ui/nexus-csp.json. Do not widen it.'
      );
    }
    if (/script-src[^;]*'unsafe-inline'/i.test(tag)) {
      fail(
        'no-widened-meta-csp',
        rel(f),
        "meta CSP grants script-src 'unsafe-inline', which the HOST does not",
        'Remove it; the host issues no nonce and allows no inline script for remotes.'
      );
    }
  }
}

// ── report ───────────────────────────────────────────────────────────────────
const errors = findings.filter((f) => f.level === 'error');
const warns = findings.filter((f) => f.level === 'warn');

console.log(`\n[check-csp] ${rel(DIST)} vs NEXUS host CSP (${SPEC.host?.policySource || 'nexus-csp.json'})`);
console.log(`${C.dim}  files scanned: ${files.length} (${js.length} js, ${css.length} css, ${html.length} html)${C.off}`);

if (!findings.length) {
  console.log(`${C.green}  ✓ CSP-clean — this bundle is loadable under the enforcing prod policy.${C.off}\n`);
  process.exit(0);
}

for (const f of findings) {
  const colour = f.level === 'error' ? C.red : C.yellow;
  const label = f.level === 'error' ? 'VIOLATION' : 'warning  ';
  console.log(`\n${colour}  ${label} [${f.rule}]${C.off} ${f.file}`);
  console.log(`    ${f.detail}`);
  console.log(`    ${C.dim}fix: ${f.fix}${C.off}`);
}

console.log(
  `\n  ${errors.length} violation(s), ${warns.length} warning(s).` +
    `\n  ${C.dim}Policy contract: ui/nexus-csp.json — DO NOT widen it to pass. Request a host` +
    `\n  change from the platform team instead (host: server/lib/csp.ts).${C.off}\n`
);

process.exit(errors.length || (STRICT && warns.length) ? 1 : 0);
