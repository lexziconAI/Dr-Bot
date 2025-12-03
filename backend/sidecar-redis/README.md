DrBoT Sidecar (Redis + BullMQ)

This sidecar exposes an HTTP enqueue endpoint and a separate worker process that processes jobs from Redis-backed BullMQ queues.

Quick start (requires Redis running locally):

```powershell
cd "c:\Users\regan\ID SYSTEM\axiom-x\DrBotCommunity\backend\sidecar-redis"
npm install
# Start the HTTP enqueuer
node server.js
# Start the worker in another terminal
node worker.js
```

Environment variables:
- `REDIS_URL` - Redis connection string (default: `redis://127.0.0.1:6379`)
- `MRBOT_URL` - Upstream DrBot engine (default: `http://localhost:4602`)
- `SIDECAR_PORT` - HTTP port for enqueuer (default: 4810)

Endpoints:
- `POST /enqueue` { type: 'completion', payload } -> { jobId }
- `POST /proxy/completion` -> forwards directly to DrBot for quick testing

Notes:
- This is a prototype. For production, secure the HTTP endpoints and tune Redis/BullMQ settings.
