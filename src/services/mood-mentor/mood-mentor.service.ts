import { IMoodMentorService, MoodMentor, MoodMentorUI, MoodMentorReview, MoodMentorSettings, MoodMentorStats, SupportGroup } from './mood-mentor.interface';
import { supabase } from '@/lib/supabase';

// Utility functions for case conversion
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

export class MoodMentorService implements IMoodMentorService {
  async getMoodMentors(options?: {
    specialties?: string[];
    minRating?: number;
    maxHourlyRate?: number;
    limit?: number;
    offset?: number;
  }): Promise<MoodMentorUI[]> {
    try {
      let query = supabase
        .from('mood_mentor_profiles')
        .select('*')
        .eq('is_active', true)
        .eq('is_profile_complete', true);

      // Add specialty filter if provided
      if (options?.specialties && options.specialties.length > 0) {
        query = query.contains('therapy_types', options.specialties);
      }

      // Add rating filter if provided
      if (options?.minRating) {
        query = query.gte('rating', options.minRating);
      }

      // Add hourly rate filter if provided
      if (options?.maxHourlyRate) {
        query = query.lte('hourly_rate', options.maxHourlyRate);
      }

      // Add pagination if required
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      // Sort by rating in descending order
      query = query.order('rating', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      
      // Convert snake_case to camelCase
      return (data || []).map(mentor => convertObjectToCamelCase(mentor)) as MoodMentorUI[];
    } catch (error) {
      console.error('Error in getMoodMentors:', error);
      return [];
    }
  }

  async getMoodMentorById(id: string): Promise<{
    success: boolean;
    data: MoodMentorUI | null;
    error: string | null;
  }> {
    try {
      if (!id) {
        throw new Error('ID is required');
      }

      // First try to find by user_id
      const { data: userData, error: userError } = await supabase
        .from('mood_mentor_profiles')
        .select('*')
        .eq('user_id', id)
        .maybeSingle();

      if (userData) {
        return {
          success: true,
          data: convertObjectToCamelCase(userData) as MoodMentorUI,
          error: null
        };
      }

      // If not found by user_id, try by id
      const { data: idData, error: idError } = await supabase
        .from('mood_mentor_profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (idError) {
        throw idError;
      }

      return {
        success: true,
        data: idData ? convertObjectToCamelCase(idData) as MoodMentorUI : null,
        error: null
      };
    } catch (error) {
      console.error('Error in getMoodMentorById:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  async uploadProfileImage(mentorId: string, file: File): Promise<{
    success: boolean;
    url: string | null;
    error: string | null;
  }> {
    try {
      // Generate a unique filename with timestamp to avoid cache issues
      const timestamp = new Date().getTime();
      const randomStr = Math.random().toString(36).substring(2, 10);
      const fileExt = file.name.split('.').pop();
      const fileName = `${mentorId}-${timestamp}-${randomStr}.${fileExt}`;
      
      // Use existing buckets only - don't try to create buckets from client code
      const bucketOptions = ['avatars', 'public', 'profile-images'];
      let uploadedUrl = null;
      let lastError = null;
      
      // Try each bucket until one works
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
            lastError = uploadError;
            continue; // Try next bucket
          }
          
          // Get public URL for the file
          const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);
            
          if (urlData?.publicUrl) {
            uploadedUrl = urlData.publicUrl;
            console.log(`Successfully uploaded to "${bucketName}" bucket:`, uploadedUrl);
            
            // After successful upload, update the user's metadata with the avatar URL
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
        } catch (bucketError) {
          console.warn(`Error with "${bucketName}" bucket:`, bucketError);
          lastError = bucketError;
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
    } catch (error) {
      console.error('Error uploading profile image:', error);
      return {
        success: false,
        url: null,
        error: error.message || 'Unknown error occurred while uploading image'
      };
    }
  }

  async updateMoodMentorProfile(profile: Partial<MoodMentorUI> | Partial<MoodMentor>): Promise<{
    success: boolean;
    data: MoodMentorUI | null;
    error: string | null;
    details?: any;
  }> {
    try {
      // Ensure we have a user_id field, checking both camelCase and snake_case
      const userId = (profile as any).userId || (profile as any).user_id;
      if (!userId) {
        throw new Error('Profile must have a user_id or userId');
      }

      // Ensure profile has a snake_case user_id field for the database
      if (!(profile as any).user_id) {
        (profile as any).user_id = userId;
      }

      // Create a clean copy of the profile without problematic fields
      const cleanProfile = { ...profile };
      
      // If the id is an empty string, remove it to let the database generate a UUID
      if ((cleanProfile as any).id === '') {
        delete (cleanProfile as any).id;
      }
      // Also check for empty string in snake_case
      if ((cleanProfile as any).id === '') {
        delete (cleanProfile as any).id;
      }

      // Convert the profile to snake_case for the database
      const snakeCaseProfile = convertObjectToSnakeCase(cleanProfile);

      // Try to get the current user to verify they are authenticated
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        console.error('Auth error when updating profile:', authError);
        return {
          success: false,
          data: null,
          error: 'Authentication required to update profile',
          details: authError
        };
      }

      // Try to determine if the profile exists by checking if it's the current user's profile
      let profileExists = false;
      try {
        const { data: existingProfile, error: lookupError } = await supabase
          .from('mood_mentor_profiles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
          
        if (!lookupError && existingProfile) {
          profileExists = true;
        }
      } catch (error) {
        // If there's an error checking, we'll assume the profile doesn't exist
        console.warn('Error checking for existing profile, will attempt to create new:', error);
        profileExists = false;
      }

      let result;
      
      if (profileExists) {
        console.log('Updating existing profile for user:', userId);
        // Update existing profile - remove id field on update to avoid UUID errors
        const updateData = { ...snakeCaseProfile };
        delete updateData.id; // Ensure we don't try to update the primary key
        
        result = await supabase
          .from('mood_mentor_profiles')
          .update(updateData)
          .eq('user_id', userId)
          .select()
          .single();
      } else {
        console.log('Creating new profile for user:', userId);
        // Insert new profile - let the database generate the id
        delete snakeCaseProfile.id; // Remove any id field to let DB generate UUID
        
        // Ensure required fields are present for a new profile
        const newProfileData = {
          ...snakeCaseProfile,
          user_id: userId,
          full_name: snakeCaseProfile.full_name || authData.user.user_metadata?.name || 'Mood Mentor',
          email: snakeCaseProfile.email || authData.user.email || '',
          bio: snakeCaseProfile.bio || '',
          specialty: snakeCaseProfile.specialty || 'Mental Health Support',
          languages: snakeCaseProfile.languages || ['English'],
          gender: snakeCaseProfile.gender || 'Prefer not to say',
          location: snakeCaseProfile.location || 'Available Online',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        result = await supabase
          .from('mood_mentor_profiles')
          .insert(newProfileData)
          .select()
          .single();
      }

      if (result.error) {
        console.error('Error in database operation:', result.error);
        return {
          success: false,
          data: null,
          error: result.error.message || 'Database operation failed',
          details: {
            message: result.error.message,
            code: result.error.code,
            hint: result.error.hint,
            details: result.error.details
          }
        };
      }

      return {
        success: true,
        data: convertObjectToCamelCase(result.data) as MoodMentorUI,
        error: null
      };
    } catch (error: any) {
      console.error('Exception in updateMoodMentorProfile:', error);
      
      // Determine if this is a constraint violation
      const isConstraintViolation = error.message && 
        (error.message.includes('violates constraint') || 
         error.message.includes('violates foreign key constraint') ||
         error.message.includes('violates check constraint') ||
         error.message.includes('duplicate key value'));
         
      // Determine if this is a permission error
      const isPermissionError = error.message && 
        (error.message.includes('permission denied') || 
         error.message.includes('not authorized') ||
         error.message.includes('violates row-level security policy'));
      
      return {
        success: false,
        data: null,
        error: isConstraintViolation ? 
          'One or more values do not meet database requirements' : 
          isPermissionError ?
          'You do not have permission to perform this action. Please ensure you are logged in with the correct account.' :
          error.message || 'An unknown error occurred',
        details: {
          originalError: error.message,
          stack: error.stack,
          code: error.code,
          hint: error.hint,
          details: error.details
        }
      };
    }
  }

  async getFormattedMoodMentorData(id: string): Promise<{
    success: boolean;
    data: MoodMentorUI | null;
    reviews: MoodMentorReview[];
    error: string | null;
  }> {
    try {
      const { success, data, error } = await this.getMoodMentorById(id);
      
      if (!success || !data) {
        throw new Error(error || 'Mentor not found');
      }
      
      const reviews = await this.getMoodMentorReviews(id);
      
      return {
        success: true,
        data,
        reviews,
        error: null
      };
    } catch (error) {
      console.error('Error in getFormattedMoodMentorData:', error);
      return {
        success: false,
        data: null,
        reviews: [],
        error: error.message
      };
    }
  }

  async getMoodMentorReviews(mentorId: string, options?: {
    limit?: number;
    offset?: number;
    includeAll?: boolean; // Flag to include all reviews regardless of status
  }): Promise<MoodMentorReview[]> {
    try {
      // Use the new view to get reviews with patient data in one query
      let reviewQuery = supabase
        .from('mentor_reviews_with_patients')
        .select('*')
        .eq('mentor_id', mentorId)
        .order('created_at', { ascending: false });
      
      // Filter by status unless includeAll is true
      if (!options?.includeAll) {
        reviewQuery = reviewQuery.eq('status', 'published');
      }
      
      if (options?.limit) {
        reviewQuery = reviewQuery.limit(options.limit);
      }
      
      if (options?.offset) {
        reviewQuery = reviewQuery.range(
          options.offset, 
          options.offset + (options.limit || 10) - 1
        );
      }
      
      const { data: reviewsData, error: reviewsError } = await reviewQuery;
      
      if (reviewsError) {
        console.error('Error fetching reviews:', reviewsError);
        return [];
      }
      
      if (!reviewsData || reviewsData.length === 0) {
        return [];
      }
      
      // Map the reviews to the expected format - we now have patient data from the view
      return reviewsData.map(review => ({
        id: review.id,
        patientId: review.patient_id,
        mentorId,
        rating: review.rating,
        reviewText: review.review_text,
        createdAt: review.created_at,
        patientName: review.patient_name || 'Patient', // Use Patient as default
        patientAvatar: null, // Since our SQL doesn't provide avatar information
        appointmentId: review.appointment_id,
        status: review.status
      }));
    } catch (error: any) {
      console.error('Error in getMoodMentorReviews:', error);
      return [];
    }
  }

  async addMoodMentorReview(review: Omit<MoodMentorReview, 'id' | 'createdAt'>): Promise<MoodMentorReview> {
    try {
      // Simplified eligibility check that doesn't rely on RPC function
      // First check if the appointment exists and belongs to the patient
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select('status')
        .eq('id', review.appointmentId)
        .eq('patient_id', review.patientId)
        .single();
      
      if (appointmentError || !appointmentData) {
        throw new Error('Cannot review this appointment. Appointment not found or does not belong to you.');
      }

      // Check if the appointment is completed
      if (appointmentData.status !== 'completed') {
        throw new Error('Cannot review this appointment. The appointment must be completed first.');
      }

      // Check if this appointment is already reviewed
      const { count: existingReviews, error: reviewCheckError } = await supabase
        .from('mentor_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('appointment_id', review.appointmentId);
      
      if (reviewCheckError) {
        throw new Error(`Error checking review eligibility: ${reviewCheckError.message}`);
      }
      
      if (existingReviews && existingReviews > 0) {
        throw new Error('You have already reviewed this appointment.');
      }
      
      // If we've made it here, the patient can review this appointment
      const { data, error } = await supabase
        .from('mentor_reviews')
        .insert({
          appointment_id: review.appointmentId,
          mentor_id: review.mentorId,
          patient_id: review.patientId,
          rating: review.rating,
          review_text: review.reviewText,
          status: 'pending'
        })
        .select()
        .single();
        
      if (error) throw new Error(`Error adding review: ${error.message}`);
      
      return {
        id: data.id,
        patientId: data.patient_id,
        mentorId: data.mentor_id,
        rating: data.rating,
        reviewText: data.review_text,
        createdAt: data.created_at,
        patientName: review.patientName || 'Patient', // Use Patient as default
        patientAvatar: null, // Since our SQL doesn't provide avatar information
        appointmentId: data.appointment_id,
        status: data.status
      };
    } catch (error: any) {
      console.error('Error in addMoodMentorReview:', error);
      throw error;
    }
  }
  
  /**
   * Update a review's status (for approving or rejecting reviews)
   */
  async updateReviewStatus(reviewId: string, mentorId: string, status: 'pending' | 'published' | 'rejected'): Promise<boolean> {
    try {
      // Make sure only the mentor associated with the review can update its status
      const { error } = await supabase
        .from('mentor_reviews')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', reviewId)
        .eq('mentor_id', mentorId);

      if (error) throw new Error(`Error updating review status: ${error.message}`);
      
      return true;
    } catch (error: any) {
      console.error('Error in updateReviewStatus:', error);
      return false;
    }
  }

  async getMoodMentorSettings(mentorId: string): Promise<{
    success: boolean;
    data: MoodMentorSettings | null;
    error: string | null;
  }> {
    // Placeholder for now - implement when needed
    return {
      success: true,
      data: {
        id: mentorId,
        notificationsEnabled: true,
        emailNotifications: true,
        autoConfirmAppointments: false,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        availableHours: { start: '09:00', end: '17:00' },
        breakHours: { start: '12:00', end: '13:00' },
        timezone: 'UTC',
        appointmentBuffer: 15,
        defaultSessionDuration: 45
      },
      error: null
    };
  }

  async updateMoodMentorSettings(mentorId: string, settings: Partial<MoodMentorSettings>): Promise<{
    success: boolean;
    data: MoodMentorSettings | null;
    error: string | null;
  }> {
    // Placeholder for now - implement when needed
    return this.getMoodMentorSettings(mentorId);
  }

  async getDashboardStats(mentorId: string): Promise<MoodMentorStats> {
    try {
      // Get appointments count
      const { count: appointmentsCount, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('mood_mentor_id', mentorId);
        
      if (appointmentsError) throw appointmentsError;
      
      // Get upcoming appointments
      const { data: upcomingAppointments, error: upcomingError } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          start_time,
          status,
          patient_profiles:patient_id (
            full_name,
            avatar_url
          )
        `)
        .eq('mood_mentor_id', mentorId)
        .eq('status', 'scheduled')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(5);
        
      if (upcomingError) throw upcomingError;
      
      // Get average rating
      const { data: ratingData, error: ratingError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('mentor_id', mentorId);
        
      if (ratingError) throw ratingError;
      
      const averageRating = ratingData.length > 0
        ? ratingData.reduce((sum, r) => sum + r.rating, 0) / ratingData.length
        : 5.0;
      
      return {
        totalAppointments: appointmentsCount || 0,
        totalClients: 0, // Placeholder - implement when needed
        averageRating,
        totalEarnings: 0, // Placeholder - implement when needed
        upcomingAppointments: upcomingAppointments.map(appt => {
          // Safely access the nested patient_profiles data
          const patientProfile = appt.patient_profiles as any;
          
          return {
          id: appt.id,
          date: appt.date,
          startTime: appt.start_time,
          status: appt.status,
            patientName: patientProfile?.full_name || 'Patient',
            patientAvatar: patientProfile?.avatar_url || null
          };
        })
      };
    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      return {
        totalAppointments: 0,
        totalClients: 0,
        averageRating: 5.0,
        totalEarnings: 0,
        upcomingAppointments: []
      };
    }
  }

  async getSupportGroups(): Promise<SupportGroup[]> {
    // Placeholder for now - implement when needed
    return [];
  }

  async addPatientToGroup(patientId: string, groupId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: patientId,
          status: 'active',
          created_at: new Date().toISOString()
        });
      
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Error adding patient to group:', error);
      return false;
    }
  }

  async getMoodMentorBySlug(nameSlug: string): Promise<{
    success: boolean;
    data: MoodMentorUI | null;
    error: string | null;
  }> {
    try {
      console.log(`Looking up mood mentor by slug: ${nameSlug}`);
      
      // First try exact match on name_slug
      let { data, error } = await supabase
        .from('mood_mentor_profiles')
        .select('*')
        .eq('name_slug', nameSlug)
        .eq('is_active', true)
        .single();
        
      if (error) {
        console.log(`No exact slug match found, trying 'like' search`);
        // If not found by exact match, try a LIKE query for similar slugs
        const { data: similarData, error: similarError } = await supabase
          .from('mood_mentor_profiles')
          .select('*')
          .like('name_slug', `%${nameSlug}%`)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (similarError) {
          console.log(`No similar slugs found, trying to find by any active mentor`);
          // If no similar slugs found, try to get any active mentor
          const { data: anyMentor, error: anyMentorError } = await supabase
            .from('mood_mentor_profiles')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
          if (anyMentorError) {
            console.log(`No active mentors found. Error:`, anyMentorError);
            throw error;
          }
          
          data = anyMentor;
        } else {
          data = similarData;
        }
      }
      
      // Ensure we have actual data at this point
      if (!data) {
        throw new Error('No mood mentor profile found');
      }
      
      // Attempt to get the auth user data to add any missing info
      try {
        // Try to get user metadata to enhance the profile
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (!authError && authData && authData.user && authData.user.id === data.user_id) {
          // Use the current user's metadata if this profile belongs to the current user
          data = {
            ...data,
            avatar_url: data.avatar_url || authData.user.user_metadata?.avatar_url,
            full_name: data.full_name || authData.user.user_metadata?.full_name || authData.user.user_metadata?.name
          };
        }
      } catch (metadataError) {
        console.warn('Could not fetch user metadata, continuing with profile data only:', metadataError);
      }
      
      // Ensure we have a value in all required fields, add defaults if needed
      const enhancedData = {
        ...data,
        full_name: data.full_name || 'Mood Mentor',
        specialty: data.specialty || 'Mental Health Support',
        bio: data.bio || 'Professional mental health support provider.',
        avatar_url: data.avatar_url || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2',
        languages: data.languages || ['English'],
        education: data.education || [],
        experience: data.experience || [],
        therapy_types: data.therapy_types || ['Counseling'],
        specialties: data.specialties || ['Mental Health'],
        location: data.location || 'Available Online',
        is_active: true,
        rating: data.rating || 5.0,
        is_profile_complete: true
      };
      
      // Convert the snake_case data to camelCase for the UI
      const convertedData = convertObjectToCamelCase(enhancedData) as MoodMentorUI;
      
      console.log("Successfully fetched mood mentor profile for slug:", nameSlug);
      
      return {
        success: true,
        data: convertedData,
        error: null
      };
    } catch (error) {
      console.error('Error in getMoodMentorBySlug:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }
}

// Export a singleton instance
export const moodMentorService = new MoodMentorService(); 