# Deployment Checklist

This guide ensures your Next.js workflow application is production-ready before deployment.

## Pre-Deployment Steps

### 1. Run Pre-Deployment Checks
```bash
npm run pre-deploy
```
This will validate:
- ✅ TypeScript strict mode is enabled
- ✅ Production build succeeds
- ✅ Type declarations for external libraries exist
- ✅ Hydration-safe code patterns
- ✅ Environment variables are configured

### 2. Build Locally
```bash
npm run build
```
Fix any errors before proceeding. Production build failures must be resolved locally first.

### 3. Test Production Build Locally
```bash
npm run build
npm start
```
Test the application in production mode to catch runtime issues that don't appear in dev.

### 4. Environment Variables Checklist
Ensure these are set in your deployment environment:

- [ ] `GEMINI_API_KEY` - Google Generative AI key
- [ ] `TRANSLOADIT_KEY` - Transloadit API key
- [ ] `TRANSLOADIT_SECRET` - Transloadit secret
- [ ] `TRIGGER_API_KEY` - Trigger.dev API key
- [ ] `NEXTAUTH_URL` - URL for extract-frame API calls (optional, defaults to localhost)
- [ ] `FFPROBE_PATH` - Custom FFprobe binary path (optional)
- [ ] `FFMPEG_PATH` - Custom FFmpeg binary path (optional)

### 5. Common Production Issues to Watch For

#### SSR/Hydration Mismatches
- ❌ Do NOT access `window`, `localStorage`, or browser APIs at top-level or during render
- ✅ DO wrap them in `useEffect` with client-only guards
- ✅ DO use `typeof window !== 'undefined'` checks

**Example:**
```tsx
const [isClient, setIsClient] = useState(false);

useEffect(() => {
  setIsClient(true);
}, []);

if (!isClient) return null;
// Now safe to use localStorage
```

#### Type Safety
- ❌ Do NOT use `skipLibCheck: true` in production
- ✅ DO create `.d.ts` files for untyped packages
- ✅ DO use `noUnusedLocals` and `noUnusedParameters`

#### External Dependencies
- ✅ DO ensure binary dependencies (ffmpeg, ffprobe) are available in deployment environment
- ✅ DO test extract-frame node in production to verify binary paths resolve correctly

### 6. Before Hitting Deploy Button

- [ ] All tests pass: `npm run lint`
- [ ] Pre-deploy checks pass: `npm run pre-deploy`
- [ ] Production build succeeds locally: `npm run build`
- [ ] Production build runs without errors: `npm start`
- [ ] Environment variables are set in deployment platform
- [ ] API endpoints are accessible (run-workflow, extract-frame, upload)
- [ ] External services are available (Gemini, Transloadit, Trigger.dev)

### 7. Deployment Procedure

**For Vercel:**
1. Push code to GitHub
2. Vercel auto-detects and builds
3. Verify environment variables in Vercel dashboard
4. Monitor deployment logs for errors

**For Custom Server:**
1. Run `npm run deploy` (runs pre-checks + build)
2. Transfer built `.next` folder to production server
3. Set environment variables
4. Run `npm start` or use process manager (PM2)

### 8. Post-Deployment Validation

- [ ] Application loads without console errors
- [ ] History panel works and localStorage is accessible
- [ ] Sample workflow loads successfully
- [ ] Run workflow executes without errors
- [ ] Run node (right-click) works for individual nodes
- [ ] Extract frame node processes videos correctly
- [ ] LLM nodes execute and receive responses

### 9. Troubleshooting Production Issues

**Build fails with TypeScript errors:**
- Run `npm run build` locally first
- Fix all type errors before deploying
- Check `skipLibCheck` is false in tsconfig.json

**FFmpeg/FFprobe not found:**
- Ensure `ffmpeg-static` and `ffprobe-static` are in node_modules
- Or set `FFPROBE_PATH` and `FFMPEG_PATH` env vars to absolute paths

**localStorage errors:**
- Check for hydration guard in components using localStorage
- Use `useEffect` with `isClient` state before accessing browser APIs

**Gemini/API errors:**
- Verify all API keys in environment variables
- Check API rate limits
- Test with simple prompts first

## Automated Deployment Script

You can use this shell script to automate deployment:

```bash
#!/bin/bash
set -e

echo "🔍 Running pre-deployment checks..."
npm run pre-deploy

echo "🔨 Building production bundle..."
npm run build

echo "✅ Pre-deployment checks and build complete!"
echo "📦 Ready to deploy. Next steps:"
echo "   1. Push to your deployment platform"
echo "   2. Verify environment variables"
echo "   3. Monitor deployment logs"
echo "   4. Test in production"
```

Save as `deploy.sh` and run: `bash deploy.sh`

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run pre-deploy` | Run all pre-deployment checks |
| `npm run build` | Create production build |
| `npm run deploy` | Run checks + build (recommended) |
| `npm start` | Start production server |
| `npm run lint` | Check code quality |
| `npm run dev` | Start development server |

---

**Last Updated:** April 28, 2026  
**Version:** 1.0
