// Loopback-only gateway for the real local Auth/PostgREST services used by integration tests.
import http from "node:http";
import { readFileSync } from "node:fs";
const settings = JSON.parse(readFileSync(process.argv[2], "utf8"));
const keySet = new Set([
  settings.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  settings.SUPABASE_SECRET_KEY,
]);
http
  .createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "authorization,apikey,content-type,x-client-info,x-supabase-api-version",
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,PATCH,OPTIONS",
    );
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    const auth = req.url.startsWith("/auth/v1/"),
      rest = req.url.startsWith("/rest/v1/");
    if (!auth && !rest) {
      res.writeHead(404);
      res.end("{}");
      return;
    }
    if (rest && !keySet.has(req.headers.apikey)) {
      res.writeHead(401);
      res.end("{}");
      return;
    }
    try {
      const chunks = [];
      for await (const part of req) chunks.push(part);
      const headers = { ...req.headers };
      delete headers.host;
      delete headers["content-length"];
      delete headers.connection;
      const path = req.url.slice(auth ? "/auth/v1".length : "/rest/v1".length);
      const result = await fetch(
        `http://127.0.0.1:${auth ? 54325 : 54326}${path}`,
        {
          method: req.method,
          headers,
          body: ["GET", "HEAD"].includes(req.method)
            ? undefined
            : Buffer.concat(chunks),
          redirect: "manual",
          signal: AbortSignal.timeout(20000),
        },
      );
      for (const [name, value] of result.headers)
        if (
          ![
            "connection",
            "transfer-encoding",
            "content-encoding",
            "content-length",
            "access-control-allow-origin",
          ].includes(name)
        )
          res.setHeader(name, value);
      res.writeHead(result.status);
      res.end(Buffer.from(await result.arrayBuffer()));
    } catch {
      res.writeHead(502);
      res.end(JSON.stringify({ message: "Local test service unavailable." }));
    }
  })
  .listen(54321, "127.0.0.1", () => console.log("Local test gateway ready."));
