# DrBoT Community (Prototype)

This repo contains a minimal prototype of the DrBoT Community platform: a Facebook-style professional network for healthcare professionals with integrated Dr. Bot clinical tools.

Structure:
- `backend/` - Minimal Express server (in-memory DB) and proxy to the Dr. Bot engine (`/api/drbot/*`)
- `frontend/` - Vite + React minimal UI (Login, Feed, Profile)

Quick start (requires Node.js >= 18):

1. Backend

```powershell
cd "c:\Users\regan\ID SYSTEM\axiom-x\DrBotCommunity\backend"
npm install
node server.js
```

2. Frontend

```powershell
cd "c:\Users\regan\ID SYSTEM\axiom-x\DrBotCommunity\frontend"
npm install
npm run dev
```

Notes:
- The backend proxies clinical requests to the local Dr. Bot engine at `http://localhost:4602` under `/api/drbot/*`.
- This prototype uses an in-memory store for quick iteration. For production, migrate to PostgreSQL and add persistent file storage.
- You can offload expensive LLM work to a dedicated sidecar microservice. See `backend/sidecar/README.md` for notes.
