const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const { container, DefinePlugin } = require('webpack')

const isProd =
  process.env.NODE_ENV === 'production' ||
  process.argv.some((a) => a === 'production' || a === '--mode=production')

// ── HOST CSP CONTRACT (do not widen) ─────────────────────────────────────────
// A federated remote is loaded INTO the host document, so the browser enforces
// the HOST's Content-Security-Policy against OUR assets — nothing this container
// serves can relax it. ui/nexus-csp.json is the frozen mirror of that policy and
// every choice below is derived from it. The traps that matter:
//
//   script-src : 'self' + registered remote origins. NO 'unsafe-eval',
//                NO 'unsafe-inline', NO nonce is issued to remotes.
//                → devtool MUST NOT be any `eval*` variant (they wrap every
//                  module in eval() and kill the whole bundle), and no inline
//                  <script> may be emitted.
//   style-src  : includes our origin AND 'unsafe-inline' → both extracted .css
//                and injected <style> work. We still EXTRACT in prod (below).
//   font-src   : 'self' data: + fonts.gstatic.com + cdn.jsdelivr.net — our
//                origin is NOT included → fonts MUST be inlined as data:.
//   worker-src : 'self' blob: → a worker URL on our origin is refused.
//   media/manifest/object: effectively host-only → not emittable from here.
//
// `npm run check:csp` (postbuild) enforces all of the above against dist/.
// ─────────────────────────────────────────────────────────────────────────────

// ── THE THREE VALUES THAT MUST MATCH THE HOST's remotes.json ─────────────────
//   name     → host remotes.json ".scope"
//   exposes  → host remotes.json ".module"   (the KEY, e.g. "./App")
//   filename → host remotes.json ".entryPath" (served at /remoteEntry.js)
// Change these ONLY via scripts/scaffold.sh so they can't drift.
const MF_NAME = 'myAppRemote'
const MF_EXPOSED_KEY = './App'
const MF_EXPOSED_MODULE = './src/RemoteApp'

// ── publicPath MUST be the ABSOLUTE origin of THIS remote in each environment ─
// or lazy chunks resolve against the HOST and 404. Provide it at build time:
//   PUBLIC_PATH=https://ca-demo-myapp-ui.<suffix>.canadaeast.azurecontainerapps.io/ \
//     npm run build
// Falls back to "auto" for local dev (webpack infers from the running script).
const PUBLIC_PATH = process.env.PUBLIC_PATH || 'auto'

// ── API_BASE / API_SCOPE MUST be baked into the bundle at BUILD time ─────────
// The browser has NO process.env — babel does NOT substitute process.env.*. Without
// the DefinePlugin below, `process.env.API_BASE` in ui/src/lib/callApi.js is undefined
// at runtime → API_BASE becomes "" → `fetch('/api/…')` resolves against the HOST origin
// → 401 → onSessionExpired() → SSO redirect + reload = AUTH STORM (the Balance Tool bug).
// So we inline them here from the build-time env (fed by ui/Dockerfile build args).
//   API_BASE  = your backend's ABSOLUTE origin (empty is a hard config error when embedded)
//   API_SCOPE = your backend's Token B scope (must equal host remotes.json ".authScope")
const API_BASE = process.env.API_BASE || ''
const API_SCOPE = process.env.API_SCOPE || ''

// ── DEV_AUTH: the local role picker (no Entra needed) ───────────────────────────
// ON for `npm run dev`, OFF for `npm run build` unless you force it with DEV_AUTH=true.
// It only ever activates when the page is NOT embedded in the host, and the backend
// ignores the headers it sends unless it runs with APP_ENV=local — so even a leaked
// flag grants nothing. See ui/src/lib/devAuth.js.
const DEV_AUTH = process.env.DEV_AUTH ? process.env.DEV_AUTH === 'true' : !isProd

// The standalone dev page runs under a CSP too, so the API origin must be in
// connect-src or the browser blocks the fetch. (Embedded, the host grants this via
// your remotes.json `connectOrigins`.)
let API_ORIGIN = ''
try {
  API_ORIGIN = API_BASE ? new URL(API_BASE).origin : ''
} catch {
  console.warn(`\n\x1b[33m[webpack] WARNING: API_BASE "${API_BASE}" is not a valid URL.\x1b[0m\n`)
}

