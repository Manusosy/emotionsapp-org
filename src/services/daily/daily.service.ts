import { ServiceResponse } from '../index';
import { getEnvVar } from '@/lib/utils';

/**
 * Room configuration options for Daily.co
 */
export interface DailyRoomConfig {
  /** Name of the room */
  name?: string;
  /** Whether the room is private (requires token to join) */
  privacy?: 'public' | 'private';
  /** Duration in seconds until the room expires */
  expiry?: number;
  /** Maximum number of participants allowed */
  max_participants?: number;
  /** Whether to enable or disable camera at start */
  enable_camera?: boolean;
  /** Whether to enable or disable microphone at start */
  enable_mic?: boolean;
  /** Whether to enable screen sharing */
  enable_screenshare?: boolean;
  /** Whether to enable chat */
  enable_chat?: boolean;
  /** Whether to enable emoji reactions */
  enable_emoji_reactions?: boolean;
  /** Whether to enable hand raising */
  enable_hand_raising?: boolean;
  /** Whether to enable background blur */
  enable_background_blur?: boolean;
  /** Whether to enable recording */
  enable_recording?: boolean;
}

/**
 * Response from creating a Daily.co room
 */
interface DailyRoomResponse {
  id: string;
  name: string;
  api_created: boolean;
  privacy: 'public' | 'private';
  url: string;
  created_at: string;
  config: {
    enable_chat: boolean;
    enable_screenshare: boolean;
    enable_emoji_reactions: boolean;
    enable_hand_raising: boolean;
    enable_recording: boolean;
    [key: string]: any;
  };
}

// Standard fallback API key - should match the one in vite.config.ts and env-config.js
const FALLBACK_API_KEY = '87f0c35f773411583c35bf5c5d79488504f3d872542fdf8cc8a5f9e1e1f60ef8';
const FALLBACK_DOMAIN = 'emotionsapp.daily.co';

/**
 * Service for interacting with the Daily.co API
 */
class DailyService {
  private apiKey: string = '';
  private dailyDomain: string = '';
  private baseUrl: string = 'https://api.daily.co/v1';
  private isInitialized: boolean = false;

  constructor() {
    this.initializeService();
  }
  
  /**
   * Initialize the service with environment variables or fallbacks
   */
  private initializeService() {
    try {
      // Get API key with consistent fallback pattern
      this.apiKey = getEnvVar('VITE_DAILY_API_KEY', FALLBACK_API_KEY);
      this.dailyDomain = getEnvVar('VITE_DAILY_DOMAIN', FALLBACK_DOMAIN);
      
      // Trim values to remove any whitespace
      this.apiKey = this.apiKey.trim();
      this.dailyDomain = this.dailyDomain.trim();
      
      // Validate API key format
      if (!this.apiKey || this.apiKey.length < 40) {
        console.error('Daily.co API key is invalid or too short. Video calls will not work.');
      } else {
        this.isInitialized = true;
      }
      
      console.log('Daily.co service initialized:');
      console.log('- API Key (masked):', this.apiKey ? `${this.apiKey.substring(0, 5)}...${this.apiKey.substring(this.apiKey.length - 5)}` : 'undefined');
      console.log('- API Key length:', this.apiKey ? this.apiKey.length : 0);
      console.log('- Domain:', this.dailyDomain);
      console.log('- Initialization status:', this.isInitialized ? 'SUCCESS' : 'FAILED');
    } catch (error) {
      console.error('Error initializing Daily service:', error);
      this.apiKey = FALLBACK_API_KEY;
      this.dailyDomain = FALLBACK_DOMAIN;
    }
  }

  /**
   * Create a new Daily.co room
   * @param config Room configuration options
   * @returns ServiceResponse with room data or error
   */
  async createRoom(config: DailyRoomConfig = {}): Promise<ServiceResponse<DailyRoomResponse>> {
    try {
      // Check if service is initialized
      if (!this.isInitialized) {
        console.error('Daily.co service not properly initialized');
        return { error: 'Video call service not properly initialized' };
      }
      
      // Set default expiry to 24 hours if not specified
      const expiry = config.expiry || 24 * 60 * 60; // 24 hours in seconds
      
      // Generate a unique name if not provided
      const name = config.name || `room-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      // Default configuration
      const defaultConfig: DailyRoomConfig = {
        privacy: 'public',
        max_participants: 10,
        enable_camera: true,
        enable_mic: true,
        enable_screenshare: true,
        enable_chat: true,
        enable_emoji_reactions: true,
        enable_hand_raising: true,
        enable_background_blur: false,
        enable_recording: false,
      };

      // Merge default config with provided config
      const roomConfig = { ...defaultConfig, ...config, name, expiry };

      console.log(`Creating Daily.co room: ${name}`);
      
      try {
        const response = await fetch(`${this.baseUrl}/rooms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify(roomConfig)
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            errorData = { error: errorText };
          }
          
          console.error('Error creating Daily.co room:', {
            status: response.status,
            statusText: response.statusText,
            errorData
          });
          
          // Special handling for authentication errors
          if (response.status === 401 || response.status === 403) {
            return { error: 'authentication-error' };
          }
          
          return { 
            error: `Failed to create room: ${errorData.error || response.statusText || 'API Error'}` 
          };
        }

