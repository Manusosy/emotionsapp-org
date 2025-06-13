/**
 * This script helps fix Windows-specific dependency issues with Rollup
 * 
 * To run:
 * 1. node fix-dependencies.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Main function to fix dependencies
async function fixDependencies() {
  console.log('Starting dependency fix process...');

  try {
    // Step 1: Delete problematic folders
    console.log('Step 1: Removing node_modules and package-lock.json...');
    if (fs.existsSync('node_modules')) {
      console.log('  - Deleting node_modules folder...');
      fs.rmSync('node_modules', { recursive: true, force: true });
    }
    
    if (fs.existsSync('package-lock.json')) {
      console.log('  - Deleting package-lock.json...');
      fs.unlinkSync('package-lock.json');
    }

    // Step 2: Clean npm cache
    console.log('Step 2: Cleaning npm cache...');
    execSync('npm cache clean --force', { stdio: 'inherit' });

    // Step 3: Install dependencies with ignore-scripts
    console.log('Step 3: Installing dependencies with --ignore-scripts flag...');
    execSync('npm install --ignore-scripts', { stdio: 'inherit' });

    // Step 4: Install specific versions of problematic packages
    console.log('Step 4: Installing specific versions of rollup packages...');
    execSync('npm install @rollup/rollup-win32-x64-msvc@4.9.0 --no-save', { stdio: 'inherit' });

    console.log('\n✅ Dependency fix process completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run "npm run dev" to start the development server');
    console.log('2. If issues persist, check TROUBLESHOOTING.md');
  } catch (error) {
    console.error('\n❌ Error fixing dependencies:', error.message);
    console.log('\nPlease try the following manual steps:');
    console.log('1. Delete node_modules folder and package-lock.json file');
    console.log('2. Run: npm cache clean --force');
    console.log('3. Run: npm install --ignore-scripts');
    console.log('4. Run: npm install @rollup/rollup-win32-x64-msvc@4.9.0 --no-save');
    process.exit(1);
  }
}

// Run the main function
fixDependencies().catch(console.error); 