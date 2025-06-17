import { useAuth } from '@/contexts/authContext';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5),
  comment: z.string().min(10, 'Please provide at least 10 characters').max(500),
});

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId?: string;
  mentorId?: string;
  mentorName?: string;
}

export function ReviewModal({
  isOpen,
  onClose,
  appointmentId,
  mentorId,
  mentorName,
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rating: 0,
      comment: '',
    },
  });

  const { user } = useAuth();

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);

      if (!user) {
        toast.error('You must be logged in to submit a review');
        return;
      }

      if (!appointmentId || !mentorId) {
        toast.error('Missing appointment or mentor information');
        return;
      }

      // Check if the patient can review this appointment
      const { data: canReview, error: checkError } = await supabase
        .rpc('can_patient_review_appointment', { 
          appointment_id: appointmentId,
          patient_uuid: user.id
        });
      
      if (checkError) {
        console.error("Error checking if can review:", checkError);
        throw new Error("Couldn't verify if you can review this appointment");
      }
      
      if (!canReview) {
        toast.error('You cannot review this appointment. It may already be reviewed or not completed.');
        return;
      }

      // Add review using the standardized table
      const { error } = await supabase
        .from('mentor_reviews')
        .insert({
          appointment_id: appointmentId,
          mentor_id: mentorId,
          patient_id: user.id,
          rating: values.rating,
          review_text: values.comment,
          status: 'pending' // Reviews are pending until approved by the mentor
        });

      if (error) throw error;

      toast.success('Review submitted successfully! It will be visible after approval.');
      onClose();
      form.reset();
    } catch (error: any) {
      toast.error('Failed to submit review: ' + error.message);
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRatingClick = (selectedRating: number) => {
    setRating(selectedRating);
    form.setValue('rating', selectedRating);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rate Your Session</DialogTitle>
          <DialogDescription>
            Share your experience with {mentorName}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="rating"
              render={() => (
                <FormItem>
                  <FormLabel>Rating</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Button
                          key={star}
                          variant="ghost"
                          size="icon"
                          type="button"
                          className="hover:bg-transparent"
                          onMouseEnter={() => setHoveredRating(star)}
                          onMouseLeave={() => setHoveredRating(0)}
                          onClick={() => handleRatingClick(star)}
                        >
                          <Star
                            className={`h-6 w-6 ${
                              star <= (hoveredRating || rating)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </Button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Review</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share your experience with this mood mentor..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || rating === 0}>
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 


