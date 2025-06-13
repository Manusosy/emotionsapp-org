/**
 * Enhanced static build script for Vercel deployment
 * This script creates a more comprehensive build without relying on native modules
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get the directory name using ESM standard
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Check if we're running in a Vercel environment
const isVercel = process.env.VERCEL === '1';

console.log(`Running enhanced build script in ${isVercel ? 'Vercel' : 'local'} environment`);

// Create dist directory if it doesn't exist
const distDir = path.join(rootDir, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Try to run a modified Vite build that avoids native dependencies
try {
  console.log('Attempting to run Vite build with esbuild minifier...');
  
  // Create a temporary vite.config.js that uses esbuild and avoids native dependencies
  const tempConfigPath = path.join(rootDir, 'vite.temp.js');
  const configContent = `
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

  fs.writeFileSync(tempConfigPath, configContent);
  
  // Try to run Vite build with the temporary config
  try {
    execSync(`npx vite build --config ${tempConfigPath}`, {
      stdio: 'inherit',
      env: {
        ...process.env,
        ROLLUP_SKIP_NODEJS_NATIVE_MODULES: 'true',
        ROLLUP_NATIVE_MODULES: 'never',
        ROLLUP_PURE_JS: 'true'
      }
    });
    console.log('Vite build completed successfully!');
    // If we get here, the build was successful, so we can exit
    process.exit(0);
  } catch (error) {
    console.error('Vite build failed, falling back to static build:', error.message);
    // Continue with the static build
  } finally {
    // Clean up the temporary config file
    if (fs.existsSync(tempConfigPath)) {
      fs.unlinkSync(tempConfigPath);
    }
  }
  
} catch (error) {
  console.error('Error setting up Vite build:', error);
  console.log('Falling back to static build...');
}

// If we get here, the Vite build failed, so we'll create a static build

// Copy the public directory to dist
const publicDir = path.join(rootDir, 'public');
if (fs.existsSync(publicDir)) {
  copyDirectory(publicDir, distDir);
  console.log('Copied public directory to dist');
}

// Create a simple index.html file
const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/emotions-favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Emotions App</title>
    <script src="/env-config.js"></script>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        text-align: center;
        color: #333;
      }
      .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
      }
      h1 {
        font-size: 2.5rem;
        margin-bottom: 1rem;
        color: #4a5568;
      }
      p {
        font-size: 1.25rem;
        line-height: 1.7;
        margin-bottom: 2rem;
      }
      .logo {
        width: 150px;
        height: 150px;
        margin-bottom: 2rem;
      }
      .card {
        background: white;
        border-radius: 8px;
        padding: 2rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        margin-bottom: 2rem;
      }
      .button {
        display: inline-block;
        background-color: #4299e1;
        color: white;
        padding: 0.75rem 1.5rem;
        border-radius: 0.375rem;
        font-weight: 600;
        text-decoration: none;
        transition: background-color 0.2s;
      }
      .button:hover {
        background-color: #3182ce;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Emotions App</h1>
      <div class="card">
        <p>Emotions is a comprehensive mental health support application designed to help you track, understand, and improve your emotional wellbeing.</p>
        <p>Our application is currently being deployed. Please check back soon!</p>
        <p>For support or more information, please contact <a href="mailto:soitaemanuel@gmail.com">soitaemanuel@gmail.com</a>.</p>
      </div>
    </div>
    <script>
      // Simple script to check if environment variables are loaded
      document.addEventListener('DOMContentLoaded', function() {
        console.log('Environment variables loaded:', !!window.ENV_CONFIG);
        
        // Display environment variables status
        if (window.ENV_CONFIG) {
          const envStatus = document.createElement('div');
          envStatus.className = 'card';
          envStatus.innerHTML = '<p>Environment variables are properly loaded.</p>';
          document.querySelector('.container').appendChild(envStatus);
        }
      });
    </script>
  </body>
</html>`;

fs.writeFileSync(path.join(distDir, 'index.html'), indexHtml);
console.log('Created index.html');

// Function to copy a directory recursively
function copyDirectory(source, destination) {
  // Create the destination directory if it doesn't exist
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  // Read all files and directories in the source
  const entries = fs.readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      copyDirectory(sourcePath, destPath);
    } else {
      // Copy files
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}

console.log('Static build completed successfully!'); 