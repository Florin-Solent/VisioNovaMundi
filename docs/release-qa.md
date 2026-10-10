# Release QA

Read ../DEPLOYMENT_POLICY.md and ../PRODUCTION.md first. These commands build and test only; none publishes anything.

## QA lanes

GitHub keeps one protected status context: **`release:check`**. The workflow classifies each change and completes the selected lane before that check succeeds.

- **DOCS** checks the repository target and validates changed documentation files for readable, non-empty text without NUL bytes. It does not install project dependencies or a browser.
- **FAST** is for up to three isolated static `.astro` page edits. It verifies the required built routes and changed routes, their title/description metadata, generated internal destinations and first-party assets, and staging/local URL leaks across generated HTML. It then runs desktop and mobile browser smoke checks on `/`, `/work/`, `/programmes/`, `/governance/`, `/contact/`, and every changed route. Reduced motion is checked on the homepage and changed routes. Typical suite size is 12 cases before changed routes.
- **FULL** runs every configured route at three viewports with normal and reduced motion, plus navigation and focus checks, internal destination checks, and Three.js/WebGL behavior checks. The current 27-route set produces 162 cases.

The classifier fails closed to FULL when a path is unknown, route mapping is uncertain, runtime behavior changes, or more than three pages are touched. Shared layouts/components/styles/data, navigation, JavaScript/TypeScript, build/deployment configuration, scripts, tests, dependencies, Markdown pages, and workflow changes require FULL. An isolated Astro page is FAST only when its inline scripts, imports, event handlers, and hydration directives are unchanged from the PR base.

The PR label **`qa:full`** and **Run workflow** manual dispatch can only escalate QA to FULL. Scheduled FULL regressions run Monday, Wednesday, and Friday at 05:17 UTC. Pushes to `master` run FAST build/integrity and critical-route smoke checks; risky changes must pass the PR gate before merge, so master does not repeat the full 162-case suite automatically. The schedule and manual dispatch retain a full regression path.

## Local commands

```sh
npm run check:target
npm run release:classify:test
npm run release:smoke
npm run release:full
npm run release:check
```

`release:smoke` explicitly runs FAST; `release:full` explicitly runs the complete suite. `release:check` defaults to FULL locally because it has no trusted pull request diff metadata. In GitHub Actions, the classifier selects DOCS, FAST, or FULL automatically. For changed-route local testing, set `VNM_CHANGED_ROUTES` to a JSON array of route paths. All modes use the fixed production target guard; production verification cannot be redirected to an arbitrary URL.

Reports are written to `output/release-qa/local.json` and `output/release-qa/production.json`. Browser requests other than GET/HEAD are blocked and fail the run; forms are not submitted and no publishing API is called.

## Browser runtime and timing

QA uses the existing external Playwright version **1.64.0-alpha-1790635538000** without changing package.json or the lockfile. On a clean machine, provision the transient tool and Chromium with:

```sh
npm exec --yes --package=playwright@1.64.0-alpha-1790635538000 -- playwright install chromium
```

The prior CI timing record for 150 cases was about 3 seconds in `npm ci`, 31 seconds provisioning Playwright/Chromium and system packages, under 2 seconds building, and 11 minutes 25 seconds in browser QA. The 10 October 2026 local 162-case run took 17 minutes 56 seconds; browser execution is the dominant cost, while HTTP/static checks are inexpensive and run as part of the build/check process.

In the 10 October 2026 local run, Node **22.14.0 ARM64** with Chromium **155.0.8059.12** passed FULL in **17m56s** (**162 cases, zero failures, 78 internal destinations**) on Windows. A previous local record on Node 22.14.0 passed FAST in 2m52s (14 cases, `/contact/` changed route, 27 internal destinations) and FULL in 20m06s (150 cases, zero failures, 62 internal destinations). Both full runs completed within the retained 25-minute timeout.

Browser-binary caching was considered and not added. Playwright advises against browser caching in CI because cache restore time can be comparable to downloading, while OS browser dependencies still need installation. This repository's observed cold provisioning is about 31 seconds, a small share of the run, so caching adds complexity without a meaningful gain. [Playwright CI guidance](https://playwright.dev/docs/ci) · [Browser management](https://playwright.dev/docs/browsers).

Use Node >=22.12 and <23, as declared by the project. The reused Playwright QA runtime is a prerelease; moving it to a stable, locked development dependency is a separate dependency change requiring approval.

## Coverage and limits

The FAST smoke checks include HTTP success, page title/description, one H1, primary navigation, mobile menu, keyboard Enter/Escape/focus return, horizontal overflow, console errors, first-party resource settlement, changed-page assets, internal destinations, and obvious staging/local URLs. No page forms are submitted. Three.js/WebGL checks run in FULL mode; changed pages that affect runtime behavior escalate to FULL.

Headless Chromium uses software WebGL for repeatable draw checks. Emulated touch/mobile and reduced motion are smoke checks, not physical-device, GPU, visual-design, accessibility-audit, or performance certification. Input delivery does not prove subjective scene usability. Third-party request failures are not treated as first-party failures; console errors fail conservatively. Static URL checks inspect generated HTML href/src attributes and do not audit arbitrary strings in bundled code.

Normal page publishing is independent of hosting migration. Cloudflare/Vercel infrastructure work is a separate project and is never required just to update an ordinary page.

The old `scripts/prepare-sites.mjs` is retained only as legacy history and is no longer part of `npm run build`. Do not run it as a standard VNM release step. No Sites project or version is changed by local builds.
