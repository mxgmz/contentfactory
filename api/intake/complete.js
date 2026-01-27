// Vercel Serverless Function
// Endpoint: /api/intake/complete
// Method: POST
// Purpose: Receive completion callback from CFFINAL copy workflow

import { promises as fs } from 'fs';
import path from 'path';

// Use /tmp directory for cache (shared within Vercel region)
const CACHE_DIR = '/tmp/intake-cache';

// Ensure cache directory exists
async function ensureCacheDir() {
    try {
        await fs.mkdir(CACHE_DIR, { recursive: true });
    } catch (err) {
        // Directory might already exist
    }
}

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

    try {
        // Ensure cache directory exists
        await ensureCacheDir();

        // Write result to file
        const cacheFile = path.join(CACHE_DIR, `${session_id}.json`);
        const cacheData = {
            status,
            data: data || {},
            timestamp: Date.now()
        };

        await fs.writeFile(cacheFile, JSON.stringify(cacheData), 'utf8');

        console.log(`Cached result to file: ${cacheFile}`);

        // Clean up old files (older than 5 minutes)
        try {
            const files = await fs.readdir(CACHE_DIR);
            const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(CACHE_DIR, file);
                    const fileContent = await fs.readFile(filePath, 'utf8');
                    const fileData = JSON.parse(fileContent);

                    if (fileData.timestamp < fiveMinutesAgo) {
                        await fs.unlink(filePath);
                        console.log(`Cleaned up expired cache file: ${file}`);
                    }
                }
            }
        } catch (cleanupErr) {
            console.error('Cleanup error:', cleanupErr);
            // Don't fail the request if cleanup fails
        }

        // Return success
        return res.status(200).json({
            received: true,
            session_id,
            cached: true
        });

    } catch (err) {
        console.error('Error caching result:', err);
        return res.status(500).json({
            error: "Failed to cache result",
            details: err.message
        });
    }
}
