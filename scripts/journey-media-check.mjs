import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';

export const journeyClipNames = Object.freeze([
  'dubai-23',
  'edinburgh-06',
  'edinburgh-10',
  'istanbul-16',
  'morocco-garden',
  'morocco-minaret',
  'richmond-grassland',
  'richmond-pond',
]);

const expectedYears = Array.from({ length: 17 }, (_, index) => String(2010 + index));
const expectedSources = new Set(journeyClipNames.flatMap(name => [
  `/media/journey/cinematic/${name}.mp4`,
  `/media/journey/cinematic/${name}.webm`,
]));
const blockedPublicWording = [
  /private preview/i,
  /pending approval/i,
  /media permissions pending/i,
  /private media approval/i,
  /internal review materials/i,
];
const containers = new Set(['moov', 'trak', 'mdia']);
const playwrightVersion = '1.64.0-alpha-1790635538000';

function mp4HandlerTypes(buffer) {
  const handlers = [];
  const walk = (start, end) => {
    let offset = start;
    while (offset + 8 <= end) {
      const shortSize = buffer.readUInt32BE(offset);
      const type = buffer.toString('ascii', offset + 4, offset + 8);
      let headerSize = 8;
      let boxSize = shortSize;
      if (shortSize === 1) {
        assert(offset + 16 <= end, 'Truncated 64-bit MP4 box header');
        const wideSize = buffer.readBigUInt64BE(offset + 8);
        assert(wideSize <= BigInt(Number.MAX_SAFE_INTEGER), 'MP4 box exceeds safe parser size');
        boxSize = Number(wideSize);
        headerSize = 16;
      } else if (shortSize === 0) {
        boxSize = end - offset;
      }
      assert(boxSize >= headerSize && offset + boxSize <= end, `Invalid MP4 ${type} box bounds`);
      const payloadStart = offset + headerSize;
      const boxEnd = offset + boxSize;
      if (type === 'hdlr') {
        assert(boxSize >= headerSize + 12, 'Truncated MP4 handler box');
        handlers.push(buffer.toString('ascii', payloadStart + 8, payloadStart + 12));
      } else if (containers.has(type)) {
        walk(payloadStart, boxEnd);
      }
      offset = boxEnd;
    }
    assert.equal(offset, end, 'Trailing bytes in MP4 box table');
  };
  walk(0, buffer.length);
  return handlers;
}

function readEbmlVint(buffer, offset, sizeValue) {
  assert(offset < buffer.length, 'Truncated EBML integer');
  const first = buffer[offset];
  let marker = 0x80;
  let width = 1;
  while (width <= 8 && (first & marker) === 0) { marker >>= 1; width += 1; }
  assert(width <= 8 && offset + width <= buffer.length, 'Invalid EBML integer width');
  let value = BigInt(sizeValue ? first & (marker - 1) : first);
  for (let index = 1; index < width; index += 1) value = (value << 8n) | BigInt(buffer[offset + index]);
  const unknownSize = sizeValue && value === ((1n << BigInt(width * 7)) - 1n);
  assert(unknownSize || value <= BigInt(Number.MAX_SAFE_INTEGER), 'EBML element exceeds safe parser size');
  return { value: unknownSize ? null : Number(value), width };
}

function ebmlElements(buffer, start, end) {
  const result = [];
  let offset = start;
  while (offset < end) {
    const id = readEbmlVint(buffer, offset, false);
    const size = readEbmlVint(buffer, offset + id.width, true);
    const payloadStart = offset + id.width + size.width;
    const elementEnd = size.value === null ? end : payloadStart + size.value;
    assert(payloadStart <= end && elementEnd <= end, 'EBML element extends past its parent');
    result.push({ id: Number(id.value), payloadStart, end: elementEnd });
    offset = elementEnd;
    if (size.value === null) break;
  }
  assert.equal(offset, end, 'Trailing bytes in EBML element table');
  return result;
}

function webmTrackTypes(buffer) {
  const segment = ebmlElements(buffer, 0, buffer.length).find(element => element.id === 0x18538067);
  assert(segment, 'WebM Segment is missing');
  const tracks = ebmlElements(buffer, segment.payloadStart, segment.end).find(element => element.id === 0x1654ae6b);
  assert(tracks, 'WebM Tracks element is missing');
  const entries = ebmlElements(buffer, tracks.payloadStart, tracks.end).filter(element => element.id === 0xae);
  return entries.map(entry => {
    const trackType = ebmlElements(buffer, entry.payloadStart, entry.end).find(element => element.id === 0x83);
    assert(trackType, 'WebM TrackEntry has no TrackType');
    const length = trackType.end - trackType.payloadStart;
    assert(length >= 1 && length <= 8, 'Invalid WebM TrackType width');
    let value = 0n;
    for (let offset = trackType.payloadStart; offset < trackType.end; offset += 1) value = (value << 8n) | BigInt(buffer[offset]);
    return Number(value);
  });
}

