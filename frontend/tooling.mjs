import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild-wasm";

const root = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(root);
const dist = join(root, "dist");
const command = process.argv[2];
const port = 5173;
const backendUrl = "http://127.0.0.1:8000";
let backend;

await esbuild.initialize();

async function compile(write) {
  return esbuild.build({
    entryPoints: [join(root, "src", "main.jsx")],
    bundle: true,
    write,
    outdir: dist,
    entryNames: "app",
    assetNames: "assets/[name]-[hash]",
    jsx: "automatic",
    sourcemap: write ? false : "inline",
    minify: write,
    loader: { ".png": write ? "file" : "dataurl" },
  });
}

function renderIndex() {
  return readFile(join(root, "index.html"), "utf8").then((html) =>
    html
      .replace('<script type="module" src="/src/main.jsx"></script>', '<script type="module" src="/app.js"></script>')
      .replace("</head>", '    <link rel="stylesheet" href="/app.css" />\n  </head>'),
  );
}

async function build() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  await compile(true);
  await writeFile(join(dist, "index.html"), await renderIndex());
  console.log(`Built frontend in ${dist}`);
}

function startBackend() {
  const environmentPython = process.platform === "win32"
    ? join(projectRoot, "backend", ".venv", "Scripts", "python.exe")
    : join(projectRoot, "backend", ".venv", "bin", "python");
  const python = process.env.PYTHON ?? environmentPython;
  backend = spawn(python, ["-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"], {
    cwd: join(projectRoot, "backend"),
    stdio: "inherit",
  });
  backend.on("error", () => {
    console.error("Backend could not start. Create backend/.venv and install backend/requirements.txt.");
  });
}

async function proxy(request, response) {
  try {
    const upstream = await fetch(new URL(request.url, backendUrl), { method: request.method });
    response.writeHead(upstream.status, Object.fromEntries(upstream.headers));
    response.end(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    response.writeHead(503, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ detail: "The backend is still starting. Please try again." }));
  }
}

async function sendFile(response, file) {
  const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };
  response.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream" });
  response.end(await readFile(file));
}

async function serve(development) {
  startBackend();
  const server = createServer(async (request, response) => {
    try {
      if (request.url.startsWith("/api/") || request.url === "/healthz") return await proxy(request, response);

      if (development && (request.url === "/app.js" || request.url === "/app.css")) {
        const result = await compile(false);
        const extension = extname(request.url);
        const output = result.outputFiles.find((file) => extname(file.path) === extension);
        response.writeHead(200, { "Content-Type": extension === ".js" ? "text/javascript" : "text/css" });
        response.end(output?.contents ?? "");
        return;
      }

      if (development) {
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end(await renderIndex());
        return;
      }

      const relative = request.url === "/" ? "index.html" : request.url.split("?")[0].slice(1);
      const file = normalize(join(dist, relative));
      if (!file.startsWith(dist)) throw new Error("Invalid path");
      await sendFile(response, file);
    } catch (error) {
      if (!development && request.url !== "/") {
        try {
          await sendFile(response, join(dist, "index.html"));
          return;
        } catch {}
      }
      console.error(error);
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("The frontend could not load. Check the terminal for details.");
    }
  });

  const stop = () => {
    server.close();
    backend?.kill();
    esbuild.stop();
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  server.listen(port, "127.0.0.1", () => {
    console.log(`App: http://127.0.0.1:${port}`);
    console.log("Press Ctrl+C to stop.");
  });
}

if (command === "build") await build();
else if (command === "dev") await serve(true);
else if (command === "preview") await serve(false);
else {
  console.error("Use: node tooling.mjs dev|build|preview");
  process.exitCode = 1;
}
