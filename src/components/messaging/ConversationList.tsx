import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import FallbackAvatar from "@/components/ui/fallback-avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Spinner } from '@/components/ui/spinner';

export interface ConversationUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
  role: 'patient' | 'mood_mentor';
}

export interface ConversationItem {
  id: string;
  otherUser: ConversationUser;
  lastMessage: {
    content: string;
    timestamp: string;
    unread: boolean;
  };
}

interface ConversationListProps {
  conversations: ConversationItem[];
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  isLoading?: boolean;
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  isLoading = false,
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
        <p>No conversations yet</p>
        <p className="text-sm mt-1">Start a new conversation to begin chatting</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {conversations.map((conversation) => (
          <Button
            key={conversation.id}
            variant="ghost"
            className={`w-full justify-start px-2 py-6 h-auto ${
              activeConversationId === conversation.id ? 'bg-accent' : ''
            }`}
            onClick={() => onSelectConversation(conversation.id)}
          >
            <div className="flex items-start w-full">
              <FallbackAvatar
                src={conversation.otherUser.avatarUrl}
                name={conversation.otherUser.name}
                className="h-10 w-10 mr-3 flex-shrink-0"
              />
              <div className="flex-1 overflow-hidden text-left">
                <div className="flex justify-between items-center">
                  <span className="font-medium truncate">{conversation.otherUser.name}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                    {formatDistanceToNow(new Date(conversation.lastMessage.timestamp), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.lastMessage.content || 'No messages yet'}
                  </p>
                  {conversation.lastMessage.unread && (
                    <Badge className="ml-2 bg-blue-600" variant="default">
                      New
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </Button>
        ))}
      </div>
    </ScrollArea>
  );
} 