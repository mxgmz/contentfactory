export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

    const n8nUrl = process.env.N8N_WEBHOOK_URL;

    if (!n8nUrl) {
        return res.status(500).json({ error: "Missing N8N_WEBHOOK_URL env var" });
    }

    // Hard validation + visibility
    let parsed;
    try {
        parsed = new URL(n8nUrl);
    } catch {
        return res.status(500).json({ error: "Invalid N8N_WEBHOOK_URL", value: n8nUrl });
    }

    try {
        const r = await fetch(parsed.toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req.body ?? {}),
        });

        const text = await r.text();

        // Pass-through status + content-type
        res.status(r.status);
        res.setHeader("Content-Type", r.headers.get("content-type") || "application/json");
        return res.send(text);
    } catch (err) {
        return res.status(500).json({ error: "Proxy failed", details: String(err) });
    }
}
