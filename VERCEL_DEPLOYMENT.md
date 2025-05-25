# 🚀 HealthOS Web MVP - Vercel Deployment Guide

## **Step 8.2: Deploy to Vercel**

### **1. Create Vercel Account**

1. **Go to Vercel**: Visit [vercel.com](https://vercel.com)
2. **Sign Up**: Click "Sign Up" and choose GitHub authentication
3. **Select Plan**: Choose "Hobby" plan (free) for MVP deployment

### **2. Import Project from GitHub**

1. **Access Vercel Dashboard**: After account creation, go to dashboard
2. **New Project**: Click "New Project" button
3. **Import Repository**: 
   - Connect your GitHub account if not already connected
   - Find and select `healthos-web` repository
   - Click "Import"

### **3. Configure Project Settings**

Vercel will auto-detect Next.js. Configure the following:

#### **Framework Preset**
- **Framework**: Next.js (auto-detected)
- **Root Directory**: `./` (project is in root)
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

#### **Environment Variables**
Add the following environment variables before deployment:

```bash
# Required Environment Variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
OPENAI_API_KEY=your_openai_api_key

# Production-specific
NODE_ENV=production
NEXTAUTH_URL=https://your-vercel-domain.vercel.app
NEXTAUTH_SECRET=your_nextauth_secret_key
```

### **4. Configure Image Domains**

Since we use Supabase storage for images, ensure `next.config.js` includes:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'your-supabase-project.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

module.exports = nextConfig
```

### **5. Deploy Project**

1. **Review Settings**: Verify all configurations are correct
2. **Click Deploy**: Start the deployment process
3. **Monitor Build**: Watch the build logs for any errors
4. **Wait for Completion**: Deployment typically takes 2-3 minutes

### **6. Post-Deployment Configuration**

#### **Update Environment Variables**
After initial deployment, update:

```bash
NEXTAUTH_URL=https://your-actual-vercel-domain.vercel.app
```

#### **Configure Supabase Auth**
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your Vercel domain to:
   - **Site URL**: `https://your-vercel-domain.vercel.app`
   - **Redirect URLs**: `https://your-vercel-domain.vercel.app/auth/callback`

#### **Update Google OAuth**
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Add your Vercel domain to:
   - **Authorized JavaScript origins**: `https://your-vercel-domain.vercel.app`
   - **Authorized redirect URIs**: `https://your-vercel-domain.vercel.app/api/auth/callback/google`

### **7. Test Production Deployment**

1. **Visit Deployed Site**: Click the Vercel-provided URL
2. **Test Authentication**: Try Google OAuth login
3. **Test Google Fit Sync**: Verify fitness data synchronization
4. **Test Lab Report Upload**: Upload and process a PDF
5. **Test Health Chat**: Interact with AI assistant

### **8. Custom Domain (Optional)**

#### **Add Custom Domain**
1. Go to Project Settings → Domains
2. Add your custom domain (e.g., `healthos.yourdomain.com`)
3. Configure DNS records as instructed by Vercel

#### **Update Environment Variables**
```bash
NEXTAUTH_URL=https://healthos.yourdomain.com
```

#### **Update OAuth Configurations**
Update Google OAuth and Supabase with your custom domain.

## **🔧 Troubleshooting Common Issues**

### **Build Errors**
- **TypeScript Errors**: Fix any type issues locally first
- **Missing Dependencies**: Ensure all packages are in `package.json`
- **Environment Variables**: Verify all required env vars are set

### **Runtime Errors**
- **Image Loading**: Check `next.config.js` remote patterns
- **Authentication**: Verify OAuth redirect URLs
- **Database Connection**: Check Supabase environment variables

### **Performance Issues**
- **Function Timeout**: Upgrade to Pro plan for longer execution times
- **Cold Starts**: Consider implementing warming strategies
- **Image Optimization**: Ensure proper Next.js Image component usage

## **📊 Monitoring & Analytics**

### **Enable Vercel Analytics**
1. Go to Project → Analytics
2. Enable Web Analytics
3. Add `@vercel/analytics` package if needed

### **Enable Speed Insights**
1. Go to Project → Speed Insights
2. Enable Core Web Vitals tracking
3. Monitor performance metrics

## **🚀 Continuous Deployment**

Vercel automatically deploys when you push to GitHub:

1. **Push Changes**: `git push origin main`
2. **Automatic Build**: Vercel detects changes and builds
3. **Preview Deployments**: Pull requests get preview URLs
4. **Production Deployment**: Main branch deploys to production

## **✅ Deployment Checklist**

- [ ] GitHub repository connected
- [ ] Environment variables configured
- [ ] Image domains configured
- [ ] Supabase auth URLs updated
- [ ] Google OAuth URLs updated
- [ ] Production deployment successful
- [ ] Authentication working
- [ ] Google Fit sync working
- [ ] Lab report upload working
- [ ] Health chat working
- [ ] Custom domain configured (optional)
- [ ] Analytics enabled
- [ ] Performance monitoring enabled

## **🎯 Next Steps**

After successful deployment:

1. **Monitor Performance**: Use Vercel Analytics and Speed Insights
2. **User Testing**: Invite pilot users for feedback
3. **Error Monitoring**: Set up error tracking (Sentry, etc.)
4. **Backup Strategy**: Ensure data backup procedures
5. **Security Review**: Conduct security audit
6. **Documentation**: Update user guides and API docs

---

**🎉 Congratulations!** Your HealthOS Web MVP is now live on Vercel!

**Production URL**: `https://your-vercel-domain.vercel.app` 