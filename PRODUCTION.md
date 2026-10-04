# Production manifest

Observed on 4 October 2026. This manifest distinguishes the approved hosting target from the host currently serving public traffic. The custom-domain cutover is not complete.

## Approved target architecture

| Field | Value |
| --- | --- |
| Canonical URL | https://www.visionovamundi.com/ |
| Framework / build | Astro |
| Source and release control | https://github.com/Florin-Solent/VisioNovaMundi.git |
| Intended production host | Cloudflare Pages project `visionovamundi`; production branch `master` |
| Migration release branch | `release/vnm-site-redesign-2026-10` |
| Approved site-code candidate (previewed) | `627247f9d56488c70dd030826f23f5786ce025d8` |
| Latest successful release-candidate preview | Cloudflare Pages deployment `083093c6-1896-48b1-8fca-fd7c6eaaec9f`; https://083093c6.visionovamundi.pages.dev/; GitHub-triggered from the release branch |
| Current live host | Vercel; the migration has not switched public traffic |
| Vercel fallback project | `vnm-uhc-fallback-20260815` |
| Current live production source commit | `b76b2f8aa0c8780f196b0003bfc1a091a843adbf` |
| Current Vercel production deployment URL | https://vnm-uhc-fallback-20260815-fekpzqh4b.vercel.app/ |
| GitHub production deployment record | `6834283181` — Vercel environment, success, associated with the current live source commit |
| Current Cloudflare Pages master build | Successful Pages check for `b76b2f8aa0c8780f196b0003bfc1a091a843adbf`; deployment `a82b5950-ed11-4c6c-ae73-77dc3f4c63c3`; https://a82b5950.visionovamundi.pages.dev/ |
| Legacy URL | https://visio-nova-mundi.floryn-outsider.chatgpt.site/ |
| Legacy status | NON-PRODUCTION / LEGACY; known version 44 |

The release-candidate preview passed checks for all 27 expected public routes, desktop and mobile footer behavior, and the two 308 redirects. This is preview evidence; it does not mean the release candidate has been merged to `master` or that custom domains are active on Pages.

## Current public-domain and rollback state

| Hostname | Cloudflare DNS record | Proxy | Observed public response |
| --- | --- | --- | --- |
| `www.visionovamundi.com` | CNAME to `afd320a5bc23182e.vercel-dns-017.com` | DNS only; TTL Auto | HTTPS 200; `Server: Vercel`; TLS validation succeeded |
| `visionovamundi.com` | CNAME to `afd320a5bc23182e.vercel-dns-017.com` | DNS only; TTL Auto | Public A answer `64.29.17.65`; HTTPS 308 to `https://www.visionovamundi.com/`; `Server: Vercel`; TLS validation succeeded |

Cloudflare nameservers observed: `lola.ns.cloudflare.com` and `mark.ns.cloudflare.com`.

Cloudflare Pages custom-domain readiness: the last recorded review showed apex and `www` inactive on the Pages project. During this preflight, the Cloudflare custom-domains panel did not render its domain rows, so Active/SSL status could not be reconfirmed. Do not change DNS until the Pages dashboard visibly confirms the `www` custom domain is Active with valid SSL; repeat that check for apex before its later switch.

The public HTTPS checks above confirm the existing Vercel path is currently working. Keep the Vercel project and this recorded CNAME target intact as the rollback route through the stabilization period. Do not remove or disconnect Vercel during cutover.

## Historical Vercel release record — 3 October 2026

- PR #3 merged normally at 2026-10-03 18:57:07 UTC; merge/master/source commit: `f0a7068de969caac57668a56e041b6a51c1f0065`.
- Approved feature head: `669543a774a2e2d02a06a13a4cf513b312bbb0e4`; required PR checks were green before merge.
- Vercel Git production deployment: `dpl_EXE99rttfjdBdUvLUppXNCdPM3EG`, READY, source `master`, canonical alias `www.visionovamundi.com`.
- Deployment URL: https://vnm-uhc-fallback-20260815-fwkto7w3k.vercel.app/
- Node 22.14.0 `npm run verify:production` passed: 150 route/viewport/motion cases, zero failures, 62 internal destinations; completed 2026-10-03 19:21:03 UTC.
- All 20 requested route health checks returned 200. Desktop 1440x900, tablet 820x900 and mobile 390x844, normal/reduced motion, navigation, keyboard/touch, Escape/focus, assets, overflow and both Three.js scenes passed.
- Additional actual-public-site visual checks covered 16 desktop/mobile views with no site errors. Key institutional page content matched the approved build.
- Post-merge GitHub run `37146121907` logged all 150 cases and 62 destinations as passing, then was cancelled during finalisation at the existing 15-minute job limit. Its final status is cancelled, not green. No workflow/check bypass or timeout change was made.
- No dependency/lockfile, DNS, hosting architecture, Sites or separate security-task changes. Unrelated Tree of Life work preserved.
- Merged feature branch retained; branch removal was optional.

**Do not update the legacy Sites environment during normal VNM releases.** Its history remains intact. The local ignored `.vercel/project.json` identifies the canonical fallback project; no hosting or DNS configuration is changed by QA.
