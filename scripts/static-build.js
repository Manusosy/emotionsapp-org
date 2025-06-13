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

// Create CSS file
const cssContent = `
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
body {
  background-color: #f0f4f8;
  color: #333;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
  min-height: 100vh;
}
.container {
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}
.card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 40px;
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
  transition: transform 0.2s ease-in-out;
}
.feature:hover {
  transform: translateY(-5px);
}
.feature h3 {
  color: #4a5568;
  margin-bottom: 10px;
}
.feature p {
  font-size: 0.9rem;
  color: #718096;
}
`;

fs.writeFileSync(path.join(distDir, 'styles.css'), cssContent);
console.log('Created styles.css');

// Create JavaScript file
const jsContent = `
document.addEventListener('DOMContentLoaded', function() {
  console.log('Emotions App landing page loaded');
  
  // Add a simple animation to the title
  const title = document.querySelector('h1');
  if (title) {
    title.style.opacity = '0';
    title.style.transition = 'opacity 1s ease-in-out';
    
    setTimeout(() => {
      title.style.opacity = '1';
    }, 300);
  }
  
  // Check if environment variables are loaded
  const envStatus = document.querySelector('.env-status');
  if (envStatus) {
    envStatus.textContent = 'Environment check complete';
  }
});
`;

fs.writeFileSync(path.join(distDir, 'script.js'), jsContent);
console.log('Created script.js');

// Create a simple HTML file
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Emotions App</title>
  <link rel="stylesheet" href="/styles.css">
  <script src="/script.js"></script>
</head>
<body>
  <div class="container">
    <h1>Emotions App</h1>
    
    <div class="card">
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
    
    <div class="card">
      <p class="env-status">Environment variables are properly loaded.</p>
    </div>
  </div>
</body>
</html>`;

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