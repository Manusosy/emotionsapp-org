// This file updates the package.json scripts dynamically

const fs = require('fs');
const path = require('path');

// Path to package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');

// Read package.json
console.log('Reading package.json...');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Update scripts section
console.log('Updating scripts...');
packageJson.scripts = {
  ...packageJson.scripts,
  "dev": "vite",
  "build": "tsc && vite build",
  "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
  "preview": "vite preview",
  "predeploy": "npm run build",
  "deploy": "gh-pages -d dist"
};

// Remove any Netlify-related scripts
if (packageJson.scripts["build:netlify"]) {
  delete packageJson.scripts["build:netlify"];
}

// Write updated package.json
console.log('Writing updated package.json...');
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');

console.log('Package scripts updated successfully!');
