# Lexflow Deployment Guide

This guide covers deploying Lexflow to production environments.

## Prerequisites

- Node.js 18+
- npm or yarn
- Git
- A Supabase project (for authentication and database)
- A hosting provider (Vercel, Netlify, AWS, etc.)

## Environment Setup

### 1. Create Production Environment File

```bash
cp .env.production.example .env.production
```

Edit `.env.production` and fill in your production values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=https://api.yourdomain.com
```

### 2. Update .gitignore

Ensure `.env.production` is in `.gitignore` to prevent committing secrets:

```bash
echo ".env.production" >> .gitignore
```

## Build Process

### Development Build
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

This will:
1. Compile TypeScript
2. Bundle assets with Vite
3. Optimize for production
4. Generate source maps (configurable via `VITE_GENERATE_SOURCE_MAPS`)

### Preview Production Build Locally
```bash
npm run preview
```

## Testing Before Deployment

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Linting
```bash
npm run lint
```

**Important**: All tests must pass before deploying to production.

## Deployment Platforms

### Vercel (Recommended for Next.js-like setups)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy:
   ```bash
   vercel --prod
   ```

### Netlify

1. Connect your GitHub repository to Netlify
2. Set Build command: `npm run build`
3. Set Publish directory: `dist`
4. Set environment variables in Netlify dashboard
5. Deploy automatically on push to main

### AWS Amplify

1. Connect GitHub repository
2. Update build settings:
   ```yaml
   version: 1
   frontend:
     phases:
       install:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: dist
       files:
         - '**/*'
   ```
3. Set environment variables
4. Deploy

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
```

Build and run:
```bash
docker build -t lexflow:latest .
docker run -p 3000:3000 lexflow:latest
```

## Post-Deployment Checklist

- [ ] Verify all pages load correctly
- [ ] Test authentication flow
- [ ] Check API connectivity
- [ ] Verify environment variables are loaded
- [ ] Monitor error tracking (Sentry, etc.)
- [ ] Check performance metrics
- [ ] Verify database connectivity
- [ ] Test file uploads (if applicable)
- [ ] Check SSL certificate validity
- [ ] Monitor application logs

## Performance Optimization

### Bundle Analysis
```bash
npm run build -- --analyze
```

### Static Asset Optimization
- Images are optimized during build
- CSS and JS are minified
- Source maps can be disabled in production via `VITE_GENERATE_SOURCE_MAPS=false`

## Rollback Procedure

If deployment fails:

1. Identify the last known good commit:
   ```bash
   git log --oneline | head -5
   ```

2. Rollback to previous version:
   ```bash
   git checkout <commit-hash>
   npm run build
   # Deploy again
   ```

## Monitoring & Logging

### Application Monitoring
- Enable performance monitoring via `VITE_ENABLE_PERFORMANCE_MONITORING=true`
- Configure Sentry for error tracking via `VITE_SENTRY_DSN`
- Use PostHog for analytics via `VITE_POSTHOG_API_KEY`

### Server Logs
Check application logs in your hosting provider's dashboard:
- **Vercel**: Analytics > Logs
- **Netlify**: Deployments > Deploy logs
- **AWS Amplify**: Logs

## Troubleshooting

### Build Failures
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm ci
npm run build
```

### Environment Variable Issues
- Verify `.env.production` exists in deployment environment
- Check variable names match (case-sensitive)
- Use `VITE_` prefix for client-side variables

### Performance Issues
- Check bundle size: `npm run build --report`
- Monitor API response times
- Check database query performance

### Deploy to Staging First
Always test in a staging environment before production:

```bash
# Create a staging deployment
npm run build
# Deploy to staging URL
# Test thoroughly
# Then deploy to production
```

## Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Rotate keys regularly** - Update Supabase and API keys
3. **Use HTTPS only** - All connections should be encrypted
4. **Enable CORS properly** - Restrict to known domains
5. **Keep dependencies updated** - Run `npm audit` regularly
6. **Monitor access logs** - Watch for suspicious activity
7. **Use rate limiting** - Protect APIs from abuse

## Maintenance

### Regular Updates
```bash
npm update
npm audit fix
```

### Database Backups
- Configure automatic backups in Supabase
- Test restoration regularly

### Log Retention
- Keep logs for at least 30 days
- Archive older logs for compliance

## Support & Documentation

- **Supabase Docs**: https://supabase.com/docs
- **Vite Docs**: https://vitejs.dev
- **React Docs**: https://react.dev
- **Lexflow Repository**: https://github.com/your-org/lexflowai

## Questions?

For deployment issues, check:
1. GitHub Issues
2. Supabase Community
3. Vite Documentation
4. Your hosting provider's documentation
