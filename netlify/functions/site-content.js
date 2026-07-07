import { getStore } from "@netlify/blobs";

// Shared, password-protected site content for the wedding site's edit mode.
// GET  /api/site-content            -> { config: {...} | null }
// POST /api/site-content            body: { password, config } -> { ok: true } or 401

const DEFAULT_PASSWORD = "kackaadam2026";
const NO_STORE_HEADERS = {
    "content-type": "application/json",
    "cache-control": "no-store, no-cache, must-revalidate",
};

function getExpectedPassword() {
    return process.env.EDITOR_PASSWORD || DEFAULT_PASSWORD;
}

export default async (req) => {
    const store = getStore("wedding-site-content");

    if (req.method === "GET") {
          const config = (await store.get("config", { type: "json" })) || null;
          return new Response(JSON.stringify({ config }), {
                  headers: NO_STORE_HEADERS,
          });
    }

    if (req.method === "POST") {
          let body;
          try {
                  body = await req.json();
          } catch (err) {
                  return new Response(JSON.stringify({ error: "invalid_json" }), {
                            status: 400,
                            headers: NO_STORE_HEADERS,
                  });
          }

      const password = String(body.password || "");
          if (password !== getExpectedPassword()) {
                  return new Response(JSON.stringify({ error: "wrong_password" }), {
                            status: 401,
                            headers: NO_STORE_HEADERS,
                  });
          }

      const config = body.config;
          if (!config || typeof config !== "object") {
                  return new Response(JSON.stringify({ error: "invalid_config" }), {
                            status: 400,
                            headers: NO_STORE_HEADERS,
                  });
          }

      await store.setJSON("config", config);

      return new Response(JSON.stringify({ ok: true }), {
              headers: NO_STORE_HEADERS,
      });
    }

    return new Response("Method not allowed", { status: 405, headers: NO_STORE_HEADERS });
};

export const config = { path: "/api/site-content" };
