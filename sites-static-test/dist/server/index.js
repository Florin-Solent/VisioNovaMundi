const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname || "/";
    const candidates = pathname === "/" ? ["/index.html"] : pathname.endsWith("/") ? [pathname + "index.html"] : [pathname, pathname + "/index.html"];
    for (const path of candidates) {
      const response = await env.ASSETS.fetch(new Request(new URL(path, url)));
      if (response.status !== 404) return response;
    }
    return new Response("Not found", { status: 404 });
  }
};
export default worker;
