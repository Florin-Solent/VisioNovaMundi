# VNM deployment policy

The only standard production path is the canonical Git repository → Astro build → automated QA → Vercel production → https://www.visionovamundi.com/.

Canonical repository: https://github.com/Florin-Solent/VisioNovaMundi.git. Vercel is the production host. Cloudflare provides DNS/security only; a hosting migration requires a separate approved project.

## Operational modes

- **Investigation:** external systems are read-only; local builds/tests are allowed. No publishing, production writes, DNS changes, or pushes to branches that trigger production deployment.
- **Preview:** local or Vercel Preview deployments for review. Never alias a preview to a production domain. The release-hardening pull request was explicitly authorized to create Vercel and Cloudflare Pages Previews; both were non-production.
- **Production:** canonical Vercel project only, from the canonical repository, following successful QA and explicit user release approval. A Git push may trigger deployment; treat it as publishing.
- **Other targets:** ChatGPT Sites and all other hosts require separate explicit target approval. Normal VNM releases and investigations must never update Sites.

## Release procedure

1. Read PRODUCTION.md and inspect the working tree; preserve unrelated work.
2. Use Node 22.12 or later within major 22. Run `npm run check:target` and `npm run release:check`.
3. Review the exact diff, test report, commit, and documented Vercel project/domain. Obtain explicit release approval before a deployment-triggering push or production deployment.
4. After an approved release, run `npm run verify:production`. Inspect the actual public site, and record the new verified commit/deployment in PRODUCTION.md.
5. If a release causes regression, restore the previous known production deployment through the canonical Vercel project under the approved release/rollback plan.

The scripts build/test only; they contain no deployment command. Target checks fail on an unexpected Git origin or local Vercel link. These are guardrails, not access-control enforcement: manual CLI actions remain possible and must follow this policy.

## Legacy Sites

https://visio-nova-mundi.floryn-outsider.chatgpt.site/ is LEGACY / NON-PRODUCTION, known version 44. Leave its version history intact. Never create another version during a normal release. A future one-time legacy notice or redirect requires separate approval; none is published by this workflow.
