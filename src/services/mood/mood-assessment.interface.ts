import { MoodAssessment, MoodEntry } from '@/types/mood';

export interface IMoodAssessmentService {
  getMoodAssessments(userId: string): Promise<MoodAssessment[]>;
  getMoodAssessment(assessmentId: string): Promise<MoodAssessment | null>;
  saveMoodAssessment(assessment: Omit<MoodAssessment, 'id' | 'timestamp'>): Promise<MoodAssessment | null>;
  updateMoodAssessment(assessmentId: string, updates: Partial<MoodAssessment>): Promise<MoodAssessment | null>;
  deleteMoodAssessment(assessmentId: string): Promise<boolean>;
  getMoodEntries(userId: string, startDate?: Date, endDate?: Date): Promise<MoodEntry[]>;
  addMoodEntry(entry: Omit<MoodEntry, 'id' | 'timestamp'>): Promise<MoodEntry | null>;
  updateMoodEntry(entryId: string, updates: Partial<MoodEntry>): Promise<MoodEntry | null>;
  deleteMoodEntry(entryId: string): Promise<boolean>;
} 