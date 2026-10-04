import assert from 'node:assert/strict';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { checkTarget, production } from './check-target.mjs';

// Reuse the existing external QA runtime; do not change package dependencies.
const playwrightVersion = '1.64.0-alpha-1790635538000';
const fullRoutes = ['/', '/about/', '/work/', '/commissioners-partners/', '/governance/', '/unity-house/', '/circular-justice/', '/research-future/', '/ventures/', '/tree-of-life/', '/contact/', '/projects/', '/timeline/', '/satul-conectat-romania/', '/services/', '/project-clandestinus/', '/clandestinus-secret-app/', '/admintrace/', '/tradevault/', '/oneloo-total/', '/guardian-one/', '/guardian-glide/', '/roamwing/', '/vialora/', '/vialora-voyage/', '/innovation/', '/partnership-brief/'];
const args = process.argv.slice(2);
const live = args.includes('--production');
const explicitModes = args.filter(arg => ['--full', '--smoke'].includes(arg));
assert(args.every(arg => ['--production', '--full', '--smoke'].includes(arg)), 'Unsupported argument; production target cannot be overridden');
assert(explicitModes.length <= 1, 'Choose only one QA mode');
const mode = live || explicitModes.includes('--full') ? 'FULL' : explicitModes.includes('--smoke') ? 'FAST' : process.env.VNM_QA_MODE || 'FULL';
assert(['FAST', 'FULL'].includes(mode), `Unsupported browser QA mode: ${mode}`);
const changedRoutes = JSON.parse(process.env.VNM_CHANGED_ROUTES || '[]');
assert(Array.isArray(changedRoutes) && changedRoutes.every(route => typeof route === 'string' && route.startsWith('/') && route.endsWith('/')), 'Invalid changed-route list');
const coreRoutes = ['/', '/work/', '/projects/', '/governance/', '/contact/'];
const smokeRoutes = [...new Set([...coreRoutes, ...changedRoutes])];
const routes = mode === 'FULL' ? [...new Set([...fullRoutes, ...changedRoutes])] : smokeRoutes;
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
const forbidden = /(?:localhost|127\.0\.0\.1|\.chatgpt\.site|\.vercel\.app)/i;
async function staticChecks() {
  const redirectText = await readFile('public/_redirects', 'utf8');
  const redirectRules = redirectText.trim().split(/\r?\n/).map(line => line.trim());
  const expectedRedirects = [
    '/impact /work/ 308', '/impact/ /work/ 308',
    '/programmes /projects/ 308', '/programmes/ /projects/ 308',
  ];
  for (const rule of expectedRedirects) assert(redirectRules.includes(rule), 'Missing Cloudflare Pages redirect: ' + rule);
  assert(!existsSync('vercel.json'), 'Vercel-specific redirect configuration must not be present');
  assert.equal((await readFile('dist/_redirects', 'utf8')).trim(), redirectText.trim(), 'Cloudflare redirects were not copied to the Pages build output');
  for (const route of ['/impact/', '/programmes/']) assert(!existsSync(join('dist', route, 'index.html')), 'Retired route ' + route + ' must not be generated as an HTML page');
  for (const route of fullRoutes) assert(existsSync(join('dist', route, 'index.html')), `Missing built route ${route}`);
  for (const route of changedRoutes) assert(existsSync(join('dist', route, 'index.html')), `Missing changed route ${route}`);
  for (const path of await files('dist')) {
    if (extname(path) !== '.html') continue;
    const html = await readFile(path, 'utf8');
    if (fullRoutes.some(route => resolve(path) === resolve('dist', '.' + route, 'index.html')) || changedRoutes.some(route => resolve(path) === resolve('dist', '.' + route, 'index.html'))) {
      assert(/<title>[^<]+<\/title>/.test(html), `Missing title: ${path}`);
      assert(/name="description"\s+content="[^"]+"/.test(html), `Missing description: ${path}`);
    }
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const value = match[1];
      assert(!forbidden.test(value), `Nonproduction URL ${value} in ${path}`);
      if (!value.startsWith('/') || value.startsWith('//')) continue;
      const pathname = decodeURIComponent(value.split(/[?#]/)[0]);
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
  console.log('Static route, metadata, asset and URL checks passed');
}
async function serve() {
  const root = resolve('dist');
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : extname(pathname) ? '' : '/index.html'));
      assert(file.startsWith(root + sep));
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  return { base: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(done => server.close(done)) };
}
async function qa(base, chromium) {
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const report = { mode, target: base, runtime: playwrightVersion, node: process.version, browser: browser.version(), commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), started: new Date().toISOString(), cases: [], failures: [] };
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
        if (!['GET', 'HEAD'].includes(request.method())) { errors.push(`Blocked write ${request.method()} ${request.url()}`); await intercepted.abort(); }
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
        assert.deepEqual(await nav.locator('a').allTextContents(), ['About', 'Our Work', 'Programmes', 'Impact', 'Governance', 'Contact'], 'Unexpected institutional navigation');
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
        report.cases.push({ label, passed: true, scripts }); console.log(`PASS ${label}`);
      } catch (error) { report.failures.push({ label, error: error.message, browserErrors: errors }); console.error(`FAIL ${label}: ${error.message}`); }
      finally { await context.close(); }
    }
    const request = await browser.newContext();
    try {
      for (const link of links) {
        const response = await request.request.get(base + link, { timeout: 30000 });
        if (!response.ok()) report.failures.push({ label: `Internal link ${link}`, error: `HTTP ${response.status()}` });
        if (live && new URL(response.url()).origin !== production) report.failures.push({ label: link, error: 'Redirected off canonical production' });
      }
    } finally { await request.close(); }
  } finally {
    await browser.close();
    report.finished = new Date().toISOString();
    await mkdir('output/release-qa', { recursive: true });
    await writeFile(`output/release-qa/${live ? 'production' : 'local'}.json`, JSON.stringify(report, null, 2));
  }
  assert.equal(report.failures.length, 0, `${report.failures.length} QA checks failed; inspect output/release-qa/${live ? 'production' : 'local'}.json`);
  console.log(`QA passed: ${report.cases.length} route/viewport/motion cases; ${links.size} internal destinations checked`);
}
let local;
try {
  checkTarget();
  const { chromium } = await runtime();
  if (!live) {
    execFileSync(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build'], { stdio: 'inherit' });
    await staticChecks(); local = await serve();
  }
  await qa(live ? production : local.base, chromium);
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { if (local) await local.close(); }
