import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import './styles/App.css';
import 'tailwindcss/tailwind.css';
import App from './App';
import ensureStorageBucketsExist from './utils/storage-setup';

// Check for environment variables
const checkEnvironment = () => {
  // Define environment variable keys to check
  const envKeys = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_DAILY_DOMAIN', 'VITE_DAILY_API_KEY'];
  
  // Check each source for the variables
  const missingVars = envKeys.filter(key => {
    // Check both sources
    const fromWindow = window.ENV_CONFIG?.[key];
    const fromVite = import.meta.env[key];
    
    // Log source for debugging
    if (fromWindow) console.log(`${key} found in window.ENV_CONFIG`);
    else if (fromVite) console.log(`${key} found in import.meta.env`);
    
    // Return true if the variable is missing from both sources
    return !fromWindow && !fromVite;
  });
  
  if (missingVars.length > 0) {
    console.warn(
      `⚠️ Missing environment variables: ${missingVars.join(', ')}.\n` +
      `Please check that your environment is properly configured.`
    );
  } else {
    console.log('✅ Environment variables loaded successfully.');
  }

  // Add specific logging for Daily.co variables
  const dailyApiKey = window.ENV_CONFIG?.VITE_DAILY_API_KEY || import.meta.env.VITE_DAILY_API_KEY;
  const dailyDomain = window.ENV_CONFIG?.VITE_DAILY_DOMAIN || import.meta.env.VITE_DAILY_DOMAIN;
  
  console.log('Daily.co API Key present:', !!dailyApiKey);
  if (dailyApiKey) {
    console.log('Daily.co API Key length:', dailyApiKey.length);
    console.log('Daily.co API Key first 5 chars:', dailyApiKey.substring(0, 5) + '...');
  }
  
  console.log('Daily.co Domain:', dailyDomain || 'Not set');
  
  // Create a global ENV_CONFIG object if it doesn't exist
  if (typeof window !== 'undefined' && !window.ENV_CONFIG) {
    window.ENV_CONFIG = {};
  }
  
  // Ensure Daily.co variables are available in window.ENV_CONFIG
  if (typeof window !== 'undefined' && window.ENV_CONFIG) {
    if (!window.ENV_CONFIG.VITE_DAILY_API_KEY && import.meta.env.VITE_DAILY_API_KEY) {
      window.ENV_CONFIG.VITE_DAILY_API_KEY = import.meta.env.VITE_DAILY_API_KEY;
      console.log('Copied Daily.co API Key from import.meta.env to window.ENV_CONFIG');
    }
    
    if (!window.ENV_CONFIG.VITE_DAILY_DOMAIN && import.meta.env.VITE_DAILY_DOMAIN) {
      window.ENV_CONFIG.VITE_DAILY_DOMAIN = import.meta.env.VITE_DAILY_DOMAIN;
      console.log('Copied Daily.co Domain from import.meta.env to window.ENV_CONFIG');
    }
  }
};

// Initialize storage buckets
const setupStorage = async () => {
  try {
    console.log('Checking storage buckets...');
    const result = await ensureStorageBucketsExist();
    
    if (result.success) {
      console.log('✅ Storage buckets ready!');
      if (result.createdBuckets.length > 0) {
        console.log(`Created buckets: ${result.createdBuckets.join(', ')}`);
      }
    } else {
      console.warn('⚠️ Some storage buckets could not be set up:');
      console.warn('Errors:', result.errors);
      console.log('You may experience issues with file uploads.');
    }
  } catch (error) {
    console.error('Failed to set up storage buckets:', error);
  }
};

// Start application with environment checks
const startApp = async () => {
  checkEnvironment();
  
  // Setup storage in the background
  setupStorage().catch(err => {
    console.error('Storage setup error:', err);
  });
  
  // Simple root rendering
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');

  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

// Initialize the app
startApp();
