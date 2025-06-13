import { useState } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, X, ExternalLink, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'new-feature';
  date: string;
  link?: {
    url: string;
    label: string;
  };
}

interface AnnouncementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: Announcement;
}

export function AnnouncementDialog({
  isOpen,
  onClose,
  announcement,
}: AnnouncementDialogProps) {
  const [expanded, setExpanded] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  
  if (!isOpen) return null;

  // Type-based styling
  const typeConfig = {
    'info': {
      accent: 'bg-blue-500',
      badge: 'bg-blue-100 text-blue-800',
      badgeText: 'Information'
    },
    'warning': {
      accent: 'bg-amber-500',
      badge: 'bg-amber-100 text-amber-800',
      badgeText: 'Important'
    },
    'success': {
      accent: 'bg-green-500',
      badge: 'bg-green-100 text-green-800',
      badgeText: 'Success'
    },
    'new-feature': {
      accent: 'bg-purple-500',
      badge: 'bg-purple-100 text-purple-800',
      badgeText: 'New Feature'
    }
  };

  const config = typeConfig[announcement.type];

  return (
    <motion.div
      className="fixed bottom-6 right-6 z-50 w-96 shadow-xl rounded-xl bg-white overflow-hidden border border-gray-200"
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      <div className={`h-2 w-full ${config.accent}`} />
      
      <div className="flex justify-between items-start p-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gray-100 rounded-full">
            <Megaphone className="h-4 w-4 text-gray-600" />
          </div>
          <h3 className="font-semibold text-gray-800">{announcement.title}</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-8 w-8 -mt-1 -mr-1 text-gray-400 hover:bg-gray-100"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="px-4 pt-0 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className={config.badge}>
            {config.badgeText}
          </Badge>
          <span className="text-xs text-gray-500">{announcement.date}</span>
        </div>
        
        <motion.div
          className="text-sm text-gray-600"
          initial={{ height: expanded ? 'auto' : '4.5rem' }}
          animate={{ height: expanded ? 'auto' : '4.5rem' }}
          transition={{ duration: 0.3 }}
          style={{ overflow: 'hidden' }}
        >
          <p className="whitespace-pre-line">{announcement.content}</p>
          
          {announcement.link && (
            <a 
              href={announcement.link.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 mt-3 font-medium text-sm"
            >
              {announcement.link.label}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </motion.div>
        
        {!expanded && announcement.content.length > 150 && (
          <button
            onClick={() => setExpanded(true)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-1"
          >
            Read more
          </button>
        )}
      </div>
      
      <div className="bg-gray-50 p-3 flex justify-between items-center border-t border-gray-100">
        {!acknowledged ? (
          <Button 
            className="w-full bg-gray-900 text-white hover:bg-gray-800"
            size="sm"
            onClick={() => {
              setAcknowledged(true);
              setTimeout(() => onClose(), 1000);
            }}
          >
            <ThumbsUp className="h-4 w-4 mr-2" />
            Acknowledge
          </Button>
        ) : (
          <motion.p 
            className="text-sm text-green-600 font-medium w-full text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Thank you for acknowledging!
          </motion.p>
        )}
      </div>
    </motion.div>
  );
} 