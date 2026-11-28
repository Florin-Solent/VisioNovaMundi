import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';

const archive = 'output/release-qa/axe-core-4.14.0.tgz';
const packageJson = 'output/release-qa/axe-core/package/package.json';
const script = 'output/release-qa/axe-core/package/axe.min.js';
assert(existsSync(archive) && existsSync(packageJson) && existsSync(script), 'Provision pinned axe-core 4.14.0 before release QA');
const bytes = await readFile(archive);
const integrity = `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
assert.equal(integrity, 'sha512-9WTZxEjsZ7b13TH8JPmbV2z8CHbl80/2hm3XPEG4JgNdQLK81IBRXmSxHfMAOkSqQeRxT/0dwNDz2GOm3zzpcQ==', 'axe-core archive integrity mismatch');
const pkg = JSON.parse(await readFile(packageJson, 'utf8'));
assert.equal(pkg.name, 'axe-core');
assert.equal(pkg.version, '4.14.0');
console.log('Pinned axe-core 4.14.0 package integrity verified');
