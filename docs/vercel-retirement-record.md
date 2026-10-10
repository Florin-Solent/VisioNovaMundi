# VNM Vercel retirement record

Captured read-only on 10 October 2026 for the founder-approved VNM Cloudflare-only transition. The exact Vercel project was subsequently deleted after explicit founder authorization; this record preserves the pre-deletion state and deployment inventory.

## Exact project and current state

| Field | Value |
| --- | --- |
| Project | `vnm-uhc-fallback-20260815` (permanently deleted after separate founder authorization) |
| Project ID | `prj_N3UBfjQ80G3u6Qj1g1GymAnsYFkj` (subsequent API lookup returned 404 `not_found`) |
| Git connection | Disconnected from GitHub before PR #13 was updated and merged. |
| Project domain | `vnm-uhc-fallback-20260815.vercel.app` (verified before deletion; removed with the project) |
| VNM public domains | `visionovamundi.com` and `www.visionovamundi.com` are not attached. |
| Deployment records | 39 captured before deletion; all were `READY` at inventory time and were removed with the project. |
| Production dependency | None identified. Cloudflare Pages independently serves the public website. |

The project-level Integrations page showed no installed integrations. The project settings showed `Don't build anything` (`exit 0`) for the ignored build step. No project environment variables or project Deploy Hooks were found. The account-level Vercel GitHub integration was not changed. Account-wide webhook enumeration was unavailable through the read API (permission denied), so this record makes no claim about unrelated account-level integrations.

No Vercel deployment was created after the GitHub merge at 20:21:56 UTC on 10 October 2026. The latest captured deployment below predates the merge.

The merged GitHub tree contains no `vercel.json` or `.vercel/project.json`. Release workflows and scripts contain no Vercel deployment action; the target guard rejects Vercel configuration and local project linkage. Four older local-only worktrees on `release/vnm-integrated-candidate-2026-10-10`, `security/dependency-remediation-2026-10-10`, `chore/align-node-22-23-1`, and `docs/cloudflare-only-policy` still contain the historical `vercel.json` guard (`git.deploymentEnabled: false`). They are not part of `master` and were left untouched. The inspected primary local checkout's ignored `.vercel/project.json` link to this project was removed; the project-identification note was left in place.

## Deletion completion and consequence

The exact authorized target was project `vnm-uhc-fallback-20260815` (`prj_N3UBfjQ80G3u6Qj1g1GymAnsYFkj`) only. After deletion, the Vercel dashboard redirected to its project list with the deleted-project indicator, and a read-only API lookup by the exact ID returned 404 `not_found`. Vercel's [project deletion guidance](https://vercel.com/docs/projects/managing-projects) says deletion removes project deployments, domains, environment variables and settings. The 39 deployment records and their URLs are no longer available; this includes the project-only address `vnm-uhc-fallback-20260815.vercel.app`. The GitHub repository, Cloudflare Pages project, public DNS/domains, account-level Vercel GitHub integration, and unrelated Vercel projects were not targeted.

There is no Vercel rollback after deletion. Cloudflare Pages is the only supported production and rollback platform. Immediately after deletion, the public homepage and About page returned HTTP 200 over validated HTTPS with Cloudflare response headers and HSTS.

The pre-deletion retirement record is backed up in `C:\Users\Marcel Florin\Documents\VisioNovaMundi\backups\vnm-vercel-retirement-3fc2a794.bundle`. The bundle was verified to contain commit `3fc2a794f3532a780e6bc0ef9bc6ab012024e955` and has SHA-256 `D46E2F42A95864E26C2A9FBFD30EF2AACE6A9B671381478D06C14BE7E9274920`.

## Captured pre-deletion deployment inventory

All timestamps are UTC. The API returned 39 records, each with state `READY`. A blank target in the API is recorded as not specified; deployment IDs, source branch/commit, and deployment hostname are recorded exactly as returned.

