# Deploying to AWS Amplify Hosting

This document is the canonical, click-by-click guide for shipping the Alumni Knowledge Network **client** (the SvelteKit SPA) to AWS Amplify Hosting. The NestJS **server** runs on a separate AWS service (App Runner / Elastic Beanstalk / ECS Fargate / EC2) and the client is pointed at it via a single environment variable.

If you only want the TL;DR, skip to **[Five-minute deploy](#five-minute-deploy)** at the bottom.

---

## Architecture

```
                         ┌─────────────────────────┐
   Browser ─────────────▶│  AWS Amplify Hosting    │  (this repo's `client/build`)
                         │   • CloudFront CDN      │
                         │   • SvelteKit SPA       │
                         └────────────┬────────────┘
                                      │ fetch(VITE_API_URL)
                                      ▼
                         ┌─────────────────────────┐
                         │  NestJS API (separate)  │  App Runner / ECS / EB / EC2
                         │   • /api/* routes       │
                         │   • Prisma → RDS        │
                         │   • S3 + SES            │
                         └─────────────────────────┘
```

Why the split? Amplify Hosting is purpose-built for static and pre-rendered front-ends. The NestJS server has a long-running database connection, scheduled work, and AWS SDK clients — it belongs on a compute service, not on the CDN edge. The client is configured as a pure SPA (`adapter-static` + `ssr: false`) so it deploys to Amplify with a single click.

---

## What's already wired up for you

The repo ships with everything Amplify needs. You should not have to edit any of these files for a normal deploy:

| File | Purpose |
| --- | --- |
| `amplify.yml` | Build spec: enables pnpm, installs the workspace, runs `pnpm --filter client build`, uploads `client/build/`. |
| `customHttp.yml` | Security headers (HSTS, X-Frame-Options, etc.) and long-cache rules for hashed JS/CSS bundles. |
| `client/svelte.config.js` | Uses `@sveltejs/adapter-static` with `fallback: 'index.html'` to produce a SPA bundle. |
| `client/src/routes/+layout.ts` | Disables SSR and prerendering so Auth0's SPA SDK works at runtime. |
| `client/.env.example` | Lists every variable Amplify needs. |

---

## Prerequisites

Before opening the Amplify Console you need three things ready:

1. **An Auth0 application** (Single-Page Application type)
   - Note your **Domain**, **Client ID**, and **API audience**.
   - Add the eventual Amplify URL to **Allowed Callback URLs**, **Allowed Logout URLs**, and **Allowed Web Origins**. You can add a placeholder for now and update it after the first deploy when Amplify hands you a `https://main.<id>.amplifyapp.com` URL.
2. **A deployed NestJS backend** with a public HTTPS URL (see [Backend deployment](#backend-deployment) below).
3. **Your repository pushed to GitHub, GitLab, Bitbucket, or AWS CodeCommit** — Amplify pulls source straight from the provider.

---

## Step 1 — Connect the repository

1. Sign into the AWS Console and go to **AWS Amplify** → **Hosting**.
2. Click **Create new app** → **Host web app**.
3. Pick your Git provider, authorize Amplify, then choose this repository and the branch you want to deploy (typically `main`).
4. Click **Next**.

Amplify will scan the repo and detect `amplify.yml`. **Do not edit the build settings in the Console.** The committed file is the source of truth — overrides made in the UI silently mask the file and cause configuration drift later.

---

## Step 2 — Tell Amplify it's a monorepo

The repo holds three packages (`client`, `server`, `packages/database`) but Amplify only deploys the client. Two ways to wire it:

**Option A — Recommended: leave it alone.** The committed `amplify.yml` already points `baseDirectory` at `client/build`, so Amplify will install the workspace at the root and pick up the right artifact. No console toggles needed.

**Option B — Use Amplify's monorepo flag.** If you prefer the Console to show "Monorepo project" in the build settings panel, expand **App settings** → **General settings** → **Build settings** → **Edit** and check **Monorepo project**. Set the **Monorepo app root** to `client`. (Skip this if you went with option A.)

---

## Step 3 — Configure environment variables

In the Console:

1. Open your app → **App settings** → **Environment variables** → **Manage variables**.
2. Add each row below. **Branch** can be left as *All branches* unless you want per-branch overrides.

| Key | Example value | Notes |
| --- | --- | --- |
| `VITE_API_URL` | `https://api.your-domain.com/api` | Public URL of the NestJS backend, **including** the `/api` prefix. No trailing slash. |
| `VITE_AUTH0_DOMAIN` | `your-tenant.us.auth0.com` | From the Auth0 SPA application. |
| `VITE_AUTH0_CLIENT_ID` | `abc123...` | From the Auth0 SPA application. |
| `VITE_AUTH0_AUDIENCE` | `https://api.akn.example` | The API identifier configured in Auth0 → APIs. |

> **Why `VITE_` prefixes?** Vite only inlines variables whose name starts with `VITE_` into the browser bundle. Anything else stays server-side and is invisible to the client. This is intentional — never put secrets here. The Auth0 *Client ID* is public by design (SPA flow); the *Client Secret* must never appear on the client.

3. Click **Save**.
4. Trigger a redeploy from **Hosting environments** → your branch → **Redeploy this version**. Environment variables are baked in at build time; without a rebuild they don't take effect.

### Per-branch environment variables (optional)

If you preview branches (`develop`, `staging`, …) point them at a different backend by setting overrides under **Environment variables** → **Add variable** → choose a specific branch.

---

## Step 4 — Add the SPA rewrite rule

Without this rule, deep links like `https://your-app.com/profile/me` return a 404 because Amplify looks for a literal `/profile/me` file. The rule tells Amplify to serve `index.html` for anything that isn't a real asset, so the SvelteKit router can take over.

1. Open your app → **App settings** → **Rewrites and redirects** → **Edit**.
2. Click **Add rewrite/redirect** and fill in:

| Source address | Target address | Type |
| --- | --- | --- |
| `</^[^.]+$\|\.(?!(css\|gif\|ico\|jpg\|jpeg\|js\|png\|txt\|svg\|woff\|woff2\|ttf\|map\|json\|webp\|xml\|mp4\|webm)$)([^.]+$)/>` | `/index.html` | `200 (Rewrite)` |

3. Click **Save**.

If you'd rather paste JSON (Console supports a JSON editor in the same view):

```json
[
  {
    "source": "</^[^.]+$|\\.(?!(css|gif|ico|jpg|jpeg|js|png|txt|svg|woff|woff2|ttf|map|json|webp|xml|mp4|webm)$)([^.]+$)/>",
    "target": "/index.html",
    "status": "200",
    "condition": null
  }
]
```

The regex matches "any path with no file extension, OR any path whose extension is not one of these well-known asset extensions." Real static assets are served as-is; anything else is rewritten to the SPA shell.

---

## Step 5 — Deploy

After steps 1–4, click **Save and deploy** (or **Redeploy this version** if you set env vars after the first run). Amplify will:

1. Provision a build container.
2. Run `corepack enable && corepack prepare pnpm@latest --activate`.
3. Run `pnpm install --frozen-lockfile` from the repo root.
4. Run `pnpm --filter client build`.
5. Upload `client/build/**` to its CDN.
6. Apply your rewrites and `customHttp.yml` headers.

Build duration is typically 2–4 minutes cold, ~60 seconds warm.

When it finishes, click the green **Domain** link at the top of the branch page (something like `https://main.d1abc123.amplifyapp.com`). The app should load.

### Update Auth0 with the live URL

Once you have the Amplify URL, go back to your Auth0 SPA application and add it (and `https://main.<id>.amplifyapp.com/login` if you want a more specific callback) to:

- **Allowed Callback URLs**
- **Allowed Logout URLs**
- **Allowed Web Origins**

Without this, login redirects fail with `Callback URL mismatch`.

---

## Step 6 — (Optional) Custom domain

1. App → **Domain management** → **Add domain**.
2. Type your apex domain (e.g. `akn.example.com`). Amplify provisions an ACM certificate automatically.
3. If your domain is registered in Route 53 in the same account, Amplify creates the records for you. Otherwise it shows the CNAME records to add at your DNS provider.
4. Wait 5–30 minutes for DNS + certificate validation. Status will move to **Available**.
5. Update Auth0's allowed URLs to include the custom domain.

---

## Backend deployment

Amplify Hosting will not run NestJS. Pick one of:

| Service | When to use it | Pointers |
| --- | --- | --- |
| **AWS App Runner** | Easiest. Push a container to ECR (or point at the repo), App Runner handles scale-to-zero, TLS, and a public URL. | Build a Dockerfile around `server/`, expose port `3000`, set the env vars listed in `server/.env.example`. |
| **Elastic Beanstalk (Node.js platform)** | Good if you don't want containers. EB runs `pnpm install && pnpm run build && node dist/main`. | Use the Node.js 20+ platform; configure env vars in the EB console. |
| **ECS Fargate behind ALB** | Best for production with VPC peering to RDS, autoscaling, etc. | Standard container deployment; mind security groups for the RDS instance. |

Whichever you pick, the backend needs the variables in `server/.env.example`:

- `DATABASE_URL` — Postgres connection string (typically RDS).
- `AUTH0_DOMAIN`, `AUTH0_AUDIENCE` — for JWT validation.
- `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_SES_SENDER` — service config.
- **Do not** set `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` on AWS compute. Attach an IAM role to the service instead and remove those keys from the environment. The AWS SDK picks up the role automatically.

CORS is already enabled (`server/src/main.ts:6`). You can tighten it to your Amplify domain by replacing `app.enableCors()` with `app.enableCors({ origin: 'https://your-amplify-url' })` once you know the final hostname.

---

## Five-minute deploy

For experienced users:

1. **Auth0**: SPA app, note Domain / Client ID / Audience.
2. **Backend**: deploy the NestJS server somewhere with a public HTTPS URL.
3. **Amplify Console** → **Host web app** → connect repo → branch → next.
4. **Environment variables**: paste in `VITE_API_URL`, `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`.
5. **Rewrites and redirects**: add the regex → `/index.html` → `200 (Rewrite)`.
6. **Save and deploy**.
7. Add the new Amplify URL to Auth0's allowed URLs.

Done.

---

## Troubleshooting

**Build fails with `ERR_PNPM_NO_LOCKFILE` or `Cannot find module @sveltejs/adapter-static`.**
The lockfile is out of sync with `package.json`. Run `pnpm install` locally, commit `pnpm-lock.yaml`, and push.

**Build succeeds but blank page in production.**
The `_app/immutable/...` chunks usually 404 in this case. Double-check that `baseDirectory` in `amplify.yml` is `client/build` (no leading slash) and that you haven't set a custom **Build output directory** override in the Console that conflicts with the file.

**`401 Unauthorized` on every API call.**
The browser is calling Auth0 with the wrong audience or hitting the backend without a token. Confirm `VITE_AUTH0_AUDIENCE` exactly matches the API identifier in Auth0 → APIs (it's case-sensitive) and that the backend's `AUTH0_AUDIENCE` matches the same value.

**`Callback URL mismatch` after sign-in.**
The Amplify domain is not registered in Auth0. Add it to **Allowed Callback URLs**, **Allowed Logout URLs**, and **Allowed Web Origins**, then retry.

**Deep links 404.**
Step 4 (the SPA rewrite) was not applied. Re-check **App settings** → **Rewrites and redirects**.

**`pnpm: command not found` in the build log.**
The build container's image doesn't have corepack on the `PATH`. Switch the Amplify build image to **Amazon Linux 2023** (Console → **App settings** → **Build settings** → **Build image settings** → `aws/codebuild/amazonlinux-x86_64-standard:5.0` or newer). Recent images ship Node 20 with corepack pre-enabled.

**Browser console: `import.meta.env.VITE_*` is `undefined`.**
The variable was added to Amplify *after* the last build. Trigger **Redeploy this version** to bake the new value into the bundle.

---

## Updating the deployment

Push to the configured branch — Amplify watches the branch and redeploys automatically. To roll back, open the branch's deployment history and click **Redeploy this version** on the previous successful build.

To change a variable, update it in **Environment variables**, then **Redeploy this version**. There is no zero-downtime config swap because variables are compiled into the JS bundle.
