/**
 * Facebook Session Extractor (Simple Version)
 * 
 * This script logs into Facebook and extracts the session cookies (appState)
 * Usage: node scripts/get-facebook-session.js
 */

const login = require("facebook-chat-api");

// Replace with your actual Facebook credentials
const credentials = {
  email: "iheagwarqaustin214@gmail.com",
  password: "Meamater77#"
};

login(credentials, (err, api) => {
  if(err) {
    console.error("❌ Login failed:", err.message);
    console.log("\nCommon issues:");
    console.log("  • Wrong email/password");
    console.log("  • 2FA enabled (try app-specific password)");
    console.log("  • Account locked by Facebook");
    return;
  }
  
  const appState = JSON.stringify(api.getAppState());
  
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("✅ YOUR FACEBOOK SESSION (appState):");
  console.log("═══════════════════════════════════════════════════════\n");
  console.log(appState);
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("⚠️  SAVE THIS SECURELY - Don't commit to git!");
  console.log("═══════════════════════════════════════════════════════\n");
});
