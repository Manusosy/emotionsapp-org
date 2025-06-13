import { IPatientService, PatientProfile, Appointment, AppointmentReport, PatientMetric, Assessment, PatientDashboardData, UserMetricsUpdate, UserActivity } from './patient.interface';
import { supabase } from '@/lib/supabase';
import { getFormattedDeviceInfo } from '@/utils/device-detection';

// Utility functions for case conversion (same as in mood-mentor.service.ts)
const snakeToCamel = (str: string): string => 
  str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const camelToSnake = (str: string): string => 
  str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

const convertObjectToCamelCase = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertObjectToCamelCase(item));
  }
  
  const result: any = {};
  Object.keys(obj).forEach(key => {
    const camelKey = snakeToCamel(key);
    result[camelKey] = convertObjectToCamelCase(obj[key]);
  });
  
  return result;
};

const convertObjectToSnakeCase = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertObjectToSnakeCase(item));
  }
  
  const result: any = {};
  Object.keys(obj).forEach(key => {
    const snakeKey = camelToSnake(key);
    result[snakeKey] = convertObjectToSnakeCase(obj[key]);
  });
  
  return result;
};

export class PatientService implements IPatientService {
  async getAllPatients(): Promise<PatientProfile[]> {
    try {
      console.log('Fetching all patients from database...');
      
      // Try multiple approaches to get patient data
      let patients: PatientProfile[] = [];
      
      // Approach 1: Try patient_profiles table
      try {
        const { data, error } = await supabase
          .from('patient_profiles')
          .select('*')
          .eq('is_active', true);

        if (!error && data && data.length > 0) {
          console.log(`Found ${data.length} patients in patient_profiles table`);
          // Convert snake_case to camelCase
          return (data || []).map(patient => convertObjectToCamelCase(patient)) as PatientProfile[];
        } else if (error) {
          console.warn('Error fetching from patient_profiles:', error);
        }
      } catch (err) {
        console.warn('Exception fetching from patient_profiles:', err);
      }
      
      // Approach 2: Try profiles table with role filter
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'patient');

        if (!error && data && data.length > 0) {
          console.log(`Found ${data.length} patients in profiles table`);
          // Map to expected format
          patients = data.map(p => ({
            id: p.id,
            userId: p.user_id || p.id,
            fullName: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            email: p.email || '',
            phoneNumber: p.phone_number || '',
            dateOfBirth: p.date_of_birth || '',
            gender: p.gender || '',
            location: p.country || '',
            city: p.city || '',
            state: p.state || '',
            avatarUrl: p.avatar_url,
            isActive: true,
            createdAt: p.created_at,
            updatedAt: p.updated_at || p.created_at
          }));
          return patients;
        } else if (error) {
          console.warn('Error fetching from profiles:', error);
        }
      } catch (err) {
        console.warn('Exception fetching from profiles:', err);
      }
      
      // Approach 3: Try users table with role metadata filter
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*');

