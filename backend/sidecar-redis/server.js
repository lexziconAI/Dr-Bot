// ═══════════════════════════════════════════════════════════════════════════
// FIXED server.js - Sidecar HTTP Enqueuer for BullMQ
// 
// This server receives HTTP requests and enqueues them as BullMQ jobs.
// Jobs are processed by worker.js which calls MrBot engine.
// 
// ★ FIX: Default MRBOT_URL port changed from 4602 to 15602
// ═══════════════════════════════════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const PORT = process.env.PORT || 4810;

// ★ FIXED: Default port is 15602, not 4602
const MRBOT_URL = process.env.MRBOT_URL || 'http://localhost:15602';
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

console.log(`[SIDECAR] Initializing HTTP enqueuer`);
console.log(`[SIDECAR] MrBot URL: ${MRBOT_URL}`);
console.log(`[SIDECAR] Redis URL: ${REDIS_URL}`);

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Redis connection for BullMQ
const connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null
});

// BullMQ Queue
const completionQueue = new Queue('drbot-completions', { connection });

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════

app.get('/health', async (req, res) => {
    try {
        // Check Redis connection
        await connection.ping();
        
        // Get queue stats
        const waiting = await completionQueue.getWaitingCount();
        const active = await completionQueue.getActiveCount();
        const completed = await completionQueue.getCompletedCount();
        const failed = await completionQueue.getFailedCount();
        
        res.json({
            status: 'healthy',
            service: 'drbot-sidecar-enqueuer',
            mrbot_url: MRBOT_URL,
            redis: 'connected',
            queue: {
                name: 'drbot-completions',
                waiting,
                active,
                completed,
                failed
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// ENQUEUE ASYNC COMPLETION
// ═══════════════════════════════════════════════════════════════════════════

app.post('/enqueue', async (req, res) => {
    try {
        const { endpoint, method, body, headers, priority } = req.body;
        
        if (!endpoint) {
            return res.status(400).json({ error: 'Missing endpoint' });
        }
        
        // Generate job ID
        const jobId = `drbot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Add to queue
        const job = await completionQueue.add(
            'completion',
            {
                endpoint,
                method: method || 'POST',
                body: body || {},
                headers: headers || {}
            },
            {
                jobId,
                priority: priority || 0,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000
                }
            }
        );
        
        console.log(`[SIDECAR] ✅ Enqueued job ${job.id} for ${endpoint}`);
        
        res.status(202).json({
            success: true,
            jobId: job.id,
            status: 'queued',
            message: 'Job enqueued for async processing',
            statusUrl: `/status/${job.id}`
        });
        
    } catch (error) {
        console.error('[SIDECAR] ❌ Enqueue failed:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// JOB STATUS
// ═══════════════════════════════════════════════════════════════════════════

app.get('/status/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = await completionQueue.getJob(jobId);
        
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        
        const state = await job.getState();
        const progress = job.progress;
        
        const response = {
            jobId: job.id,
            state,
            progress,
            data: job.data,
            timestamp: job.timestamp,
            processedOn: job.processedOn,
            finishedOn: job.finishedOn
        };
        
        // Include result if completed
        if (state === 'completed') {
            response.result = job.returnvalue;
        }
        
        // Include error if failed
        if (state === 'failed') {
            response.error = job.failedReason;
        }
        
        res.json(response);
        
    } catch (error) {
        console.error('[SIDECAR] ❌ Status check failed:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// DIRECT PROXY (Sync calls to MrBot)
// ═══════════════════════════════════════════════════════════════════════════

app.all('/proxy/*', async (req, res) => {
    try {
        const targetPath = req.params[0];
        const url = `${MRBOT_URL}/${targetPath}`;
        
        console.log(`[SIDECAR] Proxy: ${req.method} ${url}`);
        
        const response = await fetch(url, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                ...req.headers
            },
            body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body)
        });
        
        const data = await response.json();
        res.status(response.status).json(data);
        
    } catch (error) {
        console.error('[SIDECAR] ❌ Proxy failed:', error.message);
        res.status(502).json({ error: 'Upstream error', details: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
    console.log(`
    ═══════════════════════════════════════════════════════════════
    
       🏥 DrBoT SIDECAR ENQUEUER
       
       HTTP API:    http://localhost:${PORT}
       Health:      http://localhost:${PORT}/health
       
       MrBot URL:   ${MRBOT_URL}
       Redis URL:   ${REDIS_URL}
       
       Endpoints:
       - POST /enqueue      → Submit async job
       - GET  /status/:id   → Check job status
       - ALL  /proxy/*      → Sync proxy to MrBot
       
       Ready to receive jobs!
    
    ═══════════════════════════════════════════════════════════════
    `);
});

// Heartbeat to keep Node.js alive
setInterval(() => {
    // Heartbeat - prevents Node.js from exiting
}, 30000);

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('[SIDECAR] Shutting down...');
    await completionQueue.close();
    await connection.quit();
    process.exit(0);
});