function digest(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export async function inspectJourneyAssets(root = resolve('dist')) {
  const rootPath = resolve(root);
  const htmlPath = join(rootPath, 'journey', 'index.html');
  assert(existsSync(htmlPath), `Built Journey page not found: ${htmlPath}`);
  const html = await readFile(htmlPath, 'utf8');
  for (const pattern of blockedPublicWording) assert(!pattern.test(html), `Internal approval wording reached the public Journey page: ${pattern}`);

  const videos = [...html.matchAll(/<video\b[^>]*\bdata-clip(?:\s|=|>)[^>]*>/gi)];
  assert.equal(videos.length, journeyClipNames.length, `Expected ${journeyClipNames.length} Journey video elements`);
  const sourceTags = [...html.matchAll(/<source\b[^>]*>/gi)].map(match => match[0]);
  const sources = sourceTags.map(tag => ({
    path: tag.match(/\bdata-src="([^"]+)"/i)?.[1],
    type: tag.match(/\btype="([^"]+)"/i)?.[1],
  })).filter(source => source.path);
  assert.equal(sources.length, 16, 'Expected 16 Journey video sources');
  assert.deepEqual(new Set(sources.map(source => source.path)), expectedSources, 'Journey source list differs from the approved eight-clip inventory');

  const assets = new Map();
  for (const source of sources) {
    const extension = source.path.endsWith('.mp4') ? 'mp4' : source.path.endsWith('.webm') ? 'webm' : null;
    assert(extension, `Unexpected Journey video extension: ${source.path}`);
    assert.equal(source.type, `video/${extension}`, `Incorrect type for ${source.path}`);
    const filePath = resolve(rootPath, `.${source.path}`);
    assert(filePath.startsWith(rootPath + sep), `Journey media escaped build output: ${source.path}`);
    const bytes = await readFile(filePath);
    assert(bytes.length > 1024, `Journey video is empty or truncated: ${source.path}`);
    if (extension === 'mp4') {
      assert.equal(bytes.toString('ascii', 4, 8), 'ftyp', `Invalid MP4 file signature: ${source.path}`);
      const tracks = mp4HandlerTypes(bytes);
      assert(tracks.includes('vide'), `MP4 has no video track: ${source.path}`);
      assert(!tracks.includes('soun'), `MP4 unexpectedly contains an audio track: ${source.path}`);
    } else {
      assert.deepEqual([...bytes.subarray(0, 4)], [0x1a, 0x45, 0xdf, 0xa3], `Invalid WebM file signature: ${source.path}`);
      const tracks = webmTrackTypes(bytes);
      assert(tracks.includes(1), `WebM has no video track: ${source.path}`);
      assert(!tracks.includes(2), `WebM unexpectedly contains an audio track: ${source.path}`);
    }
    assets.set(source.path, { size: bytes.length, sha256: digest(bytes), extension });
  }
  return { htmlPath, sourceCount: sources.length, clipCount: videos.length, assets };
}

function timeAdvanced(before, after) {
  return after > before + 0.08 || (before > 4.5 && after < 0.35);
}

async function verifyPageClips(page, report, viewport, verifyGlobalControls = false) {
  const clips = page.locator('video[data-clip]');
  const button = page.locator('[data-motion-toggle]');
  assert.equal(await clips.count(), journeyClipNames.length, 'Journey page must expose all eight cinematic clips');
  for (let index = 0; index < journeyClipNames.length; index += 1) {
    const video = clips.nth(index);
    await video.scrollIntoViewIfNeeded();
    await page.waitForFunction(i => {
      const current = document.querySelectorAll('video[data-clip]')[i];
      return current?.dataset.loaded === 'true' && current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && current.videoWidth > 0 && !current.paused && !current.error;
    }, index, { timeout: 15000 });
    const before = await video.evaluate(element => element.currentTime);
    await page.waitForFunction(({ index: i, previous }) => {
      const current = document.querySelectorAll('video[data-clip]')[i];
      if (!current || current.paused || current.error) return false;
      return current.currentTime > previous + 0.08
        || (previous > current.duration - 0.35 && current.currentTime < 0.35);
    }, { index, previous: before }, { timeout: 5000 }).catch(async error => {
      const finalState = await video.evaluate(element => ({ time: element.currentTime, paused: element.paused, error: element.error?.message || null, readyState: element.readyState }));
      throw new Error(`${error.message}; ${viewport.width}px clip ${index + 1} timing state: ${JSON.stringify({ before, ...finalState })}`);
    });
    const state = await video.evaluate(element => ({
      source: element.currentSrc,
      readyState: element.readyState,
      width: element.videoWidth,
      height: element.videoHeight,
      duration: element.duration,
      paused: element.paused,
      time: element.currentTime,
      error: element.error?.message || null,
    }));
    assert(state.source.endsWith('.webm') || state.source.endsWith('.mp4'), `No video source selected for clip ${index + 1}`);
    assert(state.width > 0 && state.height > 0, `Clip ${index + 1} produced no decoded frame dimensions at ${viewport.width}px`);
    assert(timeAdvanced(before, state.time), `Clip ${index + 1} playback time did not advance at ${viewport.width}px`);
    assert.equal(state.paused, false, `Clip ${index + 1} is paused while visible at ${viewport.width}px`);
    assert.equal(state.error, null, `Clip ${index + 1} has a media error at ${viewport.width}px`);
    report.playback.push({ viewport: `${viewport.width}x${viewport.height}`, index: index + 1, ...state, advanced: true });

    if (verifyGlobalControls && index === 0) {
      assert.equal((await button.textContent()).trim().toLowerCase(), 'pause clips', 'Autoplay control did not reflect active playback');
      await button.click();
      await page.waitForFunction(i => document.querySelectorAll('video[data-clip]')[i]?.paused === true, index);
      const pausedAt = await video.evaluate(element => element.currentTime);
      await page.waitForTimeout(300);
      const stillAt = await video.evaluate(element => element.currentTime);
      assert(Math.abs(stillAt - pausedAt) < 0.08, 'Pause clips control did not stop playback');
      await button.click();
      await page.waitForFunction(i => {
        const current = document.querySelectorAll('video[data-clip]')[i];
        return current && !current.paused && current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
      }, index);
      await page.waitForTimeout(500);
      assert(timeAdvanced(stillAt, await video.evaluate(element => element.currentTime)), 'Play clips control did not resume playback');
    }
  }
}