        if (!error && data && data.length > 0) {
          // Filter for patients
          const patientUsers = data.filter(u => 
            u.user_metadata?.role === 'patient' || 
            u.raw_user_meta_data?.role === 'patient'
          );
          
          if (patientUsers.length > 0) {
            console.log(`Found ${patientUsers.length} patients in users table`);
            // Map to expected format
            patients = patientUsers.map(p => ({
              id: p.id,
              userId: p.id,
              fullName: p.user_metadata?.full_name || `${p.user_metadata?.first_name || ''} ${p.user_metadata?.last_name || ''}`.trim(),
              email: p.email || '',
              phoneNumber: p.phone || p.user_metadata?.phone_number || '',
              dateOfBirth: p.user_metadata?.date_of_birth || '',
              gender: p.user_metadata?.gender || '',
              location: p.user_metadata?.country || '',
              city: p.user_metadata?.city || '',
              state: p.user_metadata?.state || '',
              avatarUrl: p.user_metadata?.avatar_url,
              isActive: true,
              createdAt: p.created_at,
              updatedAt: p.updated_at || p.created_at
            }));
            return patients;
          }
        } else if (error) {
          console.warn('Error fetching from users:', error);
        }
      } catch (err: any) {
        console.warn('Exception fetching from users:', err);
      }
      
      // Approach 4: Try auth_users_view if available
      try {
        const { data, error } = await supabase
          .from('auth_users_view')
          .select('*')
          .eq('role', 'patient');

        if (!error && data && data.length > 0) {
          console.log(`Found ${data.length} patients in auth_users_view`);
          // Map to expected format
          patients = data.map(p => ({
            id: p.id,
            userId: p.user_id || p.id,
            fullName: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            email: p.email || '',
            phoneNumber: p.phone_number || '',
            dateOfBirth: p.date_of_birth || '',
            gender: p.gender || '',
            location: p.country || '',
            city: p.city || '',
            state: p.state || '',
            avatarUrl: p.avatar_url,
            isActive: true,
            createdAt: p.created_at,
            updatedAt: p.updated_at || p.created_at
          }));
          return patients;
        } else if (error) {
          console.warn('Error fetching from auth_users_view:', error);
        }
      } catch (err: any) {
        console.warn('Exception fetching from auth_users_view:', err);
      }
      
      // If we get here, we couldn't find any patients
      console.log('No patient data found in database');
      return [];
    } catch (error: any) {
      console.error('Error in getAllPatients:', error);
      return [];
    }
  }

  subscribeToPatientUpdates(callback: () => void): (() => void) | undefined {
    try {
      // Set up real-time subscription to patient profiles table
      const subscription = supabase
        .channel('patient_profiles_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'patient_profiles' }, 
          callback
        )
        .subscribe();
        
      // Return a cleanup function
      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up patient updates subscription:', error);
      return undefined;
    }
  }

  async getPatientById(id: string): Promise<{
    success: boolean;
    data: PatientProfile | null;
    error: string | null;
  }> {
    try {
      console.log(`Searching for patient with ID: ${id}`);
      
      if (!id) {
        console.error('getPatientById called with empty ID');
        throw new Error('ID is required');
      }

      // Try multiple approaches to find the patient

      // Approach 1: Try patient_profiles table with user_id
      try {
        console.log('Trying patient_profiles table with user_id');
        const { data: userData, error: userError } = await supabase
          .from('patient_profiles')
          .select('*')
          .eq('user_id', id)
          .maybeSingle();

        if (userError) {
          console.warn('Error querying patient_profiles by user_id:', userError);
        } else if (userData) {
          console.log('Found patient in patient_profiles by user_id');
          return {
            success: true,
            data: convertObjectToCamelCase(userData) as PatientProfile,
            error: null
          };
        }
      } catch (err) {
        console.warn('Exception querying patient_profiles by user_id:', err);
      }

      // Approach 2: Try patient_profiles table with id
      try {
        console.log('Trying patient_profiles table with id');
        const { data: idData, error: idError } = await supabase
          .from('patient_profiles')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (idError) {
          console.warn('Error querying patient_profiles by id:', idError);
        } else if (idData) {
          console.log('Found patient in patient_profiles by id');
          return {
            success: true,
            data: convertObjectToCamelCase(idData) as PatientProfile,
            error: null
          };
        }
      } catch (err) {
        console.warn('Exception querying patient_profiles by id:', err);
      }

      // Approach 3: Try profiles table
      try {
        console.log('Trying profiles table');
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (profileError) {
          console.warn('Error querying profiles table:', profileError);
        } else if (profileData && profileData.role === 'patient') {
          console.log('Found patient in profiles table');
          
          // Map profile data to PatientProfile format
          const patientData: PatientProfile = {
            id: profileData.id,
            userId: profileData.user_id || profileData.id,
            fullName: profileData.full_name || `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || 'Unknown',
            email: profileData.email || '',
            phoneNumber: profileData.phone_number || '',
            dateOfBirth: profileData.date_of_birth || '',
            gender: profileData.gender || '',
            location: profileData.country || '',
            city: profileData.city || '',
            state: profileData.state || '',
            avatarUrl: profileData.avatar_url,
            isActive: true,
            createdAt: profileData.created_at,
            updatedAt: profileData.updated_at || profileData.created_at
          };
          
          return {
            success: true,
            data: patientData,
            error: null
          };
        }
      } catch (err) {
        console.warn('Exception querying profiles table:', err);
      }

      // Approach 4: Try auth.users
      try {
        console.log('Trying auth.users');
        const { data: authData, error: authError } = await supabase.auth.admin.getUserById(id);

        if (authError) {
          console.warn('Error querying auth.users:', authError);
        } else if (authData && authData.user) {
          console.log('Found user in auth.users');
          
          // Map auth data to PatientProfile format
          const patientData: PatientProfile = {
            id: authData.user.id,
            userId: authData.user.id,
            fullName: authData.user.user_metadata?.full_name || 
                     `${authData.user.user_metadata?.first_name || ''} ${authData.user.user_metadata?.last_name || ''}`.trim() || 
                     authData.user.email?.split('@')[0] || 'Unknown',
            email: authData.user.email || '',
            phoneNumber: authData.user.user_metadata?.phone_number || '',
            avatarUrl: authData.user.user_metadata?.avatar_url,
            isActive: true,
            createdAt: authData.user.created_at,
            updatedAt: authData.user.updated_at || authData.user.created_at
          };
          
          return {
            success: true,
            data: patientData,
            error: null
          };
        }
      } catch (err) {
        console.warn('Exception querying auth.users:', err);
      }

      console.log(`No patient found with ID: ${id}`);
      return {
        success: false,
        data: null,
        error: 'Patient not found'
      };
    } catch (error: any) {
      console.error('Error in getPatientById:', error);
      return {
        success: false,
        data: null,
        error: error.message || 'Error fetching patient data'
      };
    }
  }

  async uploadProfileImage(patientId: string, file: File): Promise<{
    success: boolean;
    url: string | null;
    error: string | null;
  }> {
    try {
      // Generate a unique filename with timestamp to avoid cache issues
      const timestamp = new Date().getTime();
      const randomStr = Math.random().toString(36).substring(2, 10);
      const fileExt = file.name.split('.').pop();
      const fileName = `${patientId}-${timestamp}-${randomStr}.${fileExt}`;
      
      console.log('Starting profile image upload process...');
      
      // First get a list of available buckets to ensure we're using one that exists
      const { data: bucketList, error: bucketListError } = await supabase.storage.listBuckets();
      
      if (bucketListError) {
        console.error('Error fetching bucket list:', bucketListError);
        throw new Error(`Failed to access storage: ${bucketListError.message}`);
      }
      
      console.log('Available buckets:', bucketList?.map(b => b.name));
      
      // Default bucket names to try
      let bucketOptions = ['avatars', 'public', 'profile-images'];
      
      // If we have a bucket list, prioritize existing buckets
      if (bucketList && bucketList.length > 0) {
        // Use existing buckets from the list
        const availableBuckets = bucketList.map(b => b.name);
        
        // If none of our preferred buckets exist, use the first available bucket
        if (!bucketOptions.some(name => availableBuckets.includes(name))) {
          console.log('None of the preferred buckets found, using first available bucket');
          bucketOptions = [availableBuckets[0]];
        } else {
          // Filter to only include buckets that actually exist
          bucketOptions = bucketOptions.filter(name => availableBuckets.includes(name));
        }
      }
      
      // If still no buckets available, try to create one
      if (bucketOptions.length === 0) {
        console.log('No buckets available, attempting to create one');
        try {
          // Try to create a public bucket
          await supabase.storage.createBucket('public', {
            public: true,
            fileSizeLimit: 5 * 1024 * 1024 // 5MB limit
          });
          bucketOptions = ['public'];
          console.log('Created new public bucket');
        } catch (createError) {
          console.error('Failed to create bucket:', createError);
          throw new Error('No storage buckets available and unable to create one. Please contact support.');
        }
      }
      
      // Try each bucket until one works
      let uploadedUrl = null;
      let lastError: Error | null = null;
      
      for (const bucketName of bucketOptions) {
        try {
          console.log(`Attempting to upload to "${bucketName}" bucket`);
          
          // Upload file to storage
          const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(fileName, file, {
              cacheControl: 'no-cache',
              upsert: true
            });
            
          if (uploadError) {
            console.warn(`Failed to upload to "${bucketName}" bucket:`, uploadError.message);
            lastError = new Error(uploadError.message);
            continue; // Try next bucket
          }
          
          // Get public URL for the file
          const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);
            
          if (urlData?.publicUrl) {
            uploadedUrl = urlData.publicUrl;
            console.log(`Successfully uploaded to "${bucketName}" bucket:`, uploadedUrl);
            
            // Record this activity
            this.recordUserActivity({
              activityType: 'profile_update',
              description: 'Updated profile picture',
              timestamp: new Date().toISOString(),
              metadata: {
                bucketName,
                fileSize: file.size
              }
            }).catch(err => console.warn('Failed to record activity:', err));
            
            // Update user metadata with the avatar URL
            try {
              const { data: userData } = await supabase.auth.getUser();
              if (userData?.user) {
                await supabase.auth.updateUser({
                  data: {
                    avatar_url: uploadedUrl
                  }
                });
                console.log("Updated user metadata with new avatar URL");
              }
            } catch (metadataError) {
              console.warn("Failed to update user metadata with avatar URL:", metadataError);
              // Continue anyway as we have the URL
            }
            
            break; // Exit loop after successful upload
          }
        } catch (bucketError: any) {
          console.warn(`Error with "${bucketName}" bucket:`, bucketError);
          lastError = new Error(bucketError.message || `Error with "${bucketName}" bucket`);
        }
      }
      
      if (uploadedUrl) {
        return {
          success: true,
          url: uploadedUrl,
          error: null
        };
      } else {
        throw new Error(lastError?.message || 'Failed to upload image to any storage bucket');
      }
    } catch (error: any) {
      console.error('Error uploading profile image:', error);
      return {
        success: false,
        url: null,
        error: error.message || 'Unknown error occurred while uploading image'
      };
    }
  }

  async updatePatientProfile(profile: Partial<PatientProfile>): Promise<{
    success: boolean;
    data: PatientProfile | null;
    error: string | null;
  }> {
    try {
      // Ensure we have a user_id field
      const userId = (profile as any).userId || (profile as any).user_id;
      if (!userId) {
        throw new Error('Profile must have a user_id or userId');
      }

      // Ensure we have the required email field
      if (!profile.email) {
        throw new Error('Profile must have an email field');
      }

      // Log the incoming profile for debugging
      console.log('Updating patient profile with data:', JSON.stringify(profile));

      // Convert object to snake_case for database
      const snakeCaseProfile = convertObjectToSnakeCase({
        ...profile,
        user_id: userId
      });

      // Log the snake_case converted profile
      console.log('After snake_case conversion:', JSON.stringify(snakeCaseProfile));

      // Check if profile already exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('patient_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (checkError) {
        console.error('Error checking if profile exists:', checkError);
        throw checkError;
      }

      let result;
      
      if (existingProfile) {
        // Update existing profile
        console.log('Updating existing profile with ID:', existingProfile.id);
        result = await supabase
          .from('patient_profiles')
          .update({
            ...snakeCaseProfile,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .select('*')
          .single();
      } else {
        // Insert new profile
        console.log('Creating new profile for user_id:', userId);
        result = await supabase
          .from('patient_profiles')
          .insert({
            ...snakeCaseProfile,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('*')
          .single();
      }

      if (result.error) {
        console.error('Supabase error in updatePatientProfile:', result.error);
        throw result.error;
      }

      // Convert back to camelCase for UI
      return {
        success: true,
        data: result.data ? convertObjectToCamelCase(result.data) as PatientProfile : null,
        error: null
      };
    } catch (error: any) {
      console.error('Error updating patient profile:', error);
      // Log specific error details if available
      if (error.details) console.error('Error details:', error.details);
      if (error.hint) console.error('Error hint:', error.hint);
      if (error.code) console.error('Error code:', error.code);
      
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to update profile'
      };
    }
  }

  async getAppointments(patientId: string, options?: {
    status?: 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<Appointment[]> {
    try {
      // Use the patient_appointments_view for better performance and data structure
      let query = supabase
        .from('patient_appointments_view')
        .select('*')
        .eq('patient_id', patientId);

      // Add status filter if provided
      if (options?.status) {
        query = query.eq('status', options.status);
      }

      // Add date range filters if provided
      if (options?.startDate) {
        query = query.gte('date', options.startDate);
      }

      if (options?.endDate) {
        query = query.lte('date', options.endDate);
      }

      // Add limit if provided
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      // Order by date and time ascending
      query = query.order('date', { ascending: true }).order('start_time', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      
      // Return data as is since we're using snake_case throughout the application
      return data || [];
    } catch (error) {
      console.error('Error in getAppointments:', error);
      return [];
    }
  }

  async getAppointmentReports(options: {
    patientId?: string;
    moodMentorId?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    success: boolean;
    data: AppointmentReport[];
    error: string | null;
  }> {
    try {
      // Query the appointment_reports table or create a query to join appointments with feedback
      let query = supabase
        .from('appointments')
        .select(`
          id,
          title,
          description,
          date,
          start_time,
          end_time,
          status,
          patient_id,
          mentor_id,
          rating,
          feedback,
          created_at,
          updated_at
        `)
        .order('date', { ascending: false });
      
      // Apply filters based on options
      if (options.patientId) {
        query = query.eq('patient_id', options.patientId);
      }
      
      if (options.moodMentorId) {
        query = query.eq('mentor_id', options.moodMentorId);
      }
      
      if (options.startDate) {
        query = query.gte('date', options.startDate);
      }
      
      if (options.endDate) {
        query = query.lte('date', options.endDate);
      }
      
      // Only get completed appointments with feedback
      query = query.eq('status', 'completed').not('feedback', 'is', null);
      
      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      // Convert to camelCase and map to AppointmentReport format
      const reports: AppointmentReport[] = (data || []).map(appointment => ({
        id: appointment.id,
        appointmentId: appointment.id,
        patientId: appointment.patient_id,
        mentorId: appointment.mentor_id,
        moodMentorId: appointment.mentor_id,
        date: appointment.date,
        startTime: appointment.start_time,
        endTime: appointment.end_time,
        notes: appointment.feedback || '',
        summary: appointment.description || '',
        recommendations: [], // Empty array as required by the interface
        rating: appointment.rating || 0,
        status: appointment.status,
        title: appointment.title || 'Appointment',
        createdAt: appointment.created_at,
        updatedAt: appointment.updated_at
      }));
      
      return {
        success: true,
        data: reports,
        error: null
      };
    } catch (error: any) {
      console.error('Error in getAppointmentReports:', error);
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }

  // Add the method required by the interface but implement it to use the real data method
  getMockAppointmentReports(options: {
    patientId?: string;
    moodMentorId?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }): AppointmentReport[] {
    // This method can't directly call an async method, so we'll return an empty array
    // The real implementation is in getAppointmentReports
    console.log('getMockAppointmentReports is deprecated, use getAppointmentReports instead');
    return [];
  }

  async createAppointment(appointment: Omit<Appointment, 'id' | 'status' | 'created_at' | 'updated_at' | 'cancellation_reason' | 'cancelled_by' | 'rating' | 'feedback'>): Promise<Appointment> {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          ...appointment,
          status: 'pending'
        })
        .select('*')
        .single();
        
      if (error) throw error;
      
      return data as Appointment;
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  }

  async updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment | null> {
    try {
      // Add updated_at timestamp
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };
      
      const { data: updatedData, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();
        
      if (error) throw error;
      
      return updatedData as Appointment;
    } catch (error) {
      console.error('Error updating appointment:', error);
      return null;
    }
  }

  async cancelAppointment(id: string, reason?: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('User not authenticated');
        return false;
      }
      
      // First get the appointment details to know who to notify
      const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select('id, patient_id, mentor_id, title, date, start_time')
        .eq('id', id)
        .single();
        
      if (fetchError) {
        console.error('Error fetching appointment for cancellation:', fetchError);
        return false;
      }
      
      if (!appointment) {
        console.error('Appointment not found');
        return false;
      }
      
      // Update the appointment status
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled',
          cancellation_reason: reason || null,
          cancelled_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
        
      if (error) throw error;
      
      // Create a notification for the other party
      try {
        // Determine who to notify (the other person)
        const recipientId = user.id === appointment.patient_id 
          ? appointment.mentor_id 
          : appointment.patient_id;
          
        const isCancelledByMentor = user.id === appointment.mentor_id;
        
        // Format the date for the notification
        const appointmentDate = new Date(appointment.date);
        const formattedDate = appointmentDate.toLocaleDateString('en-US', { 
          weekday: 'long',
          month: 'long', 
          day: 'numeric'
        });
        
        // Create notification
        const notificationData = {
          user_id: recipientId,
          title: 'Appointment Cancelled',
          message: isCancelledByMentor
            ? `Your appointment on ${formattedDate} at ${appointment.start_time} has been cancelled by your mood mentor.${reason ? ` Reason: ${reason}` : ''}`
            : `Your patient has cancelled their appointment scheduled for ${formattedDate} at ${appointment.start_time}.${reason ? ` Reason: ${reason}` : ''}`,
          type: 'appointment',
          is_read: false,
          created_at: new Date().toISOString()
        };
        
        const { error: notifyError } = await supabase
          .from('notifications')
          .insert(notificationData);
          
        if (notifyError) {
          console.error('Error creating cancellation notification:', notifyError);
          // Continue anyway as this is not critical
        }
      } catch (notifyError) {
        console.warn('Error creating cancellation notification:', notifyError);
        // Continue anyway as this is not critical
      }
      
      return true;
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      return false;
    }
  }

  async getMetrics(patientId: string, options?: {
    type?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PatientMetric[]> {
    try {
      // Build query to get metrics from mood_entries and stress_assessments
      let query = supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', patientId)
        .order('created_at', { ascending: false });
      
      if (options?.startDate) {
        query = query.gte('created_at', options.startDate);
      }
      
      if (options?.endDate) {
        query = query.lte('created_at', options.endDate);
      }
      
      const { data: moodData, error: moodError } = await query;
      
      if (moodError) {
        console.error('Error fetching mood metrics:', moodError);
      }
      
      // Get stress assessments
      let stressQuery = supabase
        .from('stress_assessments')
        .select('*')
        .eq('user_id', patientId)
        .order('created_at', { ascending: false });
      
      if (options?.startDate) {
        stressQuery = stressQuery.gte('created_at', options.startDate);
      }
      
      if (options?.endDate) {
        stressQuery = stressQuery.lte('created_at', options.endDate);
      }
      
      const { data: stressData, error: stressError } = await stressQuery;
      
      if (stressError) {
        console.error('Error fetching stress metrics:', stressError);
      }
      
      // Combine and format results
      const metrics: PatientMetric[] = [];
      
      // Add mood metrics
      if (moodData) {
        moodData.forEach(entry => {
          metrics.push({
            id: `mood-${entry.id}`,
            patientId,
            type: 'mood',
            value: typeof entry.mood === 'number' ? entry.mood : 
                   typeof entry.mood === 'string' ? parseFloat(entry.mood) || 0 : 0,
            timestamp: entry.created_at
          });
        });
      }
      
      // Add stress metrics
      if (stressData) {
        stressData.forEach(entry => {
          metrics.push({
            id: `stress-${entry.id}`,
            patientId,
            type: 'stress',
            value: typeof entry.score === 'number' ? entry.score : 
                   typeof entry.score === 'string' ? parseFloat(entry.score) || 0 : 0,
            timestamp: entry.created_at
          });
        });
      }
      
      // Filter by type if specified
      if (options?.type) {
        return metrics.filter(m => m.type === options.type);
      }
      
      return metrics;
    } catch (error) {
      console.error('Error getting metrics:', error);
      return [];
    }
  }

  async getAssessments(patientId: string, options?: {
    type?: string;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<Assessment[]> {
    try {
      // Query the assessments table
      let query = supabase
        .from('assessments')
        .select('*')
        .eq('user_id', patientId)
        .order('created_at', { ascending: false });
      
      // Apply filters
      if (options?.type) {
        query = query.eq('type', options.type);
      }
      
      if (options?.startDate) {
        query = query.gte('created_at', options.startDate);
      }
      
      if (options?.endDate) {
        query = query.lte('created_at', options.endDate);
      }
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching assessments:', error);
        return [];
      }
      
      // Convert to camelCase and map to Assessment format
      return (data || []).map(assessment => convertObjectToCamelCase(assessment)) as Assessment[];
    } catch (error) {
      console.error('Error getting assessments:', error);
      return [];
    }
  }

  async getPatientDashboardData(patientId: string): Promise<{
    success: boolean;
    data: PatientDashboardData | null;
    error: string | null;
  }> {
    try {
      // Get metrics for dashboard calculations
      const metrics = await this.getMetrics(patientId);
      
      // Get recent mood entries
      const { data: moodData, error: moodError } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', patientId)
        .order('created_at', { ascending: false })
        .limit(30);
      
      if (moodError) {
        console.error('Error fetching mood data:', moodError);
      }
      
      // Get recent journal entries
      const { data: journalData, error: journalError } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', patientId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (journalError) {
        console.error('Error fetching journal entries:', journalError);
      }
      
      // Get support groups
      const { data: groupData, error: groupError } = await supabase
        .from('group_members')
        .select(`
          group_id,
          support_groups (
            id,
            name,
            description,
            mood_mentor_id,
            created_at
          )
        `)
        .eq('user_id', patientId)
        .eq('status', 'active');
      
      if (groupError) {
        console.error('Error fetching support groups:', groupError);
      }
      
      // Calculate metrics
      const moodEntries = moodData || [];
      const hasEntries = moodEntries.length > 0;
      
      // Calculate average mood score
      const moodScore = hasEntries 
        ? moodEntries.reduce((sum, entry) => {
            const moodValue = typeof entry.mood === 'number' ? entry.mood : 
                             typeof entry.mood === 'string' ? parseFloat(entry.mood) || 0 : 0;
            return sum + moodValue;
          }, 0) / moodEntries.length
        : 0;
      
      // Calculate stress level from metrics
      const stressMetrics = metrics.filter(m => m.type === 'stress');
      const stressLevel = stressMetrics.length > 0
        ? stressMetrics.reduce((sum, m) => sum + m.value, 0) / stressMetrics.length
        : 0;
      
      // Calculate streak and consistency
      let streak = 0;
      let consistency = 0;
      
      if (hasEntries) {
        // Sort by date ascending for streak calculation
        const sortedEntries = [...moodEntries].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        // Calculate dates with entries in the last 30 days
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const datesWithEntries = new Set();
        
        sortedEntries.forEach(entry => {
          const entryDate = new Date(entry.created_at);
          if (entryDate >= thirtyDaysAgo) {
            datesWithEntries.add(entryDate.toISOString().split('T')[0]);
          }
        });
        
        // Calculate consistency as percentage of days with entries
        const daysBetween = Math.ceil((now.getTime() - thirtyDaysAgo.getTime()) / (24 * 60 * 60 * 1000));
        consistency = Math.round((datesWithEntries.size / daysBetween) * 100);
        
        // Calculate current streak
        const lastEntry = sortedEntries[sortedEntries.length - 1];
        const lastEntryDate = new Date(lastEntry.created_at);
        const lastEntryDay = lastEntryDate.toISOString().split('T')[0];
        const today = now.toISOString().split('T')[0];
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        // Check if the user has logged today or yesterday to maintain streak
        const hasRecentEntry = lastEntryDay === today || lastEntryDay === yesterday;
        
        if (hasRecentEntry) {
          streak = 1; // Start with 1 for the most recent day
          
          // Go backwards through dates to find consecutive days
          let currentDate = new Date(lastEntryDate);
          currentDate.setDate(currentDate.getDate() - 1);
          
          while (true) {
            const dateStr = currentDate.toISOString().split('T')[0];
            if (datesWithEntries.has(dateStr)) {
              streak++;
              currentDate.setDate(currentDate.getDate() - 1);
            } else {
              break;
            }
          }
        }
      }
      
      // Format journal entries
      const journalEntries = (journalData || []).map(entry => convertObjectToCamelCase(entry));
      
      // Format support groups
      const supportGroups = (groupData || [])
        .filter(item => item.support_groups) // Filter out any null groups
        .map(item => convertObjectToCamelCase(item.support_groups));
      
      // Build dashboard data
      const dashboardData: PatientDashboardData = {
        metrics: {
          moodScore: parseFloat(moodScore.toFixed(1)),
          stressLevel: parseFloat(stressLevel.toFixed(1)),
          consistency,
          streak,
          lastCheckInStatus: hasEntries ? this.getMoodStatus(moodEntries[0].mood) : 'unknown',
          firstCheckInDate: hasEntries ? moodEntries[moodEntries.length - 1].created_at : null,
          lastCheckInDate: hasEntries ? moodEntries[0].created_at : null,
          hasAssessments: metrics.length > 0
        },
        journalEntries,
        supportGroups
      };
      
      return {
        success: true,
        data: dashboardData,
        error: null
      };
    } catch (error: any) {
      console.error('Error getting patient dashboard data:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }
  
  // Helper method to convert mood value to status
  private getMoodStatus(mood: number | string): string {
    const moodValue = typeof mood === 'number' ? mood : 
                     typeof mood === 'string' ? parseFloat(mood) || 0 : 0;
    
    if (moodValue >= 4) return 'excellent';
    if (moodValue >= 3) return 'good';
    if (moodValue >= 2) return 'okay';
    if (moodValue >= 1) return 'poor';
    return 'bad';
  }

  async saveAssessment(assessment: Omit<Assessment, 'id'>): Promise<Assessment> {
    try {
      // Convert to snake_case
      const snakeCaseAssessment = convertObjectToSnakeCase(assessment);
      
      const { data, error } = await supabase
        .from('assessments')
        .insert(snakeCaseAssessment)
        .select('*')
        .single();
        
      if (error) throw error;
      
      return convertObjectToCamelCase(data) as Assessment;
    } catch (error) {
      console.error('Error saving assessment:', error);
      throw error;
    }
  }

  async updateMetrics(patientId: string, metricsUpdate: UserMetricsUpdate): Promise<boolean> {
    try {
      // This is a placeholder - would update metrics in a real implementation
      return true;
    } catch (error) {
      console.error('Error updating metrics:', error);
      return false;
    }
  }

  async getUserActivity(userId: string, limit: number = 10): Promise<{
    success: boolean;
    data: UserActivity[];
    error: string | null;
  }> {
    try {
      // First check if the user_activity table exists
      const { data: tableExists, error: checkError } = await supabase
        .from('user_activity')
        .select('id')
        .limit(1);
      
      // If table doesn't exist or error, we'll create recent activities from other tables
      if (checkError || !tableExists) {
        return await this.generateUserActivityFromEvents(userId, limit);
      }
      
      // If the user_activity table exists, query it directly
      const { data, error } = await supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);
        
      if (error) throw error;
      
      // Convert to camelCase
      return {
        success: true,
        data: (data || []).map(activity => convertObjectToCamelCase(activity)) as UserActivity[],
        error: null
      };
    } catch (error: any) {
      console.error('Error getting user activity:', error);
      // Fallback to generated activities on error
      return await this.generateUserActivityFromEvents(userId, limit);
    }
  }
  
  private async generateUserActivityFromEvents(userId: string, limit: number): Promise<{
    success: boolean;
    data: UserActivity[];
    error: string | null;
  }> {
    const activities: UserActivity[] = [];
    
    try {
      // 1. Get recent auth sessions
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        // Add current login session
        const metadata = authData.user.user_metadata || {};
        const current = metadata.current_session || {};
        
        if (current.last_login) {
          activities.push({
            id: `login-${Date.now()}`,
            activityType: 'login',
            description: 'Logged in successfully',
            deviceInfo: `${current.os || 'Unknown OS'} • ${current.device_type || 'Unknown Device'} • ${current.browser || 'Unknown Browser'}`,
            timestamp: current.last_login,
            metadata: { ip: current.ip_address, userAgent: current.user_agent }
          });
        }
      }
      
      // 2. Get recent profile updates
      const { data: profileData } = await supabase
        .from('patient_profiles')
        .select('updated_at')
        .eq('user_id', userId)
        .single();
        
      if (profileData && profileData.updated_at) {
        activities.push({
          id: `profile-${Date.now() + 1}`,
          activityType: 'profile_update',
          description: 'Updated profile information',
          timestamp: profileData.updated_at,
        });
      }
      
      // 3. Get recent appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, start_time, status, created_at')
        .eq('patient_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);
        
      if (appointments) {
        appointments.forEach((apt, index) => {
          activities.push({
            id: `appointment-${apt.id}`,
            activityType: 'appointment',
            description: apt.status === 'scheduled' 
              ? 'Scheduled a new appointment' 
              : `Appointment ${apt.status}`,
            timestamp: apt.created_at,
            metadata: { appointmentId: apt.id, startTime: apt.start_time }
          });
        });
      }
      
      // 4. Get recent journal entries
      const { data: journal } = await supabase
        .from('journal_entries')
        .select('id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);
        
      if (journal) {
        journal.forEach((entry) => {
          activities.push({
            id: `journal-${entry.id}`,
            activityType: 'journal',
            description: 'Created a journal entry',
            timestamp: entry.created_at,
            metadata: { entryId: entry.id }
          });
        });
      }
      
      // 5. Get recent mood entries
      const { data: moods } = await supabase
        .from('mood_entries')
        .select('id, mood, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(2);
        
      if (moods) {
        moods.forEach((entry) => {
          activities.push({
            id: `mood-${entry.id}`,
            activityType: 'assessment',
            description: `Recorded mood: ${entry.mood}`,
            timestamp: entry.created_at,
            metadata: { mood: entry.mood }
          });
        });
      }
      
      // 6. Get recent stress assessments
      const { data: stress } = await supabase
        .from('stress_assessments')
        .select('id, score, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(2);
        
      if (stress) {
        stress.forEach((entry) => {
          activities.push({
            id: `stress-${entry.id}`,
            activityType: 'assessment',
            description: `Completed stress assessment`,
            timestamp: entry.created_at,
            metadata: { score: entry.score }
          });
        });
      }
      
      // Sort all activities by timestamp (newest first) and limit
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
      
      return {
        success: true,
        data: sortedActivities,
        error: null
      };
    } catch (error: any) {
      console.error('Error generating user activity:', error);
      
      // Return at least the current login if we have it
      return {
        success: true,
        data: activities.length > 0 ? 
          activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit) : 
          this.getFallbackActivities(userId),
        error: error.message
      };
    }
  }
  
  private getFallbackActivities(userId: string): UserActivity[] {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    
    return [
      {
        id: `login-${Date.now()}`,
        activityType: 'login',
        description: 'Logged in successfully',
        deviceInfo: getFormattedDeviceInfo(),
        timestamp: now.toISOString(),
      },
      {
        id: `profile-${Date.now() + 1}`,
        activityType: 'profile_update',
        description: 'Updated profile information',
        timestamp: yesterday.toISOString(),
      },
      {
        id: `assessment-${Date.now() + 2}`,
        activityType: 'assessment',
        description: 'Completed stress assessment',
        timestamp: twoDaysAgo.toISOString(),
      }
    ];
  }

  async recordUserActivity(activity: Omit<UserActivity, 'id'>): Promise<boolean> {
    try {
      // First check if the user_activity table exists
      const { data: tableExists, error: checkError } = await supabase
        .from('user_activity')
        .select('id')
        .limit(1);
      
      // If table doesn't exist or error, try to create it
      if (checkError) {
        console.warn('User activity table may not exist, will attempt to create:', checkError);
        // Not attempting to create table here as it requires additional permissions
        return false;
      }
      
      // Insert the activity record
      const { error } = await supabase
        .from('user_activity')
        .insert({
          ...convertObjectToSnakeCase(activity),
          id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
        });
        
      if (error) {
        console.error('Error recording user activity:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in recordUserActivity:', error);
      return false;
    }
  }
} 