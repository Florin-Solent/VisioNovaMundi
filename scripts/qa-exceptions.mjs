import assert from 'node:assert/strict';
import { production } from './check-target.mjs';

// Cloudflare Web Analytics is enabled on the production zone. On www.visionovamundi.com it injects a beacon
// that POSTs page-view data to /cdn-cgi/rum. Browser QA blocks every write request, so without this exception
// each production case fails on Cloudflare's beacon rather than on anything in the site.
//
// The exception is deliberately narrow: production verification only, POST only, the production origin only,
// and the exact /cdn-cgi/rum path only. Matching requests are answered locally with 204 and never forwarded,
// so QA visits are not counted as traffic. All other writes, console errors, uncaught exceptions, failed
// first-party resources and HTTP errors still fail QA.
export function isCloudflareAnalyticsBeacon(method, url, liveRun) {
  if (!liveRun || method !== 'POST') return false;
  let parsed;
  try { parsed = new URL(url); } catch { return false; }
  return parsed.origin === production && parsed.pathname === '/cdn-cgi/rum';
}

export function selfTestQaExceptions() {
  const rum = `${production}/cdn-cgi/rum?`;
  const cases = [
    [['POST', rum, true], true],
    [['POST', `${production}/cdn-cgi/rum`, true], true],
    [['POST', rum, false], false, 'local QA never exempts the beacon'],
    [['GET', rum, true], false, 'only POST is exempt'],
    [['PUT', rum, true], false, 'other write methods stay blocked'],
    [['POST', `${production}/cdn-cgi/rum/extra`, true], false, 'exact path only'],
    [['POST', `${production}/cdn-cgi/trace`, true], false, 'other Cloudflare endpoints stay blocked'],
    [['POST', `${production}/contact/`, true], false, 'site writes stay blocked'],
    [['POST', 'https://visionovamundi.com/cdn-cgi/rum', true], false, 'apex origin is not exempt'],
    [['POST', 'http://www.visionovamundi.com/cdn-cgi/rum', true], false, 'plain HTTP is not exempt'],
    [['POST', 'https://cloudflareinsights.com/cdn-cgi/rum', true], false, 'third-party origins stay blocked'],
    [['POST', 'https://www.visionovamundi.com.evil.example/cdn-cgi/rum', true], false, 'look-alike hosts stay blocked'],
    [['POST', 'not a url', true], false, 'malformed URLs stay blocked'],
  ];
  for (const [args, expected, why] of cases) assert.equal(isCloudflareAnalyticsBeacon(...args), expected, why ?? `${args.join(' ')} should be exempt`);
  console.log(`QA exception examples passed: ${cases.length}`);
}

if (process.argv[1]?.endsWith('qa-exceptions.mjs') && process.argv.includes('--self-test')) selfTestQaExceptions();
