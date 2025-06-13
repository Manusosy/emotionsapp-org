
#!/usr/bin/env node

/**
 * This script ensures all platform-specific dependencies are handled
 * before starting the development server
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const platform = os.platform();

console.log(`Starting dev server on platform: ${platform}`);

try {
  // Fix Radix UI toggle components first
  console.log('Running fix-radix.js...');
  execSync('node scripts/fix-radix.js', { stdio: 'inherit' });
  console.log('✅ Radix components fixed');
  
  // Now start the dev server with the Vite workarounds
  console.log('Starting Vite dev server...');
  execSync('vite --force', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_USE_FALLBACKS: 'true'
    }
  });
} catch (error) {
  console.error('Error starting development server:', error);
  process.exit(1);
}
