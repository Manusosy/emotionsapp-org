import { supabase } from '@/lib/supabase';
import { Resource } from '@/types/database.types';

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
        .select('*');

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

      // Always order by created_at desc
      query = query.order('created_at', { ascending: false });

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

  async uploadFile(file: File, userId: string, type: 'thumbnail' | 'resource'): Promise<{
    success: boolean;
    url: string | null;
    error: string | null;
  }> {
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${userId}/${type}s/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage
        .from('resources')
        .getPublicUrl(filePath);

      return {
        success: true,
        url: urlData?.publicUrl || null,
        error: null
      };
    } catch (error: any) {
      console.error(`Error uploading ${type}:`, error);
      return {
        success: false,
        url: null,
        error: error.message || `Failed to upload ${type}`
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
}

// Export a singleton instance
export const resourceService = new ResourceService(); 