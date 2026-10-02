# Repository operating rules

Read DEPLOYMENT_POLICY.md and PRODUCTION.md before deployment or investigation work.
Investigations allow local edits/builds/tests and read-only external verification; never publish, deploy, modify DNS, or push to a production-triggering branch without explicit user release approval.
Canonical production is Vercel at https://www.visionovamundi.com/. ChatGPT Sites is legacy/non-production and requires separate explicit approval for any update. Do not confuse a Sites remote or generated legacy worker with the production target.
Run `npm run release:check` before proposing a release. No deploy is included. Preserve unrelated working-tree changes. Do not update dependencies as part of QA unless separately approved.
