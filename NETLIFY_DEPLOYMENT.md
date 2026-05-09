# Deploy AIDRA on Netlify

This app is a **Vite + React** SPA. Netlify builds with `npm run build` and serves the `dist` folder. Settings are in **`netlify.toml`** at the project root (same folder as `package.json`).

---

## Before you deploy (local check)

From the **`AI-AIDRA`** folder (where `package.json` lives):

```bash
npm install
npm run build
npm run preview
```

Open the URL shown (usually `http://localhost:4173`). If that works, Netlify should be able to build the same way.

---

## Important: repository root vs subfolder

| Your Git repo contains… | In Netlify: **Base directory** |
|-------------------------|--------------------------------|
| Only this app (files like `package.json`, `vite.config.ts` at repo root) | Leave **empty** or `.` |
| Parent folder (e.g. `AI FINAL`) and the app is inside **`AI-AIDRA/`** | Set to **`AI-AIDRA`** |

If the base directory is wrong, Netlify will not find `package.json` or `netlify.toml` and the build will fail.

---

## Option A — Netlify UI (recommended)

1. Push this project to **GitHub** (or GitLab / Bitbucket). If the app is in a subfolder, push the whole repo; you will set the base directory in step 4.

2. Go to [app.netlify.com](https://app.netlify.com) and sign in.

3. **Add new site** → **Import an existing project** → connect your Git provider → pick the repository.

4. **Build settings** (Netlify usually reads `netlify.toml`; confirm they match):

   | Setting | Value |
   |---------|--------|
   | **Base directory** | Empty if repo root is the app; otherwise `AI-AIDRA` |
   | **Build command** | `npm run build` |
   | **Publish directory** | `dist` |

5. **Deploy**. Wait for the build log to finish green.

6. Open the generated URL (`https://something.netlify.app`). Hard-refresh once if you see a stale page.

---

## Option B — Netlify CLI

Install CLI (once): `npm install -g netlify-cli`

From **`AI-AIDRA`**:

```bash
npm install
npm run build
netlify login
netlify init          # link site (first time) or use existing site
netlify deploy --prod --dir=dist
```

For a linked site, `netlify.toml` in the current directory is used when you run commands from this folder.

---

## What `netlify.toml` does

- **`[build]`** — `npm run build`, publish `dist`, **Node 20** for builds.
- **Redirect `/*` → `/index.html` (200)** — SPA fallback so client-side routing does not 404 on refresh (static files under `/assets/` are still served normally; **`force` is not used** so real files are not overridden).
- **Headers** — long cache for hashed assets under `/assets/`, no heavy cache for `*.html`.

---

## Environment variables (optional)

This app runs entirely in the browser unless you add APIs. If you later use `import.meta.env.VITE_*` variables:

1. Netlify: **Site configuration** → **Environment variables**
2. Add names like `VITE_MY_API_URL`
3. Trigger a new deploy after changes

Copy names from **`.env.example`** if present. Never commit real secrets in the repo.

---

## After deploy

- **Custom domain**: Site configuration → **Domain management**
- **HTTPS**: Enabled by default on Netlify
- **Branch deploys**: Default production branch builds on every push; preview deploys for PRs if enabled in team settings

---

## Troubleshooting

**Build failed on Netlify**

- Open the deploy log; find the first error line.
- Run `npm run build` locally from the same folder Netlify uses (correct **base directory**).
- Confirm **Node 20** (see `netlify.toml`); mismatched Node can cause odd failures.

**Blank page or wrong paths**

- In `vite.config.ts`, `base` should stay **`/`** for a site at the domain root. Only change `base` if you deploy under a subpath (e.g. `https://example.com/app/`).

**Refresh on a “route” gives 404**

- Ensure `netlify.toml` redirect block is present and you redeployed after adding it.

**Environment variable undefined in the app**

- Vite only exposes variables prefixed with **`VITE_`** to client code. Redeploy after adding variables.

---

## Quick checklist

- [ ] `npm run build` succeeds locally from the correct folder  
- [ ] `netlify.toml` is at the same level as `package.json` (or Netlify base directory points to that folder)  
- [ ] Base directory in Netlify matches your repo layout  
- [ ] Publish directory is **`dist`**  
- [ ] Repository is pushed to Git and connected to Netlify  

You are deploy-ready when the checklist passes.
