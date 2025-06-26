/**
 * Reviews feature type definitions
 */

export type ReviewStatus = 'pending' | 'published' | 'rejected' | 'flagged';

export type ReviewRating = 1 | 2 | 3 | 4 | 5;

export interface ReviewPatient {
  id: string;
  name: string;
  avatarUrl: string | null;
  email?: string;
}

export interface ReviewResponse {
  id: string;
  reviewId: string;
  mentorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  isPublished: boolean;
}

export interface ReviewNote {
  id: string;
  reviewId: string;
  mentorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  appointmentId: string;
  mentorId: string;
  patientId: string;
  patient: ReviewPatient;
  rating: ReviewRating;
  content: string;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  response?: ReviewResponse | null;
  notes?: ReviewNote[];
  isFeatured: boolean;
  displayOrder: number;
  keywords?: string[];
  tags?: string[];
}

export interface ReviewFilter {
  status?: ReviewStatus | 'all';
  rating?: ReviewRating | 'all';
  dateRange?: {
    start: string;
    end: string;
  } | null;
  search?: string;
  sortBy?: 'date' | 'rating' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    [key in ReviewRating]: number;
  };
  statusDistribution: {
    [key in ReviewStatus]: number;
  };
  pendingCount: number;
  publishedCount: number;
  rejectedCount: number;
  flaggedCount: number;
  reviewsOverTime: Array<{
    date: string;
    count: number;
  }>;
}

export interface ReviewRequestLink {
  id: string;
  mentorId: string;
  appointmentId: string | null;
  patientId: string | null;
  token: string;
  createdAt: string;
  expiresAt: string;
  isUsed: boolean;
  usedAt: string | null;
  emailSent: boolean;
  emailSentAt: string | null;
} 