from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


def setup_frontend(app: FastAPI) -> None:
    """Serve the existing Flask/vanilla frontend from FastAPI so we have a single origin.

    This mounts static files under /static and serves templates under /.

    Note: This is executed from app startup.
    """


    # Workspace paths (relative to this file)
    # This file is located at: ai-city-search-engine/backend/app/serve_frontend.py
    # Monorepo root is: city search engine/
    repo_root = Path(__file__).resolve().parents[3]
    # Serve the existing Flask/vanilla frontend (city-search-engine/) from FastAPI.
    # This is the only frontend present in this workspace.
    city_engine_root = repo_root / "city-search-engine"




    static_dir = city_engine_root / "static"
    # The Next.js frontend is a built app; if templates aren't available, we serve index.html from Next.
    templates_dir = city_engine_root

    if not static_dir.exists() or not templates_dir.exists():
        # If missing, don't break backend; endpoints remain available.
        return

    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

    # Serve Next.js built assets if present.
    # Expected locations vary; we try common ones.
    build_candidates = [
        city_engine_root / ".next" / "static",
        city_engine_root / "out" / "static",
        city_engine_root / "static",
    ]

    index_candidates = [
        city_engine_root / "index.html",
        city_engine_root / "out" / "index.html",
        city_engine_root / "public" / "index.html",
    ]

    index_html = next((p for p in index_candidates if p.exists()), None)

    if index_html is not None:

        @app.get("/", include_in_schema=False)
        def index():
            return FileResponse(str(index_html))

        @app.get("/results", include_in_schema=False)
        def results():
            return FileResponse(str(index_html))



