import assert from "node:assert/strict";
import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";

const load = async (path, plugins = []) => {
  const result = await build({ entryPoints: [path], bundle: true, write: false, format: "esm", platform: "node", plugins });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
};
const { SITE_URL, SITE_UPDATED_AT, videoJsonLd } = await load("src/lib/schema-ld.ts");
const { default: sitemap } = await load("src/app/sitemap.ts");

assert.match(videoJsonLd.uploadDate, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/, "Video publication needs a complete ISO datetime and explicit timezone.");
assert.equal(new Date(videoJsonLd.uploadDate).toISOString(), "2026-04-10T10:00:56.000Z", "Publication must match YouTube's original metadata, not an invented midnight.");
assert.equal(videoJsonLd.creator.name, "Mont Corvo");
assert.equal(videoJsonLd.contentUrl, undefined, "A YouTube watch page is not a raw video file.");
assert.deepEqual(sitemap().map(item => item.url), [SITE_URL]);
assert(sitemap().every(item => item.lastModified === SITE_UPDATED_AT), "Sitemap dates must describe a real update rather than the request time.");

// Exercise the actual edge entrypoint. Only the generated Next handler is a
// fixture, so these assertions catch broken delegation, exports and redirects.
const entry = JSON.parse(await readFile("wrangler.jsonc", "utf8")).main;
const worker = await load(entry, [{
  name: "next-handler-fixture",
  setup(builder) {
    builder.onResolve({ filter: /\.open-next\/worker\.js$/ }, () => ({ path: "next-handler", namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: `
      export const handlerCalls = [];
      export default { fetch(request, env, ctx) {
        handlerCalls.push({ request, env, ctx });
        return new Response('next handler');
      } };
    ` }));
  },
}]);
const env = { marker: "fixture" }, ctx = { waitUntil() {} };
for (const path of ["/", "/theorie?source=search", "/robots.txt", "/sitemap.xml", "/api/bus-entries"]) {
  const response = await worker.default.fetch(new Request(`http://lesfousdubus.sbs${path}`), env, ctx);
  assert.equal(response.status, 308, "HTTP must permanently redirect without changing POST semantics.");
  assert.equal(response.headers.get("location"), `${SITE_URL}${path}`);
}
assert.equal(worker.handlerCalls.length, 0, "Insecure requests must redirect before reaching Next or D1.");
const secure = new Request(`${SITE_URL}/api/bus-entries`, { method: "POST", body: "fixture" });
assert.equal(await (await worker.default.fetch(secure, env, ctx)).text(), "next handler");
assert.deepEqual(worker.handlerCalls[0], { request: secure, env, ctx });
assert.equal(await (await worker.default.fetch(new Request("http://localhost:3000/"), env, ctx)).text(), "next handler", "Local development must keep working over HTTP.");

const base = process.env.BASE_URL;
const report = { base: base ?? null, checks: ["Video datetime matches YouTube with timezone", "Homepage identity and stable sitemap", "Edge HTTPS redirect, query preservation, exports and Next delegation"] };
if (base) {
  const get = async path => {
    const response = await fetch(new URL(path, base));
    return { status: response.status, html: await response.text() };
  };
  const jsonLd = html => [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
  const meta = (html, property) => [...html.matchAll(/<meta\b[^>]*>/g)].map(match => match[0]).find(tag => tag.includes(`property="${property}"`) || tag.includes(`name="${property}"`))?.match(/content="([^"]*)"/)?.[1];
  const [home, removed, missing, xml, robots] = await Promise.all([get("/"), get("/theorie"), get("/seo-regression-missing-page"), get("/sitemap.xml"), get("/robots.txt")]);
  assert.equal(home.status, 200);
  assert.equal(removed.status, 404, "The dedicated reading page has been removed.");
  assert.equal(missing.status, 404);
  assert.deepEqual(jsonLd(home.html).map(item => item["@type"]).sort(), ["VideoObject", "WebSite"]);
  assert.equal(jsonLd(removed.html).length, 0);
  assert.equal(jsonLd(home.html).find(item => item["@type"] === "VideoObject").uploadDate, videoJsonLd.uploadDate);
  assert.equal(jsonLd(missing.html).length, 0, "Error pages must not claim to contain an article or video.");
  assert(!home.html.includes('id="theorie-fous-du-bus-manifeste"'), "The crawler-only hidden article must be removed.");
  assert.doesNotMatch(home.html, /href="\/theorie"/);
  assert.match(home.html, /id="bus-loading-wheel"/);
  assert.equal(meta(home.html, "og:image"), `${SITE_URL}/og-image.jpg`);
  assert.equal(meta(home.html, "og:type"), "website");
  assert.equal(meta(home.html, "twitter:image"), `${SITE_URL}/og-image.jpg`);
  assert.doesNotMatch(xml.html, /<loc>https:\/\/lesfousdubus\.sbs\/theorie<\/loc>/);
  assert.match(robots.html, /Disallow: \/api\//);
  const legacy = await fetch(new URL("/sitemap-index.xml", base), { redirect: "manual" });
  assert.equal(legacy.status, 308, "The sitemap URL previously registered with Google must remain usable.");
  assert.equal(new URL(legacy.headers.get("location"), base).pathname, "/sitemap.xml");
  if (new URL(base).hostname === "lesfousdubus.sbs") {
    for (const path of ["/", "/theorie?source=seo-check", "/sitemap.xml", "/robots.txt"]) {
      const response = await fetch(`http://lesfousdubus.sbs${path}`, { redirect: "manual" });
      assert.equal(response.status, 308, `Published HTTP redirect failed for ${path}`);
      assert.equal(response.headers.get("location"), `${SITE_URL}${path}`);
    }
    report.checks.push("Published HTTP URLs redirect permanently to HTTPS");
  }
  report.checks.push("Homepage, removed reading page, social previews and sitemap");
}
if (process.env.SEO_REPORT) await writeFile(process.env.SEO_REPORT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
