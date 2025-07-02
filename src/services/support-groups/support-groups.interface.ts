import { ServiceResponse } from '../index';

export interface SupportGroup {
  id: string;
  name: string;
  description: string;
  group_type: 'anxiety' | 'depression' | 'grief' | 'addiction' | 'trauma' | 'youth' | 'stress';
  meeting_type: 'online' | 'in-person' | 'hybrid';
  meeting_schedule: MeetingSchedule[];
  max_participants: number;
  current_participants: number;
  mentor_id: string;
  status: 'active' | 'inactive' | 'archived';
  location?: string;
  meeting_link?: string;
  is_public: boolean;
  group_rules?: string;
  created_at: string;
  updated_at: string;
  // Mentor information (populated from join)
  mentor_name?: string;
  mentor_specialty?: string;
  mentor_bio?: string;
}

export interface MeetingSchedule {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  time: string; // HH:MM format
  frequency: 'weekly' | 'bi-weekly' | 'monthly';
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  status: 'active' | 'inactive' | 'pending' | 'removed';
  joined_at: string;
  last_activity?: string;
  notes?: string;
}

export interface GroupSession {
  id: string;
  group_id: string;
  title?: string;
  description?: string;
  session_date: string;
  start_time: string;
  end_time?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  session_type?: string;
  meeting_link?: string;
  session_notes?: string;
  notes?: string;
  recording_url?: string;
  resources?: any[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SessionAttendance {
  id: string;
  session_id: string;
  user_id: string;
  group_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  joined_at?: string;
  left_at?: string;
  duration_minutes: number;
  notes?: string;
  marked_by?: string;
  created_at: string;
}

export interface GroupWaitingList {
  id: string;
  group_id: string;
  user_id: string;
  personal_message?: string;
  status: 'waiting' | 'approved' | 'rejected' | 'expired';
  priority_score: number;
  applied_at: string;
  processed_at?: string;
  processed_by?: string;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'check_in' | 'announcement' | 'resource';
  is_anonymous: boolean;
  is_pinned: boolean;
  reply_to_id?: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface GroupResource {
  id: string;
  group_id: string;
  title: string;
  description?: string;
  resource_type: 'document' | 'video' | 'audio' | 'link' | 'worksheet' | 'assignment';
  file_url?: string;
  external_url?: string;
  uploaded_by: string;
  is_required: boolean;
  display_order: number;
  created_at: string;
}

export interface GroupAnalytics {
  totalMembers: number;
  activeMembers: number;
  totalSessions: number;
  averageAttendance: number;
  attendanceRate: number;
  memberEngagement: number;
  recentActivity: {
    newMembers: number;
    upcomingSessions: number;
    recentMessages: number;
  };
}

export interface MemberWithProfile {
  id: string;
  group_id: string;
  user_id: string;
  status: string;
  joined_at: string;
  last_activity?: string;
  notes?: string;
  attendance_rate: number;
  user_profile: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface SessionWithAttendance {
  id: string;
  title: string;
  session_date: string;
  start_time: string;
  end_time: string;
  status: string;
  attendance_count: number;
  total_members: number;
  attendance_rate: number;
}

export interface ISupportGroupsService {
  // Support Groups CRUD
  getSupportGroups(filters?: {
    group_type?: string;
    meeting_type?: string;
    status?: string;
    mentor_id?: string;
    is_public?: boolean;
  }): Promise<SupportGroup[]>;
  
  getSupportGroupById(id: string): Promise<SupportGroup | null>;
  
  createSupportGroup(data: Omit<SupportGroup, 'id' | 'created_at' | 'updated_at' | 'current_participants'>): Promise<SupportGroup>;
  
  updateSupportGroup(id: string, data: Partial<SupportGroup>): Promise<SupportGroup>;
  
  deleteSupportGroup(id: string): Promise<boolean>;
  
  // Group Membership
  getGroupMembers(groupId: string): Promise<MemberWithProfile[]>;
  
  addMemberToGroup(groupId: string, userId: string, notes?: string): Promise<GroupMember>;
  
  removeMemberFromGroup(groupId: string, userId: string): Promise<boolean>;
  
  updateMemberStatus(groupId: string, userId: string, status: string): Promise<GroupMember>;
  
  // Sessions Management
  getGroupSessions(groupId: string): Promise<SessionWithAttendance[]>;
  
  getSessionById(sessionId: string): Promise<ServiceResponse<GroupSession>>;
  
  createGroupSession(data: Omit<GroupSession, 'id' | 'created_at' | 'updated_at'>): Promise<GroupSession>;
  
  updateGroupSession(sessionId: string, data: Partial<GroupSession>): Promise<GroupSession>;
  
  markAttendance(sessionId: string, userId: string, status: 'present' | 'absent' | 'late' | 'excused'): Promise<SessionAttendance>;
  
  getSessionAttendance(sessionId: string): Promise<SessionAttendance[]>;
  
  // Waiting List
  addToWaitingList(groupId: string, userId: string, personalMessage?: string): Promise<GroupWaitingList>;
  
  getWaitingList(groupId: string): Promise<GroupWaitingList[]>;
  
  processWaitingListApplication(applicationId: string, status: 'approved' | 'rejected'): Promise<GroupWaitingList>;
  
  // Analytics
  getGroupAnalytics(groupId: string): Promise<GroupAnalytics>;
  
  getMemberAnalytics(groupId: string, userId: string): Promise<{
    attendance_rate: number;
    sessions_attended: number;
    total_sessions: number;
    last_attendance: string | null;
    engagement_score: number;
  }>;
  
  // User specific
  getUserGroups(userId: string): Promise<SupportGroup[]>;
  
  canUserJoinGroup(groupId: string, userId: string): Promise<{
    canJoin: boolean;
    reason?: string;
  }>;

  // Session Management (new methods)
  resetAllSessionData(): Promise<{ success: boolean; message: string; details?: any }>;
  
  createScheduledSession(groupId: string, scheduledDate: string, scheduledTime: string): Promise<ServiceResponse<GroupSession>>;
  
  getTodaysScheduledSessions(groupId: string): Promise<ServiceResponse<SessionWithAttendance[]>>;
  
  canUserJoinSession(sessionId: string, userId: string): Promise<ServiceResponse<{
    canJoin: boolean;
    meetingUrl?: string;
    reason?: string;
  }>>;
  
  trackSessionJoin(sessionId: string, userId: string): Promise<ServiceResponse<boolean>>;
  
  notifyGroupMembersSessionStarted(groupId: string, sessionId: string, meetingUrl: string): Promise<void>;

  // Member count sync
  syncGroupMemberCounts(): Promise<{ updated: number; errors: string[] }>;
} 