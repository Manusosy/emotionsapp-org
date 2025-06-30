import { supabase } from '@/lib/supabase';
import { dailyService } from '../daily/daily.service';

export interface SupportGroup {
  id: string;
  name: string;
  description: string;
  group_type: string;
  meeting_type: 'online' | 'in-person' | 'hybrid';
  meeting_schedule: {
    day: string;
    time: string;
    frequency?: string;
  }[];
  location?: string;
  max_participants: number;
  current_participants: number;
  status: 'active' | 'inactive' | 'paused';
  mood_mentor_id: string;
  room_url?: string;
  created_at: string;
  updated_at: string;
  facilitator?: {
    name: string;
    role: string;
    avatar: string;
  };
  members?: GroupMember[];
  next_session?: GroupSession;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  status: 'active' | 'inactive' | 'pending';
  joined_at: string;
  notes?: string;
  user?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface GroupSession {
  id: string;
  group_id: string;
  title?: string;
  description?: string;
  session_date: string;
  start_time: string;
  end_time?: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  meeting_url?: string;
  notes?: string;
  recording_url?: string;
  created_at: string;
  updated_at?: string;
  attendance?: SessionAttendance[];
}

export interface SessionAttendance {
  id: string;
  session_id: string;
  user_id: string;
  status: 'registered' | 'attended' | 'absent' | 'late';
  joined_at?: string;
  left_at?: string;
  notes?: string;
}

export interface CreateGroupData {
  name: string;
  description: string;
  group_type: string;
  meeting_type: 'online' | 'in-person' | 'hybrid';
  meeting_schedule: {
    day: string;
    time: string;
    frequency?: string;
  }[];
  location?: string;
  max_participants: number;
}

export interface CreateSessionData {
  title?: string;
  description?: string;
  session_date: string;
  start_time: string;
  end_time?: string;
}

class SupportGroupsService {
  /**
   * Get all support groups for a mentor
   */
  async getMentorGroups(mentorId: string): Promise<SupportGroup[]> {
    try {
      const { data, error } = await supabase
        .from('support_groups')
        .select('*')
        .eq('mentor_id', mentorId)
        .eq('is_active', true);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Get mentor profile info
      const { data: mentorProfile } = await supabase
        .from('mood_mentor_profiles')
        .select('full_name, avatar_url, bio, specialty')
        .eq('user_id', mentorId)
        .single();

      return data.map(group => ({
        ...group,
        status: group.is_active ? 'active' : 'inactive',
        mood_mentor_id: group.mentor_id,
        facilitator: {
          name: mentorProfile?.full_name || "Mentor",
          role: mentorProfile?.specialty || "Mental Health Professional",
          avatar: mentorProfile?.avatar_url || "/api/placeholder/40/40"
        },
        members: []
      }));
    } catch (error) {
      console.error('Error fetching mentor groups:', error);
      throw error;
    }
  }

  /**
   * Get all active support groups (for patients to browse)
   */
  async getActiveGroups(): Promise<SupportGroup[]> {
    try {
      const { data, error } = await supabase
        .from('support_groups')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Get mentor profiles for all groups
      const mentorIds = [...new Set(data.map(group => group.mentor_id))];
      const { data: mentorProfiles } = await supabase
        .from('mood_mentor_profiles')
        .select('user_id, full_name, avatar_url, bio, specialty')
        .in('user_id', mentorIds);

      const mentorProfilesMap = new Map(
        mentorProfiles?.map(profile => [profile.user_id, profile]) || []
      );

      return data.map(group => {
        const mentorProfile = mentorProfilesMap.get(group.mentor_id);
        return {
          ...group,
          status: group.is_active ? 'active' : 'inactive',
          mood_mentor_id: group.mentor_id,
          facilitator: {
            name: mentorProfile?.full_name || "Mental Health Professional",
            role: mentorProfile?.specialty || "Certified Counselor",
            avatar: mentorProfile?.avatar_url || "/api/placeholder/40/40"
          }
        };
      });
    } catch (error) {
      console.error('Error fetching active groups:', error);
      throw error;
    }
  }

