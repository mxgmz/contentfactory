module.exports = async (req, res) => {
    // CORS (mostly irrelevant since this is same-origin, but fine)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

    // IMPORTANT: trim removes hidden newlines/spaces from Vercel env vars
    const n8nUrl = (process.env.N8N_WEBHOOK_URL || "").trim();

    if (!n8nUrl) {
        return res.status(500).json({ error: "Missing N8N_WEBHOOK_URL env var" });
    }

    // Validate URL and surface the actual value if broken
    try {
        new URL(n8nUrl);
    } catch (e) {
        return res.status(500).json({
            error: "Invalid N8N_WEBHOOK_URL",
            value: n8nUrl,
            length: n8nUrl.length
        });
    }

    try {
        const r = await fetch(n8nUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req.body ?? {}),
        });

        const text = await r.text();
        res.setHeader("Content-Type", r.headers.get("content-type") || "application/json");
        return res.status(r.status).send(text);
    } catch (err) {
        return res.status(500).json({ error: "Proxy failed", details: String(err) });
    }
};
