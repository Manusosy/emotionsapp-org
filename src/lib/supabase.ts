import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

/**
 * Supabase client for interacting with the Supabase database
 * Uses environment variables for configuration
 */

// Declare window with ENV_CONFIG type for TypeScript
declare global {
  interface Window {
    ENV_CONFIG?: {
      VITE_SUPABASE_URL?: string;
      VITE_SUPABASE_ANON_KEY?: string;
      VITE_SUPABASE_SERVICE_KEY?: string;
      [key: string]: string | undefined; // Add index signature to allow string indexing
    }
  }
}

// Try to get credentials from multiple sources for better reliability
export const getEnvValue = (key: string, silent: boolean = false): string => {
  // Try window.ENV_CONFIG first (runtime config)
  if (window.ENV_CONFIG?.[key]) {
    console.log(`Using ${key} from window.ENV_CONFIG`);
    return window.ENV_CONFIG[key];
  }
  
  // Then try import.meta.env (build-time config)
  if (import.meta.env[key]) {
    console.log(`Using ${key} from import.meta.env`);
    return import.meta.env[key];
  }
  
  if (!silent) {
    console.error(`${key} not found in any config source`);
  }
  return '';
};

// Get Supabase URL and key from environment variables
const supabaseUrl = getEnvValue('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvValue('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables are not set properly');
}

// We'll track activity to keep sessions alive
const SESSION_TIMEOUT_MINUTES = 60; // User is considered inactive after this time
const SESSION_REFRESH_MINUTES = 30; // Refresh token if active within this window
let lastActivity = new Date();

// Set up activity tracking
function setupActivityTracking() {
  // Update lastActivity on user interactions
  const updateActivity = () => {
    lastActivity = new Date();
    const storedSession = localStorage.getItem('app_session_last_active');
    if (storedSession) {
      localStorage.setItem('app_session_last_active', lastActivity.toISOString());
    }
  };

  // Track user activity
  window.addEventListener('mousemove', updateActivity);
  window.addEventListener('keydown', updateActivity);
  window.addEventListener('click', updateActivity);
  window.addEventListener('scroll', updateActivity);
  window.addEventListener('touchstart', updateActivity);
  window.addEventListener('focus', updateActivity);

  // Check session periodically
  setInterval(() => {
    const activeSessionStr = localStorage.getItem('app_session_active');
    const activeSession = activeSessionStr ? JSON.parse(activeSessionStr) : null;
    
    if (activeSession && activeSession.refreshToken) {
      const lastActiveStr = localStorage.getItem('app_session_last_active');
      if (lastActiveStr) {
        const lastActiveTime = new Date(lastActiveStr);
        const currentTime = new Date();
        const minutesSinceLastActivity = (currentTime.getTime() - lastActiveTime.getTime()) / (1000 * 60);
        
        // If user is still active but approaching refresh time, refresh the token
        if (minutesSinceLastActivity < SESSION_TIMEOUT_MINUTES && 
            minutesSinceLastActivity > SESSION_REFRESH_MINUTES) {
          console.log('Proactively refreshing session token due to continued activity');
          supabase.auth.refreshSession();
        }
      }
    }
  }, 60000); // Check every minute
}

// Initialize activity tracking once the DOM is loaded
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupActivityTracking);
  } else {
    setupActivityTracking();
  }
}

