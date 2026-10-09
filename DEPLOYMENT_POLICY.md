# VNM deployment policy

## Hosting architecture and migration state

- Astro is the site framework and build system.
- GitHub is the canonical source and release-control repository: https://github.com/Florin-Solent/VisioNovaMundi.git.
- Cloudflare Pages is the current production host. The Pages project is `visionovamundi`, connected to this repository, with `master` configured as its production branch.
- Vercel project `vnm-uhc-fallback-20260815` is retained temporarily as rollback/fallback infrastructure through stabilization. On 9 October 2026 its **project-domain associations for the public VNM hosts were removed**, leaving its `vercel.app` domain; Node **22.x** is configured for future builds. Retain the project until separately approved for retirement.
- The homepage and project visual releases are merged to `master`; the public-domain cutover is complete and recorded in [PRODUCTION.md](PRODUCTION.md).
- Current production records, observed DNS targets, deployment identifiers and the preview reference are recorded in [PRODUCTION.md](PRODUCTION.md). Reconfirm changeable dashboard states immediately before each migration step.

Cloudflare Pages custom-domain association and certificate readiness must be confirmed before any public DNS change. The intended sequence is: build and verify the approved commit on the Pages production branch; activate and verify `www`; move `www`; observe and verify it while apex remains unchanged; then activate and verify apex and preserve apex-to-`www` canonical routing.

## Operational modes

- **Investigation:** external systems are read-only; local documentation edits, builds and tests are allowed. Do not publish, deploy, change DNS, or push to a production-triggering branch without explicit approval.
- **Preview:** use local previews or GitHub-triggered Cloudflare Pages branch previews. A branch push may also create an incidental Vercel preview; Cloudflare is the migration review target. Never alias a preview to a production domain.
- **Production:** Cloudflare Pages is the active production host, served from the configured `master` branch after the production build and smoke checks pass. Vercel remains available through its `vercel.app` domain as a temporary fallback; the public custom domains are no longer attached to its project.
- **Dual deployment gate:** while both Git integrations are active, a `master` update can trigger Cloudflare Pages and Vercel production deployments. Explain this before any merge or push to `master` and obtain confirmation that both production builds are expected. Do not disable or alter Vercel as a shortcut; preserve it as rollback during stabilization.
- **Other targets:** ChatGPT Sites and other hosts are outside this migration. Do not update the legacy Sites environment during a normal release.

## Release procedure

1. Read this policy and [PRODUCTION.md](PRODUCTION.md); inspect the working tree and preserve unrelated work.
2. Use Node 22.12 or later within major 22. Vercel project configuration also now specifies `22.x`, but the existing READY deployment predates that change; reverify runtime and build parity on the next Vercel build. Run `npm run check:target`, `npm run release:classify:test`, and `npm run release:check` for site-code changes.
3. GitHub Actions automatically selects one lane while preserving the single required `release:check` status:
   - **DOCS** for allowlisted documentation files that cannot affect site output.
   - **FAST** for up to three isolated static Astro page edits. It builds and checks every generated route, metadata, internal destinations, assets and staging/local URLs, then runs desktop/mobile browser smoke checks on critical routes and changed pages.
   - **FULL** for shared UI/layout/navigation/style/data, scripts/tests, runtime JavaScript/TypeScript, routing/build/deployment configuration, dependencies, workflow files, page runtime behavior, uncertain paths or larger changes. FULL retains the full browser suite across routes, viewport sizes and motion settings, including Three.js checks.
4. A `qa:full` PR label, manual workflow dispatch, or scheduled regression can only escalate to FULL. A `master` push runs the configured master checks and may deploy both hosting projects; follow the dual deployment gate above.
5. Review the exact diff, test report, commit and documented hosting state. Obtain explicit release approval before merging to `master`, switching a public domain, or otherwise publishing to production.
6. Before cutover, verify the Cloudflare Pages deployment built from the approved commit directly on its `pages.dev` deployment URL. Verify the route, asset, redirect and shared-footer checks before associating or switching a custom domain.
7. Switch `www` first only after its Pages custom-domain association is Active and its certificate is valid. Keep apex unchanged while observing `www`. Switch apex only after `www` is proven, preserve apex-to-`www` paths and query strings, and verify there is no redirect loop.
8. Keep the Vercel project, its `vercel.app` domain, a known-good deployment and historical DNS rollback information available during stabilization. Do not delete or disconnect Vercel without separate approval. Its public-domain associations were removed on 9 October 2026.
9. A future rollback requires a **new, separately approved and tested cutover**: verify the specific Vercel deployment, re-associate both custom domains on the Vercel project, check ownership and TLS, then make coordinated DNS/redirect changes. Confirm canonical routing, `/impact/` and `/programmes/` parity, assets and essential routes; record verified deployment/domain state in [PRODUCTION.md](PRODUCTION.md). Do not treat restoring the old Vercel DNS value alone as a complete rollback.

For local use, `npm run release:smoke` explicitly runs the FAST browser suite and `npm run release:full` explicitly runs the full suite. `npm run release:check` defaults to FULL locally without trusted PR diff metadata. See [docs/release-qa.md](docs/release-qa.md) for coverage and runtime details.

The scripts build and test only; they contain no deployment command. Target checks fail on an unexpected Git origin or local Vercel link. These are guardrails, not access-control enforcement: manual CLI and dashboard actions remain governed by this policy.

## Legacy Sites

https://visio-nova-mundi.floryn-outsider.chatgpt.site/ is LEGACY / NON-PRODUCTION, known version 44. Leave its version history intact. Never create another version during a normal release. A future one-time legacy notice or redirect requires separate approval; none is published by this workflow.
