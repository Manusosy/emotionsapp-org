import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, MoreHorizontal, MessageSquare, ThumbsUp, ThumbsDown, Flag, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Review, ReviewStatus } from '../types';

export interface ReviewsTableProps {
  reviews: Review[];
  isLoading: boolean;
  onViewReview: (reviewId: string) => void;
  onApproveReview: (reviewId: string) => void;
  onRejectReview: (reviewId: string) => void;
  onFlagReview: (reviewId: string) => void;
  onRespondToReview: (reviewId: string) => void;
}

export function ReviewsTable({
  reviews,
  isLoading,
  onViewReview,
  onApproveReview,
  onRejectReview,
  onFlagReview,
  onRespondToReview,
}: ReviewsTableProps) {
  // Define local state for potentially expanded rows or other UI states
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);

  // Toggle expanded row
  const toggleExpanded = (reviewId: string) => {
    if (expandedReviewId === reviewId) {
      setExpandedReviewId(null);
    } else {
      setExpandedReviewId(reviewId);
    }
  };

  // Helper to render star rating
  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  // Helper to render status badge
  const renderStatusBadge = (status: ReviewStatus) => {
    switch (status) {
      case 'published':
        return <Badge variant="success">Published</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'flagged':
        return <Badge variant="warning">Flagged</Badge>;
      default:
        return null;
    }
  };

  // Display empty state if no reviews
  if (!isLoading && reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="rounded-full bg-muted p-3">
          <MessageSquare className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-medium">No reviews yet</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          When patients leave reviews for your services, they will appear here.
        </p>
        <Button className="mt-4" variant="outline" onClick={() => {}}>
          Request Reviews
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead className="hidden md:table-cell">Review</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                <div className="flex justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600"></div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">Loading reviews...</div>
              </TableCell>
            </TableRow>
          ) : (
            reviews.map((review) => (
              <TableRow key={review.id} className="group">
                <TableCell className="font-medium">{review.patient.name}</TableCell>
                <TableCell>{renderStars(review.rating)}</TableCell>
                <TableCell className="hidden md:table-cell max-w-xs truncate">
                  {review.content}
                </TableCell>
                <TableCell>
                  {format(parseISO(review.createdAt), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>{renderStatusBadge(review.status)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px]">
                      <DropdownMenuItem onClick={() => onViewReview(review.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      {review.status === 'pending' && (
                        <>
                          <DropdownMenuItem onClick={() => onApproveReview(review.id)}>
                            <ThumbsUp className="mr-2 h-4 w-4" />
                            Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRejectReview(review.id)}>
                            <ThumbsDown className="mr-2 h-4 w-4" />
                            Reject
                          </DropdownMenuItem>
                        </>
                      )}
                      {review.status !== 'flagged' && (
                        <DropdownMenuItem onClick={() => onFlagReview(review.id)}>
                          <Flag className="mr-2 h-4 w-4" />
                          Flag
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onRespondToReview(review.id)}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Respond
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
} 