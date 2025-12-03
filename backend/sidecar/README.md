DrBoT Sidecar (Prototype)

This sidecar exposes a very small job queue API for enqueuing long-running or heavy LLM jobs. It's intentionally simple and uses an in-memory store so you can run without Redis during development.

Endpoints:
- `POST /enqueue` { type, payload } -> { success, jobId }
- `GET /jobs/:id` -> { success, job }
- `GET /jobs` -> list recent jobs
- `GET /health` -> status

Environment:
- `SIDECAR_PORT` defaults to `4800`
- `MRBOT_URL` defaults to `http://localhost:4602`

Notes:
- For production, replace this with a Redis + BullMQ based worker for durability and scaling.
