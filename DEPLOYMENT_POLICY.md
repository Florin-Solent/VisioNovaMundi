# VNM deployment policy

## Hosting architecture

- Astro is the site framework and build system.
- GitHub is the canonical source and release-control repository: https://github.com/Florin-Solent/VisioNovaMundi.git.
- Cloudflare Pages is the sole supported production and preview platform. The Pages project is `visionovamundi`, and `master` is the production branch. The verified build command is `npm run build`, with `dist` as output.
- Vercel is not an approved hosting target or fallback. The VNM project `vnm-uhc-fallback-20260815` is disconnected from GitHub; its 39 existing READY deployment records and project-only `vercel.app` address remain until separate founder confirmation authorizes permanent deletion. Do not reconnect it, claim it is deleted, or use it for rollback. See [docs/vercel-retirement-record.md](docs/vercel-retirement-record.md) for the captured inventory and deletion scope.
- Cloudflare production and redirect behavior were verified against merged commit `f8488d88a6d196111eba3fd932b7911c17b63f2a` on 10 October 2026. See [PRODUCTION.md](PRODUCTION.md) for deployment and live-site evidence.
- ChatGPT Sites is legacy/non-production and outside normal releases.

## Operational modes

- **Investigation:** local documentation edits, builds, tests and read-only external verification are allowed. Do not publish, deploy, change DNS, change Cloudflare settings, or push to a production-triggering branch without explicit approval.
- **Preview:** Cloudflare Pages provides pull-request and branch previews. Verify previews on their `pages.dev` URLs; never alias a preview to a production domain. Keep preview indexing controls in place.
- **Production:** Cloudflare Pages is the only supported production host. A `master` update triggers its production build. Publication, merge and deployment require explicit release authorization.
- **Vercel retirement:** the VNM project is disconnected from GitHub, while its project, deployment records and project-only `vercel.app` address still exist. Permanent deletion requires separate explicit founder confirmation. Do not reconnect it or use it as a fallback; no Vercel rollback is part of the supported recovery plan.
- **Other targets:** ChatGPT Sites and any other host are outside this architecture. Do not update them as part of a normal release.

## Release procedure

1. Read this policy and [PRODUCTION.md](PRODUCTION.md); inspect the working tree and preserve unrelated work.
2. Use Node >=22.19 and <23, as declared by the project. GitHub Actions pins the verified Node 22.23.1 patch. Run `npm run check:target`, `npm run release:classify:test`, and `npm run release:check` for site-code changes.
3. GitHub Actions selects one lane while retaining the required `release:check` status:
   - **DOCS** for allowlisted documentation-only files that cannot affect site output.
   - **FAST** for up to three isolated static Astro page edits. It builds and checks generated routes, metadata, internal destinations, assets and staging/local URLs, then runs desktop/mobile browser smoke checks on critical routes and changed pages.
   - **FULL** for shared UI/layout/navigation/style/data, scripts/tests, runtime JavaScript/TypeScript, routing/build/deployment configuration, dependencies, workflow files, page runtime behavior, uncertain paths or larger changes. FULL retains the full browser suite across routes, viewport sizes and motion settings, including Three.js checks.
4. A `qa:full` PR label, manual workflow dispatch, or scheduled regression can only escalate to FULL. A push or merge to `master` triggers Cloudflare Pages production deployment.
5. Review the exact diff, test report, commit and documented hosting state. Obtain explicit release approval before pushing, opening or updating a PR, merging to `master`, changing Cloudflare settings, switching a public domain, or otherwise publishing. Confirm the VNM Vercel project remains Git-disconnected before any release push; its permanent deletion is a separate founder decision.
6. For a preview, verify the Cloudflare Pages deployment built from the reviewed commit directly on its `pages.dev` URL. Verify routes, assets, redirects and shared-footer checks before production authorization.
7. For production, verify the approved `master` build, canonical routes, assets, redirects, TLS and public response after the authorized deployment. Do not change DNS as part of a code release unless separately approved.
8. Rollback is a Cloudflare Pages operation using a previously verified Pages deployment and must receive explicit approval. Do not treat Vercel as an available fallback; it is disconnected and outside the supported recovery plan.

For local use, `npm run release:smoke` explicitly runs FAST and `npm run release:full` explicitly runs the full suite. `npm run release:check` defaults to FULL locally without trusted PR diff metadata. See [docs/release-qa.md](docs/release-qa.md) for coverage and runtime details.

The scripts build and test only; they contain no deployment command. The local target guard validates the canonical Git origin, expected Cloudflare Pages target metadata, and absence of Vercel deployment configuration or local Vercel linkage. It cannot verify live Cloudflare dashboard settings. These are guardrails, not access-control enforcement: dashboard and publishing actions remain governed by this policy.

## Legacy Sites

https://visio-nova-mundi.floryn-outsider.chatgpt.site/ is LEGACY / NON-PRODUCTION, known version 44. Leave its version history intact. Never create another version during a normal release. A future one-time legacy notice or redirect requires separate approval; none is published by this workflow.
