import { IMoodAssessmentService } from './mood-assessment.interface';
import { MoodAssessment, MoodEntry, MoodType } from '@/types/mood';
import { supabase } from '@/lib/supabase';
import { notificationService } from '../notifications/notification.service';

export class MoodAssessmentService implements IMoodAssessmentService {
  async getMoodAssessments(userId: string): Promise<MoodAssessment[]> {
    try {
      const { data, error } = await supabase
        .from('mood_assessments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching mood assessments:', error);
        return [];
      }

      return data.map(assessment => ({
        id: assessment.id,
        userId: assessment.user_id,
        mood: assessment.mood,
        moodType: assessment.mood_type,
        score: assessment.score,
        timestamp: assessment.created_at,
        notes: assessment.notes || '',
        recommendations: assessment.recommendations || [],
        activities: assessment.activities || []
      }));
    } catch (error) {
      console.error('Error in getMoodAssessments:', error);
      return [];
    }
  }

  async getMoodAssessment(assessmentId: string): Promise<MoodAssessment | null> {
    try {
      const { data, error } = await supabase
        .from('mood_assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();

      if (error || !data) {
        console.error('Error fetching mood assessment:', error);
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        mood: data.mood,
        moodType: data.mood_type,
        score: data.score,
        timestamp: data.created_at,
        notes: data.notes || '',
        recommendations: data.recommendations || [],
        activities: data.activities || []
      };
    } catch (error) {
      console.error('Error in getMoodAssessment:', error);
      return null;
    }
  }

  async saveMoodAssessment(assessment: Omit<MoodAssessment, 'id' | 'timestamp'>): Promise<MoodAssessment | null> {
    try {
      const { data, error } = await supabase
        .from('mood_assessments')
        .insert({
          user_id: assessment.userId,
          mood: assessment.mood,
          mood_type: assessment.moodType,
          score: assessment.score,
          notes: assessment.notes,
          recommendations: assessment.recommendations,
          activities: assessment.activities
        })
        .select()
        .single();

      if (error || !data) {
        console.error('Error saving mood assessment:', error);
        return null;
      }

      const savedAssessment = {
        id: data.id,
        userId: data.user_id,
        mood: data.mood,
        moodType: data.mood_type,
        score: data.score,
        timestamp: data.created_at,
        notes: data.notes || '',
        recommendations: data.recommendations || [],
        activities: data.activities || []
      };

      // Create notifications for concerning mood patterns
      try {
        await this.checkForMoodAlerts(savedAssessment);
      } catch (notifyError) {
        console.warn('Failed to check for mood alerts:', notifyError);
      }

      return savedAssessment;
    } catch (error) {
      console.error('Error in saveMoodAssessment:', error);
      return null;
    }
  }

  // Helper method to check for concerning mood patterns and notify mentors
  private async checkForMoodAlerts(assessment: MoodAssessment): Promise<void> {
    try {
      // Alert for very low mood scores
      const isLowMood = assessment.score <= 3;
      
      // Alert for negative mood types
      const isConcerningMood = assessment.moodType === 'negative';

      if (isLowMood || isConcerningMood) {
        // Find the patient's assigned mood mentors
        const { data: appointments } = await supabase
          .from('appointments')
          .select('mentor_id')
          .eq('patient_id', assessment.userId)
          .eq('status', 'confirmed')
          .order('date', { ascending: false })
          .limit(1);

        if (appointments && appointments.length > 0) {
          const mentorId = appointments[0].mentor_id;

          // Get patient name for notification
          const { data: patientProfile } = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('user_id', assessment.userId)
            .single();

          const patientName = patientProfile?.full_name || 'A patient';

          // Create notification for mood mentor
          await notificationService.createNotification({
            userId: mentorId,
            title: 'Patient Mood Alert',
            message: `${patientName} has logged a ${assessment.moodType} mood with score ${assessment.score}/10. Consider checking in with them.`,
            type: 'alert',
            actionUrl: `/mood-mentor-dashboard/patients`,
            metadata: {
              patientId: assessment.userId,
              patientName,
              moodScore: assessment.score,
              moodType: assessment.moodType,
              assessmentId: assessment.id,
              action: 'mood_alert'
            }
          });

          console.log(`Mood alert sent to mentor ${mentorId} for patient ${assessment.userId}`);
        }
      }

      // Check for positive mood milestone (encourage continued engagement)
      if (assessment.score >= 8 && assessment.moodType === 'positive') {
        // Get recent mood entries to check for improvement streak
        const recentEntries = await this.getMoodEntries(assessment.userId);
        const lastWeekEntries = recentEntries.slice(0, 7);
        const averageScore = lastWeekEntries.reduce((sum, entry) => sum + entry.score, 0) / lastWeekEntries.length;

        if (averageScore >= 7 && lastWeekEntries.length >= 5) {
          // Notify patient about their positive streak
          await notificationService.createNotification({
            userId: assessment.userId,
            title: 'Great Progress!',
            message: `You've maintained positive moods this week! Your average mood score is ${averageScore.toFixed(1)}/10. Keep up the excellent work!`,
            type: 'mood_tracking',
            actionUrl: `/patient-dashboard/mood-tracker`,
            metadata: {
              averageScore: averageScore,
              streakLength: lastWeekEntries.length,
              action: 'positive_streak'
            }
          });
        }
      }
    } catch (error) {
      console.error('Error checking for mood alerts:', error);
    }
  }

  async updateMoodAssessment(assessmentId: string, updates: Partial<MoodAssessment>): Promise<MoodAssessment | null> {
    try {
      const { data, error } = await supabase
        .from('mood_assessments')
        .update({
          mood: updates.mood,
          mood_type: updates.moodType,
          score: updates.score,
          notes: updates.notes,
          recommendations: updates.recommendations,
          activities: updates.activities,
          updated_at: new Date().toISOString()
        })
        .eq('id', assessmentId)
        .select()
        .single();

      if (error || !data) {
        console.error('Error updating mood assessment:', error);
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        mood: data.mood,
        moodType: data.mood_type,
        score: data.score,
        timestamp: data.created_at,
        notes: data.notes || '',
        recommendations: data.recommendations || [],
        activities: data.activities || []
      };
    } catch (error) {
      console.error('Error in updateMoodAssessment:', error);
      return null;
    }
  }

  async deleteMoodAssessment(assessmentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mood_assessments')
        .delete()
        .eq('id', assessmentId);

      if (error) {
        console.error('Error deleting mood assessment:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteMoodAssessment:', error);
      return false;
    }
  }

  async getMoodEntries(userId: string, startDate?: Date, endDate?: Date): Promise<MoodEntry[]> {
    try {
      let query = supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching mood entries:', error);
        return [];
      }

      return data.map(entry => ({
        id: entry.id,
        userId: entry.user_id,
        mood: entry.mood,
        moodType: entry.mood_type as MoodType,
        score: entry.score,
        timestamp: entry.created_at,
        notes: entry.notes || '',
        tags: entry.tags || [],
        activities: entry.activities || []
      }));
    } catch (error) {
      console.error('Error in getMoodEntries:', error);
      return [];
    }
  }

  async addMoodEntry(entry: Omit<MoodEntry, 'id' | 'timestamp'>): Promise<MoodEntry | null> {
    try {
      const { data, error } = await supabase
        .from('mood_entries')
        .insert({
          user_id: entry.userId,
          mood: entry.mood,
          mood_type: entry.moodType,
          score: entry.score,
          notes: entry.notes,
          tags: entry.tags,
          activities: entry.activities
        })
        .select()
        .single();

      if (error || !data) {
        console.error('Error adding mood entry:', error);
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        mood: data.mood,
        moodType: data.mood_type as MoodType,
        score: data.score,
        timestamp: data.created_at,
        notes: data.notes || '',
        tags: data.tags || [],
        activities: data.activities || []
      };
    } catch (error) {
      console.error('Error in addMoodEntry:', error);
      return null;
    }
  }

  async updateMoodEntry(entryId: string, updates: Partial<MoodEntry>): Promise<MoodEntry | null> {
    try {
      const { data, error } = await supabase
        .from('mood_entries')
        .update({
          mood: updates.mood,
          mood_type: updates.moodType,
          score: updates.score,
          notes: updates.notes,
          tags: updates.tags,
          activities: updates.activities,
          updated_at: new Date().toISOString()
        })
        .eq('id', entryId)
        .select()
        .single();

      if (error || !data) {
        console.error('Error updating mood entry:', error);
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        mood: data.mood,
        moodType: data.mood_type as MoodType,
        score: data.score,
        timestamp: data.created_at,
        notes: data.notes || '',
        tags: data.tags || [],
        activities: data.activities || []
      };
    } catch (error) {
      console.error('Error in updateMoodEntry:', error);
      return null;
    }
  }

  async deleteMoodEntry(entryId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mood_entries')
        .delete()
        .eq('id', entryId);

      if (error) {
        console.error('Error deleting mood entry:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteMoodEntry:', error);
      return false;
    }
  }
}

export const moodAssessmentService = new MoodAssessmentService(); 