/**
 * Custom build script for Vercel deployment
 * This script bypasses the Rollup native module issue by using environment variables
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get the directory name using ESM standard
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Check if we're running in a Vercel environment
const isVercel = process.env.VERCEL === '1';

console.log(`Running custom build script in ${isVercel ? 'Vercel' : 'local'} environment`);

// Set environment variables to disable native modules in Rollup
process.env.ROLLUP_SKIP_NODEJS_NATIVE_MODULES = 'true';
process.env.ROLLUP_NATIVE_MODULES = 'never';
process.env.ROLLUP_PURE_JS = 'true';

// Function to run the build command
async function runBuild() {
  return new Promise((resolve, reject) => {
    console.log('Starting Vite build with native modules disabled...');
    
    // Create the Vite build process
    const buildProcess = spawn('npx', ['vite', 'build'], {
      cwd: rootDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        ROLLUP_SKIP_NODEJS_NATIVE_MODULES: 'true',
        ROLLUP_NATIVE_MODULES: 'never',
        ROLLUP_PURE_JS: 'true',
        VITE_DISABLE_NATIVE: 'true'
      }
    });
    
    buildProcess.on('close', (code) => {
      if (code === 0) {
        console.log('Build completed successfully!');
        resolve();
      } else {
        console.error(`Build failed with code ${code}`);
        reject(new Error(`Build process exited with code ${code}`));
      }
    });
    
    buildProcess.on('error', (err) => {
      console.error('Failed to start build process:', err);
      reject(err);
    });
  });
}

// Create a simple vite.pure.js config that doesn't use native modules
function createPureViteConfig() {
  const configContent = `
// Pure JS Vite config without native dependencies
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      external: [/@rollup\\/rollup-.*/],
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['react-router-dom']
        }
      }
    }
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
    'import.meta.env.VITE_DAILY_API_KEY': JSON.stringify(process.env.VITE_DAILY_API_KEY || '87f0c35f773411583c35bf5c5d79488504f3d872542fdf8cc8a5f9e1e1f60ef8'),
    'import.meta.env.VITE_DAILY_DOMAIN': JSON.stringify(process.env.VITE_DAILY_DOMAIN || 'emotionsapp.daily.co'),
    'import.meta.env.VITE_APP_URL': JSON.stringify(process.env.VITE_APP_URL || 'https://emotionsapp.vercel.app'),
  }
});
`;

  const configPath = path.join(rootDir, 'vite.pure.js');
  fs.writeFileSync(configPath, configContent, 'utf8');
  console.log('Created pure JS Vite config at', configPath);
  return configPath;
}

// Main function
async function main() {
  try {
    if (isVercel) {
      console.log('Running in Vercel environment, creating pure JS config...');
      const pureConfigPath = createPureViteConfig();
      
      // Override the VITE_CONFIG_PATH environment variable
      process.env.VITE_CONFIG_PATH = pureConfigPath;
      process.env.VITE_FORCE_PURE_JS = 'true';
    }
    
    await runBuild();
    process.exit(0);
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Run the main function
main(); 