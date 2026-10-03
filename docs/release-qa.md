# Release QA

Read ../DEPLOYMENT_POLICY.md and ../PRODUCTION.md first. None of these commands publishes anything.

## Commands

```sh
npm run build
npm run check:target
npm run release:check
npm run verify:production
```

`release:check` checks the Git/Vercel target, runs the Astro production build, checks generated routes/assets/URLs/metadata, starts a temporary static localhost server, and runs browser QA. It closes the server/browser and exits nonzero on failure. `verify:production` skips the build and tests only https://www.visionovamundi.com/; its target cannot be overridden. Browser requests other than GET/HEAD are blocked and cause failure. No forms are submitted and no publishing API is called.

Reports: `output/release-qa/local.json` and `output/release-qa/production.json`. Each successful run records 150 fresh-context cases: 25 institutional and retained venture routes × desktop 1440×900/tablet 820×900/mobile 390×844 × normal/reduced motion. Internal destinations discovered on these pages are checked with GET requests.

Run commands sequentially. Do not rebuild or modify dist while a local release check is serving it. Run heavy WebGL suites sequentially to avoid software GPU contention.

Coverage includes HTTP success, page/console errors, first-party resource failures, overflow, title/description, raw link/asset attributes without staging/local URLs, six-link institutional navigation, brand-to-home keyboard navigation, mobile touch toggling, keyboard Enter/Escape/focus return, and the Satul external Clandestinus CTA. On Services/Clandestinus it checks loaded scene JavaScript, nonzero canvas size, actual WebGL draw calls, animation versus reduced-motion frame behaviour, delivered pointer/touch input, and drag release. Reduced-motion content remains visible. No pixel-perfect assertions are used.

## External browser runtime (no repository dependency changes)

This repository had no Playwright dependency. QA reuses the existing external Playwright version **1.64.0-alpha-1790635538000**. The runner accepts only this exact version, resolved from the repository, `VNM_PLAYWRIGHT_MODULE` (absolute path to Playwright's index.js), or npm's transient `_npx` cache. Missing tooling fails closed with an actionable message.

On a clean machine provision the transient tool and browser, without changing package.json/package-lock.json:

```sh
npm exec --yes --package=playwright@1.64.0-alpha-1790635538000 -- playwright install chromium
```

Use Node >=22.12 and <23 as declared by this project. The current reused QA runtime is a prerelease; moving it to a stable, locked development dependency is a separate dependency change requiring approval. Browser installation is a tool-cache download, not a permanent project dependency.

## Verified checkpoint

On 2026-10-02, the local release check passed under Node **22.14.0** with Chromium **155.0.8059.12**: Astro built 24 pages, all 24 route/viewport/motion cases passed, and 40 internal destinations returned successfully. Dependencies and the lockfile were unchanged. The JSON report is a local ignored artifact under output/release-qa/. This verification did not publish or deploy anything.

## Limits

Headless Chromium uses software WebGL to make draw checks repeatable. Emulated touch/mobile and reduced motion are smoke checks, not physical-device, GPU, visual-design, accessibility-audit or performance certification. Input delivery does not prove subjective scene usability. Metadata and a single main heading are checked on the 25 QA routes, not every legacy printable page. Static URL checks inspect href/src attributes; they do not audit arbitrary strings in bundled code. Console errors fail conservatively even if an external script emits them. Third-party request failures are not treated as first-party failures.

Target safeguards do not stop a person running a separate deploy CLI. Explicit approval still governs production-triggering Git pushes and deployment. The ignored Vercel link may be absent on a clean clone; verify project/team IDs from PRODUCTION.md before any approved release.

The old `scripts/prepare-sites.mjs` is retained only as legacy history and is no longer part of `npm run build`. Do not run it as a standard VNM release step. No Sites project or version is changed by local builds.
