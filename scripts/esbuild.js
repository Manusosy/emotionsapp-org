const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const esbuild = require('esbuild');

// Run setup-env first to load environment variables
require('./setup-env').parseEnvFile();

// Create dist directory if it doesn't exist
const distDir = path.resolve(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

console.log('Starting esbuild process...');

// Copy public directory
const publicDir = path.resolve(__dirname, '../public');
if (fs.existsSync(publicDir)) {
  copyDirectory(publicDir, distDir);
  console.log('Copied public directory to dist');
}

// Install necessary plugins if they don't exist
try {
  require('esbuild-plugin-postcss2');
} catch (err) {
  console.log('Installing esbuild-plugin-postcss2...');
  execSync('npm install --no-save esbuild-plugin-postcss2', { stdio: 'inherit' });
}

// Build the app
async function build() {
  try {
    const postcss = require('esbuild-plugin-postcss2');
    
    await esbuild.build({
      entryPoints: ['src/main.tsx'],
      bundle: true,
      minify: true,
      splitting: true,
      format: 'esm',
      outdir: 'dist',
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
      },
      plugins: [
        postcss({
          plugins: [
            require('tailwindcss'),
            require('autoprefixer')
          ]
        })
      ],
      define: {
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || ''),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || ''),
        'import.meta.env.VITE_DAILY_API_KEY': JSON.stringify(process.env.VITE_DAILY_API_KEY || '87f0c35f773411583c35bf5c5d79488504f3d872542fdf8cc8a5f9e1e1f60ef8'),
        'import.meta.env.VITE_DAILY_DOMAIN': JSON.stringify(process.env.VITE_DAILY_DOMAIN || 'emotionsapp.daily.co'),
        'import.meta.env.VITE_APP_URL': JSON.stringify(process.env.VITE_APP_URL || 'https://emotionsapp.vercel.app'),
        'process.env.NODE_ENV': JSON.stringify('production')
      }
    });

    // Create HTML file
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Emotions App</title>
  <link rel="icon" type="image/png" href="/emotions-favicon.png">
  <link rel="stylesheet" href="/main.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/main.js"></script>
</body>
</html>`;

    fs.writeFileSync(path.join(distDir, 'index.html'), htmlContent);
    console.log('Created index.html');

    // Create _redirects file for client-side routing
    fs.writeFileSync(path.join(distDir, '_redirects'), '/* /index.html 200');

    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    
    // Fall back to static page if build fails
    createStaticFallback();
    
    // Exit with error code
    process.exit(1);
  }
}

// Create a static fallback page if the build fails
function createStaticFallback() {
  console.log('Creating static fallback page...');
  
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Emotions App</title>
  <style>
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
      min-height: 100vh;
      padding: 20px;
      text-align: center;
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
    .status {
      display: inline-block;
      background-color: #d1fae5;
      color: #065f46;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      font-weight: 600;
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Emotions App</h1>
    
    <div class="card">
      <p>This page confirms that the web server is working correctly. The application structure has been reorganized and is ready for further development.</p>
      
      <div class="status">Server Status: Active</div>
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(distDir, 'index.html'), htmlContent);
  console.log('Static fallback page created successfully.');
}

// Run the build
build();

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