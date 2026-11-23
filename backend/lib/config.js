/**
 * Backend Configuration Module
 * Loads and validates environment variables listed in .env.example.
 * Fails fast at startup if critical credentials like GEMINI_API_KEY are missing.
 * Never prints or leaks secret keys in error messages, logs, or outputs.
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Attempt to load .env from backend directory first, then root directory if present
const localEnvPath = path.resolve(__dirname, '..', '.env');
const rootEnvPath = path.resolve(__dirname, '..', '..', '.env');

if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

const geminiApiKey = process.env.GEMINI_API_KEY;

// Fail fast at startup if GEMINI_API_KEY is missing
if (!geminiApiKey || geminiApiKey.trim() === '') {
  console.error('FATAL CONFIGURATION ERROR: GEMINI_API_KEY is required but not set.');
  console.error('Please configure GEMINI_API_KEY in your environment or backend/.env file.');
  process.exit(1);
}

const config = {
  // Never expose or print raw key in logs
  geminiApiKey: geminiApiKey.trim(),
  geminiModel: (process.env.GEMINI_MODEL && process.env.GEMINI_MODEL.trim()) || 'gemini-1.5-flash',
  allowedOrigin: (process.env.ALLOWED_ORIGIN && process.env.ALLOWED_ORIGIN.trim()) || '',
  port: parseInt(process.env.PORT || '5000', 10),
  rateLimitPerMin: parseInt(process.env.RATE_LIMIT_PER_MIN || '30', 10),
};

module.exports = Object.freeze(config);
