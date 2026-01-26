// Vercel Serverless Function
// Endpoint: /api/intake/status
// Method: GET
// Purpose: Poll for workflow status and results

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
    const { session_id, job_id } = req.query;

    if (!session_id) {
        return res.status(400).json({
            error: "Missing session_id parameter",
            usage: "/api/intake/status?session_id=xxx&job_id=yyy"
        });
    }

    // Get n8n status webhook URL from environment
    const statusWebhookUrl = process.env.N8N_STATUS_WEBHOOK_URL;

    if (!statusWebhookUrl) {
        return res.status(500).json({
            error: "N8N_STATUS_WEBHOOK_URL not configured",
            hint: "Add N8N_STATUS_WEBHOOK_URL to your Vercel environment variables"
        });
    }

    try {
        // Build URL with query parameters
        const url = new URL(statusWebhookUrl);
        url.searchParams.set('session_id', session_id);
        if (job_id) url.searchParams.set('job_id', job_id);

        // Call n8n status check workflow
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`n8n status check failed: ${response.status}`);
        }

        const data = await response.json();

        // Return status response
        // Expected format from n8n:
        // {
        //   status: "processing" | "complete" | "error",
        //   data: { bot_message, pieces, etc. },
        //   current_state: "IDEATION",
        //   updated_at: "2026-01-26T23:30:00Z"
        // }
        return res.status(200).json(data);

    } catch (error) {
        console.error('Status check error:', error);
        return res.status(500).json({
            error: "Failed to check status",
            details: error.message,
            session_id
        });
    }
}
