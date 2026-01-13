export default async function handler(req, res) {
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const n8nUrl = process.env.N8N_WEBHOOK_URL;
    if (!n8nUrl) {
        return res.status(500).json({ error: "Missing N8N_WEBHOOK_URL env var" });
    }

    const r = await fetch(n8nUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body ?? {}),
    });

    const text = await r.text();
    res.setHeader("Content-Type", r.headers.get("content-type") || "application/json");
    return res.status(r.status).send(text);
}
