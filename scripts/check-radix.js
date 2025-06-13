
console.log("Starting check-radix.js script...");

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Files to check
const filesToCheck = [
  path.join(rootDir, 'src', 'components', 'ui', 'toggle.tsx'),
  path.join(rootDir, 'src', 'components', 'ui', 'toggle-group.tsx')
];

console.log('Checking for Radix UI imports in toggle components...');

let foundRadixImports = false;

filesToCheck.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const radixImportRegex = /@radix-ui\/react-toggle/;

  if (radixImportRegex.test(content)) {
    console.log(`⚠️ Found Radix UI import in ${filePath}`);
    foundRadixImports = true;
    
    // Show the line with the import
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (radixImportRegex.test(line)) {
        console.log(`  Line ${index + 1}: ${line.trim()}`);
      }
    });

    // Fix the file by replacing with our pure implementation
    const pureFilePath = filePath.replace(/toggle(-group)?\.tsx$/, 'pure-toggle$1.tsx');
    
    if (fs.existsSync(pureFilePath)) {
      console.log(`  Fixing by copying from ${pureFilePath}`);
      let pureContent = fs.readFileSync(pureFilePath, 'utf8');
      
      // For toggle-group.tsx, update the import path
      if (filePath.includes('toggle-group.tsx')) {
        pureContent = pureContent.replace(
          /from\s+["']@\/components\/ui\/pure-toggle["']/g, 
          'from "@/components/ui/toggle"'
        );
      }
      
      fs.writeFileSync(filePath, pureContent);
      console.log(`  ✅ Fixed ${filePath}`);
    } else {
      console.log(`  ❌ Pure implementation not found: ${pureFilePath}`);
    }
  } else {
    console.log(`✅ No Radix UI imports found in ${filePath}`);
  }
});

if (!foundRadixImports) {
  console.log('✅ All toggle components are Radix UI free!');
}

// Now let's also check if the actual toggles exist and have correct imports
console.log('\nConfirming toggle components are properly set up...');

const toggleImportCheck = `import * as React from "react"`;
const toggleGroupImportCheck = `import { toggleVariants, type ToggleProps } from "@/components/ui/toggle"`;

filesToCheck.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  if (fileName === 'toggle.tsx') {
    if (content.includes(toggleImportCheck)) {
      console.log(`✅ toggle.tsx has correct React import`);
    } else {
      console.log(`❌ toggle.tsx missing proper React import`);
    }
  } else if (fileName === 'toggle-group.tsx') {
    if (content.includes(toggleGroupImportCheck)) {
      console.log(`✅ toggle-group.tsx has correct toggle import`);
    } else {
      console.log(`❌ toggle-group.tsx missing proper toggle import`);
    }
  }
});

console.log('\nCheck complete!');