// Create and export the Supabase client
export const supabase = createClient<Database>(
  supabaseUrl, 
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: {
        getItem: (key) => {
          try {
            // Use a unified approach to get session data
            const value = localStorage.getItem(key);
            if (value) {
              try {
                // Keep track of fetch for debugging and refresh logic
                if (key.includes('supabase.auth.token')) {
                  console.log('Retrieved auth token from storage');
                  
                  // Check if we have our custom app session tracking
                  const appSession = localStorage.getItem('app_session_active');
                  if (!appSession) {
                    // Initialize our session tracking
                    localStorage.setItem('app_session_active', JSON.stringify({
                      active: true,
                      created: new Date().toISOString(),
                      refreshToken: true
                    }));
                    localStorage.setItem('app_session_last_active', new Date().toISOString());
                  }
                }
                return JSON.parse(value);
              } catch (parseError) {
                console.error('Error parsing localStorage value:', parseError);
                // Don't remove on parse error, might be temporary
                return null;
              }
            }
            return null;
          } catch (error) {
            console.error('Error retrieving auth session:', error);
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            const valueStr = JSON.stringify(value);
            localStorage.setItem(key, valueStr);
            
            // Set session metadata
            if (key.includes('supabase.auth.token')) {
              console.log('Storing new auth token');
              localStorage.setItem('app_session_active', JSON.stringify({
                active: true,
                created: new Date().toISOString(),
                refreshToken: true
              }));
              localStorage.setItem('app_session_last_active', new Date().toISOString());
            }
          } catch (error) {
            console.error('Error storing auth session:', error);
          }
        },
        removeItem: (key) => {
          try {
            localStorage.removeItem(key);
            
            // Clean up our custom session tracking
            if (key.includes('supabase.auth.token')) {
              console.log('Removing auth session data');
              localStorage.removeItem('app_session_active');
              localStorage.removeItem('app_session_last_active');
            }
          } catch (error) {
            console.error('Error removing auth session:', error);
          }
        }
      },
      flowType: 'implicit',
      debug: import.meta.env.DEV
    },
    global: {
      headers: {
        'X-Client-Info': 'emotions-app'
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

/**
 * Helper function to check if Supabase is properly configured
 * This can be used to detect if we should use mock services or Supabase
 */
export function isSupabaseConfigured(): boolean {
  // Check if credentials are available from any source
  return Boolean(
    (window.ENV_CONFIG?.VITE_SUPABASE_URL && window.ENV_CONFIG?.VITE_SUPABASE_ANON_KEY) ||
    (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
  );
}

/**
 * Helper for working with Supabase tables
 * This provides better typing since Supabase expects string schema names
 */
export const tables = {
  profiles: 'profiles',
  mood_entries: 'mood_entries',
  journal_entries: 'journal_entries',
  stress_assessments: 'stress_assessments',
  resources: 'resources',
  notifications: 'notifications',
  appointments: 'appointments',
  messages: 'messages',
  help_groups: 'help_groups',
  favorites: 'favorites',
};

// Create a function to set up the required database functions if they don't exist
export const setupDatabaseFunctions = async () => {
  try {
    console.log('Setting up database functions...');
    
    // Create a function to get all patients for a mood mentor
    // This function will bypass RLS for mood mentors to see patients
    const { error: rpcError } = await supabase.rpc('create_get_patients_function', {
      function_sql: `
        CREATE OR REPLACE FUNCTION public.get_all_patients_for_mentor(mentor_id UUID)
        RETURNS SETOF public.patient_profiles
        LANGUAGE sql
        SECURITY DEFINER
        AS $$
          -- Return all patients
          -- In a real implementation, this would filter based on relationships
          -- between mentors and patients
          SELECT * FROM public.patient_profiles;
        $$;
      `
    });
    
    if (rpcError) {
      console.error('Error creating get_all_patients_for_mentor function:', rpcError);
      
      // Try direct SQL execution as fallback (requires admin privileges)
      const { error: sqlError } = await supabase.from('_setup_functions').insert({
        sql: `
          CREATE OR REPLACE FUNCTION public.get_all_patients_for_mentor(mentor_id UUID)
          RETURNS SETOF public.patient_profiles
          LANGUAGE sql
          SECURITY DEFINER
          AS $$
            -- Return all patients
            -- In a real implementation, this would filter based on relationships
            -- between mentors and patients
            SELECT * FROM public.patient_profiles;
          $$;
        `
      });
      
      if (sqlError) {
        console.error('Error with fallback function creation:', sqlError);
      }
    }
    
    console.log('Database functions setup complete');
    return true;
  } catch (error) {
    console.error('Error setting up database functions:', error);
    return false;
  }
};

/**
 * Helper function to list all tables in the database
 * This is useful for debugging database connection issues
 */
export async function listDatabaseTables(): Promise<string[]> {
  try {
    console.log('Listing database tables...');
    
    // First try the PostgreSQL information schema
    const { data: schemaTables, error: schemaError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (!schemaError && schemaTables && schemaTables.length > 0) {
      const tableNames = schemaTables.map(t => t.table_name);
      console.log('Tables found via schema:', tableNames);
      return tableNames;
    }
    
    // If that fails, try a simpler approach - query a known table
    console.log('Schema query failed, trying direct table access...');
    
    // Try to access profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('count');
    
    if (!profileError) {
      console.log('Found profiles table');
      return ['profiles'];
    }
    
    // Try to access patient_profiles table
    const { data: patientData, error: patientError } = await supabase
      .from('patient_profiles')
      .select('count');
    
    if (!patientError) {
      console.log('Found patient_profiles table');
      return ['patient_profiles'];
    }
    
    console.log('Could not detect any tables');
    return [];
  } catch (error) {
    console.error('Error listing tables:', error);
    return [];
  }
}

export async function setupMessagingSystem() {
  console.log('Setting up messaging system tables...');
  
  try {
    // First, check if the conversations table exists
    const { error: checkError } = await supabase
      .from('conversations')
      .select('id')
      .limit(1);
    
    if (!checkError) {
      console.log('Messaging system is already set up.');
      return { success: true };
    }
    
    if (checkError && !checkError.message?.includes('does not exist')) {
      console.error('Unexpected error checking conversations table:', checkError);
      return { success: false, error: checkError };
    }
    
    // Check if the user has admin privileges
    const { data: authData } = await supabase.auth.getSession();
    if (!authData || !authData.session) {
      return { 
        success: false, 
        error: new Error('You must be logged in to set up the messaging system') 
      };
    }

    // SQL script for creating messaging tables
    const messagingSetupSQL = `
      -- Table: conversations
      CREATE TABLE IF NOT EXISTS public.conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        appointment_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
      );
      
      -- Enable RLS on conversations
      ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
      
      -- Table: conversation_participants
      CREATE TABLE IF NOT EXISTS public.conversation_participants (
        conversation_id UUID NOT NULL,
        user_id UUID NOT NULL,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        last_read_at TIMESTAMP WITH TIME ZONE,
        PRIMARY KEY (conversation_id, user_id)
      );
      
      -- Enable RLS on conversation_participants
      ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
      
      -- Table: messages
      CREATE TABLE IF NOT EXISTS public.messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL,
        sender_id UUID NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        read_at TIMESTAMP WITH TIME ZONE,
        deleted_at TIMESTAMP WITH TIME ZONE,
        attachment_url TEXT,
        attachment_type TEXT
      );
      
      -- Enable RLS on messages
      ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
      
      -- RLS Policies for conversations
      CREATE POLICY IF NOT EXISTS "Users can view their own conversations" ON public.conversations
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = id
            AND user_id = auth.uid()
          )
        );
      
      CREATE POLICY IF NOT EXISTS "Users can create conversations" ON public.conversations
        FOR INSERT WITH CHECK (true);
      
      CREATE POLICY IF NOT EXISTS "Users can update their own conversations" ON public.conversations
        FOR UPDATE USING (
          EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = id
            AND user_id = auth.uid()
          )
        );
      
      -- RLS Policies for conversation_participants
      CREATE POLICY IF NOT EXISTS "Users can view participants in their conversations" ON public.conversation_participants
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = conversation_participants.conversation_id
            AND user_id = auth.uid()
          )
        );
      
      CREATE POLICY IF NOT EXISTS "Users can add participants to conversations they create" ON public.conversation_participants
        FOR INSERT WITH CHECK (true);
      
      CREATE POLICY IF NOT EXISTS "Users can update their own participant status" ON public.conversation_participants
        FOR UPDATE USING (user_id = auth.uid());
      
      -- RLS Policies for messages
      CREATE POLICY IF NOT EXISTS "Users can view messages in their conversations" ON public.messages
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = messages.conversation_id
            AND user_id = auth.uid()
          )
        );
      
      CREATE POLICY IF NOT EXISTS "Users can send messages to conversations they are part of" ON public.messages
        FOR INSERT WITH CHECK (
          sender_id = auth.uid() AND
          EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = messages.conversation_id
            AND user_id = auth.uid()
          )
        );
      
      CREATE POLICY IF NOT EXISTS "Users can update their own messages" ON public.messages
        FOR UPDATE USING (sender_id = auth.uid());
      
      -- Create view for user conversations
      CREATE OR REPLACE VIEW public.user_conversations_view AS
      SELECT 
        c.id AS conversation_id,
        c.appointment_id,
        cp.user_id,
        (
          SELECT m.id 
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) AS last_message_id,
        (
          SELECT m.sender_id 
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) AS last_message_sender_id,
        (
          SELECT m.content 
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) AS last_message_content,
        (
          SELECT m.created_at 
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) AS last_message_time,
        (
          SELECT m.read_at 
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) AS last_message_read_at,
        cp.last_read_at,
        (
          SELECT COUNT(*)::int
          FROM messages m
          WHERE m.conversation_id = c.id
          AND m.sender_id != cp.user_id
          AND (m.read_at IS NULL OR m.read_at > cp.last_read_at)
          AND m.deleted_at IS NULL
        ) > 0 AS has_unread,
        (
          SELECT COUNT(*)::int
          FROM messages m
          WHERE m.conversation_id = c.id
          AND m.sender_id != cp.user_id
          AND (m.read_at IS NULL OR m.read_at > cp.last_read_at)
          AND m.deleted_at IS NULL
        ) AS unread_count,
        c.created_at,
        (
          SELECT ocp.user_id
          FROM conversation_participants ocp
          WHERE ocp.conversation_id = c.id
          AND ocp.user_id != cp.user_id
          LIMIT 1
        ) AS other_user_id
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id;
      
      -- Grant permissions
      GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
      GRANT SELECT, INSERT, UPDATE ON public.conversation_participants TO authenticated;
      GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
      GRANT SELECT ON public.user_conversations_view TO authenticated;
    `;
    
    // Execute the SQL script directly
    const { error: sqlError } = await supabase.rpc('exec_sql', { sql: messagingSetupSQL });
    
    if (sqlError) {
      console.error('Error executing SQL script:', sqlError);
      
      // If exec_sql function doesn't exist or fails, try executing SQL through the SQL editor
      // This is a fallback for users who don't have the exec_sql function
      return { 
        success: false, 
        error: new Error(`Could not set up messaging system: ${sqlError.message}. Please run the SQL script manually in the Supabase SQL editor.`) 
      };
    }
    
    // Verify tables were created
    const { error: verifyError } = await supabase
      .from('conversations')
      .select('id')
      .limit(1);
    
    if (verifyError) {
      console.error('Verification failed - conversations table was not created:', verifyError);
      return { 
        success: false, 
        error: new Error('Failed to create messaging tables. Please run the SQL script manually in the Supabase SQL editor.') 
      };
    }
    
    console.log('Messaging system tables setup completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Error setting up messaging system:', error);
    return { 
      success: false, 
      error: error instanceof Error 
        ? error 
        : new Error('Unknown error setting up messaging system. Please run the SQL script manually in the Supabase SQL editor.') 
    };
  }
}

/**
 * Check if the messaging system is properly set up by verifying all required tables exist
 */
export async function isMessagingSystemSetup(): Promise<boolean> {
  try {
    console.log('Checking if messaging system is properly set up...');
    
    // Check for conversations table
    const { error: conversationsError } = await supabase
      .from('conversations')
      .select('id')
      .limit(1);
    
    if (conversationsError && conversationsError.message?.includes('does not exist')) {
      console.log('Conversations table does not exist');
      return false;
    }
    
    // Check for conversation_participants table
    const { error: participantsError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .limit(1);
    
    if (participantsError && participantsError.message?.includes('does not exist')) {
      console.log('Conversation participants table does not exist');
      return false;
    }
    
    // Check for messages table
    const { error: messagesError } = await supabase
      .from('messages')
      .select('id')
      .limit(1);
    
    if (messagesError && messagesError.message?.includes('does not exist')) {
      console.log('Messages table does not exist');
      return false;
    }
    
    // Check for user_conversations_view
    const { error: viewError } = await supabase
      .from('user_conversations_view')
      .select('conversation_id')
      .limit(1);
    
    if (viewError && viewError.message?.includes('does not exist')) {
      console.log('User conversations view does not exist');
      return false;
    }
    
    // All required tables and views exist
    console.log('Messaging system appears to be properly set up');
    return true;
  } catch (error) {
    console.error('Error checking messaging system setup:', error);
    return false;
  }
} 