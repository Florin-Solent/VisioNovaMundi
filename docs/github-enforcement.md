# GitHub release enforcement

The canonical default/production branch is **master**, verified from GitHub and Git on 2026-10-02. Do not rename it to main or change Vercel's branch as part of this work.

`.github/workflows/release-check.yml` defines the required job **release:check** for pull requests targeting master, pushes to master, and manual runs. It uses the locally verified Node 22.14.0 runtime, npm ci, the existing pinned external Playwright runtime, and npm run release:check. Actions are pinned to verified commit SHAs. Reports are uploaded even when QA fails. No deploy commands, deployment credentials, write-capable repository token, or pull_request_target event are included.

## Required branch rule

Target master; enforce actively with no bypass list. Require a pull request, require release:check from GitHub Actions, require the candidate branch to be up to date, block force pushes, and restrict deletion. A separate reviewer approval is not necessary for this single-owner repository; explicit production approval remains an operational requirement before merging a deployment-triggering PR.

## Activation and production boundary

Prepared on 2026-10-02: [VNM release gate, ruleset 24395263](https://github.com/Florin-Solent/VisioNovaMundi/settings/rules/24395263). It is saved **Disabled**, targets exactly master, has no bypass actors, requires a pull request and an up-to-date release:check, blocks force pushes, and restricts deletion. The check source is temporarily Any source because GitHub Actions is not yet available in the repository's source selector. Do not activate it until a real workflow run succeeds and its source is bound to GitHub Actions. This preparation is not active branch protection.

Local preparation is not a successful GitHub Actions run. The CI workflow must be published to a review branch and pass on a real pull request before claiming that remote CI is verified. No merge or production-triggering push is permitted without explicit release approval. A review-branch push may trigger Vercel Preview, so even that push is withheld while the user's instruction is **no deployments**. Approve a deployment-free publication route or the specific preview separately before publishing.

Activating a rule requiring an unpublished check would block master updates until the workflow is published and passes. Keep the prepared rule disabled during bootstrap; add the workflow on a review branch, verify its pull request check, bind the source to GitHub Actions, then enable enforcement. Do not bypass the rule for future releases.

GitHub protection governs Git branch updates. It cannot block a separate manual Vercel deployment. That requires a separately approved audit/change of Vercel deployment permissions or production approval controls; no Vercel settings are changed here.

After any authorized activation, inspect the actual Actions run and branch rule, record the run URL, and verify production still points at the approved baseline until a release is intentionally approved. The production baseline remains 278500b / dpl_2mCXaUsoHDgMVsKa6vo4GX1PHT12.

Reference: [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).
