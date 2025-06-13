
#!/usr/bin/env node

/**
 * This script installs all dependencies including platform-specific ones
 * It's important to include this for CI/CD environments
 */

import { execSync } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const platform = os.platform();
const arch = os.arch();

console.log(`Installing dependencies for platform: ${platform} (${arch})`);

// Create/update the rollup fallback file
const rollupFallbackPath = path.join(__dirname, '..', 'src', 'rollup-fallback.js');
const fallbackContent = `
/**
 * This file provides fallback exports for Rollup native modules
 * that might be missing during build time.
 */

// Export dummy objects for all potential platform-specific modules
export const rollupLinuxGnu = {
  name: 'rollup-linux-x64-gnu-fallback'
};

export const rollupLinuxMusl = {
  name: 'rollup-linux-x64-musl-fallback'
};

export const rollupWin32Msvc = {
  name: 'rollup-win32-x64-msvc-fallback'
};

export const rollupDarwinX64 = {
  name: 'rollup-darwin-x64-fallback'
};

export const rollupDarwinArm64 = {
  name: 'rollup-darwin-arm64-fallback'
}; 

// Log that we're using the fallback implementation
console.log('Using Rollup fallbacks for platform-specific modules');

// Default export for direct imports
export default {
  rollupLinuxGnu,
  rollupLinuxMusl,
  rollupWin32Msvc,
  rollupDarwinX64,
  rollupDarwinArm64
};
`;

console.log('Creating/updating Rollup fallback module...');
fs.writeFileSync(rollupFallbackPath, fallbackContent);
console.log('✅ Rollup fallback module created/updated');

// Skip main dependency installation if environment variable is set
if (process.env.SKIP_INSTALL_DEPS !== 'true') {
  // Install main dependencies first
  try {
    console.log('Installing main dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Main dependencies installed successfully');
  } catch (error) {
    console.error('Error installing main dependencies:', error);
    // Continue despite errors as we'll try to use fallbacks
    console.log('⚠️ Continuing despite installation errors...');
  }
}

// Now install platform-specific rollup dependencies
try {
  if (platform === 'linux') {
    console.log('Installing Linux-specific dependencies...');
    execSync('npm install --no-save @rollup/rollup-linux-x64-gnu@4.9.1 @rollup/rollup-linux-x64-musl@4.9.1', { 
      stdio: 'inherit',
      env: {
        ...process.env,
        NPM_CONFIG_ENGINE_STRICT: "false"
      }
    });
    console.log('✅ Linux dependencies installed successfully');
  } else if (platform === 'win32') {
    console.log('Installing Windows-specific dependencies...');
    execSync('npm install --no-save @rollup/rollup-win32-x64-msvc@4.9.1', { 
      stdio: 'inherit',
      env: {
        ...process.env,
        NPM_CONFIG_ENGINE_STRICT: "false"
      }
    });
    console.log('✅ Windows dependencies installed successfully');
  } else if (platform === 'darwin') {
    console.log('Installing macOS-specific dependencies...');
    if (arch === 'arm64') {
      execSync('npm install --no-save @rollup/rollup-darwin-arm64@4.9.1', { 
        stdio: 'inherit',
        env: {
          ...process.env,
          NPM_CONFIG_ENGINE_STRICT: "false"
        }
      });
    } else {
      execSync('npm install --no-save @rollup/rollup-darwin-x64@4.9.1', { 
        stdio: 'inherit',
        env: {
          ...process.env,
          NPM_CONFIG_ENGINE_STRICT: "false"
        }
      });
    }
    console.log('✅ macOS dependencies installed successfully');
  } else {
    console.warn(`Unsupported platform: ${platform}. Installing all platform dependencies as fallback...`);
    execSync('npm install --no-save @rollup/rollup-linux-x64-gnu@4.9.1 @rollup/rollup-linux-x64-musl@4.9.1 @rollup/rollup-win32-x64-msvc@4.9.1 @rollup/rollup-darwin-x64@4.9.1 @rollup/rollup-darwin-arm64@4.9.1', { 
      stdio: 'inherit',
      env: {
        ...process.env,
        NPM_CONFIG_ENGINE_STRICT: "false"
      }
    });
  }
  
  console.log('✅ All dependencies installed successfully!');
} catch (error) {
  console.error('Error installing platform-specific dependencies:', error);
  console.log('⚠️ Continuing with fallbacks despite installation errors...');
}

// Ensure file permissions are set correctly
try {
  if (platform !== 'win32') {
    console.log('Setting executable permissions on scripts...');
    const scriptsDir = path.join(__dirname, '..');
    execSync(`chmod +x ${scriptsDir}/scripts/*.js`, { stdio: 'inherit' });
    console.log('✅ Permissions set successfully');
  }
} catch (error) {
  console.error('Error setting permissions:', error);
  // Continue anyway
  console.log('⚠️ Continuing despite permission errors...');
}
