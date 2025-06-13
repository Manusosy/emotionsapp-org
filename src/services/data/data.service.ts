import { supabase } from '@/lib/supabase';
import { EventBus } from '@/App';

/**
 * Data Service Interface
 */
export interface IDataService {
  getUserNotifications(userId: string): Promise<any>;
  markNotificationAsRead(id: string): Promise<any>;
  markAllNotificationsAsRead(userId: string): Promise<any>;
  markNotificationsAsRead(ids: string[]): Promise<any>;
  deleteNotification(id: string): Promise<any>;
  getNotifications(userId: string, userType: string): Promise<any>;
  saveStressAssessment(assessment: any): Promise<any>;
}

/**
 * Data Service Implementation
 */
export class DataService implements IDataService {
  /**
   * Get user notifications
   */
  async getUserNotifications(userId: string) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      return { data, error };
    } catch (error) {
      console.error('Error in getUserNotifications:', error);
      return { data: null, error };
    }
  }

  /**
   * Get notifications with user type filter
   */
  async getNotifications(userId: string, userType: string) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      return { data, error };
    } catch (error) {
      console.error('Error in getNotifications:', error);
      return { data: null, error };
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(id: string) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      
      return { data, error };
    } catch (error) {
      console.error('Error in markNotificationAsRead:', error);
      return { data: null, error };
    }
  }

  /**
   * Mark multiple notifications as read
   */
  async markNotificationsAsRead(ids: string[]) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', ids);
      
      return { data, error };
    } catch (error) {
      console.error('Error in markNotificationsAsRead:', error);
      return { data: null, error };
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllNotificationsAsRead(userId: string) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId);
      
      return { data, error };
    } catch (error) {
      console.error('Error in markAllNotificationsAsRead:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(id: string) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      
      return { data, error };
    } catch (error) {
      console.error('Error in deleteNotification:', error);
      return { data: null, error };
    }
  }

  /**
   * Save a stress assessment to the database
   * @param assessment The assessment data to save
   * @returns Response with data or error
   */
  async saveStressAssessment(assessment: any) {
    try {
      console.log('DataService: Saving stress assessment', assessment.id);
      
      // Generate a cache buster to ensure we get fresh data
      const cacheBuster = `_cb=${Date.now()}`;
      
      // First, check if this assessment already exists
      const { data: existingAssessment, error: checkError } = await supabase
        .from('stress_assessments')
        .select('id')
        .eq('id', assessment.id)
        .maybeSingle();
      
      if (checkError) {
        console.error('Error checking for existing assessment:', checkError);
      }
      
      let result;
      
      // If assessment exists, update it
      if (existingAssessment) {
        console.log('Updating existing assessment:', assessment.id);
        result = await supabase
          .from('stress_assessments')
          .update({
            user_id: assessment.userId,
            stress_score: assessment.normalizedScore,
            health_percentage: assessment.healthPercentage,
            status: assessment.status,
            responses: assessment.responses,
            updated_at: new Date().toISOString()
          })
          .eq('id', assessment.id);
      } 
      // Otherwise, insert a new assessment
      else {
        console.log('Creating new assessment:', assessment.id);
        result = await supabase
          .from('stress_assessments')
          .insert({
            id: assessment.id,
            user_id: assessment.userId,
            stress_score: assessment.normalizedScore,
            health_percentage: assessment.healthPercentage,
            status: assessment.status,
            responses: assessment.responses,
            created_at: assessment.createdAt || new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
      
      if (result.error) {
        console.error('Error saving stress assessment:', result.error);
        return { error: result.error };
      }
      
      // Update user metrics with the new stress level
      await this.updateUserMetrics(assessment.userId, assessment.normalizedScore / 10, assessment.createdAt);
      
      console.log('Stress assessment saved successfully:', assessment.id);
      
      // Notify that assessment was saved
      EventBus.forceRefresh('stress-assessment-saved', { 
        assessmentId: assessment.id,
        userId: assessment.userId
      });
      
      return { data: { success: true, id: assessment.id } };
    } catch (error: any) {
      console.error('Error in saveStressAssessment:', error);
      return { error: error.message || 'Failed to save stress assessment' };
    }
  }
  
  /**
   * Update user metrics with new stress assessment data
   * @param userId User ID
   * @param stressLevel Normalized stress level (0-1)
   * @param assessmentDate Date of assessment
   */
  private async updateUserMetrics(userId: string, stressLevel: number, assessmentDate?: string) {
    try {
      // Check if user metrics record exists
      const { data: existingMetrics, error: checkError } = await supabase
        .from('user_assessment_metrics')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (checkError && !checkError.message.includes('does not exist')) {
        console.error('Error checking user metrics:', checkError);
        return;
      }
      
      const now = new Date().toISOString();
      const assessmentTime = assessmentDate || now;
      
      // If metrics record exists, update it
      if (existingMetrics) {
        await supabase
          .from('user_assessment_metrics')
          .update({
            stress_level: stressLevel,
            last_assessment_at: assessmentTime,
            updated_at: now
          })
          .eq('user_id', userId);
      } 
      // Otherwise, create a new metrics record
      else {
        await supabase
          .from('user_assessment_metrics')
          .insert({
            user_id: userId,
            stress_level: stressLevel,
            consistency: 0,
            last_assessment_at: assessmentTime,
            updated_at: now
          });
      }
      
      console.log(`User metrics updated for ${userId} with stress level ${stressLevel}`);
    } catch (error) {
      console.error('Error updating user metrics:', error);
    }
  }
}

// Export a singleton instance
export const dataService = new DataService(); 