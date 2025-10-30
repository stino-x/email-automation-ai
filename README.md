# Email Automation with AI

A full-stack email automation application with AI-powered responses and Google Calendar integration.

## 🚀 Features

- **24/7 Email Monitoring** - Automated email checking with flexible scheduling
- **AI-Powered Responses** - Intelligent replies using Groq AI (llama-3.1-70b-versatile)
- **Google Integration** - Gmail and Google Calendar API integration
- **Flexible Scheduling** - Recurring, specific dates, and hybrid scheduling modes
- **User Authentication** - Secure login/signup with Supabase Auth
- **Activity Tracking** - Complete logs with filtering and CSV export
- **Modern UI** - Dark theme, responsive design with shadcn/ui components

## 📋 Tech Stack

- **Frontend**: Next.js 16.0.1, React, TypeScript, Tailwind CSS v4
- **Backend**: Next.js API Routes, Express.js Worker Service
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **AI**: Groq API (llama-3.1-70b-versatile)
- **APIs**: Google Gmail API, Google Calendar API
- **Authentication**: Supabase Auth
- **UI Components**: shadcn/ui (16 components)
- **Deployment**: Vercel (frontend) + Railway (worker)

## 🛠️ Installation

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Google Cloud Console account (for OAuth)
- Groq API account

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/email-automation.git
   cd email-automation
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd worker
   npm install
   cd ..
   ```

3. **Set up environment variables**
   
   Create `.env.local` in the root:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_KEY=your_service_key
   
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
   
   GROQ_API_KEY=your_groq_api_key
   
   WORKER_WEBHOOK_URL=http://localhost:3001
   WORKER_SECRET=your_secure_secret
   
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Set up database**
   - Create a Supabase project
   - Open SQL Editor
   - Execute `database/schema.sql`

5. **Configure Google OAuth**
   - Go to Google Cloud Console
   - Enable Gmail API and Google Calendar API
   - Create OAuth 2.0 credentials
   - Add redirect URI: `http://localhost:3000/api/auth/google/callback`

6. **Run the application**
   ```bash
   # Terminal 1: Start Next.js
   npm run dev
   
   # Terminal 2: Start Worker
   cd worker
   npm run dev
   ```

7. **Access the application**
   - Frontend: http://localhost:3000
   - Worker: http://localhost:3001

## 📖 Documentation

- **[COMPLETE.md](./COMPLETE.md)** - Comprehensive project documentation
- **[SETUP.md](./SETUP.md)** - Quick start guide
- **[PROGRESS.md](./PROGRESS.md)** - Development progress log

## 🎯 Usage

1. **Sign up** for an account
2. **Connect Google** account in Settings
3. **Add email monitors** in Configuration
4. **Configure schedules** (recurring, specific dates, or hybrid)
5. **Customize AI prompt** for responses
6. **Start monitoring** from Dashboard
7. **View activity** logs and analytics

## 📁 Project Structure

```
email-automation/
├── app/                    # Next.js app directory
│   ├── api/               # API routes (12 endpoints)
│   ├── dashboard/         # Dashboard page
│   ├── configuration/     # Monitor configuration
│   ├── activity/          # Activity logs
│   ├── settings/          # Settings page
│   ├── login/             # Login page
│   └── signup/            # Signup page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── navbar.tsx        # Navigation bar
├── lib/                   # Core libraries
│   ├── supabase/         # Database operations
│   ├── google/           # Google APIs
│   ├── groq/             # AI integration
│   └── utils/            # Utilities
├── worker/                # Background worker service
│   └── src/              # Worker source code
├── types/                 # TypeScript definitions
├── database/              # Database schema
└── public/                # Static assets
```

## 🔒 Security

- Row Level Security (RLS) on all database tables
- OAuth 2.0 for Google authentication
- Token encryption
- Environment variable protection
- Input validation
- SQL injection prevention

## 🚢 Deployment

### Deploy to Vercel

```bash
git push
# Connect repository to Vercel
# Add environment variables
# Deploy
```

### Deploy Worker to Railway

```bash
cd worker
railway init
railway up
# Add environment variables
```

## 📊 Features in Detail

### Schedule Types

- **Recurring**: Set days of week, time windows, and intervals
- **Specific Dates**: Choose exact dates with calendar picker
- **Hybrid**: Combine recurring and specific date schedules

### AI Responses

Customize prompts with variables:
- `{SENDER_NAME}` - Email sender's name
- `{SENDER_EMAIL}` - Sender's email address
- `{EMAIL_SUBJECT}` - Email subject line
- `{EMAIL_CONTENT}` - Full email body
- `{CALENDAR_EVENTS}` - Upcoming calendar events

### Activity Tracking

- Real-time monitoring status
- Check counts and limits
- Email processing logs
- Status badges (NEW_EMAIL, SENT, NO_EMAIL, ERROR, LIMIT_REACHED)
- CSV export functionality

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Supabase for the backend infrastructure
- Groq for AI capabilities
- Google for Gmail and Calendar APIs
- shadcn for the beautiful UI components

## 📧 Support

For issues or questions, please open an issue on GitHub.

---

**Built with ❤️ using Next.js, Supabase, Groq AI, and Google APIs**
