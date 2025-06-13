import { supabase } from '@/lib/supabase';
import { MessageService, ServiceResponse } from '../index';

class SupabaseMessageService implements MessageService {
  async sendMessage(data: { senderId: string; recipientId: string; content: string }): Promise<ServiceResponse<void>> {
    try {
      // Format current time for consistency
      const now = new Date().toISOString();
      
      // Validate inputs
      if (!data.senderId || !data.recipientId || !data.content) {
        return { error: 'Missing required fields for message' };
      }
      
      console.log(`Sending message from ${data.senderId} to ${data.recipientId}`);
      
      // First try to get the profiles to check if users exist
      try {
        const { error: profileCheckError } = await supabase
          .from('profiles')
          .select('id')
          .in('id', [data.senderId, data.recipientId]);
          
        if (profileCheckError) {
          console.warn('Error checking profiles, but continuing anyway:', profileCheckError);
          // Continue anyway - we don't want to block messaging if profiles table has issues
        }
      } catch (profileError) {
        console.warn('Error checking profiles, but continuing anyway:', profileError);
        // Continue anyway
      }
      
      // Prepare the message data with proper values
      const messageData = {
        sender_id: data.senderId,
        recipient_id: data.recipientId,
        content: data.content,
        read: false,
        created_at: now,
        updated_at: now
      };
      
      // Try to insert the message
      const { error } = await supabase
        .from('messages')
        .insert(messageData);
      
      if (error) {
        // Special case - if the table doesn't exist yet
        if (error.message && error.message.includes('relation "messages" does not exist')) {
          console.error('Messages table does not exist yet:', error);
          return { error: 'Messaging system is not yet initialized' };
        }
        
        throw error;
      }
      
      // Try to create a notification for the recipient
      try {
        await supabase
          .from('notifications')
          .insert({
            user_id: data.recipientId,
            title: 'New Message',
            message: `You have a new message from ${data.senderId}`,
            type: 'message',
            is_read: false,
            created_at: now
          });
      } catch (notifyError) {
        console.warn('Failed to create message notification, but continuing:', notifyError);
        // Continue anyway as this is not critical
      }
      
      return {};
    } catch (error: any) {
      console.error('Error sending message:', error);
      return { error: error.message || 'Failed to send message' };
    }
  }

  async getMessages(userId: string): Promise<ServiceResponse<any[]>> {
    try {
      // Check if the messages table exists before attempting to query
      try {
        const { error: tableCheckError } = await supabase
          .from('messages')
          .select('id')
          .limit(1)
          .maybeSingle();
        
        // If table doesn't exist, return empty array instead of error
        if (tableCheckError && tableCheckError.message.includes('relation "messages" does not exist')) {
          return { data: [] };
        }
      } catch (checkError) {
        console.warn('Error checking message table:', checkError);
        // Continue anyway, the query might still work
      }
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(id, full_name, email, avatar_url),
          recipient:recipient_id(id, full_name, email, avatar_url)
        `)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        // Check if it's a database structure issue
        if (error.message.includes('relation "messages" does not exist')) {
          return { data: [] };
        } else if (error.message.includes('column "recipient_id" does not exist')) {
          // This means we have the other messaging schema
          console.log('Detected alternate messaging schema');
          return { data: [] };
        }
        throw error;
      }
      
      return { data: data || [] };
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      return { error: error.message, data: [] };
    }
  }

  async markAsRead(messageId: string): Promise<ServiceResponse<void>> {
    try {
      // Check if the messages table exists before attempting to update
      try {
        const { error: tableCheckError } = await supabase
          .from('messages')
          .select('id')
          .limit(1)
          .maybeSingle();
        
        // If table doesn't exist, return gracefully
        if (tableCheckError && tableCheckError.message.includes('relation "messages" does not exist')) {
          return {};
        }
      } catch (checkError) {
        console.warn('Error checking message table:', checkError);
        // Continue anyway, the update might still work
      }
      
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('id', messageId);

      if (error) {
        // Handle database structure issues gracefully
        if (error.message.includes('relation "messages" does not exist') || 
            error.message.includes('column "read" does not exist')) {
          return {};
        }
        throw error;
      }
      
      return {};
    } catch (error: any) {
      console.error('Error marking message as read:', error);
      return { error: error.message };
    }
  }
  
  // This method serves as a fallback for direct messaging when the conversational messaging system isn't available
  async getOrCreateConversation(user1Id: string, user2Id: string): Promise<ServiceResponse<string>> {
    try {
      // For direct messaging, we can create a deterministic conversation ID by sorting user IDs
      const conversationId = [user1Id, user2Id].sort().join('_');
      console.log(`Creating direct message conversation ID: ${conversationId}`);
      
      // Check if there are any messages between these users already
      const { data: existingMessages, error: checkError } = await supabase
        .from('messages')
        .select('id')
        .or(`and(sender_id.eq.${user1Id},recipient_id.eq.${user2Id}),and(sender_id.eq.${user2Id},recipient_id.eq.${user1Id})`)
        .limit(1);
        
      if (checkError) {
        // If the table doesn't exist yet, send a welcome message to initialize
        if (checkError.message && checkError.message.includes('relation "messages" does not exist')) {
          return { error: 'Messages table does not exist yet. The database schema might need to be initialized.' };
        }
        throw checkError;
      }
      
      // If no messages exist yet, send a system message to initialize the conversation
      if (!existingMessages || existingMessages.length === 0) {
        const result = await this.sendMessage({
          senderId: user1Id,
          recipientId: user2Id,
          content: 'Conversation started'
        });
        
        if (result.error) {
          return { error: `Failed to initialize conversation: ${result.error}` };
        }
      }
      
      return { data: conversationId };
    } catch (error: any) {
      console.error('Error in getOrCreateConversation:', error);
      return { error: error.message || 'Failed to create or retrieve conversation' };
    }
  }
}

export const messageService = new SupabaseMessageService(); 