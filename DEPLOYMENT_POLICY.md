# VNM deployment policy

The only standard production path is the canonical Git repository → Astro build → automated QA → Vercel production → https://www.visionovamundi.com/.

Canonical repository: https://github.com/Florin-Solent/VisioNovaMundi.git. Vercel is the production host. Cloudflare provides DNS/security only; a hosting migration requires a separate approved project.

## Operational modes

- **Investigation:** external systems are read-only; local builds/tests are allowed. No publishing, production writes, DNS changes, or pushes to branches that trigger production deployment.
- **Preview:** local previews or Vercel Preview deployments for review. Never alias a preview to a production domain. This hardening task permits local previews only.
- **Production:** canonical Vercel project only, from the canonical repository, following successful QA and explicit user release approval. A Git push may trigger deployment; treat it as publishing.
- **Other targets:** ChatGPT Sites and all other hosts require separate explicit target approval. Normal VNM releases and investigations must never update Sites.

## Release procedure

1. Read PRODUCTION.md and inspect the working tree; preserve unrelated work.
2. Use Node 22.12 or later within major 22. Run `npm run check:target`, `npm run release:classify:test`, and `npm run release:check`.
3. GitHub Actions automatically selects one lane while preserving the single required `release:check` status:
   - **DOCS** for the allowlisted documentation files that cannot affect site output.
   - **FAST** for up to three isolated static Astro page edits. It builds and checks every generated route, metadata, internal destinations, assets, and staging/local URLs, then runs desktop/mobile browser smoke checks on critical routes and changed pages.
   - **FULL** for shared UI/layout/navigation/style/data, scripts/tests, runtime JavaScript/TypeScript, routing/build/deployment configuration, dependencies, workflow files, page runtime behavior, uncertain paths, or larger changes. FULL retains all 150 browser cases across 25 routes, three viewport sizes and both motion settings, including Three.js checks.
4. A `qa:full` PR label, manual workflow dispatch, or scheduled regression can only escalate to FULL. The Monday/Wednesday/Friday schedule makes the full regression visible in Actions. A `master` push runs FAST build/integrity and critical-route smoke checks; it does not repeat the expensive FULL suite after the pre-merge gate.
5. Review the exact diff, test report, commit, and documented Vercel project/domain. Obtain explicit release approval before a deployment-triggering push or production deployment.
6. After an approved release, run `npm run verify:production`. Inspect the actual public site, and record the new verified commit/deployment in PRODUCTION.md.
7. If a release causes regression, restore the previous known production deployment through the canonical Vercel project under the approved release/rollback plan.

For local use, `npm run release:smoke` explicitly runs the FAST browser suite and `npm run release:full` explicitly runs all 150 cases. `npm run release:check` defaults to FULL locally without trusted PR diff metadata; CI classifies automatically. See [docs/release-qa.md](docs/release-qa.md) for coverage and runtime details.

Ordinary page edits use the existing release path and do not require a hosting migration. Cloudflare/Vercel infrastructure work is separate from page publishing and requires its own approved project.

The scripts build/test only; they contain no deployment command. Target checks fail on an unexpected Git origin or local Vercel link. These are guardrails, not access-control enforcement: manual CLI actions remain possible and must follow this policy.

## Legacy Sites

https://visio-nova-mundi.floryn-outsider.chatgpt.site/ is LEGACY / NON-PRODUCTION, known version 44. Leave its version history intact. Never create another version during a normal release. A future one-time legacy notice or redirect requires separate approval; none is published by this workflow.
