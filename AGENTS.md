# Repository operating rules

Read DEPLOYMENT_POLICY.md and PRODUCTION.md before deployment or investigation work.
Investigations allow local edits/builds/tests and read-only external verification; never publish, deploy, modify DNS, or push to a production-triggering branch without explicit user release approval.
Cloudflare Pages is the sole supported production and preview platform for https://www.visionovamundi.com/. Vercel retirement is pending founder confirmation; until the project is disconnected and deleted, do not push or publish changes that could trigger it. Do not claim it has been deleted. ChatGPT Sites is legacy/non-production and requires separate explicit approval for any update. Do not confuse a Sites remote or generated legacy worker with the production target.
Run `npm run release:check` before proposing a release. No deploy is included. A `master` update triggers Cloudflare Pages production; publishing and merging require explicit release approval. Preserve unrelated working-tree changes. Do not update dependencies as part of QA unless separately approved.
