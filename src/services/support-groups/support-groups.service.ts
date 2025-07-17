import { supabase } from '@/lib/supabase';
import { ServiceResponse } from '../index';
import { 
  ISupportGroupsService, 
  SupportGroup, 
  GroupMember, 
  GroupSession, 
  SessionAttendance, 
  GroupWaitingList,
  GroupAnalytics,
  MemberWithProfile,
  SessionWithAttendance
} from './support-groups.interface';
import { notificationService } from '../notifications/notification.service';

class SupportGroupsService implements ISupportGroupsService {
  
  async getSupportGroups(filters?: {
    group_type?: string;
    meeting_type?: string;
    status?: string;
    mentor_id?: string;
    is_public?: boolean;
  }): Promise<SupportGroup[]> {
    try {
      // If mentor_id is provided, check if their profile is complete first
      if (filters?.mentor_id) {
        const { data: mentorProfile, error: mentorError } = await supabase
          .from('mood_mentor_profiles')
          .select('is_profile_complete')
          .eq('user_id', filters.mentor_id)
          .single();

        if (mentorError) {
          console.error('Error checking mentor profile:', mentorError);
          return [];
        }

        // If profile is not complete, return empty array
        if (!mentorProfile?.is_profile_complete) {
          console.log('Mentor profile not complete, returning empty groups array');
          return [];
        }
      }

      let query = supabase
        .from('support_groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters) {
        if (filters.group_type) {
          query = query.eq('group_type', filters.group_type);
        }
        if (filters.meeting_type) {
          query = query.eq('meeting_type', filters.meeting_type);
        }
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.mentor_id) {
          query = query.eq('mentor_id', filters.mentor_id);
        }
        if (filters.is_public !== undefined) {
          query = query.eq('is_public', filters.is_public);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching support groups:', error);
        throw error;
      }

      // Fetch mentor information for each group
      const transformedData = await Promise.all(
        (data || []).map(async (group) => {
          try {
            const { data: mentorProfile, error: mentorError } = await supabase
              .from('mood_mentor_profiles')
              .select('full_name, specialty, bio')
              .eq('user_id', group.mentor_id)
              .single();

            if (mentorError) {
              console.warn('Could not fetch mentor profile for group:', group.id, mentorError);
              return {
                ...group,
                mentor_name: 'Unknown Mentor',
                mentor_specialty: '',
                mentor_bio: ''
              };
            }

            return {
              ...group,
              mentor_name: mentorProfile?.full_name || 'Unknown Mentor',
              mentor_specialty: mentorProfile?.specialty || '',
              mentor_bio: mentorProfile?.bio || ''
            };
          } catch (error) {
            console.warn('Error fetching mentor profile for group:', group.id, error);
            return {
              ...group,
              mentor_name: 'Unknown Mentor',
              mentor_specialty: '',
              mentor_bio: ''
            };
          }
        })
      );

      return transformedData;
    } catch (error) {
      console.error('Error in getSupportGroups:', error);
      throw error;
    }
  }

  async getSupportGroupById(id: string): Promise<SupportGroup | null> {
    try {
      const { data, error } = await supabase
        .from('support_groups')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching support group:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getSupportGroupById:', error);
      return null;
    }
  }

  async createSupportGroup(data: Omit<SupportGroup, 'id' | 'created_at' | 'updated_at' | 'current_participants'>): Promise<SupportGroup> {
    try {
      const { data: group, error } = await supabase
        .from('support_groups')
        .insert({
          ...data,
          current_participants: 0,
          status: data.status || 'active'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating support group:', error);
        throw error;
      }

      return group;
    } catch (error) {
      console.error('Error in createSupportGroup:', error);
      throw error;
    }
  }

  async updateSupportGroup(id: string, data: Partial<SupportGroup>): Promise<SupportGroup> {
    try {
      const { data: group, error } = await supabase
        .from('support_groups')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating support group:', error);
        throw error;
      }

      return group;
    } catch (error) {
      console.error('Error in updateSupportGroup:', error);
      throw error;
    }
  }