async function decodeInBrowser(page, url) {
  return page.evaluate(async sourceUrl => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = sourceUrl;
    document.body.append(video);
    const waitMetadata = new Promise((resolve, reject) => {
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) return resolve();
      video.addEventListener('loadedmetadata', resolve, { once: true });
      video.addEventListener('error', () => reject(new Error(video.error?.message || `media error ${video.error?.code}`)), { once: true });
    });
    let timer;
    try {
      await Promise.race([waitMetadata, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('metadata timeout')), 12000); })]);
      if (!video.videoWidth || !video.videoHeight || !Number.isFinite(video.duration)) throw new Error('metadata did not include decoded dimensions and duration');
      await video.play();
      const frame = new Promise(resolve => {
        if (typeof video.requestVideoFrameCallback === 'function') video.requestVideoFrameCallback(() => resolve(true));
        else setTimeout(() => resolve(false), 150);
      });
      await Promise.race([frame, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('decoded frame timeout')), 8000); })]);
      const before = video.currentTime;
      await new Promise(resolve => setTimeout(resolve, 350));
      const advanced = video.currentTime > before + 0.05 || (before > video.duration - 0.2 && video.currentTime < 0.2);
      if (!advanced) throw new Error('playback time did not advance');
      video.pause();
      const pausedAt = video.currentTime;
      await new Promise(resolve => setTimeout(resolve, 250));
      const remainedPaused = video.paused && Math.abs(video.currentTime - pausedAt) < 0.08;
      await video.play();
      await new Promise(resolve => setTimeout(resolve, 350));
      const resumed = video.currentTime > pausedAt + 0.05 || (pausedAt > video.duration - 0.2 && video.currentTime < 0.2);
      if (!remainedPaused || !resumed) throw new Error('pause/resume behavior failed');
      return { width: video.videoWidth, height: video.videoHeight, duration: video.duration, readyState: video.readyState, advanced, remainedPaused, resumed };
    } finally {
      clearTimeout(timer);
      video.pause();
      video.remove();
    }
  }, url);
}

