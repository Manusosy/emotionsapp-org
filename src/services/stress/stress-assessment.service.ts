import { 
  AssessmentQuestion,
  QuestionResponse,
  StressAssessment,
  StressCategory,
  AssessmentConfig,
  QuestionType
} from '@/types/stress-assessment.types';

// Default assessment configuration
const defaultConfig: AssessmentConfig = {
  questions: [
    {
      id: 1,
      text: "Are you feeling overwhelmed today?",
      type: "stress",
      weight: 1.0,
      invertScore: false
    },
    {
      id: 2,
      text: "Have you had trouble relaxing recently?",
      type: "stress",
      weight: 1.0,
      invertScore: false
    },
    {
      id: 3,
      text: "Has anything been bothering you with work or at home?",
      type: "stress",
      weight: 1.0,
      invertScore: false
    },
    {
      id: 4,
      text: "Did you sleep well last night?",
      type: "physical",
      weight: 0.75,
      invertScore: true
    }
  ],
  categories: [
    {
      range: [80, 100],
      status: "excellent",
      color: "#4ade80",
      recommendations: [
        "Maintain your current stress management practices",
        "Share your successful strategies with others",
        "Consider mentoring others in stress management",
        "Document what works well for you"
      ]
    },
    {
      range: [60, 79],
      status: "good",
      color: "#a3e635",
      recommendations: [
        "Continue your current practices while looking for areas of improvement",
        "Try adding one new relaxation technique",
        "Schedule regular check-ins with yourself",
        "Keep a stress diary to identify patterns"
      ]
    },
    {
      range: [40, 59],
      status: "fair",
      color: "#facc15",
      recommendations: [
        "Implement regular stress management techniques",
        "Consider talking to a mental health professional",
        "Review and adjust your daily routines",
        "Practice mindfulness or meditation daily"
      ]
    },
    {
      range: [20, 39],
      status: "concerning",
      color: "#fb923c",
      recommendations: [
        "Schedule an appointment with a mental health professional",
        "Identify and reduce major stressors in your life",
        "Establish a strong support system",
        "Focus on sleep hygiene and physical exercise"
      ]
    },
    {
      range: [0, 19],
      status: "worrying",
      color: "#ef4444",
      recommendations: [
        "Seek immediate professional support",
        "Connect with trusted friends or family members",
        "Consider stress leave if work-related",
        "Focus on immediate self-care needs"
      ]
    }
  ],
  weights: {
    stress: 1.0,
    physical: 0.75,
    emotional: 1.0,
    behavioral: 0.85
  },
  scalingFactor: 2 // For converting 1-5 scale to 0-10 scale
};

class StressAssessmentService {
  private config: AssessmentConfig;

  constructor(config: Partial<AssessmentConfig> = {}) {
    this.config = {
      ...defaultConfig,
      ...config
    };
  }

  // Public getters for configuration
  public getQuestions(): AssessmentQuestion[] {
    return this.config.questions;
  }

  public getCategories(): StressCategory[] {
    return this.config.categories;
  }

  public getCategoryByStatus(status: StressAssessment['status']): StressCategory | undefined {
    return this.config.categories.find(c => c.status === status);
  }

  public getQuestionsCount(): number {
    return this.config.questions.length;
  }

  /**
   * Calculate normalized score from raw responses
   * @param responses Array of question responses
   * @returns Normalized score on 0-10 scale
   */
  private calculateNormalizedScore(responses: QuestionResponse[]): number {
    if (!responses.length) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    responses.forEach(response => {
      const question = this.config.questions.find(q => q.id === response.id);
      if (!question) return;

      const weight = question.weight * this.config.weights[question.type];
      const score = question.invertScore ? 6 - response.score : response.score;
      
      weightedSum += score * weight;
      totalWeight += weight;
    });

    const rawScore = weightedSum / totalWeight;
    return parseFloat((rawScore * this.config.scalingFactor).toFixed(2));
  }

  /**
   * Calculate health percentage from normalized score
   * @param normalizedScore Score on 0-10 scale
   * @returns Health percentage on 0-100 scale
   */
  private calculateHealthPercentage(normalizedScore: number): number {
    const percentage = (10 - normalizedScore) * 10;
    return Math.max(0, Math.min(100, Math.round(percentage)));
  }

  /**
   * Get stress category based on health percentage
   * @param healthPercentage Health percentage on 0-100 scale
   * @returns Matching stress category
   */
  private getCategory(healthPercentage: number): StressCategory {
    return this.config.categories.find(
      category => 
        healthPercentage >= category.range[0] && 
        healthPercentage <= category.range[1]
    ) || this.config.categories[this.config.categories.length - 1];
  }

  /**
   * Process a complete stress assessment
   * @param userId User ID
   * @param responses Array of question responses
   * @returns Processed stress assessment
   */
  public processAssessment(
    userId: string, 
    responses: QuestionResponse[]
  ): StressAssessment {
    const normalizedScore = this.calculateNormalizedScore(responses);
    const healthPercentage = this.calculateHealthPercentage(normalizedScore);
    const category = this.getCategory(healthPercentage);

    const rawScore = responses.reduce((sum, r) => sum + r.score, 0) / responses.length;

    return {
      id: crypto.randomUUID(),
      userId,
      responses,
      rawScore,
      normalizedScore,
      healthPercentage,
      status: category.status,
      createdAt: new Date(),
      factors: responses.map(r => `${r.type}:${r.score}`),
    };
  }

  /**
   * Get personalized recommendations based on assessment
   * @param assessment Processed stress assessment
   * @returns Array of recommendations
   */
  public getRecommendations(assessment: StressAssessment): string[] {
    const category = this.getCategory(assessment.healthPercentage);
    return category.recommendations;
  }

  /**
   * Calculate trend from historical assessments
   * @param assessments Array of historical assessments
   * @returns Trend direction
   */
  public calculateTrend(assessments: StressAssessment[]): 'improving' | 'stable' | 'declining' {
    if (assessments.length < 2) return 'stable';

    const sortedAssessments = [...assessments].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    const recentAvg = sortedAssessments
      .slice(0, 3)
      .reduce((sum, a) => sum + a.healthPercentage, 0) / 3;

    const previousAvg = sortedAssessments
      .slice(3, 6)
      .reduce((sum, a) => sum + a.healthPercentage, 0) / 3;

    const difference = recentAvg - previousAvg;
    if (Math.abs(difference) < 5) return 'stable';
    return difference > 0 ? 'improving' : 'declining';
  }
}

export const stressAssessmentService = new StressAssessmentService(); 