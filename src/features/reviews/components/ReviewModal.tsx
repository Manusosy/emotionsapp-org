import { useState } from 'react';
import { useAuth } from '@/contexts/authContext';
import { ReviewRating } from '@/features/reviews/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { reviewsService } from '@/services';
import { supabase } from '@/lib/supabase';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  mentorId: string;
  mentorName: string;
  onSubmitReview?: () => void;
}

export function ReviewModal({ isOpen, onClose, appointmentId, mentorId, mentorName, onSubmitReview }: ReviewModalProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleRatingClick = (newRating: number) => {
    setRating(newRating);
  };

  const handleRatingHover = (newRating: number) => {
    setHoverRating(newRating);
  };

  const handleRatingLeave = () => {
    setHoverRating(0);
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to submit a review');
      return;
    }

    if (!appointmentId) {
      toast.error('Invalid appointment');
      return;
    }

    if (!mentorId) {
      toast.error('Invalid mentor');
      return;
    }

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    if (!reviewText.trim()) {
      toast.error('Please provide feedback in your review');
      return;
    }

    if (reviewText.length > 1000) {
      toast.error('Review text is too long. Please keep it under 1000 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { success, error } = await reviewsService.submitReview(
        appointmentId,
        mentorId,
        rating as ReviewRating,
        reviewText.trim(),
        user.id,
        isAnonymous
      );

      if (!success) {
        throw new Error(error || 'Failed to submit review');
      }

      toast.success('Thank you for your feedback!');
      
      // Test the new database functions
      console.log('🔍 Testing new database functions...');
      
      // Test get mentor reviews
      const reviewsResult = await reviewsService.getMentorReviews(mentorId);
      if (reviewsResult.success) {
        console.log('✅ Mentor reviews:', reviewsResult.data);
        toast.success(`Found ${reviewsResult.data?.length || 0} reviews for this mentor`);
      }
      
      // Test get mentor stats
      const statsResult = await reviewsService.getMentorReviewStats(mentorId);
      if (statsResult.success && statsResult.data) {
        console.log('✅ Mentor stats:', statsResult.data);
        const stats = statsResult.data;
        toast.success(
          `Stats: ${stats.average_rating}⭐ avg (${stats.total_reviews} reviews)`
        );
      }

      // Reset form
      setRating(0);
      setReviewText('');
      setIsAnonymous(false);
      // Call the onSubmitReview callback if provided
      if (onSubmitReview) {
        onSubmitReview();
      } else {
        onClose();
      }
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast.error(error.message || 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Rate Your Session</DialogTitle>
          <DialogDescription>
            Share your feedback about your session with {mentorName}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="rating" className="block text-sm font-medium">
              How would you rate your experience?
            </Label>
            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-8 w-8 cursor-pointer ${
                    (hoverRating || rating) >= star
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'fill-gray-200 text-gray-200'
                  } transition-colors`}
                  onClick={() => handleRatingClick(star)}
                  onMouseEnter={() => handleRatingHover(star)}
                  onMouseLeave={handleRatingLeave}
                />
              ))}
            </div>
            <div className="text-center text-sm text-muted-foreground">
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="review" className="block text-sm font-medium">
              Your Feedback
            </Label>
            <Textarea
              id="review"
              placeholder="Please share your experience with this mood mentor..."
              rows={5}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Your feedback helps other users find the right mood mentors for their needs.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
            />
            <Label
              htmlFor="anonymous"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Submit this review anonymously
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Review'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 