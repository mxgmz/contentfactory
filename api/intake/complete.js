// Vercel Serverless Function
// Endpoint: /api/intake/complete
// Method: POST
// Purpose: Receive completion callback from CFFINAL copy workflow

// In-memory cache (for development)
// For production, use Vercel KV: https://vercel.com/docs/storage/vercel-kv
const resultsCache = global.resultsCache || (global.resultsCache = new Map());

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
    const { session_id, status, data } = req.body;

    if (!session_id) {
        return res.status(400).json({ error: "Missing session_id in request body" });
    }

    if (!status) {
        return res.status(400).json({ error: "Missing status in request body" });
    }

    console.log(`Received completion callback for session: ${session_id}, status: ${status}`);

    // Store result in cache
    resultsCache.set(session_id, {
        status,
        data: data || {},
        timestamp: Date.now()
    });

    // Clean up old entries (older than 5 minutes)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    for (const [key, value] of resultsCache.entries()) {
        if (value.timestamp < fiveMinutesAgo) {
            resultsCache.delete(key);
            console.log(`Cleaned up expired result for session: ${key}`);
        }
    }

    console.log(`Cached result for session: ${session_id}. Cache size: ${resultsCache.size}`);

    // Return success
    return res.status(200).json({
        received: true,
        session_id,
        cached: true
    });
}
