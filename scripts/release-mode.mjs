import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';

const DOCS_ROOTS = ['docs/'];
const DOCS_FILES = new Set([
  'README.md',
  'AGENTS.md',
  'PRODUCTION.md',
  'DEPLOYMENT_POLICY.md',
]);
const CORE_ROUTES = ['/', '/work/', '/programmes/', '/governance/', '/contact/'];
const STRUCTURAL_PAGES = new Set([
  'src/pages/index.astro',
  'src/pages/work.astro',
  'src/pages/programmes.astro',
  'src/pages/commissioners-partners.astro',
  'src/pages/governance.astro',
]);
const RUNTIME_EXTENSIONS = /\.(?:[cm]?js|jsx|ts|tsx)$/i;
const WORKFLOW_OR_BUILD = [
  /^\.github\/workflows\//,
  /^package\.json$/,
  /^package-lock\.json$/,
  /^astro\.config\./,
  /^vite\.config\./,
  /^wrangler\.toml$/,
  /^scripts\//,
  /^tests?\//,
  /^__tests__\//,
  /^src\/(?:layouts|components|scripts|data|styles)\//,
  /^src\/pages\/.*\.(?:md|mdx)$/i,
];

export function routeForPage(path) {
  const match = path.match(/^src\/pages\/(.+)\.astro$/);
  if (!match || match[1].includes('[') || match[1].includes(']')) return null;
  return match[1] === 'index' ? '/' : `/${match[1]}/`;
}

export function classifyChangedFiles(files, { forceFull = false, trigger = 'pull_request' } = {}) {
  const paths = [...new Set(files)].sort();
  if (trigger === 'schedule' || trigger === 'workflow_dispatch') {
    return { mode: 'FULL', reason: trigger === 'schedule' ? 'scheduled full regression' : 'manual workflow dispatch', changedRoutes: pageRoutes(paths) };
  }
  if (forceFull) return { mode: 'FULL', reason: 'qa:full force-full request', changedRoutes: pageRoutes(paths) };
  if (trigger === 'push') {
    return { mode: 'FAST', reason: 'post-merge master smoke; PR gate validates risky changes before merge', changedRoutes: pageRoutes(paths) };
  }
  if (!paths.length) return { mode: 'FULL', reason: 'no diff information; fail safe to FULL', changedRoutes: [] };

  const unsafe = paths.find(path =>
    !isDocumentation(path) && (
      WORKFLOW_OR_BUILD.some(pattern => pattern.test(path)) ||
      RUNTIME_EXTENSIONS.test(path) ||
      path.startsWith('src/') && !path.startsWith('src/pages/') ||
      !routeForPage(path)
    )
  );
  if (unsafe) {
    const releaseSystemFile = WORKFLOW_OR_BUILD.some(pattern => pattern.test(unsafe));
    const reason = releaseSystemFile
      ? `release-system files changed: ${unsafe}`
      : `high-risk or unknown path: ${unsafe}`;
    return { mode: 'FULL', reason, changedRoutes: pageRoutes(paths) };
  }

  const pages = paths.filter(path => routeForPage(path));
  const structuralCount = pages.filter(path => STRUCTURAL_PAGES.has(path)).length;
  if (pages.length > 3) return { mode: 'FULL', reason: `${pages.length} production pages changed (limit is 3)`, changedRoutes: pageRoutes(paths) };
  if (structuralCount > 1) return { mode: 'FULL', reason: 'multiple structural pages changed', changedRoutes: pageRoutes(paths) };

  if (paths.every(isDocumentation)) {
    return { mode: 'DOCS', reason: 'documentation-only files outside the site build', changedRoutes: [] };
  }
  if (pages.length && pages.length === paths.length) {
    return { mode: 'FAST', reason: 'isolated static page changes', changedRoutes: pageRoutes(paths) };
  }
  return { mode: 'FULL', reason: 'mixed or uncertain change set', changedRoutes: pageRoutes(paths) };
}

function isDocumentation(path) {
  return DOCS_ROOTS.some(root => path.startsWith(root)) || DOCS_FILES.has(path);
}

function pageRoutes(paths) {
  return [...new Set(paths.map(routeForPage).filter(Boolean))].sort();
}

