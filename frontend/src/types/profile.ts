import type { QuizSubject } from './quiz'
import type { YearLevel } from './topic'

export type LearningGoal =
  | 'Catch up on the basics'
  | 'Keep pace with class'
  | 'Get ahead / go deeper'
  | 'Prepare for an upcoming exam'

export type Confidence = 'Just starting out' | 'Fairly confident' | 'Very confident'

export interface UserProfileConfig {
  yearLevel: YearLevel
  subjects: QuizSubject[]
  goal: LearningGoal
  confidence: Confidence
}
