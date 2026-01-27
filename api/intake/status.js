// Vercel Serverless Function
// Endpoint: /api/intake/status
// Method: GET
// Purpose: Check cached workflow results (much faster than polling n8n)

import { Redis } from '@upstash/redis';

// Initialize Upstash Redis client
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

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
        // Read from Upstash Redis
        const cachedData = await redis.get(`result:${session_id}`);

        if (cachedData) {
            // Parse if it's a string (Upstash returns parsed JSON by default, but being safe)
            const cachedResult = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;

            console.log(`Cache hit for session: ${session_id}, status: ${cachedResult.status}`);

            // Found completed result in cache
            return res.status(200).json({
                status: cachedResult.status,
                data: cachedResult.data,
