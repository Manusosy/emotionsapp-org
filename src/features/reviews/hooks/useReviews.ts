import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/authContext';
import { reviewsService } from '@/services';
import { Review, ReviewFilter, ReviewStats, ReviewStatus, ReviewResponse, ReviewNote } from '../types';
import { toast } from 'sonner';

export function useReviews(initialFilter?: Partial<ReviewFilter>) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<ReviewStats>({
    totalReviews: 0,
    averageRating: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    statusDistribution: {
      pending: 0,
      published: 0,
      rejected: 0,
      flagged: 0,
    },
    pendingCount: 0,
    publishedCount: 0,
    rejectedCount: 0,
    flaggedCount: 0,
    reviewsOverTime: [],
  });
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  
  const [filter, setFilter] = useState<ReviewFilter>({
    status: initialFilter?.status || 'all',
    rating: initialFilter?.rating || 'all',
    dateRange: initialFilter?.dateRange || null,
    search: initialFilter?.search || '',
    sortBy: initialFilter?.sortBy || 'date',
    sortOrder: initialFilter?.sortOrder || 'desc',
  });

  // Fetch reviews based on current filter
  const fetchReviews = useCallback(async () => {
    try {
      setIsLoading(true);

      if (!user) {
        throw new Error('User not authenticated');
      }

      const { success, data, error } = await reviewsService.getReviews(user.id, filter);

      if (!success || !data) {
        throw new Error(error || 'Failed to fetch reviews');
      }

      setReviews(data);
    } catch (error: any) {
      console.error('Error fetching reviews:', error);
      toast.error(error.message || 'Failed to load reviews');
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, filter]);

  // Fetch review stats
  const fetchStats = useCallback(async () => {
    try {
      setIsStatsLoading(true);

      if (!user) {
        throw new Error('User not authenticated');
      }

      const { success, data, error } = await reviewsService.getReviewStats(user.id);

      if (!success || !data) {
        throw new Error(error || 'Failed to fetch review stats');
      }

      setStats(data);
    } catch (error: any) {
      console.error('Error fetching review stats:', error);
      toast.error('Failed to load review statistics');
    } finally {
      setIsStatsLoading(false);
    }
  }, [user]);

  // Load data on initial render and filter change
  useEffect(() => {
    if (user) {
      fetchReviews();
      fetchStats();
    }
  }, [user, fetchReviews, fetchStats]);

  // Update filter
  const updateFilter = useCallback((newFilter: Partial<ReviewFilter>) => {
    setFilter(current => ({ ...current, ...newFilter }));
  }, []);

  // Reset filter
  const resetFilter = useCallback((keepStatus = false) => {
    setFilter(current => ({
      status: keepStatus ? current.status : 'all',
      rating: 'all',
      dateRange: null,
      search: '',
      sortBy: 'date',
      sortOrder: 'desc',
    }));
  }, []);

  // Get a single review by ID
  const getReviewById = useCallback(async (reviewId: string): Promise<Review | null> => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { success, data, error } = await reviewsService.getReviewById(reviewId);

      if (!success || !data) {
        throw new Error(error || 'Failed to fetch review');
      }

      return data;
    } catch (error: any) {
      console.error('Error fetching review:', error);
      toast.error(error.message || 'Failed to load review details');
      return null;
    }
  }, [user]);

  // Update review status
  const updateReviewStatus = useCallback(async (
    reviewId: string,
    status: ReviewStatus,
    reason?: string
  ): Promise<Review | null> => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { success, data, error } = await reviewsService.updateReviewStatus(
        reviewId,
        user.id,
        status,
        reason
      );

      if (!success || !data) {
        throw new Error(error || `Failed to update review status to ${status}`);
      }

      // Update the reviews list
      setReviews(current => 
        current.map(review => (review.id === reviewId ? data : review))
      );

      // Update stats
      fetchStats();

      return data;
    } catch (error: any) {
      console.error('Error updating review status:', error);
      toast.error(error.message || `Failed to update review status to ${status}`);
      return null;
    }
  }, [user, fetchStats]);

  // Respond to a review
  const respondToReview = useCallback(async (
    reviewId: string,
    content: string,
    isPublished: boolean = true
  ): Promise<ReviewResponse | null> => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { success, data, error } = await reviewsService.respondToReview(
        reviewId,
        user.id,
        content,
        isPublished
      );

      if (!success || !data) {
        throw new Error(error || 'Failed to respond to review');
      }

      // Update the reviews list
      setReviews(current =>
        current.map(review =>
          review.id === reviewId ? { ...review, response: data } : review
        )
      );

      return data;
    } catch (error: any) {
      console.error('Error responding to review:', error);
      toast.error(error.message || 'Failed to respond to review');
      return null;
    }
  }, [user]);

  // Delete a response
  const deleteResponse = useCallback(async (
    responseId: string
  ): Promise<boolean> => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { success, error } = await reviewsService.deleteReviewResponse(
        responseId,
        user.id
      );

      if (!success) {
        throw new Error(error || 'Failed to delete response');
      }

      // Update the reviews list
      setReviews(current =>
        current.map(review =>
          review.response?.id === responseId
            ? { ...review, response: null }
            : review
        )
      );

      return true;
    } catch (error: any) {
      console.error('Error deleting response:', error);
      toast.error(error.message || 'Failed to delete response');
      return false;
    }
  }, [user]);

  // Add a note to a review
  const addNote = useCallback(async (
    reviewId: string,
    content: string
  ): Promise<ReviewNote | null> => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { success, data, error } = await reviewsService.addReviewNote(
        reviewId,
        user.id,
        content
      );

      if (!success || !data) {
        throw new Error(error || 'Failed to add note');
      }

      // Update the reviews list
      setReviews(current =>
        current.map(review =>
          review.id === reviewId
            ? {
                ...review,
                notes: [...(review.notes || []), data],
              }
            : review
        )
      );

      return data;
    } catch (error: any) {
      console.error('Error adding note:', error);
      toast.error(error.message || 'Failed to add note');
      return null;
    }
  }, [user]);

  // Export reviews
  const exportReviews = useCallback(async (
    format: 'csv' | 'pdf' = 'csv'
  ): Promise<string | null> => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { success, data, error } = await reviewsService.exportReviews(
        user.id,
        filter,
        format
      );

      if (!success || !data) {
        throw new Error(error || `Failed to export reviews as ${format}`);
      }

      return data;
    } catch (error: any) {
      console.error('Error exporting reviews:', error);
      toast.error(error.message || `Failed to export reviews as ${format}`);
      return null;
    }
  }, [user, filter]);

  return {
    reviews,
    isLoading,
    stats,
    isStatsLoading,
    filter,
    updateFilter,
    resetFilter,
    fetchReviews,
    fetchStats,
    getReviewById,
    updateReviewStatus,
    respondToReview,
    deleteResponse,
    addNote,
    exportReviews
  };
} 