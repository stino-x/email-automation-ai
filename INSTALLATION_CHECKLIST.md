# ✅ Installation Checklist - Facebook Messenger Monitoring

Follow this checklist in order to get everything working:

## ☑️ Step 1: Install Dependencies

```powershell
npm install facebook-chat-api
```

**Expected output:** Package successfully installed

---

## ☑️ Step 2: Set Environment Variables

Create or edit your `.env` or `.env.local` file and add:

```env
FACEBOOK_AUTH_USERNAME=admin
FACEBOOK_AUTH_PASSWORD=your_secure_password_123
```

**Replace with your own username/password** (not your Facebook credentials!)

---

## ☑️ Step 3: Restart Development Server

```powershell
# Stop current server (Ctrl+C)
npm run dev
```

**Expected output:** Server running on http://localhost:3000

---

## ☑️ Step 4: Run Database Migration

1. Go to your **Supabase project dashboard**
2. Click **SQL Editor** in the sidebar
3. Create a new query
4. Copy and paste all contents from `database/facebook-schema.sql`
5. Click **Run** button

**Expected output:** "Success. No rows returned"

This creates 4 new tables:
- ✅ facebook_configurations
- ✅ facebook_credentials  
- ✅ facebook_activity_logs
- ✅ facebook_responded_messages

---

## ☑️ Step 5: Verify Navigation

1. Open your app: http://localhost:3000
2. Login to your account
3. Look for **"Facebook 🔒"** link in the navigation bar

**Expected:** Link is visible in the navbar

---

## ☑️ Step 6: Test Authentication

1. Click **"Facebook 🔒"** link
2. You should see an authentication screen
3. Enter your username/password from Step 2
4. Click **"Access Facebook Monitoring"**

**Expected:** You're taken to the Facebook monitoring page

---

## ☑️ Step 7: Get Facebook Session (appState)

### Method 1: Using TypeScript Script (Interactive - Recommended)

Run the interactive script:
```powershell
npx ts-node scripts/get-facebook-session.ts
```

Enter your Facebook credentials when prompted. Your session will be extracted and displayed.

### Method 2: Using JavaScript Script (Quick)

Edit `scripts/get-facebook-session.js` with your credentials, then run:
```powershell
node scripts/get-facebook-session.js
```

**Expected:** Long JSON string printed to console. Copy and save it securely!

### Method 2: Browser DevTools (Alternative)

1. Open Facebook.com in browser
2. Login to your account
3. Press F12 (DevTools)
4. Go to Application → Cookies
5. Copy all Facebook cookies
6. Format as appState JSON

---

## ☑️ Step 8: Save Facebook Credentials in App

**NOTE:** This step will be done through the UI in a future update. For now, you'll need to manually insert into Supabase:

1. Go to Supabase → Table Editor
2. Select `facebook_credentials` table
3. Click **Insert row**
4. Fill in:
   - `user_id`: Your user ID (from users table)
   - `app_state`: The JSON string from Step 7
   - `expires_at`: Set to a future date (e.g., 30 days from now)

**Expected:** Row inserted successfully

---

## ☑️ Step 9: Find Thread IDs

### For Group Chats:
1. Open Facebook Messenger
2. Click on a group chat
3. Look at the URL: `facebook.com/messages/t/1234567890`
4. Copy the number: **1234567890**

### For Direct Messages:
Same process - the number in the URL is your Thread ID

---

## ☑️ Step 10: Configure Your First Monitor

1. In your app, go to `/facebook`
2. Authenticate (Step 6)
3. Click **"Add Monitor"**
4. Fill in:
   - **Type:** Group Chat or DM
   - **Thread ID:** From Step 9
   - **Display Name:** "My Test Group" (any name)
   - **Keywords:** Leave empty for now (monitors all messages)
   - **AI Prompt:** Use default or customize
   - **Auto-respond:** Toggle ON
5. Click **"Save Configuration"**

**Expected:** "Configuration saved successfully!" toast message

---

## ☑️ Step 11: Start Monitoring

1. Toggle the **Service** switch to **Active** (top right)
2. Monitor should show as active

**Expected:** Badge changes to "Active" (green)

---

## ☑️ Step 12: Test It! 🎉

1. From another device/account, send a message to the configured thread
2. Wait 10-30 seconds
3. Check if AI responds
4. Go to `/facebook/activity` to see the log

**Expected:** Message logged, AI response sent!

---

## 🎯 Verification Checklist

Check off each item:

- [ ] `facebook-chat-api` package installed
- [ ] Environment variables set in `.env`
- [ ] Dev server restarted
- [ ] Database migration run successfully
- [ ] 4 new tables visible in Supabase
- [ ] "Facebook 🔒" link visible in navbar
- [ ] Authentication screen works
- [ ] Can access `/facebook` page
- [ ] Facebook appState obtained
- [ ] Credentials saved in database
- [ ] Thread IDs identified
- [ ] First monitor configured
- [ ] Service toggled to Active
- [ ] Test message sent
- [ ] AI response received
- [ ] Activity log shows entry

---

## 🐛 Troubleshooting

### Can't install facebook-chat-api?
```powershell
npm install --legacy-peer-deps facebook-chat-api
```

### Authentication fails?
- Check `.env` file exists in root directory
- Verify no typos in credentials
- Restart dev server: `npm run dev`

### Database migration errors?
- Ensure you're in the correct Supabase project
- Check if tables already exist (they shouldn't on first run)
- Try running each `CREATE TABLE` statement separately

### Facebook login fails?
- Use your actual Facebook credentials
- Check for 2FA (may need app-specific password)
- Try from a different IP if blocked

### No AI response?
- Check Groq API key is valid (`GROQ_API_KEY` in `.env`)
- Verify service is Active
- Check `/facebook/activity` logs for errors
- Ensure Thread ID is correct

### Worker not starting?
- Check worker service is running (separate terminal)
- Verify Facebook credentials in database
- Look for errors in worker console logs

---

## 📞 Need Help?

If you encounter issues not covered here:

1. Check the error message in browser console (F12)
2. Look at worker logs if running separately
3. Review `/facebook/activity` logs for details
4. Check Supabase logs for database errors
5. Verify all environment variables are set correctly

---

## 🎉 Success!

Once all checkboxes are checked, your Facebook Messenger monitoring is **fully operational**!

You can now:
- ✅ Monitor unlimited conversations
- ✅ Auto-respond with AI
- ✅ Filter by keywords
- ✅ Track all activity
- ✅ Export logs

**Happy automating!** 🚀
