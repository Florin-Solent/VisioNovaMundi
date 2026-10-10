# Production manifest

Cloudflare Pages is the sole supported production and preview platform for VNM. Read-only checks on 10 October 2026 confirm that Vercel project `vnm-uhc-fallback-20260815` remains Git-connected; permanent deletion has not been authorized or performed. Do not push while that connection remains active. The founder accepted the documented `http-cache-semantics` residual risk for this release while leaving GHSA-ch52-4w7c-c8xp OPEN. Production release authorization has not been granted.

On 10 October 2026, a read-only dashboard review confirmed the Pages project remains connected to `Florin-Solent/VisioNovaMundi`, uses `master` with automatic deployments enabled, and is configured for `npm run build` with `dist` output. The project lists the production and preview deployments below; public requests to production, key routes, redirects, and existing previews also succeeded over HTTPS. This verification did not change dashboard settings, DNS or deployments.

## Cloudflare Pages configuration verified 10 October 2026

| Platform | Verified state |
| --- | --- |
| Cloudflare Pages | Project `visionovamundi`; connected repository `Florin-Solent/VisioNovaMundi`; production branch `master`; automatic production deployments enabled; build command `npm run build`; output directory `dist`; root directory blank; build system version 3. No project environment variables or bindings are configured. |
| Cloudflare Pages production | Current production source is `master` at `7da90697cc7ca9616e3653c81de2a34b02516f7e`; the dashboard lists deployment URL `https://c10c87bf.visionovamundi.pages.dev/`. The production deployment lists `cf-test.visionovamundi.com`, `www.visionovamundi.com` and `visionovamundi.pages.dev`. Its recorded build used Node.js 22.23.1 and npm 10.9.2; the current settings show no `NODE_VERSION` override. |
| Vercel (retirement pending) | The project still exists and is Git-connected. Current project settings show its `Ignored Build Step` remains `Don't build anything` (`exit 0`); the only attached project domain is `vnm-uhc-fallback-20260815.vercel.app`. It is not a supported host or fallback. |

## Public Cloudflare verification — 10 October 2026

| Check | Observed result |
| --- | --- |
| `https://www.visionovamundi.com/` | HTTP 200; TLS certificate validation succeeded; Cloudflare response headers present; HSTS present. |
| `http://www.visionovamundi.com/` | Redirects to HTTPS; final response HTTP 200. |
| `https://visionovamundi.com/impact/?vnm_check=20261010` | Apex canonicalizes to `www`; `/impact/` redirects to `/work/`; query string preserved; final response HTTP 200. |
| `https://www.visionovamundi.com/programmes/?vnm_check=20261010` | Redirects to `/projects/`; query string preserved; final response HTTP 200. |
| `https://visionovamundi.pages.dev/` and `https://cf-test.visionovamundi.com/` | Both HTTP 200 over validated TLS. |
| Existing previews `5080e70f` and `4d77820d` on `visionovamundi.pages.dev/about/` | Both HTTP 200; `X-Robots-Tag: noindex` present. |

These responses and the read-only dashboard record verify current public reachability, TLS validation, observed redirects, the Git connection, build settings and existing preview support. They do not guarantee that a future candidate build will succeed or establish Cloudflare account availability beyond these observations. A preview must still be built and reviewed for the final approved candidate before production release.

## Vercel retirement checks — read-only, 10 October 2026

