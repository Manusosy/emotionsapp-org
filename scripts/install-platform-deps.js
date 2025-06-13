/**
 * This script installs platform-specific dependencies for the current environment.
 * 
 * It's used during the build process to ensure the right dependencies are installed.
 */

import { execSync } from 'child_process';
import { platform, arch } from 'os';
import fs from 'fs';

// Determine the current platform and architecture
const currentPlatform = platform();
const currentArch = arch();

console.log(`Environment: Local development`);
console.log(`Platform: ${currentPlatform}-${currentArch}`);

// For local development, use the platform-specific package
console.log(`Installing platform-specific dependencies for ${currentPlatform}-${currentArch}`);

// Map of platform+arch to rollup native bindings package
const platformMap = {
  'win32-x64': '@rollup/rollup-win32-x64-msvc',
  'darwin-x64': '@rollup/rollup-darwin-x64',
  'darwin-arm64': '@rollup/rollup-darwin-arm64',
  'linux-x64': '@rollup/rollup-linux-x64-gnu',
};

// Get the appropriate package for the current platform
const platformPackage = platformMap[`${currentPlatform}-${currentArch}`];

if (!platformPackage) {
  console.error(`No known Rollup package for platform: ${currentPlatform}-${currentArch}`);
  process.exit(1);
}

try {
  console.log(`Installing ${platformPackage}...`);
  execSync(`npm install --no-save ${platformPackage}@4.40.0`, { stdio: 'inherit' });
  console.log(`Successfully installed ${platformPackage}`);
} catch (error) {
  console.error(`Failed to install platform-specific package: ${error.message}`);
  process.exit(1);
} 