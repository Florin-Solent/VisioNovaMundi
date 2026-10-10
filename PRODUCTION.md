# Production manifest

The public site is served through Cloudflare Pages, with Vercel retained as rollback/fallback infrastructure. On 10 October 2026, after PR #12, the connected Cloudflare Pages and Vercel dashboards both showed `master` commit `7da90697cc7ca9616e3653c81de2a34b02516f7e` as the current production source. The Cloudflare deployment was successful. Before guarded PR preparation, Vercel's Ignored Build Step was `Automatic`; it is now temporarily set to `Don't build anything` (`exit 0`) to suppress Git builds while the local `vercel.json` policy is introduced. The Vercel project, existing deployments and `vercel.app` domain remain in place.

## Current deployment configuration verified 10 October 2026

| Platform | Verified state |
| --- | --- |
| Cloudflare Pages | Project `visionovamundi`; connected repository `Florin-Solent/VisioNovaMundi`; production branch `master`; automatic production deployments enabled; preview setting `All non-Production branches`; build command `npm run build`; output directory `dist`; root directory blank; build system version 3. |
| Cloudflare Pages production | Current deployment source `master` at `7da90697cc7ca9616e3653c81de2a34b02516f7e`, marked successful at `https://c10c87bf.visionovamundi.pages.dev/`. Project listed `cf-test.visionovamundi.com`, `www.visionovamundi.com` and `visionovamundi.pages.dev` on its production deployment. |
| Vercel fallback | Project `vnm-uhc-fallback-20260815`; connected repository `Florin-Solent/VisioNovaMundi`; current production source `master` at `7da90697cc7ca9616e3653c81de2a34b02516f7e`, marked Ready; deployment ID `8ZvFXvNtYmib5WrXtHQcYDUQxFS2`; `vercel.app` deployment URL `https://vnm-uhc-fallback-20260815-4kchxfci1.vercel.app/`; project alias `vnm-uhc-fallback-20260815.vercel.app`; baseline Ignored Build Step `Automatic`, now temporarily `Don't build anything` (`exit 0`, saved and verified after reload); Node.js `22.x`. A preview for the merged MECC PR is also present. |

The dashboard inspection confirmed Cloudflare is the active production host and recorded the known-good Vercel fallback. The only setting subsequently changed was Vercel's Ignored Build Step. After saving it, the deployment list contained zero new records after the previous latest deployment; no build or deployment was initiated by this setting change.

## Proposed Vercel automatic-deployment policy — local only

