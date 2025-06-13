import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'

serve(async (req) => {
  try {
    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get the user data from the request
    const { record, type } = await req.json()

    console.log(`Processing ${type} event for user:`, record.id)

    // Only process new user signups with role 'patient'
    if (type === 'INSERT' && record.raw_user_meta_data?.role === 'patient') {
      console.log('Creating patient profile for new patient user')
      
      // Extract user data
      const userId = record.id
      const email = record.email
      const userData = record.raw_user_meta_data || {}
      const fullName = userData.full_name || userData.name || email.split('@')[0] || 'Unknown'
      
      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('patient_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()
      
      if (existingProfile) {
        console.log('Patient profile already exists:', existingProfile.id)
        return new Response(JSON.stringify({ success: true, message: 'Profile already exists' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        })
      }
      
      // Create new patient profile
      const { data, error } = await supabase
        .from('patient_profiles')
        .insert({
          user_id: userId,
          email: email,
          full_name: fullName,
          is_profile_complete: false,
          is_active: true
        })
        .select()
        .single()
      
      if (error) {
        console.error('Error creating patient profile:', error)
        throw error
      }
      
      console.log('Successfully created patient profile:', data.id)
      
      return new Response(JSON.stringify({ success: true, profile: data }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      })
    }
    
    // For other events or non-patient users, just acknowledge
    return new Response(JSON.stringify({ success: true, message: 'Event processed' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
    
  } catch (error) {
    console.error('Error processing request:', error)
    
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400
    })
  }
}) 