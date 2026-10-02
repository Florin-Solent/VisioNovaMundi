import { mkdir, writeFile } from "node:fs/promises";

// LEGACY / NON-PRODUCTION ONLY. Never run as part of a normal VNM release.
// Sites publishing requires separate explicit approval; see DEPLOYMENT_POLICY.md.
const entry = `
const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname || "/";
    const candidates = [];

    if (pathname === "/") {
      candidates.push("/index.html");
    } else if (pathname.endsWith("/")) {
      candidates.push(pathname + "index.html");
    } else {
      candidates.push(pathname);
      candidates.push(pathname + "/index.html");
    }

    for (const path of candidates) {
      const response = await env.ASSETS.fetch(new Request(new URL(path, url)));
      if (response.status !== 404) return response;
    }

    return new Response("Not found", { status: 404 });
  },
};

export default worker;
`;

await mkdir("dist/server", { recursive: true });
await writeFile("dist/server/index.js", entry.trimStart(), "utf8");
