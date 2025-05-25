# 🚀 HealthOS Web MVP - Deployment Guide

A comprehensive health data management platform built with Next.js 15, TypeScript, Tailwind CSS, and Supabase.

## **🔧 Prerequisites**

Before deploying, ensure you have:

- Node.js 18+ installed
- A Supabase account and project
- Google Cloud Console project with Fit API enabled
- OpenAI API key
- Vercel account (for hosting)

## **📦 Environment Setup**

### **Required Environment Variables**

Create a `.env.local` file in the root directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google OAuth & Fit API
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key
```

### **Database Setup**

1. **Create Supabase Project**: Visit [supabase.com](https://supabase.com)
2. **Run Migrations**: Execute the SQL files in `supabase/migrations/`
3. **Enable RLS**: Ensure Row Level Security is enabled on all tables
4. **Configure Auth**: Set up authentication providers in Supabase dashboard

### **Google Cloud Setup**

1. **Create Project**: In Google Cloud Console
2. **Enable APIs**: Google Fit API and Google+ API
3. **Create Credentials**: OAuth 2.0 client ID for web application
4. **Configure Origins**: Add your domain to authorized origins

## **🚀 Deployment Options**

### **Option 1: Vercel (Recommended)**

1. **Connect Repository**: Import your GitHub repository to Vercel
2. **Configure Environment Variables**: Add all required env vars in Vercel dashboard
3. **Deploy**: Vercel will automatically build and deploy

### **Option 2: Self-Hosting**

1. **Build Application**:
   ```bash
   npm run build
   npm start
   ```

2. **Configure Reverse Proxy**: Set up nginx or similar
3. **SSL Certificate**: Ensure HTTPS is enabled
4. **Environment Variables**: Set all required variables on your server

## **🔒 Security Considerations**

### **Environment Variables**
- Never commit `.env` files to version control
- Use different keys for development and production
- Rotate API keys regularly

### **Authentication**
- Configure proper OAuth redirect URLs
- Enable Row Level Security in Supabase
- Use secure session management

### **Data Protection**
- Enable HTTPS in production
- Implement proper CORS policies
- Regular security audits

## **📊 Post-Deployment**

### **Monitoring**
- Set up error tracking (Sentry, etc.)
- Monitor performance metrics
- Configure uptime monitoring

### **Analytics**
- Enable Vercel Analytics (if using Vercel)
- Set up user behavior tracking
- Monitor Core Web Vitals

## **🔧 Troubleshooting**

### **Common Issues**

**Build Errors**:
- Check TypeScript errors: `npm run type-check`
- Verify all dependencies: `npm install`
- Check environment variables

**Authentication Issues**:
- Verify OAuth redirect URLs
- Check Supabase configuration
- Ensure NEXTAUTH_URL is correct

**Database Connection**:
- Verify Supabase credentials
- Check RLS policies
- Ensure migrations are applied

## **📚 Additional Resources**

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Google Fit API Documentation](https://developers.google.com/fit)

## **🆘 Support**

For deployment issues:
1. Check the troubleshooting section above
2. Review the application logs
3. Verify all environment variables are set correctly
4. Ensure all external services are properly configured

---

**Note**: This is a health data application. Ensure compliance with relevant healthcare data regulations (HIPAA, GDPR, etc.) in your deployment environment. 