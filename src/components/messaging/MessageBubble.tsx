import React from 'react';
import { format } from 'date-fns';
import { Check, CheckCheck } from 'lucide-react';
import FallbackAvatar from '@/components/ui/fallback-avatar';

interface MessageBubbleProps {
  content: string;
  timestamp: string;
  isCurrentUser: boolean;
  avatarUrl?: string;
  senderName: string;
  read?: boolean;
}

export function MessageBubble({
  content,
  timestamp,
  isCurrentUser,
  avatarUrl,
  senderName,
  read = false,
}: MessageBubbleProps) {
  return (
    <div
      className={`flex items-start gap-2 ${
        isCurrentUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      <FallbackAvatar
        src={avatarUrl}
        name={senderName}
        className="h-8 w-8 flex-shrink-0"
      />
      <div
        className={`flex flex-col ${
          isCurrentUser ? 'items-end' : 'items-start'
        }`}
      >
        <div
          className={`px-3 py-2 rounded-lg max-w-[80%] ${
            isCurrentUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          <p className="text-sm">{content}</p>
        </div>
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <span>{format(new Date(timestamp), 'h:mm a')}</span>
          {isCurrentUser && (
            <span className="ml-1">
              {read ? (
                <CheckCheck className="h-3 w-3 text-blue-500" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
} 