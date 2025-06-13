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
      
      // Try to find an existing conversation first - direct approach
      try {
        console.log("Checking for existing conversation between users");
        
        // First check if there's a direct conversation between these users
        const { data: existingConversation, error: existingError } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user1Id)
          .limit(1000);  // Get all conversations for user1
          
        if (existingError) {
          console.warn("Error checking for existing conversations:", existingError);
        } else if (existingConversation && existingConversation.length > 0) {
          console.log(`Found ${existingConversation.length} conversations for user1`);
          
          // Get all conversation IDs for user1
          const user1ConversationIds = existingConversation.map(c => c.conversation_id);
          
          // Check if user2 is in any of these conversations
          const { data: sharedConversations, error: sharedError } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', user2Id)
            .in('conversation_id', user1ConversationIds);
            
          if (sharedError) {
            console.warn("Error checking for shared conversations:", sharedError);
          } else if (sharedConversations && sharedConversations.length > 0) {
            // Found an existing conversation between these users
            const existingConversationId = sharedConversations[0].conversation_id;
            console.log("Found existing conversation:", existingConversationId);
            
            // Update the conversation's timestamp
            await supabase
              .from('conversations')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', existingConversationId);
              
            return { data: existingConversationId };
          }
        }
      } catch (findError) {
        console.warn("Error finding existing conversation:", findError);
      }
      
      // If we get here, we need to create a new conversation
      console.log("No existing conversation found, creating new conversation");
      
      // Create the new conversation
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          appointment_id: appointmentId || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_message_at: new Date().toISOString()
        })
        .select('id')
        .single();
      
      if (createError) {
        console.error("Error creating conversation:", createError);
        return { error: 'Could not create conversation. Please ensure the messaging system is set up correctly.' };
      }
      
      if (!newConversation || !newConversation.id) {
        console.error("No conversation ID returned after creation");
        return { error: 'Failed to create conversation' };
      }
      
      console.log("New conversation created with ID:", newConversation.id);
      
      // Add both users as participants
      console.log("Adding users as participants");
      const { error: addParticipantsError } = await supabase
        .from('conversation_participants')
        .insert([
          {
            conversation_id: newConversation.id,
            user_id: user1Id,
            joined_at: new Date().toISOString()
          },
          {
            conversation_id: newConversation.id,
            user_id: user2Id,
            joined_at: new Date().toISOString()
          }
        ]);
      
      if (addParticipantsError) {
        console.error("Error adding participants:", addParticipantsError);
        
        // Try to clean up the conversation
        const { error: deleteError } = await supabase
          .from('conversations')
          .delete()
          .eq('id', newConversation.id);
          
        if (deleteError) {
          console.error("Error cleaning up conversation after participant error:", deleteError);
        }
          
        return { error: 'Could not add participants to conversation' };
      }
      
      // Add a system message to initialize the conversation
      console.log("Adding initial system message");
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: newConversation.id,
          sender_id: user1Id,
          content: 'Conversation started',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (messageError) {
        console.error("Error adding initial message:", messageError);
      }
      
      console.log("Conversation successfully created with ID:", newConversation.id);
      return { data: newConversation.id };
    } catch (error) {
      console.error("Unexpected error in getOrCreateConversation:", error);
      return { error: 'Failed to create conversation due to an unexpected error' };
    }
  }

  async getUserConversations(userId: string): Promise<ServiceResponse<ConversationWithLastMessage[]>> {
    try {
      // Get all conversations for the user
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('user_conversations_view')
        .select('*')
        .eq('user_id', userId)
        .order('last_message_time', { ascending: false });

      if (conversationsError) {
        console.error('Error fetching user conversations:', conversationsError);
        return { error: 'Could not fetch conversations. Please ensure the messaging system is set up correctly.' };
      }

      // For each conversation, get the other participant's details
      const enhancedConversations = await Promise.all(
        (conversationsData || []).map(async (conv) => {
          try {
            // Get the other participant's user ID
            const otherUserId = conv.other_user_id;
            
            if (!otherUserId) {
              return {
                ...conv,
                other_participant: { 
                  id: "unknown", 
                  fullName: "Unknown User", 
                  email: "",
                  avatarUrl: null
                }
              };
            }
            
            // Try to get user profile using existing services
            let userData = null;

            // Check if the other user is a patient
            const patientProfile = await patientService.getPatientById(otherUserId);
            if (patientProfile.data) {
              userData = {
                id: patientProfile.data.userId,
                fullName: patientProfile.data.fullName,
                email: patientProfile.data.email,
                avatarUrl: patientProfile.data.avatarUrl
              };
            } else {
              // If not a patient, check if it's a mood mentor
              const mentorProfile = await moodMentorService.getMoodMentorById(otherUserId);
              if (mentorProfile.data) {
                userData = {
                  id: mentorProfile.data.userId,
                  fullName: mentorProfile.data.fullName,
                  email: mentorProfile.data.email,
                  avatarUrl: mentorProfile.data.avatarUrl
                };
              } else {
                // Fallback to auth.users if not found in specific profiles
                const { data: authUser } = await supabase.auth.getUser(otherUserId);
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

            // If we still don't have user data, use a placeholder
            if (!userData) {
              userData = { 
                id: otherUserId, 
                fullName: "Unknown User", 
                email: "",
                avatarUrl: null
              };
            }
              
            return {
              ...conv,
              other_participant: userData
            };
          } catch (err) {
            console.error('Error processing conversation:', err);
            return {
              ...conv,
              other_participant: { 
                id: "unknown", 
                fullName: "Unknown User", 
                email: "",
                avatarUrl: null
              }
            };
          }
        })
      );

      return { data: enhancedConversations };
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
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

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
    try {
      console.log("==== SEND MESSAGE DEBUG ====");
      console.log("Attempting to send message with params:", {
        conversationId,
        senderId,
        content: content.substring(0, 20) + (content.length > 20 ? '...' : ''),
        hasAttachment: !!attachmentUrl
      });
      
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
      
      // Insert the new message
      console.log("Inserting new message");
      const messageData = {
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        attachment_url: attachmentUrl || null,
        attachment_type: attachmentType || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      console.log("Message data:", messageData);
      
      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select('*')
        .single();

      if (error) {
        console.error('Error sending message:', error);
        return { error: 'Could not send message. Please ensure the messaging system is set up correctly.' };
      }

      console.log("Message inserted successfully:", data);

      // Update the conversation's last_message_at timestamp
      console.log("Updating conversation timestamp");
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ 
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);
        
      if (updateError) {
        console.warn('Error updating conversation timestamp:', updateError);
        // Non-blocking, continue even if this fails
      } else {
        console.log("Conversation timestamp updated successfully");
      }

      console.log("==== SEND MESSAGE COMPLETED ====");
      return { data };
    } catch (error) {
      console.error('Error in sendMessage:', error);
      return { error: 'Failed to send message' };
    }
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<ServiceResponse<void>> {
    try {
      // Get current timestamp
      const now = new Date().toISOString();
      
      // Update all unread messages sent by others to be read
      const { error: messagesError } = await supabase
        .from('messages')
        .update({ read_at: now })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .is('read_at', null);

      if (messagesError) {
        console.error('Error marking messages as read:', messagesError);
        return { error: 'Could not mark messages as read' };
      }

      // Update the user's last_read_at in the conversation
      const { error: participantError } = await supabase
        .from('conversation_participants')
        .update({ last_read_at: now })
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