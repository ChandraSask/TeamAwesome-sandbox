"""FastAPI serves API routes locally, and the built React UI in the container."""
import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from .routes.hello import router

app = FastAPI(title="My App API")
app.include_router(router, prefix="/api")

@app.get("/healthz")
def health() -> dict[str, str]:
    return {"status": "ok"}

# The frontend development server proxies /api locally. In Azure, this server handles both UI and API.
# Register API routes above the static mount so API requests stay API requests.
static_dir = Path(os.environ.get("STATIC_DIR", Path(__file__).resolve().parents[2] / "frontend" / "dist"))
if static_dir.is_dir():
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="frontend")
