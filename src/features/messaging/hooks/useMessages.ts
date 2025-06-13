import { useState, useEffect, useRef } from 'react';
import { Message, ConversationWithLastMessage, ConversationParticipant } from '@/features/messaging/types';
import SupabaseMessagingService from '@/features/messaging/services/messaging.service';
import { useAuth } from '@/contexts/authContext';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface UseMessagesOptions {
  initialConversationId?: string;
}

// Create an instance of the messaging service
const messagingService = new SupabaseMessagingService();

export const useMessages = ({ initialConversationId }: UseMessagesOptions) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithLastMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(initialConversationId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [otherParticipant, setOtherParticipant] = useState<{
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Log when initialConversationId changes
  useEffect(() => {
    console.log("useMessages - initialConversationId changed:", initialConversationId);
    if (initialConversationId) {
      setActiveConversationId(initialConversationId);
    }
  }, [initialConversationId]);

  // Fetch all conversations for the user
  useEffect(() => {
    if (!user?.id) return;

    const fetchConversations = async () => {
      setIsLoadingConversations(true);
      const { data, error } = await messagingService.getUserConversations(user.id);
      
      if (error) {
        toast.error('Failed to load conversations.');
        console.error('Error fetching conversations:', error);
      } else {
        setConversations(data || []);
        
        // If an initial conversation ID is provided, set it active
        if (initialConversationId) {
          console.log("Setting initial conversation ID:", initialConversationId);
          setActiveConversationId(initialConversationId);
        } else if (!activeConversationId && data && data.length > 0) {
          // If no initial ID and no active conversation, set the first one as active
          setActiveConversationId(data[0].conversation_id);
        }
      }
      setIsLoadingConversations(false);
    };

    fetchConversations();

    // Subscribe to new conversation participants for real-time updates
    const channel = supabase.channel('public:conversation_participants')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${user?.id}` },
        (payload: any) => {
          console.log('New conversation participant added:', payload);
          fetchConversations(); // Reload conversations when a new one is created
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, initialConversationId]);

  // Fetch messages for the active conversation
  useEffect(() => {
    if (!activeConversationId || !user?.id) {
      setMessages([]); // Clear messages if no active conversation
      setOtherParticipant(null);
      return;
    }

    // Check if the ID is a UUID (conversation) or a user ID
    const isUUID = (id: string) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(id);
    };

    // Skip loading messages if this is a user ID, not a conversation ID
    if (!isUUID(activeConversationId)) {
      return;
    }

    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      
      try {
        console.log("Fetching messages for conversation:", activeConversationId);
        
        // Mark messages as read when loading the conversation
        await messagingService.markMessagesAsRead(activeConversationId, user.id);
        
        // Update conversations list to reflect read status
        setConversations(prevConversations => 
          prevConversations.map(conv => 
            conv.conversation_id === activeConversationId
              ? { ...conv, has_unread: false }
              : conv
          )
        );

        // Fetch messages
        const { data, error } = await messagingService.getConversationMessages(activeConversationId);
        
        if (error) {
          toast.error('Failed to load messages.');
          console.error('Error fetching messages:', error);
          setMessages([]);
        } else {
          console.log(`Loaded ${data?.length || 0} messages`);
          setMessages(data || []);
        }

        // Fetch conversation details to get the other participant's info
        const { data: conversationData, error: convoError } = await messagingService.getConversation(activeConversationId);
        if (convoError) {
          console.error('Error fetching conversation details:', convoError);
        } else if (conversationData) {
          const otherUser = conversationData.participants.find((p: any) => p.user_id !== user.id);
          if (otherUser?.user) {
            console.log("Found other participant:", otherUser.user);
            setOtherParticipant({
              id: otherUser.user.id,
              fullName: otherUser.user.fullName || '',
              email: otherUser.user.email || '',
              avatarUrl: otherUser.user.avatarUrl,
            });
          } else {
            console.warn("No other participant found in conversation");
            setOtherParticipant(null);
          }
        }
      } catch (error) {
        console.error("Error in fetchMessages:", error);
        toast.error("An error occurred while loading messages");
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchMessages();

    // Subscribe to real-time messages for the active conversation
    const subscription = messagingService.subscribeToConversation(
      activeConversationId,
      (newMessage: Message) => {
        console.log("New message received:", newMessage);
        setMessages((prevMessages) => {
          // Only add if it's a new message to prevent duplicates from initial fetch
          if (!prevMessages.some(msg => msg.id === newMessage.id)) {
            return [...prevMessages, newMessage];
          }
          return prevMessages;
        });
        
        // Mark message as read if it's from the other participant and we're actively viewing the conversation
        if (newMessage.sender_id !== user?.id) {
          console.log("Marking new message as read");
          messagingService.markMessagesAsRead(activeConversationId, user.id);
          
          // Update conversations list to reflect read status
          setConversations(prevConversations => 
            prevConversations.map(conv => 
              conv.conversation_id === activeConversationId
                ? { ...conv, has_unread: false }
                : conv
            )
          );
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, [activeConversationId, user?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessageContent.trim() || !activeConversationId || !user?.id) return;
    
    try {
      setIsSendingMessage(true);
      const { data, error } = await messagingService.sendMessage(
        activeConversationId,
        user.id,
        newMessageContent.trim()
      );
      
      if (error) {
        console.error('Error sending message:', error);
        
        // If sending fails, try checking and fixing the database setup
        console.log('Attempting to check and fix database setup...');
        const { data: setupFixed, error: setupError } = await messagingService.checkAndFixDatabaseSetup();
        
        if (setupError) {
          console.error('Failed to fix database setup:', setupError);
          toast.error('Failed to send message. Database setup could not be fixed.');
        } else if (setupFixed) {
          // Try sending the message again
          console.log('Database setup checked/fixed, trying to send message again...');
          const { data: retryData, error: retryError } = await messagingService.sendMessage(
            activeConversationId,
            user.id,
            newMessageContent.trim()
          );
          
          if (retryError) {
            console.error('Error sending message after setup fix:', retryError);
            toast.error('Failed to send message. Please try again later.');
          } else if (retryData) {
            // Success on retry
            setMessages((prev) => [...prev, retryData]);
            setNewMessageContent('');
            toast.success('Message sent successfully after fixing database setup.');
          }
        } else {
          toast.error('Failed to send message. Database setup may be incomplete.');
        }
      } else if (data) {
        // Optionally update local state with the sent message
        // The real-time subscription should eventually add it, but this can make it feel snappier.
        setMessages((prev) => [...prev, data]);
        setNewMessageContent('');
      }
    } catch (err) {
      console.error('Unexpected error sending message:', err);
      toast.error('An unexpected error occurred.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    console.log("handleSelectConversation called with:", conversationId);
    setActiveConversationId(conversationId);
  };

  // Function to create a new conversation
  const handleCreateNewConversation = async (otherUserId: string, appointmentId?: string) => {
    if (!user?.id) {
      toast.error("You must be logged in to create a conversation.");
      return;
    }
    setIsLoadingConversations(true);
    const { data: newConversationId, error } = await messagingService.getOrCreateConversation(
      user.id,
      otherUserId,
      appointmentId
    );

    if (error) {
      toast.error(`Failed to create new conversation: ${error}`);
      console.error("Error creating new conversation:", error);
    } else if (newConversationId) {
      toast.success("Conversation created successfully!");
      setActiveConversationId(newConversationId);
      // Reload conversations to ensure the new one is in the list
      const { data: updatedConversations, error: updateError } = await messagingService.getUserConversations(user.id);
      if (!updateError) {
        setConversations(updatedConversations || []);
      }
    }
    setIsLoadingConversations(false);
  };

  return {
    conversations,
    activeConversationId,
    messages,
    newMessageContent,
    isLoadingConversations,
    isLoadingMessages,
    isSendingMessage,
    otherParticipant,
    messagesEndRef,
    setNewMessageContent,
    handleSendMessage,
    handleSelectConversation,
    handleCreateNewConversation,
  };
}; 