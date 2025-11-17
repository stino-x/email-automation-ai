#!/usr/bin/env node
/**
 * Test server startup script
 * Loads .env.test.local and starts the Next.js dev server
 */

const { config } = require('dotenv');
const { spawn } = require('child_process');
const path = require('path');

// Load test environment variables
const envPath = path.join(__dirname, '..', '.env.test.local');
console.log('Loading test environment from:', envPath);
const result = config({ path: envPath });

if (result.error) {
  console.error('Error loading .env.test.local:', result.error);
  process.exit(1);
}

console.log('Loaded environment variables:', Object.keys(result.parsed || {}));

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Start the Next.js dev server with the loaded environment
console.log('Starting Next.js dev server...');
const child = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  env: process.env,
  shell: true
});

child.on('error', (error) => {
  console.error('Failed to start dev server:', error);
  process.exit(1);
});

child.on('close', (code) => {
  console.log('Dev server process exited with code:', code);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Stopping dev server...');
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Stopping dev server...');
  child.kill('SIGTERM');
});