# Netlify Deployment Guide

## Prerequisites
- GitHub/GitLab/Bitbucket account with this repository pushed
- Netlify account (https://app.netlify.com)

## Deployment Steps

### Option 1: Deploy from Git (Recommended)

1. **Push to Git**
   ```bash
   git add .
   git commit -m "Add Netlify configuration"
   git push origin main
   ```

2. **Connect to Netlify**
   - Go to [app.netlify.com](https://app.netlify.com)
   - Click "New site from Git"
   - Select your repository provider (GitHub, GitLab, Bitbucket)
   - Authorize Netlify to access your repositories
   - Select the `habiba-imran/AIDRA` repository

3. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - These are already configured in `netlify.toml`, so Netlify should auto-detect them

4. **Deploy**
   - Click "Deploy site"
   - Netlify will automatically build and deploy your site
   - Your site will be available at a URL like: `https://xxxxx.netlify.app`

### Option 2: Deploy with Netlify CLI

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Build the project
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

## Environment Variables

If you need to use Supabase or other services in the future:

1. Go to Site Settings → Build & deploy → Environment
2. Add your environment variables:
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

Reference the `.env.example` file for variable names.

## File Configuration

- **netlify.toml** - Main Netlify configuration
  - Build command and output directory
  - SPA routing redirects (all 404s route to index.html)
  - Environment settings

- **vite.config.ts** - Updated for production optimization
  - Code splitting (vendor bundle)
  - Minification with Terser
  - No source maps in production

- **.env.example** - Template for environment variables

## Features of This Setup

✅ Automatic builds on every git push
✅ Preview deployments for pull requests
✅ SPA routing configured (all routes handled by index.html)
✅ Production-optimized build
✅ Code splitting for better caching
✅ Minified and bundled assets
✅ Compatible with Supabase integration if needed

## Post-Deployment

1. **Custom Domain** (Optional)
   - Site settings → Domain management
   - Add your custom domain

2. **HTTPS**
   - Automatically enabled by Netlify
   - Automatic certificate renewal

3. **Analytics**
   - Enable in Site settings for performance insights

4. **Monitoring**
   - Check deployment logs in Netlify dashboard
   - Set up error tracking if needed

## Troubleshooting

**Build fails?**
- Check build logs in Netlify dashboard
- Ensure `npm run build` works locally: `npm run build && npm run preview`

**Site shows 404?**
- The netlify.toml redirects all requests to index.html for SPA routing
- Clear browser cache and hard refresh

**Environment variables not working?**
- Variables must be prefixed with `VITE_` to be accessible in client-side code
- Redeploy site after adding environment variables

## Local Testing

Test the production build locally:
```bash
npm run build
npm run preview
```

Then open http://localhost:4173 to verify the build works correctly.
