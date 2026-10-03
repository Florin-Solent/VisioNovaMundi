# Production manifest

Recorded baseline supplied for this task; update only after an approved, verified release.

| Field | Value |
| --- | --- |
| Canonical URL | https://www.visionovamundi.com/ |
| Host / framework | Vercel / Astro |
| Repository | https://github.com/Florin-Solent/VisioNovaMundi.git |
| Production commit | f0a7068de969caac57668a56e041b6a51c1f0065 (f0a7068) |
| Production deployment | dpl_EXE99rttfjdBdUvLUppXNCdPM3EG |
| Vercel project | vnm-uhc-fallback-20260815 |
| Project ID | prj_N3UBfjQ80G3u6Qj1g1GymAnsYFkj |
| Team ID | team_EddEDQ0sFiGJPVJdIXcVpYkd |
| Production domain | www.visionovamundi.com |
| Cloudflare | DNS/security infrastructure only |
| Legacy URL | https://visio-nova-mundi.floryn-outsider.chatgpt.site/ |
| Legacy status | NON-PRODUCTION / LEGACY; known version 44 |

**Do not update the legacy Sites environment during normal VNM releases.** Its history remains intact. The local ignored `.vercel/project.json` identifies the canonical project and is checked by `npm run check:target`; no hosting or DNS configuration is changed by QA.

## Verified PR #3 release — 3 October 2026

- PR #3 merged normally at 2026-10-03 18:57:07 UTC; merge/master/source commit: `f0a7068de969caac57668a56e041b6a51c1f0065`.
- Approved feature head: `669543a774a2e2d02a06a13a4cf513b312bbb0e4`; required PR checks were green before merge.
- Vercel Git production deployment: `dpl_EXE99rttfjdBdUvLUppXNCdPM3EG`, READY, source `master`, canonical alias `www.visionovamundi.com`.
- Deployment URL: https://vnm-uhc-fallback-20260815-fwkto7w3k.vercel.app/
- Canonical live URL: https://www.visionovamundi.com/
- Node 22.14.0 `npm run verify:production` passed: 150 route/viewport/motion cases, zero failures, 62 internal destinations; completed 2026-10-03 19:21:03 UTC.
- All 20 requested route health checks returned 200. Desktop 1440x900, tablet 820x900 and mobile 390x844, normal/reduced motion, navigation, keyboard/touch, Escape/focus, assets, overflow and both Three.js scenes passed.
- Additional actual-public-site visual checks covered 16 desktop/mobile views with no site errors. Key institutional page content matched the approved build.
- Post-merge GitHub run `37146121907` logged all 150 cases and 62 destinations as passing, then was cancelled during finalisation at the existing 15-minute job limit. Its final status is cancelled, not green. No workflow/check bypass or timeout change was made.
- No dependency/lockfile, DNS, hosting architecture, Sites or separate security-task changes. Unrelated Tree of Life work preserved.
- Merged feature branch retained; branch removal was optional.