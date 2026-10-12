# StudyBridge · 학습의 다리

A bilingual academic reading and contextual vocabulary MVP for Korean students studying in English. Built for Jisun Kim's portfolio with Next.js App Router, TypeScript, Tailwind CSS, Supabase email/password authentication and PostgreSQL, and server-side OpenAI structured outputs.

**The integration code is implemented; live Supabase, AI, email delivery and cross-device persistence have not been verified because credentials were not supplied.** `/demo` is a labeled, separate sample using prewritten content and tab-memory storage. It never pretends to call AI or save to a real account. See [VALIDATION.md](VALIDATION.md).

## Local setup

Use Node.js 24 (Node 20.9+ is required by Next.js; Node 24 was tested) and npm. Use the existing checkout in an isolated Codex task; no Git worktree is needed.

```sh
npm ci
cp .env.example .env.local # only if you do not already have this file
# Fill the real settings described below; never commit .env.local.
npm run dev
```

Open the application on port 3000 in your own local development environment. Without configuration, `/auth` explicitly reports missing Supabase settings, and the protected APIs fail closed. `/demo` works without credentials. In cloud onboarding, validate with internal HTTP requests; no user-facing localhost preview is assumed.

### Required services and environment settings

| Setting                                | Purpose                                                                               | Browser exposure                   |
| -------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Your project's HTTPS API URL                                                          | Public                             |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (legacy anon key is also compatible)                         | Public; RLS enforces authorization |
| `STUDYBRIDGE_AI_KEY`                   | OpenAI API key, server only                                                           | Never                              |
| `AI_MODEL`                             | Structured-output capable model; default `gpt-4.1-mini`                               | Server only                        |
| `NEXT_PUBLIC_SITE_URL`                 | Exact application origin, e.g. your local port 3000 origin or production HTTPS domain | Public                             |

`OPENAI_API_KEY` is also accepted on conventional hosts. `STUDYBRIDGE_AI_KEY` is the recommended name for Codex cloud proxy bindings because `OPENAI_` names are reserved by that platform. Do not use a Supabase service-role key: this app uses the caller's authenticated session and RLS. No paid resources are created automatically.

Restricted cloud networking needs `api.openai.com` and your **exact** `<project-ref>.supabase.co` host (or configured Supabase custom API domain). Add that project host in environment settings after choosing your existing project. Package installation uses `registry.npmjs.org`; official docs use `supabase.com`, `platform.openai.com`, `nextjs.org`, and official GitHub sources. GitHub PR operations also need `api.github.com`. Never paste secret values into chat. Enter the AI key through secure environment settings.

### Supabase database

Create or select a project yourself, then apply `supabase/migrations/202610120001_studybridge.sql` in the Supabase SQL editor, or use Supabase CLI migrations against your selected project:

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Review the migration before applying. It creates:

- `vocabulary`, with authenticated owner-only SELECT/INSERT/DELETE RLS policies and no UPDATE permission.
- An owner + normalized expression + source sentence SHA-256 unique index. Case and surrounding spaces are normalized. Same expression with a different source sentence is allowed. Inserts are atomic, and duplicate API saves return the original entry.
- Database-generated timestamps enforced by a trigger, including direct authenticated inserts.
- A private durable hourly request counter and an authenticated-only `consume_ai_request()` RPC. Its atomic upsert allows 30 AI operations per user per UTC clock hour across processes and deployments. Translation and explanation share this allowance. Failed provider calls can consume an attempt; boundaries can permit bursts. The RPC fails closed if migrations are missing.

No table stores full reading material. Only explicitly saved vocabulary contains the selected source sentence, its Korean translation, the expression, usage, contextual/general meanings, two generated examples, material title, owner, and timestamp. Full excerpts remain in page memory and are lost on navigation/reload. Saved entries remain in Supabase after logout and should be available on other devices after login; that behavior requires live verification.

### Supabase authentication and redirects

