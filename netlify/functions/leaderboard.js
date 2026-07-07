import { getStore } from "@netlify/blobs";

// Shared leaderboard API for the wedding site's games.
// GET  /api/leaderboard?game=flappy   -> { list: [...top 50 by score] }
// POST /api/leaderboard?game=flappy   body: { name, score, char }
//      -> { list: [...top 10], rank, total }

const ALLOWED_GAMES = ["flappy", "tetris"];
const MAX_STORED = 200;
const NO_STORE_HEADERS = {
  "content-type": "application/json",
  "cache-control": "no-store, no-cache, must-revalidate",
};

export default async (req) => {
  const url = new URL(req.url);
  let game = url.searchParams.get("game") || "flappy";
  if (!ALLOWED_GAMES.includes(game)) game = "flappy";

  const store = getStore("wedding-leaderboards");

  if (req.method === "GET") {
    const list = (await store.get(game, { type: "json" })) || [];
    return new Response(JSON.stringify({ list }), {
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

    const name = String(body.name || "Anonym").slice(0, 20);
    const score = Number(body.score);
    const char = body.char === "groom" ? "groom" : "bride";

    if (!Number.isFinite(score)) {
      return new Response(JSON.stringify({ error: "invalid_score" }), {
        status: 400,
        headers: NO_STORE_HEADERS,
      });
    }

    const entry = { name, score, char, ts: Date.now() };
    const existing = (await store.get(game, { type: "json" })) || [];
    existing.push(entry);
    existing.sort((a, b) => b.score - a.score);
    const trimmed = existing.slice(0, MAX_STORED);

    await store.setJSON(game, trimmed);

    const rank = trimmed.findIndex((e) => e === entry) + 1;

    return new Response(
      JSON.stringify({
        list: trimmed.slice(0, 10),
        rank: rank > 0 ? rank : trimmed.length,
        total: trimmed.length,
      }),
      { headers: NO_STORE_HEADERS }
    );
  }

  return new Response("Method not allowed", { status: 405, headers: NO_STORE_HEADERS });
};

export const config = { path: "/api/leaderboard" };
