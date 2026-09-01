export interface LearningPathRecommendation {
  subject: string
  topic: string
  reason: string
  suggestedAction: string
}

export interface LearningPath {
  summary: string
  recommendations: LearningPathRecommendation[]
}