1. Enable **Email/password** in Authentication → Providers. Google login is intentionally absent.
2. In Authentication → URL Configuration, set **Site URL** to the exact application origin. Set `NEXT_PUBLIC_SITE_URL` to the same origin.
3. Allow your local and production callback URLs: `/auth/callback` and `/auth/callback?next=/auth?mode=update`. Add `/auth/confirm` for token-hash email links. Use explicit origins and paths in production; avoid broad wildcard domains. For local development, Supabase's local-only wildcard `http://localhost:3000/**` can cover both callback paths if needed.
4. Decide whether **Confirm email** is enabled. With confirmation enabled, signup shows a check-your-email state. With confirmation disabled, a returned session redirects to `/reading` immediately. Test both the selected policy and actual mail delivery.
5. Browser signup uses PKCE and `emailRedirectTo=/auth/callback`. Password reset uses `/auth/callback?next=/auth?mode=update`. The default code-based callback requires the browser that initiated the flow to retain its PKCE verifier.
6. For email links that work without that browser's verifier (e.g. opened on another device), configure Supabase email templates to use token hashes. Confirmation link:
   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup"
     >Confirm email</a
   >
   ```
   Password recovery link:
   ```html
   <a
     href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery"
     >Reset password</a
   >
   ```
   Keep the URL allowlist and templates consistent. `/auth/confirm` only accepts signup, recovery, and email OTP types; recovery goes to the new-password form. Both callback routes reject arbitrary `next` URLs to prevent open redirects.
7. Configure production SMTP in Supabase if needed. Development email delivery, provider limits, link expiry, verification, password recovery, and cross-browser behavior must be checked against your actual project. Set a password policy of at least 8 characters to match the client form.

## Reading and vocabulary workflow

1. Sign in; protected pages check the user on the server.
2. Paste an English excerpt (maximum 12,000 characters) and optionally enter a material title. Untitled excerpts use `Untitled material`. Edit punctuation in the preview before translating.
3. Translate. Sentences retain their exact source strings, paragraph grouping, source order, and deterministic IDs. Abbreviations and decimal points are masked in a same-length segmentation copy; the original English is sliced unchanged. Unpunctuated passages remain intact. There is a 300-sentence cap. Extremely unusual abbreviations/transcripts may still require punctuation correction in the preview.
4. Read aligned English/Korean rows; on narrow screens the pair stacks within each sentence block. AI translates with the whole excerpt's sentence/paragraph context, rather than isolated requests. Unknown, duplicate, empty or missing IDs are rejected, and input remains available for retry.
5. Click a word, or select a phrase inside one English sentence and use “선택한 구 설명하기”. Multiple-sentence selections show a helpful error. Tab/Enter opens word explanations; keyboard text selection with Shift+arrows and the phrase button is supported by browser-native selection. The panel highlights the expression/sentence, uses focus management and Escape to close, and becomes a bottom sheet on mobile.
6. Context explanations are reused in the current reading session. **Selection does not save.** Click “내 어휘에 저장” to persist. The confirmation appears only after the DB response; errors retain the detail for retry. Saving disables repeat submissions.
7. Search vocabulary by expression, contextual Korean meaning or material title; hide meanings for self-review, view details, delete with confirmation, or export your complete loaded collection as JSON. Export is scoped to the authenticated user and includes all loaded entries, not only search results.

Input is sent to OpenAI for processing. Review the provider's current data handling policy and avoid submitting confidential or sensitive material. AI examples are labeled as generated examples rather than quotations. AI translations and explanations can be wrong; compare with the original. The app does not log full texts, provider payloads or secrets. Configure deployment request logging accordingly.

## Architecture and security

- `app/reading` and `app/vocabulary`: protected server pages; React clients handle transient reading/session UI.
- `proxy.ts`: Supabase cookie refresh before protected routes, using `getAll`/`setAll` on both request and response. Authorization is repeated in endpoints with `auth.getUser()`; the UI is not the security boundary.
- `/api/translate` and `/api/explain`: authenticated Node endpoints, bounded streamed JSON input, Zod validation, database-backed per-user rate limiting, server-only OpenAI calls, configured model, structured response validation. No API keys are serialized to browser code.
- `/api/vocabulary`: owner-filtered list and explicit save, with Zod-validated content. User ID comes from server authentication; timestamps come from PostgreSQL. Duplicate inserts use a DB unique constraint.
- `/api/vocabulary/[id]`: owner-filtered deletion. RLS is the independent database boundary for all data operations.
- Mutating endpoints check the Origin against the configured site origin. Session cookies use Supabase SSR's settings. User data responses use no-store caching; generated source text is treated as data in the AI system instruction.
- `lib/contracts.ts`, `lib/sentences.ts`, and `lib/entries.ts`: shared validation, alignment/selection, and storage mapping.
- `/demo`: separate prewritten sample. In-memory sample storage is not a persistent personal collection and is labeled accordingly.

No PDF/audio processing, billing, admin, Google login, quizzes, spaced repetition or gamification is included.

## Checks

```sh
npm run typecheck
npm test
npm run build
npm run test:browser
```

Unit/component tests mock authentication, DB and AI HTTP responses. Browser tests use real Chromium against the production build, with sample data instead of live integrations. Cloud Chromium is installed at `/usr/bin/chromium`; elsewhere set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to your installed browser executable or adjust `playwright.config.ts` to use Playwright's bundled browser after `npx playwright install chromium`.

For an additional real PostgreSQL migration/RLS test, point `psql` at an **empty disposable PostgreSQL database** with permission to create roles and extensions:

```sh
# Use secure PGHOST/PGPORT/PGUSER/PGDATABASE configuration. Never use your live Supabase project.
psql -f tests/database.sql
```

This creates two simulated Supabase identities, applies the actual migration, checks RLS ownership and deletion, anonymous denial, duplicate context prevention, timestamp enforcement, and rate limiting, and rolls everything back. It intentionally creates `anon` and `authenticated` roles, an `auth` schema and `auth.uid()` fixture. It is not a test of hosted Supabase Auth or email. Run only on an empty database. See [VALIDATION.md](VALIDATION.md) for the executed results and remaining checks.

## Production deployment (manual; not performed)

Use a Node-capable Next.js host, such as an existing Vercel project or a Node 24 server. Do not use static export: authenticated pages and AI routes require server execution.

1. Apply the migration to your selected Supabase project; configure auth URLs/templates and SMTP as above.
2. Securely set all required variables on the host before building. `NEXT_PUBLIC_*` values are embedded at build time, so rebuild when they change. Do not commit secrets.
3. Run `npm ci && npm run build`; for a Node server run `npm run start`. Configure HTTPS and the application domain; set its exact origin as Site URL and `NEXT_PUBLIC_SITE_URL`.
4. Allow outbound HTTPS to your Supabase API domain and `api.openai.com`. Use a structured-output-compatible model. Give AI routes a runtime timeout of at least 70 seconds (the provider request timeout is 60 seconds with one SDK retry; allow up to 130 seconds if retries are expected). Restrict host request logging so it does not record request bodies.
5. Run the live checklist in `VALIDATION.md` using two test accounts before calling the application operational.

No resources, website deployment, environment publication, or LinkedIn post are performed by this project. The LinkedIn draft is in [LINKEDIN-POST.md](LINKEDIN-POST.md).

## Official integration sources consulted

The official documentation websites returned proxy 403 responses in this cloud environment. Current official GitHub sources were accessible and consulted on October 12, 2026:

- [Supabase SSR design / cookie refresh](https://github.com/supabase/ssr/blob/main/docs/design.md)
- [OpenAI Node SDK README](https://github.com/openai/openai-node/blob/master/README.md) and [Zod structured output helpers](https://github.com/openai/openai-node/blob/master/src/helpers/zod.ts)
- The installed Next.js 16.4 documentation for `allowedDevOrigins` and `agentRules` was also read when checking development startup. Only loopback `127.0.0.1` was added to allowed development origins.
- [Next.js proxy reference](https://github.com/vercel/next.js/blob/canary/docs/01-app/03-api-reference/03-file-conventions/proxy.mdx)

Review the current hosted documentation when configuring your actual Supabase and deployment project, particularly email templates and redirect allowlists.