The local root [`vercel.json`](vercel.json) sets `git.deploymentEnabled` to `false` for all branches. [Vercel documents](https://vercel.com/docs/project-configuration/git-configuration) this as disabling automatic Git deployments while leaving deliberate manual deployments available. The existing Vercel project, Git connection, `vercel.app` domain and deployment history are to be retained.

This config has not been pushed and is not effective on the live Vercel project. Vercel's [public documentation](https://vercel.com/docs/project-configuration/git-configuration) does not guarantee that a newly introduced config file suppresses the first event that carries it; a [Vercel staff response](https://community.vercel.com/t/is-there-no-way-to-block-all-automatic-deployments-from-github/6349/3) says an initial deployment may be needed to establish the setting. As an approved guard for this PR stage, the Ignored Build Step is now saved as `Don't build anything` (`exit 0`). Git events may still create cancelled deployment records and count toward quotas, as [Vercel's project settings documentation](https://vercel.com/docs/project-configuration/project-settings) explains, but this guard suppresses their builds. No build was triggered by changing the guard. Do not restore `Automatic`, merge to `master`, or trigger Cloudflare production until the PR evidence is reviewed and production is separately approved.

## Approved target architecture

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
| Vercel fallback project | `vnm-uhc-fallback-20260815`; retained for deliberate manual deployment/rollback after the proposed Git suppression policy takes effect |
| Vercel fallback READY deployment recorded in 9 Oct audit (historical) | `dpl_GjZA6yUZfk72TdTm1hh8wNLFZ2vg`, source `master` commit `a8c208401929709fccc70d758be404565edd8b56` (Circular Justice PR #10); https://vnm-uhc-fallback-20260815-9pbmfvaq3.vercel.app/ |
| Vercel historical rollback reference (5 Oct record) | GitHub deployment `6847843880`, success, source commit `411dfa2e3d57b5461590de36418435a59119eba8`; https://vnm-uhc-fallback-20260815-6hanr4fco.vercel.app/ |
| Cloudflare Pages production deployment (5 Oct record) | Success, project visuals source commit `e84d090946124003382a2ac86846e2ddf12b5d47`; deployment `d4d5796a-faeb-4771-930b-c6a953e81435` |
| GitHub release QA | Homepage and project visual release checks succeeded; project visual release QA passed before merge |
| Legacy URL | https://visio-nova-mundi.floryn-outsider.chatgpt.site/ |
| Legacy status | NON-PRODUCTION / LEGACY; known version 44 |

The homepage manifesto and project portfolio visual system are live. The Cloudflare production build generated 27 pages. The project portfolio contains 13 vertical project rows, with dedicated pages reusing the approved visuals. Responsive and reduced-motion QA passed, with no browser errors or horizontal overflow. The live `www` routes returned 200, assets loaded, and the legacy redirects `/impact/` → `/work/` and `/programmes/` → `/projects/` returned permanent redirects while preserving query strings.

## Current public-domain and rollback state

| Hostname | Cloudflare DNS record | Proxy | Observed public response |
| --- | --- | --- | --- |
| `www.visionovamundi.com` | CNAME to `visionovamundi.pages.dev` | Proxied; TTL Auto | Pages custom domain Active with SSL enabled; HTTPS 200; `Server: cloudflare`; TLS validation succeeded |
| `visionovamundi.com` | Cloudflare redirect-only apex configuration | Proxied; TTL Auto | HTTPS 301 to `https://www.visionovamundi.com/`; apex paths and query strings preserved; TLS validation succeeded |

Cloudflare nameservers observed: `lola.ns.cloudflare.com` and `mark.ns.cloudflare.com`.

`cf-test.visionovamundi.com` was recorded as Active with SSL enabled on 5 October 2026. Keep the Vercel project and a known-good deployment through the stabilization period; do not disconnect or delete Vercel without separate approval. The Cloudflare DNS and HTTP observations in the table above are from 5 October and were not re-run as part of this documentation update.

## Vercel fallback cleanup — verified 9 October 2026

- In Vercel project `vnm-uhc-fallback-20260815` (`prj_N3UBfjQ80G3u6Qj1g1GymAnsYFkj`), the dedicated **Project Domains** endpoint lists only `vnm-uhc-fallback-20260815.vercel.app`. The custom-domain project associations for `visionovamundi.com` and `www.visionovamundi.com` were removed. No Cloudflare DNS or account-level domain registration changes were made during that operation.
- Vercel's broader project summary still listed the two former custom domains when checked. For current project-domain associations, use the dedicated Project Domains list and recheck before a migration.
- Vercel project configuration reports **Node 22.x**; the latest READY deployment listed above was created before that setting was changed, so this is **not evidence that the existing deployment was rebuilt under Node 22**.
- The Vercel GitHub integration remains active; PR updates can create preview builds and `master` updates can trigger production builds on both Cloudflare Pages and Vercel. The dual-deployment approval gate remains in force.
- The Vercel audit found zero configured project environment variables and zero custom environments. Do not infer parity of build output or redirects solely from a READY status.

**Rollback limitation:** Removing the custom-domain associations means fallback is **not** a one-click DNS rollback. Before directing public traffic to Vercel, select and test an approved deployment, re-associate the custom domains in Vercel, verify domain ownership/TLS readiness, coordinate Cloudflare DNS/redirect changes, and smoke-test the canonical hosts and routes. Historically, Vercel did not honor Cloudflare Pages' `public/_redirects`: `/impact/` and `/programmes/` returned 404 on a tested Vercel deployment. Fix or explicitly account for these routes before any rollback; all production cutover changes require separate approval.

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

**Do not update the legacy Sites environment during normal VNM releases.** Its history remains intact. The local ignored `.vercel/project.json` identifies the canonical fallback project; no hosting or DNS configuration is changed by QA.
