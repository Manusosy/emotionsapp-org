import { supabase } from '@/lib/supabase';
import {
  Review,
  ReviewFilter,
  ReviewNote,
  ReviewRating,
  ReviewRequestLink,
  ReviewResponse,
  ReviewStats,
  ReviewStatus,
} from '@/features/reviews/types';
import { IReviewsService, ReviewsServiceResponse } from './reviews.interface';
import { format, parseISO, subDays, subMonths } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

// Use uuid instead of crypto for compatibility
const crypto = {
  randomUUID: () => uuidv4()
};

class ReviewsService implements IReviewsService {
  /**
   * Get all reviews for a mentor with optional filtering
   */
  async getReviews(
    mentorId: string,
    filters?: ReviewFilter
  ): Promise<ReviewsServiceResponse<Review[]>> {
    try {
      if (!mentorId) {
        return {
          success: false,
          data: null,
          error: 'Mentor ID is required',
        };
      }

      // Start building our query
      let query = supabase
        .from('mentor_reviews')
        .select(`
          *,
          review_responses (
            id,
            review_id,
            mentor_id,
            content,
            created_at,
            updated_at,
            published_at,
            is_published
          ),
          review_notes (
            id,
            review_id,
            mentor_id,
            content,
            created_at,
            updated_at
          )
        `)
        .eq('mentor_id', mentorId);

      // Apply filters if provided
      if (filters) {
        // Status filter
        if (filters.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }

        // Rating filter
        if (filters.rating && filters.rating !== 'all') {
          query = query.eq('rating', filters.rating);
        }

        // Date range filter
        if (filters.dateRange) {
          if (filters.dateRange.start) {
            query = query.gte('created_at', filters.dateRange.start);
          }
          if (filters.dateRange.end) {
            query = query.lte('created_at', filters.dateRange.end);
          }
        }

        // Search filter
        if (filters.search && filters.search.trim() !== '') {
          const searchQuery = `%${filters.search.toLowerCase()}%`;
          query = query.or(`content.ilike.${searchQuery},patients(full_name).ilike.${searchQuery}`);
        }

        // Sorting
        if (filters.sortBy) {
          const column = 
            filters.sortBy === 'date' ? 'created_at' : 
            filters.sortBy === 'rating' ? 'rating' : 'status';
          
          const order = filters.sortOrder === 'asc' ? true : false;
          query = query.order(column, { ascending: order });
        } else {
          // Default sort by most recent
          query = query.order('created_at', { ascending: false });
        }
      } else {
        // Default sort by most recent
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data to match our Review interface
      const reviews: Review[] = data.map((item) => ({
        id: item.id,
        appointmentId: item.appointment_id,
        mentorId: item.mentor_id,
        patientId: item.patient_id,
        patient: {
          id: item.patient_id || '',
          name: 'Anonymous Patient',
          avatarUrl: null,
          email: undefined,
        },
        rating: item.rating as ReviewRating,
        content: item.review_text || '',
        status: item.status as ReviewStatus,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        publishedAt: item.published_at,
        response: item.review_responses && item.review_responses.length > 0 ? {
          id: item.review_responses[0].id,
          reviewId: item.review_responses[0].review_id,
          mentorId: item.review_responses[0].mentor_id,
          content: item.review_responses[0].content,
          createdAt: item.review_responses[0].created_at,
          updatedAt: item.review_responses[0].updated_at,
          publishedAt: item.review_responses[0].published_at,
          isPublished: item.review_responses[0].is_published,
        } : null,
        notes: item.review_notes ? item.review_notes.map((note: any) => ({
          id: note.id,
          reviewId: note.review_id,
          mentorId: note.mentor_id,
          content: note.content,
          createdAt: note.created_at,
          updatedAt: note.updated_at,
        })) : [],
        isFeatured: item.is_featured || false,
        displayOrder: item.display_order || 0,
        keywords: item.keywords || [],
        tags: item.tags || [],
      }));

      return {
        success: true,
        data: reviews,
        error: null,
      };
    } catch (error: any) {
      console.error('Error fetching reviews:', error);
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to fetch reviews',
      };
    }
  }

