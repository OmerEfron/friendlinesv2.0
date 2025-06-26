# 🚀 Friendlines Backend Deployment Guide

This guide covers deploying the Friendlines backend to multiple platforms with CI/CD automation.

## 📋 Prerequisites

- Node.js 18+ installed
- Git repository on GitHub
- Account on your chosen deployment platform

## 🏗️ Infrastructure Overview

The deployment infrastructure supports multiple platforms:

- **Railway** (Recommended) - Free tier with great Node.js support
- **Vercel** - Serverless deployment
- **Render** - Simple container deployment
- **AWS** - Advanced deployment with Terraform (IaC)

## 🎯 Quick Start (Railway - Recommended)

### 1. Setup Railway Account
1. Sign up at [Railway](https://railway.app)
2. Install Railway CLI: `npm install -g @railway/cli`
3. Login: `railway login`

### 2. Configure GitHub Secrets
Run the setup script:
```bash
chmod +x scripts/setup-secrets.sh
./scripts/setup-secrets.sh
```

Or manually add these secrets to your GitHub repository:
- `RAILWAY_TOKEN` - Your Railway API token
- `RAILWAY_SERVICE` - Service name (e.g., friendlines-backend)
- `RAILWAY_URL` - Your app URL (added after first deployment)

### 3. Deploy
```bash
# Push to main branch to trigger CI/CD
git push origin main

# Or deploy manually
chmod +x scripts/deploy.sh
./scripts/deploy.sh railway
```

## 🔧 Platform-Specific Setup

### Railway Deployment

**Configuration Files:**
- `railway.toml` - Railway service configuration
- `nixpacks.toml` - Build configuration

**Features:**
- ✅ Free tier: 500 hours/month
- ✅ Automatic HTTPS
- ✅ Environment variables
- ✅ Zero-downtime deployments
- ✅ Built-in monitoring

**Setup:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway up
```

### Vercel Deployment

**Configuration Files:**
- `vercel.json` - Vercel configuration
- Note: Uses serverless functions

**Features:**
- ✅ Free tier with generous limits
- ✅ Global CDN
- ✅ Automatic HTTPS
- ⚠️ Serverless (stateless only)

**Setup:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Render Deployment

**Configuration Files:**
- `render.yaml` - Render service configuration

**Features:**
- ✅ Free tier: 750 hours/month
- ✅ Automatic deploys from Git
- ✅ Built-in SSL
- ⚠️ Spins down when idle

### AWS Deployment (Advanced)

**Configuration Files:**
- `terraform/` - Complete AWS infrastructure
- `Dockerfile` - Container configuration

**Features:**
- ✅ Free tier: 12 months
- ✅ Full control over infrastructure
- ✅ Scalable architecture
- ⚠️ More complex setup

**Setup:**
```bash
# Install dependencies
# AWS CLI, Terraform, Docker

# Configure AWS credentials
aws configure

# Deploy infrastructure
cd terraform
terraform init
terraform plan
terraform apply
```

## 🔄 CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/deploy.yml`) includes:

1. **Test Stage** 🧪
   - Run Jest tests
   - Security audit
   - Linting (if configured)

2. **Build Stage** 🏗️
   - Install production dependencies
   - Create deployment artifact

3. **Deploy Stage** 🚀
   - Deploy to chosen platform
   - Health check verification

4. **Notify Stage** 📢
   - Deployment status notification

## 🌍 Environment Variables

Configure these in your deployment platform:

```bash
NODE_ENV=production
PORT=3000
# Add other app-specific variables
```

## 📊 Monitoring & Health Checks

All platforms include:
- Health check endpoint: `/health`
- Application monitoring
- Error tracking
- Uptime monitoring

## 🐳 Docker Support

Build and run locally:
```bash
# Build image
docker build -t friendlines-backend .

# Run container
docker run -p 3000:3000 friendlines-backend

# Or use docker-compose
docker-compose up
```

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Test deployment locally
./scripts/deploy.sh docker
```

## 🚨 Troubleshooting

### Common Issues

1. **Tests Failing**
   ```bash
   npm test
   # Fix any failing tests before deployment
   ```

2. **Environment Variables**
   - Ensure all required env vars are set
   - Check platform-specific configuration

3. **Health Check Failures**
   - Verify `/health` endpoint responds
   - Check application startup logs

4. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are listed

### Platform-Specific Issues

**Railway:**
- Check service logs in dashboard
- Verify Nixpacks build configuration

**Vercel:**
- Check function logs
- Verify serverless compatibility

**AWS:**
- Check CloudWatch logs
- Verify IAM permissions

## 📈 Scaling & Performance

### Free Tier Limits

| Platform | Memory | CPU | Bandwidth | Storage |
|----------|--------|-----|-----------|---------|
| Railway  | 512MB  | 1 vCPU | 100GB | 1GB |
| Vercel   | 1GB    | 1 vCPU | 100GB | 10GB |
| Render   | 512MB  | 0.1 vCPU | 100GB | - |
| AWS      | 512MB  | 0.25 vCPU | 15GB | 30GB |

### Performance Tips

1. **Optimize Dependencies**
   - Use `npm ci --production`
   - Remove unused packages

2. **Enable Compression**
   - Already configured in server.js

3. **Database Optimization**
   - Consider upgrading from JSON files for production

## 🔒 Security

- HTTPS enforced on all platforms
- Security headers configured
- Rate limiting enabled
- Input validation implemented
- Non-root Docker user

## 🎯 Next Steps

1. **Custom Domain** (if needed)
   - Configure DNS records
   - SSL certificates

2. **Database Migration**
   - Consider PostgreSQL/MongoDB for production
   - Implement database backup strategy

3. **Enhanced Monitoring**
   - Set up error tracking (Sentry)
   - Performance monitoring
   - Uptime alerts

4. **Load Testing**
   - Test application under load
   - Optimize for expected traffic

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest)

---

**Need help?** Check the troubleshooting section or create an issue in the repository. 