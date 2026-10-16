# Validation report

Executed in the Codex cloud environment on October 12, 2026. These results do not establish that the hosted authentication, database, AI or email integrations work.

## Real local checks

- Node 24.19.0 / npm 11.9.0 dependency installation completed with TLS verification enabled and a committed npm lockfile.
- TypeScript check passed.
- Next.js production build passed. Protected pages use dynamic rendering; authenticated API routes require server execution.
- Chromium desktop/mobile production-server tests exercise the shared reading component in explicitly labeled sample mode. All 8 tests passed (4 desktop and 4 mobile).
- PostgreSQL 17.11: the actual schema migration ran successfully on an empty temporary local database. Tests passed for two-user RLS read isolation, forbidden forged-owner inserts, cross-user deletion denial, owner deletion, UPDATE privilege denial despite simulated broad Supabase default grants, anonymous read/RPC denial, contextual duplicate prevention, same expression with a different source, forced database timestamps, 30-per-user-hour rate limiting, and separate user allowances. `auth.users` and `auth.uid()` were fixtures. This verifies real PostgreSQL SQL and policies, **not hosted Supabase identity or its API**. All fixture SQL rolled back. Debian package signatures/checksums remained enabled during local tool preparation.

## Mocked checks

- 23 Vitest tests passed: sentence preservation and aligned ID validation (including duplicate/missing/unknown/empty IDs), input limits, complete vocabulary payload validation, trusted owner assignment, case/space normalization, vocabulary search, authentication requirements on AI/list/save/delete endpoints, origin rejection, missing AI key state, malformed translation response, owner-filtered list/delete, complete paginated vocabulary retrieval, save error/retry, DB duplicate response, durable limiter success/exhaustion/failure, and reading component translation/explanation retries, explicit save, no automatic save and session explanation cache.
- Auth, hosted DB, and provider responses in these tests are mocks. Save-success tests are not evidence of a real Supabase insert or AI request.
- Browser samples use prewritten translations/explanations and memory-only storage. They test UI behavior, keyboard selection/focus, phrase bounds, mobile panel geometry, search, hide meanings, detail view, JSON download, confirmation and deletion. Configuration-needed redirects/API errors are tested without credentials.

## Unverified real integrations — required before operational use

Credentials were absent: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and an application AI key were not configured. No live service was created.

1. **Supabase Auth:** signup, actual email verification, password sign-in, cookie refresh/expiry, sign-out, expired links, and both password-reset request and completion.
2. **Email delivery:** inbox receipt and link behavior with your configured SMTP and selected confirmation policy.
3. **Hosted Supabase database/API:** migration execution in your actual project, authenticated list/save/delete/export, and RLS isolation using two real accounts. Local SQL tests do not substitute for this.
4. **OpenAI:** real provider authentication, model access, Korean translation fidelity, contextual explanations, structured output alignment and provider failure behavior. No fabricated translation was returned as a real AI result.
5. **Persistence across devices:** save, sign out, then sign in from another browser/device with the same account; verify records remain. Verify a second account cannot read/export/delete those records.
6. **Production hosting:** domain, HTTPS, redirect URLs, server runtime/timeouts, network access, host log settings and deployment. No site was deployed or published.
7. **Manual mobile selection:** automated tests set browser-native selection ranges. Real touch long-press/selection handles on iOS Safari and Android browsers need device testing. Chromium mobile emulation is not a physical device test.

## Network and Git handoff

Official documentation sites returned proxy 403. Official Supabase/OpenAI/Next.js GitHub sources were fetched and consulted. Draft networking additions are saved for environment settings; draft saving does not itself apply runtime networking or publish an environment. Add your exact Supabase project API hostname after selecting the project.

The remote repository initially had no refs/commits, including no `main` base. Native Git read and push access worked. The implementation was committed and pushed on `feat/studybridge-mvp`. The first PR attempt failed because `main` did not exist. Only the empty bootstrap commit (`541ec92138cafeb254f9f42390cb26366b8d2005`) was then published as `main`, giving the feature a common base without merging application code.

PR creation succeeded: https://github.com/jisun129/studybridge/pull/1 (base `main`, head `feat/studybridge-mvp`). No merge, force-push, website deployment or LinkedIn publication occurred. Repository diffs were reviewed for secrets and unrelated work; only placeholder configuration is committed. The working tree was clean after implementation.

Because this was an empty remote, GitHub automatically selected the first pushed feature branch as its default. The attempted API change to default `main` failed with HTTP 403, `Resource not accessible by integration`. **The repository owner should set Settings → General → Default branch to `main`.** The PR is already created and can be reviewed without changing that setting. Initial read-only GitHub API access also returned `Forbidden`, while the later scoped PR creation worked; permissions are operation-specific.

## Reusable cloud configuration

Saved `install_script` (frozen npm install and production build), `start_skill` (existing checkout, startup and readiness checks), non-secret setting requirements, the server-only `STUDYBRIDGE_AI_KEY` requirement, and networking additions. The install commands were executed successfully with `npm ci` and `npm run build`. The production startup was exercised by all browser tests. `npm run dev` was also started and checked with the sample explanation UI and the honest Supabase configuration-needed auth page. Draft persistence is confirmed; runtime configuration application, user publication, and restoration in a fresh task are not verified. The exact Supabase project hostname still needs to be added by the user.