        const data: DailyRoomResponse = await response.json();
        console.log('Daily.co room created successfully:', data.name);
        return { data };
      } catch (fetchError: any) {
        console.error('Fetch error when calling Daily.co API:', fetchError);
        return { error: `Network error: ${fetchError.message}` };
      }
    } catch (error: any) {
      console.error('Error in createRoom:', error);
      return { error: error.message || 'Unknown error creating Daily.co room' };
    }
  }

  /**
   * Create a room specifically for an appointment
   * @param appointmentId ID of the appointment
   * @param isAudioOnly Whether this is an audio-only call
   * @returns ServiceResponse with room URL or error
   */
  async createAppointmentRoom(appointmentId: string, isAudioOnly: boolean = false): Promise<ServiceResponse<string>> {
    try {
      // Check if service is initialized
      if (!this.isInitialized) {
        console.error('Daily.co service not properly initialized');
        return { error: 'Video call service not properly initialized' };
      }
      
      // Validate parameters
      if (!appointmentId) {
        console.error('Missing appointment ID for Daily.co room creation');
        return { error: 'Missing appointment ID' };
      }
      
      // Create a simplified room name without any special characters
      const roomName = `appointment${appointmentId.replace(/[^a-zA-Z0-9]/g, '')}`;
      
      console.log(`Creating appointment room: ${roomName}`);
      
      // First, check if the room already exists
      try {
        const checkResponse = await fetch(`${this.baseUrl}/rooms/${roomName}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        });
        
        // If room exists, return its URL
        if (checkResponse.ok) {
          const roomData = await checkResponse.json();
          console.log('Room already exists:', roomData.name);
          return { data: roomData.url };
        }
        
        // If we get an authentication error, report it clearly
        if (checkResponse.status === 401 || checkResponse.status === 403) {
          console.error('Daily.co API authentication error. Check API key validity.');
          return { error: 'authentication-error' };
        }
        
        // If 404, room doesn't exist, continue to create it
      } catch (checkError) {
        console.warn('Error checking if room exists:', checkError);
        // Continue to create room
      }
      
      // Create a simple room with minimal configuration
      try {
        const roomConfig = {
          name: roomName,
          privacy: 'public',
          properties: {
            start_audio_off: isAudioOnly,
            start_video_off: isAudioOnly,
            enable_chat: true,
            enable_screenshare: true
          }
        };
        
        const response = await fetch(`${this.baseUrl}/rooms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify(roomConfig)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response from Daily.co API:', errorText);
          
          if (response.status === 401 || response.status === 403) {
            return { error: 'authentication-error' };
          }
          
          return { error: `Failed to create room: API error (${response.status})` };
        }
        
        const data = await response.json();
        console.log('Room created successfully:', data.name);
        
        if (!data.url) {
          return { error: 'No room URL returned from API' };
        }
        
        return { data: data.url };
      } catch (createError: any) {
        console.error('Error creating room:', createError);
        return { error: `Failed to create room: ${createError.message}` };
      }
    } catch (error: any) {
      console.error('Error in createAppointmentRoom:', error);
      return { error: error.message || 'Unknown error creating appointment room' };
    }
  }

  /**
   * Delete a Daily.co room
   * @param roomName Name of the room to delete
   * @returns ServiceResponse with success or error
   */
  async deleteRoom(roomName: string): Promise<ServiceResponse<boolean>> {
    try {
      if (!this.isInitialized || !this.apiKey) {
        return { error: 'Daily.co API key is not configured' };
      }

      const response = await fetch(`${this.baseUrl}/rooms/${roomName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        // 404 is acceptable - room might already be deleted or expired
        if (response.status === 404) {
          return { data: true };
        }
        
        const errorData = await response.json();
        console.error('Error deleting Daily.co room:', errorData);
        return { 
          error: `Failed to delete room: ${errorData.error || response.statusText}` 
        };
      }

      return { data: true };
    } catch (error: any) {
      console.error('Error in deleteRoom:', error);
      return { error: error.message || 'Unknown error deleting Daily.co room' };
    }
  }

  /**
   * Get information about a Daily.co room
   * @param roomName Name of the room
   * @returns ServiceResponse with room data or error
   */
  async getRoomDetails(roomName: string): Promise<ServiceResponse<DailyRoomResponse>> {
    try {
      if (!this.isInitialized || !this.apiKey) {
        return { error: 'Daily.co API key is not configured' };
      }

      const response = await fetch(`${this.baseUrl}/rooms/${roomName}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error getting Daily.co room details:', errorData);
        return { 
          error: `Failed to get room details: ${errorData.error || response.statusText}` 
        };
      }

      const data: DailyRoomResponse = await response.json();
      return { data };
    } catch (error: any) {
      console.error('Error in getRoomDetails:', error);
      return { error: error.message || 'Unknown error getting room details' };
    }
  }

  /**
   * Get the full URL for a Daily.co room
   * @param roomName Name of the room
   * @returns Full URL to the room
   */
  getRoomUrl(roomName: string): string {
    return `https://${this.dailyDomain}/${roomName}`;
  }
}

export const dailyService = new DailyService(); 