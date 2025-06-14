import { ServiceResponse } from '../index';
import { getEnvVar } from '@/lib/utils';

// Daily.co room configuration interface
export interface DailyRoomConfig {
  name?: string;
  privacy?: 'public' | 'private';
  expiry?: number;
  properties?: {
    start_audio_off?: boolean;
    start_video_off?: boolean;
    enable_chat?: boolean;
  enable_screenshare?: boolean;
    [key: string]: any;
  };
}

// Daily.co room response interface
export interface DailyRoomResponse {
  id: string;
  name: string;
  api_created: boolean;
  privacy: 'public' | 'private';
  url: string;
  created_at: string;
}

// Get Daily.co API configuration from environment variables
const API_KEY = getEnvVar('VITE_DAILY_API_KEY', '');
const DOMAIN = getEnvVar('VITE_DAILY_DOMAIN', 'emotionsapp.daily.co');
const API_BASE_URL = 'https://api.daily.co/v1';

// Validate API key is available
if (!API_KEY) {
  console.error('Warning: Daily.co API key is missing. Video calls will not work correctly.');
}

/**
 * Simple service for interacting with the Daily.co API
 */
class DailyService {
  /**
   * Create a new Daily.co room
   */
  async createRoom(config: DailyRoomConfig = {}): Promise<ServiceResponse<DailyRoomResponse>> {
    try {
      console.log('Creating Daily.co room with config:', JSON.stringify(config));
      
      // Check if API key is available
      if (!API_KEY) {
        return { error: 'Daily.co API key is not configured. Please check your environment variables.' };
      }
      
      // Set default room name if not provided
      const roomName = config.name || `room-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      // Set default configuration
      const roomConfig = {
        name: roomName,
        privacy: config.privacy || 'public',
        properties: {
          exp: Math.floor(Date.now() / 1000) + (config.expiry || 24 * 60 * 60), // Default 24 hours
          enable_chat: true,
        enable_screenshare: true,
          ...(config.properties || {})
        }
      };
      
      // Make API request to create room
      const response = await fetch(`${API_BASE_URL}/rooms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
          },
          body: JSON.stringify(roomConfig)
        });

      // Log response status for debugging
      console.log(`Daily.co create room response status: ${response.status}`);
      
      // Handle non-OK response
        if (!response.ok) {
          const errorText = await response.text();
        console.error('Daily.co API error:', errorText);
        
        // Return appropriate error message
          if (response.status === 401 || response.status === 403) {
            return { error: 'authentication-error' };
          }
          
        return { error: `API error (${response.status}): ${errorText}` };
      }
      
      // Parse successful response
      const roomData = await response.json();
      console.log('Room created successfully:', roomData.url);
      
      return { data: roomData };
    } catch (error: any) {
      console.error('Error creating Daily.co room:', error);
      return { error: error.message || 'Unknown error creating room' };
    }
  }

  /**
   * Get details about an existing room
   */
  async getRoomDetails(roomName: string): Promise<ServiceResponse<DailyRoomResponse>> {
    try {
      console.log(`Getting details for room: ${roomName}`);
      
      const response = await fetch(`${API_BASE_URL}/rooms/${roomName}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`
        }
      });
      
      console.log(`Daily.co get room details response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Daily.co API error:', errorText);
        
        if (response.status === 404) {
          return { error: 'room-not-found' };
        }
        
        if (response.status === 401 || response.status === 403) {
          return { error: 'authentication-error' };
        }
        
        return { error: `API error (${response.status}): ${errorText}` };
      }
      
      const roomData = await response.json();
      return { data: roomData };
    } catch (error: any) {
      console.error('Error getting Daily.co room details:', error);
      return { error: error.message || 'Unknown error getting room details' };
    }
  }

  /**
   * Delete a room
   */
  async deleteRoom(roomName: string): Promise<ServiceResponse<boolean>> {
    try {
      console.log(`Deleting room: ${roomName}`);

      const response = await fetch(`${API_BASE_URL}/rooms/${roomName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${API_KEY}`
        }
      });
      
      console.log(`Daily.co delete room response status: ${response.status}`);
      
      // 404 is acceptable - room might not exist
      if (response.status === 404) {
        return { data: true };
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Daily.co API error:', errorText);
        
        if (response.status === 401 || response.status === 403) {
          return { error: 'authentication-error' };
        }
        
        return { error: `API error (${response.status}): ${errorText}` };
      }

      return { data: true };
    } catch (error: any) {
      console.error('Error deleting Daily.co room:', error);
      return { error: error.message || 'Unknown error deleting room' };
    }
  }

  /**
   * Test connection to Daily.co API
   */
  async testConnection(): Promise<ServiceResponse<boolean>> {
    try {
      console.log('Testing Daily.co API connection...');

      const response = await fetch(`${API_BASE_URL}/rooms`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`
        }
      });
      
      console.log(`Daily.co API test response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Daily.co API test failed:', errorText);
        return { error: `API connection failed (${response.status}): ${errorText}` };
      }
      
      const data = await response.json();
      console.log('Daily.co API connection successful. Found', data.totalCount, 'rooms');
      return { data: true };
    } catch (error: any) {
      console.error('Error testing Daily.co API connection:', error);
      return { error: error.message || 'Network error' };
    }
  }
  
  /**
   * Create a room specifically for an appointment
   */
  async createAppointmentRoom(appointmentId: string, isAudioOnly: boolean = false): Promise<ServiceResponse<string>> {
    try {
      console.log(`Creating appointment room for appointment: ${appointmentId}`);
      
      if (!appointmentId) {
        return { error: 'Missing appointment ID' };
      }
      
      // Create a simplified room name
      const roomName = `appointment-${appointmentId.replace(/[^a-zA-Z0-9]/g, '')}`;
      
      // First check if room already exists
      const { data: existingRoom, error: checkError } = await this.getRoomDetails(roomName);
      
      if (existingRoom) {
        console.log('Room already exists:', existingRoom.url);
        return { data: existingRoom.url };
      }
      
      // Create a new room
      const { data: roomData, error: createError } = await this.createRoom({
        name: roomName,
        properties: {
          start_audio_off: isAudioOnly,
          start_video_off: isAudioOnly,
          enable_chat: true,
          enable_screenshare: true
        }
      });
      
      if (createError) {
        return { error: createError };
      }
      
      if (!roomData || !roomData.url) {
        return { error: 'No room URL returned from API' };
      }
      
      return { data: roomData.url };
    } catch (error: any) {
      console.error('Error creating appointment room:', error);
      return { error: error.message || 'Unknown error creating appointment room' };
    }
  }

  /**
   * Get the full URL for a Daily.co room
   */
  getRoomUrl(roomName: string): string {
    return `https://${DOMAIN}/${roomName}`;
  }
}

export const dailyService = new DailyService(); 