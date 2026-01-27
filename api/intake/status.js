// Vercel Serverless Function
// Endpoint: /api/intake/status
// Method: GET
// Purpose: Check cached workflow results (much faster than polling n8n)

// Same cache as complete.js
const resultsCache = global.resultsCache || (global.resultsCache = new Map());

export default async function handler(req, res) {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    // Get query parameters
    const { session_id } = req.query;

    if (!session_id) {
        return res.status(400).json({
            error: "Missing session_id parameter",
            usage: "/api/intake/status?session_id=xxx"
        });
    }

    // Check cache for completed result
    const cachedResult = resultsCache.get(session_id);

    if (cachedResult) {
        console.log(`Cache hit for session: ${session_id}, status: ${cachedResult.status}`);
        
        // Found completed result in cache
        return res.status(200).json({
            status: cachedResult.status,
            data: cachedResult.data,
            cached: true,
            timestamp: cachedResult.timestamp
        });
    }

    // Not in cache yet - workflow still processing
    console.log(`Cache miss for session: ${session_id} - still processing`);
    
    return res.status(200).json({
        status: "processing",
        message: "Workflow is still running. Results will be available when complete.",
        cached: false
    });
}
