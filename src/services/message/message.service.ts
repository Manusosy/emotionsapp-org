import { IMessageService } from './message.interface';
import { supabase } from '@/lib/supabase';
import { ChatMessage, ConversationItem } from '@/types/chat';

class MessageService implements IMessageService {
  async getConversations(userId: string): Promise<ConversationItem[]> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(user_id),
          last_message:messages(content, created_at)
        `)
        .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return data.map(conv => ({
        id: conv.id,
        participants: conv.participants.map(p => p.user_id),
        lastMessage: conv.last_message?.[0]?.content || '',
        lastMessageTime: conv.last_message?.[0]?.created_at || conv.created_at,
        unreadCount: 0 // TODO: Implement unread count
      }));
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data.map(msg => ({
        id: msg.id,
        conversationId: msg.conversation_id,
        senderId: msg.sender_id,
        content: msg.content,
        timestamp: msg.created_at,
        status: msg.status || 'sent'
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  async sendMessage({ conversationId, senderId, receiverId, content }: {
    conversationId?: string;
    senderId: string;
    receiverId: string;
    content: string;
  }): Promise<ChatMessage> {
    try {
      let finalConversationId = conversationId;

      // Create conversation if it doesn't exist
      if (!conversationId) {
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .insert({
            participant1_id: senderId,
            participant2_id: receiverId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (convError) throw convError;
        finalConversationId = convData.id;
      }

      // Send message
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: finalConversationId,
          sender_id: senderId,
          content,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation's updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', finalConversationId);

      return {
        id: data.id,
        conversationId: data.conversation_id,
        senderId: data.sender_id,
        content: data.content,
        timestamp: data.created_at,
        status: 'sent'
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async markAsRead(conversationId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ status: 'read' })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .eq('status', 'sent');

      return !error;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return false;
    }
  }

  subscribeToConversation(
    conversationId: string,
    callback: (message: ChatMessage) => void
  ): { unsubscribe: () => void } {
    const subscription = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const message = payload.new as any;
          callback({
            id: message.id,
            conversationId: message.conversation_id,
            senderId: message.sender_id,
            content: message.content,
            timestamp: message.created_at,
            status: message.status || 'sent'
          });
        }
      )
      .subscribe();

    return {
      unsubscribe: () => {
        subscription.unsubscribe();
      }
    };
  }
}

export const messageService = new MessageService(); 