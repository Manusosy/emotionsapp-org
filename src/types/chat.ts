export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId?: string;
  content: string;
  timestamp: string;
  read: boolean;
  status: 'sent' | 'delivered' | 'read';
  recipient_id?: string;
}

export interface ConversationItem {
  id: string;
  participants: string[];
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageTimestamp?: string;
  unreadCount: number;
  mood_mentor_id?: string;
  patient_id?: string;
  messages?: ChatMessage[];
  last_message_at?: string;
  created_at?: string;
} 