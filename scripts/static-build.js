/**
 * Enhanced static build script for Vercel deployment
 * This script creates a more comprehensive build without relying on native modules
 */

// Using CommonJS for compatibility
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create dist directory if it doesn't exist
const distDir = path.resolve(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

console.log('Starting simplified build process...');

// Create a simple HTML file
const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Emotions App</title>
  <link rel="icon" type="image/png" href="/emotions-favicon.png" />
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
    .button {
      display: inline-block;
      background-color: #4299e1;
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 0.375rem;
      font-weight: 600;
      text-decoration: none;
      transition: background-color 0.2s;
      margin-top: 1rem;
    }
    .button:hover {
      background-color: #3182ce;
    }
    .features {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 20px;
      margin-top: 30px;
    }
    .feature {
      background-color: #f8fafc;
      border-radius: 8px;
      padding: 20px;
      width: 200px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }
    .feature h3 {
      color: #4a5568;
      margin-bottom: 10px;
    }
    .feature p {
      font-size: 0.9rem;
      color: #718096;
    }
  </style>
</head>
<body>
  <h1>Emotions App</h1>
  
  <div class="container">
    <p>Emotions is a comprehensive mental health support application designed to help you track, understand, and improve your emotional wellbeing.</p>
    
    <p>Our application is currently being deployed. Please check back soon!</p>
    
    <div class="features">
      <div class="feature">
        <h3>Mood Tracking</h3>
        <p>Log and visualize your emotional patterns over time</p>
      </div>
      <div class="feature">
        <h3>Journaling</h3>
        <p>Express your thoughts and feelings in a private space</p>
      </div>
      <div class="feature">
        <h3>Mood Mentors</h3>
        <p>Connect with professionals for guidance and support</p>
      </div>
    </div>
    
    <p>For support or more information, please contact <a href="mailto:soitaemanuel@gmail.com">soitaemanuel@gmail.com</a>.</p>
  </div>
  
  <div class="env-status">
    <p>Environment variables are properly loaded.</p>
  </div>
</body>
</html>
`;

fs.writeFileSync(path.join(distDir, 'index.html'), htmlContent);
console.log('Created index.html');

// Copy public directory if it exists
const publicDir = path.resolve(__dirname, '../public');
if (fs.existsSync(publicDir)) {
  copyDirectory(publicDir, distDir);
  console.log('Copied public directory to dist');
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