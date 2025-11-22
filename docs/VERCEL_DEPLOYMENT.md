# Vercel Deployment Guide

## Overview

This guide explains how to deploy the BracketFlow tournament management platform to Vercel, including configuration, environment variables, and optimization steps.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Setup](#project-setup)
3. [Vercel Configuration](#vercel-configuration)
4. [Environment Variables](#environment-variables)
5. [Deployment Steps](#deployment-steps)
6. [Build Configuration](#build-configuration)
7. [SPA Routing](#spa-routing)
8. [Performance Optimization](#performance-optimization)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- GitHub account with repository access
- Vercel account (sign up at [vercel.com](https://vercel.com))
- Supabase project set up
- Required API keys (see [Environment Variables](#environment-variables))

---

## Project Setup

### Build Configuration

The project uses **Vite** as the build tool with the following configuration:

- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Node.js Version:** 18.x or 20.x (recommended)

### Project Structure

```
├── vercel.json          # Vercel configuration
├── vite.config.ts       # Vite build configuration
├── package.json         # Dependencies and scripts
├── index.html           # Entry HTML file
└── src/                 # Source code
```

---

## Vercel Configuration

### `vercel.json`

The project includes a `vercel.json` file with optimized settings:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

**Key Features:**
- **SPA Routing:** All routes rewrite to `index.html` for client-side routing
- **Asset Caching:** Static assets cached for 1 year
- **Framework Detection:** Automatically detects Vite framework

---

## Environment Variables

### Required Variables

Configure these in **Vercel Dashboard → Project Settings → Environment Variables**:

#### Supabase Configuration
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### OpenWeather API
```
VITE_OPENWEATHER_KEY=your-openweather-api-key
```

#### Optional Variables

**Gemini AI (for AI Summary feature):**
```
VITE_GEMINI_KEY=your-gemini-api-key
```

**Razorpay Payment (if using payment features):**
```
VITE_RAZORPAY_KEY_ID=your-razorpay-key-id
```

### Environment Variable Setup

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable with the following scopes:
   - **Production:** Checked (for production deployments)
   - **Preview:** Checked (for preview deployments)
   - **Development:** Checked (for local development)

---

## Deployment Steps

### Option 1: GitHub Integration (Recommended)

1. **Connect Repository:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Authorize Vercel to access your repositories

2. **Configure Project:**
   - **Framework Preset:** Vite (auto-detected)
   - **Root Directory:** `./` (or leave default)
   - **Build Command:** `npm run build` (auto-filled)
   - **Output Directory:** `dist` (auto-filled)

3. **Add Environment Variables:**
   - Add all required environment variables
   - Set appropriate scopes (Production, Preview, Development)

4. **Deploy:**
   - Click **Deploy**
   - Wait for build to complete
   - Visit your deployment URL

### Option 2: Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```
   
   For production:
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables:**
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   vercel env add VITE_OPENWEATHER_KEY
   # ... add other variables
   ```

---

## Build Configuration

### Vite Configuration

The `vite.config.ts` is optimized for production:

```typescript
build: {
  outDir: "dist",
  sourcemap: mode === "development",
  minify: mode === "production" ? "esbuild" : false,
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom', 'react-router-dom'],
        supabase: ['@supabase/supabase-js'],
        query: ['@tanstack/react-query'],
        ui: ['@radix-ui/...'],
      },
    },
  },
  chunkSizeWarningLimit: 1000,
}
```

**Optimizations:**
- **Code Splitting:** Vendor chunks for better caching
- **Minification:** Production builds are minified
- **Tree Shaking:** Unused code is eliminated

### Build Process

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Build Project:**
   ```bash
   npm run build
   ```

3. **Output:**
   - Static files in `dist/` directory
   - Optimized and minified assets
   - Code-split chunks

---

## SPA Routing

### React Router Configuration

The app uses `BrowserRouter` for client-side routing. All routes need to be handled by the client:

**Routes:**
- `/` - Home page
- `/tournaments` - Tournament listing
- `/umpire` - Umpire dashboard
- `/host` - Host dashboard (protected)
- `/host/login` - Host login
- `/host/tournaments/new` - Create tournament (protected)
- `/host/tournaments/:tournamentId` - Tournament management (protected)

### Vercel Rewrite Rules

The `vercel.json` includes rewrite rules:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

This ensures all routes are handled by the React app, preventing 404 errors on direct route access.

---

## Performance Optimization

### Caching Headers

Static assets are cached for optimal performance:

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

**Benefits:**
- Faster page loads
- Reduced bandwidth usage
- Better Core Web Vitals scores

### Code Splitting

The build configuration splits code into chunks:

- **vendor:** React and core libraries
- **supabase:** Supabase client
- **query:** React Query
- **ui:** UI component libraries

**Benefits:**
- Smaller initial bundle
- Better caching
- Faster subsequent page loads

---

## Troubleshooting

### Common Issues

#### 1. Build Fails

**Error:** `Module not found` or `Cannot find module`

**Solution:**
- Ensure all dependencies are in `package.json`
- Run `npm install` locally to verify
- Check Node.js version (should be 18.x or 20.x)

#### 2. 404 on Direct Route Access

**Error:** Visiting `/tournaments` directly returns 404

**Solution:**
- Verify `vercel.json` rewrite rules are correct
- Ensure rewrite destination is `/index.html`
- Redeploy after fixing `vercel.json`

#### 3. Environment Variables Not Working

**Error:** `Missing Supabase environment variables`

**Solution:**
- Check environment variable names (must start with `VITE_`)
- Verify variables are set in Vercel dashboard
- Ensure correct scope (Production/Preview/Development)
- Redeploy after adding variables

#### 4. Supabase Connection Errors

**Error:** `Failed to fetch` or connection errors

**Solution:**
- Verify `VITE_SUPABASE_URL` is correct
- Check `VITE_SUPABASE_ANON_KEY` is valid
- Ensure Supabase project is active
- Check CORS settings in Supabase dashboard

#### 5. Build Timeout

**Error:** Build exceeds time limit

**Solution:**
- Check build logs for slow operations
- Optimize dependencies
- Consider upgrading Vercel plan for longer build times

#### 6. Static Assets 404

**Error:** Images or assets not loading

**Solution:**
- Ensure assets are in `public/` directory
- Check asset paths in code (should start with `/`)
- Verify `vercel.json` asset headers

---

## Post-Deployment

### Verify Deployment

1. **Check Build Logs:**
   - Go to Vercel dashboard → Deployments
   - Click on latest deployment
   - Review build logs for errors

2. **Test Routes:**
   - Visit all routes directly
   - Verify client-side navigation works
   - Check protected routes redirect correctly

3. **Test Functionality:**
   - Test Supabase connection
   - Verify API calls work
   - Check environment variables are loaded

### Monitoring

**Vercel Analytics:**
- Enable Vercel Analytics in project settings
- Monitor page views and performance
- Track Core Web Vitals

**Error Monitoring:**
- Consider adding Sentry or similar
- Monitor client-side errors
- Track API failures

---

## Environment-Specific Configuration

### Production vs Preview

**Production:**
- Uses production environment variables
- Optimized builds
- CDN caching enabled

**Preview:**
- Uses preview environment variables (or production as fallback)
- Same build optimization
- Unique URL per PR/commit

**Development:**
- Uses development environment variables
- Local `.env` file support
- Hot module replacement

---

## Custom Domain

### Adding Custom Domain

1. Go to **Project Settings** → **Domains**
2. Add your domain
3. Configure DNS records as instructed
4. Wait for SSL certificate (automatic)

**DNS Configuration:**
```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

---

## Continuous Deployment

### Automatic Deployments

Vercel automatically deploys:
- **Production:** Pushes to `main` branch
- **Preview:** Pull requests and other branches
- **Development:** Local `vercel dev` command

### Deployment Hooks

Configure deployment hooks in project settings:
- **Before Build:** Run migrations or setup scripts
- **After Deploy:** Notifications or post-deploy tasks

---

## Best Practices

1. **Environment Variables:**
   - Never commit `.env` files
   - Use different keys for dev/staging/prod
   - Rotate keys periodically

2. **Build Optimization:**
   - Keep dependencies up to date
   - Remove unused dependencies
   - Monitor bundle size

3. **Error Handling:**
   - Implement error boundaries
   - Add user-friendly error messages
   - Log errors for debugging

4. **Performance:**
   - Optimize images (use WebP)
   - Lazy load components
   - Minimize API calls

---

## Related Documentation

- [Vite Configuration](https://vitejs.dev/config/)
- [Vercel Documentation](https://vercel.com/docs)
- [React Router](https://reactrouter.com/)
- [Supabase Client](https://supabase.com/docs/reference/javascript/introduction)

---

## Quick Reference

### Deployment Checklist

- [ ] `vercel.json` configured
- [ ] Environment variables set in Vercel
- [ ] Build command working locally
- [ ] All routes tested
- [ ] Supabase connection verified
- [ ] Error handling in place
- [ ] Custom domain configured (if needed)
- [ ] Analytics enabled (optional)

### Environment Variables Checklist

- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `VITE_OPENWEATHER_KEY`
- [ ] `VITE_GEMINI_KEY` (optional)
- [ ] `VITE_RAZORPAY_KEY_ID` (optional)

---

## Support

For issues or questions:
1. Check Vercel deployment logs
2. Review build output
3. Test locally with `npm run build`
4. Consult Vercel documentation
5. Check Supabase dashboard for connection issues