// Loud build-time guard: a production remote with no API_BASE will storm the host at
// runtime (see note above). Warn hard so it is caught in CI, not in prod.
if (isProd && DEV_AUTH) {
  console.warn(
    '\n\x1b[33m[webpack] WARNING: DEV_AUTH is ON in a production build.\n' +
      '  The role picker will appear on the standalone page. It is inert when embedded and the\n' +
      '  backend ignores it unless APP_ENV=local, but you almost certainly do not want it.\x1b[0m\n'
  )
}
if (isProd && !API_BASE) {
  console.warn(
    '\n\x1b[33m[webpack] WARNING: API_BASE is EMPTY for a production build.\n' +
      '  The remote will fetch relative URLs against the HOST origin and can trigger an\n' +
      '  auth storm. Pass --build-arg API_BASE=https://<your-backend-origin> (see ui/Dockerfile).\x1b[0m\n'
  )
}

module.exports = {
  mode: isProd ? 'production' : 'development',
  entry: './src/index.jsx',

  // CSP: script-src has NO 'unsafe-eval'. Every webpack `eval*` devtool wraps
  // each module in eval(), so ANY of them produces a bundle that is 100% blocked
  // the moment it is embedded in the host. 'source-map' in prod (external .map,
  // no eval) and 'cheap-module-source-map' in dev (still eval-free, so local dev
  // behaves exactly like production instead of hiding the violation).
  devtool: isProd ? 'source-map' : 'cheap-module-source-map',

  output: {
    path: path.resolve(__dirname, 'dist'),
    // Absolute publicPath is REQUIRED for federated remotes (see note above).
    publicPath: PUBLIC_PATH,
    clean: true,
    // Deterministic, hashed names for the CSS/JS chunks the host will <link>/
    // <script> from OUR origin (both are allowed by the host style-src/script-src).
    filename: isProd ? '[name].[contenthash:8].js' : '[name].js',
    chunkFilename: isProd ? '[name].[contenthash:8].chunk.js' : '[name].chunk.js',
    // Fonts and any other inlined asset must NOT become separate files (font-src
    // excludes our origin) — see the asset rules below.
    assetModuleFilename: 'assets/[name].[contenthash:8][ext]',

    // CSP: without this, webpack's own runtime emits a `globalThis` polyfill
    // shaped like:
    //     try { return this || new Function("return this")() } catch (e) { … }
    // It is guarded (modern browsers take the `typeof globalThis` branch first,
    // and a CSP-blocked `new Function` throws an EvalError the catch swallows),
    // so it does not actually break at runtime — but it DOES put a literal
    // `new Function(` in every emitted chunk. That trips any honest CSP audit,
    // and a scanner that has to whitelist it can no longer flag a REAL eval.
    // Declaring globalThis support makes webpack emit the bare identifier and
    // keeps the bundle provably eval-free.
    environment: { globalThis: true },
  },

  // The MSAL chunk (standalone sign-in only) is fetched lazily and never when embedded, so
  // its size is not a load-time cost; don't let it raise a permanent size warning that
  // would train people to ignore warnings.
  performance: {
    assetFilter: (name) => !/^msal\./.test(name) && !name.endsWith('.map'),
  },

  resolve: {
    extensions: ['.jsx', '.js', '.json'],
  },

  devServer: {
    port: 3001,
    historyApiFallback: true,
    // Full reload instead of HMR. `remoteEntry.js` and `main.js` each carry a webpack
    // runtime, and the second one to load makes a hot update throw
    // "Cannot set properties of undefined (setting './src/…')" on every edit.
    hot: false,
    liveReload: true,
    headers: {
      // Permissive CORS so a host on another origin can load remoteEntry.js in dev.
      'Access-Control-Allow-Origin': '*',
      // CSP PARITY IN DEV. The dev server serves this remote standalone, so
      // nothing would otherwise stop an eval'd bundle, an inline <script>, or a
      // self-hosted font — all of which are fatal once embedded. Serving a
      // policy shaped like the host's makes those failures appear HERE, at the
      // desk, instead of in prod where the host CSP is ENFORCING
      // (CSP_REPORT_ONLY=false). Kept deliberately in lock-step with
      // ui/nexus-csp.json; 'self' is widened to the dev-server origin only.
      'Content-Security-Policy': [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "form-action 'self'",
        "manifest-src 'self'",
        "worker-src 'self' blob:",
        "img-src 'self' data: blob: https:",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
        "frame-src 'self' https://login.microsoftonline.com",
        // NOTE: no 'unsafe-eval' and no 'unsafe-inline' — matching the host.
        // This is exactly why devtool must not be an `eval*` variant: with this
        // header the dev bundle would refuse to run, which is the point.
        "script-src 'self'",
        // `ws:`/`wss:` are DEV-ONLY additions for the webpack-dev-server HMR
        // socket. They have no counterpart in the host policy and must never be
        // copied into nexus-csp.json.
        `connect-src 'self' ws: wss: ${API_ORIGIN} https://login.microsoftonline.com https://graph.microsoft.com`,
      ].join('; '),
    },
    static: { directory: path.resolve(__dirname, 'public') },
  },

  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: 'defaults' }],
              ['@babel/preset-react', { runtime: 'automatic' }],
            ],
          },
        },
      },
      // CSS → a real .css file in prod. The host style-src DOES include our
      // remote origin (it derives style-src from script-src), so a <link> to our
      // own hashed chunk is allowed. style-loader would also work because the
      // host keeps 'unsafe-inline' in style-src — but that relaxation is
      // explicitly documented as temporary on the host side, so do NOT depend on
      // it. Extracting keeps this remote working if/when it is removed.
      {
        test: /\.css$/,
        // postcss-loader runs Tailwind (see tailwind.config.js / postcss.config.js).
        use: [isProd ? MiniCssExtractPlugin.loader : 'style-loader', 'css-loader', 'postcss-loader'],
      },

      // FONTS → ALWAYS inlined as data: URLs. The host font-src is
      // "'self' data: fonts.gstatic.com cdn.jsdelivr.net" and 'self' is the HOST
      // origin when embedded — a .woff2 served from THIS container is blocked and
      // the tile renders in a fallback typeface. data: is unconditionally allowed,
      // so inlining is the only self-contained option.
      // (If a font is too large to inline, load it from fonts.gstatic.com or
      // cdn.jsdelivr.net instead — those two are the ONLY external font hosts the
      // platform grants, via the locked CSP_FONT_SRC_EXTRA setting.)
      {
        test: /\.(woff2?|ttf|otf|eot)$/i,
        type: 'asset/inline',
      },

      // IMAGES → free choice: img-src is "'self' data: blob: https:", so both an
      // emitted file on our origin and a data: URL are allowed.
      {
        test: /\.(png|jpe?g|gif|svg|webp|avif)$/i,
        type: 'asset',
        parser: { dataUrlCondition: { maxSize: 8 * 1024 } },
      },
    ],
  },

  plugins: [
    // Inline the build-time API config so the browser bundle has real string literals
    // instead of `process.env.*` (which is undefined in the browser). See note above.
    new DefinePlugin({
      'process.env.API_BASE': JSON.stringify(API_BASE),
      'process.env.API_SCOPE': JSON.stringify(API_SCOPE),
      'process.env.DEV_AUTH': JSON.stringify(String(DEV_AUTH)),
    }),
    new container.ModuleFederationPlugin({
      name: MF_NAME, // ← host remotes.json ".scope"
      filename: 'remoteEntry.js', // ← host remotes.json ".entryPath"
      exposes: {
        [MF_EXPOSED_KEY]: MF_EXPOSED_MODULE, // ← host remotes.json ".module"
      },
      shared: {
        // singleton + matching major is MANDATORY — host & remote must share ONE React,
        // or hooks break with "Invalid hook call".
        //
        // R3 guard — strictVersion:true makes a MAJOR mismatch FAIL LOUDLY at load time
        // instead of silently letting webpack pick one copy (which manifests later as an
        // "Invalid hook call" deep in render, far from the real cause). The host currently
        // ships React 18; if the host ever moves to 19, bump BOTH requiredVersion strings
        // here in lock-step — do NOT widen to '>=18' to paper over a mismatch.
        react: { singleton: true, strictVersion: true, requiredVersion: '^18' },
        'react-dom': { singleton: true, strictVersion: true, requiredVersion: '^18' },
      },
    }),
    // Extract CSS into a hashed .css chunk served from OUR origin (allowed by
    // the host style-src). Prod only — dev uses style-loader for HMR.
    ...(isProd
      ? [
          new MiniCssExtractPlugin({
            filename: '[name].[contenthash:8].css',
            chunkFilename: '[name].[contenthash:8].chunk.css',
          }),
        ]
      : []),
    // Standalone dev shell only — the host never loads this HTML.
    //
    // CSP: `inject: true` + `scriptLoading: 'defer'` guarantees external <script
    // src> tags. Do NOT enable any runtime-chunk inlining plugin
    // (InlineChunkHtmlPlugin / inject:'body' with inline templates): the host
    // script-src has no 'unsafe-inline' and issues no nonce to remotes, so an
    // inlined runtime chunk is silently dropped and the container never boots.
    new HtmlWebpackPlugin({
      template: './public/index.html',
      // Lets index.html put YOUR API origin into its standalone connect-src.
      templateParameters: { apiOrigin: API_ORIGIN },
      inject: true,
      scriptLoading: 'defer',
      minify: isProd
        ? {
            collapseWhitespace: true,
            removeComments: false, // keep the CSP contract comment in public/index.html
            // Never let the minifier fold JS/CSS inline — see the CSP note above.
            minifyJS: false,
            minifyCSS: false,
          }
        : false,
    }),
  ],
}
