/**
 * Dashboard Types
 * Shared types for dashboard components
 */

export interface Notification {
  id: string;
  title: string;
  content: string;
  created_at: string;
  read: boolean;
  type: NotificationType;
  user_id?: string;
}

export type NotificationType = 'welcome' | 'update' | 'reminder' | 'appointment' | 'message' | 'review' | 'other';

export interface DbNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  user_id: string;
}

export interface SearchResult {
  title: string;
  description?: string;
  icon?: any;
  href: string;
  category: string;
}

export interface NavigationItem {
  name: string; 
  href: string;
  icon: any;
}

export interface NavigationSection {
  section: string;
  items: NavigationItem[];
} 