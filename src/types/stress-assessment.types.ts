import { User } from './user.types';

// Question Types
export type QuestionType = 'stress' | 'physical' | 'emotional' | 'behavioral';

export interface AssessmentQuestion {
  id: number;
  text: string;
  type: QuestionType;
  weight: number; // Weight factor for scoring
  invertScore?: boolean; // For questions where higher score means lower stress
}

export interface QuestionResponse {
  id: number;
  type: QuestionType;
  score: number; // Raw score (1-5)
  timestamp: Date;
}

export interface StressAssessment {
  id: string;
  userId: string;
  responses: QuestionResponse[];
  rawScore: number; // Raw score (1.0-5.0, one decimal place)
  normalizedScore: number; // Normalized score (0.0-10.0, two decimal places)
  healthPercentage: number; // Health percentage (0-100, rounded to nearest integer)
  status: 'excellent' | 'good' | 'fair' | 'concerning' | 'worrying';
  notes?: string;
  createdAt: Date;
  factors: string[]; // Array of contributing factors
}

// Stress Level Categories
export interface StressCategory {
  range: [number, number]; // [min, max] of health percentage
  status: StressAssessment['status'];
  color: string;
  recommendations: string[];
}

// Assessment Configuration
export interface AssessmentConfig {
  questions: AssessmentQuestion[];
  categories: StressCategory[];
  weights: {
    [key in QuestionType]: number;
  };
  scalingFactor: number; // For converting between scales
}

// Progress Tracking
export interface StressProgress {
  assessments: StressAssessment[];
  trend: 'improving' | 'stable' | 'declining';
  averages: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  consistencyScore: number; // 0-100
} 