import { useState, useEffect } from "react";
import DashboardLayout from "@/features/dashboard/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TableHead, TableRow, TableHeader, TableCell, TableBody, Table } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Star, Filter, UserCheck, ThumbsUp, ThumbsDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useAuth } from "@/contexts/authContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { MoodMentorService } from '@/services/mood-mentor/mood-mentor.service';

interface Review {
  id: string;
  appointment_id: string;
  patient_id: string;
  patient: {
    name: string;
    avatar: string;
  };
  rating: number;
  review_text: string;
  status: 'pending' | 'published' | 'rejected';
  created_at: string;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const { user } = useAuth();
  const mentorService = new MoodMentorService();

  // Fetch reviews on component mount
  useEffect(() => {
    if (user) {
      fetchReviews();
    }
  }, [user]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      
      if (!user) return;

      // Use the service to get reviews with patient data - include all reviews regardless of status
      const serviceReviews = await mentorService.getMoodMentorReviews(user.id, { includeAll: true });
      
      if (serviceReviews.length === 0) {
        setReviews([]);
        return;
      }

      // Format the data to match our component's expected structure
      const formattedReviews = serviceReviews.map(review => ({
        id: review.id,
        appointment_id: review.appointmentId,
        patient_id: review.patientId,
        rating: review.rating,
        review_text: review.reviewText || '',
        status: review.status || 'pending',
        created_at: review.createdAt,
        patient: {
          name: review.patientName || 'Anonymous Patient',
          avatar: review.patientAvatar || '',
        }
      }));

      setReviews(formattedReviews);
    } catch (error: any) {
      console.error('Error fetching reviews:', error);
      toast.error(error.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  // Filter reviews based on active filter
  const filteredReviews = activeFilter === "all" 
    ? reviews 
    : reviews.filter(review => review.status === activeFilter);


  
  // Update review status to published
  const approveReview = async (id: string) => {
    try {
      // Use the service method instead of direct database calls
      const mentorService = new MoodMentorService();
      const success = await mentorService.updateReviewStatus(id, user?.id || '', 'published');

      if (!success) {
        throw new Error('Failed to approve review');
      }

      toast.success('Review approved');
      
      // Update local state
      setReviews(reviews.map(review => 
        review.id === id ? { ...review, status: 'published' } : review
      ));
    } catch (error: any) {
      console.error('Error approving review:', error);
      toast.error(error.message || 'Failed to approve review');
    }
  };

  // Update review status to rejected
  const rejectReview = async (id: string) => {
    try {
      // Use the service method instead of direct database calls
      const mentorService = new MoodMentorService();
      const success = await mentorService.updateReviewStatus(id, user?.id || '', 'rejected');

      if (!success) {
        throw new Error('Failed to reject review');
      }

      toast.success('Review rejected');
      
      // Update local state
      setReviews(reviews.map(review => 
        review.id === id ? { ...review, status: 'rejected' } : review
      ));
    } catch (error: any) {
      console.error('Error rejecting review:', error);
      toast.error(error.message || 'Failed to reject review');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Client Reviews</h1>
            <p className="text-muted-foreground">Manage your client testimonials and feedback</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={activeFilter === "all" ? "default" : "outline"} 
              size="sm"
              onClick={() => setActiveFilter("all")}
            >
              All
            </Button>
            <Button 
              variant={activeFilter === "published" ? "default" : "outline"} 
              size="sm"
              onClick={() => setActiveFilter("published")}
            >
              Published
            </Button>
            <Button 
              variant={activeFilter === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("pending")}
            >
              Pending
            </Button>
            <Button 
              variant={activeFilter === "rejected" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("rejected")}
            >
              Rejected
            </Button>
          </div>
        </div>
        
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">Client Testimonials</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="text-center p-8">
                <p className="text-muted-foreground">No reviews found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Review</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReviews.map(review => (
                    <TableRow key={review.id}>
                      <TableCell className="font-medium">{review.patient.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={16}
                              className={i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}
                            />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{review.review_text}</TableCell>
                      <TableCell>{format(parseISO(review.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            review.status === "published" ? "default" :
                            review.status === "pending" ? "outline" : "destructive"
                          }
                        >
                          {review.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {review.status === "pending" ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={() => approveReview(review.id)}
                            >
                              <ThumbsUp className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={() => rejectReview(review.id)}
                            >
                              <ThumbsDown className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        ) : review.status === "published" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => rejectReview(review.id)}
                          >
                            <ThumbsDown className="h-4 w-4 text-red-500" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => approveReview(review.id)}
                          >
                            <ThumbsUp className="h-4 w-4 text-green-500" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 