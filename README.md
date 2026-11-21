# Visio Nova Mundi CIC website

Source for https://www.visionovamundi.com/, the public website of Visio Nova Mundi Community Interest Company (company no. 16947678).

Built with [Astro](https://astro.build/) and hosted on Cloudflare Pages. A push or merge to `master` deploys to production, so work on a branch and get release approval first.

## Commands

Use Node.js 22 (`>=22.19 <23`).

| Command | What it does |
| :-- | :-- |
| `npm ci` | Install the exact dependency versions from the lockfile |
| `npm run dev` | Start a local dev server at `localhost:4321` |
| `npm run build` | Build the static site into `./dist/` |
| `npm run preview` | Serve the built site locally |
| `npm run release:check` | Build and run browser QA (no deployment) |
| `npm run verify:production` | Read-only checks against the live site |

## Where things live

- `src/pages/` has one `.astro` file per route.
- `src/layouts/BaseLayout.astro` holds the shared header, footer, design tokens, fonts and page scripts.
- `src/data/projects.ts` lists every project, its public status and its stage on the homepage evidence ladder.
- `src/data/project-updates.ts` holds dated project updates. Add only updates backed by project records or published evidence.
- `public/fonts/` contains Atkinson Hyperlegible Next (SIL Open Font License, see `OFL.txt`).

## VNM release workflow

Read [Deployment policy](DEPLOYMENT_POLICY.md), [Production manifest](PRODUCTION.md), and [Release QA](docs/release-qa.md). Use `npm run release:check` for local build and browser QA, and `npm run verify:production` for read-only public verification. Neither command deploys.
