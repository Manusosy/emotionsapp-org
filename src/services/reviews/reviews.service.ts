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

      // Use the new database function to get mentor reviews
      const { data: items, error } = await supabase.rpc('get_mentor_reviews', {
        mentor_uuid: mentorId
      });

      if (error) throw error;

      if (!items || items.length === 0) {
        return {
          success: true,
          data: [],
          error: null,
        };
      }

      // Transform the data to match our Review interface
      let reviews: Review[] = await Promise.all(items.map(async (item: any) => {
        // Fetch appointment details if appointment_id exists
        let appointmentDetails = null;
        if (item.appointment_id) {
          try {
            const { data: appointment, error: appointmentError } = await supabase
              .from('appointments')
              .select('id, date, start_time, end_time, notes, status, meeting_type')
              .eq('id', item.appointment_id)
              .single();
            
            if (!appointmentError && appointment) {
              // Transform appointment data to match AppointmentDetails interface
              appointmentDetails = {
                id: appointment.id,
                scheduled_at: `${appointment.date}T${appointment.start_time}`,
                duration: appointment.end_time && appointment.start_time ? 
                  Math.round((new Date(`1970-01-01T${appointment.end_time}`).getTime() - 
                             new Date(`1970-01-01T${appointment.start_time}`).getTime()) / (1000 * 60)) : 60,
                notes: appointment.notes,
                status: appointment.status,
                type: appointment.meeting_type || 'video'
              };
            }
          } catch (error) {
            console.warn('Could not fetch appointment details for review:', item.id);
          }
        }

        return {
          id: item.id,
          appointmentId: item.appointment_id,
          mentorId: item.mentor_id,
          patientId: item.patient_id,
          patient: {
            id: item.patient_id,
            name: item.is_anonymous ? 'Anonymous Patient' : (item.patient_name || 'Anonymous Patient'),
            avatarUrl: null,
            email: undefined,
          },
          rating: item.rating as ReviewRating,
          content: item.review_text || '',
          status: 'published' as ReviewStatus, // All reviews in the new system are published
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          publishedAt: item.created_at, // Same as created_at for now
          response: null, // No responses in the new simple system yet
          notes: [], // No notes in the new simple system yet
          isFeatured: false,
          displayOrder: 0,
          keywords: [],
          tags: [],
          // Add appointment details
          appointmentDetails: appointmentDetails,
        };
      }));

      // Apply client-side filtering if needed
      if (filters) {
        // Rating filter
        if (filters.rating && filters.rating !== 'all') {
          const targetRating = parseInt(filters.rating.toString());
          reviews = reviews.filter(review => review.rating === targetRating);
        }

        // Date range filter
        if (filters.dateRange) {
          if (filters.dateRange.start) {
            reviews = reviews.filter(review => 
              new Date(review.createdAt) >= new Date(filters.dateRange!.start!)
            );
          }
          if (filters.dateRange.end) {
            reviews = reviews.filter(review => 
              new Date(review.createdAt) <= new Date(filters.dateRange!.end!)
            );
          }
        }

        // Search filter
        if (filters.search && filters.search.trim() !== '') {
          const searchLower = filters.search.toLowerCase();
          reviews = reviews.filter(review => 
            review.content.toLowerCase().includes(searchLower) ||
            review.patient.name.toLowerCase().includes(searchLower)
          );
        }

        // Apply sorting
        if (filters.sortBy) {
          if (filters.sortBy === 'rating') {
            reviews.sort((a, b) => 
              filters.sortOrder === 'asc' ? a.rating - b.rating : b.rating - a.rating
            );
          } else if (filters.sortBy === 'date') {
            reviews.sort((a, b) => {
              const dateA = new Date(a.createdAt).getTime();
              const dateB = new Date(b.createdAt).getTime();
              return filters.sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            });
        }
      }
      } else {
        // Default sorting by created_at desc
        reviews.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }

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

      // First try to get from the new reviews table
      const { data: reviewItem, error: reviewError } = await supabase
        .from('reviews')
        .select('*')
        .eq('id', reviewId)
        .single();

      if (!reviewError && reviewItem) {
        // Get patient profile separately
        const { data: patientProfile } = await supabase
          .from('patient_profiles')
          .select('id, user_id, full_name, avatar_url, email')
          .eq('user_id', reviewItem.patient_id)
          .single();

        // Found in new reviews table
        return {
          success: true,
          data: {
            id: reviewItem.id,
            appointmentId: reviewItem.appointment_id,
            mentorId: reviewItem.mentor_id,
            patientId: reviewItem.patient_id,
            patient: {
              id: patientProfile?.user_id || reviewItem.patient_id,
              name: reviewItem.is_anonymous ? 'Anonymous Patient' : (patientProfile?.full_name || 'Anonymous Patient'),
              avatarUrl: patientProfile?.avatar_url || null,
              email: patientProfile?.email || undefined,
            },
            rating: reviewItem.rating as ReviewRating,
            content: reviewItem.review_text || '',
            status: 'published' as ReviewStatus, // All reviews in new table are published
            createdAt: reviewItem.created_at,
            updatedAt: reviewItem.updated_at,
            publishedAt: reviewItem.created_at, // Same as created_at for new reviews
            response: null, // No responses in new system yet
            notes: [], // No notes in new system yet
            isFeatured: false,
            displayOrder: 0,
            keywords: [],
            tags: [],
          },
          error: null,
        };
      }

      // If not found in new table, try the old mentor_reviews table
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
        .maybeSingle(); // Use maybeSingle instead of single to avoid error if no rows

      if (error) {
        console.error('Error fetching review by ID:', error);
        return {
          success: false,
          data: null,
          error: error.message || 'Failed to fetch review',
        };
      }

      if (!item) {
        return {
          success: false,
          data: null,
          error: 'Review not found',
        };
      }

      // Get patient profile for mentor_reviews table too
      const { data: mentorReviewPatientProfile } = await supabase
        .from('patient_profiles')
        .select('id, user_id, full_name, avatar_url, email')
        .eq('user_id', item.patient_id)
        .single();

      return {
        success: true,
        data: {
          id: item.id,
          appointmentId: item.appointment_id,
          mentorId: item.mentor_id,
          patientId: item.patient_id,
          patient: {
            id: mentorReviewPatientProfile?.user_id || item.patient_id,
            name: mentorReviewPatientProfile?.full_name || 'Anonymous Patient',
            avatarUrl: mentorReviewPatientProfile?.avatar_url || null,
            email: mentorReviewPatientProfile?.email || undefined,
          },
          rating: item.rating as ReviewRating,
          content: item.review_text || '',
          status: item.status as ReviewStatus,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          publishedAt: item.published_at,
          response: item.review_responses?.[0] ? {
            id: item.review_responses[0].id,
            reviewId: item.review_responses[0].review_id,
            mentorId: item.review_responses[0].mentor_id,
            content: item.review_responses[0].content,
            createdAt: item.review_responses[0].created_at,
            updatedAt: item.review_responses[0].updated_at,
            publishedAt: item.review_responses[0].published_at,
            isPublished: item.review_responses[0].is_published,
          } : null,
          notes: item.review_notes?.map((note: any) => ({
            id: note.id,
            reviewId: note.review_id,
            mentorId: note.mentor_id,
            content: note.content,
            createdAt: note.created_at,
            updatedAt: note.updated_at,
          })) || [],
          isFeatured: item.is_featured,
          displayOrder: item.display_order,
          keywords: item.keywords || [],
          tags: item.tags || [],
        },
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
          id: data.patient_profiles?.id || '',
          name: data.patient_profiles?.full_name || 'Anonymous Patient',
          avatarUrl: data.patient_profiles?.avatar_url || null,
          email: data.patient_profiles?.email || undefined,
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
          id: data.patient_profiles?.id || '',
          name: data.patient_profiles?.full_name || 'Anonymous Patient',
          avatarUrl: data.patient_profiles?.avatar_url || null,
          email: data.patient_profiles?.email || undefined,
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

      // Use the new database function to get mentor review stats
      const { data: statsData, error: statsError } = await supabase.rpc('get_mentor_review_stats', {
        mentor_uuid: mentorId
      });

      if (statsError) throw statsError;

      // Also get the individual reviews for time-based analysis
      const { data: reviews, error: reviewsError } = await supabase.rpc('get_mentor_reviews', {
        mentor_uuid: mentorId
      });

      if (reviewsError) throw reviewsError;

      // Initialize the stats object using data from the database function
      const dbStats = statsData?.[0];
      const stats: ReviewStats = {
        totalReviews: dbStats?.total_reviews || 0,
        averageRating: parseFloat(dbStats?.average_rating || '0'),
        ratingDistribution: {
          1: dbStats?.rating_distribution?.['1'] || 0,
          2: dbStats?.rating_distribution?.['2'] || 0,
          3: dbStats?.rating_distribution?.['3'] || 0,
          4: dbStats?.rating_distribution?.['4'] || 0,
          5: dbStats?.rating_distribution?.['5'] || 0,
        },
        statusDistribution: {
          pending: 0,
          published: dbStats?.total_reviews || 0, // All reviews are published in new system
          rejected: 0,
          flagged: 0,
        },
        pendingCount: 0,
        publishedCount: dbStats?.total_reviews || 0,
        rejectedCount: 0,
        flaggedCount: 0,
        reviewsOverTime: [],
      };

      if (!reviews || reviews.length === 0) {
        return {
          success: true,
          data: stats,
          error: null,
        };
      }

      // Calculate reviews over time (last 6 months)
      const now = new Date();
      const monthsData: { [key: string]: number } = {};

      // Initialize the months with proper ISO date strings
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(now, i);
        const monthKey = format(date, 'MMM yyyy');
        const isoDate = date.toISOString();
        monthsData[isoDate] = 0;
      }

      // Count reviews for each month
      if (reviews && reviews.length > 0) {
        reviews.forEach((review: any) => {
        if (review.created_at) {
            try {
              const reviewDate = new Date(review.created_at);
          // Only include reviews from the last 6 months
          if (reviewDate >= subMonths(now, 6)) {
                const monthStart = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), 1);
                const monthKey = monthStart.toISOString();
                
                // Find the closest month in our monthsData
                const monthKeys = Object.keys(monthsData);
                const closestMonth = monthKeys.find(key => {
                  const keyDate = new Date(key);
                  return keyDate.getMonth() === monthStart.getMonth() && keyDate.getFullYear() === monthStart.getFullYear();
                });
                
                if (closestMonth) {
                  monthsData[closestMonth]++;
            }
              }
            } catch (error) {
              console.warn('Invalid date in review:', review.created_at);
          }
        }
      });
      }

      // Transform the months data into the expected format with proper ISO dates
      stats.reviewsOverTime = Object.keys(monthsData)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
        .map(isoDate => ({
          date: isoDate,
          count: monthsData[isoDate],
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
          success: false,
          data: null,
          error: 'No reviews to export',
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
        
        // Create a blob and generate a download URL
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        return {
          success: true,
          data: url,
          error: null,
        };
      } else if (format === 'pdf') {
        // Dynamic import for jsPDF to avoid SSR issues
        const { default: jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');

        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(20);
        doc.text('Reviews Export', 14, 22);
        
        // Add export date
        doc.setFontSize(10);
        doc.text(`Exported on: ${new Date().toLocaleDateString()}`, 14, 32);
        
        // Prepare table data
        const tableData = reviews.map(review => [
          review.patient.name,
          `${review.rating}/5`,
          review.content.length > 50 ? review.content.substring(0, 50) + '...' : review.content,
          review.status,
          new Date(review.createdAt).toLocaleDateString(),
          review.response?.content ? 'Yes' : 'No'
        ]);

        // Add table
        autoTable(doc, {
          head: [['Patient', 'Rating', 'Review', 'Status', 'Date', 'Response']],
          body: tableData,
          startY: 40,
          styles: {
            fontSize: 8,
            cellPadding: 3,
          },
          headStyles: {
            fillColor: [66, 139, 202],
            textColor: 255,
          },
          columnStyles: {
            2: { cellWidth: 60 }, // Review column wider
          },
          margin: { top: 40 },
        });

        // Add summary
        const finalY = (doc as any).lastAutoTable.finalY || 40;
        doc.setFontSize(12);
        doc.text('Summary:', 14, finalY + 20);
        doc.setFontSize(10);
        doc.text(`Total Reviews: ${reviews.length}`, 14, finalY + 30);
        
        const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
        doc.text(`Average Rating: ${avgRating.toFixed(1)}/5`, 14, finalY + 40);

        // Generate blob and URL
        const pdfBlob = doc.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        
        return {
          success: true,
          data: url,
          error: null,
        };
      } else {
        return {
          success: false,
          data: null,
          error: 'Unsupported export format',
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

  /**
   * Submit a new review using the new reviews table
   */
  async submitReview(
    appointmentId: string,
    mentorId: string,
    rating: ReviewRating,
    content: string,
    patientId: string,
    isAnonymous: boolean = false
  ): Promise<ReviewsServiceResponse<Review>> {
    try {
      if (!appointmentId || !mentorId || !patientId) {
        return {
          success: false,
          data: null,
          error: 'Missing required parameters',
        };
      }

      if (rating < 1 || rating > 5) {
        return {
          success: false,
          data: null,
          error: 'Rating must be between 1 and 5',
        };
      }

      // Insert into the new reviews table
      const { data: review, error } = await supabase
        .from('reviews')
        .insert({
          patient_id: patientId,
          mentor_id: mentorId,
          appointment_id: appointmentId,
          rating: rating,
          review_text: content,
          is_anonymous: isAnonymous
        })
        .select()
        .single();

      if (error) throw error;

      // Update appointment to mark review as submitted
      await supabase
        .from('appointments')
        .update({ review_submitted: true })
        .eq('id', appointmentId);

      return {
        success: true,
        data: {
          id: review.id,
          appointmentId: review.appointment_id,
          mentorId: review.mentor_id,
          patientId: review.patient_id,
          patient: {
            id: patientId,
            name: isAnonymous ? 'Anonymous' : 'Patient',
            avatarUrl: null,
          },
          rating: review.rating as ReviewRating,
          content: review.review_text || '',
          status: 'published' as ReviewStatus,
          createdAt: review.created_at,
          updatedAt: review.updated_at,
          publishedAt: review.created_at,
          response: null,
          notes: [],
          isFeatured: false,
          displayOrder: 0,
          keywords: [],
          tags: [],
        },
        error: null,
      };
    } catch (error: any) {
      console.error('Error submitting review:', error);
        return {
          success: false,
          data: null,
        error: error.message || 'Failed to submit review',
        };
    }
      }

  /**
   * Get mentor reviews using the new database function
   */
  async getMentorReviews(mentorId: string): Promise<ReviewsServiceResponse<any[]>> {
    try {
      if (!mentorId) {
        return {
          success: false,
          data: null,
          error: 'Mentor ID is required',
        };
      }

      const { data: reviews, error } = await supabase.rpc('get_mentor_reviews', {
        mentor_uuid: mentorId
      });

      if (error) throw error;

      return {
        success: true,
        data: reviews || [],
        error: null,
      };
    } catch (error: any) {
      console.error('Error fetching mentor reviews:', error);
        return {
          success: false,
          data: null,
        error: error.message || 'Failed to fetch mentor reviews',
        };
      }
  }

  /**
   * Get mentor review statistics using the new database function
   */
  async getMentorReviewStats(mentorId: string): Promise<ReviewsServiceResponse<any>> {
    try {
      if (!mentorId) {
        return {
          success: false,
          data: null,
          error: 'Mentor ID is required',
        };
      }

      const { data: stats, error } = await supabase.rpc('get_mentor_review_stats', {
        mentor_uuid: mentorId
      });

      if (error) throw error;

      return {
        success: true,
        data: stats?.[0] || null,
        error: null,
      };
    } catch (error: any) {
      console.error('Error fetching mentor review stats:', error);
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to fetch mentor review stats',
      };
    }
  }
}

// Export singleton instance
export const reviewsService = new ReviewsService(); 