  /**
   * Get a specific review by ID
   */
  async getReviewById(reviewId: string): Promise<ReviewsServiceResponse<Review>> {
    try {
      if (!reviewId) {
        return {
          success: false,
          data: null,
          error: 'Review ID is required',
        };
      }

      const { data: item, error } = await supabase
        .from('mentor_reviews')
        .select(`
          *,
          review_responses (
            id,
            review_id,
            mentor_id,
            content,
            created_at,
            updated_at,
            published_at,
            is_published
          ),
          review_notes (
            id,
            review_id,
            mentor_id,
            content,
            created_at,
            updated_at
          )
        `)
        .eq('id', reviewId)
        .single();

      if (error) throw error;
      if (!item) throw new Error('Review not found');

      // Transform to our Review interface
      const review: Review = {
        id: item.id,
        appointmentId: item.appointment_id,
        mentorId: item.mentor_id,
        patientId: item.patient_id,
        patient: {
          id: item.patient_id || '',
          name: 'Anonymous Patient',
          avatarUrl: null,
          email: undefined,
        },
        rating: item.rating as ReviewRating,
        content: item.review_text || '',
        status: item.status as ReviewStatus,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        publishedAt: item.published_at,
        response: item.review_responses && item.review_responses.length > 0 ? {
          id: item.review_responses[0].id,
          reviewId: item.review_responses[0].review_id,
          mentorId: item.review_responses[0].mentor_id,
          content: item.review_responses[0].content,
          createdAt: item.review_responses[0].created_at,
          updatedAt: item.review_responses[0].updated_at,
          publishedAt: item.review_responses[0].published_at,
          isPublished: item.review_responses[0].is_published,
        } : null,
        notes: item.review_notes ? item.review_notes.map((note: any) => ({
          id: note.id,
          reviewId: note.review_id,
          mentorId: note.mentor_id,
          content: note.content,
          createdAt: note.created_at,
          updatedAt: note.updated_at,
        })) : [],
        isFeatured: item.is_featured || false,
        displayOrder: item.display_order || 0,
        keywords: item.keywords || [],
        tags: item.tags || [],
      };

      return {
        success: true,
        data: review,
        error: null,
      };
    } catch (error: any) {
      console.error('Error fetching review by ID:', error);
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to fetch review',
      };
    }
  }

  /**
   * Update review status
   */
  async updateReviewStatus(
    reviewId: string,
    mentorId: string,
    status: ReviewStatus,
    reason?: string
  ): Promise<ReviewsServiceResponse<Review>> {
    try {
      if (!reviewId || !mentorId || !status) {
        return {
          success: false,
          data: null,
          error: 'Review ID, mentor ID, and status are required',
        };
      }

      // Verify the review belongs to this mentor
      const { data: checkData, error: checkError } = await supabase
        .from('mentor_reviews')
        .select('id, published_at')
        .eq('id', reviewId)
        .eq('mentor_id', mentorId)
        .single();

      if (checkError || !checkData) {
        return {
          success: false,
          data: null,
          error: 'Review not found or does not belong to this mentor',
        };
      }

      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      // If publishing, set published_at
      if (status === 'published' && !checkData.published_at) {
        updateData.published_at = new Date().toISOString();
      }

      // If rejection includes a reason, store it
      if (status === 'rejected' && reason) {
        updateData.rejection_reason = reason;
      }

      const { error } = await supabase
        .from('mentor_reviews')
        .update(updateData)
        .eq('id', reviewId);

      if (error) throw error;

      // Get the updated review
      return this.getReviewById(reviewId);
    } catch (error: any) {
      console.error('Error updating review status:', error);
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to update review status',
      };
    }
  }

  // Implementation of the rest of the interface methods will come in subsequent edits
  // to keep the file size manageable
  
  /**
   * Add or update a response to a review
   */
  async respondToReview(
    reviewId: string,
    mentorId: string,
    content: string,
    isPublished: boolean = false
  ): Promise<ReviewsServiceResponse<ReviewResponse>> {
    try {
      // More implementation details will come in subsequent edits
      throw new Error("Method not implemented.");
    } catch (error: any) {
      console.error('Error responding to review:', error);
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to respond to review',
      };
    }
  }

  /**
   * Delete a response to a review
   */
  async deleteReviewResponse(
    responseId: string,
    mentorId: string
  ): Promise<ReviewsServiceResponse<boolean>> {
    try {
      if (!responseId || !mentorId) {
        return {
          success: false,
          data: null,
          error: 'Response ID and mentor ID are required',
        };
      }

      // First, verify this response belongs to this mentor
      const { data: checkData, error: checkError } = await supabase
        .from('review_responses')
        .select('id')
        .eq('id', responseId)
        .eq('mentor_id', mentorId)
        .single();

      if (checkError || !checkData) {
        return {
          success: false,
          data: null,
          error: 'Response not found or does not belong to this mentor',
        };
      }

      // Delete the response
      const { error } = await supabase
        .from('review_responses')
        .delete()
        .eq('id', responseId)
        .eq('mentor_id', mentorId);

      if (error) throw error;

      return {
        success: true,
        data: true,
        error: null,
      };
    } catch (error: any) {
      console.error('Error deleting review response:', error);
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to delete review response',
      };
    }
  }

  /**
   * Add a private note to a review
   */
  async addReviewNote(
    reviewId: string,
    mentorId: string,
    content: string
  ): Promise<ReviewsServiceResponse<ReviewNote>> {
    try {
      if (!reviewId || !mentorId || !content) {
        return {
          success: false,
          data: null,
          error: 'Review ID, mentor ID, and content are required',
        };
      }

      // Check if the review belongs to the mentor
      const { data: checkData, error: checkError } = await supabase
        .from('mentor_reviews')
        .select('id')
        .eq('id', reviewId)
        .eq('mentor_id', mentorId)
        .single();

      if (checkError || !checkData) {
        return {
          success: false,
          data: null,
          error: 'Review not found or does not belong to this mentor',
        };
      }

      // Insert the note
      const { data, error } = await supabase
        .from('review_notes')
        .insert({
          review_id: reviewId,
          mentor_id: mentorId,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      // Transform the data to match our ReviewNote interface
      const note: ReviewNote = {
        id: data.id,
        reviewId: data.review_id,
        mentorId: data.mentor_id,
        content: data.content,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      return {
        success: true,
        data: note,
        error: null,
      };
    } catch (error: any) {
      console.error('Error adding review note:', error);
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to add review note',
      };
    }
  }

  /**
   * Update a private note
   */
  async updateReviewNote(
    noteId: string,
    mentorId: string,
    content: string
  ): Promise<ReviewsServiceResponse<ReviewNote>> {
    try {
      if (!noteId || !mentorId || !content) {
        return {
          success: false,
          data: null,
          error: 'Note ID, mentor ID, and content are required',
        };
      }

      // Check if the note belongs to the mentor
      const { data: checkData, error: checkError } = await supabase
        .from('review_notes')
        .select('id')
        .eq('id', noteId)
        .eq('mentor_id', mentorId)
        .single();

      if (checkError || !checkData) {
        return {
          success: false,
          data: null,
          error: 'Note not found or does not belong to this mentor',
        };
      }

      // Update the note
      const { data, error } = await supabase
        .from('review_notes')
        .update({
          content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId)
        .eq('mentor_id', mentorId)
        .select()
        .single();

      if (error) throw error;

      // Transform the data to match our ReviewNote interface
      const note: ReviewNote = {
        id: data.id,
        reviewId: data.review_id,
        mentorId: data.mentor_id,
        content: data.content,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      return {
        success: true,
        data: note,
        error: null,
      };
    } catch (error: any) {
      console.error('Error updating review note:', error);
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to update review note',
      };
    }
  }

  /**
   * Delete a private note
   */
  async deleteReviewNote(
    noteId: string,
    mentorId: string
  ): Promise<ReviewsServiceResponse<boolean>> {
    try {
      if (!noteId || !mentorId) {
        return {
          success: false,
          data: null,
          error: 'Note ID and mentor ID are required',
        };
      }

      // Check if the note belongs to the mentor
      const { data: checkData, error: checkError } = await supabase
        .from('review_notes')
        .select('id')
        .eq('id', noteId)
        .eq('mentor_id', mentorId)
        .single();

      if (checkError || !checkData) {
        return {
          success: false,
          data: null,
          error: 'Note not found or does not belong to this mentor',
        };
      }

      // Delete the note
      const { error } = await supabase
        .from('review_notes')
        .delete()
        .eq('id', noteId)
        .eq('mentor_id', mentorId);

      if (error) throw error;

      return {
        success: true,
        data: true,
        error: null,
      };
    } catch (error: any) {
      console.error('Error deleting review note:', error);
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to delete review note',
      };
    }
  }

  /**
   * Toggle review featured status
   */
  async toggleReviewFeatured(
    reviewId: string,
    mentorId: string,
    isFeatured: boolean
  ): Promise<ReviewsServiceResponse<Review>> {
    try {
      if (!reviewId || !mentorId) {
        return {
          success: false,
          data: null,
          error: 'Review ID and mentor ID are required',
        };
      }

      // Update the review's featured status
      const { data, error } = await supabase
        .from('mentor_reviews')
        .update({
          is_featured: isFeatured,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId)
        .eq('mentor_id', mentorId)
        .select(`
          *,
          review_responses (
            id,
            review_id,
            mentor_id,
            content,
            created_at,
            updated_at,
            published_at,
            is_published
          ),
          review_notes (
            id,
            review_id,
            mentor_id,
            content,
            created_at,
            updated_at
          )
        `)
        .single();

      if (error) throw error;

      // Transform the data to match our Review interface
      const review: Review = {
        id: data.id,
        appointmentId: data.appointment_id,
        mentorId: data.mentor_id,
        patientId: data.patient_id,
        patient: {
          id: data.patient_id || '',
          name: 'Anonymous Patient',
          avatarUrl: null,
          email: undefined,
        },
        rating: data.rating as ReviewRating,
        content: data.review_text || '',
        status: data.status as ReviewStatus,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        publishedAt: data.published_at,
        response: data.review_responses && data.review_responses.length > 0 ? {
          id: data.review_responses[0].id,
          reviewId: data.review_responses[0].review_id,
          mentorId: data.review_responses[0].mentor_id,
          content: data.review_responses[0].content,
          createdAt: data.review_responses[0].created_at,
          updatedAt: data.review_responses[0].updated_at,
          publishedAt: data.review_responses[0].published_at,
          isPublished: data.review_responses[0].is_published,
        } : null,
        notes: data.review_notes ? data.review_notes.map((note: any) => ({
          id: note.id,
          reviewId: note.review_id,
          mentorId: note.mentor_id,
          content: note.content,
          createdAt: note.created_at,
          updatedAt: note.updated_at,
        })) : [],
        isFeatured: data.is_featured || false,
        displayOrder: data.display_order || 0,
        keywords: data.keywords || [],
        tags: data.tags || [],
      };

      return {
        success: true,
        data: review,
        error: null,
      };
    } catch (error: any) {
      console.error('Error toggling review featured status:', error);
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to toggle review featured status',
      };
    }
  }

  /**
   * Update review display order
   */
  async updateReviewDisplayOrder(
    reviewId: string,
    mentorId: string,
    displayOrder: number
  ): Promise<ReviewsServiceResponse<Review>> {
    try {
      if (!reviewId || !mentorId || typeof displayOrder !== 'number') {
        return {
          success: false,
          data: null,
          error: 'Review ID, mentor ID, and displayOrder are required',
        };
      }

      // Update the review's display order
      const { data, error } = await supabase
        .from('mentor_reviews')
        .update({
          display_order: displayOrder,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId)
        .eq('mentor_id', mentorId)
        .select(`
          *,
          review_responses (
            id,
            review_id,
            mentor_id,
            content,
            created_at,
            updated_at,
            published_at,
            is_published
          ),
          review_notes (
            id,
            review_id,
            mentor_id,
            content,
            created_at,
            updated_at
          )
        `)
        .single();

      if (error) throw error;

      // Transform the data to match our Review interface
      const review: Review = {
        id: data.id,
        appointmentId: data.appointment_id,
        mentorId: data.mentor_id,
        patientId: data.patient_id,
        patient: {
          id: data.patient_id || '',
          name: 'Anonymous Patient',
          avatarUrl: null,
          email: undefined,
        },
        rating: data.rating as ReviewRating,
        content: data.review_text || '',
        status: data.status as ReviewStatus,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        publishedAt: data.published_at,
        response: data.review_responses && data.review_responses.length > 0 ? {
          id: data.review_responses[0].id,
          reviewId: data.review_responses[0].review_id,
          mentorId: data.review_responses[0].mentor_id,
          content: data.review_responses[0].content,
          createdAt: data.review_responses[0].created_at,
          updatedAt: data.review_responses[0].updated_at,
          publishedAt: data.review_responses[0].published_at,
          isPublished: data.review_responses[0].is_published,
        } : null,
        notes: data.review_notes ? data.review_notes.map((note: any) => ({
          id: note.id,
          reviewId: note.review_id,
          mentorId: note.mentor_id,
          content: note.content,
          createdAt: note.created_at,
          updatedAt: note.updated_at,
        })) : [],
        isFeatured: data.is_featured || false,
        displayOrder: data.display_order || 0,
        keywords: data.keywords || [],
        tags: data.tags || [],
      };

      return {
        success: true,
        data: review,
        error: null,
      };
    } catch (error: any) {
      console.error('Error updating review display order:', error);
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to update review display order',
      };
    }
  }

  /**
   * Get review analytics and stats
   */
  async getReviewStats(mentorId: string): Promise<ReviewsServiceResponse<ReviewStats>> {
    try {
      if (!mentorId) {
        return {
          success: false,
          data: null,
          error: 'Mentor ID is required',
        };
      }

      // Get all reviews for this mentor
      const { data: reviews, error } = await supabase
        .from('mentor_reviews')
        .select('*')
        .eq('mentor_id', mentorId);

      if (error) throw error;

      // Initialize the stats object
      const stats: ReviewStats = {
        totalReviews: reviews.length,
        averageRating: 0,
        ratingDistribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },
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
      };

      if (reviews.length === 0) {
        return {
          success: true,
          data: stats,
          error: null,
        };
      }

      // Calculate the average rating
      const totalRating = reviews.reduce((acc, review) => {
        return acc + (review.rating || 0);
      }, 0);

      stats.averageRating = parseFloat((totalRating / reviews.length).toFixed(1));

      // Calculate rating distribution
      reviews.forEach(review => {
        if (review.rating) {
          stats.ratingDistribution[review.rating as ReviewRating]++;
        }
      });

      // Calculate status distribution and counts
      reviews.forEach(review => {
        if (review.status) {
          stats.statusDistribution[review.status as ReviewStatus]++;

          switch (review.status) {
            case 'pending':
              stats.pendingCount++;
              break;
            case 'published':
              stats.publishedCount++;
              break;
            case 'rejected':
              stats.rejectedCount++;
              break;
            case 'flagged':
              stats.flaggedCount++;
              break;
          }
        }
      });

      // Calculate reviews over time (last 6 months)
      const now = new Date();
      const monthsData: { [key: string]: number } = {};

      // Initialize the months
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(now, i);
        const monthKey = format(date, 'MMM yyyy');
        monthsData[monthKey] = 0;
      }

      // Count reviews for each month
      reviews.forEach(review => {
        if (review.created_at) {
          const reviewDate = parseISO(review.created_at);
          // Only include reviews from the last 6 months
          if (reviewDate >= subMonths(now, 6)) {
            const monthKey = format(reviewDate, 'MMM yyyy');
            if (monthsData[monthKey] !== undefined) {
              monthsData[monthKey]++;
            } else {
              monthsData[monthKey] = 1;
            }
          }
        }
      });

      // Transform the months data into the expected format
      stats.reviewsOverTime = Object.keys(monthsData).map(date => ({
        date,
        count: monthsData[date],
      }));

      return {
        success: true,
        data: stats,
        error: null,
      };
    } catch (error: any) {
      console.error('Error getting review stats:', error);
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to get review stats',
      };
    }
  }

  /**
   * Generate a review request link
   */
  async generateReviewRequestLink(
    mentorId: string,
    appointmentId?: string,
    patientId?: string
  ): Promise<ReviewsServiceResponse<ReviewRequestLink>> {
    try {
      if (!mentorId) {
        return {
          success: false,
          data: null,
          error: 'Mentor ID is required',
        };
      }

      // Generate a secure token
      const token = crypto.randomUUID();
      
      // Calculate expiration date (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      // Insert the review request link
      const { data, error } = await supabase
        .from('review_request_links')
        .insert({
          mentor_id: mentorId,
          appointment_id: appointmentId || null,
          patient_id: patientId || null,
          token,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Transform the data to match our ReviewRequestLink interface
      const link: ReviewRequestLink = {
        id: data.id,
        mentorId: data.mentor_id,
        appointmentId: data.appointment_id,
        patientId: data.patient_id,
        token: data.token,
        createdAt: data.created_at,
        expiresAt: data.expires_at,
        isUsed: data.is_used,
        usedAt: data.used_at,
        emailSent: data.email_sent,
        emailSentAt: data.email_sent_at,
      };

      return {
        success: true,
        data: link,
        error: null,
      };
    } catch (error: any) {
      console.error('Error generating review request link:', error);
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to generate review request link',
      };
    }
  }

  /**
   * Send a review request to a patient's email
   * Note: This is a simplified implementation. In a production environment, 
   * you would integrate with an email service.
   */
  async sendReviewRequest(
    requestId: string,
    mentorId: string
  ): Promise<ReviewsServiceResponse<boolean>> {
    try {
      if (!requestId || !mentorId) {
        return {
          success: false,
          data: null,
          error: 'Request ID and mentor ID are required',
        };
      }

      // Get the request details
      const { data: request, error: requestError } = await supabase
        .from('review_request_links')
        .select('*, patients:patient_id(email)')
        .eq('id', requestId)
        .eq('mentor_id', mentorId)
        .single();

      if (requestError || !request) {
        return {
          success: false,
          data: null,
          error: 'Request not found or does not belong to this mentor',
        };
      }

      // In a real implementation, you would send an email here
      console.log(`Sending email to patient with review request link: ${request.token}`);

      // Mark the request as sent
      const { error: updateError } = await supabase
        .from('review_request_links')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      return {
        success: true,
        data: true,
        error: null,
      };
    } catch (error: any) {
      console.error('Error sending review request:', error);
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to send review request',
      };
    }
  }

  /**
   * Export reviews to CSV or PDF
   * Note: This is a simplified implementation that returns data in CSV format
   * as a string. In a real application, you might generate a PDF or create
   * a downloadable file.
   */
  async exportReviews(
    mentorId: string,
    filters?: ReviewFilter,
    format: 'csv' | 'pdf' = 'csv'
  ): Promise<ReviewsServiceResponse<string>> {
    try {
      if (!mentorId) {
        return {
          success: false,
          data: null,
          error: 'Mentor ID is required',
        };
      }

      // Get all reviews for this mentor with filters
      const { success, data: reviews, error } = await this.getReviews(mentorId, filters);

      if (!success || !reviews) {
        throw new Error(error || 'Failed to fetch reviews for export');
      }

      if (reviews.length === 0) {
        return {
          success: true,
          data: 'No reviews to export',
          error: null,
        };
      }

      if (format === 'csv') {
        // Generate CSV
        const headers = [
          'ID', 
          'Patient', 
          'Rating', 
          'Content', 
          'Status', 
          'Created At', 
          'Response'
        ].join(',');

        const rows = reviews.map(review => [
          review.id,
          review.patient.name,
          review.rating,
          `"${(review.content || '').replace(/"/g, '""')}"`, // Escape quotes
          review.status,
          review.createdAt ? new Date(review.createdAt).toLocaleString() : '',
          `"${(review.response?.content || '').replace(/"/g, '""')}"` // Escape quotes
        ].join(','));

        const csv = [headers, ...rows].join('\n');
        return {
          success: true,
          data: csv,
          error: null,
        };
      } else {
        // PDF export would be implemented here
        return {
          success: false,
          data: null,
          error: 'PDF export is not yet implemented',
        };
      }
    } catch (error: any) {
      console.error('Error exporting reviews:', error);
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to export reviews',
      };
    }
  }
}

// Export singleton instance
export const reviewsService = new ReviewsService(); 