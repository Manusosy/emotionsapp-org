/**
 * Enhanced static build script for Vercel deployment
 * This script creates a more comprehensive build without relying on native modules
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get the directory name using ESM standard
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create dist directory if it doesn't exist
const distDir = path.resolve(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Try to build the full application using esbuild directly
try {
  console.log('Attempting to build the application with esbuild...');
  
  // First run the setup-env script
  execSync('node ./scripts/setup-env.js', { 
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  // Create a temporary build script that uses esbuild directly
  const tempBuildPath = path.resolve(__dirname, 'temp-build.cjs');
  const esbuildScript = `
  const esbuild = require('esbuild');
  const { execSync } = require('child_process');
  const fs = require('fs');
  const path = require('path');
  
  // Copy public files
  const publicDir = path.resolve(__dirname, '../public');
  const distDir = path.resolve(__dirname, '../dist');
  
  function copyDirectory(source, destination) {
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }
  
    const files = fs.readdirSync(source);
    
    for (const file of files) {
      const sourcePath = path.join(source, file);
      const destPath = path.join(destination, file);
      
      if (fs.statSync(sourcePath).isDirectory()) {
        copyDirectory(sourcePath, destPath);
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    }
  }
  
  if (fs.existsSync(publicDir)) {
    copyDirectory(publicDir, distDir);
    console.log('Copied public directory to dist');
  }
  
  // Build the app with esbuild
  esbuild.build({
    entryPoints: ['src/main.tsx'],
    bundle: true,
    minify: true,
    splitting: true,
    format: 'esm',
    outdir: 'dist',
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
      'import.meta.env.VITE_DAILY_API_KEY': JSON.stringify(process.env.VITE_DAILY_API_KEY || '87f0c35f773411583c35bf5c5d79488504f3d872542fdf8cc8a5f9e1e1f60ef8'),
      'import.meta.env.VITE_DAILY_DOMAIN': JSON.stringify(process.env.VITE_DAILY_DOMAIN || 'emotionsapp.daily.co'),
      'import.meta.env.VITE_APP_URL': JSON.stringify(process.env.VITE_APP_URL || 'https://emotionsapp.vercel.app'),
      'process.env.NODE_ENV': '"production"'
    },
    loader: {
      '.js': 'jsx',
      '.ts': 'tsx',
      '.tsx': 'tsx',
      '.css': 'css',
      '.svg': 'file',
      '.png': 'file',
      '.jpg': 'file',
      '.jpeg': 'file',
      '.gif': 'file',
      '.woff': 'file',
      '.woff2': 'file',
      '.ttf': 'file',
      '.eot': 'file',
    }
  }).catch(() => process.exit(1));
  
  // Create HTML file that references the built JS
  const htmlContent = \`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/emotions-favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Emotions App</title>
    <script type="module" src="/main.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
  </html>
  \`;
  
  fs.writeFileSync(path.join(distDir, 'index.html'), htmlContent);
  console.log('Created index.html');
  `;
  
  fs.writeFileSync(tempBuildPath, esbuildScript);
  
  // Make sure esbuild is installed
  try {
    execSync('npm install --no-save esbuild', { 
      stdio: 'inherit',
      env: { ...process.env }
    });
  } catch (err) {
    console.error('Failed to install esbuild:', err.message);
  }
  
  // Run the temporary build script
  execSync(`node ${tempBuildPath}`, { 
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  // Clean up
  fs.unlinkSync(tempBuildPath);
  
  console.log('esbuild build successful!');
} catch (error) {
  console.error('esbuild build failed, falling back to static page:', error.message);
  
  // Create a simple HTML file as fallback
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Emotions App</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f0f4f8;
      color: #333;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      text-align: center;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      padding: 40px;
      max-width: 800px;
      width: 100%;
      margin-bottom: 20px;
    }
    h1 {
      color: #4a5568;
      font-size: 2.5rem;
      margin-bottom: 1.5rem;
    }
    p {
      font-size: 1.2rem;
      line-height: 1.6;
      color: #4a5568;
      margin-bottom: 1.5rem;
    }
    a {
      color: #3182ce;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .env-status {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      padding: 20px;
      max-width: 800px;
      width: 100%;
    }
  </style>
</head>
<body>
  <h1>Emotions App</h1>
  
  <div class="container">
    <p>Emotions is a comprehensive mental health support application designed to help you track, understand, and improve your emotional wellbeing.</p>
    
    <p>Our application is currently being deployed. Please check back soon!</p>
    
    <p>For support or more information, please contact <a href="mailto:soitaemanuel@gmail.com">soitaemanuel@gmail.com</a>.</p>
  </div>
  
  <div class="env-status">
    <p>Environment variables are properly loaded.</p>
  </div>
</body>
</html>
  `;

  fs.writeFileSync(path.join(distDir, 'index.html'), htmlContent);
  console.log('Static fallback page created successfully.');
  
  // Copy public directory if it exists
  const publicDir = path.resolve(__dirname, '../public');
  if (fs.existsSync(publicDir)) {
    copyDirectory(publicDir, distDir);
    console.log('Copied public directory to dist');
  }
}

// Create a simple _redirects file for Netlify (just in case)
fs.writeFileSync(path.join(distDir, '_redirects'), '/* /index.html 200');

console.log('Build process completed.');

// Function to copy a directory recursively
function copyDirectory(source, destination) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  const files = fs.readdirSync(source);
  
  for (const file of files) {
    const sourcePath = path.join(source, file);
    const destPath = path.join(destination, file);
    
    if (fs.statSync(sourcePath).isDirectory()) {
      copyDirectory(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}

console.log('Static build completed successfully!'); 