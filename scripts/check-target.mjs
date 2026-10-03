import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
export const production = 'https://www.visionovamundi.com';
export const target = { projectId: 'prj_N3UBfjQ80G3u6Qj1g1GymAnsYFkj', orgId: 'team_EddEDQ0sFiGJPVJdIXcVpYkd', projectName: 'vnm-uhc-fallback-20260815' };
export function checkTarget() {
  assert.equal(execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim(), 'https://github.com/Florin-Solent/VisioNovaMundi.git', 'Unexpected canonical Git origin');
  if (existsSync('.vercel/project.json')) {
    const linked = JSON.parse(readFileSync('.vercel/project.json', 'utf8'));
    for (const [key, value] of Object.entries(target)) assert.equal(linked[key], value, `Unexpected Vercel ${key}`);
  } else console.log('Vercel local link absent; any future release must verify the documented project IDs.');
  const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts;
  assert.equal(scripts.build, 'astro build');
  assert.equal(scripts['release:check'], 'node scripts/release-check.mjs');
  assert.equal(scripts['release:smoke'], 'node scripts/release-check.mjs --smoke');
  assert.equal(scripts['release:full'], 'node scripts/release-check.mjs --full');
  assert.equal(scripts['release:classify:test'], 'node scripts/release-mode.mjs --self-test');
  assert.equal(scripts['verify:production'], 'node scripts/release-check.mjs --production');
  console.log(`Target guard passed: ${target.projectName} → ${production}`);
}
if (process.argv[1]?.endsWith('check-target.mjs')) checkTarget();
