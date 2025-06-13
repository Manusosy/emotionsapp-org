/**
 * User role types for the application
 */
export type UserRole = 'patient' | 'mood_mentor';

/**
 * User account status
 */
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

/**
 * Basic user profile information
 */
export interface UserProfile {
  id: string;
  email?: string;
  fullName?: string;
  role: UserRole;
  avatarUrl?: string;
  created_at?: string;
} 