import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
export const production = 'https://www.visionovamundi.com';
export const target = { platform: 'Cloudflare Pages', projectName: 'visionovamundi', productionBranch: 'master' };
export function checkTarget() {
  assert.equal(execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim(), 'https://github.com/Florin-Solent/VisioNovaMundi.git', 'Unexpected canonical Git origin');
  assert.equal(existsSync('vercel.json'), false, 'VNM release must not include Vercel deployment configuration');
  assert.equal(existsSync('.vercel/project.json'), false, 'VNM release workspace must not be linked to Vercel');
  const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts;
  assert.equal(scripts.build, 'astro build');
  assert.equal(scripts['release:check'], 'node scripts/release-check.mjs');
  assert.equal(scripts['release:smoke'], 'node scripts/release-check.mjs --smoke');
  assert.equal(scripts['release:full'], 'node scripts/release-check.mjs --full');
  assert.equal(scripts['release:classify:test'], 'node scripts/release-mode.mjs --self-test');
  assert.equal(scripts['verify:production'], 'node scripts/release-check.mjs --production');
  console.log(`Target guard passed: ${target.platform} project ${target.projectName}, production branch ${target.productionBranch} → ${production}`);
}
if (process.argv[1]?.endsWith('check-target.mjs')) checkTarget();
