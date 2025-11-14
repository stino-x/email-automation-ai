# 🎉 Facebook Messenger Monitoring Feature

## Overview
Your email automation app now includes **Facebook Messenger monitoring** with AI-powered auto-responses! This is a completely separate section with its own authentication layer for extra security.

---

## ✨ Features

### 🔐 Separate Authentication
- **Static username/password protection** (separate from main app auth)
- Only you have access to this section
- Set credentials in `.env` file

### 📱 Flexible Monitoring
- **Group Chats**: Monitor entire groups or specific people within groups
- **Direct Messages**: Monitor individual conversations
- **Keyword Filtering**: Only respond to messages containing specific words
- **Multiple Monitors**: Track as many conversations as you need

### 🤖 AI-Powered Responses
- Custom AI prompts for each monitor
- Powered by Groq AI (llama-3.1-70b-versatile)
- Natural, context-aware responses
- Option to monitor-only (no auto-response)

### 📊 Activity Tracking
- View all monitored messages
- See AI responses sent
- Export logs to CSV
- Search and filter capabilities

---

## 🚀 Setup Instructions

### Step 1: Install Dependencies

```powershell
npm install facebook-chat-api
```

### Step 2: Run Database Migration

Go to your Supabase SQL Editor and run:
```sql
-- File: database/facebook-schema.sql
```

This creates:
- `facebook_configurations` - Your monitor settings
- `facebook_credentials` - Facebook session data
- `facebook_activity_logs` - Message history
- `facebook_responded_messages` - Duplicate prevention

### Step 3: Configure Environment Variables

Add to your `.env` or `.env.local` file:

```env
# Facebook Section Authentication
FACEBOOK_AUTH_USERNAME=your_secret_username
FACEBOOK_AUTH_PASSWORD=your_secret_password
```

⚠️ **IMPORTANT**: These are static credentials for the Facebook section only, separate from your Supabase auth.

### Step 4: Get Facebook Session Data

You'll need to extract your Facebook session cookies (appState):

#### Option 1: Using Browser DevTools
1. Login to Facebook in your browser
2. Open DevTools (F12)
3. Go to Application → Cookies
4. Copy all Facebook cookies
5. Format as JSON appState

#### Option 2: Using facebook-chat-api (Recommended)
```javascript
const login = require("facebook-chat-api");

login({email: "YOUR_EMAIL", password: "YOUR_PASSWORD"}, (err, api) => {
    if(err) return console.error(err);
    
    // Save this appState securely
    console.log(JSON.stringify(api.getAppState()));
});
```

⚠️ **Security Warning**: Keep your appState secure! It's equivalent to your Facebook password.

### Step 5: Find Thread IDs

#### For Group Chats:
1. Open the group in Facebook Messenger
2. Look at the URL: `facebook.com/messages/t/1234567890`
3. The number is your Thread ID

#### For Direct Messages:
1. Open the conversation
2. Check the URL: `facebook.com/messages/t/100012345678`
3. The number is your Thread ID

---

## 📋 How to Use

### Accessing the Facebook Section

1. Navigate to the main dashboard
2. Click **"Facebook 🔒"** in the navigation menu
3. Enter your static credentials (from `.env`)
4. You're in! 🎉

### Setting Up a Monitor

1. Click **"Add Monitor"**
2. Choose type: **Group Chat** or **Direct Message**
3. Enter the **Thread ID** (from Facebook URL)
4. Give it a **Display Name** (e.g., "Work Team")
5. (Optional) For groups: Monitor specific person by User ID
6. (Optional) Add **keywords** to filter messages
7. Customize **AI Prompt Template**
8. Toggle **Auto-respond** on/off
9. Click **"Save Configuration"**

### Example Configuration

#### Work Group - Boss Only
```
Type: Group Chat
Thread ID: 123456789
Display Name: Work Team
Monitor Person ID: 987654321
Monitor Person Name: Boss Name
Keywords: urgent, deadline, meeting
AI Prompt: You are a professional assistant. Respond politely and efficiently to work-related requests.
Auto-respond: ON
```

#### Family Chat - All Messages
```
Type: Group Chat
Thread ID: 555666777
Display Name: Family Group
Keywords: (leave empty for all messages)
AI Prompt: You are a friendly family member. Respond warmly and conversationally.
Auto-respond: ON
```

#### Friend DM
```
Type: Direct Message
Thread ID: 111222333
Display Name: John Doe
AI Prompt: Respond as a close friend. Be casual and supportive.
Auto-respond: ON
```

---

## 🔧 Worker Integration

The Facebook monitoring runs in your worker service alongside email monitoring.

### Starting the Service

The Facebook worker automatically starts when you:
1. Toggle the service to **Active** in the UI
2. Save a configuration with active monitors

### Worker Behavior

- **Real-time monitoring**: Listens for new messages continuously
- **Duplicate prevention**: Never responds to the same message twice
- **Keyword filtering**: Only processes messages with specified keywords
- **Error handling**: Logs errors without crashing the service

---

## 🎯 API Endpoints

All Facebook endpoints require **Basic Authentication** with your static credentials:

```javascript
const credentials = btoa(`${username}:${password}`);
headers: {
  'Authorization': `Basic ${credentials}`
}
```

### Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/facebook/auth` | POST | Validate credentials |
| `/api/facebook/config/get` | GET | Get configuration |
| `/api/facebook/config/save` | POST | Save configuration |
| `/api/facebook/service/toggle` | POST | Start/stop monitoring |
| `/api/facebook/logs` | GET | Get activity logs |

