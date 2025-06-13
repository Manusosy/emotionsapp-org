import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import FallbackAvatar from '@/components/ui/fallback-avatar';
import { format } from 'date-fns';

interface MessageBubbleProps {
  content: string;
  timestamp: string;
  isCurrentUser: boolean;
  senderName: string;
  avatarUrl?: string | null;
  read?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  content,
  timestamp,
  isCurrentUser,
  senderName,
  avatarUrl,
  read = false,
}) => {
  const bubbleClass = isCurrentUser
    ? 'bg-primary text-primary-foreground self-end rounded-br-none'
    : 'bg-muted text-muted-foreground self-start rounded-bl-none';
  const alignmentClass = isCurrentUser ? 'items-end' : 'items-start';

  return (
    <div className={`flex flex-col ${alignmentClass} max-w-[70%]`}>
      <div className={`flex items-center gap-2 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <FallbackAvatar 
          src={avatarUrl || undefined}
          name={senderName}
          className="h-8 w-8"
        />
        <div className="font-medium text-sm">
          {isCurrentUser ? 'You' : senderName}
        </div>
      </div>
      <div className={`p-3 rounded-lg mt-1 ${bubbleClass}`}>
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      </div>
      <div className={`text-xs text-muted-foreground mt-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
        <span>{format(new Date(timestamp), 'MMM d, h:mm a')}</span>
        {isCurrentUser && (
          <span className="ml-2">
            {read ? 'Read' : 'Sent'}
          </span>
        )}
      </div>
    </div>
  );
}; 