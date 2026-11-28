import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { checkTarget, production } from './check-target.mjs';
import { isCloudflareAnalyticsBeacon, selfTestQaExceptions } from './qa-exceptions.mjs';
import { inspectJourneyAssets } from './journey-media-check.mjs';

// Reuse the existing external QA runtime; do not change package dependencies.
const playwrightVersion = '1.64.0-alpha-1790635538000';
const fullRoutes = ['/', '/about/', '/journey/', '/commissioners-partners/', '/governance/', '/unity-house/', '/circular-justice/', '/research-future/', '/ventures/', '/tree-of-life/', '/contact/', '/projects/', '/timeline/', '/satul-conectat-romania/', '/services/', '/project-clandestinus/', '/clandestinus-secret-app/', '/admintrace/', '/tradevault/', '/oneloo-total/', '/guardian-one/', '/guardian-glide/', '/roamwing/', '/vialora/', '/vialora-voyage/', '/innovation/', '/partnership-brief/'];
const args = process.argv.slice(2);
const live = args.includes('--production');
const explicitModes = args.filter(arg => ['--full', '--smoke'].includes(arg));
assert(args.every(arg => ['--production', '--full', '--smoke'].includes(arg)), 'Unsupported argument; production target cannot be overridden');
assert(explicitModes.length <= 1, 'Choose only one QA mode');
const mode = live || explicitModes.includes('--full') ? 'FULL' : explicitModes.includes('--smoke') ? 'FAST' : process.env.VNM_QA_MODE || 'FULL';
assert(['FAST', 'FULL'].includes(mode), `Unsupported browser QA mode: ${mode}`);
const changedRouteCandidates = JSON.parse(process.env.VNM_CHANGED_ROUTES || '[]');
assert(Array.isArray(changedRouteCandidates) && changedRouteCandidates.every(route => typeof route === 'string' && route.startsWith('/') && route.endsWith('/')), 'Invalid changed-route list');
// Retired pages are verified by their Pages redirect rules below, not served as local HTML routes.
const redirectedRetiredRoutes = new Set(['/impact/', '/programmes/', '/work/']);
const changedRoutes = changedRouteCandidates.filter(route => !redirectedRetiredRoutes.has(route));
const coreRoutes = ['/', '/about/', '/journey/', '/projects/', '/governance/', '/contact/'];
const smokeRoutes = [...new Set([...coreRoutes, ...changedRoutes])];
const routes = mode === 'FULL' ? [...new Set([...fullRoutes, ...changedRoutes])] : smokeRoutes;
const axePath = resolve('output/release-qa/axe-core/package/axe.min.js');
const require = createRequire(import.meta.url);
async function runtime() {
  const candidates = [];
  if (process.env.VNM_PLAYWRIGHT_MODULE) candidates.push(resolve(process.env.VNM_PLAYWRIGHT_MODULE));
  try { candidates.push(require.resolve('playwright')); } catch {}
  const npmCache = execFileSync(process.platform === 'win32' ? 'cmd.exe' : 'npm', process.platform === 'win32' ? ['/d', '/s', '/c', 'npm config get cache'] : ['config', 'get', 'cache'], { encoding: 'utf8' }).trim();
  const cache = join(npmCache, '_npx');
  if (existsSync(cache)) for (const folder of await readdir(cache)) candidates.push(join(cache, folder, 'node_modules', 'playwright', 'index.js'));
  for (const candidate of candidates) {
    try {
      const pkg = JSON.parse(await readFile(join(candidate, '..', 'package.json'), 'utf8'));
      if (pkg.version === playwrightVersion) return require(candidate);
    } catch {}
  }
  throw new Error(`Missing pinned external Playwright ${playwrightVersion}. See docs/release-qa.md; QA fails closed without its browser runtime.`);
}
async function files(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    result.push(...(entry.isDirectory() ? await files(path) : [path]));
  }
  return result;
}
function webpExifChunkCount(bytes) {
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') return -1;
  let offset = 12, count = 0;
  while (offset + 8 <= bytes.length) {
    const kind = bytes.toString('ascii', offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    if (offset + 8 + length > bytes.length) return -1;
    if (kind === 'EXIF') count += 1;
    offset += 8 + length + (length & 1);
  }
  return offset === bytes.length ? count : -1;
}
const forbidden = /(?:localhost|127\.0\.0\.1|\.chatgpt\.site|\.vercel\.app)/i;
async function staticChecks() {
  const redirectText = await readFile('public/_redirects', 'utf8');
  const redirectRules = redirectText.trim().split(/\r?\n/).map(line => line.trim());
  const expectedRedirects = [
    '/impact /about/ 308', '/impact/ /about/ 308', '/work /about/ 308', '/work/ /about/ 308',
    '/programmes /projects/ 308', '/programmes/ /projects/ 308',
  ];
  for (const rule of expectedRedirects) assert(redirectRules.includes(rule), 'Missing Cloudflare Pages redirect: ' + rule);
  assert.equal(existsSync('vercel.json'), false, 'Cloudflare-only release must not include Vercel deployment configuration');
  assert(existsSync(axePath), 'Missing pinned axe-core accessibility tooling in output/release-qa');
  assert.equal((await readFile('dist/_redirects', 'utf8')).trim(), redirectText.trim(), 'Cloudflare redirects were not copied to the Pages build output');
  assert.equal((await readFile('dist/_headers', 'utf8')).trim(), (await readFile('public/_headers', 'utf8')).trim(), 'Cloudflare response headers were not copied to the Pages build output');
  assert(existsSync('dist/404.html'), 'Cloudflare Pages build is missing the custom HTTP 404 page');
  const robots = await readFile('dist/robots.txt', 'utf8');
  assert(robots.includes('Sitemap: https://www.visionovamundi.com/sitemap.xml'), 'robots.txt is missing the canonical sitemap');
  const sitemap = await readFile('dist/sitemap.xml', 'utf8');
  for (const route of fullRoutes) assert(sitemap.includes(`<loc>https://www.visionovamundi.com${route}</loc>`), `Sitemap is missing canonical route ${route}`);
  const builtJourney = await readFile('dist/journey/index.html', 'utf8');
  assert(builtJourney.includes('property="og:image"') && builtJourney.includes('name="twitter:card"'), 'Journey social sharing metadata is incomplete');
  assert(!/Facebook photo record|photo capture \d{4}-\d{2}-\d{2}|checkInLabels|albumEvidence|mediaPostEvidence/i.test(builtJourney), 'Private archive metadata leaked into the public Journey page');
  const publicAtlas = JSON.parse(await readFile('src/data/journey-atlas-destinations.json', 'utf8'));
  assert.equal(publicAtlas.destinations.length, 84, 'Expected all 84 public atlas place references');
  assert(publicAtlas.destinations.every(destination => !Object.hasOwn(destination, 'archive')), 'Private per-place archive evidence must remain outside the public atlas data');
  const publicImageManifest = JSON.parse(await readFile('src/data/journey-image-variants.json', 'utf8'));
  assert.equal(Object.keys(publicImageManifest).length, 12, 'Only the 12 cleared Journey photographs may be shipped');
  for (const family of Object.values(publicImageManifest)) {
    for (const variant of family.variants) {
      assert(builtJourney.includes(variant.src), `Journey image variant is not referenced by the page: ${variant.src}`);
      const imageBytes = await readFile(resolve('public', `.${variant.src}`));
      assert.equal(imageBytes.length, variant.bytes, `Image byte manifest mismatch: ${variant.src}`);
      assert.equal(createHash('sha256').update(imageBytes).digest('hex'), variant.sha256, `Image hash manifest mismatch: ${variant.src}`);
      assert.equal(webpExifChunkCount(imageBytes), 0, `Journey publication image contains EXIF metadata or malformed WebP: ${variant.src}`);
    }
  }
  const builtContentFiles = await files('dist');
  const builtReferenceFiles = builtContentFiles.filter(path => /\.(?:html|css|js|xml)$/i.test(path));
  const builtReferenceText = (await Promise.all(builtReferenceFiles.map(path => readFile(path, 'utf8')))).join('\n');
  for (const asset of (await files('public/images/journey')).map(path => path.replaceAll('\\', '/').split('/public/')[1])) {
    if (!/\.(?:webp|svg|png)$/i.test(asset)) continue;
    assert(builtReferenceText.includes('/' + asset), `Unreferenced Journey image asset in the release: /${asset}`);
  }
  for (const route of ['/impact/', '/programmes/', '/work/']) assert(!existsSync(join('dist', route, 'index.html')), 'Retired route ' + route + ' must not be generated as an HTML page');
  for (const route of fullRoutes) assert(existsSync(join('dist', route, 'index.html')), `Missing built route ${route}`);
  for (const route of changedRoutes) assert(existsSync(join('dist', route, 'index.html')), `Missing changed route ${route}`);
  for (const path of await files('dist')) {
    if (extname(path) !== '.html') continue;
    const html = await readFile(path, 'utf8');
    if (fullRoutes.some(route => resolve(path) === resolve('dist', '.' + route, 'index.html')) || changedRoutes.some(route => resolve(path) === resolve('dist', '.' + route, 'index.html'))) {
      assert(/<title>[^<]+<\/title>/.test(html), `Missing title: ${path}`);
      assert(/name="description"\s+content="[^"]+"/.test(html), `Missing description: ${path}`);
      assert(/rel="canonical"\s+href="https:\/\/www\.visionovamundi\.com\//.test(html), `Missing canonical production URL: ${path}`);
      assert(/property="og:image"\s+content="https:\/\/www\.visionovamundi\.com\/images\/vnm-social-card\.png"/.test(html), `Missing Open Graph image: ${path}`);
      assert(/name="twitter:card"\s+content="summary_large_image"/.test(html), `Missing large image Twitter card: ${path}`);
    }
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const value = match[1];
      assert(!forbidden.test(value), `Nonproduction URL ${value} in ${path}`);
      if (!value.startsWith('/') || value.startsWith('//')) continue;
      const pathname = decodeURIComponent(value.split(/[?#]/)[0]);
      const normalizedPath = pathname.replace(/\/+$/, '') || '/';
      assert(!['/impact', '/programmes', '/work'].includes(normalizedPath), 'Internal link still points to a retired route: ' + value + ' in ' + path);
      const target = resolve('dist', `.${pathname}`);
      if (pathname.startsWith('/_astro/')) {
        assert(existsSync(target), `Missing built asset ${value}`);
      } else {
        const candidates = extname(pathname) ? [target] : [join(target, 'index.html'), target];
        assert(candidates.some(existsSync), `Missing generated destination ${value} in ${path}`);
      }
    }
  }
  assert(!existsSync('dist/server/index.js'), 'Legacy Sites worker must not be in a standard build');
  const projectUpdateKeys = [
    ['/unity-house/', 'unity-house'], ['/circular-justice/', 'circular-justice'], ['/satul-conectat-romania/', 'satul-conectat-romania'],
    ['/project-clandestinus/', 'project-clandestinus'], ['/clandestinus-secret-app/', 'clandestinus-secret-app'], ['/tradevault/', 'tradevault'],
    ['/oneloo-total/', 'oneloo'], ['/guardian-one/', 'guardian-one'], ['/guardian-glide/', 'guardian-glide'], ['/roamwing/', 'roamwing'], ['/vialora/', 'vialora'],
    ['/vialora-voyage/', 'vialora-voyage'], ['/admintrace/', 'admintrace'],
  ];
  for (const [route, key] of projectUpdateKeys) {
    const html = await readFile(join('dist', route.slice(1), 'index.html'), 'utf8');
    assert(html.includes('id="updates-' + key + '"'), 'Missing reusable Updates section on ' + route);
  }
  const journeyAssets = await inspectJourneyAssets(resolve('dist'));
  console.log(`Journey release gate: ${journeyAssets.clipCount} silent clips and ${journeyAssets.sourceCount} exact MP4/WebM assets verified`);
  console.log('Static route, metadata, asset and URL checks passed');
}
async function serve() {
  const root = resolve('dist');
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.xml': 'application/xml', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm' };
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : extname(pathname) ? '' : '/index.html'));
      assert(file.startsWith(root + sep));
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      try { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(await readFile(join(root, '404.html'))); }
      catch { res.writeHead(404); res.end('Not found'); }
    }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  return { base: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(done => server.close(done)) };
}
async function qa(base, chromium) {
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const report = { mode, target: base, runtime: playwrightVersion, node: process.version, browser: browser.version(), commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), started: new Date().toISOString(), cases: [], accessibility: [], failures: [], analyticsBeaconsAnswered: 0 };
  const links = new Set(routes);
  try {
    const viewports = mode === 'FULL'
      ? [{ width: 1440, height: 900 }, { width: 820, height: 900 }, { width: 390, height: 844 }]
      : [{ width: 1440, height: 900 }, { width: 390, height: 844 }];
    const cases = [];
    if (mode === 'FULL') {
      for (const viewport of viewports) for (const reduced of [false, true]) for (const route of routes) cases.push({ route, viewport, reduced });
    } else {
      for (const route of smokeRoutes) for (const viewport of viewports) cases.push({ route, viewport, reduced: false });
      for (const route of [...new Set(['/', ...changedRoutes])]) for (const viewport of viewports) cases.push({ route, viewport, reduced: true });
    }
    for (const { route, viewport, reduced } of cases) {
      const label = `${route} ${viewport.width} ${reduced ? 'reduced' : 'normal'}`;
      const context = await browser.newContext({ viewport, hasTouch: viewport.width === 390, reducedMotion: reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block' });
      const errors = [], scripts = [], pending = new Set();
      let analyticsBeacons = 0;
      const page = await context.newPage();
      page.on('request', request => { if (new URL(request.url()).origin === base) pending.add(request); });
      page.on('requestfinished', request => pending.delete(request));
      page.on('requestfailed', request => pending.delete(request));
      page.on('pageerror', error => errors.push(`Uncaught: ${error.message}`));
      page.on('console', message => { if (message.type() === 'error') errors.push(`Console: ${message.text()}`); });
      page.on('requestfailed', request => { if (new URL(request.url()).origin === base) errors.push(`Failed resource: ${request.url()} ${request.failure()?.errorText}`); });
      page.on('response', response => {
        if (new URL(response.url()).origin === base && response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`);
        if (response.request().resourceType() === 'script') scripts.push(response.url());
      });
      await context.route('**/*', async intercepted => {
        const request = intercepted.request();
        if (isCloudflareAnalyticsBeacon(request.method(), request.url(), live)) { analyticsBeacons++; await intercepted.fulfill({ status: 204, body: '' }); }
        else if (!['GET', 'HEAD'].includes(request.method())) { errors.push(`Blocked write ${request.method()} ${request.url()}`); await intercepted.abort(); }
        else await intercepted.continue();
      });
      await page.addInitScript(() => {
        window.__vnmQA = { draws: 0, pointerEvents: 0 };
        for (const type of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
          if (!type) continue;
          for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
            const original = type.prototype[name];
            if (original) type.prototype[name] = function (...args) { window.__vnmQA.draws++; return original.apply(this, args); };
          }
        }
        document.addEventListener('pointerdown', event => {
          if (event.target instanceof Element && event.target.matches('canvas[data-unity-canvas],canvas[data-cosmic-canvas]')) window.__vnmQA.pointerEvents++;
        }, true);
      });
      try {
        const response = await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
        assert(response?.ok(), 'Document request failed');
        const deadline = Date.now() + 15000;
        while (pending.size && Date.now() < deadline) await page.waitForTimeout(100);
        assert.equal(pending.size, 0, 'First-party initial resources did not settle');
        const main = page.locator('main');
        assert.equal(await main.count(), 1, `Expected one main content landmark on ${route}`);
        await main.waitFor({ state: 'visible' });
        await page.waitForTimeout(700);
        if (!reduced && (viewport.width === 1440 || viewport.width === 390)) {
          await page.addScriptTag({ path: axePath });
          const result = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
          const violations = result.violations.map(violation => ({ id: violation.id, impact: violation.impact, targets: violation.nodes.map(node => node.target), help: violation.help }));
          report.accessibility.push({ route, viewport: viewport.width, violations: violations.length });
          assert.equal(violations.length, 0, `axe-core found ${violations.length} WCAG 2.2 AA violation(s) on ${route} at ${viewport.width}px: ${JSON.stringify(violations)}`);
        }
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal overflow at initial viewport');
        assert(await page.title(), 'Missing title');
        assert.equal(await main.locator('h1').count(), 1, 'Expected one page heading');
        assert(await page.locator('meta[name="description"]').getAttribute('content'), 'Missing meta description');
        const attrs = await page.locator('[href],[src]').evaluateAll(elements => elements.flatMap(el => ['href', 'src'].map(attr => el.getAttribute(attr)).filter(Boolean)));
        for (const value of attrs) {
          assert(!forbidden.test(value), `Nonproduction URL: ${value}`);
          if (value.startsWith('/') && !value.startsWith('//')) links.add(value.split('#')[0]);
        }
        const toggle = page.locator('[data-mobile-nav-toggle]');
        const nav = page.locator('[data-site-nav]');
        assert.equal(await nav.count(), 1, `Expected one institutional navigation on ${route}`);
        assert.deepEqual(await nav.locator('a').allTextContents(), ['About', 'Projects', 'Governance', 'Contact'], 'Unexpected institutional navigation');
        const footerGroups = page.locator('[data-footer-group]');
        assert.equal(await footerGroups.count(), 3, 'Expected the three shared footer groups');
        assert.deepEqual(await footerGroups.locator('[data-footer-toggle] span:first-child').allTextContents(), ['Organisation', 'Work', 'Ecosystem & Related'], 'Unexpected footer headings');
        for (const submenu of await footerGroups.locator('.footer-submenu').all()) {
          assert.equal(await submenu.getAttribute('aria-hidden'), 'true', 'Footer submenu should start closed');
        }
        if (viewport.width === 390) {
          const footerToggle = footerGroups.nth(0).locator('[data-footer-toggle]');
          await footerToggle.tap();
          assert.equal(await footerToggle.getAttribute('aria-expanded'), 'true', 'Touch did not open the footer submenu');
          assert.equal(await footerGroups.nth(0).locator('.footer-submenu').getAttribute('aria-hidden'), 'false');
          await footerToggle.tap();
          assert.equal(await footerToggle.getAttribute('aria-expanded'), 'false', 'Touch did not close the footer submenu');
        } else {
          const footerGroup = footerGroups.nth(0);
          const footerToggle = footerGroup.locator('[data-footer-toggle]');
          await footerGroup.hover();
          assert.equal(await footerToggle.getAttribute('aria-expanded'), 'true', 'Hover did not open the footer submenu');
          assert.equal(await footerGroups.nth(1).locator('[data-footer-toggle]').getAttribute('aria-expanded'), 'false', 'Hover opened more than one footer group');
          await page.mouse.move(5, 5);
          assert.equal(await footerToggle.getAttribute('aria-expanded'), 'false', 'Footer submenu remained open after pointer leave');
          await footerToggle.focus();
          assert.equal(await footerToggle.getAttribute('aria-expanded'), 'true', 'Keyboard focus did not open the footer submenu');
          await page.evaluate(() => (document.activeElement instanceof HTMLElement) && document.activeElement.blur());
          assert.equal(await footerToggle.getAttribute('aria-expanded'), 'false', 'Footer submenu remained open after keyboard focus left');
        }
        if (viewport.width === 390) {
          assert.equal(await toggle.getAttribute('aria-controls'), await nav.getAttribute('id'));
          assert(await toggle.getAttribute('aria-label'));
          await toggle.tap(); assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
          assert(await nav.isVisible());
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal overflow with mobile menu open');
          await toggle.tap(); assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
          await toggle.focus(); await page.keyboard.press('Enter');
          assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
          await nav.locator('a').first().focus(); await page.keyboard.press('Escape');
          assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
          assert(await toggle.evaluate(el => el === document.activeElement), 'Escape did not return focus');
        } else assert(await nav.isVisible(), 'Desktop navigation hidden');
        if (route === '/satul-conectat-romania/') {
          const cta = page.locator('a[href="https://projectclandestinus.com/project/"]');
          assert(await cta.count() > 0, 'Incorrect/missing Clandestinus external CTA');
        }
        if (route === '/about/') {
          const meccCard = page.locator('[data-mecc-card]');
          const founderCard = page.locator('.card.founder');
          const meccToggle = meccCard.locator('[data-mecc-toggle]');
          const meccPanel = meccCard.locator('[data-mecc-details]');
          assert.equal(await meccToggle.locator('[data-mecc-toggle-label]').innerText(), 'Learn more', 'MECC disclosure has the wrong initial label');
          assert.equal(await meccToggle.getAttribute('aria-expanded'), 'false', 'MECC disclosure must start collapsed');
          assert.equal(await meccToggle.getAttribute('aria-controls'), await meccPanel.getAttribute('id'), 'MECC disclosure does not identify its panel');
          assert(await meccPanel.evaluate(el => el.hidden && el.inert && el.getAttribute('aria-hidden') === 'true'), 'Collapsed MECC details are not hidden from interaction and assistive technology');
          assert.equal(await meccCard.locator('h2').innerText(), 'Making Every Contact Count');
          assert(await meccCard.locator('.mecc-meta').innerText().then(text => /Waltham Forest.*October 2026/.test(text)), 'MECC provider/date is not visible while collapsed');
          const cardMetrics = await meccCard.evaluate(el => { const style = getComputedStyle(el); return { width: el.getBoundingClientRect().width, padding: style.padding, radius: style.borderRadius }; });
          const founderMetrics = await founderCard.evaluate(el => { const style = getComputedStyle(el); return { width: el.getBoundingClientRect().width, padding: style.padding, radius: style.borderRadius }; });
          assert.deepEqual(cardMetrics, founderMetrics, 'Collapsed MECC card no longer matches Founder Perspective width, padding, and border radius');
          await meccToggle.focus();
          assert(await meccToggle.evaluate(el => el.matches(':focus-visible')), 'MECC control has no visible keyboard focus');
          await page.evaluate(() => {
            window.__vnmMeccAnimations = [];
            const animate = Element.prototype.animate;
            Element.prototype.animate = function (keyframes, options) {
              if (this.matches('[data-mecc-details]')) window.__vnmMeccAnimations.push(options);
              return animate.call(this, keyframes, options);
            };
          });
          await page.keyboard.press('Enter');
          assert.equal(await meccToggle.getAttribute('aria-expanded'), 'true', 'Keyboard did not expand MECC details');
          assert.equal(await meccToggle.locator('[data-mecc-toggle-label]').innerText(), 'Show less');
          if (reduced) {
            assert.equal(await page.evaluate(() => window.__vnmMeccAnimations.length), 0, 'Reduced-motion MECC expansion started an animation');
          } else {
            assert(await page.evaluate(() => window.__vnmMeccAnimations.some(options => options?.duration === 300)), 'MECC expansion is missing its 300ms transition');
          }
          await page.waitForFunction(() => { const panel = document.querySelector('[data-mecc-details]'); return panel && !panel.hidden && !panel.style.height; });
          assert(await meccPanel.isVisible(), 'Expanded MECC details are not visible');
          assert(await meccPanel.evaluate(el => !el.hidden && !el.inert && el.getAttribute('aria-hidden') === 'false'), 'Expanded MECC details remain inaccessible');
          const detailsText = await meccPanel.innerText();
          for (const required of ['Ask', 'Advise', 'Assist', 'Unity House Centres', 'Circular Justice', 'Satul Conectat România', 'Clandestinus Educational Games', 'not a clinical qualification', 'safeguarding']) {
            assert(detailsText.toLowerCase().includes(required.toLowerCase()), `MECC details are missing ${required}`);
          }
          assert.equal(await meccPanel.locator('a[href="https://www.walthamforest.gov.uk/health-and-wellbeing/public-health-strategies-and-policies/making-every-contact-count"]').count(), 1, 'Official MECC information link is missing');
          await page.waitForFunction(() => { const panel = document.querySelector('[data-mecc-details]'); return panel && !panel.hidden && !panel.style.height; });
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Expanded MECC card causes horizontal overflow');
          await meccToggle.click();
          assert.equal(await meccToggle.getAttribute('aria-expanded'), 'false', 'Pointer did not close MECC details');
          await page.waitForFunction(() => document.querySelector('[data-mecc-details]')?.hidden === true);
          await meccToggle.click();
          assert.equal(await meccToggle.getAttribute('aria-expanded'), 'true', 'Pointer did not reopen MECC details');
          await page.waitForFunction(() => { const panel = document.querySelector('[data-mecc-details]'); return panel && !panel.hidden && !panel.style.height; });
          await meccToggle.focus();
          await page.keyboard.press('Enter');
          assert.equal(await meccToggle.getAttribute('aria-expanded'), 'false', 'Keyboard did not close MECC details');
          await page.waitForFunction(() => document.querySelector('[data-mecc-details]')?.hidden === true);
        }
        if (['/services/', '/project-clandestinus/'].includes(route)) {
          const canvas = page.locator(route === '/services/' ? 'canvas[data-unity-canvas]' : 'canvas[data-cosmic-canvas]');
          await canvas.waitFor({ state: 'visible' });
          await page.waitForFunction(() => window.__vnmQA.draws > 0);
          assert(scripts.some(url => url.includes(`/_astro/${route.slice(1, -1)}.astro_astro_type_script_`)), 'Route scene script not requested');
          assert(await canvas.evaluate(el => el.width > 0 && el.height > 0), 'Zero-sized scene');
          const draws = await page.evaluate(() => window.__vnmQA.draws);
          if (reduced) {
            await page.waitForTimeout(500);
            assert.equal(await page.evaluate(() => window.__vnmQA.draws), draws, 'Reduced-motion scene kept animating');
          } else await page.waitForFunction(previous => window.__vnmQA.draws > previous, draws, { timeout: 5000 });
          await canvas.scrollIntoViewIfNeeded();
          const box = await canvas.boundingBox(); assert(box, 'Scene has no bounds');
          if (viewport.width === 390) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
          else { await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 25, box.y + box.height / 2); await page.mouse.up(); }
          assert(await page.evaluate(() => window.__vnmQA.pointerEvents > 0), 'Scene input was not delivered');
          if (route === '/project-clandestinus/') assert(!await canvas.evaluate(el => el.classList.contains('is-dragging')), 'Scene drag not released');
        }
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(300);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal overflow');
        if (reduced) {
          assert(await page.evaluate(() => !document.documentElement.classList.contains('motion-ready')), 'Reduced motion enabled reveal animations');
          assert(await page.locator('main').evaluate(el => getComputedStyle(el).opacity === '1'), 'Reduced-motion content hidden');
        }
        // Follow a real navigation destination with keyboard/touch, then check errors.
        {
          const home = page.locator('header a.brand[href="/"]');
          if (viewport.width === 390) { await toggle.tap(); await home.tap(); } else { await home.focus(); await page.keyboard.press('Enter'); }
          await page.waitForURL(base + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
          await page.waitForTimeout(200);
        }
        assert.deepEqual(errors, [], errors.join('\n'));
        report.cases.push({ label, passed: true, scripts, analyticsBeacons }); console.log(`PASS ${label}`);
      } catch (error) { report.failures.push({ label, error: error.message, browserErrors: errors }); console.error(`FAIL ${label}: ${error.message}`); }
      finally { report.analyticsBeaconsAnswered += analyticsBeacons; await context.close(); }
    }
    const imageManifest = JSON.parse(await readFile('src/data/journey-image-variants.json', 'utf8'));
    const imageBytes = new Map(Object.values(imageManifest).flatMap(image => image.variants.map(variant => [new URL(variant.src, base).href, variant.bytes])));
    report.journeyImagePerformance = [];
    for (const dpr of [1, 2]) {
      const imageContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr, reducedMotion: 'reduce', serviceWorkers: 'block' });
      try {
        const imagePage = await imageContext.newPage();
        await imagePage.goto(base + '/journey/', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await imagePage.waitForFunction(() => {
          const hero = document.querySelector('.title-sequence img');
          return hero?.complete && hero.naturalWidth > 0;
        }, undefined, { timeout: 15000 });
        const firstViewUrls = await imagePage.evaluate(() => [...document.querySelectorAll('.title-sequence img')].filter(image => image.complete && image.naturalWidth > 0).map(image => image.currentSrc));
        const firstViewBytes = [...new Set(firstViewUrls)].reduce((sum, src) => sum + (imageBytes.get(src) || 0), 0);
        await imagePage.evaluate(() => {
          for (const image of document.querySelectorAll('img[data-src]')) {
            image.src = image.dataset.src || '';
            image.srcset = image.dataset.srcset || '';
            image.removeAttribute('data-src');
            image.removeAttribute('data-srcset');
          }
        });
        const images = imagePage.locator('.film img');
        for (let index = 0; index < await images.count(); index += 1) {
          const image = images.nth(index);
          await image.scrollIntoViewIfNeeded();
          await imagePage.waitForFunction(i => {
            const current = document.querySelectorAll('.film img')[i];
            return current?.complete && current.naturalWidth > 0;
          }, index, { timeout: 15000 });
        }
        const fullUrls = await images.evaluateAll(items => items.map(image => image.currentSrc).filter(Boolean));
        const uniqueUrls = [...new Set(fullUrls)];
        const missingImages = uniqueUrls.filter(src => !imageBytes.has(src));
        assert.deepEqual(missingImages, [], 'Journey used a responsive image that is absent from the byte manifest');
        const fullBytes = uniqueUrls.reduce((sum, src) => sum + imageBytes.get(src), 0);
        const metric = { deviceScaleFactor: dpr, firstViewportImageBytes: firstViewBytes, fullJourneyUniqueImageBytes: fullBytes, uniqueResponsiveFiles: uniqueUrls.length, files: uniqueUrls.map(src => ({ path: new URL(src).pathname, bytes: imageBytes.get(src) })).sort((a, b) => b.bytes - a.bytes) };
        report.journeyImagePerformance.push(metric);
        assert(firstViewBytes <= 1_200_000, `Journey first-view images exceed the 1.2 MB @1x budget: ${firstViewBytes} bytes`);
        if (dpr === 2) assert(fullBytes <= 4_000_000, `Journey responsive photography exceeds the 4 MB @2x budget after scrolling: ${fullBytes} bytes`);
      } finally { await imageContext.close(); }
    }
    const request = await browser.newContext();
    try {
      for (const link of links) {
        const response = await request.request.get(base + link, { timeout: 30000 });
        if (!response.ok()) report.failures.push({ label: `Internal link ${link}`, error: `HTTP ${response.status()}` });
        if (live && new URL(response.url()).origin !== production) report.failures.push({ label: link, error: 'Redirected off canonical production' });
      }
      const missingResponse = await request.request.get(base + '/vnm-release-check-intentional-404/', { timeout: 30000 });
      assert.equal(missingResponse.status(), 404, 'Unknown route must return an actual HTTP 404');
      assert.match(await missingResponse.text(), /page not found/i, 'HTTP 404 response must display the custom not-found page');
    } finally { await request.close(); }
  } finally {
    await browser.close();
    report.finished = new Date().toISOString();
    await mkdir('output/release-qa', { recursive: true });
    await writeFile(`output/release-qa/${live ? 'production' : 'local'}.json`, JSON.stringify(report, null, 2));
  }
  assert.equal(report.failures.length, 0, `${report.failures.length} QA checks failed; inspect output/release-qa/${live ? 'production' : 'local'}.json`);
  console.log(`QA passed: ${report.cases.length} route/viewport/motion cases; ${links.size} internal destinations checked`);
  if (report.analyticsBeaconsAnswered) console.log(`Cloudflare Web Analytics beacons answered locally (not forwarded): ${report.analyticsBeaconsAnswered}`);
}
let local;
try {
  checkTarget();
  selfTestQaExceptions();
  const { chromium } = await runtime();
  if (!live) {
    execFileSync(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build'], { stdio: 'inherit' });
    await staticChecks(); local = await serve();
  }
  await qa(live ? production : local.base, chromium);
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { if (local) await local.close(); }
