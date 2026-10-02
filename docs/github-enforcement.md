# GitHub release enforcement

The canonical default/production branch is **master**, verified from GitHub and Git on 2026-10-02. Do not rename it to main or change Vercel's branch as part of this work.

`.github/workflows/release-check.yml` defines the required job **release:check** for pull requests targeting master, pushes to master, and manual runs. It uses the locally verified Node 22.14.0 runtime, npm ci, the existing pinned external Playwright runtime, and npm run release:check. Actions are pinned to verified commit SHAs. Reports are uploaded even when QA fails. No deploy commands, deployment credentials, write-capable repository token, or pull_request_target event are included.

## Required branch rule

Target master; enforce actively with no bypass list. Require a pull request, require release:check from GitHub Actions, require the candidate branch to be up to date, block force pushes, and restrict deletion. A separate reviewer approval is not necessary for this single-owner repository; explicit production approval remains an operational requirement before merging a deployment-triggering PR.

## Verified activation and production boundary

Verified on 2026-10-03 after release: [VNM release gate, ruleset 24395263](https://github.com/Florin-Solent/VisioNovaMundi/settings/rules/24395263) remains **Active**, targets exactly `refs/heads/master`, and has no bypass actors. It requires a pull request and the up-to-date `release:check` status from GitHub Actions, blocks force pushes, and restricts branch deletion. No separate reviewer approval is required by the ruleset.

The release workflow passed on pull request [#1](https://github.com/Florin-Solent/VisioNovaMundi/pull/1), run [37075352589](https://github.com/Florin-Solent/VisioNovaMundi/actions/runs/37075352589). The exact required job name was `release:check`; the run used Node 22.14.0. PR #1 merged on 2026-10-03. The Vercel and Cloudflare Pages review deployments were Previews; neither was production.

PR #1 merged as `485451825ccb3d97d86f6c0ad50ea90dbe062f51`; Vercel deployment `dpl_5wqnLso6eMWKfd6thHbmjcrixpts` reached READY for that commit and received the canonical production alias. The production smoke check passed. This is the current approved production baseline. Do not merge a future production-triggering PR without explicit release approval.

For later releases, verify the actual Actions run and active branch rule, and verify production still points at the approved baseline until a release is intentionally approved. Do not bypass the rule for future releases.

GitHub protection governs Git branch updates. It cannot block a separate manual Vercel deployment. That requires a separately approved audit/change of Vercel deployment permissions or production approval controls; no Vercel settings are changed here.

Reference: [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).
