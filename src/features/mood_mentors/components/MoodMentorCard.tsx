import { useState } from 'react';
import { Heart, Star, MapPin, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import BookingButton from '@/features/booking/components/BookingButton';
import { slugify } from '@/utils/formatters';

interface MoodMentorCardProps {
  id: string;
  name: string;
  location: string;
  rating: number;
  imageUrl: string;
  isAvailable: boolean;
  specialty?: string;
  education?: string | {degree: string, institution: string, year: string} | Array<{degree: string, institution: string, year: string}>;
  onFavorite?: () => void;
  isFavorited?: boolean;
}

export function MoodMentorCard({
  id,
  name,
  location,
  rating,
  imageUrl,
  isAvailable,
  specialty,
  education,
  onFavorite,
  isFavorited = false,
}: MoodMentorCardProps) {
  const navigate = useNavigate();

  // Format education appropriately based on its type
  const getFormattedEducation = () => {
    if (!education) return null;
    
    if (typeof education === 'string') {
      return education;
    } else if (Array.isArray(education) && education.length > 0) {
      return education[0].degree || '';
    } else if (typeof education === 'object' && 'degree' in education) {
      return education.degree || '';
    }
    
    return null;
  };

  const handleViewProfile = () => {
    // Generate name-based slug
    const nameSlug = slugify(name);
    
    // Use ID as-is (don't use parseInt which can cause errors with UUID strings)
    navigate(`/mood-mentor/${nameSlug}?id=${id}`);
  };

  return (
    <Card className="overflow-hidden max-w-[400px] mx-auto md:max-w-none bg-white">
      <div className="relative">
        {/* Rating Badge - Desktop */}
        <div className="absolute top-4 left-4 z-10 hidden md:block">
          <Badge variant="secondary" className="bg-white/90 text-primary">
            ★ {rating.toFixed(1)}
          </Badge>
        </div>

        {/* Favorite Button - Desktop */}
        {onFavorite && (
          <button
            onClick={onFavorite}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/90 hover:bg-white transition-colors hidden md:block"
          >
            <Heart
              className={isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-500'}
              size={20}
            />
          </button>
        )}

        {/* Mobile Layout */}
        <div className="md:hidden p-4 pb-3">
          <div className="flex gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
              <img
                src={imageUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-base font-semibold leading-tight truncate">
                  {name}
                </h3>
                {onFavorite && (
                  <button
                    onClick={onFavorite}
                    className="flex-shrink-0 p-1 -mt-0.5 rounded-full hover:bg-gray-100"
                  >
                    <Heart
                      className={isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-400'}
                      size={16}
                    />
                  </button>
                )}
              </div>
              <div className="mb-1.5">
                <Badge className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0" variant="outline">
                  {specialty || 'General Practitioner'}
                </Badge>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin size={10} className="flex-shrink-0" />
                  <span className="truncate">{location}</span>
                </div>
                {getFormattedEducation() && (
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <GraduationCap size={10} className="flex-shrink-0" />
                    <span className="truncate">{getFormattedEducation()}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-2.5 mb-2">
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-medium">{rating || 'No rating yet'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isAvailable ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                  <span className={`text-[11px] ${isAvailable ? 'text-green-600' : 'text-gray-500'}`}>
                    {isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </div>
              </div>
              <div className="space-y-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewProfile}
                  className="w-full text-xs h-7 rounded"
                >
                  View Profile
                </Button>
                {isAvailable && (
                  <Button
                    size="sm"
                    onClick={handleViewProfile}
                    className="w-full text-xs h-7 rounded"
                  >
                    Book Appointment
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:block">
          <div 
            className="relative h-64 overflow-hidden cursor-pointer"
            onClick={handleViewProfile}
          >
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover transition-transform hover:scale-105"
            />
          </div>
          <div className="p-6">
            {specialty && (
              <Badge className="mb-2 bg-blue-100 text-blue-800 hover:bg-blue-200" variant="outline">
                {specialty}
              </Badge>
            )}

            <h3 
              className="text-2xl font-semibold mb-2 cursor-pointer hover:text-primary transition-colors"
              onClick={handleViewProfile}
            >
              {name}
            </h3>

            {getFormattedEducation() && (
              <p className="text-muted-foreground mb-2">
                {getFormattedEducation()}
              </p>
            )}
            
            <p className="text-muted-foreground mb-4">
              📍 {location} • 30 Min
            </p>

            <div className="flex items-center gap-2 mb-4">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isAvailable ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
              <span className={isAvailable ? 'text-green-600' : 'text-gray-500'}>
                {isAvailable ? 'Available' : 'Unavailable'}
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewProfile}
                className="flex-1"
              >
                View Profile
              </Button>
              <BookingButton
                moodMentorId={id}
                moodMentorName={name}
                disabled={!isAvailable}
                size="sm"
                className={`${!isAvailable ? "opacity-50 cursor-not-allowed" : ""} flex-1`}
                variant="default"
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
} 