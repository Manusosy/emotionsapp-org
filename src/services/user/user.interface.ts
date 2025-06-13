/**
 * User Service Interface
 * Defines the contract for user-related operations
 */

import { User } from '../auth/auth.interface';

export interface UserProfile extends User {
  bio?: string;
  location?: string;
  preferences?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface IUserService {
  /**
   * Get user profile by ID
   */
  getUserProfile(userId: string): Promise<UserProfile | null>;
  
  /**
   * Update user profile
   */
  updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile | null>;
  
  /**
   * Get multiple user profiles
   */
  getUserProfiles(userIds: string[]): Promise<UserProfile[]>;
  
  /**
   * Search for users
   */
  searchUsers(query: string, options?: { limit?: number, role?: string }): Promise<UserProfile[]>;
  
  /**
   * Update user avatar
   */
  updateAvatar(userId: string, avatarUrl: string): Promise<{ success: boolean, error: string | null }>;
  
  /**
   * Delete user
   */
  deleteUser(userId: string): Promise<{ success: boolean, error: string | null }>;
  
  /**
   * Update user metadata
   */
  updateUserMetadata(data: { avatar_url?: string, full_name?: string, [key: string]: any }): Promise<{ success: boolean, error: string | null }>;

  /**
   * Get user preferences
   */
  getUserPreferences(userId: string): Promise<Record<string, any>>;

  /**
   * Update user preferences
   */
  updateUserPreferences(userId: string, preferences: Record<string, any>): Promise<{ success: boolean, error: string | null }>;
} 