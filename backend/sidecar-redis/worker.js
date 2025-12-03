// ═══════════════════════════════════════════════════════════════════════════
// DrBoT BullMQ Worker - Job Processor
// LOG³ × LOG⁴ FIX: Port corrected from 4602 to 15602
// ═══════════════════════════════════════════════════════════════════════════

const { Worker } = require('bullmq');
const IORedis = require('ioredis');

// ★ FIXED: Default port is 15602, not 4602
const MRBOT_URL = process.env.MRBOT_URL || 'http://localhost:15602';
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

console.log(`[WORKER] Starting BullMQ worker`);
console.log(`[WORKER] MrBot URL: ${MRBOT_URL}`);
console.log(`[WORKER] Redis URL: ${REDIS_URL}`);

const connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null
});

const worker = new Worker(
    'completion',  // Queue name must match what Community backend uses
    async (job) => {
        console.log(`[WORKER] Processing job ${job.id}`);
        
        // Job data contains the completion request payload
        const payload = job.data;
        const url = `${MRBOT_URL}/api/completion`;
        
        console.log(`[WORKER] Calling: POST ${url}`);
        console.log(`[WORKER] Model: ${payload.model || 'default'}`);
        
        // Transform messages array to prompt string if needed
        // MrBot /api/completion expects { prompt, model } not { messages, model }
        let requestBody = payload;
        if (payload.messages && Array.isArray(payload.messages)) {
            // Extract content from messages array
            const userMessage = payload.messages.find(m => m.role === 'user');
            const prompt = userMessage?.content || payload.messages.map(m => m.content).join('\n');
            requestBody = {
                model: payload.model || 'llama-3.3-70b',
                prompt: prompt
            };
            console.log(`[WORKER] Transformed messages to prompt: "${prompt.substring(0, 50)}..."`);
        }
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`MrBot error ${response.status}: ${errorText}`);
            }
            
            const result = await response.json();
            console.log(`[WORKER] Job ${job.id} completed successfully`);
            return result;
            
        } catch (error) {
            console.error(`[WORKER] Job ${job.id} failed:`, error.message);
            throw error;
        }
    },
    { 
        connection,
        concurrency: 3  // Process up to 3 jobs in parallel
    }
);

worker.on('completed', (job, result) => {
    console.log(`[WORKER] ✅ Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
    console.error(`[WORKER] ❌ Job ${job?.id} failed:`, err.message);
});

worker.on('ready', () => {
    console.log(`[WORKER] ✅ Worker ready, listening for jobs on 'completion' queue`);
});

console.log('[WORKER] Worker initialized, waiting for jobs...');

// Keep process alive
setInterval(() => {
    // Heartbeat
}, 30000);

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('[WORKER] Shutting down...');
    await worker.close();
    process.exit(0);
});
