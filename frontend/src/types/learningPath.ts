export interface LearningPathRecommendation {
  subject: string
  topic: string
  reason: string
  suggestedAction: string
  actionType?: 'quiz' | 'explanation' | null
  difficulty?: 'Easy' | 'Medium' | 'Hard' | null
}

export interface LearningPath {
  summary: string
  recommendations: LearningPathRecommendation[]
}
