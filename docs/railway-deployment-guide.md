# Railway Deployment Guide for OhMyAgent

## Overview
This guide will walk you through deploying the OhMyAgent platform to Railway using a multi-service architecture.

## Prerequisites
- Railway account (already authenticated)
- Domain: `claw.ohmyagent.ai` (DNS to be configured after deployment)
- Supabase project already configured (`ohmyagent`)

## Architecture
```
OhMyAgent Railway Project
├── web-ui (Next.js frontend)
│   ├── Port: 3000
│   ├── Domain: claw.ohmyagent.ai
│   └── Environment: Next.js with Supabase SSR
└── agent-server (AGENT backend)
    ├── Port: 4000
    ├── Internal domain: agent-server.ohmyagent.railway.app
    └── Environment: Node.js with Pi Framework
```

## Step 1: Create Railway Project

### Option A: Via Railway Dashboard (Recommended)
1. Go to [railway.com](https://railway.com)
2. Click "New Project"
3. Select "Empty Project"
4. Name it: `ohmyagent`
5. Select workspace: "Scott's Projects"
6. Click "Create"

### Option B: Via CLI
```bash
# In project root directory
cd /Users/scott/Documents/codes/opensource/ohmyagent

# Create project
railway init --name ohmyagent
```

## Step 2: Deploy Web UI Service

### 2.1 Add Service
1. In Railway dashboard, click "New Service"
2. Select "Deploy from GitHub repo"
3. Connect your GitHub account if not connected
4. Select repository: `wyf0931/ohmyagent`
5. Configure service settings:
   - **Name**: `web-ui`
   - **Root Directory**: `apps/web-ui`
   - **Branch**: `main`
   - **Build Command**: `pnpm build`
   - **Start Command**: `pnpm start`

### 2.2 Set Environment Variables
Add these variables in the "Variables" tab:

```bash
# Supabase (from your existing project)
NEXT_PUBLIC_SUPABASE_URL=https://zmzihzobaxspnrvgilnk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inptemloem9iYXhzcG5ydmdpbG5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0ODkxOTEsImV4cCI6MjA5NjA2NTE5MX0.WRgtsQ69jbLHegzRn39qIzR0ALoPkXV5olo__ejPaBY

# Build
NODE_ENV=production

# Agent Server (will be set after agent-server deployment)
AGENT_SERVER_URL=<will be updated in Step 3>
```

### 2.3 Deploy
- Click "Deploy" to deploy the web-ui service
- Wait for build to complete (2-3 minutes)
- Verify health check passes at `https://<web-ui-url>/health`

## Step 3: Deploy Agent Server Service

### 3.1 Add Service
1. Click "New Service" in the same project
2. Select "Deploy from GitHub repo"
3. Select repository: `wyf0931/ohmyagent`
4. Configure service settings:
   - **Name**: `agent-server`
   - **Root Directory**: `apps/agent-server`
   - **Branch**: `main`
   - **Build Command**: `pnpm build`
   - **Start Command**: `pnpm start`

### 3.2 Set Environment Variables
Add these variables:

```bash
# Build
NODE_ENV=production

# Agent Framework
QINIU_API_KEY=sk-ebc9fb492002ca82b2e974622f80adc567bfceb26c0a41e0b68881f9030ddcbb
DEEPSEEK_API_KEY=sk-69328f08bac94d518c6c6a0f7beeb62d

# Port (Railway sets this automatically)
PORT=$PORT
```

### 3.3 Deploy
- Click "Deploy" to deploy the agent-server service
- Wait for build to complete
- Verify health check passes at `https://<agent-server-url>/health`

## Step 4: Configure Service Communication

### 4.1 Get Agent Server Internal URL
1. In Railway dashboard, go to `agent-server` service
2. Click "Networking" tab
3. Copy the "Public URL" or use the generated Railway domain

### 4.2 Update Web UI Environment
1. Go to `web-ui` service
2. In "Variables" tab, update `AGENT_SERVER_URL`:
   ```bash
   AGENT_SERVER_URL=https://<agent-service-url>.railway.app
   ```

### 4.3 Redeploy Web UI
- Click "Redeploy" on web-ui service to pick up new environment variable

## Step 5: Configure Custom Domain

### 5.1 Add Domain to Web UI
1. In Railway dashboard, go to `web-ui` service
2. Click "Networking" tab
3. Click "Generate Domain" or "Add Custom Domain"
4. Enter: `claw.ohmyagent.ai`
5. Click "Generate"

### 5.2 Configure DNS (You'll do this)
Railway will provide DNS settings. You'll need to:

```bash
# Add these records to your DNS provider:
# A Record
Type: A
Name: claw
Value: <Railway-provided-IP>

# CNAME Record (alternative)
Type: CNAME  
Name: claw
Value: <Railway-provided-domain>
```

Railway will show the exact DNS records to add after domain generation.

### 5.3 Verify SSL
- Railway will automatically provision SSL certificate
- Wait for "Active" status on the domain

## Step 6: Verify Deployment

### 6.1 Health Checks
```bash
# Web UI Health
curl https://claw.ohmyagent.ai/health

# Agent Server Health
curl https://<agent-server-url>/health
```

### 6.2 End-to-End Test
1. Visit `https://claw.ohmyagent.ai`
2. Login with Supabase Auth
3. Start a chat session
4. Send a message and verify response

## Environment Variables Summary

### Web UI Service
```bash
NEXT_PUBLIC_SUPABASE_URL=<from-Supabase-dashboard>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from-Supabase-dashboard>
AGENT_SERVER_URL=<agent-server-internal-url>
NODE_ENV=production
```

### Agent Server Service
```bash
QINIU_API_KEY=<your-api-key>
DEEPSEEK_API_KEY=<your-api-key>
PORT=$PORT
NODE_ENV=production
```

## Troubleshooting

### Build Failures
- Check build logs in Railway dashboard
- Verify Turborepo dependencies
- Ensure `pnpm-lock.yaml` is committed

### Health Check Failures
- Verify `/health` endpoint returns `{ status: 'healthy' }`
- Check service logs for startup errors
- Ensure PORT environment variable is used

### Service Communication Issues
- Verify AGENT_SERVER_URL is set correctly
- Check if both services are in the same environment
- Look for CORS errors in browser console

### Database Connection Issues
- Verify Supabase credentials are correct
- Check if Supabase project is active
- Ensure RLS policies allow access

## Post-Deployment Checklist

- [ ] Both services deployed and healthy
- [ ] Domain configured and DNS resolved
- [ ] SSL certificate active
- [ ] Health checks passing
- [ ] Login functionality working
- [ ] Chat functionality working
- [ ] Agent tools responding correctly
- [ ] Session persistence working

## Monitoring

### View Logs
```bash
# Via Railway Dashboard
- Select service → "Deployments" → Click deployment → "Logs"

# Via CLI
railway logs --service web-ui --lines 100
railway logs --service agent-server --lines 100
```

### Check Metrics
```bash
# Via Railway Dashboard  
- Select service → "Metrics" tab

# Via CLI
railway metrics --service web-ui --since 1h
railway metrics --service agent-server --since 1h
```

## Cost Estimation

- **Web UI**: ~$5-10/month (Next.js + Railway)
- **Agent Server**: ~$5-10/month (Node.js + Railway)
- **Total**: ~$10-20/month

## Next Steps After Deployment

1. **Set up monitoring** (Railway built-in metrics)
2. **Configure error tracking** (optional: Sentry)
3. **Set up backup/recovery** (Railway automatic)
4. **Configure custom domains** for other services
5. **Set up CI/CD** for automatic deployments

---

**Deployment Status**: Ready to execute
**Estimated Time**: 15-20 minutes
**Complexity**: Medium

Let me know when you've completed the Railway project creation, and I'll help you finish the configuration!