export async function checkJourneyMedia({ base, browser, root = resolve('dist'), requirePagesPreview = false, commit, deploymentId }) {
  const url = new URL(base);
  assert(['http:', 'https:'].includes(url.protocol), 'Journey media test requires HTTP or HTTPS');
  assert.equal(url.pathname, '/', 'Pass the preview origin only, without a route path');
  if (requirePagesPreview) {
    assert(/^[a-z0-9-]+\.visionovamundi\.pages\.dev$/i.test(url.hostname), 'Hosted Journey acceptance must use the non-production Cloudflare Pages preview hostname');
    assert.match(deploymentId || '', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Hosted Journey acceptance must record the full Cloudflare deployment ID');
    assert(url.hostname.startsWith(`${deploymentId.slice(0, 8)}.`), 'Preview hostname does not match the supplied Cloudflare deployment ID');
  }
  const local = await inspectJourneyAssets(root);
  const report = { outcome: 'passed', testedCommit: commit || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), previewDeploymentId: deploymentId || null, target: url.origin, browser: browser.version(), clipCount: local.clipCount, assetCount: local.sourceCount, assets: [], viewports: [], playback: [], reducedMotion: null, networkRecovery: null, errorFallback: null, hostedAcceptance: null };
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference', serviceWorkers: 'block' });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__journeyPlayErrors = [];
    window.__journeyPlayAborts = [];
    window.__journeyErrorEvents = [];
    document.addEventListener('journey:playback-error', event => window.__journeyErrorEvents.push(event.detail));
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      const result = play.apply(this, args);
      result.catch(error => {
        const entry = { source: this.currentSrc, name: error.name || 'PlaybackError' };
        if (entry.name === 'AbortError') window.__journeyPlayAborts.push(entry);
        else window.__journeyPlayErrors.push(entry);
      });
      return result;
    };
  });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    const response = await page.goto(`${url.origin}/journey/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    assert.equal(response?.status(), 200, 'Journey route did not return HTTP 200');
    const pageText = await page.locator('main').innerText();
    for (const pattern of blockedPublicWording) assert(!pattern.test(pageText), `Internal approval wording is visible: ${pattern}`);
    const years = await page.locator('[data-year-select]').evaluateAll(links => links.map(link => link.getAttribute('data-year')));
    assert.deepEqual(years, expectedYears, 'Journey navigation must contain each year from 2010 through 2026');
    assert.equal(await page.locator('video[data-clip]').count(), 8, 'Journey page must expose all eight cinematic clips');

    // Exercise the hosted atlas and timeline, not only their generated markup.
    const atlas = page.locator('[data-journey-atlas]');
    const markers = atlas.locator('[data-atlas-marker]');
    assert.equal(await markers.count(), 84, 'Hosted atlas must expose all 84 place references');
    assert.equal(await atlas.locator('.atlas-story').count(), 34, 'Hosted atlas must expose the 34 reviewed cultural stories');
    const mapSemantics = await atlas.locator('[data-atlas-map]').evaluate(map => ({
      role: map.getAttribute('role'),
      title: document.getElementById(map.getAttribute('aria-labelledby')?.split(' ')[0] || '')?.textContent?.trim(),
      description: document.getElementById(map.getAttribute('aria-labelledby')?.split(' ')[1] || '')?.textContent?.trim(),
    }));
    assert.equal(mapSemantics.role, 'group', 'Hosted atlas map must expose a named group to assistive technology');
    assert(mapSemantics.title && mapSemantics.description, 'Hosted atlas map title and description must be present');
    const accessibleControls = await atlas.evaluate(root => {
      const unlabelledMarker = [...root.querySelectorAll('[data-atlas-marker]')].some(marker => !marker.getAttribute('aria-label')?.trim());
      const unlabelledField = [...root.querySelectorAll('input, select')].some(field => !field.labels?.length && !field.getAttribute('aria-label')?.trim());
      const unlabelledButton = [...root.querySelectorAll('button')].some(button => !button.getAttribute('aria-label')?.trim() && !button.textContent?.trim());
      return { unlabelledMarker, unlabelledField, unlabelledButton };
    });
    assert.deepEqual(accessibleControls, { unlabelledMarker: false, unlabelledField: false, unlabelledButton: false }, 'Hosted atlas controls must have accessible names');

    const palette = await atlas.evaluate(root => {
      const style = getComputedStyle(root);
      const get = name => style.getPropertyValue(name).trim().toLowerCase();
      return {
        ink: get('--atlas-ink'), muted: get('--atlas-muted'), accent: get('--atlas-accent'),
        deep: get('--atlas-deep'), land: get('--atlas-land'), landHot: get('--atlas-land-hot'), line: get('--atlas-line'),
        heading: getComputedStyle(root.querySelector('.atlas-heading h2')).color,
        smallText: getComputedStyle(root.querySelector('.atlas-eyebrow')).color,
        storyLink: getComputedStyle(root.querySelector('.atlas-sources a')).color,
        selectedMeta: getComputedStyle(root.querySelector('.atlas-selected-meta')).color,
      };
    });
    assert.deepEqual(palette, {
      ink: '#112b38', muted: '#3e5563', accent: '#2563eb', deep: '#112b38',
      land: '#c9d8dd', landHot: '#2563eb', line: '#3e5563',
      heading: 'rgb(17, 43, 56)', smallText: 'rgb(17, 43, 56)', storyLink: 'rgb(17, 43, 56)', selectedMeta: 'rgb(17, 43, 56)',
    }, 'Hosted atlas interface must use the established VNM blue palette');
    const filmPalette = await page.locator('[data-film]').evaluate(root => {
      const style = getComputedStyle(root);
      return Object.fromEntries(['--blue', '--teal', '--gold', '--gold-deep', '--forest', '--line', '--mist', '--paper', '--ink', '--muted-ink', '--deep']
        .map(name => [name, style.getPropertyValue(name).trim().toLowerCase()]));
    });
    assert.deepEqual(filmPalette, {
      '--blue': '#2563eb', '--teal': '#2563eb', '--gold': '#2563eb', '--gold-deep': '#3e5563',
      '--forest': '#112b38', '--line': '#c9d8dd', '--mist': '#e3eef0', '--paper': '#f8fafc',
      '--ink': '#112b38', '--muted-ink': '#3e5563', '--deep': '#112b38',
    }, 'Hosted Journey cinematic and timeline tokens must stay within the VNM blue palette');
    const imageAltAudit = await page.locator('main').evaluate(root => [...root.querySelectorAll('img')].filter(image => !image.hasAttribute('alt')).length);
    assert.equal(imageAltAudit, 0, 'Hosted Journey images must expose alt attributes (empty alt is allowed for decorative images)');
    const contrast = await page.evaluate(() => {
      const luminance = (hex) => {
        const values = hex.slice(1).match(/../g).map(pair => parseInt(pair, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
        return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
      };
      const ratio = (foreground, background) => {
        const a = luminance(foreground); const b = luminance(background);
        return Number(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2));
      };
      return { body: ratio('#3e5563', '#e3eef0'), heading: ratio('#112b38', '#e3eef0'), accent: ratio('#2563eb', '#f8fafc'), button: ratio('#f8fafc', '#2563eb') };
    });
    assert(Object.values(contrast).every(value => value >= 4.5), `Hosted atlas core text contrast fell below 4.5:1: ${JSON.stringify(contrast)}`);

    const labelsPresent = await atlas.evaluate(root => [...root.querySelectorAll('input,select')].every(field => field.labels?.length || field.getAttribute('aria-label')));
    assert(labelsPresent, 'Hosted atlas filters must have visible or programmatic labels');
    const yearFilter = atlas.locator('#atlas-year');
    await yearFilter.selectOption('2024');
    await page.waitForFunction(() => document.querySelector('[data-year-select][data-year="2024"]')?.getAttribute('aria-current') === 'true');
    const yearMarkers = await markers.evaluateAll(items => items.filter(marker => !marker.classList.contains('is-filtered-out')).map(marker => marker.getAttribute('data-years') || ''));
    assert(yearMarkers.length > 0 && yearMarkers.every(value => value.split(/\s+/).includes('2024')), 'Hosted atlas year filter must show only 2024 place references');
    const selectedYearPlace = await markers.evaluateAll(items => {
      const marker = items.find(item => !item.classList.contains('is-filtered-out'));
      return marker ? { id: marker.getAttribute('data-atlas-marker'), name: marker.getAttribute('data-name'), country: marker.getAttribute('data-country-code'), continent: marker.getAttribute('data-continent') } : null;
    });
    assert(selectedYearPlace, 'Hosted 2024 filter must return a selectable place');
    assert.match(await page.locator('#yearline-status').innerText(), /2024/, 'Timeline must announce the year selected in the atlas');
    const yearLink = page.locator('[data-year-select][data-year="2024"]');
    await yearLink.scrollIntoViewIfNeeded();
    await yearLink.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#atlas-year')?.value === '2024');

    await atlas.locator('#atlas-year').selectOption('all');
    const citySearch = atlas.locator('#atlas-search');
    await citySearch.fill(selectedYearPlace.name);
    const citySearchState = await markers.evaluateAll((items, name) => ({
      query: document.querySelector('#atlas-search')?.value,
      visibleMatches: items.filter(marker => !marker.classList.contains('is-filtered-out')).map(marker => marker.getAttribute('data-name')),
      requestedName: name,
    }), selectedYearPlace.name);
    assert(citySearchState.visibleMatches.includes(selectedYearPlace.name), `Hosted atlas city search must reveal its matching marker: ${JSON.stringify(citySearchState)}`);
    await citySearch.fill('');
    await atlas.locator('#atlas-country').selectOption(selectedYearPlace.country);
    const countryMarkers = await markers.evaluateAll(items => items.filter(marker => !marker.classList.contains('is-filtered-out')).map(marker => marker.getAttribute('data-country-code')));
    assert(countryMarkers.length > 0 && countryMarkers.every(code => code === selectedYearPlace.country), 'Hosted atlas country filter must show only matching markers');
    await atlas.locator('#atlas-country').selectOption('all');
    await atlas.locator('#atlas-continent').selectOption(selectedYearPlace.continent);
    const regionMarkers = await markers.evaluateAll(items => items.filter(marker => !marker.classList.contains('is-filtered-out')).map(marker => marker.getAttribute('data-continent')));
    assert(regionMarkers.length > 0 && regionMarkers.every(region => region === selectedYearPlace.continent), 'Hosted atlas region filter must show only matching markers');
    await atlas.locator('#atlas-continent').selectOption('all');
    const markerMeta = await markers.evaluateAll(items => items.map(marker => ({
      id: marker.getAttribute('data-atlas-marker'), name: marker.getAttribute('data-name'),
      country: marker.getAttribute('data-country-code'), continent: marker.getAttribute('data-continent'), years: marker.getAttribute('data-years') || '',
      hasCountryOutline: Boolean(document.querySelector(`[data-country="${marker.getAttribute('data-country-code')}"]`)?.classList.contains('is-recorded')),
    })));
    assert(markerMeta.every(item => item.id && item.name && item.country && item.continent && item.hasCountryOutline), 'Every hosted place pin must map to a matching highlighted country outline');
    const target = atlas.locator(`[data-atlas-marker="${selectedYearPlace.id}"]`);
    const targetName = selectedYearPlace.name;
    await target.scrollIntoViewIfNeeded();
    await target.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(name => document.querySelector('[data-atlas-selected-name]')?.textContent?.trim() === name, targetName);
    const map = atlas.locator('[data-atlas-map]');
    const focusedView = await map.getAttribute('viewBox');
    assert.notEqual(focusedView, '0 0 1200 620', 'Selecting a hosted map marker must zoom to the selected place');
    await atlas.locator('[data-atlas-zoom-in]').click();
    await atlas.locator('[data-atlas-reset]').click();
    const resetViewBox = (await map.getAttribute('viewBox')).trim().split(/\s+/).map(Number);
    assert.deepEqual(resetViewBox, [0, 0, 1200, 620], 'Hosted map world-reset control must restore the complete atlas');
    const labelsToggle = atlas.locator('[data-atlas-country-labels]');
    await labelsToggle.focus();
    await page.keyboard.press('Space');
    assert(await labelsToggle.isChecked(), 'Hosted map country-label toggle must be keyboard operable');
    assert(await atlas.evaluate(root => root.classList.contains('show-country-labels')), 'Hosted map country-label toggle must activate country labels');
    await page.keyboard.press('Space');
    assert(!(await labelsToggle.isChecked()), 'Hosted map country-label toggle must be keyboard reversible');

    report.hostedAcceptance = {
      mapMarkers: markerMeta.length, countryOutlinesMatched: markerMeta.filter(item => item.hasCountryOutline).length,
      culturalStories: 34, timelineYears: years.length, atlasYearFilter: true, timelineKeyboardNavigation: true,
      citySearch: true, countryFilter: true, regionFilter: true,
      markerKeyboardSelection: true, zoomAndWorldReset: true, countryLabelsToggle: true,
      palette: 'VNM blue tokens matched', contrastRatios: contrast, accessibleNames: true, imageAltAttributes: true,
    };

    const clips = page.locator('video[data-clip]');
    const button = page.locator('[data-motion-toggle]');
    await verifyPageClips(page, report, { width: 1440, height: 900 }, true);
    assert.deepEqual(await page.evaluate(() => window.__journeyPlayErrors), [], 'A play() promise was rejected during normal Journey playback');
    report.expectedPlaybackAborts = await page.evaluate(() => window.__journeyPlayAborts.length);
    assert.deepEqual(pageErrors, [], `Journey page had uncaught errors: ${pageErrors.join('; ')}`);

    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference', serviceWorkers: 'block' });
    try {
      const mobilePage = await mobileContext.newPage();
      const mobileResponse = await mobilePage.goto(`${url.origin}/journey/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      assert.equal(mobileResponse?.status(), 200, 'Mobile Journey route did not return HTTP 200');
      await verifyPageClips(mobilePage, report, { width: 390, height: 844 });
      assert(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Mobile Journey has horizontal overflow during clip playback');
      const mobileAtlas = mobilePage.locator('[data-journey-atlas]');
      const mobileMarkers = mobileAtlas.locator('[data-atlas-marker]');
      assert.equal(await mobileMarkers.count(), 84, 'Mobile atlas must expose all 84 place references');
      await mobileAtlas.locator('#atlas-year').selectOption('2024');
      const mobileYearPlaces = await mobileMarkers.evaluateAll(items => items
        .filter(marker => !marker.classList.contains('is-filtered-out'))
        .map(marker => ({
          id: marker.getAttribute('data-atlas-marker'),
          name: marker.getAttribute('data-name'),
          years: marker.getAttribute('data-years') || '',
          x: Number(marker.getAttribute('data-x')),
          y: Number(marker.getAttribute('data-y')),
        })));
      assert(mobileYearPlaces.length > 0 && mobileYearPlaces.every(place => place.years.split(/\s+/).includes('2024')), 'Mobile atlas year filter must select the requested year');
      const allMobilePlaces = await mobileMarkers.evaluateAll(items => items.map(marker => ({
        id: marker.getAttribute('data-atlas-marker'),
        x: Number(marker.getAttribute('data-x')),
        y: Number(marker.getAttribute('data-y')),
      })));
      // Prefer a pin with the most room around it, so this touch test measures
      // marker activation rather than a second city pin intercepting the tap.
      const mobileTarget = mobileYearPlaces.map(place => ({
        ...place,
        nearestDistance: Math.min(...allMobilePlaces.filter(other => other.id !== place.id)
          .map(other => Math.hypot(place.x - other.x, place.y - other.y)), Infinity),
      })).sort((a, b) => b.nearestDistance - a.nearestDistance)[0];
      assert(mobileTarget, 'Mobile atlas year filter must provide a selectable place');
      const mobileMarker = mobileAtlas.locator(`[data-atlas-marker="${mobileTarget.id}"]`);
      const mobileName = mobileTarget.name;
      await mobileAtlas.locator('#atlas-year').selectOption('all');
      await mobileMarker.scrollIntoViewIfNeeded();
      await mobileMarker.click();
      await mobilePage.waitForFunction(name => document.querySelector('[data-atlas-selected-name]')?.textContent?.trim() === name, mobileName);
      await mobileAtlas.locator('[data-atlas-reset]').click();
      assert(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Mobile atlas interactions introduced horizontal overflow');
      report.mobileAtlas = { markers: 84, yearFilter: true, markerSelection: true, noHorizontalOverflow: true };
    } finally { await mobileContext.close(); }

    for (const viewport of [{ width: 1440, height: 900 }, { width: 820, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(100);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Journey has horizontal overflow at ${viewport.width}px`);
      report.viewports.push({ ...viewport, noHorizontalOverflow: true });
    }

    for (const name of journeyClipNames) {
      for (const extension of ['webm', 'mp4']) {
        const path = `/media/journey/cinematic/${name}.${extension}`;
        const expected = local.assets.get(path);
        const assetUrl = `${url.origin}${path}`;
        const ranged = await context.request.get(assetUrl, { headers: { Range: 'bytes=0-1023' }, timeout: 30000 });
        assert.equal(ranged.url(), assetUrl, `Unexpected redirect for ${path}`);
        assert([200, 206].includes(ranged.status()), `Unexpected HTTP ${ranged.status()} for ${path}`);
        const contentType = ranged.headers()['content-type']?.split(';')[0].toLowerCase();
        assert.equal(contentType, `video/${extension}`, `Incorrect Content-Type for ${path}`);
        const bytes = await ranged.body();
        if (ranged.status() === 206) {
          assert.equal(bytes.length, 1024, `Range response length is wrong for ${path}`);
          assert.match(ranged.headers()['content-range'] || '', /^bytes 0-1023\//, `Malformed Content-Range for ${path}`);
          const full = await context.request.get(assetUrl, { timeout: 30000 });
          assert.equal(full.status(), 200, `Full media GET failed for ${path}`);
          assert.equal((await full.body()).length, expected.size, `Full Content-Length mismatch for ${path}`);
          assert.equal(digest(await full.body()), expected.sha256, `Hosted media differs from the approved local source: ${path}`);
        } else {
          assert.equal(bytes.length, expected.size, `Full-object response length mismatch for ${path}`);
          assert.equal(Number(ranged.headers()['content-length']), expected.size, `Content-Length mismatch for ${path}`);
          assert.equal(digest(bytes), expected.sha256, `Hosted media differs from the approved local source: ${path}`);
        }
        const signature = extension === 'mp4' ? bytes.toString('ascii', 4, 8) === 'ftyp' : bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
        assert(signature, `Hosted response is not the expected ${extension} media: ${path}`);
        const playable = extension === 'webm' || await page.evaluate(() => {
          const test = document.createElement('video');
          return test.canPlayType('video/mp4') !== '';
        });
        let decoded = { skipped: 'browser lacks a compatible decoder for this format' };
        if (playable) decoded = await decodeInBrowser(page, assetUrl);
        report.assets.push({ path, status: ranged.status(), contentType, contentLength: expected.size, rangeSupported: ranged.status() === 206, sha256MatchesLocal: true, decoded });
      }
    }

    const reduced = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    try {
      const reducedPage = await reduced.newPage();
      await reducedPage.goto(`${url.origin}/journey/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      const reducedClip = reducedPage.locator('video[data-clip]').first();
      await reducedClip.scrollIntoViewIfNeeded();
      await reducedPage.waitForTimeout(250);
      const initial = await reducedPage.evaluate(() => ({
        preference: matchMedia('(prefers-reduced-motion: reduce)').matches,
        states: [...document.querySelectorAll('video[data-clip]')].map(video => ({ paused: video.paused, loaded: video.dataset.loaded === 'true' })),
      }));
      assert.equal(initial.preference, true, 'Reduced-motion context was not active');
      assert(initial.states.every(video => video.paused && !video.loaded), 'Videos auto-loaded or played despite reduced-motion preference');
      report.reducedMotion = { autoplayDisabled: true, userOptInSupported: false };
      const toggle = reducedPage.locator('[data-motion-toggle]');
      await toggle.scrollIntoViewIfNeeded();
      assert.equal((await toggle.textContent()).trim().toLowerCase(), 'play clips');
      await toggle.click();
      await reducedPage.waitForFunction(() => {
        const video = document.querySelector('video[data-clip]');
        return video?.dataset.loaded === 'true' && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !video.paused;
      }, undefined, { timeout: 15000 });
      report.reducedMotion.userOptInSupported = true;
    } finally { await reduced.close(); }

    const networkRecovery = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference', serviceWorkers: 'block' });
    try {
      const networkPage = await networkRecovery.newPage();
      const mediaRequests = [];
      const failedMediaRequests = [];
      let retryInitiated = false;
      await networkPage.route('**/media/journey/cinematic/edinburgh-06.*', async route => {
        const requestUrl = route.request().url();
        mediaRequests.push({ url: requestUrl, phase: retryInitiated ? 'retry' : 'temporary failure' });
        if (retryInitiated) await route.continue();
        else await route.abort('internetdisconnected');
      });
      networkPage.on('requestfailed', request => {
        if (/\/media\/journey\/cinematic\/edinburgh-06\.(?:webm|mp4)$/.test(request.url())) failedMediaRequests.push(request.url());
      });
      const networkResponse = await networkPage.goto(`${url.origin}/journey/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      assert.equal(networkResponse?.status(), 200, 'Journey route failed before media network-retry test');
      const failedVideo = networkPage.locator('video[data-clip]').first();
      await failedVideo.scrollIntoViewIfNeeded();
      await networkPage.waitForFunction(() => {
        const video = document.querySelector('video[data-clip]');
        const figure = video?.closest('figure');
        const status = figure?.querySelector('[data-clip-status]');
        const retry = figure?.querySelector('[data-clip-retry]');
        return video?.dataset.playbackError && status && !status.hidden && retry && !retry.hidden;
      }, undefined, { timeout: 15000 }).catch(async error => {
        const state = await failedVideo.evaluate(video => ({ loaded: video.dataset.loaded, playbackError: video.dataset.playbackError, mediaError: video.error?.code || null, networkState: video.networkState, readyState: video.readyState, currentSrc: video.currentSrc, paused: video.paused, currentTime: video.currentTime, statusHidden: video.closest('figure')?.querySelector('[data-clip-status]')?.hidden, retryHidden: video.closest('figure')?.querySelector('[data-clip-retry]')?.hidden }));
        throw new Error(`${error.message}; network failure diagnostics: ${JSON.stringify({ mediaRequests, failedMediaRequests, state })}`);
      });
      assert(failedMediaRequests.length > 0, 'Temporary network failure did not fail an actual hosted media request');
      const requestsBeforeRetry = mediaRequests.length;
      assert(requestsBeforeRetry > 0, 'No hosted media request was intercepted during the temporary failure');
      retryInitiated = true;
      const retryButton = networkPage.locator('[data-clip-retry]').first();
      await retryButton.scrollIntoViewIfNeeded();
      await retryButton.click();
      await networkPage.waitForFunction(() => {
        const video = document.querySelector('video[data-clip]');
        const status = video?.closest('figure')?.querySelector('[data-clip-status]');
        return video && video.dataset.playbackError === undefined && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
          && video.videoWidth > 0 && !video.paused && video.currentTime > 0.08 && status?.hidden;
      }, undefined, { timeout: 20000 });
      const retryRequests = mediaRequests.slice(requestsBeforeRetry);
      assert(retryRequests.length > 0, 'Individual retry did not request the failed media resource again');
      assert(retryRequests.every(request => request.phase === 'retry'), 'A media request was incorrectly counted as retry traffic before the user clicked retry');
      report.networkRecovery = {
        clip: 'edinburgh-06',
        failedNetworkRequests: failedMediaRequests.length,
        firstAttemptRequests: requestsBeforeRetry,
        retriedNetworkRequests: retryRequests.length,
        retriedUrls: [...new Set(retryRequests.map(request => request.url))],
        playbackRestored: true,
      };
    } finally { await networkRecovery.close(); }

    const firstVideo = clips.first();
    await firstVideo.scrollIntoViewIfNeeded();
    const motionButtonText = (await button.textContent()).trim().toLowerCase();
    if (motionButtonText === 'pause clips') await button.click();
    await firstVideo.evaluate(video => {
      video.__journeyNativePlay = HTMLMediaElement.prototype.play;
      video.play = () => Promise.reject(new DOMException('Simulated blocked playback for release QA', 'NotAllowedError'));
    });
    if ((await button.textContent()).trim().toLowerCase() === 'play clips') await button.click();
    const status = page.locator('[data-clip-status]').first();
    await page.waitForFunction(() => {
      const video = document.querySelector('video[data-clip]');
      const message = video?.closest('figure')?.querySelector('[data-clip-status]');
      return video?.dataset.playbackError === 'NotAllowedError' && message && !message.hidden;
    }, undefined, { timeout: 5000 });
    assert((await status.innerText()).includes('still image remains available'), 'Playback error did not present its accessible still-image fallback');
    assert.equal(await page.locator('[data-clip-retry]').first().isVisible(), true, 'Playback error did not expose an individual retry button');
    await firstVideo.evaluate(video => { video.play = video.__journeyNativePlay; delete video.__journeyNativePlay; });
    await page.locator('[data-clip-retry]').first().click();
    await page.waitForFunction(() => {
      const video = document.querySelector('video[data-clip]');
      const message = video?.closest('figure')?.querySelector('[data-clip-status]');
      return video && !video.paused && video.dataset.playbackError === undefined && message?.hidden;
    }, undefined, { timeout: 10000 });
    const errorEvents = await page.evaluate(() => window.__journeyErrorEvents);
    assert.equal(errorEvents.length, 1, 'Playback failure did not emit one diagnostic event');
    report.errorFallback = { exposed: true, ariaLive: await status.getAttribute('aria-live'), retryRecovered: true, diagnostic: errorEvents[0] };

    const sitePage = await context.newPage();
    const sitePageErrors = [];
    sitePage.on('pageerror', error => sitePageErrors.push(error.message));
    const siteRoutes = ['/', '/about/', '/projects/', '/governance/', '/unity-house/', '/commissioners-partners/', '/contact/', '/journey/'];
    for (const path of siteRoutes) {
      const response = await sitePage.goto(`${url.origin}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      assert.equal(response?.status(), 200, `Hosted website route failed: ${path}`);
      assert((await sitePage.title()).trim().length > 0, `Hosted website route has no page title: ${path}`);
      assert(await sitePage.locator('main').count() === 1, `Hosted website route is missing its main landmark: ${path}`);
      assert((await sitePage.locator('main').innerText()).trim().length > 60, `Hosted website route has no visible main content: ${path}`);
    }
    await sitePage.setViewportSize({ width: 390, height: 844 });
    await sitePage.goto(`${url.origin}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const mobileMenu = sitePage.locator('[data-mobile-nav-toggle]');
    assert.equal(await mobileMenu.getAttribute('aria-expanded'), 'false', 'Mobile navigation must start collapsed');
    await mobileMenu.focus();
    await sitePage.keyboard.press('Enter');
    assert.equal(await mobileMenu.getAttribute('aria-expanded'), 'true', 'Mobile navigation must open from the keyboard');
    await sitePage.locator('[data-site-nav] a[href="/about/"]').click();
    assert(sitePage.url().endsWith('/about/'), 'Mobile navigation must reach the About page');
    assert.deepEqual(sitePageErrors, [], `Hosted institutional routes had uncaught errors: ${sitePageErrors.join('; ')}`);
    report.hostedAcceptance.siteRoutes = siteRoutes;
    report.hostedAcceptance.mobileNavigation = true;
  } finally {
    await context.close();
  }
  return report;
}

async function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const candidates = [];
  try { candidates.push(require.resolve('playwright')); } catch {}
  const cacheCommand = process.platform === 'win32'
    ? ['cmd.exe', ['/d', '/s', '/c', 'npm config get cache']]
    : ['npm', ['config', 'get', 'cache']];
  const cache = join(execFileSync(cacheCommand[0], cacheCommand[1], { encoding: 'utf8' }).trim(), '_npx');
  if (existsSync(cache)) for (const folder of await import('node:fs/promises').then(fs => fs.readdir(cache))) candidates.push(join(cache, folder, 'node_modules', 'playwright', 'index.js'));
  for (const candidate of candidates) {
    try {
      const pkg = JSON.parse(await readFile(join(candidate, '..', 'package.json'), 'utf8'));
      if (pkg.version === playwrightVersion) return require(candidate);
    } catch {}
  }
  throw new Error(`Missing pinned Playwright ${playwrightVersion}; run the documented transient Playwright setup first.`);
}

async function main() {
  const args = process.argv.slice(2);
  const values = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    assert(['--url', '--browser', '--deployment-id', '--commit'].includes(flag), `Unsupported Journey media-check argument: ${flag}`);
    assert(args[index + 1] && !args[index + 1].startsWith('--'), `Missing value for ${flag}`);
    values.set(flag, args[++index]);
  }
  const url = values.get('--url') || process.env.VNM_JOURNEY_PREVIEW;
  assert(url, 'Provide --url <Cloudflare pages.dev preview origin> or VNM_JOURNEY_PREVIEW');
  const browserChoice = values.get('--browser') || 'edge';
  assert(['edge', 'chromium', 'both'].includes(browserChoice), 'Choose --browser edge, chromium, or both');
  const deploymentId = values.get('--deployment-id');
  const commit = values.get('--commit') || process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const { chromium } = await loadPlaywright();
  const browsers = browserChoice === 'both' ? ['edge', 'chromium'] : [browserChoice];
  await mkdir('output/release-qa', { recursive: true });
  for (const name of browsers) {
    const browser = await chromium.launch({ ...(name === 'edge' ? { channel: 'msedge' } : {}), headless: true });
    const reportPath = resolve('output/release-qa', `journey-hosted-${name}.json`);
    let report;
    try {
      report = await checkJourneyMedia({ base: url, browser, root: resolve('dist'), requirePagesPreview: true, commit, deploymentId });
    } catch (error) {
      report = { outcome: 'failed', testedCommit: commit, previewDeploymentId: deploymentId || null, target: new URL(url).origin, browser: browser.version(), error: error.message };
      await writeFile(reportPath, JSON.stringify(report, null, 2));
      throw error;
    } finally { await browser.close(); }
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    const summary = `### Hosted Journey media check: ${name}\n\n- Outcome: ${report.outcome}\n- Tested commit: \`${report.testedCommit}\`\n- Cloudflare deployment: \`${report.previewDeploymentId}\`\n- Preview: ${report.target}\n- Page playback: ${report.playback.length}/${journeyClipNames.length * 2} clip/viewport runs\n- Media files decoded: ${report.assets.filter(asset => asset.decoded && !asset.decoded.skipped).length}/16\n- Network failure recovery: ${report.networkRecovery ? 'passed' : 'missing'}\n\n`;
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
    console.log(JSON.stringify(report, null, 2));
  }
}

if (process.argv[1]?.endsWith('journey-media-check.mjs')) {
  await main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
}
