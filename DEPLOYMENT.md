# 🚀 HealthOS Web MVP - Deployment Guide

This guide covers secure deployment of HealthOS Web MVP with proper safety measures to prevent misuse.

## 🔒 Security First Approach

### Pre-Deployment Security Checklist

- [ ] **Environment Variables**: All sensitive keys in environment variables, never in code
- [ ] **API Rate Limiting**: Implemented on all public endpoints
- [ ] **Authentication Required**: All data endpoints require valid authentication
- [ ] **Row Level Security**: Enabled on all Supabase tables
- [ ] **CORS Configuration**: Restricted to production domains only
- [ ] **Input Validation**: All user inputs validated and sanitized
- [ ] **File Upload Security**: PDF uploads restricted and validated
- [ ] **Database Policies**: User isolation enforced at database level

## 🛡️ Production Security Measures

### 1. Environment Configuration

**Required Environment Variables:**
```env
# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI (Production)
OPENAI_API_KEY=your_openai_api_key

# Google OAuth (Production)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Security
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your_secure_random_secret
```

### 2. Supabase Security Configuration

**Row Level Security Policies:**
```sql
-- Ensure all tables have RLS enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fit_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

-- User isolation policies (already implemented)
-- Users can only access their own data
```

**API Security:**
```sql
-- Revoke public access to sensitive functions
REVOKE EXECUTE ON FUNCTION sensitive_function FROM anon;
REVOKE EXECUTE ON FUNCTION sensitive_function FROM authenticated;
```

### 3. API Route Protection

All API routes include:
- Authentication verification
- User authorization checks
- Input validation
- Rate limiting
- Error handling without data leakage

## 🌐 Deployment Options

### Option 1: Vercel (Recommended)

**Step 1: Connect Repository**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure build settings:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

**Step 2: Environment Variables**
Add all production environment variables in Vercel dashboard under "Settings" → "Environment Variables"

**Step 3: Domain Configuration**
1. Add custom domain in Vercel
2. Update Google OAuth redirect URIs
3. Update Supabase Auth settings

**Step 4: Security Headers**
Add to `next.config.ts`:
```typescript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}
```

### Option 2: Self-Hosted (Advanced)

**Requirements:**
- Docker and Docker Compose
- SSL certificate (Let's Encrypt recommended)
- Reverse proxy (Nginx recommended)
- Monitoring setup

**Docker Configuration:**
```dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
USER nextjs
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔐 Post-Deployment Security

### 1. Access Control

**Admin Functions:**
- Restrict admin cleanup endpoints to specific IPs
- Implement admin authentication
- Log all admin actions

**User Data Protection:**
- All user data isolated by user_id
- No cross-user data access possible
- Audit logs for data access

### 2. Monitoring & Alerts

**Set up monitoring for:**
- Failed authentication attempts
- Unusual API usage patterns
- Error rates and performance
- Database query patterns

**Recommended Tools:**
- Vercel Analytics
- Supabase Dashboard monitoring
- Sentry for error tracking
- LogRocket for user sessions

### 3. Regular Security Updates

**Monthly Tasks:**
- [ ] Update all npm dependencies
- [ ] Review Supabase security logs
- [ ] Check for new security advisories
- [ ] Rotate API keys if needed
- [ ] Review user access patterns

## 🚨 Incident Response

### Security Incident Checklist

1. **Immediate Response:**
   - Disable affected API endpoints
   - Revoke compromised API keys
   - Check audit logs for breach scope

2. **Investigation:**
   - Identify attack vector
   - Assess data exposure
   - Document timeline

3. **Recovery:**
   - Patch security vulnerabilities
   - Rotate all credentials
   - Notify affected users if required

4. **Prevention:**
   - Update security measures
   - Improve monitoring
   - Conduct security review

## 📊 Performance & Scaling

### Performance Optimization

**Frontend:**
- Image optimization with Next.js
- Code splitting and lazy loading
- CDN for static assets

**Backend:**
- Database query optimization
- Supabase connection pooling
- Edge function caching

**Monitoring:**
- Core Web Vitals tracking
- API response times
- Database performance metrics

### Scaling Considerations

**Traffic Growth:**
- Vercel automatically scales
- Supabase handles database scaling
- Monitor usage limits

**Feature Expansion:**
- Modular architecture supports new features
- Database schema designed for extensibility
- API versioning strategy in place

## 🧪 Testing in Production

### Deployment Testing

**Pre-Launch Checklist:**
- [ ] Authentication flow works
- [ ] Google Fit integration functional
- [ ] Lab report upload and processing
- [ ] AI chat responses working
- [ ] Data export functionality
- [ ] Account deletion process
- [ ] All settings pages accessible

**User Acceptance Testing:**
- [ ] Create test accounts
- [ ] Test complete user journey
- [ ] Verify data isolation
- [ ] Test error scenarios
- [ ] Performance testing

## 📞 Support & Maintenance

### Ongoing Maintenance

**Weekly:**
- Monitor error logs
- Check performance metrics
- Review user feedback

**Monthly:**
- Security updates
- Dependency updates
- Performance optimization

**Quarterly:**
- Security audit
- Feature usage analysis
- Infrastructure review

### Support Channels

- GitHub Issues for bugs
- Documentation updates
- User feedback collection
- Performance monitoring

---

## 🎯 Success Metrics

Track these KPIs post-deployment:
- User registration rate
- Google Fit connection success rate
- Lab report processing accuracy
- Chat assistant usage
- User retention rate
- System uptime and performance

---

**Remember:** Security is an ongoing process, not a one-time setup. Regular monitoring and updates are essential for maintaining a secure production environment. 