import {
  Review,
  ReviewFilter,
  ReviewRating,
  ReviewStats,
  ReviewStatus,
  ReviewResponse,
  ReviewNote,
  ReviewRequestLink,
} from '@/features/reviews/types';

export interface ReviewsServiceResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface IReviewsService {
  /**
   * Get all reviews for a mentor with optional filtering
   */
  getReviews(
    mentorId: string,
    filters?: ReviewFilter
  ): Promise<ReviewsServiceResponse<Review[]>>;

  /**
   * Get a specific review by ID
   */
  getReviewById(reviewId: string): Promise<ReviewsServiceResponse<Review>>;

  /**
   * Update review status
   */
  updateReviewStatus(
    reviewId: string,
    mentorId: string,
    status: ReviewStatus,
    reason?: string
  ): Promise<ReviewsServiceResponse<Review>>;

  /**
   * Add or update a response to a review
   */
  respondToReview(
    reviewId: string,
    mentorId: string,
    content: string,
    isPublished?: boolean
  ): Promise<ReviewsServiceResponse<ReviewResponse>>;

  /**
   * Delete a response to a review
   */
  deleteReviewResponse(
    responseId: string,
    mentorId: string
  ): Promise<ReviewsServiceResponse<boolean>>;

  /**
   * Add a private note to a review
   */
  addReviewNote(
    reviewId: string,
    mentorId: string,
    content: string
  ): Promise<ReviewsServiceResponse<ReviewNote>>;

  /**
   * Update a private note
   */
  updateReviewNote(
    noteId: string,
    mentorId: string,
    content: string
  ): Promise<ReviewsServiceResponse<ReviewNote>>;

  /**
   * Delete a private note
   */
  deleteReviewNote(
    noteId: string,
    mentorId: string
  ): Promise<ReviewsServiceResponse<boolean>>;

  /**
   * Toggle review featured status
   */
  toggleReviewFeatured(
    reviewId: string,
    mentorId: string,
    isFeatured: boolean
  ): Promise<ReviewsServiceResponse<Review>>;

  /**
   * Update review display order
   */
  updateReviewDisplayOrder(
    reviewId: string,
    mentorId: string,
    displayOrder: number
  ): Promise<ReviewsServiceResponse<Review>>;

  /**
   * Get review analytics and stats
   */
  getReviewStats(mentorId: string): Promise<ReviewsServiceResponse<ReviewStats>>;

  /**
   * Generate a review request link
   */
  generateReviewRequestLink(
    mentorId: string,
    appointmentId?: string,
    patientId?: string
  ): Promise<ReviewsServiceResponse<ReviewRequestLink>>;

  /**
   * Send a review request to a patient's email
   */
  sendReviewRequest(
    requestId: string,
    mentorId: string
  ): Promise<ReviewsServiceResponse<boolean>>;

  /**
   * Export reviews to CSV or PDF
   */
  exportReviews(
    mentorId: string,
    filters?: ReviewFilter,
    format?: 'csv' | 'pdf'
  ): Promise<ReviewsServiceResponse<string>>;
} 