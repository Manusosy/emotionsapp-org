import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { format } from 'date-fns';
import { MoodMentorService } from '@/services/mood-mentor/mood-mentor.service';
import { MoodMentorReview } from '@/services/mood-mentor/mood-mentor.interface';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  users: {
    full_name: string;
    avatar_url: string;
  } | null;
}

interface ReviewListProps {
  moodMentorId: string;
}

export function ReviewList({ moodMentorId }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const mentorService = new MoodMentorService();

  useEffect(() => {
    loadReviews();
  }, [moodMentorId]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      
      // Use the service to get reviews with patient data in one call
      const serviceReviews = await mentorService.getMoodMentorReviews(moodMentorId);
      
      if (serviceReviews.length === 0) {
        setReviews([]);
        return;
      }
      
      // Convert service reviews to component format
      const formattedReviews = serviceReviews.map((review: MoodMentorReview) => ({
        id: review.id,
        rating: review.rating,
        comment: review.reviewText,
        created_at: review.createdAt,
        users: {
          full_name: review.patientName || 'Anonymous User',
          avatar_url: review.patientAvatar || '/default-avatar.png'
        }
      })) as Review[];
      
      setReviews(formattedReviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading reviews...</div>;
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No reviews yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <Card key={review.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <img
                  src={review.users?.avatar_url || '/default-avatar.png'}
                  alt={`${review.users?.full_name || 'Anonymous User'}'s avatar`}
                  className="h-10 w-10 rounded-full"
                />
                <div>
                  <CardTitle className="text-sm font-medium">
                    {review.users?.full_name || 'Anonymous User'}
                  </CardTitle>
                  <CardDescription>
                    {format(new Date(review.created_at), 'PPP')}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < review.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{review.comment}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 


