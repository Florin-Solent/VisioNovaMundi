import assert from 'node:assert/strict';
import { appendFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const repository = process.env.GITHUB_REPOSITORY;
const eventName = process.env.GITHUB_EVENT_NAME;
const baseSha = process.env.VNM_PR_BASE_SHA;
const headSha = process.env.VNM_PR_HEAD_SHA;
const token = process.env.GITHUB_TOKEN;
const outputFile = process.env.GITHUB_OUTPUT;
const summaryFile = process.env.GITHUB_STEP_SUMMARY;
const allowedRepository = 'Florin-Solent/VisioNovaMundi';
assert.equal(repository, allowedRepository, 'Hosted Journey gate only supports the canonical VNM repository');

const lines = [];
if (eventName === 'pull_request') {
  assert.match(baseSha || '', /^[0-9a-f]{40}$/i, 'PR base SHA is missing or invalid');
  assert.match(headSha || '', /^[0-9a-f]{40}$/i, 'PR head SHA is missing or invalid');
  const changedFiles = execFileSync('git', ['diff', '--name-only', `${baseSha}...${headSha}`], { encoding: 'utf8' })
    .split(/\r?\n/).filter(Boolean);
  const protectedJourneyPaths = [
    /^src\/pages\/journey\.astro$/,
    /^src\/data\/journey-(?:map|image-variants)\.json$/,
    /^public\/(?:images|media)\/journey\//,
    /^scripts\/(?:journey-media-check|journey-preview-url|release-check|release-mode)\.mjs$/,
    /^\.github\/workflows\/release-check\.yml$/,
    /^package(?:-lock)?\.json$/,
  ];
  const required = changedFiles.some(file => protectedJourneyPaths.some(pattern => pattern.test(file)));
  lines.push(`required=${required}`);
  if (required) {
    assert(token, 'GITHUB_TOKEN is required to wait for the Cloudflare Pages preview check');
    const deadline = Date.now() + 12 * 60 * 1000;
    let accepted;
    while (Date.now() < deadline) {
      const response = await fetch(`https://api.github.com/repos/${repository}/commits/${headSha}/check-runs?per_page=100`, {
        headers: {
          accept: 'application/vnd.github+json',
          authorization: `Bearer ${token}`,
          'x-github-api-version': '2022-11-28',
        },
      });
      assert(response.ok, `Could not read PR preview checks (${response.status})`);
      const payload = await response.json();
      const cloudflare = payload.check_runs
        .filter(check => check.name === 'Cloudflare Pages' && check.head_sha === headSha)
        .sort((left, right) => String(right.started_at).localeCompare(String(left.started_at)))[0];
      if (cloudflare?.status === 'completed') {
        assert.equal(cloudflare.conclusion, 'success', `Cloudflare preview deployment failed: ${cloudflare.conclusion}`);
        const summary = cloudflare.output?.summary || '';
        const previewMatch = summary.match(/Preview URL:<\/strong>[\s\S]*?<a href=['"]([^'"]+)['"]/i);
        assert(previewMatch, 'Successful Cloudflare check did not include a deployment-specific preview URL');
        const preview = new URL(previewMatch[1]);
        const deploymentId = cloudflare.external_id;
        assert.match(deploymentId || '', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Cloudflare check omitted the deployment ID');
        assert.equal(preview.protocol, 'https:');
        assert.equal(preview.hostname, `${deploymentId.slice(0, 8)}.visionovamundi.pages.dev`, 'Cloudflare preview hostname does not identify this deployment');
        accepted = { previewUrl: preview.origin, deploymentId, commit: headSha, checkUrl: cloudflare.html_url };
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    assert(accepted, 'Timed out waiting for a successful Cloudflare preview for this exact PR head');
    lines.push(`url=${accepted.previewUrl}`, `deployment_id=${accepted.deploymentId}`, `commit=${accepted.commit}`);
    if (summaryFile) await appendFile(summaryFile, `### Journey hosted acceptance gate\n\nWaiting for or found preview for \`${accepted.commit}\`: ${accepted.previewUrl} (deployment \`${accepted.deploymentId}\`). This preview is the subject of the required Journey interface, accessibility, media playback and recovery checks.\n\n`);
  }
} else {
  lines.push('required=false');
}

if (outputFile) await appendFile(outputFile, `${lines.join('\n')}\n`);
if (!lines.includes('required=true')) console.log('Journey hosted media gate not required for this event/diff.');
