import { supabase } from '@/lib/supabase';
import { Resource } from '@/types/database.types';
import { notificationService } from '../notifications/notification.service';

export class ResourceService {
  async getResources(options?: {
    mentorId?: string;
    category?: string;
    type?: string;
    featured?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{
    success: boolean;
    data: Resource[];
    error: string | null;
  }> {
    try {
      let query = supabase
        .from('resources')
        .select('*')
        .eq('is_public', true)
        .eq('is_active', true);

      // Add filters if provided
      if (options?.mentorId) {
        query = query.eq('mood_mentor_id', options.mentorId);
      }
      if (options?.category && options.category !== 'all') {
        query = query.eq('category', options.category);
      }
      if (options?.type) {
        query = query.eq('type', options.type);
      }
      if (options?.featured !== undefined) {
        query = query.eq('featured', options.featured);
      }

      // Add pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      // Always order by featured first, then created_at desc
      query = query.order('featured', { ascending: false }).order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        error: null
      };
    } catch (error: any) {
      console.error('Error fetching resources:', error);
      return {
        success: false,
        data: [],
        error: error.message || 'Failed to fetch resources'
      };
    }
  }

  async getResourcesWithFavorites(userId: string): Promise<{
    success: boolean;
    data: any[];
    error: string | null;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_resources_with_favorite_status', {
        user_id_param: userId
      });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        error: null
      };
    } catch (error: any) {
      console.error('Error fetching resources with favorites:', error);
      return {
        success: false,
        data: [],
        error: error.message || 'Failed to fetch resources with favorites'
      };
    }
  }

  async addResource(resource: Omit<Resource, 'id' | 'created_at' | 'updated_at'>): Promise<{
    success: boolean;
    data: Resource | null;
    error: string | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('resources')
        .insert({
          ...resource,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Create notifications for featured resources
      if (data && resource.featured && resource.is_public) {
        try {
          await this.notifyUsersAboutNewResource(data as Resource);
        } catch (notifyError) {
          console.warn('Failed to notify users about new resource:', notifyError);
        }
      }

      return {
        success: true,
        data: data as Resource,
        error: null
      };
    } catch (error: any) {
      console.error('Error adding resource:', error);
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to add resource'
      };
    }
  }

  // Helper method to notify users about new featured resources
  private async notifyUsersAboutNewResource(resource: Resource): Promise<void> {
    try {
      // Get all active patients for featured resources
      const { data: patients } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('role', 'patient')
        .eq('is_active', true);

      if (!patients || patients.length === 0) {
        console.log('No active patients to notify about new resource');
        return;
      }

      // Get resource creator name for notification
      let creatorName = 'Emotions App';
      if (resource.mood_mentor_id) {
        const { data: mentorProfile } = await supabase
          .from('mood_mentor_profiles')
          .select('full_name')
          .eq('user_id', resource.mood_mentor_id)
          .single();
        
        if (mentorProfile?.full_name) {
          creatorName = mentorProfile.full_name;
        }
      }

      // Create notifications for all patients
      for (const patient of patients) {
        try {
          await notificationService.createNotification({
            userId: patient.user_id,
            title: 'New Resource Available',
            message: `${creatorName} has shared a new ${resource.category} resource: "${resource.title}"`,
            type: 'resource',
            actionUrl: `/patient-dashboard/resources`,
            metadata: {
              resourceId: resource.id,
              resourceTitle: resource.title,
              resourceCategory: resource.category,
              creatorName,
              action: 'new_resource'
            }
          });
        } catch (notifyError) {
          console.error(`Error creating resource notification for user ${patient.user_id}:`, notifyError);
        }
      }

      console.log(`Notified ${patients.length} patients about new resource: ${resource.title}`);
    } catch (error) {
      console.error('Error notifying users about new resource:', error);
    }
  }

  async uploadFile(
    file: File, 
    userId: string, 
    type: 'thumbnail' | 'resource',
    onProgress?: (progress: number) => void
  ): Promise<{
    success: boolean;
    url: string | null;
    error: string | null;
  }> {
    try {
      // Validate file size (50MB limit)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        return {
          success: false,
          url: null,
          error: 'File size must be less than 50MB'
        };
      }

      // Validate file type
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm',
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3',
        'text/plain', 'text/csv'
      ];

      if (!allowedTypes.includes(file.type)) {
        return {
          success: false,
          url: null,
          error: `File type ${file.type} is not supported. Allowed types: ${allowedTypes.join(', ')}`
        };
      }

      // Create file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${userId}/${type}s/${fileName}`;

      // Start upload with progress tracking
      if (onProgress) {
        onProgress(0);
        
        // Simulate realistic upload progress
        let progress = 0;
        const progressSimulation = setInterval(() => {
          progress += Math.random() * 20 + 5; // Increment by 5-25%
          if (progress >= 90) {
            clearInterval(progressSimulation);
            progress = 90; // Stop at 90% until upload completes
          }
          onProgress(Math.min(90, progress));
        }, 300);

        // Upload file to Supabase Storage
        const { data, error } = await supabase.storage
          .from('resources')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        clearInterval(progressSimulation);

        if (error) {
          console.error('Upload error:', error);
          return {
            success: false,
            url: null,
            error: error.message || 'Failed to upload file'
          };
        }

        // Complete the progress
        onProgress(100);
      } else {
        // Upload without progress tracking
        const { data, error } = await supabase.storage
          .from('resources')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error('Upload error:', error);
          return {
            success: false,
            url: null,
            error: error.message || 'Failed to upload file'
          };
        }
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('resources')
        .getPublicUrl(filePath);

      return {
        success: true,
        url: publicUrl,
        error: null
      };
    } catch (error: any) {
      console.error('Error uploading file:', error);
      return {
        success: false,
        url: null,
        error: error.message || 'Failed to upload file'
      };
    }
  }

  async deleteResource(resourceId: string): Promise<{
    success: boolean;
    error: string | null;
  }> {
    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', resourceId);

      if (error) throw error;

      return {
        success: true,
        error: null
      };
    } catch (error: any) {
      console.error('Error deleting resource:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete resource'
      };
    }
  }

  async updateResource(resourceId: string, updates: Partial<Resource>): Promise<{
    success: boolean;
    data: Resource | null;
    error: string | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('resources')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', resourceId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data as Resource,
        error: null
      };
    } catch (error: any) {
      console.error('Error updating resource:', error);
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to update resource'
      };
    }
  }

  async addFavorite(userId: string, resourceId: string): Promise<{
    success: boolean;
    error: string | null;
  }> {
    try {
      const { error } = await supabase
        .from('resource_favorites')
        .insert({ user_id: userId, resource_id: resourceId });

      if (error) throw error;

      return {
        success: true,
        error: null
      };
    } catch (error: any) {
      console.error('Error adding favorite:', error);
      return {
        success: false,
        error: error.message || 'Failed to add favorite'
      };
    }
  }

  async removeFavorite(userId: string, resourceId: string): Promise<{
    success: boolean;
    error: string | null;
  }> {
    try {
      const { error } = await supabase
        .from('resource_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('resource_id', resourceId);

      if (error) throw error;

      return {
        success: true,
        error: null
      };
    } catch (error: any) {
      console.error('Error removing favorite:', error);
      return {
        success: false,
        error: error.message || 'Failed to remove favorite'
      };
    }
  }

  async trackDownload(resourceId: string, userId?: string, ipAddress?: string, userAgent?: string): Promise<{
    success: boolean;
    error: string | null;
  }> {
    try {
      const { error } = await supabase.rpc('increment_resource_downloads', {
        resource_id_param: resourceId,
        user_id_param: userId || null,
        ip_address_param: ipAddress || null,
        user_agent_param: userAgent || null
      });

      if (error) throw error;

      return {
        success: true,
        error: null
      };
    } catch (error: any) {
      console.error('Error tracking download:', error);
      return {
        success: false,
        error: error.message || 'Failed to track download'
      };
    }
  }

  async trackShare(resourceId: string, shareType: string, userId?: string, ipAddress?: string): Promise<{
    success: boolean;
    error: string | null;
  }> {
    try {
      const { error } = await supabase.rpc('increment_resource_shares', {
        resource_id_param: resourceId,
        share_type_param: shareType,
        user_id_param: userId || null,
        ip_address_param: ipAddress || null
      });

      if (error) throw error;

      return {
        success: true,
        error: null
      };
    } catch (error: any) {
      console.error('Error tracking share:', error);
      return {
        success: false,
        error: error.message || 'Failed to track share'
      };
    }
  }

  async trackView(resourceId: string, userId?: string, ipAddress?: string, userAgent?: string, duration?: number): Promise<{
    success: boolean;
    error: string | null;
  }> {
    try {
      const { error } = await supabase.rpc('track_resource_view', {
        resource_id_param: resourceId,
        user_id_param: userId || null,
        ip_address_param: ipAddress || null,
        user_agent_param: userAgent || null,
        view_duration_param: duration || null
      });

      if (error) throw error;

      return {
        success: true,
        error: null
      };
    } catch (error: any) {
      console.error('Error tracking view:', error);
      return {
        success: false,
        error: error.message || 'Failed to track view'
      };
    }
  }

  async getResourceAnalytics(resourceId: string): Promise<{
    success: boolean;
    data: {
      downloads: number;
      shares: number;
      views: number;
      favorites: number;
    } | null;
    error: string | null;
  }> {
    try {
      const [downloadsRes, sharesRes, viewsRes, favoritesRes] = await Promise.all([
        supabase.from('resource_downloads').select('id', { count: 'exact' }).eq('resource_id', resourceId),
        supabase.from('resource_shares').select('id', { count: 'exact' }).eq('resource_id', resourceId),
        supabase.from('resource_views').select('id', { count: 'exact' }).eq('resource_id', resourceId),
        supabase.from('resource_favorites').select('id', { count: 'exact' }).eq('resource_id', resourceId)
      ]);

      return {
        success: true,
        data: {
          downloads: downloadsRes.count || 0,
          shares: sharesRes.count || 0,
          views: viewsRes.count || 0,
          favorites: favoritesRes.count || 0
        },
        error: null
      };
    } catch (error: any) {
      console.error('Error getting resource analytics:', error);
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to get resource analytics'
      };
    }
  }
}

// Export a singleton instance
export const resourceService = new ResourceService(); 