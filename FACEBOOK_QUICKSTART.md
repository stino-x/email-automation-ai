# 🚀 Quick Start: Facebook Messenger Monitoring

Follow these steps to activate the Facebook monitoring feature:

## Step 1: Install npm Package

```powershell
npm install facebook-chat-api
```

## Step 2: Set Environment Variables

Add to your `.env` file (create if it doesn't exist):

```env
# Facebook Section Authentication
FACEBOOK_AUTH_USERNAME=admin
FACEBOOK_AUTH_PASSWORD=YourSecurePassword123!
```

Choose any username/password you want - these are **not** your Facebook credentials.

## Step 3: Run Database Migration

1. Go to your Supabase project
2. Open the SQL Editor
3. Copy and paste the contents of `database/facebook-schema.sql`
4. Click "Run"

## Step 4: Install Dependencies & Restart

```powershell
npm install
npm run dev
```

## Step 5: Access Facebook Section

1. Login to your app
2. Click **"Facebook 🔒"** in the navigation
3. Enter the username/password from Step 2
4. You're in!

## Step 6: Get Facebook Session Data

You need to get your Facebook appState (session cookies):

### Quick Method:
```javascript
// Create a file: get-appstate.js
const login = require("facebook-chat-api");

login({
  email: "your.facebook.email@example.com", 
  password: "your_facebook_password"
}, (err, api) => {
  if(err) return console.error(err);
  console.log(JSON.stringify(api.getAppState()));
});
```

Run it:
```powershell
node get-appstate.js
```

Save the output somewhere secure!

## Step 7: Configure Your First Monitor

1. Find a thread ID:
   - Open Facebook Messenger
   - Click on a conversation
   - Look at URL: `facebook.com/messages/t/1234567890`
   - Copy the number: `1234567890`

2. In the app:
   - Click "Add Monitor"
   - Enter Thread ID
   - Give it a name
   - Customize AI prompt
   - Toggle "Auto-respond" ON
   - Click "Save Configuration"

3. Toggle service to **Active**

## Step 8: Test It!

Send a message to that conversation from another device/account and watch the magic happen! ✨

---

## Troubleshooting

**Can't install facebook-chat-api?**
```powershell
npm install --legacy-peer-deps facebook-chat-api
```

**Authentication failed?**
- Check `.env` file exists
- Verify no typos in credentials
- Restart the dev server

**Worker not monitoring?**
- Check service is toggled Active
- Verify Thread ID is correct
- Look for errors in browser console

---

## Next Steps

- Read `FACEBOOK_FEATURE.md` for full documentation
- Check `/facebook/activity` page for logs
- Customize AI prompts for each conversation
- Add more monitors as needed

**Happy automating!** 🎉
