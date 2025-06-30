import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file and directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    const migrationFile = process.argv[2];
    
    if (!migrationFile) {
      console.error('Please specify a migration file to run.');
      console.log('Usage: node run_migration.js <migration_file>');
      process.exit(1);
    }
    
    const migrationPath = path.join(__dirname, '../db/migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`Migration file not found: ${migrationPath}`);
      process.exit(1);
    }
    
    console.log(`Migration file: ${migrationFile}`);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Just print the SQL to execute
    console.log('Please execute the following SQL in the Supabase dashboard SQL editor:');
    console.log(`\n${sql}\n`);
    console.log('After executing the SQL, refresh your application to use the new function.');
  } catch (error) {
    console.error('Error reading migration:', error);
    process.exit(1);
  }
}

runMigration(); 