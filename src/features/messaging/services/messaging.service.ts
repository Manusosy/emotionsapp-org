import { supabase } from '@/lib/supabase';
import { ServiceResponse } from '@/services';
import { 
  Message, 
  Conversation, 
  ConversationParticipant, 
  ConversationWithLastMessage, 
  MessagingService 
} from '@/features/messaging/types';
import { patientService, moodMentorService } from '@/services';
import { notificationService } from '@/services/notifications/notification.service';

export default class SupabaseMessagingService implements MessagingService {
  async getOrCreateConversation(
    user1Id: string, 
    user2Id: string, 
    appointmentId?: string
  ): Promise<ServiceResponse<string>> {
    try {
      console.log("getOrCreateConversation called with:", { user1Id, user2Id, appointmentId });
      
      // Verify both user IDs are valid
      if (!user1Id || !user2Id) {
        console.error("Missing user IDs:", { user1Id, user2Id });
        return { error: 'Both user IDs must be provided to create a conversation' };
      }

      if (user1Id === user2Id) {
        console.error("Attempted to create conversation with self");
        return { error: 'Cannot create a conversation with yourself' };
      }
      
      // Check if we're authenticated
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session || !session.session) {
        console.error("Authentication error:", sessionError);
        return { error: 'Authentication required to create conversations' };
      }
      
      console.log("Current authenticated user:", session.session.user.id);
      
      // Use our new database function to get or create conversation
      const { data: conversationId, error } = await supabase.rpc('get_or_create_conversation', {
        p_user1_id: user1Id,
        p_user2_id: user2Id
      });
      
      if (error) {
        console.error("Error getting or creating conversation:", error);
        return { error: 'Could not create conversation. Please ensure the messaging system is set up correctly.' };
      }
      
      console.log("Conversation ID:", conversationId);
      
      // If appointment ID is provided, update the conversation
      if (appointmentId && conversationId) {
        const { error: updateError } = await supabase
          .from('conversations')
          .update({ appointment_id: appointmentId })
          .eq('id', conversationId);
          
        if (updateError) {
          console.warn("Could not link conversation to appointment:", updateError);
        }
      }
      
      return { data: conversationId };
    } catch (error) {
      console.error("Unexpected error in getOrCreateConversation:", error);
      return { error: 'Failed to create conversation due to an unexpected error' };
    }
  }

  async getUserConversations(userId: string): Promise<ServiceResponse<ConversationWithLastMessage[]>> {
    try {
      // Use our database function to get user conversations
      const { data: conversationsData, error: conversationsError } = await supabase.rpc('get_user_conversations', {
        p_user_id: userId
      });

      if (conversationsError) {
        console.error('Error fetching user conversations:', conversationsError);
        return { error: 'Could not fetch conversations. Please ensure the messaging system is set up correctly.' };
      }

      // The database function already returns enhanced conversation data with participant details
      // So we can directly map it to our expected format
      const conversations = (conversationsData || []).map((conv: any) => ({
        conversation_id: conv.conversation_id,
        other_user_id: conv.other_user_id,
        other_user_name: conv.other_user_name || conv.other_user_email,
        other_user_email: conv.other_user_email,
        other_user_avatar: conv.other_user_avatar,
        last_message_content: conv.last_message_content,
        last_message_time: conv.last_message_time,
        unread_count: conv.unread_count || 0,
        has_unread: conv.has_unread || false,
        // Add participant info in the expected format
        other_participant: {
          id: conv.other_user_id,
          fullName: conv.other_user_name || conv.other_user_email || 'Unknown User',
          email: conv.other_user_email || '',
          avatarUrl: conv.other_user_avatar
        }
      }));

      console.log(`Found ${conversations.length} conversations for user ${userId}`);
      return { data: conversations };
    } catch (error) {
      console.error('Error in getUserConversations:', error);
      return { error: 'Failed to fetch conversations' };
    }
  }

  async getConversationMessages(
    conversationId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<ServiceResponse<Message[]>> {
    try {
      // Use our new database function
      const { data, error } = await supabase.rpc('get_conversation_messages', {
        p_conversation_id: conversationId,
        p_limit: limit,
        p_offset: offset
      });

      if (error) {
        console.error('Error fetching messages:', error);
        return { error: 'Could not fetch messages. Please ensure the messaging system is set up correctly.' };
      }

      return { data: data || [] };
    } catch (error) {
      console.error('Error in getConversationMessages:', error);
      return { error: 'Failed to fetch messages' };
    }
  }

  async sendMessage(
    conversationId: string, 
    senderId: string, 
    content: string,
    attachmentUrl?: string,
    attachmentType?: string
  ): Promise<ServiceResponse<Message>> {
    console.log("==== SEND MESSAGE START ====");
    console.log({ conversationId, senderId, content, attachmentUrl, attachmentType });

    try {
      // Get conversation details to find recipient
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('user1_id, user2_id')
        .eq('id', conversationId)
        .single();

      if (convError || !conversation) {
        console.error('Error fetching conversation:', convError);
        return { error: 'Could not find conversation' };
      }

      // Determine recipient
      const recipientId = conversation.user1_id === senderId 
        ? conversation.user2_id 
        : conversation.user1_id;

      // Verify the conversation exists first
      console.log("Checking if conversation exists");
      const { data: conversationCheck, error: conversationError } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .single();
        
      if (conversationError) {
        console.error('Error verifying conversation exists:', conversationError);
        return { error: 'Could not verify conversation exists. The conversation may have been deleted.' };
      }
      
      if (!conversationCheck) {
        console.error('Conversation not found:', conversationId);
        return { error: 'Conversation not found' };
      }
      
      // Verify that the sender is a participant in the conversation
      console.log("Checking if sender is a conversation participant");
      const { data: participantCheck, error: participantError } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .eq('user_id', senderId);
        
      if (participantError) {
        console.error('Error checking participant:', participantError);
        return { error: 'Could not verify sender is a participant in this conversation' };
      }
      
      if (!participantCheck || participantCheck.length === 0) {
        console.error('Sender is not a participant in conversation:', {
          senderId,
          conversationId
        });
        return { error: 'Sender is not a participant in this conversation' };
      }
      
      // Send message using our database function
      console.log("Sending message using database function");
      const { data: messageId, error } = await supabase.rpc('send_message', {
        p_conversation_id: conversationId,
        p_sender_id: senderId,
        p_content: content,
        p_attachment_url: attachmentUrl || null,
        p_attachment_type: attachmentType || null
      });

      if (error) {
        console.error('Error sending message:', error);
        return { error: 'Could not send message. Please ensure the messaging system is set up correctly.' };
      }

      console.log("Message sent successfully with ID:", messageId);

      // Create notification for recipient using notification service
      try {
        // Get sender's name for the notification
        const { data: senderProfile } = await supabase
          .from('user_profiles')
          .select('full_name, avatar_url')
          .eq('user_id', senderId)
          .single();

        const senderName = senderProfile?.full_name || 'Someone';
        
        await notificationService.createNotification({
          userId: recipientId,
          title: 'New Message',
          message: `${senderName} sent you a message: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
          type: 'message',
          senderName: senderName,
          senderAvatar: senderProfile?.avatar_url || null,
          actionUrl: `/messages/${conversationId}`,
          metadata: {
            conversationId,
            senderId,
            messageId
          }
        });
      } catch (notifyError) {
        console.warn('Failed to create message notification:', notifyError);
        // Continue anyway as this is not critical
      }

      // Create the message object to return
      const data = {
        id: messageId,
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        attachment_url: attachmentUrl || null,
        attachment_type: attachmentType || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        read_at: null,
        deleted_at: null,
        read: false,
        recipient_id: null
      };

      console.log("==== SEND MESSAGE COMPLETED ====");
      return { data };
    } catch (error) {
      console.error('Error in sendMessage:', error);
      return { error: 'Failed to send message' };
    }
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<ServiceResponse<void>> {
    try {
      // Use our database function to mark messages as read
      const { error } = await supabase.rpc('mark_messages_as_read', {
        p_conversation_id: conversationId,
        p_user_id: userId
      });

      if (error) {
        console.error('Error marking messages as read:', error);
        return { error: 'Could not mark messages as read' };
      }

      // Update the user's last_read_at in the conversation
      const { error: participantError } = await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      if (participantError) {
        console.error('Error updating last read timestamp:', participantError);
        return { error: 'Could not update read status' };
      }
      
      return {};
    } catch (error) {
      console.error('Error in markMessagesAsRead:', error);
      return { error: 'Failed to mark messages as read' };
    }
  }

  async deleteMessage(messageId: string, userId: string): Promise<ServiceResponse<void>> {
    try {
      // Soft delete the message by setting deleted_at
      const { error } = await supabase
        .from('messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('sender_id', userId); // Ensure the user is the sender

      if (error) {
        console.error('Error deleting message:', error);
        return { error: 'Could not delete message' };
      }
      
      return {};
    } catch (error) {
      console.error('Error in deleteMessage:', error);
      return { error: 'Failed to delete message' };
    }
  }

  async getConversation(conversationId: string): Promise<ServiceResponse<Conversation>> {
    try {
      // Get the conversation
      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (conversationError) {
        console.error('Error fetching conversation:', conversationError);
        return { error: 'Could not fetch conversation details' };
      }

      // Get the participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('conversation_participants')
        .select(`
          user_id,
          conversation_id,
          joined_at,
          last_read_at
        `)
        .eq('conversation_id', conversationId);

      if (participantsError) {
        console.error('Error fetching conversation participants:', participantsError);
        return { error: 'Could not fetch conversation participants' };
      }

      // Enrich participant data with user profiles
      const enrichedParticipants = await Promise.all(
        (participantsData || []).map(async (participant) => {
          let userData = null;
          
          // Try to get user profile using existing services
          const patientProfile = await patientService.getPatientById(participant.user_id);
          if (patientProfile.data) {
            userData = {
              id: patientProfile.data.userId,
              fullName: patientProfile.data.fullName,
              email: patientProfile.data.email,
              avatarUrl: patientProfile.data.avatarUrl
            };
          } else {
            const mentorProfile = await moodMentorService.getMoodMentorById(participant.user_id);
            if (mentorProfile.data) {
              userData = {
                id: mentorProfile.data.userId,
                fullName: mentorProfile.data.fullName,
                email: mentorProfile.data.email,
                avatarUrl: mentorProfile.data.avatarUrl
              };
            } else {
              const { data: authUser } = await supabase.auth.getUser(participant.user_id);
              if (authUser && authUser.user) {
                userData = {
                  id: authUser.user.id,
                  fullName: authUser.user.user_metadata?.full_name || authUser.user.email?.split('@')[0] || 'Unknown User',
                  email: authUser.user.email || '',
                  avatarUrl: authUser.user.user_metadata?.avatar_url || null
                };
              }
            }
          }
          
          if (!userData) {
            userData = { 
              id: participant.user_id, 
              fullName: "Unknown User", 
              email: "",
              avatarUrl: null
            };
          }

          return {
            ...participant,
            user: userData
          };
        })
      );

      return { 
        data: {
          ...conversationData,
          participants: enrichedParticipants
        }
      };
    } catch (error) {
      console.error('Error in getConversation:', error);
      return { error: 'Failed to get conversation details' };
    }
  }

  subscribeToConversation(conversationId: string, callback: (message: Message) => void) {
    const channel = supabase
      .channel(`conversation_${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const newMessage = payload.new as Message;
          callback(newMessage);
        }
      )
      .subscribe();

    return { unsubscribe: () => supabase.removeChannel(channel) };
  }

  async getConversationByAppointment(appointmentId: string): Promise<ServiceResponse<string | null>> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id')
        .eq('appointment_id', appointmentId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 means no rows found, which is an expected scenario
        console.error('Error fetching conversation by appointment:', error);
        return { error: 'Could not fetch conversation for this appointment' };
      }

      return { data: data ? data.id : null };
    } catch (error) {
      console.error('Error in getConversationByAppointment:', error);
      return { error: 'Failed to get conversation by appointment' };
    }
  }

  async checkAndFixDatabaseSetup(): Promise<ServiceResponse<boolean>> {
    try {
      console.log("Checking messaging database setup...");
      
      // First check if tables exist
      const { error: messagesTableError } = await supabase
        .from('messages')
        .select('id')
        .limit(1);
      
      if (!messagesTableError) {
        console.log("Messages table exists, checking for trigger...");
        
        // Check if trigger exists by trying to execute a test message insert and verify if conversation timestamp updates
        const currentTime = new Date().toISOString();
        
        // Create test conversation
        const { data: testConvo, error: convoError } = await supabase
          .from('conversations')
          .insert({
            created_at: currentTime,
            updated_at: currentTime,
            last_message_at: currentTime
          })
          .select('id')
          .single();
          
        if (convoError) {
          console.error("Error creating test conversation:", convoError);
          return { error: "Could not create test conversation to verify trigger" };
        }
        
        const convoId = testConvo.id;
        console.log("Created test conversation:", convoId);
        
        // Add test participant
        const { error: partError } = await supabase
          .from('conversation_participants')
          .insert({
            conversation_id: convoId,
            user_id: 'test-user-id',
            joined_at: currentTime
          });
          
        if (partError) {
          console.error("Error creating test participant:", partError);
          
          // Try to clean up
          await supabase.from('conversations').delete().eq('id', convoId);
          
          return { error: "Could not create test participant" };
        }
        
        // Wait a moment to ensure timestamps will be different
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const newTime = new Date().toISOString();
        
        // Insert test message
        const { error: msgError } = await supabase
          .from('messages')
          .insert({
            conversation_id: convoId,
            sender_id: 'test-user-id',
            content: 'Test message to verify trigger',
            created_at: newTime,
            updated_at: newTime
          });
          
        if (msgError) {
          console.error("Error inserting test message:", msgError);
          
          // Try to clean up
          await supabase.from('conversations').delete().eq('id', convoId);
          
          return { error: "Could not insert test message" };
        }
        
        // Check if conversation timestamp was updated by the trigger
        const { data: updatedConvo, error: checkError } = await supabase
          .from('conversations')
          .select('last_message_at, updated_at')
          .eq('id', convoId)
          .single();
          
        if (checkError) {
          console.error("Error checking updated conversation:", checkError);
        } else {
          console.log("Conversation timestamp check:", {
            original: currentTime,
            lastMessageAt: updatedConvo.last_message_at,
            updatedAt: updatedConvo.updated_at
          });
          
          const triggerWorking = 
            updatedConvo.last_message_at > currentTime || 
            updatedConvo.updated_at > currentTime;
          
          if (!triggerWorking) {
            console.warn("Trigger does not appear to be working, will attempt to recreate it");
            
            // Create the trigger function and trigger
            const triggerSql = `
              -- Create functions for realtime subscriptions
              CREATE OR REPLACE FUNCTION public.handle_new_message()
              RETURNS TRIGGER AS $$
              BEGIN
                -- Update conversation's last_message_at timestamp
                UPDATE conversations
                SET last_message_at = NEW.created_at, updated_at = NEW.created_at
                WHERE id = NEW.conversation_id;
                
                RETURN NEW;
              END;
              $$ LANGUAGE plpgsql SECURITY DEFINER;
              
              -- Create trigger for new messages
              DROP TRIGGER IF EXISTS on_new_message ON public.messages;
              CREATE TRIGGER on_new_message
                AFTER INSERT ON public.messages
                FOR EACH ROW
                EXECUTE PROCEDURE public.handle_new_message();
            `;
            
            const { error: triggerError } = await supabase.rpc('exec_sql', { sql: triggerSql });
            
            if (triggerError) {
              console.error("Error creating trigger:", triggerError);
            } else {
              console.log("Successfully created/recreated trigger");
            }
          }
        }
        
        // Clean up test data
        await supabase.from('messages').delete().eq('conversation_id', convoId);
        await supabase.from('conversation_participants').delete().eq('conversation_id', convoId);
        await supabase.from('conversations').delete().eq('id', convoId);
        
        return { data: true };
      } else {
        console.log("Messages table does not exist, may need to run complete setup");
        return { data: false };
      }
    } catch (error) {
      console.error("Error checking database setup:", error);
      return { error: "Failed to check database setup" };
    }
  }
} 