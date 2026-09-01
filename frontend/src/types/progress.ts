export interface SubjectProgress {
  subject: string
  quizzesTaken: number
  averageScore: number
  topicsExplained: number
}

export interface ActivityItem {
  type: 'quiz' | 'topic'
  subject: string
  topic: string
  detail: string
  createdAt: string
}

export interface ProgressSummary {
  totalQuizzes: number
  averageScore: number
  totalTopicsExplained: number
  bySubject: SubjectProgress[]
  recentActivity: ActivityItem[]
}
