import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/authContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Phone, 
  Video, 
  Send, 
  Search,
  MessageCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useParams } from 'react-router-dom';
import { soundManager } from '@/utils/soundUtils';
import SupabaseMessagingService from '@/features/messaging/services/messaging.service';

interface User {
  id: string;
  name?: string;
  email: string;
  avatar?: string;
  specialty?: string;
  role?: 'patient' | 'mentor';
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  recipient_id: string;
  conversation_id: string;
  created_at: string;
  read: boolean;
}

interface Conversation {
  id: string;
  otherUser: User;
  messages: Message[];
  unreadCount: number;
}

interface MessagesPageProps {
  className?: string;
  initialConversationId?: string;
  forceUserRole?: 'patient' | 'mentor';
}

export default function MessagesPage({ 
  className = '', 
  initialConversationId,
  forceUserRole 
}: MessagesPageProps = {}) {
  const { user } = useAuth();
  const params = useParams();
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [showSidebar, setShowSidebar] = useState(true);
  
  const isMobile = useMediaQuery('(max-width: 768px)');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagingService = new SupabaseMessagingService();

  // Get conversation ID from params or props
  const conversationId = initialConversationId || params.conversationId;

  // Determine user role - use forceUserRole if provided, otherwise detect automatically
  const getUserRole = useCallback(async () => {
    if (forceUserRole) {
      return forceUserRole;
    }

    if (!user?.id) return null;

    // Check if user is a patient
    const { data: patientData } = await supabase
      .from('patient_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    return patientData ? 'patient' : 'mentor';
  }, [user?.id, forceUserRole]);

  // Load available users based on role
  const loadUsers = useCallback(async () => {
    if (!user?.id) return;

    try {
      const userRole = await getUserRole();
      
      if (userRole === 'patient') {
        // User is a patient, load mentors
        const { data: mentors } = await supabase
          .from('mood_mentor_profiles')
          .select(`
            user_id,
            full_name,
            specialty,
            avatar_url
          `)
          .eq('is_active', true);

        if (mentors) {
          const formattedMentors: User[] = mentors.map(mentor => ({
            id: mentor.user_id,
            name: mentor.full_name,
            email: 'Email not available',
            role: 'mentor' as const,
            specialty: mentor.specialty,
            avatar: mentor.avatar_url
          }));
          setAvailableUsers(formattedMentors);
        }
      } else {
        // User is a mentor, load patients
        const { data: patients } = await supabase
          .from('patient_profiles')
          .select(`
            user_id,
            full_name,
            avatar_url
          `);

        if (patients) {
          const formattedPatients: User[] = patients.map(patient => ({
            id: patient.user_id,
            name: patient.full_name,
            email: 'Email not available',
            role: 'patient' as const,
            avatar: patient.avatar_url
          }));
          setAvailableUsers(formattedPatients);
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, getUserRole]);

  // Load unread message counts for all users
  const loadUnreadCounts = useCallback(async () => {
    if (!user?.id || availableUsers.length === 0) return;

    try {
      const counts: Record<string, number> = {};
      
      for (const availableUser of availableUsers) {
        // Get or create conversation to get conversation ID
        const { data: conversationId } = await supabase.rpc('get_or_create_conversation', {
          p_user1_id: user.id,
          p_user2_id: availableUser.id,
          p_appointment_id: null
        });

        if (conversationId) {
          // Count unread messages from this user
          const { data: unreadMessages } = await supabase
            .from('messages')
            .select('id')
            .eq('conversation_id', conversationId)
            .eq('sender_id', availableUser.id)
            .eq('read', false);

          counts[availableUser.id] = unreadMessages?.length || 0;
        }
      }
      
      setUnreadCounts(counts);
    } catch (error) {
      console.error('Error loading unread counts:', error);
    }
  }, [user?.id, availableUsers]);

  // Load conversation by ID
  const loadConversationById = useCallback(async (targetUserId: string) => {
    if (!user?.id) return;

    try {
      // Find the target user in available users
      const targetUser = availableUsers.find(u => u.id === targetUserId);
      if (!targetUser) {
        console.error('Target user not found:', targetUserId);
        return;
      }

      // Create or get existing conversation
      const { data: convId, error } = await supabase.rpc('get_or_create_conversation', {
        p_user1_id: user.id,
        p_user2_id: targetUserId,
        p_appointment_id: null
      });

      if (error) {
        console.error('Error creating conversation:', error);
        return;
      }

      // Load messages for this conversation
      const { data: messages, error: messagesError } = await supabase.rpc('get_conversation_messages', {
        p_conversation_id: convId,
        p_limit: 50,
        p_offset: 0
      });

      if (messagesError) {
        console.error('Error loading messages:', messagesError);
        return;
      }

      const conversation: Conversation = {
        id: convId,
        otherUser: targetUser,
        messages: messages || [],
        unreadCount: 0
      };

      setConversations(prev => ({
        ...prev,
        [targetUserId]: conversation
      }));

      setActiveConversation(conversation);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  }, [user?.id, availableUsers]);

  // Open conversation
  const openConversation = useCallback(async (targetUser: User) => {
    if (!user?.id) return;

    let conversation = conversations[targetUser.id];

    if (!conversation) {
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        p_user1_id: user.id,
        p_user2_id: targetUser.id,
        p_appointment_id: null
      });

      if (error) {
        console.error('Error creating conversation:', error);
        return;
      }

      // Load messages for this conversation
      const { data: messages, error: messagesError } = await supabase.rpc('get_conversation_messages', {
        p_conversation_id: data,
        p_limit: 50,
        p_offset: 0
      });

      conversation = {
        id: data,
        otherUser: targetUser,
        messages: messages || [],
        unreadCount: 0
      };

      setConversations(prev => ({
        ...prev,
        [targetUser.id]: conversation
      }));
    }

    setActiveConversation(conversation);
    if (isMobile) setShowSidebar(false);
    
    // Clear unread count for this user since we're viewing their conversation
    setUnreadCounts(prev => ({
      ...prev,
      [targetUser.id]: 0
    }));
    
    // Mark messages as read in the database
    if (conversation.id) {
      try {
        await supabase.rpc('mark_messages_as_read', {
          p_conversation_id: conversation.id,
          p_user_id: user.id
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    }
  }, [user?.id, conversations, isMobile]);

  // Send message
  const sendMessage = useCallback(async () => {
    if (!activeConversation || !user?.id || !newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    // Create temporary message for immediate UI feedback
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      sender_id: user.id,
      recipient_id: activeConversation.otherUser.id,
      conversation_id: activeConversation.id,
      created_at: new Date().toISOString(),
      read: false
    };

    // Add temporary message immediately for better UX
    setActiveConversation(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: [...prev.messages, tempMessage]
      };
    });

    try {
      // Send message through database
      const { data: messageId, error } = await supabase.rpc('send_message', {
        p_conversation_id: activeConversation.id,
        p_sender_id: user.id,
        p_content: messageContent,
        p_attachment_url: null,
        p_attachment_type: null
      });

      if (error) {
        console.error('Error sending message:', error);
        // Remove temporary message on error
        setActiveConversation(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.filter(msg => msg.id !== tempMessage.id)
          };
        });
      } else {
        // Replace temporary message with real message ID
        setActiveConversation(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map(msg => 
              msg.id === tempMessage.id 
                ? { ...msg, id: messageId }
                : msg
            )
          };
        });
        
        // Play sound when message is successfully sent
        soundManager.playMessageSound();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove temporary message on error
      setActiveConversation(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.filter(msg => msg.id !== tempMessage.id)
        };
      });
    }
  }, [activeConversation, user?.id, newMessage]);

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Load unread counts when users are available
  useEffect(() => {
    if (availableUsers.length > 0) {
      loadUnreadCounts();
    }
  }, [availableUsers, loadUnreadCounts]);

  // Periodically refresh unread counts
  useEffect(() => {
    if (availableUsers.length === 0) return;
    
    const interval = setInterval(() => {
      loadUnreadCounts();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [availableUsers, loadUnreadCounts]);

  // Handle initial conversation loading
  useEffect(() => {
    if (conversationId && availableUsers.length > 0) {
      loadConversationById(conversationId);
    }
  }, [conversationId, availableUsers, loadConversationById]);

  // Set up real-time subscription for the active conversation
  useEffect(() => {
    if (!activeConversation?.id) return;

    console.log('Setting up real-time subscription for conversation:', activeConversation.id);
    
    const { unsubscribe } = messagingService.subscribeToConversation(
      activeConversation.id, 
      (message: any) => {
        console.log('New message received via subscription:', message);
        
        // Convert the message to our Message format
        const formattedMessage: Message = {
          id: message.id,
          content: message.content,
          sender_id: message.sender_id,
          recipient_id: message.recipient_id || '',
          conversation_id: message.conversation_id,
          created_at: message.created_at,
          read: message.read || false
        };
        
        // Only add message if it's from someone else (not our own sent messages)
        if (message.sender_id !== user?.id) {
          // Play notification sound for received messages only
          soundManager.playMessageSound();
          
          // Update unread count for this sender
          setUnreadCounts(prev => ({
            ...prev,
            [message.sender_id]: (prev[message.sender_id] || 0) + 1
          }));
          
          // Add the new message to the current conversation
          setActiveConversation(prev => {
            if (!prev || prev.id !== message.conversation_id) return prev;
            
            // Check if message already exists to prevent duplicates
            const messageExists = prev.messages.some(msg => msg.id === message.id);
            if (messageExists) return prev;
            
            return {
              ...prev,
              messages: [...prev.messages, formattedMessage]
            };
          });
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [activeConversation?.id, user?.id]);

  const filteredUsers = availableUsers.filter(user => 
    searchTerm === '' || 
    (user.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex bg-white ${className}`}>
      {/* Sidebar */}
      <div className={`${isMobile && !showSidebar ? 'hidden' : 'flex'} ${isMobile ? 'w-full' : 'w-80'} border-r border-gray-200 flex-col bg-gray-50`}>
        {/* Search Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search conversations..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* User List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredUsers.map((availableUser) => {
              const isActive = activeConversation?.otherUser.id === availableUser.id;
              const unreadCount = unreadCounts[availableUser.id] || 0;

              return (
                <div
                  key={availableUser.id}
                  className={`
                    p-3 mb-1 rounded-lg cursor-pointer transition-all hover:bg-gray-100
                    ${isActive ? 'bg-blue-50 border border-blue-200' : ''}
                  `}
                  onClick={() => openConversation(availableUser)}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={availableUser.avatar} alt={availableUser.name} />
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                        {(availableUser.name || 'U')[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate text-gray-900">
                        {availableUser.name || 'Unknown User'}
                      </h3>
                      {availableUser.specialty && (
                        <p className="text-xs text-gray-500 truncate mt-1">
                          {availableUser.specialty}
                        </p>
                      )}
                    </div>
                    
                    {/* Unread message count badge */}
                    {unreadCount > 0 && (
                      <div 
                        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                        style={{ backgroundColor: '#20C0F3' }}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No conversations available</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className={`${isMobile && showSidebar ? 'hidden' : 'flex'} flex-1 flex-col`}>
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 bg-white border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center">
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowSidebar(true);
                      setActiveConversation(null);
                    }}
                    className="mr-2"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                )}
                
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage src={activeConversation.otherUser.avatar} alt={activeConversation.otherUser.name} />
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {(activeConversation.otherUser.name || 'U')[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <h2 className="font-semibold text-gray-900">{activeConversation.otherUser.name || 'Unknown User'}</h2>
                  {activeConversation.otherUser.specialty && (
                    <p className="text-xs text-gray-500">{activeConversation.otherUser.specialty}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Video className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 bg-gray-50">
              <div className="p-4 space-y-4">
                {activeConversation.messages.map((message, index) => {
                  const isFromMe = message.sender_id === user?.id;

                  return (
                    <div
                      key={`${message.id}-${index}`}
                      className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`
                        max-w-xs lg:max-w-md px-4 py-2 rounded-lg
                        ${isFromMe 
                          ? 'text-white' 
                          : 'bg-white text-gray-900 border border-gray-200'
                        }
                      `}
                      style={isFromMe ? { backgroundColor: '#20C0F3' } : {}}>
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${isFromMe ? 'text-blue-50 opacity-90' : 'text-gray-500'}`}>
                          {new Date(message.created_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="h-16 px-4 bg-white border-t border-gray-200 flex items-center space-x-3">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={`Message ${activeConversation.otherUser.name || 'User'}...`}
                className="flex-1"
              />
              <Button 
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="text-white"
                style={{ backgroundColor: '#20C0F3' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1BA8D1'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#20C0F3'}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p className="text-sm">Choose someone to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