| Deployment ID | Created (UTC) | State | Target | Source branch | Source commit | Deployment URL |
| --- | --- | --- | --- | --- | --- | --- |
| dpl_8ZvFXvNtYmib5WrXtHQcYDUQxFS2 | 2026-10-10 13:38:04.304Z | READY | production | `master` | `7da90697cc7ca9616e3653c81de2a34b02516f7e` | [open](https://vnm-uhc-fallback-20260815-4kchxfci1.vercel.app/) |
| dpl_FjbQJtmEQ19ZXR6TQ2oGinocCmZY | 2026-10-10 13:13:55.219Z | READY | not specified (API target omitted) | `feat/mecc-learning-update` | `af8e37082e300bac8896274c985b9a695a4badc0` | [open](https://vnm-uhc-fallback-20260815-klbj73b3t.vercel.app/) |
| dpl_2JKJYmDwEti9AATG8a6aND6WsTbk | 2026-10-09 09:47:28.015Z | READY | production | `master` | `a2d82395a526bb2c0ad8595063174d931e85d342` | [open](https://vnm-uhc-fallback-20260815-7whiooe10.vercel.app/) |
| dpl_4JBD3ZyjZYLNSEwDYdcWHakQ95pS | 2026-10-09 09:33:22.350Z | READY | not specified (API target omitted) | `docs/vercel-fallback-domain-cleanup-2026-10-09` | `868bbbf1cf6ee4123deaae20cd10d0ed2d293215` | [open](https://vnm-uhc-fallback-20260815-ia1pn5fot.vercel.app/) |
| dpl_B2KtrU4pur5o7VypWGjcc6bSSsSr | 2026-10-09 09:33:20.354Z | READY | not specified (API target omitted) | `docs/vercel-fallback-domain-cleanup-2026-10-09` | `7fa83e5a2ec2d905fa66c28f4a236ec440846af2` | [open](https://vnm-uhc-fallback-20260815-qrjii3vur.vercel.app/) |
| dpl_GjZA6yUZfk72TdTm1hh8wNLFZ2vg | 2026-10-06 13:54:03.193Z | READY | production | `master` | `a8c208401929709fccc70d758be404565edd8b56` | [open](https://vnm-uhc-fallback-20260815-9pbmfvaq3.vercel.app/) |
| dpl_2e1VQ5zmcXLJLgaCuhQ5uuVPV877 | 2026-10-06 13:49:27.734Z | READY | not specified (API target omitted) | `feat/circular-justice-research-page` | `431f2b22e9c085e6d783bb055d42f3410cfe144c` | [open](https://vnm-uhc-fallback-20260815-pl5igwi58.vercel.app/) |
| dpl_3MUYvqKumfj2syuTsbQ5RJ7mPgUU | 2026-10-05 15:19:32.767Z | READY | production | `master` | `4191ebb83fde44887479d73119a5f7f44d3095ce` | [open](https://vnm-uhc-fallback-20260815-831oju5dz.vercel.app/) |
| dpl_4yN61YkwYENenoatcyCmXHRL3qzy | 2026-10-05 15:12:21.744Z | READY | not specified (API target omitted) | `docs/update-vnm-production-2026-10` | `22e55d451518563450e93d292942d71f8595f6c2` | [open](https://vnm-uhc-fallback-20260815-anxjwd7qc.vercel.app/) |
| dpl_GEYKbNBtyC24DDehzfLMkpyWoHsC | 2026-10-05 14:58:42.238Z | READY | production | `master` | `e84d090946124003382a2ac86846e2ddf12b5d47` | [open](https://vnm-uhc-fallback-20260815-7ioyptkvl.vercel.app/) |
| dpl_A3BSh5ujZHH2ZYoxqP9ZbevjcjFm | 2026-10-05 14:43:29.120Z | READY | not specified (API target omitted) | `release/vnm-project-visuals-2026-10` | `a17ed04dbc24d41ac04a5a65cef3707ba35dc42a` | [open](https://vnm-uhc-fallback-20260815-4pgm392vc.vercel.app/) |
| dpl_D7kkDaPCitffgpPtDtoLeDTyhbsY | 2026-10-05 13:19:58.704Z | READY | not specified (API target omitted) | `release/vnm-project-visuals-2026-10` | `5bdcf5c6fb94890d0b2135b047b38c577d0d3b35` | [open](https://vnm-uhc-fallback-20260815-isjj5aiqe.vercel.app/) |
| dpl_pYbUQTAiVnkstCcF2Hm59qBCEoUF | 2026-10-05 11:16:33.126Z | READY | production | `master` | `bcfe4d1c58961f05cf9e5831edef8e856c05ae52` | [open](https://vnm-uhc-fallback-20260815-6ujlaxhvv.vercel.app/) |
| dpl_7aNkdJQtQb5odNNbtS5GaPPdZ8qa | 2026-10-05 10:54:58.364Z | READY | not specified (API target omitted) | `release/vnm-homepage-manifesto-2026-10` | `34cf8dcd0283909fc9bd5962809eeee9b82193ff` | [open](https://vnm-uhc-fallback-20260815-p1mfmsoha.vercel.app/) |
| dpl_9P3RofqRCCvBJgkmHqDqWmMxwDX8 | 2026-10-04 22:47:21.251Z | READY | production | `master` | `411dfa2e3d57b5461590de36418435a59119eba8` | [open](https://vnm-uhc-fallback-20260815-6hanr4fco.vercel.app/) |
| dpl_AHhnzqJwJAtdiSft4eVR4LUxuZEv | 2026-10-04 22:29:19.772Z | READY | not specified (API target omitted) | `release/vnm-site-redesign-2026-10` | `9eae7d1a4faf542142ed83a85d957b6a00d4535f` | [open](https://vnm-uhc-fallback-20260815-g01nefe8q.vercel.app/) |
| dpl_CRqvtuitvDr5yXMkdBauVC5ZT59B | 2026-10-04 22:16:33.271Z | READY | not specified (API target omitted) | `release/vnm-site-redesign-2026-10` | `82ddacdaca50bcc94240a25bedbd6237ae3f8a23` | [open](https://vnm-uhc-fallback-20260815-lpejw5mbr.vercel.app/) |
| dpl_DLKR9K1zMjkBrHAfQnvUBkkvbJk7 | 2026-10-04 21:55:21.199Z | READY | not specified (API target omitted) | `release/vnm-site-redesign-2026-10` | `627247f9d56488c70dd030826f23f5786ce025d8` | [open](https://vnm-uhc-fallback-20260815-lstn00hig.vercel.app/) |
| dpl_6aNroRDy2oJNjN9VA28eeVECqrE5 | 2026-10-03 23:13:07.400Z | READY | production | `master` | `b76b2f8aa0c8780f196b0003bfc1a091a843adbf` | [open](https://vnm-uhc-fallback-20260815-fekpzqh4b.vercel.app/) |
| dpl_Ax5wDqF938LE6dZ4PUvE1nMZscyC | 2026-10-03 22:53:30.448Z | READY | not specified (API target omitted) | `chore/vnm-release-fast-lane` | `6a2ed47235d848413f5dcfbc2edd94d0ba94da2d` | [open](https://vnm-uhc-fallback-20260815-hr10jqj09.vercel.app/) |
| dpl_9Kr87xgtd4N38NaHAuyQLqFv6oSq | 2026-10-03 21:57:25.925Z | READY | not specified (API target omitted) | `chore/vnm-release-fast-lane` | `37548e1cc33053bba66a5bc27f0d6b1cc5181366` | [open](https://vnm-uhc-fallback-20260815-i1kcmlwv0.vercel.app/) |
| dpl_7haYKwJoiQVyr1SGBP8MAEEUCFNi | 2026-10-03 21:03:47.068Z | READY | production | `master` | `f297acfceaaaa0284910b02719bd00e767bb9b99` | [open](https://vnm-uhc-fallback-20260815-od57l5r5s.vercel.app/) |
| dpl_YQZSj9W2oVZ12ugonCBrvYTom3mY | 2026-10-03 20:46:58.405Z | READY | not specified (API target omitted) | `docs/record-vnm-production-baseline` | `00fcbf89679ab3e1b50ef27cd190d3e53d27d2c4` | [open](https://vnm-uhc-fallback-20260815-ds0a53n02.vercel.app/) |
| dpl_GPjzgw38WnaVrxAiJNHq2Qc26MnN | 2026-10-03 20:27:22.653Z | READY | production | `master` | `b3f223bfac65717c1195821b3dfcf7109c18388b` | [open](https://vnm-uhc-fallback-20260815-3pst21non.vercel.app/) |
| dpl_Hk3mPrqQA4k7QAwCeeKxiCrqZTvf | 2026-10-03 19:33:40.259Z | READY | not specified (API target omitted) | `chore/vnm-release-check-runtime` | `3a4d83361b6f189b66416c2fa363ccd49bc6fdf4` | [open](https://vnm-uhc-fallback-20260815-a09f8ky1z.vercel.app/) |
| dpl_6eK2vDpy7qYrLzrdnaiNL1zwR76n | 2026-10-03 19:32:34.893Z | READY | not specified (API target omitted) | `docs/record-vnm-production-baseline` | `a8495116e6a36300cceb33f8f6456e03da2c5c44` | [open](https://vnm-uhc-fallback-20260815-fghslf3zv.vercel.app/) |
| dpl_EXE99rttfjdBdUvLUppXNCdPM3EG | 2026-10-03 18:57:10.866Z | READY | production | `master` | `f0a7068de969caac57668a56e041b6a51c1f0065` | [open](https://vnm-uhc-fallback-20260815-fwkto7w3k.vercel.app/) |
| dpl_nrUhHQ3oEHcg9BsfHXGPTibG4j7k | 2026-10-03 18:24:25.339Z | READY | not specified (API target omitted) | `feat/vnm-institutional-architecture` | `669543a774a2e2d02a06a13a4cf513b312bbb0e4` | [open](https://vnm-uhc-fallback-20260815-5n506yjnp.vercel.app/) |
| dpl_DEpFFCmCAUiPGXMk29uSu1zpsASY | 2026-10-03 17:27:16.737Z | READY | not specified (API target omitted) | `feat/vnm-institutional-architecture` | `a0ef86e904e661d1a04bdf5d58ad4a587c2267cb` | [open](https://vnm-uhc-fallback-20260815-alal2t9sy.vercel.app/) |
| dpl_3qnRe6TtynNw9psEh2DwvWBKynVK | 2026-10-02 23:15:12.360Z | READY | not specified (API target omitted) | `docs/record-vnm-production-baseline` | `c4c2d4da96795d3bb05f5a217185043ebd8d00dc` | [open](https://vnm-uhc-fallback-20260815-r3qxhnby1.vercel.app/) |
| dpl_5wqnLso6eMWKfd6thHbmjcrixpts | 2026-10-02 23:07:19.222Z | READY | production | `master` | `485451825ccb3d97d86f6c0ad50ea90dbe062f51` | [open](https://vnm-uhc-fallback-20260815-mjanbzod9.vercel.app/) |
| dpl_7U61EEvDMRiFZud7qQtQQMCXFtaT | 2026-10-02 22:59:22.600Z | READY | not specified (API target omitted) | `chore/vnm-release-hardening` | `7f5d684194f53b4b53631b309219a7b222ef0d20` | [open](https://vnm-uhc-fallback-20260815-8w5jnx87v.vercel.app/) |
| dpl_GZ56ALpwXjLxyFtArDMUnyhoowXG | 2026-10-02 22:51:46.558Z | READY | not specified (API target omitted) | `chore/vnm-release-hardening` | `120f8bffa69f069eb3bad40782a0a7e83988993f` | [open](https://vnm-uhc-fallback-20260815-hlpd4h2ov.vercel.app/) |
| dpl_2mCXaUsoHDgMVsKa6vo4GX1PHT12 | 2026-10-02 21:50:43.917Z | READY | production | `master` | `278500b7166f4ad1f8bafca03eaaa002cb8a4a39` | [open](https://vnm-uhc-fallback-20260815-cevuyw4vf.vercel.app/) |
| dpl_EprEFSv3LBfEK5Sg8A4SFa2SMfzZ | 2026-10-02 18:39:26.497Z | READY | production | `master` | `891e4e7523eaacad0a8f8846fa5023daa95d8929` | [open](https://vnm-uhc-fallback-20260815-kwj13ebxl.vercel.app/) |
| dpl_3sta7y3J1UJAyL4jL3VEaGPYVkDK | 2026-09-27 20:05:04.251Z | READY | production | `master` | `9e7e7a32bfd1d5cd8b13db11975c068a072ebb91` | [open](https://vnm-uhc-fallback-20260815-g8t721v50.vercel.app/) |
| dpl_BAjfkMoK4LNpRYuPjmjQFVEEs2dM | 2026-09-27 17:47:04.067Z | READY | production | `master` | `f0352a20d9971bc9ff3b168249ec29e4180cbab2` | [open](https://vnm-uhc-fallback-20260815-cubigr2og.vercel.app/) |
| dpl_DSEykPGcyHhQdHmugiqKxpxVrPCj | 2026-09-27 16:18:46.030Z | READY | production | `master` | `59b06fba53d982e0663c05ba3dff41e9d984b993` | [open](https://vnm-uhc-fallback-20260815-2r2mq0n96.vercel.app/) |
| dpl_FnNMaaaewE1bseYP5ZNvx24nxvQ3 | 2026-09-27 15:24:25.815Z | READY | production | `master` | `e0abef11733bd54b4ac8b8c2e4371ac1d4af9117` | [open](https://vnm-uhc-fallback-20260815-cqtboofsp.vercel.app/) |
