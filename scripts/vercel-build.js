// This script ensures environment variables are properly loaded during Vercel build
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get the directory name using ESM standard
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the env-config.js file in the public directory
const envConfigPath = path.join(__dirname, '../public/env-config.js');

// Create the env-config.js file with environment variables from Vercel
function createEnvConfig() {
  const envConfig = `
// This file is auto-generated during the build process
window.ENV_CONFIG = {
  VITE_SUPABASE_URL: "${process.env.VITE_SUPABASE_URL || 'https://hibeorkevqignkinaafy.supabase.co'}",
  VITE_SUPABASE_ANON_KEY: "${process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpYmVvcmtldnFpZ25raW5hYWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MTMwNjgsImV4cCI6MjA2MzM4OTA2OH0.T-Dda-Rox11B6YFgrOt2PpK_vzhNB7GRuf5RxnYhNOE'}",
  VITE_DAILY_DOMAIN: "${process.env.VITE_DAILY_DOMAIN || 'emotionsapp.daily.co'}",
  VITE_DAILY_API_KEY: "${process.env.VITE_DAILY_API_KEY || '87f0c35f773411583c35bf5c5d79488504f3d872542fdf8cc8a5f9e1e1f60ef8'}",
  VITE_APP_URL: "${process.env.VITE_APP_URL || 'https://emotions-app.com'}"
};
`;

  // Write the env-config.js file
  fs.writeFileSync(envConfigPath, envConfig, 'utf8');
  console.log('Created env-config.js with environment variables');
}

// Execute the function with error handling
try {
  createEnvConfig();
  console.log('Successfully created env-config.js');
} catch (error) {
  console.error('Error creating env-config.js:', error);
  // Don't fail the build, but log the error
  console.log('Continuing build process despite error...');
} 