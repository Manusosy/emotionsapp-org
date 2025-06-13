import { ServiceResponse } from '@/services';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  read_at?: string | null;
  deleted_at?: string | null;
  attachment_url?: string | null;
  attachment_type?: string | null;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  appointment_id?: string | null;
  last_message_at: string;
  participants: ConversationParticipant[];
}

export interface ConversationParticipant {
  user_id: string;
  conversation_id: string;
  joined_at: string;
  last_read_at?: string | null;
  user?: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export interface ConversationWithLastMessage {
  conversation_id: string;
  appointment_id?: string | null;
  user_id: string;
  last_message_id?: string | null;
  last_message_sender_id?: string | null;
  last_message_content?: string | null;
  last_message_time?: string | null;
  last_message_read_at?: string | null;
  last_read_at?: string | null;
  has_unread: boolean;
  other_participant?: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export interface MessagingService {
  /**
   * Get or create a conversation between two users
   */
  getOrCreateConversation(user1Id: string, user2Id: string, appointmentId?: string): Promise<ServiceResponse<string>>;
  
  /**
   * Get all conversations for a user
   */
  getUserConversations(userId: string): Promise<ServiceResponse<ConversationWithLastMessage[]>>;
  
  /**
   * Get messages for a conversation
   */
  getConversationMessages(conversationId: string, limit?: number, offset?: number): Promise<ServiceResponse<Message[]>>;
  
  /**
   * Send a message in a conversation
   */
  sendMessage(conversationId: string, senderId: string, content: string, attachmentUrl?: string, attachmentType?: string): Promise<ServiceResponse<Message>>;
  
  /**
   * Mark messages as read
   */
  markMessagesAsRead(conversationId: string, userId: string): Promise<ServiceResponse<void>>;
  
  /**
   * Delete a message (soft delete)
   */
  deleteMessage(messageId: string, userId: string): Promise<ServiceResponse<void>>;
  
  /**
   * Get conversation details
   */
  getConversation(conversationId: string): Promise<ServiceResponse<Conversation>>;
  
  /**
   * Subscribe to new messages in a conversation
   */
  subscribeToConversation(conversationId: string, callback: (message: Message) => void): { unsubscribe: () => void };
  
  /**
   * Get conversation for an appointment
   */
  getConversationByAppointment(appointmentId: string): Promise<ServiceResponse<string | null>>;
} 