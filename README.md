# HealthOS Web MVP 🏥

A comprehensive health data management platform built with Next.js 15, TypeScript, Tailwind CSS, and Supabase. HealthOS enables users to track fitness metrics, analyze lab reports, and interact with an AI-powered health assistant.

## ✨ Features

### 🔐 Authentication & Security
- **Secure Authentication**: Email/password and Google OAuth via Supabase Auth
- **Account Management**: Complete profile management with deletion and data export
- **Data Privacy**: GDPR-compliant data handling with 7-day grace period for account deletion
- **Row Level Security**: All user data protected with Supabase RLS policies

### 📊 Google Fit Integration
- **OAuth Integration**: Seamless Google Fit connection
- **Real-time Sync**: Automatic fitness data synchronization
- **Metrics Tracking**: Steps, calories, distance, and active minutes
- **Visual Timeline**: Interactive charts showing fitness trends over time

### 🧪 Lab Report Processing
- **PDF Upload**: Secure lab report upload to Supabase Storage
- **AI Extraction**: Automatic biomarker extraction using OpenAI
- **Data Visualization**: Beautiful cards displaying lab markers with trends
- **File Management**: Complete CRUD operations for lab reports

### 🤖 AI Health Assistant
- **RAG-Powered Chat**: Context-aware responses using user's health data
- **Smart Insights**: Personalized health recommendations based on actual metrics
- **Real-time Chat**: Instant responses with typing indicators
- **Quick Questions**: Pre-built prompts for common health queries

### ⚙️ Settings & Privacy
- **Data Export**: One-click GDPR-compliant data download
- **Account Deletion**: Soft delete with 7-day recovery period
- **Privacy Controls**: Comprehensive privacy settings and information
- **Profile Management**: Complete account information management

## 🛠️ Tech Stack

- **Frontend**: Next.js 15.1.8 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **UI Components**: shadcn/ui, Lucide React icons
- **Charts**: @visx/xychart for data visualization
- **AI**: OpenAI GPT-4 for chat and document processing
- **Deployment**: Vercel (recommended)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- OpenAI API key
- Google Cloud Console project (for Fit API)

### 1. Clone Repository
```bash
git clone <repository-url>
cd healthos-web
npm install
```

### 2. Environment Setup
Create `.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 3. Database Setup
Run the SQL files in order:
```bash
# In Supabase SQL Editor
1. supabase-schema.sql
2. supabase-schema-update.sql
3. supabase-storage-setup.sql
4. supabase/migrations/*.sql
```

### 4. Google Fit API Setup
1. Enable Google Fit API in Google Cloud Console
2. Configure OAuth consent screen
3. Add authorized redirect URIs:
   - `http://localhost:3000/api/google-fit/exchange` (development)
   - `https://yourdomain.com/api/google-fit/exchange` (production)

### 5. Deploy Supabase Edge Functions
```bash
# Install Supabase CLI
npm install -g supabase

# Deploy functions
supabase functions deploy parseLabReport
supabase functions deploy hardDelete
```

### 6. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 📁 Project Structure

```
healthos-web/
├── src/
│   ├── app/
│   │   ├── api/                 # API routes
│   │   │   ├── chat/           # AI chat endpoints
│   │   │   ├── google-fit/     # Google Fit integration
│   │   │   ├── health/         # Health data management
│   │   │   └── lab-reports/    # Lab report processing
│   │   ├── dashboard/          # Main dashboard
│   │   │   └── components/     # Dashboard components
│   │   ├── settings/           # Settings pages
│   │   └── page.tsx           # Landing/auth page
│   ├── components/ui/          # Reusable UI components
│   └── lib/                   # Utilities and configurations
├── supabase/
│   ├── functions/             # Edge functions
│   └── migrations/            # Database migrations
└── public/                    # Static assets
```

## 🔧 Key Components

### Dashboard (`/dashboard`)
- **Timeline**: Interactive fitness charts with lazy loading
- **Lab Markers**: Extracted biomarkers with visual indicators
- **Health Chat**: AI assistant with RAG capabilities
- **Sync Controls**: Google Fit integration management

### Settings (`/settings`)
- **Profile**: Account information and security status
- **Privacy**: Data export, deletion, and privacy controls
- **Deletion Scheduled**: Countdown and recovery options

### API Routes
- **`/api/chat`**: RAG-powered health assistant
- **`/api/google-fit/sync`**: Fitness data synchronization
- **`/api/process-lab-report`**: AI-powered PDF processing
- **`/api/health/export`**: GDPR data export

## 🚀 Deployment

### Vercel Deployment (Recommended)
1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production
```env
# Add all .env.local variables plus:
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your_nextauth_secret
```

### Post-Deployment Checklist
- [ ] Update Google OAuth redirect URIs
- [ ] Configure Supabase Auth settings
- [ ] Test all integrations
- [ ] Set up monitoring and analytics

## 🔒 Security Features

- **Authentication**: Supabase Auth with Google OAuth
- **Authorization**: Row Level Security on all tables
- **Data Encryption**: Client-side encryption for sensitive files
- **CORS Protection**: Configured for production domains
- **Rate Limiting**: API route protection
- **Input Validation**: Comprehensive data validation

## 📊 Database Schema

### Core Tables
- **`profiles`**: User profiles and Google tokens
- **`fit_daily_metrics`**: Daily fitness data from Google Fit
- **`lab_reports`**: Uploaded PDF reports metadata
- **`lab_markers`**: Extracted biomarkers from reports
- **`chat_conversations`**: AI chat history

### Security Policies
All tables include:
- Row Level Security (RLS) enabled
- User isolation policies
- Soft delete support (`deleted_at` column)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in `/docs`
- Review the troubleshooting guide

## 🗺️ Roadmap

- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Integration with more health platforms
- [ ] Telemedicine features
- [ ] Wearable device support
- [ ] Advanced AI health insights

---

**HealthOS Web MVP** - Empowering personal health through intelligent data management.
