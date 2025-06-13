// Script to run patient table inspection queries
import { supabase } from '../lib/supabase.js';
import fs from 'fs';
import path from 'path';

async function runQueries() {
  try {
    console.log('Running patient table inspection queries...');
    
    // List all tables in the public schema
    console.log('\n--- TABLES IN PUBLIC SCHEMA ---');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');
    
    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
    } else {
      console.log(tables.map(t => t.table_name).join('\n'));
    }

    // Check patient_profiles table structure
    console.log('\n--- PATIENT_PROFILES TABLE STRUCTURE ---');
    const { data: patientProfilesColumns, error: ppColumnsError } = await supabase
      .rpc('execute_sql', {
        sql: `SELECT column_name, data_type, is_nullable
              FROM information_schema.columns
              WHERE table_schema = 'public' 
              AND table_name = 'patient_profiles'
              ORDER BY ordinal_position;`
      });
    
    if (ppColumnsError) {
      console.error('Error fetching patient_profiles columns:', ppColumnsError);
    } else {
      console.table(patientProfilesColumns);
    }

    // Check user_profiles table structure (if it exists)
    console.log('\n--- USER_PROFILES TABLE STRUCTURE (IF EXISTS) ---');
    const { data: userProfilesColumns, error: userProfilesColumnsError } = await supabase
      .rpc('execute_sql', {
        sql: `SELECT column_name, data_type, is_nullable
              FROM information_schema.columns
              WHERE table_schema = 'public' 
              AND table_name = 'user_profiles'
              ORDER BY ordinal_position;`
      });
    
    if (userProfilesColumnsError) {
      console.error('Error fetching user_profiles columns:', userProfilesColumnsError);
      console.log('The user_profiles table might not exist');
    } else {
      console.table(userProfilesColumns);
    }

    // Get sample data from patient_profiles
    console.log('\n--- PATIENT_PROFILES SAMPLE DATA ---');
    const { data: patientProfiles, error: patientProfilesError } = await supabase
      .from('patient_profiles')
      .select('*')
      .limit(10);
    
    if (patientProfilesError) {
      console.error('Error fetching patient_profiles data:', patientProfilesError);
    } else {
      console.table(patientProfiles);
    }

    // Count records in patient_profiles table
    console.log('\n--- RECORD COUNTS ---');
    const { data: patientCount, error: patientCountError } = await supabase
      .from('patient_profiles')
      .select('count');
    
    if (patientCountError) {
      console.error('Error counting patient_profiles records:', patientCountError);
    } else {
      console.log(`patient_profiles count: ${patientCount[0]?.count || 0}`);
    }

    // Check for patients in auth.users that might not be in patient_profiles
    console.log('\n--- PATIENTS IN AUTH.USERS ---');
    const { data: authUsers, error: authUsersError } = await supabase
      .rpc('execute_sql', {
        sql: `SELECT 
                au.id as auth_user_id,
                au.email as auth_email,
                au.raw_user_meta_data->>'role' as auth_role,
                au.raw_user_meta_data->>'full_name' as auth_full_name,
                pp.id as patient_profile_id
              FROM auth.users au
              LEFT JOIN patient_profiles pp ON au.id = pp.user_id
              WHERE au.raw_user_meta_data->>'role' = 'patient'
              LIMIT 20;`
      });
    
    if (authUsersError) {
      console.error('Error checking auth.users:', authUsersError);
    } else {
      console.table(authUsers);
    }

    // Save results to a JSON file
    const results = {
      tables,
      patientProfilesColumns,
      userProfilesColumns,
      patientProfiles,
      patientCount,
      authUsers
    };

    fs.writeFileSync(
      path.join(process.cwd(), 'patient_tables_inspection_results.json'),
      JSON.stringify(results, null, 2)
    );

    console.log('\nResults saved to patient_tables_inspection_results.json');

  } catch (error) {
    console.error('Error running queries:', error);
  }
}

runQueries(); 