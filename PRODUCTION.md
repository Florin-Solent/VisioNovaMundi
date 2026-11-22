# Production manifest

Cloudflare Pages is VNM's sole production and preview platform. GitHub `master` is deployed to the Cloudflare Pages project `visionovamundi`, serving `https://www.visionovamundi.com/`. The VNM Vercel project was permanently deleted on 10 October 2026 after explicit founder authorization; it is not a supported host or fallback.

The founder accepted the bounded residual risk for `http-cache-semantics@4.2.0` for this static-site release. GHSA-ch52-4w7c-c8xp remains OPEN and must not be described as resolved.

## Production release — 22 November 2026 (PR #20, VNM 2.0)

Homepage rebuilt in the site's light glass style with a Three.js Earth (`src/scripts/home-world.ts`), the original scroll window (statement lines rising as it opens), a "shared horizon" section with moving sectors and a contact panel. Glass cards, glow gradients, original buttons and scroll reveals restored site-wide. The Our Work page was removed: its framework introduction moved to About, navigation is About · Projects · Governance · Contact, and `/work` and `/impact` redirect to `/about/` (308). A wording review was applied across all pages; Circular Justice is described as CIC research (founder confirmed). No dependency or lockfile changes.

| Item | Evidence |
| --- | --- |
| Approval | Founder asked for a wording check and approved deployment in chat on 22 November 2026 at 00:53 GMT, after reviewing the branch preview through several iterations. |
| Approved candidate | `994bdabd` (PR #20 head, branch `vnm-2-cinematic`) |
| GitHub production merge | `34b8fd92a47566d1029fee3f9409051868cd7a70`, merged 2026-11-22 01:33:42 UTC (merge commit). |
| Cloudflare Pages deployment | `60fd4a56-f88e-4499-8810-11f814984731`, status `success`, source `34b8fd9`. |
| Pre-merge checks | Local `npm run release:check` (FULL): 156 cases, 68 internal destinations passed; FAST smoke on `/circular-justice/` after its final wording change passed. GitHub `release:check` on the PR head passed (workflow run 44970880685). |
| Post-merge checks | GitHub `release:check` on `master` passed (workflow run 44972033050). Cloudflare Pages check succeeded. |
| Live verification | Direct HTTPS checks: core pages 200, font and Earth textures 200, `/work/` and `/impact/` 308 to `/about/`, no remaining links to `/work/`. `npm run verify:production` with the Cloudflare Web Analytics exception: **156/156 cases passed**, 68 internal destinations; 156 beacons answered locally, none forwarded. |

## Production release — 21 November 2026 (PR #18)

Site refresh: new homepage with the project evidence ladder, site-wide design update (self-hosted Atkinson Hyperlegible Next, ink/teal tokens), and project statuses corrected after founder review. Unity House is shown as research and development (the 2026 six-session pilot did not proceed), and ADR Nord-Vest contact is shown as exploratory correspondence. No dependency or lockfile changes.

| Item | Evidence |
| --- | --- |
| Approval | Founder approved the merge explicitly in chat on 21 November 2026 at 22:01 GMT, after reviewing the Cloudflare branch preview. |
| Approved candidate | `dbadec930a22321a05078619c0809650320e7821` (PR #18 head, branch `site-refresh-2026-11`) |
| GitHub production merge | `7d1328f7b456da6eeacb7a14edbce0dd6d58c43f`, merged 2026-11-21 22:02:11 UTC (merge commit). |
| Cloudflare Pages deployment | `809e7cb0-ca4c-41fd-9aaa-056fe1a174dd`, status `success`, source `7d1328f`; [deployment](https://809e7cb0.visionovamundi.pages.dev/) |
| Pre-merge checks | Local `npm run release:check` (FULL): 162 cases and 69 internal destinations passed. GitHub `release:check` on the PR head passed (workflow run 44951998987). Cloudflare preview deployed successfully. |
| Post-merge checks | GitHub `release:check` on `master` passed (workflow run 44954610424). Cloudflare Pages check succeeded. |

### Live verification — 21 November 2026

Direct HTTPS checks after deployment: `/`, `/unity-house/`, `/timeline/`, `/about/` and `/projects/` returned 200; the self-hosted font loaded; `/impact/` redirected permanently to `/work/`; the apex redirected to `https://www.visionovamundi.com/`. The homepage showed the evidence ladder and Tree of Life panel, and Unity House showed "Research and development" with no grant figures or council name.

The first `npm run verify:production` run reported 162 failures. Every one had the same cause: Cloudflare Web Analytics, enabled on the production zone, injects a beacon that POSTs to `/cdn-cgi/rum`, and browser QA blocks all write requests. Each case had already passed its structural, navigation, footer, overflow, motion and scene checks before the final browser-error assertion. The beacon is not part of the site build and does not appear on `pages.dev` previews.

The founder decided on 21 November 2026 to keep Web Analytics enabled and to add a narrowly scoped QA exception for that beacon only (see [docs/release-qa.md](docs/release-qa.md)). The exception was added in PR #19; with it, production verification of this release passed 162/162 cases on 21 November 2026.

## Production release verified — 10 October 2026

| Item | Verified evidence |
| --- | --- |
| Approved candidate | `c15140a609b7e456e7b9b9ef7de09edb3b70cdf6` (PR #13) |
| GitHub production merge | `f8488d88a6d196111eba3fd932b7911c17b63f2a`; GitHub `master` points to this merge. Its tree matches the approved candidate tree. |
| Cloudflare Pages deployment | `ff861b45-062b-48ee-966d-b1cd55ab6b72`, status `success`, source `f8488d88a6d196111eba3fd932b7911c17b63f2a`; [deployment](https://ff861b45.visionovamundi.pages.dev/) |
| Build | Node.js 22.23.1, npm 10.9.2, `npm clean-install --progress=false`, `npm run build`, output `dist`; 27 routes generated and uploaded. |
| GitHub checks | Cloudflare Pages check succeeded (run 114305043388); `release:check` succeeded (workflow run 38083458599). |
| Dependency/security scope | No changes beyond the approved integrated candidate. The accepted `http-cache-semantics` advisory remains OPEN. |

## Live website verification — 10 October 2026

The public website was checked with validated HTTPS/TLS. The homepage returned HTTP 200 with Cloudflare response headers and HSTS. All 27 published routes returned HTTP 200; the About, Tree of Life, Projects, Services and project pages were reachable, and sampled CSS/JavaScript assets loaded successfully.

The About page's MECC disclosure opened and closed with mouse and keyboard. Its `aria-expanded` state updated, and collapsed details were absent from the accessibility tree. The card showed the approved training limits and all four intended project applications. Desktop and mobile About layouts were checked at 1440px and 390px widths. The mobile navigation opened by keyboard, exposed its links and visible focus, and closed with Escape. Reduced-motion preference disabled the card transition. No horizontal overflow was found.

The Services Unity House and Clandestinus project Three.js scenes rendered at mobile width without browser console errors. Desktop navigation and About layout were also checked. The routes `/impact/` → `/work/` and `/programmes/` → `/projects/` redirected as expected, preserving query strings; apex requests redirected to `www`, and HTTP redirected to HTTPS. The site also responded successfully at `cf-test.visionovamundi.com`.

No production issue was observed in these checks. They describe the tested live state and do not guarantee future availability.

## Cloudflare Pages production configuration — verified 10 October 2026

| Setting | Verified state |
| --- | --- |
| Project and repository | Pages project `visionovamundi`; repository `Florin-Solent/VisioNovaMundi`; production branch `master`. |
| Build | `npm run build`; output directory `dist`; root directory blank; build system version 3; Node.js 22.23.1 and npm 10.9.2 observed in the successful deployment. |
| Production deployment | Source `f8488d88a6d196111eba3fd932b7911c17b63f2a`; deployment `ff861b45-062b-48ee-966d-b1cd55ab6b72`; successful. The Pages dashboard listed `www.visionovamundi.com`, `cf-test.visionovamundi.com` and the Pages hostname. |
| Variables and bindings | No project environment variables or bindings were configured in the reviewed dashboard. |

## Vercel retirement completed — verified 10 October 2026

The exact VNM project, `vnm-uhc-fallback-20260815` (`prj_N3UBfjQ80G3u6Qj1g1GymAnsYFkj`), was permanently deleted after the founder's explicit authorization. Vercel redirected to its project list with `projectDeleted=vnm-uhc-fallback-20260815`; a subsequent read-only project lookup by the exact ID returned HTTP 404 `not_found`. The Vercel account-level GitHub integration was left unchanged.

Before deletion, the account contained 39 VNM project deployments, all in READY state when inventoried. The newest record was created before the GitHub merge. No Vercel deployment was created after the 20:21:56 UTC merge. Their IDs, timestamps, branches, source commits and URLs are preserved in [docs/vercel-retirement-record.md](docs/vercel-retirement-record.md), backed by the pre-deletion commit bundle described there.

The Cloudflare deployment above serves the public site independently; no public site route depends on Vercel. Immediately after Vercel deletion, `https://www.visionovamundi.com/` and `/about/` both returned HTTP 200 over validated HTTPS with `Server: cloudflare` and HSTS. No Vercel rollback remains available.

Before deletion, project-level integrations and Deploy Hooks were absent, and no project environment variables were present. The Vercel account-wide webhook inventory was not independently available through the read API (permission denied); account-level integration settings were not changed. No Vercel-only secret, environment variable or dependency was identified for preserving the Cloudflare site.

## Remaining open security item

GHSA-ch52-4w7c-c8xp for `http-cache-semantics@4.2.0` remains OPEN under the founder's recorded, release-specific risk acceptance. No visitor-facing shared-cache implementation was identified in the static site. Its package-level/build-time exposure remains part of the documented residual risk; acceptance does not close or resolve the advisory.

## Historical Vercel automatic-deployment proposal — superseded before disconnection

An earlier local proposal added a root `vercel.json` setting to suppress Vercel Git deployments while retaining the project. That proposal is superseded by the decision to retire Vercel. At the time of this proposal, Vercel was still Git-connected. The proposal was superseded by the later founder-approved disconnection; the current state is recorded above.

At the time of the proposal, the config had not been pushed. Its first-event behavior was uncertain, which is why publishing was gated. This was the pre-disconnection release gate. Git disconnection was subsequently confirmed before the authorized merge; this sentence is retained only as historical context.

## Historical deployment architecture and release records

| Field | Value |
| --- | --- |
| Canonical URL | https://www.visionovamundi.com/ |
| Framework / build | Astro |
| Source and release control | https://github.com/Florin-Solent/VisioNovaMundi.git |
| Intended production host | Cloudflare Pages project `visionovamundi`; production branch `master` |
| Production branch | `master` |
| Homepage merge commit | `bcfe4d1c58961f05cf9e5831edef8e856c05ae52` — PR #7 |
| Project visuals merge commit | `e84d090946124003382a2ac86846e2ddf12b5d47` — PR #8 |
| Latest release-branch preview | Cloudflare Pages deployment `a2d6cf49-9b84-4103-b78c-077ffc669da2`; https://a2d6cf49.visionovamundi.pages.dev/; GitHub-triggered from `9eae7d1` |
| Current live host for `www` | Cloudflare Pages project `visionovamundi` |
| Vercel project (status at this historical release record) | `vnm-uhc-fallback-20260815`; not an approved fallback. Current Git-disconnection and deletion status is recorded at the top of this manifest. |
| Historical Vercel READY deployment recorded in 9 Oct audit | `dpl_GjZA6yUZfk72TdTm1hh8wNLFZ2vg`, source `master` commit `a8c208401929709fccc70d758be404565edd8b56` (Circular Justice PR #10); https://vnm-uhc-fallback-20260815-9pbmfvaq3.vercel.app/ |
| Vercel historical rollback reference (5 Oct record) | GitHub deployment `6847843880`, success, source commit `411dfa2e3d57b5461590de36418435a59119eba8`; https://vnm-uhc-fallback-20260815-6hanr4fco.vercel.app/ |
| Cloudflare Pages production deployment (5 Oct record) | Success, project visuals source commit `e84d090946124003382a2ac86846e2ddf12b5d47`; deployment `d4d5796a-faeb-4771-930b-c6a953e81435` |
| GitHub release QA | Homepage and project visual release checks succeeded; project visual release QA passed before merge |
| Legacy URL | https://visio-nova-mundi.floryn-outsider.chatgpt.site/ |
| Legacy status | NON-PRODUCTION / LEGACY; known version 44 |

The homepage manifesto and project portfolio visual system are live. The Cloudflare production build generated 27 pages. The project portfolio contains 13 vertical project rows, with dedicated pages reusing the approved visuals. Responsive and reduced-motion QA passed, with no browser errors or horizontal overflow. The live `www` routes returned 200, assets loaded, and the legacy redirects `/impact/` → `/work/` and `/programmes/` → `/projects/` returned permanent redirects while preserving query strings.

## Previously recorded DNS and domain state

| Hostname | Cloudflare DNS record | Proxy | Observed public response |
| --- | --- | --- | --- |
| `www.visionovamundi.com` | CNAME to `visionovamundi.pages.dev` | Proxied; TTL Auto | Pages custom domain Active with SSL enabled; HTTPS 200; `Server: cloudflare`; TLS validation succeeded |
| `visionovamundi.com` | Cloudflare redirect-only apex configuration | Proxied; TTL Auto | HTTPS 301 to `https://www.visionovamundi.com/`; apex paths and query strings preserved; TLS validation succeeded |

Cloudflare nameservers observed: `lola.ns.cloudflare.com` and `mark.ns.cloudflare.com`.

`cf-test.visionovamundi.com` was recorded as Active with SSL enabled on 5 October 2026. The DNS observations above are historical and were not re-run in the latest check; the public HTTP/TLS checks from 10 October are recorded separately near the top. At the time of this DNS record, Vercel deletion was still pending; the VNM project was deleted on 10 October as recorded above.

## Historical Vercel project audit — 9 October 2026

The following findings describe the project before its Git connection was disconnected and the project was deleted on 10 October 2026. They do not describe current hosting or deployment behavior.

- In Vercel project `vnm-uhc-fallback-20260815` (`prj_N3UBfjQ80G3u6Qj1g1GymAnsYFkj`), the dedicated **Project Domains** endpoint lists only `vnm-uhc-fallback-20260815.vercel.app`. The custom-domain project associations for `visionovamundi.com` and `www.visionovamundi.com` were removed. No Cloudflare DNS or account-level domain registration changes were made during that operation.
- Vercel's broader project summary still listed the two former custom domains at that time, while the dedicated Project Domains list showed neither attached. The project was later deleted, as recorded above.
- Vercel project configuration reported **Node 22.x**; the latest READY deployment listed above was created before that setting was changed, so this was **not evidence that the existing deployment was rebuilt under Node 22**.
- At the time of this audit, the Vercel GitHub integration was active; PR updates could create preview builds and `master` updates could trigger production builds on both Cloudflare Pages and Vercel. The dual-deployment approval gate applied then and was superseded when the project was disconnected on 10 October.
- The Vercel audit found zero configured project environment variables and zero custom environments. Do not infer parity of build output or redirects solely from a READY status.

**Historical rollback limitation:** Removing the custom-domain associations meant Vercel was not a one-click DNS rollback. The VNM Vercel project was later deleted and is not a supported rollback target. Historically, it did not honor Cloudflare Pages' `public/_redirects`: `/impact/` and `/programmes/` returned 404 on a tested Vercel deployment.

## Historical Vercel release record — 3 October 2026

- PR #3 merged normally at 2026-10-03 18:57:07 UTC; merge/master/source commit: `f0a7068de969caac57668a56e041b6a51c1f0065`.
- Approved feature head: `669543a774a2e2d02a06a13a4cf513b312bbb0e4`; required PR checks were green before merge.
- Vercel Git production deployment: `dpl_EXE99rttfjdBdUvLUppXNCdPM3EG`, READY, source `master`, canonical alias `www.visionovamundi.com`.
- Deployment URL: https://vnm-uhc-fallback-20260815-fwkto7w3k.vercel.app/
- Node 22.14.0 `npm run verify:production` passed: 150 route/viewport/motion cases, zero failures, 62 internal destinations; completed 2026-10-03 19:21:03 UTC.
- All 20 requested route health checks returned 200. Desktop 1440x900, tablet 820x900 and mobile 390x844, normal/reduced motion, navigation, keyboard/touch, Escape/focus, assets, overflow and both Three.js scenes passed.
- Additional actual-public-site visual checks covered 16 desktop/mobile views with no site errors. Key institutional page content matched the approved build.
- Post-merge GitHub run `37146121907` logged all 150 cases and 62 destinations as passing, then was cancelled during finalisation at the existing 15-minute job limit. Its final status is cancelled, not green. No workflow/check bypass or timeout change was made.
- For that 3 October release, there were no dependency/lockfile, DNS, hosting architecture, Sites or separate security-task changes. Unrelated Tree of Life work was preserved.
- Merged feature branch retained; branch removal was optional.

**Do not update the legacy Sites environment during normal VNM releases.** Its history remains intact. No hosting or DNS configuration is changed by local QA.
