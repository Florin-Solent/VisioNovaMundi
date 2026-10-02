# Production manifest

Recorded baseline supplied for this task; update only after an approved, verified release.

| Field | Value |
| --- | --- |
| Canonical URL | https://www.visionovamundi.com/ |
| Host / framework | Vercel / Astro |
| Repository | https://github.com/Florin-Solent/VisioNovaMundi.git |
| Production commit | 485451825ccb3d97d86f6c0ad50ea90dbe062f51 (4854518) |
| Production deployment | dpl_5wqnLso6eMWKfd6thHbmjcrixpts |
| Vercel project | vnm-uhc-fallback-20260815 |
| Project ID | prj_N3UBfjQ80G3u6Qj1g1GymAnsYFkj |
| Team ID | team_EddEDQ0sFiGJPVJdIXcVpYkd |
| Production domain | www.visionovamundi.com |
| Cloudflare | DNS/security infrastructure only |
| Legacy URL | https://visio-nova-mundi.floryn-outsider.chatgpt.site/ |
| Legacy status | NON-PRODUCTION / LEGACY; known version 44 |

**Do not update the legacy Sites environment during normal VNM releases.** Its history remains intact. The local ignored `.vercel/project.json` identifies the canonical project and is checked by `npm run check:target`; no hosting or DNS configuration is changed by QA.

## Latest verified release

- Released from protected `master` by merging [PR #1](https://github.com/Florin-Solent/VisioNovaMundi/pull/1) on 2026-10-03.
- Vercel production deployment `dpl_5wqnLso6eMWKfd6thHbmjcrixpts` reached READY for merge commit `485451825ccb3d97d86f6c0ad50ea90dbe062f51` and received the canonical `www.visionovamundi.com` alias.
- `npm run verify:production` passed under Node 22.14.0: 24 desktop/mobile and reduced-motion route cases, zero failures, and 40 internal destinations.
- The release changes deployment workflow and QA safeguards only; public site page and style files were unchanged.
