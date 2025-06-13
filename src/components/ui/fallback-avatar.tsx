import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';

// Public avatar services that don't require authentication
const AVATAR_SERVICES = [
  {
    name: 'DiceBear',
    getUrl: (text: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(text)}`,
  },
  {
    name: 'Gravatar',
    getUrl: (text: string) => {
      // Create a simple hash of the text
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash = hash & hash; // Convert to 32bit integer
      }
      return `https://www.gravatar.com/avatar/${Math.abs(hash)}?d=identicon&s=200`;
    },
  },
  {
    name: 'RoboHash',
    getUrl: (text: string) => `https://robohash.org/${encodeURIComponent(text)}?set=set4&size=200x200`,
  }
];

interface FallbackAvatarProps {
  src?: string;
  name: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const FallbackAvatar: React.FC<FallbackAvatarProps> = ({
  src,
  name,
  className = 'h-10 w-10',
  onLoad,
  onError
}) => {
  const [imgSrc, setImgSrc] = useState<string | undefined>(src);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [isError, setIsError] = useState(false);
  const [initials, setInitials] = useState('');

  useEffect(() => {
    // Reset state when props change
    setImgSrc(src);
    setIsError(false);
    setFallbackIndex(0);
    
    // Add more verbose logging
    console.log('FallbackAvatar - Source URL:', src);
    
    // Generate initials from name
    if (name) {
      const nameParts = name.split(' ');
      if (nameParts.length >= 2) {
        setInitials(`${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase());
      } else if (nameParts.length === 1 && nameParts[0].length > 0) {
        setInitials(nameParts[0].substring(0, 2).toUpperCase());
      } else {
        setInitials('??');
      }
    } else {
      setInitials('??');
    }
  }, [src, name]);

  const handleError = () => {
    console.error('FallbackAvatar - Error loading image from URL:', imgSrc);
    
    setIsError(true);
    
    // Try next fallback service
    if (fallbackIndex < AVATAR_SERVICES.length) {
      const service = AVATAR_SERVICES[fallbackIndex];
      const newUrl = service.getUrl(name || 'unknown');
      console.log(`FallbackAvatar - Trying fallback service ${service.name}:`, newUrl);
      setImgSrc(newUrl);
      setFallbackIndex(fallbackIndex + 1);
    }
    
    if (onError) {
      onError();
    }
  };

  const handleLoad = () => {
    console.log('FallbackAvatar - Successfully loaded image from URL:', imgSrc);
    
    setIsError(false);
    if (onLoad) {
      onLoad();
    }
  };

  return (
    <Avatar className={className}>
      {imgSrc && (
        <AvatarImage
          src={imgSrc}
          alt={`${name || 'User'}'s avatar`}
          onError={handleError}
          onLoad={handleLoad}
        />
      )}
      <AvatarFallback className="bg-blue-600 text-white text-lg">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};

export default FallbackAvatar; 