function gitText(refPath) {
  try {
    return execFileSync('git', ['show', refPath], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

function region(source, expression) {
  return [...source.matchAll(expression)].map(match => match[0]);
}

function nonImportFrontmatter(source) {
  const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  if (!match) return '';
  return match[1].split(/\r?\n/).filter(line => !/^\s*import\b/.test(line)).join('\n');
}

function pageRuntimeChanged(base, path) {
  const previous = gitText(`${base}:${path}`);
  const current = readFileSync(path, 'utf8');
  return nonImportFrontmatter(previous) !== nonImportFrontmatter(current) ||
    region(previous, /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi).join('\n') !==
      region(current, /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi).join('\n') ||
    region(previous, /^\s*import\s+.+$/gm).join('\n') !== region(current, /^\s*import\s+.+$/gm).join('\n') ||
    region(previous, /\son[a-z]+\s*=/gi).join('\n') !== region(current, /\son[a-z]+\s*=/gi).join('\n') ||
    region(previous, /\bclient:(?:load|idle|visible|media|only)\b/g).join('\n') !== region(current, /\bclient:(?:load|idle|visible|media|only)\b/g).join('\n');
}

function eventDiff() {
  const eventName = process.env.GITHUB_EVENT_NAME || 'local';
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const event = eventPath && existsSync(eventPath) ? JSON.parse(readFileSync(eventPath, 'utf8')) : {};
  const pullRequest = event.pull_request;
  const labelNames = (pullRequest?.labels || []).map(label => label.name);
  const forceFull = labelNames.includes('qa:full') || eventName === 'schedule' || eventName === 'workflow_dispatch';

  if (eventName === 'pull_request' && pullRequest?.base?.sha) {
    return { eventName, event, base: pullRequest.base.sha, forceFull, manualOrScheduled: false };
  }
  if (eventName === 'push' && event.before && !/^0+$/.test(event.before)) {
    return { eventName, event, base: event.before, forceFull: false, manualOrScheduled: false };
  }
  return { eventName, event, base: null, forceFull, manualOrScheduled: true };
}

function changedFiles(base) {
  if (!base) return [];
  const output = execFileSync('git', ['diff', '--name-only', '-z', '--no-renames', `${base}...HEAD`], { encoding: 'utf8' });
  return output.split('\0').filter(Boolean);
}

function appendOutput(file, entries) {
  const lines = Object.entries(entries).map(([key, value]) => `${key}=${String(value).replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A')}`);
  return writeFile(file, `${lines.join('\n')}\n`, { flag: 'a' });
}

function summary(result, files) {
  const routes = result.changedRoutes.length ? result.changedRoutes.join(', ') : 'none';
  const fileList = files.length ? files.map(file => `- \`${file}\``).join('\n') : '- none (FULL selected because diff metadata was unavailable)';
  return `## Release QA decision\n\n**QA MODE: ${result.mode}**\n\n**Reason:** ${result.reason}\n\n**Changed routes:** ${routes}\n\n**Changed files:**\n${fileList}\n`;
}

function selfTest() {
  const tests = [
    ['A: production manifest', ['PRODUCTION.md'], 'DOCS', []],
    ['B: contact page', ['src/pages/contact.astro'], 'FAST', ['/contact/']],
    ['C: Unity House page', ['src/pages/unity-house.astro'], 'FAST', ['/unity-house/']],
    ['D: shared layout', ['src/layouts/BaseLayout.astro'], 'FULL', []],
    ['E: shared navigation component', ['src/components/SiteNavigation.astro'], 'FULL', []],
    ['F: lockfile', ['package-lock.json'], 'FULL', []],
    ['G: Three.js scene', ['src/scripts/cosmic-world.ts'], 'FULL', []],
    ['H: release runner', ['scripts/release-check.mjs'], 'FULL', []],
    ['I: unknown production asset', ['public/images/new-image.webp'], 'FULL', []],
  ];
  for (const [name, files, mode, routes] of tests) {
    const result = classifyChangedFiles(files);
    assert.equal(result.mode, mode, `${name} mode`);
    assert.deepEqual(result.changedRoutes, routes, `${name} route mapping`);
  }
  assert.equal(classifyChangedFiles(['README.md'], { forceFull: true }).mode, 'FULL', 'force-full must only escalate');
  assert.equal(classifyChangedFiles([], { trigger: 'local' }).mode, 'FULL', 'uncertain local state must default to FULL');
  assert.equal(classifyChangedFiles(['src/pages/contact.astro'], { trigger: 'push' }).mode, 'FAST', 'master push should use post-merge smoke');
  assert.equal(classifyChangedFiles([], { trigger: 'workflow_dispatch' }).mode, 'FULL', 'manual workflow dispatch must run FULL');
  assert.equal(classifyChangedFiles([], { trigger: 'schedule' }).mode, 'FULL', 'scheduled regression must run FULL');
  assert.match(classifyChangedFiles(['.github/workflows/release-check.yml']).reason, /^release-system files changed:/);
  console.log(`Release classifier examples passed: ${tests.length + 6}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) return selfTest();
  const isCi = args.includes('--ci');
  const outputPath = args[args.indexOf('--output') + 1];
  const summaryPath = args[args.indexOf('--summary') + 1];

  if (args.includes('--validate-docs')) {
    const files = JSON.parse(process.env.VNM_CHANGED_FILES || '[]');
    const result = classifyChangedFiles(files);
    assert.equal(result.mode, 'DOCS', 'DOCS lane reclassification failed closed');
    for (const path of files) {
      const content = await readFile(path, 'utf8');
      assert(content.trim().length > 0, `Empty documentation file: ${path}`);
      assert(!content.includes('\0'), `NUL byte in documentation file: ${path}`);
    }
    console.log(`DOCS integrity passed for ${files.length} file(s)`);
    return;
  }

  if (!isCi) throw new Error('Use --self-test, --validate-docs, or --ci.');
  const { eventName, base, forceFull, manualOrScheduled } = eventDiff();
  const files = changedFiles(base);
  let result = manualOrScheduled
    ? classifyChangedFiles(files, { forceFull: true, trigger: eventName })
    : classifyChangedFiles(files, { forceFull, trigger: eventName });

  if (result.mode !== 'DOCS' && eventName === 'pull_request' && base) {
    const changedPage = files.find(path => routeForPage(path) && pageRuntimeChanged(base, path));
    if (changedPage) result = { mode: 'FULL', reason: `page runtime/import behavior changed: ${changedPage}`, changedRoutes: pageRoutes(files) };
  }
  if (!files.length && result.mode !== 'FULL') result = { mode: 'FULL', reason: 'diff unavailable; fail safe to FULL', changedRoutes: [] };

  const markdownFiles = files.filter(isDocumentation);
  if (outputPath) await appendOutput(outputPath, {
    mode: result.mode,
    reason: result.reason,
    changed_routes: JSON.stringify(result.changedRoutes),
    changed_files: JSON.stringify(files),
  });
  if (summaryPath) await writeFile(summaryPath, summary(result, files), { flag: 'a' });
  console.log(summary(result, files));
  if (outputPath && result.mode === 'DOCS') await appendOutput(outputPath, { docs_files: JSON.stringify(markdownFiles) });
}

if (process.argv[1]?.endsWith('release-mode.mjs')) {
  await main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
