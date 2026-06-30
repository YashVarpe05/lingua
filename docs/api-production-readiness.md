# API Production Readiness

Lingua uses Expo Router API routes for work that must stay off the mobile client:
Clerk token checks, Supabase service-role leaderboard writes, Stream call tokens,
Gemini calls, and Vision Agent session proxying.

## Runtime Model

The app is already configured for Expo server output:

```txt
app.config.js
  expo.web.output = "server"
```

That is required so routes like `src/app/api/leaderboard/fetch+api.ts` are built
as server code instead of client code.

For production native builds, the app also needs a deployed server origin. Use
one of these approaches:

- Set the Expo Router `origin` to the deployed API/web URL.
- Or set `EXPO_UNSTABLE_DEPLOY_SERVER=1` in EAS so EAS can deploy the server and
  wire the origin during builds.

Do not hardcode a localhost origin for production builds.

## Route Map

| Route | Purpose | Production note |
| --- | --- | --- |
| `/api/leaderboard/fetch` | Read leaderboard rows after Clerk auth. | Uses Supabase service role on the server. Requires Supabase env vars in EAS. |
| `/api/leaderboard/upsert` | Add lesson XP to the current user's leaderboard row. | Uses Supabase service role on the server. Direct mobile table access stays blocked by RLS. |
| `/api/leaderboard/migrate` | Disabled public migration endpoint. | Must keep returning `404`. Run schema SQL from trusted admin tools instead. |
| `/api/explain-answer` | Ask Gemini for a short feedback explanation. | Uses standard `fetch`, so it is a good fit for Expo API routes. |
| `/api/pronunciation-score` | Send recorded audio to Gemini for beginner pronunciation scoring. | Keep request size limits and MIME validation in place. |
| `/api/stream` | Create a Stream token and lesson call. | Uses `@stream-io/node-sdk`; verify the exported server bundle and deployed route before relying on EAS Hosting. |
| `/api/agent/start` | Ask the Vision Agent service to join a Stream call. | `VISION_AGENT_BASE_URL` must be a deployed HTTPS service in production. Localhost only works during local development. |
| `/api/agent/stop` | Stop a Vision Agent session. | Same production requirement as `/api/agent/start`. |

## Vision Agent Service

The Vision Agent is a separate Python service in `vision-agent/`; it is not
hosted by EAS Hosting with the Expo Router API routes. Deploy it to a Python or
Docker host, then set `VISION_AGENT_BASE_URL` to that HTTPS origin.

The container entrypoint is:

```bash
uv run agent.py serve --host 0.0.0.0 --port ${PORT:-8000}
```

Cloud Run is the recommended host for the beta because it can run the existing
Docker service, provide HTTPS, and build from source without local Docker. Keep
the container listening on `0.0.0.0` and Cloud Run's `PORT` environment variable.
If Google Cloud billing is not available, `render.yaml` can deploy the same
Docker service on Render's free web service plan for testing.

The service needs `STREAM_API_KEY`, `STREAM_API_SECRET`, and a Gemini key. The
Vision Agents Gemini plugin expects `GOOGLE_API_KEY`; the local agent also maps
the app's existing `GEMINI_API_KEY` to `GOOGLE_API_KEY` when the latter is not
set. After the service is deployed, use the public HTTPS base URL as
`VISION_AGENT_BASE_URL` in EAS and redeploy EAS Hosting.

For reliable video sessions, run the agent as an always-on service rather than a
short-lived serverless function. Cloud Run can do this with CPU allocated beyond
request handling and at least one minimum instance, but that can incur costs.
For a lower-cost beta, start with the smallest CPU/memory that passes QA and
scale up only when sessions fail or cold starts are too slow.

Use `scripts/deploy-vision-agent-cloud-run.ps1` to deploy this service to Cloud
Run once the Google Cloud project has billing, API enablement permissions, and
the required secret values available.

For the temporary free Render path:

1. Create a Render Blueprint from the GitHub repo.
2. Use the root `render.yaml`.
3. Add `STREAM_API_KEY`, `STREAM_API_SECRET`, and `GEMINI_API_KEY` in Render when
   prompted.
4. Copy the Render service URL into EAS as `VISION_AGENT_BASE_URL`.
5. Redeploy EAS Hosting.

If creating a Render Web Service manually instead of using Blueprint, choose
Docker, not Node. Use the root `Dockerfile`, leave the build/start commands
empty, and do not let Render run `npm install` or `node expo-router/entry`.

Render free services can sleep when idle, so the first AI teacher session after
idle time can be slow or fail. Treat this as a beta/demo option, not the final
production host.

## Required EAS Environment Variables

Client-readable values:

```txt
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
EXPO_PUBLIC_API_BASE_URL
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
POSTHOG_PROJECT_TOKEN
POSTHOG_HOST
```

Server-only values:

```txt
CLERK_SECRET_KEY
CLERK_AUTHORIZED_PARTIES
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
GEMINI_API_KEY
GEMINI_MODEL
STREAM_API_KEY
STREAM_API_SECRET
VISION_AGENT_BASE_URL
EXPO_UNSTABLE_DEPLOY_SERVER
```

`CLERK_AUTHORIZED_PARTIES` must include the exact API/web origins that will
send Clerk tokens. For local web QA this usually includes
`http://localhost:8081`, `http://127.0.0.1:8081`, and `http://[::1]:8081`.
For deployment, add the deployed HTTPS origin, for example
`https://your-deployment-url.example`. If you test on another local port, add
that origin too before expecting signed-in API calls to pass.

Native builds cannot use relative `/api` URLs. Set `EXPO_PUBLIC_API_BASE_URL`
to the deployed Expo Hosting origin, such as
`https://your-deployment-url.example`, before creating Android or iOS builds.

Backend QA connects directly to Supabase Postgres using `DATABASE_URL`. Keep
TLS verification strict in deployed QA by configuring Supabase's database CA
certificate with `DATABASE_SSL_CA_PATH`, `DATABASE_SSL_CA`, or `PGSSLROOTCERT`.
`DATABASE_SSL_REJECT_UNAUTHORIZED=false` is only a local machine workaround for
certificate-chain issues and should not be used with a deployed `API_BASE_URL`.

Use EAS environment variables or the Expo dashboard for production. Never expose
`CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`,
`GEMINI_API_KEY`, or `STREAM_API_SECRET` in client code.

## Verification

Before deploying:

```bash
npm run qa:api
npm run lint
npm run typecheck
npm run auth:check
npm run qa:backend
npm run qa:progress
npx expo export --platform web
```

After deploying:

```bash
API_BASE_URL=https://your-deployment-url.example npm run auth:check
API_BASE_URL=https://your-deployment-url.example npm run qa:backend
```

Then inspect EAS Hosting logs, requests, and crashes for the API routes.
