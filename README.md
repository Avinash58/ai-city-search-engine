# AI City Search Engine (Production-ready Scaffold)

This repository was rebuilt from scratch as requested.

## Current state
- Backend: FastAPI (JWT auth, SQLAlchemy models, Redis-ready cache, AI search pipeline scaffold)
- Frontend: Next.js (Tailwind, Redux Toolkit, Axios, responsive UI)
- Infrastructure: Docker + docker-compose + Nginx reverse-proxy scaffold

## Next steps
Run locally:

```bash
# 1) backend
cd ai-city-search-engine/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 2) frontend
cd ai-city-search-engine/frontend
npm install
npm run dev
```

Then open http://localhost:3000

## API base
- http://localhost:8000/api

## Notes
This is a production-ready architecture scaffold; you can wire OpenAI/Elasticsearch/FAISS keys and seed data next.