  async deleteSupportGroup(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('support_groups')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting support group:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteSupportGroup:', error);
      return false;
    }
  }

  async getGroupMembers(groupId: string): Promise<MemberWithProfile[]> {
    try {
      // First, get the group members
      const { data: members, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', 'active')
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Error fetching group members:', error);
        throw error;
      }

      // Get patient profiles for each member
      const membersWithProfiles = await Promise.all(
        (members || []).map(async (member) => {
          try {
            const { data: profile, error: profileError } = await supabase
              .from('patient_profiles')
              .select('id, full_name, email, avatar_url')
              .eq('user_id', member.user_id)
              .single();

            if (profileError) {
              console.warn('Could not fetch profile for member:', member.user_id, profileError);
              return {
                ...member,
                user_profile: {
                  id: member.user_id,
                  full_name: 'Unknown User',
                  email: '',
                  avatar_url: null
                }
              };
            }

            return {
              ...member,
              user_profile: profile
            };
          } catch (profileError) {
            console.warn('Error fetching profile for member:', member.user_id, profileError);
            return {
              ...member,
              user_profile: {
                id: member.user_id,
                full_name: 'Unknown User',
                email: '',
                avatar_url: null
              }
            };
          }
        })
      );

      // Calculate attendance rates and format member data
      const membersWithAttendance = await Promise.all(
        membersWithProfiles.map(async (member) => {
          try {
            const analytics = await this.getMemberAnalytics(groupId, member.user_id);
            return {
              ...member,
              attendance_rate: analytics.attendance_rate,
              user_profile: member.user_profile || {
                id: member.user_id,
                full_name: 'Unknown User',
                email: '',
                avatar_url: null
              }
            };
          } catch (analyticsError) {
            // If analytics fails, return member with default attendance rate
            console.warn('Failed to get analytics for member:', member.user_id, analyticsError);
            return {
              ...member,
              attendance_rate: 0,
              user_profile: member.user_profile || {
                id: member.user_id,
                full_name: 'Unknown User',
                email: '',
                avatar_url: null
              }
            };
          }
        })
      );

      return membersWithAttendance;
    } catch (error) {
      console.error('Error in getGroupMembers:', error);
      return [];
    }
  }

  async addMemberToGroup(groupId: string, userId: string, notes?: string): Promise<GroupMember> {
    try {
      // Check if group has space
      const group = await this.getSupportGroupById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      if (group.current_participants >= group.max_participants) {
        throw new Error('Group is full');
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (existingMember) {
        throw new Error('User is already a member of this group');
      }

      const { data: member, error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: userId,
          notes: notes || null,
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding member to group:', error);
        throw error;
      }

      // Update the current_participants count in the support_groups table
      const { error: updateError } = await supabase
        .from('support_groups')
        .update({
          current_participants: group.current_participants + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', groupId);

      if (updateError) {
        console.error('Error updating group participant count:', updateError);
        // Note: We don't throw here because the member was already added successfully
        // This is just a count update issue
      }

      // Create welcome notification for new member
      try {
        await notificationService.createNotification({
          userId: userId,
          title: 'Welcome to Support Group',
          message: `You've successfully joined "${group.name}". Your support journey begins now!`,
          type: 'group',
          actionUrl: `/patient-dashboard/groups`,
          metadata: {
            groupId: groupId,
            groupName: group.name,
            action: 'joined_group'
          }
        });

        // Notify group mentor about new member
        if (group.mentor_id) {
          await notificationService.createNotification({
            userId: group.mentor_id,
            title: 'New Group Member',
            message: `A new member has joined your "${group.name}" support group.`,
            type: 'group',
            actionUrl: `/mood-mentor-dashboard/groups`,
            metadata: {
              groupId: groupId,
              groupName: group.name,
              newMemberId: userId,
              action: 'new_member'
            }
          });
        }
      } catch (notifyError) {
        console.warn('Failed to create group join notifications:', notifyError);
      }

      return member;
    } catch (error) {
      console.error('Error in addMemberToGroup:', error);
      throw error;
    }
  }

  async removeMemberFromGroup(groupId: string, userId: string): Promise<boolean> {
    try {
      // Get current group info for participant count
      const group = await this.getSupportGroupById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      const { error } = await supabase
        .from('group_members')
        .update({
          status: 'removed',
          left_at: new Date().toISOString()
        })
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error removing member from group:', error);
        throw error;
      }

      // Update the current_participants count in the support_groups table
      const { error: updateError } = await supabase
        .from('support_groups')
        .update({
          current_participants: Math.max(0, group.current_participants - 1),
          updated_at: new Date().toISOString()
        })
        .eq('id', groupId);

      if (updateError) {
        console.error('Error updating group participant count:', updateError);
        // Note: We don't throw here because the member was already removed successfully
        // This is just a count update issue
      }

      return true;
    } catch (error) {
      console.error('Error in removeMemberFromGroup:', error);
      return false;
    }
  }

  async updateMemberStatus(groupId: string, userId: string, status: string): Promise<GroupMember> {
    try {
      const { data: member, error } = await supabase
        .from('group_members')
        .update({ status })
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating member status:', error);
        throw error;
      }

      return member;
    } catch (error) {
      console.error('Error in updateMemberStatus:', error);
      throw error;
    }
  }

  async getGroupSessions(groupId: string): Promise<SessionWithAttendance[]> {
    try {
      const { data: sessions, error } = await supabase
        .from('group_sessions')
        .select('*')
        .eq('group_id', groupId)
        .order('session_date', { ascending: false });

      if (error) {
        console.error('Error fetching group sessions:', error);
        throw error;
      }

      // Get attendance for each session
      const sessionsWithAttendance = await Promise.all(
        sessions.map(async (session) => {
          const attendance = await this.getSessionAttendance(session.id);
          return {
            ...session,
            attendance
          };
        })
      );

      return sessionsWithAttendance;
    } catch (error) {
      console.error('Error in getGroupSessions:', error);
      return [];
    }
  }

  async getSessionById(sessionId: string): Promise<ServiceResponse<GroupSession>> {
    try {
      const { data: session, error } = await supabase
        .from('group_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        console.error('Error fetching session by ID:', error);
        return { error: 'Session not found' };
      }

      return { data: session };
    } catch (error) {
      console.error('Error in getSessionById:', error);
      return { error: 'Failed to fetch session' };
    }
  }

  async createGroupSession(data: Omit<GroupSession, 'id' | 'created_at' | 'updated_at'>): Promise<GroupSession> {
    try {
      const { data: session, error } = await supabase
        .from('group_sessions')
        .insert(data)
        .select()
        .single();

      if (error) {
        console.error('Error creating group session:', error);
        throw error;
      }

      return session;
    } catch (error) {
      console.error('Error in createGroupSession:', error);
      throw error;
    }
  }

  async updateGroupSession(sessionId: string, data: Partial<GroupSession>): Promise<GroupSession> {
    try {
      const { data: session, error } = await supabase
        .from('group_sessions')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        console.error('Error updating group session:', error);
        throw error;
      }

      return session;
    } catch (error) {
      console.error('Error in updateGroupSession:', error);
      throw error;
    }
  }

  async markAttendance(sessionId: string, userId: string, status: 'present' | 'absent' | 'late' | 'excused'): Promise<SessionAttendance> {
    try {
      // Get session info for group_id
      const { data: session } = await supabase
        .from('group_sessions')
        .select('group_id')
        .eq('id', sessionId)
        .single();

      if (!session) {
        throw new Error('Session not found');
      }

      const { data: attendance, error } = await supabase
        .from('session_attendance')
        .upsert({
          session_id: sessionId,
          user_id: userId,
          group_id: session.group_id,
          status,
          joined_at: status === 'present' ? new Date().toISOString() : null,
          duration_minutes: status === 'present' ? 60 : 0
        })
        .select()
        .single();

      if (error) {
        console.error('Error marking attendance:', error);
        throw error;
      }

      return attendance;
    } catch (error) {
      console.error('Error in markAttendance:', error);
      throw error;
    }
  }

  async getSessionAttendance(sessionId: string): Promise<SessionAttendance[]> {
    try {
      const { data, error } = await supabase
        .from('session_attendance')
        .select('*')
        .eq('session_id', sessionId);

      if (error) {
        console.error('Error fetching session attendance:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getSessionAttendance:', error);
      return [];
    }
  }

  async addToWaitingList(groupId: string, userId: string, personalMessage?: string): Promise<GroupWaitingList> {
    try {
      const { data: waitingListEntry, error } = await supabase
        .from('group_waiting_list')
        .insert({
          group_id: groupId,
          user_id: userId,
          personal_message: personalMessage || null,
          status: 'waiting'
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding to waiting list:', error);
        throw error;
      }

      return waitingListEntry;
    } catch (error) {
      console.error('Error in addToWaitingList:', error);
      throw error;
    }
  }

  async getWaitingList(groupId: string): Promise<GroupWaitingList[]> {
    try {
      const { data, error } = await supabase
        .from('group_waiting_list')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', 'waiting')
        .order('applied_at', { ascending: true });

      if (error) {
        console.error('Error fetching waiting list:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getWaitingList:', error);
      return [];
    }
  }

  async processWaitingListApplication(applicationId: string, status: 'approved' | 'rejected'): Promise<GroupWaitingList> {
    try {
      const { data: application, error } = await supabase
        .from('group_waiting_list')
        .update({
          status,
          processed_at: new Date().toISOString()
        })
        .eq('id', applicationId)
        .select()
        .single();

      if (error) {
        console.error('Error processing waiting list application:', error);
        throw error;
      }

      // If approved, add to group
      if (status === 'approved') {
        await this.addMemberToGroup(application.group_id, application.user_id);
      }

      return application;
    } catch (error) {
      console.error('Error in processWaitingListApplication:', error);
      throw error;
    }
  }

  async getGroupAnalytics(groupId: string): Promise<GroupAnalytics> {
    try {
      // Get group members
      const { data: members } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId);

      const totalMembers = members?.length || 0;
      const activeMembers = members?.filter(m => m.status === 'active').length || 0;

      // Get sessions
      const { data: sessions } = await supabase
        .from('group_sessions')
        .select('*')
        .eq('group_id', groupId);

      const totalSessions = sessions?.length || 0;

      // Get attendance data
      const { data: attendance } = await supabase
        .from('session_attendance')
        .select('*')
        .eq('group_id', groupId);

      const presentAttendance = attendance?.filter(a => a.status === 'present').length || 0;
      const totalAttendanceRecords = attendance?.length || 0;
      const attendanceRate = totalAttendanceRecords > 0 ? (presentAttendance / totalAttendanceRecords) * 100 : 0;
      const averageAttendance = totalSessions > 0 ? presentAttendance / totalSessions : 0;

      // Recent activity (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const recentMembers = members?.filter(m => new Date(m.joined_at) > weekAgo).length || 0;
      const upcomingSessions = sessions?.filter(s => 
        new Date(s.session_date) > new Date() && s.status === 'scheduled'
      ).length || 0;

      return {
        totalMembers,
        activeMembers,
        totalSessions,
        averageAttendance: Math.round(averageAttendance * 100) / 100,
        attendanceRate: Math.round(attendanceRate),
        memberEngagement: Math.round((activeMembers / Math.max(totalMembers, 1)) * 100),
        recentActivity: {
          newMembers: recentMembers,
          upcomingSessions,
          recentMessages: 0
        }
      };
    } catch (error) {
      console.error('Error in getGroupAnalytics:', error);
      return {
        totalMembers: 0,
        activeMembers: 0,
        totalSessions: 0,
        averageAttendance: 0,
        attendanceRate: 0,
        memberEngagement: 0,
        recentActivity: {
          newMembers: 0,
          upcomingSessions: 0,
          recentMessages: 0
        }
      };
    }
  }

  async getMemberAnalytics(groupId: string, userId: string): Promise<{
    attendance_rate: number;
    sessions_attended: number;
    total_sessions: number;
    last_attendance: string | null;
    engagement_score: number;
  }> {
    try {
      // Get all sessions for this group
      const { data: sessions } = await supabase
        .from('group_sessions')
        .select('id')
        .eq('group_id', groupId);

      const totalSessions = sessions?.length || 0;

      // Get attendance for this user
      const { data: attendance } = await supabase
        .from('session_attendance')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', userId);

      const sessionsAttended = attendance?.filter(a => a.status === 'present').length || 0;
      const attendanceRate = totalSessions > 0 ? (sessionsAttended / totalSessions) * 100 : 0;

      // Last attendance
      const lastAttendance = attendance
        ?.filter(a => a.status === 'present')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      // Simple engagement score based on attendance rate
      const engagementScore = Math.round(attendanceRate);

      return {
        attendance_rate: Math.round(attendanceRate),
        sessions_attended: sessionsAttended,
        total_sessions: totalSessions,
        last_attendance: lastAttendance?.created_at || null,
        engagement_score: engagementScore
      };
    } catch (error) {
      console.error('Error in getMemberAnalytics:', error);
      return {
        attendance_rate: 0,
        sessions_attended: 0,
        total_sessions: 0,
        last_attendance: null,
        engagement_score: 0
      };
    }
  }

  async getUserGroups(userId: string): Promise<SupportGroup[]> {
    try {
      // Get the group IDs first
      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (memberError) {
        console.error('Error fetching user groups:', memberError);
        throw memberError;
      }

      if (!memberData || memberData.length === 0) {
        return [];
      }

      const groupIds = memberData.map(item => item.group_id);

      // Then get the group details
      const { data: groupData, error: groupError } = await supabase
        .from('support_groups')
        .select('*')
        .in('id', groupIds);

      if (groupError) {
        console.error('Error fetching group details:', groupError);
        throw groupError;
      }

      return groupData || [];
    } catch (error) {
      console.error('Error in getUserGroups:', error);
      return [];
    }
  }

  async canUserJoinGroup(groupId: string, userId: string): Promise<{
    canJoin: boolean;
    reason?: string;
  }> {
    try {
      // Get group info
      const group = await this.getSupportGroupById(groupId);
      if (!group) {
        return { canJoin: false, reason: 'Group not found' };
      }

      if (group.status !== 'active') {
        return { canJoin: false, reason: 'Group is not active' };
      }

      if (group.current_participants >= group.max_participants) {
        return { canJoin: false, reason: 'Group is full' };
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (existingMember) {
        return { canJoin: false, reason: 'Already a member' };
      }

      // Check if on waiting list
      const { data: waitingListEntry } = await supabase
        .from('group_waiting_list')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .eq('status', 'waiting')
        .single();

      if (waitingListEntry) {
        return { canJoin: false, reason: 'Already on waiting list' };
      }

      return { canJoin: true };
    } catch (error) {
      console.error('Error in canUserJoinGroup:', error);
      return { canJoin: false, reason: 'Error checking eligibility' };
    }
  }

  async getGroupRecentActivity(groupId: string): Promise<Array<{
    id: string;
    type: 'new_member' | 'session_completed' | 'session_scheduled' | 'member_left';
    message: string;
    timestamp: string;
    icon: string;
  }>> {
    try {
      const activities: Array<{
        id: string;
        type: 'new_member' | 'session_completed' | 'session_scheduled' | 'member_left';
        message: string;
        timestamp: string;
        icon: string;
      }> = [];

      // Get recent member joins (last 30 days)
      const { data: recentMembers } = await supabase
        .from('group_members')
        .select('id, joined_at')
        .eq('group_id', groupId)
        .eq('status', 'active')
        .gte('joined_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('joined_at', { ascending: false })
        .limit(5);

      // Get recent sessions (last 30 days)
      const { data: recentSessions } = await supabase
        .from('group_sessions')
        .select('*')
        .eq('group_id', groupId)
        .gte('session_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('session_date', { ascending: false })
        .limit(5);

      // Process recent members
      recentMembers?.forEach(member => {
        const daysSince = Math.floor((Date.now() - new Date(member.joined_at).getTime()) / (1000 * 60 * 60 * 24));
        activities.push({
          id: `member-${member.id}`,
          type: 'new_member',
          message: `New member joined ${daysSince === 0 ? 'today' : `${daysSince} day${daysSince > 1 ? 's' : ''} ago`}`,
          timestamp: member.joined_at,
          icon: 'UserPlus'
        });
      });

      // Process recent sessions
      recentSessions?.forEach(session => {
        const daysSince = Math.floor((Date.now() - new Date(session.session_date).getTime()) / (1000 * 60 * 60 * 24));
        const isCompleted = session.status === 'completed';
        const isScheduled = session.status === 'scheduled' && new Date(session.session_date) > new Date();
        
        if (isCompleted) {
          activities.push({
            id: `session-${session.id}`,
            type: 'session_completed',
            message: `"${session.title}" completed ${daysSince === 0 ? 'today' : `${daysSince} day${daysSince > 1 ? 's' : ''} ago`}`,
            timestamp: session.session_date,
            icon: 'Calendar'
          });
        } else if (isScheduled) {
          activities.push({
            id: `session-${session.id}`,
            type: 'session_scheduled',
            message: `"${session.title}" scheduled for ${daysSince < 0 ? `${Math.abs(daysSince)} day${Math.abs(daysSince) > 1 ? 's' : ''} from now` : `${daysSince} day${daysSince > 1 ? 's' : ''} ago`}`,
            timestamp: session.session_date,
            icon: 'Calendar'
          });
        }
      });

      // Sort by timestamp and return top 5
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);

    } catch (error) {
      console.error('Error fetching group recent activity:', error);
      return [];
    }
  }

  async getUpcomingSessions(groupId: string): Promise<SessionWithAttendance[]> {
    try {
      const { data: sessions, error } = await supabase
        .from('group_sessions')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', 'scheduled')
        .gte('session_date', new Date().toISOString().split('T')[0])
        .order('session_date', { ascending: true })
        .limit(5);

      if (error) {
        console.error('Error fetching upcoming sessions:', error);
        return [];
      }

      return sessions || [];
    } catch (error) {
      console.error('Error in getUpcomingSessions:', error);
      return [];
    }
  }

  async startSession(sessionId: string): Promise<ServiceResponse<{
    session: GroupSession;
    meetingUrl: string;
  }>> {
    try {
      console.log('Starting session with ID:', sessionId);
      
      // Get session details
      const { data: session, error: sessionError } = await supabase
        .from('group_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        console.error('Session not found:', sessionError);
        return { error: 'Session not found' };
      }

      console.log('Found session:', session);

      // Check if session already has a meeting link and is in progress
      if (session.meeting_link && session.status === 'in_progress') {
        console.log('Session already in progress, returning existing meeting link');
        return {
          data: {
            session,
            meetingUrl: session.meeting_link
          }
        };
      }

      // Import dailyService dynamically to avoid circular imports
      console.log('Importing Daily.co service...');
      const { dailyService } = await import('../daily/daily.service');
      
      // Create Daily.co room for the session (similar to appointment system)
      const timestamp = Date.now();
      const cleanSessionId = sessionId.replace(/[^a-zA-Z0-9]/g, '');
      const roomName = `groupsession${cleanSessionId.substring(0, 8)}${timestamp.toString().substring(-6)}`;
      
      console.log('Creating Daily.co room for group session:', sessionId);
      console.log('Generated room name:', roomName);
      
      const { data: roomData, error: roomError } = await dailyService.createRoom({
        name: roomName,
        privacy: 'public',
        properties: {
          enable_chat: true,
          enable_screenshare: true,
          start_audio_off: false,
          start_video_off: false
        }
      });

      if (roomError || !roomData) {
        console.error('Failed to create Daily.co room:', roomError);
        return { error: `Failed to create meeting room: ${roomError}` };
      }

      console.log('Daily.co room created successfully:', roomData);

      // Update session with meeting link and status
      console.log('Updating session in database...');
      const updateData = {
          meeting_link: roomData.url,
        status: 'in_progress' as const,
          updated_at: new Date().toISOString()
      };
      console.log('Update data:', updateData);

      const { data: updatedSession, error: updateError } = await supabase
        .from('group_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select()
        .single();

      if (updateError) {
        console.error('Database update error:', updateError);
        return { error: `Failed to update session status: ${updateError.message}` };
      }

      if (!updatedSession) {
        console.error('No session returned after update');
        return { error: 'Failed to update session status: No data returned' };
      }

      console.log('Session updated successfully:', updatedSession);

      // Notify all group members about the session starting
      console.log('Notifying group members...');
      await this.notifyGroupMembersSessionStarted(session.group_id, sessionId, roomData.url);

      console.log('Session started successfully');
      return {
        data: {
          session: updatedSession,
          meetingUrl: roomData.url
        }
      };
    } catch (error) {
      console.error('Error starting session:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error starting session' };
    }
  }

  async endSession(sessionId: string): Promise<ServiceResponse<GroupSession>> {
    try {
      const { data: session, error } = await supabase
        .from('group_sessions')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        return { error: 'Failed to end session' };
      }

      return { data: session };
    } catch (error: any) {
      console.error('Error ending session:', error);
      return { error: error.message || 'Failed to end session' };
    }
  }

  async getActiveGroupSession(groupId: string): Promise<ServiceResponse<{
    session: GroupSession;
    meetingUrl: string;
  } | null>> {
    try {
      const { data: session, error } = await supabase
        .from('group_sessions')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', 'in_progress')
        .not('meeting_link', 'is', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No active session found - this is normal
          return { data: null };
        }
        return { error: 'Failed to check for active session' };
      }

      return {
        data: {
          session,
          meetingUrl: session.meeting_link!
        }
      };
    } catch (error: any) {
      console.error('Error getting active group session:', error);
      return { error: error.message || 'Failed to get active session' };
    }
  }

  async getMemberGroupSessions(userId: string): Promise<Array<{
    group: SupportGroup;
    activeSession?: {
      session: GroupSession;
      meetingUrl: string;
    };
    upcomingSessions: GroupSession[];
  }>> {
    try {
      // Get all groups the user is a member of
      const { data: memberGroups, error: groupError } = await supabase
        .from('group_members')
        .select(`
          group_id,
          status,
          support_groups (*)
        `)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (groupError) {
        console.error('Error fetching member groups:', groupError);
        return [];
      }

      if (!memberGroups || memberGroups.length === 0) {
        return [];
      }

      // For each group, get active and upcoming sessions
      const groupSessionData = await Promise.all(
        memberGroups.map(async (membership: any) => {
          const group = membership.support_groups;
          
          // Get active session
          const activeResult = await this.getActiveGroupSession(group.id);
          const activeSession = activeResult.data;

          // Get upcoming sessions
          const { data: upcomingSessions } = await supabase
            .from('group_sessions')
            .select('*')
            .eq('group_id', group.id)
            .eq('status', 'scheduled')
            .gte('session_date', new Date().toISOString().split('T')[0])
            .order('session_date', { ascending: true })
            .limit(3);

          return {
            group,
            activeSession: activeSession || undefined,
            upcomingSessions: upcomingSessions || []
          };
        })
      );

      return groupSessionData;
    } catch (error) {
      console.error('Error getting member group sessions:', error);
      return [];
    }
  }

  // Sync current_participants count with actual member count
  async syncGroupMemberCounts(): Promise<{ updated: number; errors: string[] }> {
    try {
      console.log('Starting support group member count sync...');
      
      // Get all active groups
      const { data: groups, error: groupsError } = await supabase
        .from('support_groups')
        .select('id, name, current_participants')
        .eq('status', 'active');

      if (groupsError) {
        console.error('Error fetching groups for sync:', groupsError);
        return { updated: 0, errors: [groupsError.message] };
      }

      const errors: string[] = [];
      let updated = 0;

      for (const group of groups || []) {
        try {
          // Count actual active members
          const { data: members, error: membersError } = await supabase
            .from('group_members')
            .select('id')
            .eq('group_id', group.id)
            .eq('status', 'active');

          if (membersError) {
            errors.push(`Error counting members for group ${group.name}: ${membersError.message}`);
            continue;
          }

          const actualCount = members?.length || 0;

          // Update if counts don't match
          if (actualCount !== group.current_participants) {
            const { error: updateError } = await supabase
              .from('support_groups')
              .update({
                current_participants: actualCount,
                updated_at: new Date().toISOString()
              })
              .eq('id', group.id);

            if (updateError) {
              errors.push(`Error updating count for group ${group.name}: ${updateError.message}`);
            } else {
              console.log(`Updated ${group.name}: ${group.current_participants} -> ${actualCount}`);
              updated++;
            }
          }
        } catch (error) {
          errors.push(`Error processing group ${group.name}: ${error}`);
        }
      }

      console.log(`Sync complete. Updated ${updated} groups. ${errors.length} errors.`);
      return { updated, errors };
    } catch (error) {
      console.error('Error in syncGroupMemberCounts:', error);
      return { updated: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  }

  // Reset all session and engagement data to zero
  async resetAllSessionData(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      console.log('Resetting all session and engagement data...');
      
      // Delete all session attendance records
      const { error: attendanceError } = await supabase
        .from('session_attendance')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (attendanceError) {
        console.error('Error deleting attendance records:', attendanceError);
        throw attendanceError;
      }

      // Delete all group sessions
      const { error: sessionsError } = await supabase
        .from('group_sessions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (sessionsError) {
        console.error('Error deleting session records:', sessionsError);
        throw sessionsError;
      }

      // Reset any analytics or engagement scores if they exist in other tables
      // This ensures all engagement/session data starts fresh

      console.log('Successfully reset all session and engagement data');
      return { 
        success: true, 
        message: 'All session and engagement data has been reset to zero. Groups now show only membership data.' 
      };
    } catch (error) {
      console.error('Error resetting session data:', error);
      return { 
        success: false, 
        message: `Failed to reset session data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      };
    }
  }

  // Create a scheduled session for a group (similar to appointment scheduling)
  async createScheduledSession(groupId: string, scheduledDate: string, scheduledTime: string): Promise<ServiceResponse<GroupSession>> {
    try {
      // Get group details to create appropriate session
      const group = await this.getSupportGroupById(groupId);
      if (!group) {
        return { error: 'Group not found' };
      }

      // Create session record
      const sessionData = {
        group_id: groupId,
        title: `${group.name} Group Session`,
        description: `Scheduled group session for ${group.name}`,
        session_date: scheduledDate,
        start_time: scheduledTime,
        end_time: this.calculateEndTime(scheduledTime, 60), // Default 1 hour session
        session_type: 'group_meeting',
        status: 'scheduled' as const,
        attendance_count: 0
      };

      const { data: session, error } = await supabase
        .from('group_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { data: session };
    } catch (error) {
      console.error('Error creating scheduled session:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Helper function to calculate end time
  private calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    startDate.setMinutes(startDate.getMinutes() + durationMinutes);
    return `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;
  }

  // Notify all group members when a session starts
  async notifyGroupMembersSessionStarted(groupId: string, sessionId: string, meetingUrl: string): Promise<void> {
    try {
      // Get all active group members
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('status', 'active');

      if (!members || members.length === 0) {
        console.log('No members to notify for group:', groupId);
        return;
      }

      // Get group name for notification
      const group = await this.getSupportGroupById(groupId);
      const groupName = group?.name || 'Support Group';

      // Create notifications for all members using notification service
      for (const member of members) {
        try {
          await notificationService.createNotification({
            userId: member.user_id,
            title: `${groupName} Session Started`,
            message: `Your ${groupName} session has started. Click to join the meeting.`,
            type: 'session',
            actionUrl: `/patient-dashboard/group-session/${sessionId}`,
            metadata: {
              groupId,
              sessionId,
              meetingUrl,
              groupName,
              action: 'session_started'
            }
          });
        } catch (notifyError) {
          console.error(`Error creating session notification for user ${member.user_id}:`, notifyError);
        }
      }

      console.log(`Notified ${members.length} members about session start`);
    } catch (error) {
      console.error('Error notifying group members:', error);
    }
  }

  // Helper method to notify about upcoming sessions
  async notifyUpcomingSessions(): Promise<void> {
    try {
      // Get sessions starting in 1 hour
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const now = new Date().toISOString();

      const { data: upcomingSessions } = await supabase
        .from('group_sessions')
        .select(`
          id,
          group_id,
          title,
          session_date,
          start_time,
          support_groups (
            id,
            name,
            group_members (
              user_id
            )
          )
        `)
        .eq('status', 'scheduled')
        .gte('session_date', now)
        .lte('session_date', oneHourFromNow);

      if (!upcomingSessions || upcomingSessions.length === 0) {
        return;
      }

      for (const session of upcomingSessions) {
        const group = session.support_groups as any;
        if (!group || !group.group_members) continue;

        for (const member of group.group_members) {
          try {
            await notificationService.createNotification({
              userId: member.user_id,
              title: 'Upcoming Session Reminder',
              message: `Your "${group.name}" session starts in 1 hour at ${session.start_time}.`,
              type: 'reminder',
              actionUrl: `/patient-dashboard/groups`,
              metadata: {
                groupId: session.group_id,
                sessionId: session.id,
                groupName: group.name,
                action: 'session_reminder'
              }
            });
          } catch (notifyError) {
            console.error(`Error creating session reminder for user ${member.user_id}:`, notifyError);
          }
        }
      }
    } catch (error) {
      console.error('Error notifying about upcoming sessions:', error);
    }
  }

  // Get today's scheduled sessions for a group (for the "Start Session" button)
  async getTodaysScheduledSessions(groupId: string): Promise<ServiceResponse<SessionWithAttendance[]>> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: sessions, error } = await supabase
        .from('group_sessions')
        .select('*')
        .eq('group_id', groupId)
        .eq('session_date', today)
        .in('status', ['scheduled', 'in_progress'])
        .order('start_time', { ascending: true });

      if (error) {
        return { error: error.message };
      }

      // Add attendance tracking info
      const sessionsWithAttendance = await Promise.all(
        (sessions || []).map(async (session) => {
          const { data: attendance } = await supabase
            .from('session_attendance')
            .select('status')
            .eq('session_id', session.id);

          const attendanceCount = attendance?.filter(a => a.status === 'present').length || 0;
          const totalMembers = attendance?.length || 0;
          const attendanceRate = totalMembers > 0 ? (attendanceCount / totalMembers) * 100 : 0;

          return {
            ...session,
            attendance_count: attendanceCount,
            total_members: totalMembers,
            attendance_rate: Math.round(attendanceRate)
          };
        })
      );

      return { data: sessionsWithAttendance };
    } catch (error) {
      console.error('Error getting today\'s sessions:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Check if user can join a session (for patient side)
  async canUserJoinSession(sessionId: string, userId: string): Promise<ServiceResponse<{
    canJoin: boolean;
    meetingUrl?: string;
    reason?: string;
  }>> {
    try {
      // Get session details
      const { data: session, error: sessionError } = await supabase
        .from('group_sessions')
        .select('*, support_groups(*)')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        return { data: { canJoin: false, reason: 'Session not found' } };
      }

      // Check if user is a member of the group
      const { data: membership } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', session.group_id)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (!membership) {
        return { data: { canJoin: false, reason: 'You are not a member of this group' } };
      }

      // Check if session is in progress
      if (session.status !== 'in_progress') {
        return { data: { canJoin: false, reason: 'Session has not started yet' } };
      }

      // Check if session has meeting URL
      if (!session.meeting_link) {
        return { data: { canJoin: false, reason: 'Session meeting room not ready' } };
      }

      return { 
        data: { 
          canJoin: true, 
          meetingUrl: session.meeting_link 
        } 
      };
    } catch (error) {
      console.error('Error checking session join eligibility:', error);
      return { data: { canJoin: false, reason: 'Error checking session access' } };
    }
  }

  // Track when a user joins a session (for attendance)
  async trackSessionJoin(sessionId: string, userId: string): Promise<ServiceResponse<boolean>> {
    try {
      // Get session info for group_id
      const { data: session } = await supabase
        .from('group_sessions')
        .select('group_id')
        .eq('id', sessionId)
        .single();

      if (!session) {
        return { error: 'Session not found' };
      }

      // Record attendance
      const { error } = await supabase
        .from('session_attendance')
        .upsert({
          session_id: sessionId,
          user_id: userId,
          group_id: session.group_id,
          status: 'present',
          joined_at: new Date().toISOString()
        }, {
          onConflict: 'session_id,user_id'
        });

      if (error) {
        return { error: error.message };
      }

      return { data: true };
    } catch (error) {
      console.error('Error tracking session join:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const supportGroupsService = new SupportGroupsService(); 