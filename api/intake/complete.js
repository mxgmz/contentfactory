// Vercel Serverless Function
// Endpoint: /api/intake/complete
// Method: POST
// Purpose: Receive completion callback from CFFINAL copy workflow

import { Redis } from '@upstash/redis';

// Initialize Upstash Redis client
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Callback-Secret");

    // Handle preflight
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    // Verify callback secret to prevent unauthorized calls
    const callbackSecret = req.headers['x-callback-secret'];
    const expectedSecret = process.env.CALLBACK_SECRET;

    if (expectedSecret && callbackSecret !== expectedSecret) {
        console.error('Invalid callback secret received');
        return res.status(403).json({ error: "Forbidden - Invalid secret" });
    }

    // Extract data
    const { request_id, session_id, status, data } = req.body;

    if (!request_id) {
        return res.status(400).json({ error: "Missing request_id in request body" });
    }

    if (!status) {
        return res.status(400).json({ error: "Missing status in request body" });
    }

    console.log(`Received completion callback for request: ${request_id} (session: ${session_id}), status: ${status}`);

    try {
        // Store in Upstash Redis using request_id as key
        // Auto-expires in 5 minutes (300 seconds)
        const cacheData = {
            status,
            data: data || {},
            timestamp: Date.now()
        };

        await redis.set(`result:${request_id}`, JSON.stringify(cacheData), { ex: 300 });

        console.log(`Cached result in Redis for request: ${request_id}`);

        // Return success
        return res.status(200).json({
            received: true,
            request_id,
            session_id,
            cached: true
        });

    } catch (err) {
        console.error('Error caching result in Redis:', err);
        return res.status(500).json({
            error: "Failed to cache result",
            details: err.message
        });
    }
}
