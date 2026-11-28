import type { APIRoute } from "astro";

export const prerender = true;

const origin = "https://www.visionovamundi.com";
const publicRoutes = [
  "/", "/about/", "/projects/", "/governance/", "/contact/", "/journey/",
  "/commissioners-partners/", "/unity-house/", "/circular-justice/", "/research-future/",
  "/ventures/", "/tree-of-life/", "/timeline/", "/satul-conectat-romania/", "/services/",
  "/project-clandestinus/", "/clandestinus-secret-app/", "/admintrace/", "/tradevault/",
  "/oneloo-total/", "/guardian-one/", "/guardian-glide/", "/roamwing/", "/vialora/",
  "/vialora-voyage/", "/innovation/", "/partnership-brief/",
];

export const GET: APIRoute = () => {
  const urls = publicRoutes.map((path) => `  <url><loc>${origin}${path}</loc></url>`).join("\n");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