- The Vercel project is `vnm-uhc-fallback-20260815` (`prj_N3UBfjQ80G3u6Qj1g1GymAnsYFkj`). Its Git settings show the connected repository `Florin-Solent/VisioNovaMundi`; the project has no Vercel Deploy Hooks. The account-level Vercel GitHub integration and event settings are not changed.
- The Vercel project Domains page lists only `vnm-uhc-fallback-20260815.vercel.app`; neither `visionovamundi.com` nor `www.visionovamundi.com` is attached. The configured Ignored Build Step remains `Don't build anything` / `exit 0`. No project disconnection, build-guard change, deployment or deletion was performed.
- Cloudflare Pages is independently connected to GitHub and serves production from `master`. It has its own successful production deployment, existing branch/PR previews and the required public domains. The source project is a static Astro site with no Cloudflare project variables or bindings; the current public site and its routes/redirects responded without relying on Vercel.
- Repository review found no active application or site-output references to a Vercel endpoint. Remaining source references are historical deployment records, a release guard that rejects `.vercel.app` URLs, checks that reject Vercel configuration/linkage, and the ignored `.vercel` local metadata directory. `package-lock.json` contains optional Vercel peer names in upstream dependency metadata; they are not installed Vercel runtime dependencies.
- No VNM Vercel Deploy Hook exists. External third-party consumers of the `vercel.app` hostname cannot be conclusively enumerated from the repository or these dashboards; no such consumer was identified, and the hostname is no longer a public VNM domain.

**Retirement procedure after separate approval:** (1) In this exact project's Git settings, disconnect only `Florin-Solent/VisioNovaMundi`; do not revoke the account-level GitHub App installation or alter any other Vercel project. (2) Confirm new Git pushes no longer create Vercel deployment records; keep the `Don't build anything` guard in place until disconnection is confirmed. (3) Recheck Cloudflare production and previews. (4) Obtain the founder's explicit confirmation identifying project `vnm-uhc-fallback-20260815` before permanently deleting that project and its deployments. (5) Verify the project is gone while leaving the Vercel account, GitHub repository, Cloudflare project, DNS and unrelated resources intact. These steps have not been executed.

Historical note: an earlier dashboard inspection recorded Cloudflare as production and Vercel as a fallback. A read-only review on 10 October confirmed that Vercel's Ignored Build Step remains saved as `Don't build anything` (`exit 0`); it was left in place while the Vercel Git connection remains active.

## Historical Vercel automatic-deployment proposal — superseded

An earlier local proposal added a root `vercel.json` setting to suppress Vercel Git deployments while retaining the project. That proposal is superseded by the decision to retire Vercel. The Cloudflare-only release candidate removes this file. Do not publish while Vercel is still connected, because doing so could trigger a Vercel event.

At the time of the proposal, the config had not been pushed. Its first-event behavior was uncertain, which is why publishing was gated. The current local candidate removes the Vercel configuration, but the project remains connected; do not publish until its Git connection is safely disconnected or the project is deleted.

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
| Vercel project (retirement pending) | `vnm-uhc-fallback-20260815`; not an approved fallback; deletion not yet authorized or performed |
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

`cf-test.visionovamundi.com` was recorded as Active with SSL enabled on 5 October 2026. The DNS observations above are historical and were not re-run in the latest check; the public HTTP/TLS checks from 10 October are recorded separately near the top. Vercel deletion remains pending the founder's explicit confirmation.

## Historical Vercel project audit — 9 October 2026

- In Vercel project `vnm-uhc-fallback-20260815` (`prj_N3UBfjQ80G3u6Qj1g1GymAnsYFkj`), the dedicated **Project Domains** endpoint lists only `vnm-uhc-fallback-20260815.vercel.app`. The custom-domain project associations for `visionovamundi.com` and `www.visionovamundi.com` were removed. No Cloudflare DNS or account-level domain registration changes were made during that operation.
- Vercel's broader project summary still listed the two former custom domains when checked. For current project-domain associations, use the dedicated Project Domains list and recheck before a migration.
- Vercel project configuration reports **Node 22.x**; the latest READY deployment listed above was created before that setting was changed, so this is **not evidence that the existing deployment was rebuilt under Node 22**.
- The Vercel GitHub integration remains active; PR updates can create preview builds and `master` updates can trigger production builds on both Cloudflare Pages and Vercel. The dual-deployment approval gate remains in force.
- The Vercel audit found zero configured project environment variables and zero custom environments. Do not infer parity of build output or redirects solely from a READY status.

**Historical rollback limitation:** Removing the custom-domain associations meant Vercel was not a one-click DNS rollback. Vercel is now pending retirement, not a supported rollback target. Historically, it did not honor Cloudflare Pages' `public/_redirects`: `/impact/` and `/programmes/` returned 404 on a tested Vercel deployment.

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