  /**
   * Get a specific support group by ID
   */
  async getGroupById(groupId: string): Promise<SupportGroup | null> {
    try {
      // First get the group data
      const { data: groupData, error: groupError } = await supabase
        .from('support_groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;
      if (!groupData) return null;

      // Get mentor profile
      let mentorProfile = null;
      if (groupData.mentor_id) {
        const { data: mentor } = await supabase
          .from('mood_mentor_profiles')
          .select('full_name, specializations, avatar_url')
          .eq('user_id', groupData.mentor_id)
          .single();
        
        mentorProfile = mentor;
      }

      // Get group members
      const { data: members } = await supabase
        .from('group_members')
        .select('id, user_id, status, joined_at, notes')
        .eq('group_id', groupId);

      // Get patient profiles for members
      let memberProfiles: any[] = [];
      if (members && members.length > 0) {
        const memberUserIds = members.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from('patient_profiles')
          .select('user_id, full_name, email, avatar_url')
          .in('user_id', memberUserIds);
        
        memberProfiles = profiles || [];
      }

      // Map member data with profiles
      const memberData = members?.map(member => {
        const profile = memberProfiles.find(p => p.user_id === member.user_id);
        return {
          ...member,
          user: profile ? {
            full_name: profile.full_name,
            email: profile.email,
            avatar_url: profile.avatar_url
          } : undefined
        };
      }) || [];

      return {
        ...groupData,
        status: groupData.is_active ? 'active' as const : 'inactive' as const,
        mood_mentor_id: groupData.mentor_id,
        facilitator: mentorProfile ? {
          name: mentorProfile.full_name,
          role: 'Mental Health Professional',
          avatar: mentorProfile.avatar_url || ''
        } : undefined,
        members: memberData
      };
    } catch (error) {
      console.error('Error fetching group by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new support group
   */
  async createGroup(mentorId: string, groupData: CreateGroupData): Promise<SupportGroup> {
    try {
      // Create Daily.co room for online/hybrid meetings
      let roomUrl = null;
      let roomName = null;
      if (groupData.meeting_type === 'online' || groupData.meeting_type === 'hybrid') {
        const roomResponse = await dailyService.createRoom({
          name: `support-group-${Date.now()}`,
          privacy: 'private',
          properties: {
            max_participants: groupData.max_participants,
            enable_chat: true,
            enable_screenshare: true,
            start_video_off: true,
            start_audio_off: true
          }
        });
        
        if (roomResponse.data) {
          roomUrl = roomResponse.data.url;
          roomName = roomResponse.data.name;
        }
      }

      const { data, error } = await supabase
        .from('support_groups')
        .insert([{
          ...groupData,
          mentor_id: mentorId,
          room_url: roomUrl,
          current_participants: 0
        }])
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error creating support group:', error);
      throw error;
    }
  }

  /**
   * Update a support group
   */
  async updateGroup(groupId: string, updates: Partial<CreateGroupData>): Promise<SupportGroup> {
    try {
      const { data, error } = await supabase
        .from('support_groups')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', groupId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error updating support group:', error);
      throw error;
    }
  }

  /**
   * Delete a support group and all related data
   */
  async deleteGroup(groupId: string): Promise<void> {
    try {
      // Get the group basic info to check if it exists and has a Daily.co room
      const { data: group, error: fetchError } = await supabase
        .from('support_groups')
        .select('name, room_url')
        .eq('id', groupId)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (!group) {
        throw new Error('Group not found');
      }

      console.log(`Deleting group: ${group.name} (${groupId})`);
      
      // Delete Daily.co room if it exists (extract room name from URL)
      if (group.room_url) {
        try {
          // Extract room name from Daily.co URL format: https://domain.daily.co/room-name
          const roomName = group.room_url.split('/').pop();
          if (roomName) {
            await dailyService.deleteRoom(roomName);
            console.log(`Deleted Daily.co room: ${roomName}`);
          }
        } catch (error) {
          console.warn('Failed to delete Daily.co room:', error);
        }
      }

      // The database CASCADE constraints will automatically delete:
      // - group_members records
      // - group_sessions records 
      // - group_session_attendance records
      
      const { error } = await supabase
        .from('support_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
      
      console.log(`Successfully deleted group ${groupId} and all related data`);
    } catch (error) {
      console.error('Error deleting support group:', error);
      throw error;
    }
  }

  /**
   * Add a member to a support group
   */
  async addMember(groupId: string, userId: string, notes?: string): Promise<GroupMember> {
    try {
      // First insert the member
      const { data: memberData, error: insertError } = await supabase
        .from('group_members')
        .insert([{
          group_id: groupId,
          user_id: userId,
          status: 'active',
          notes
        }])
        .select('*')
        .single();

      if (insertError) throw insertError;

      // Get the patient profile
      const { data: profile } = await supabase
        .from('patient_profiles')
        .select('full_name, email, avatar_url')
        .eq('user_id', userId)
        .single();

      // Update the group participant count
      await this.updateParticipantCount(groupId);

      return {
        ...memberData,
        user: profile ? {
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url
        } : undefined
      };
    } catch (error) {
      console.error('Error adding group member:', error);
      throw error;
    }
  }

  /**
   * Remove a member from a support group
   */
  async removeMember(groupId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing group member:', error);
      throw error;
    }
  }

  /**
   * Update member status or notes
   */
  async updateMember(memberId: string, updates: { status?: string; notes?: string }): Promise<GroupMember> {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .update(updates)
        .eq('id', memberId)
        .select(`
          *,
          patient_profiles (
            full_name,
            email,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      return {
        ...data,
        user: data.patient_profiles
      };
    } catch (error) {
      console.error('Error updating group member:', error);
      throw error;
    }
  }

  /**
   * Get group sessions
   */
  async getGroupSessions(groupId: string): Promise<GroupSession[]> {
    try {
      const { data, error } = await supabase
        .from('group_sessions')
        .select(`
          *,
          group_session_attendance (
            id,
            user_id,
            status,
            joined_at,
            left_at,
            notes
          )
        `)
        .eq('group_id', groupId)
        .order('session_date', { ascending: false });

      if (error) throw error;

      return data?.map(session => ({
        ...session,
        attendance: session.group_session_attendance || []
      })) || [];
    } catch (error) {
      console.error('Error fetching group sessions:', error);
      throw error;
    }
  }

  /**
   * Create a new group session
   */
  async createSession(groupId: string, sessionData: CreateSessionData): Promise<GroupSession> {
    try {
      // Get the group to check if it has a Daily.co room
      const group = await this.getGroupById(groupId);
      let meetingUrl = group?.room_url;

      // If no room exists, create one for this session
      if (!meetingUrl && (group?.meeting_type === 'online' || group?.meeting_type === 'hybrid')) {
        const roomResponse = await dailyService.createRoom({
          name: `session-${groupId}-${Date.now()}`,
          privacy: 'private',
          properties: {
            max_participants: group.max_participants,
            enable_chat: true,
            enable_screenshare: true,
            start_video_off: true,
            start_audio_off: true
          }
        });
        
        if (roomResponse.data) {
          meetingUrl = roomResponse.data.url;
        }
      }

      const { data, error } = await supabase
        .from('group_sessions')
        .insert([{
          ...sessionData,
          group_id: groupId,
          status: 'scheduled'
        }])
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error creating group session:', error);
      throw error;
    }
  }

  /**
   * Update a group session
   */
  async updateSession(sessionId: string, updates: Partial<CreateSessionData & { status?: string; notes?: string }>): Promise<GroupSession> {
    try {
      const { data, error } = await supabase
        .from('group_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error updating group session:', error);
      throw error;
    }
  }

  /**
   * Join a support group (for patients)
   */
  async joinGroup(groupId: string, userId: string): Promise<void> {
    try {
      console.log('=== STARTING JOIN GROUP PROCESS ===');
      console.log('joinGroup called with:', { groupId, userId });
      
      // Validate inputs
      if (!groupId || !userId) {
        throw new Error('Missing required parameters: groupId and userId are required');
      }

      // Check if user is already a member
      console.log('Step 1: Checking if user is already a member...');
      const { data: existingMember, error: memberCheckError } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

      console.log('Member check result:', { existingMember, memberCheckError });

      if (memberCheckError && memberCheckError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is expected if user is not a member
        console.error('Error checking existing membership:', memberCheckError);
        throw new Error(`Database error while checking membership: ${memberCheckError.message}`);
      }

      if (existingMember) {
        console.log('User is already a member, throwing error');
        throw new Error('You are already a member of this group');
      }

      console.log('Step 2: User is not already a member, checking group capacity...');

      // Check if group has space
      const { data: group, error: groupError } = await supabase
        .from('support_groups')
        .select('max_participants, current_participants, name')
        .eq('id', groupId)
        .single();

      console.log('Group check result:', { group, groupError });

      if (groupError) {
        console.error('Error fetching group:', groupError);
        throw new Error(`Database error while fetching group: ${groupError.message}`);
      }

      if (!group) {
        throw new Error('Group not found');
      }

      if (group.current_participants >= group.max_participants) {
        throw new Error('This group is full');
      }

      console.log(`Step 3: Group "${group.name}" has space (${group.current_participants}/${group.max_participants}), adding user as member...`);

      // Add user to group
      const { data: insertData, error: insertError } = await supabase
        .from('group_members')
        .insert([{
          group_id: groupId,
          user_id: userId,
          status: 'active'
        }])
        .select('*');

      console.log('Insert result:', { insertData, insertError });

      if (insertError) {
        console.error('Error inserting group member:', insertError);
        throw new Error(`Database error while adding member: ${insertError.message}`);
      }

      console.log('Step 4: User successfully added to group, updating participant count...');

      // Update participant count
      await this.updateParticipantCount(groupId);

      console.log('Step 5: Sending notification to mentor...');

      // Send notification to mentor
      await this.sendGroupNotification(groupId, userId, 'joined');
      
      console.log('=== JOIN GROUP PROCESS COMPLETED SUCCESSFULLY ===');
    } catch (error) {
      console.error('=== JOIN GROUP PROCESS FAILED ===');
      console.error('Error joining group:', error);
      throw error;
    }
  }

  /**
   * Leave a support group (for patients)
   */
  async leaveGroup(groupId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;

      // Update participant count
      await this.updateParticipantCount(groupId);

      // Send notification to mentor
      await this.sendGroupNotification(groupId, userId, 'left');
    } catch (error) {
      console.error('Error leaving group:', error);
      throw error;
    }
  }

  /**
   * Update the current participant count for a group
   */
  private async updateParticipantCount(groupId: string): Promise<void> {
    try {
      const { count } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .eq('status', 'active');

      await supabase
        .from('support_groups')
        .update({ current_participants: count || 0 })
        .eq('id', groupId);
    } catch (error) {
      console.error('Error updating participant count:', error);
    }
  }

  /**
   * Send notification to mentor when someone joins/leaves a group
   */
  private async sendGroupNotification(groupId: string, userId: string, action: 'joined' | 'left'): Promise<void> {
    try {
      // Get group details directly without using the potentially problematic getGroupById
      const { data: group } = await supabase
        .from('support_groups')
        .select('name, mentor_id')
        .eq('id', groupId)
        .single();

      if (!group) return;

      // Get user details
      const { data: userProfile } = await supabase
        .from('patient_profiles')
        .select('full_name')
        .eq('user_id', userId)
        .single();

      const userName = userProfile?.full_name || 'A member';
      const message = `${userName} ${action} your support group "${group.name}"`;

      // Insert notification
      await supabase.from('notifications').insert([{
        user_id: group.mentor_id,
        title: `Group Update - ${group.name}`,
        message: message,
        type: 'group',
        is_read: false,
        created_at: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Error sending group notification:', error);
      // Don't throw - notifications are not critical
    }
  }

  /**
   * Get user's joined groups
   */
  async getUserGroups(userId: string): Promise<SupportGroup[]> {
    try {
      // First get the group IDs the user is a member of
      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (memberError) throw memberError;

      if (!memberData || memberData.length === 0) {
        return [];
      }

      const groupIds = memberData.map(item => item.group_id);

      // Now get the full group details
      const { data: groups, error: groupsError } = await supabase
        .from('support_groups')
        .select('*')
        .in('id', groupIds)
        .eq('is_active', true);

      if (groupsError) throw groupsError;

      if (!groups || groups.length === 0) {
        return [];
      }

      // Get mentor profiles for the groups
      const mentorIds = [...new Set(groups.map(group => group.mentor_id))];
      
      const { data: mentorProfiles } = await supabase
        .from('mood_mentor_profiles')
        .select('user_id, full_name, avatar_url, bio, specialty')
        .in('user_id', mentorIds);

      const mentorProfilesMap = new Map(
        mentorProfiles?.map(profile => [profile.user_id, profile]) || []
      );

      return groups.map(group => {
        const mentorProfile = mentorProfilesMap.get(group.mentor_id);
        return {
          ...group,
          status: group.is_active ? 'active' as const : 'inactive' as const,
          mood_mentor_id: group.mentor_id,
          facilitator: {
            name: mentorProfile?.full_name || "Mental Health Professional",
            role: mentorProfile?.specialty || "Certified Counselor",
            avatar: mentorProfile?.avatar_url || "/api/placeholder/40/40"
          }
        };
      });
    } catch (error) {
      console.error('Error fetching user groups:', error);
      throw error;
    }
  }
}

export const supportGroupsService = new SupportGroupsService(); 