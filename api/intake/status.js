// Vercel Serverless Function
// Endpoint: /api/intake/status
// Method: GET
// Purpose: Check cached workflow results (much faster than polling n8n)

import { promises as fs } from 'fs';
import path from 'path';

// Use same cache directory as complete.js
const CACHE_DIR = '/tmp/intake-cache';

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

    try {
        // Read cache file
        const cacheFile = path.join(CACHE_DIR, `${session_id}.json`);

        try {
            const fileContent = await fs.readFile(cacheFile, 'utf8');
            const cachedResult = JSON.parse(fileContent);

            console.log(`Cache hit for session: ${session_id}, status: ${cachedResult.status}`);

            // Found completed result in cache
            return res.status(200).json({
                status: cachedResult.status,
                data: cachedResult.data,
                cached: true,
                timestamp: cachedResult.timestamp
            });

        } catch (readErr) {
            // File doesn't exist - workflow still processing
            if (readErr.code === 'ENOENT') {
                console.log(`Cache miss for session: ${session_id} - still processing`);

                return res.status(200).json({
                    status: "processing",
                    message: "Workflow is still running. Results will be available when complete.",
                    cached: false
                });
            }

            // Other error
            throw readErr;
        }

    } catch (err) {
        console.error('Error reading cache:', err);
        return res.status(500).json({
            error: "Failed to read cache",
            details: err.message
        });
    }
}