---

## 📊 Database Schema

### facebook_configurations
```sql
- id: UUID (primary key)
- user_id: UUID (references users)
- monitors: JSONB (array of monitor configs)
- default_prompt_template: TEXT
- check_interval_seconds: INTEGER (default: 60)
- is_active: BOOLEAN
```

### facebook_credentials
```sql
- id: UUID (primary key)
- user_id: UUID (references users)
- app_state: TEXT (encrypted session)
- expires_at: TIMESTAMP
```

### facebook_activity_logs
```sql
- id: UUID (primary key)
- user_id: UUID
- monitor_id: TEXT
- thread_name: TEXT
- sender_name: TEXT
- message_content: TEXT
- ai_response: TEXT
- response_sent: BOOLEAN
- status: TEXT (NEW_MESSAGE, RESPONDED, FILTERED, ERROR)
- timestamp: TIMESTAMP
```

---

## 🔒 Security Considerations

### ✅ What's Secure
- Static auth protects Facebook section from unauthorized access
- Separate credentials from main app authentication
- RLS policies on all database tables
- Facebook credentials encrypted in database

### ⚠️ Important Notes
- **Unofficial API**: facebook-chat-api uses unofficial methods
- **Account Risk**: Facebook may flag unusual activity
- **Session Expiry**: May need to refresh appState periodically
- **Rate Limits**: Don't spam too many messages

### 🛡️ Best Practices
- Use a **separate Facebook account** for automation (recommended)
- Set reasonable check intervals (60+ seconds)
- Test with low-traffic groups first
- Monitor activity logs for errors
- Keep credentials in `.env` (never commit to git)

---

## 🐛 Troubleshooting

### Authentication Failed
- Check `.env` file has correct credentials
- Verify no typos in username/password
- Restart Next.js server after changing `.env`

### Worker Not Monitoring
- Check service is toggled **Active**
- Verify Facebook credentials are saved
- Look for errors in worker logs
- Ensure Thread IDs are correct

### No Messages Detected
- Confirm Thread ID is accurate
- Check if keywords are too restrictive
- Verify monitor is toggled **Active**
- Test by sending a message to the thread

### Response Not Sent
- Check **Auto-respond** is enabled
- Verify Groq API key is valid
- Look for errors in activity logs
- Ensure appState hasn't expired

---

## 📁 File Structure

```
app/
├── facebook/
│   ├── page.tsx                 # Main monitoring page
│   └── activity/
│       └── page.tsx             # Activity logs page
├── api/
│   └── facebook/
│       ├── auth/route.ts        # Auth validation
│       ├── config/
│       │   ├── get/route.ts     # Get config
│       │   └── save/route.ts    # Save config
│       ├── service/
│       │   └── toggle/route.ts  # Start/stop
│       └── logs/route.ts        # Activity logs

lib/
├── facebook/
│   ├── auth.ts                  # Auth middleware
│   ├── client.ts                # Facebook API client
│   └── queries.ts               # Database queries

types/
└── facebook.ts                  # TypeScript types

database/
└── facebook-schema.sql          # Database schema

worker/
└── src/
    └── facebook-worker.ts       # Worker integration
```

---

## 🎨 UI Features

### Main Monitoring Page (`/facebook`)
- Add/remove monitors
- Configure each monitor individually
- Toggle auto-respond per monitor
- Global settings (check interval, default prompt)
- Service on/off switch

### Activity Logs Page (`/facebook/activity`)
- View all monitored messages
- See AI responses sent
- Search and filter
- Export to CSV
- Real-time updates

---

## 🚀 Advanced Usage

### Custom AI Prompts

#### Professional Assistant
```
You are a professional assistant. Keep responses concise, polite, and business-appropriate. Acknowledge requests and indicate you'll help soon.
```

#### Friendly Casual
```
You are a casual friend. Use relaxed language, emojis occasionally, and be supportive. Keep it light and friendly.
```

#### Technical Support
```
You are a knowledgeable technical assistant. Provide clear, step-by-step guidance. Ask clarifying questions when needed.
```

### Keyword Strategies

- **Urgent matters**: `urgent, asap, emergency, important`
- **Questions**: `?, question, help, how`
- **Work related**: `meeting, deadline, report, project`
- **Personal**: `family, weekend, dinner, plans`

---

## 🎯 Next Steps

1. ✅ Run database migration
2. ✅ Set environment variables
3. ✅ Get Facebook appState
4. ✅ Find your thread IDs
5. ✅ Create your first monitor
6. ✅ Test with a message
7. ✅ Monitor activity logs
8. ✅ Adjust AI prompts as needed

---

## 💡 Tips & Tricks

- **Start small**: Test with one low-traffic conversation first
- **Monitor before auto-respond**: Set `auto_respond: false` initially
- **Use descriptive names**: Makes logs easier to read
- **Review regularly**: Check activity logs for quality
- **Adjust prompts**: Refine AI behavior over time
- **Backup appState**: Save it securely in case you need to reconnect

---

## 📞 Support

If you encounter issues:
1. Check the **Activity Logs** for error messages
2. Review **Worker Logs** for detailed errors
3. Verify all **environment variables** are set
4. Test **Facebook credentials** separately
5. Check **Supabase** database tables

---

## ✨ You're All Set!

Your email automation app now has powerful Facebook Messenger monitoring capabilities. Happy automating! 🚀

---

**Note**: Remember to use this feature responsibly and in compliance with Facebook's Terms of Service.
