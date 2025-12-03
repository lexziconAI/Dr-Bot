// DrBoT Sidecar Worker (lightweight, in-memory queue)
// For production, replace with Redis + BullMQ worker.

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.SIDECAR_PORT || 4800;
const MRBOT_URL = process.env.MRBOT_URL || 'http://localhost:4602';

// Simple in-memory job store
const jobs = new Map();

function createJob(type, payload) {
  const id = `job-${uuidv4()}`;
  const job = {
    id,
    type,
    payload,
    status: 'queued', // queued -> running -> completed | failed
    result: null,
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  jobs.set(id, job);
  return job;
}

async function processJob(job) {
  job.status = 'running';
  job.updatedAt = new Date().toISOString();
  jobs.set(job.id, job);

  try {
    if (job.type === 'completion') {
      const resp = await fetch(`${MRBOT_URL}/api/completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job.payload),
        // keep default timeout; host can supply smaller payloads
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Upstream error ${resp.status}: ${txt}`);
      }

      const data = await resp.json();
      job.status = 'completed';
      job.result = data;
      job.updatedAt = new Date().toISOString();
      jobs.set(job.id, job);
      return;
    }

    // Unknown job type
    job.status = 'failed';
    job.error = `Unknown job type: ${job.type}`;
    job.updatedAt = new Date().toISOString();
    jobs.set(job.id, job);
  } catch (err) {
    job.status = 'failed';
    job.error = err.message;
    job.updatedAt = new Date().toISOString();
    jobs.set(job.id, job);
  }
}

// Enqueue a job
app.post('/enqueue', (req, res) => {
  try {
    const { type, payload } = req.body;
    if (!type || !payload) return res.status(400).json({ error: 'type and payload required' });

    const job = createJob(type, payload);

    // Process asynchronously (fire-and-forget)
    setImmediate(() => processJob(job));

    res.json({ success: true, jobId: job.id, status: job.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get job status/result
app.get('/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({ success: true, job });
});

// List jobs (basic)
app.get('/jobs', (req, res) => {
  const list = Array.from(jobs.values()).slice(-100).reverse();
  res.json({ success: true, count: list.length, jobs: list });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), queueLength: jobs.size });
});

app.listen(PORT, () => {
  console.log(`🛰️ DrBoT Sidecar listening on http://localhost:${PORT}`);
  console.log(`↔️ Upstream Dr. Bot engine: ${MRBOT_URL}`);
});
