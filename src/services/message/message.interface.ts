/**
 * Message Service Interface
 * Defines the contract for messaging operations
 */

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
  recipient_id?: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTimestamp?: string;
  unreadCount?: number;
}

export interface ConversationItem {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
  lastMessage?: string;
  lastMessageTimestamp?: string;
  unreadCount: number;
  mood_mentor_id?: string;
  patient_id?: string;
  messages?: ChatMessage[];
  last_message_at?: string;
  created_at?: string;
}

export interface IMessageService {
  /**
   * Get conversations for a user
   */
  getConversations(userId: string): Promise<ConversationItem[]>;
  
  /**
   * Get messages for a conversation
   */
  getMessages(conversationId: string): Promise<ChatMessage[]>;
  
  /**
   * Send a message
   */
  sendMessage(message: {
    conversationId?: string;
    senderId: string;
    receiverId: string;
    content: string;
    conversation_id?: string;
  }): Promise<ChatMessage>;
  
  /**
   * Mark messages as read
   */
  markAsRead(conversationId: string, userId: string): Promise<boolean>;
  
  /**
   * Subscribe to conversation updates
   */
  subscribeToConversation(
    conversationId: string, 
    callback: (message: ChatMessage) => void
  ): { unsubscribe: () => void };
} 