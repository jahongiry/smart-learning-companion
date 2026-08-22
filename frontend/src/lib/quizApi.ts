import type { QuizAnswer, QuizConfig, QuizDifficulty, QuizQuestion, QuizResult, QuizSubject } from '../types/quiz'

export const TOPICS_BY_SUBJECT: Record<QuizSubject, string[]> = {
  Mathematics: ['Algebra', 'Geometry', 'Trigonometry', 'Statistics'],
  Science: ['Biology', 'Chemistry', 'Physics', 'Earth Science'],
}

// Mock question bank. TODO: replace with a POST /quiz/generate call to the backend
// once the Claude-powered GenAI endpoint exists — this mirrors how Login/Register
// were stubbed with local logic before the auth API was wired up.
const QUESTION_BANK: QuizQuestion[] = [
  {
    id: 'algebra-1',
    subject: 'Mathematics',
    topic: 'Algebra',
    difficulty: 'Easy',
    prompt: 'Solve for x: 2x + 6 = 14',
    options: [
      { id: 'a', text: 'x = 4' },
      { id: 'b', text: 'x = 8' },
      { id: 'c', text: 'x = 10' },
      { id: 'd', text: 'x = 2' },
    ],
    correctOptionId: 'a',
    explanation: 'Subtract 6 from both sides to get 2x = 8, then divide by 2 to get x = 4.',
  },
  {
    id: 'algebra-2',
    subject: 'Mathematics',
    topic: 'Algebra',
    difficulty: 'Medium',
    prompt: 'Factorise: x^2 - 5x + 6',
    options: [
      { id: 'a', text: '(x - 2)(x - 3)' },
      { id: 'b', text: '(x + 2)(x + 3)' },
      { id: 'c', text: '(x - 1)(x - 6)' },
      { id: 'd', text: '(x - 2)(x + 3)' },
    ],
    correctOptionId: 'a',
    explanation: 'Two numbers that multiply to 6 and add to -5 are -2 and -3.',
  },
  {
    id: 'algebra-3',
    subject: 'Mathematics',
    topic: 'Algebra',
    difficulty: 'Hard',
    prompt: 'If f(x) = 3x^2 - 2x + 1, what is f(-2)?',
    options: [
      { id: 'a', text: '17' },
      { id: 'b', text: '9' },
      { id: 'c', text: '13' },
      { id: 'd', text: '21' },
    ],
    correctOptionId: 'a',
    explanation: 'f(-2) = 3(4) - 2(-2) + 1 = 12 + 4 + 1 = 17.',
  },
  {
    id: 'geometry-1',
    subject: 'Mathematics',
    topic: 'Geometry',
    difficulty: 'Easy',
    prompt: 'What is the sum of the interior angles of a triangle?',
    options: [
      { id: 'a', text: '180°' },
      { id: 'b', text: '90°' },
      { id: 'c', text: '270°' },
      { id: 'd', text: '360°' },
    ],
    correctOptionId: 'a',
    explanation: 'The interior angles of any triangle always sum to 180°.',
  },
  {
    id: 'geometry-2',
    subject: 'Mathematics',
    topic: 'Geometry',
    difficulty: 'Medium',
    prompt: 'A circle has radius 7cm. What is its area, to the nearest whole number? (use π ≈ 3.14)',
    options: [
      { id: 'a', text: '154 cm²' },
      { id: 'b', text: '44 cm²' },
      { id: 'c', text: '22 cm²' },
      { id: 'd', text: '308 cm²' },
    ],
    correctOptionId: 'a',
    explanation: 'Area = πr² = 3.14 × 7² = 3.14 × 49 ≈ 154 cm².',
  },
  {
    id: 'geometry-3',
    subject: 'Mathematics',
    topic: 'Geometry',
    difficulty: 'Hard',
    prompt: 'A right triangle has legs of length 9 and 12. What is the length of the hypotenuse?',
    options: [
      { id: 'a', text: '15' },
      { id: 'b', text: '21' },
      { id: 'c', text: '13' },
      { id: 'd', text: '18' },
    ],
    correctOptionId: 'a',
    explanation: 'By the Pythagorean theorem, √(9² + 12²) = √(81 + 144) = √225 = 15.',
  },
  {
    id: 'trig-1',
    subject: 'Mathematics',
    topic: 'Trigonometry',
    difficulty: 'Easy',
    prompt: 'What is sin(90°)?',
    options: [
      { id: 'a', text: '1' },
      { id: 'b', text: '0' },
      { id: 'c', text: '0.5' },
      { id: 'd', text: 'undefined' },
    ],
    correctOptionId: 'a',
    explanation: 'sin(90°) = 1, the maximum value of the sine function.',
  },
  {
    id: 'trig-2',
    subject: 'Mathematics',
    topic: 'Trigonometry',
    difficulty: 'Medium',
    prompt: 'In a right triangle, the opposite side is 5 and the hypotenuse is 13. What is sin(θ)?',
    options: [
      { id: 'a', text: '5/13' },
      { id: 'b', text: '13/5' },
      { id: 'c', text: '12/13' },
      { id: 'd', text: '5/12' },
    ],
    correctOptionId: 'a',
    explanation: 'sin(θ) = opposite / hypotenuse = 5/13.',
  },
  {
    id: 'trig-3',
    subject: 'Mathematics',
    topic: 'Trigonometry',
    difficulty: 'Hard',
    prompt: 'Which identity correctly describes sin²(θ) + cos²(θ)?',
    options: [
      { id: 'a', text: 'It always equals 1' },
      { id: 'b', text: 'It always equals 0' },
      { id: 'c', text: 'It depends on θ' },
      { id: 'd', text: 'It equals tan(θ)' },
    ],
    correctOptionId: 'a',
    explanation: 'This is the Pythagorean identity: sin²(θ) + cos²(θ) = 1 for all θ.',
  },
  {
    id: 'stats-1',
    subject: 'Mathematics',
    topic: 'Statistics',
    difficulty: 'Easy',
    prompt: 'What is the mean of the data set: 4, 8, 6, 5, 3, 2, 8, 9, 2, 5?',
    options: [
      { id: 'a', text: '5.2' },
      { id: 'b', text: '6.0' },
      { id: 'c', text: '4.8' },
      { id: 'd', text: '5.8' },
    ],
    correctOptionId: 'a',
    explanation: 'Sum = 52, count = 10, so the mean is 52 / 10 = 5.2.',
  },
  {
    id: 'stats-2',
    subject: 'Mathematics',
    topic: 'Statistics',
    difficulty: 'Medium',
    prompt: 'Which measure of central tendency is least affected by outliers?',
    options: [
      { id: 'a', text: 'Median' },
      { id: 'b', text: 'Mean' },
      { id: 'c', text: 'Range' },
      { id: 'd', text: 'Sum' },
    ],
    correctOptionId: 'a',
    explanation: 'The median only depends on the middle value(s), so extreme outliers barely affect it.',
  },
  {
    id: 'stats-3',
    subject: 'Mathematics',
    topic: 'Statistics',
    difficulty: 'Hard',
    prompt: 'A standard deviation close to zero indicates what about a data set?',
    options: [
      { id: 'a', text: 'Values are clustered tightly around the mean' },
      { id: 'b', text: 'Values are spread far from the mean' },
      { id: 'c', text: 'The data set has no mean' },
      { id: 'd', text: 'The data set is skewed' },
    ],
    correctOptionId: 'a',
    explanation: 'Standard deviation measures spread; a value near zero means data points sit close to the mean.',
  },
  {
    id: 'biology-1',
    subject: 'Science',
    topic: 'Biology',
    difficulty: 'Easy',
    prompt: 'Which organelle is known as the "powerhouse of the cell"?',
    options: [
      { id: 'a', text: 'Mitochondria' },
      { id: 'b', text: 'Nucleus' },
      { id: 'c', text: 'Ribosome' },
      { id: 'd', text: 'Golgi apparatus' },
    ],
    correctOptionId: 'a',
    explanation: 'Mitochondria generate most of the cell\'s ATP through cellular respiration.',
  },
  {
    id: 'biology-2',
    subject: 'Science',
    topic: 'Biology',
    difficulty: 'Medium',
    prompt: 'During photosynthesis, plants convert carbon dioxide and water into glucose and which gas?',
    options: [
      { id: 'a', text: 'Oxygen' },
      { id: 'b', text: 'Nitrogen' },
      { id: 'c', text: 'Hydrogen' },
      { id: 'd', text: 'Carbon monoxide' },
    ],
    correctOptionId: 'a',
    explanation: 'Photosynthesis releases oxygen as a byproduct: 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂.',
  },
  {
    id: 'biology-3',
    subject: 'Science',
    topic: 'Biology',
    difficulty: 'Hard',
    prompt: 'In genetics, what term describes two different alleles for the same gene?',
    options: [
      { id: 'a', text: 'Heterozygous' },
      { id: 'b', text: 'Homozygous' },
      { id: 'c', text: 'Recessive' },
      { id: 'd', text: 'Dominant' },
    ],
    correctOptionId: 'a',
    explanation: 'Heterozygous describes an organism with two different alleles at a given gene locus.',
  },
  {
    id: 'chemistry-1',
    subject: 'Science',
    topic: 'Chemistry',
    difficulty: 'Easy',
    prompt: 'What is the chemical symbol for gold?',
    options: [
      { id: 'a', text: 'Au' },
      { id: 'b', text: 'Ag' },
      { id: 'c', text: 'Gd' },
      { id: 'd', text: 'Go' },
    ],
    correctOptionId: 'a',
    explanation: 'Gold\'s symbol, Au, comes from its Latin name "aurum".',
  },
  {
    id: 'chemistry-2',
    subject: 'Science',
    topic: 'Chemistry',
    difficulty: 'Medium',
    prompt: 'What type of bond forms when electrons are shared between two atoms?',
    options: [
      { id: 'a', text: 'Covalent bond' },
      { id: 'b', text: 'Ionic bond' },
      { id: 'c', text: 'Metallic bond' },
      { id: 'd', text: 'Hydrogen bond' },
    ],
    correctOptionId: 'a',
    explanation: 'Covalent bonds form when atoms share electron pairs.',
  },
  {
    id: 'chemistry-3',
    subject: 'Science',
    topic: 'Chemistry',
    difficulty: 'Hard',
    prompt: 'A solution with a pH of 3 is how many times more acidic than one with a pH of 5?',
    options: [
      { id: 'a', text: '100 times' },
      { id: 'b', text: '2 times' },
      { id: 'c', text: '10 times' },
      { id: 'd', text: '1000 times' },
    ],
    correctOptionId: 'a',
    explanation: 'The pH scale is logarithmic (base 10), so a difference of 2 pH units means a 10² = 100-fold difference.',
  },
  {
    id: 'physics-1',
    subject: 'Science',
    topic: 'Physics',
    difficulty: 'Easy',
    prompt: 'What is the SI unit of force?',
    options: [
      { id: 'a', text: 'Newton' },
      { id: 'b', text: 'Joule' },
      { id: 'c', text: 'Watt' },
      { id: 'd', text: 'Pascal' },
    ],
    correctOptionId: 'a',
    explanation: 'Force is measured in newtons (N), defined as kg·m/s².',
  },
  {
    id: 'physics-2',
    subject: 'Science',
    topic: 'Physics',
    difficulty: 'Medium',
    prompt: 'An object accelerates from rest at 2 m/s² for 5 seconds. What is its final velocity?',
    options: [
      { id: 'a', text: '10 m/s' },
      { id: 'b', text: '2.5 m/s' },
      { id: 'c', text: '7 m/s' },
      { id: 'd', text: '25 m/s' },
    ],
    correctOptionId: 'a',
    explanation: 'v = u + at = 0 + (2 × 5) = 10 m/s.',
  },
  {
    id: 'physics-3',
    subject: 'Science',
    topic: 'Physics',
    difficulty: 'Hard',
    prompt: "According to Newton's third law, what happens when object A exerts a force on object B?",
    options: [
      { id: 'a', text: 'Object B exerts an equal and opposite force on object A' },
      { id: 'b', text: 'Object B accelerates twice as fast as object A' },
      { id: 'c', text: 'Object A loses all of its momentum' },
      { id: 'd', text: 'No force acts on object A' },
    ],
    correctOptionId: 'a',
    explanation: "Newton's third law: for every action, there is an equal and opposite reaction.",
  },
  {
    id: 'earth-1',
    subject: 'Science',
    topic: 'Earth Science',
    difficulty: 'Easy',
    prompt: 'Which layer of the Earth is primarily composed of molten rock?',
    options: [
      { id: 'a', text: 'Mantle' },
      { id: 'b', text: 'Crust' },
      { id: 'c', text: 'Inner core' },
      { id: 'd', text: 'Stratosphere' },
    ],
    correctOptionId: 'a',
    explanation: 'The mantle is largely made of hot, semi-molten to molten rock beneath the crust.',
  },
  {
    id: 'earth-2',
    subject: 'Science',
    topic: 'Earth Science',
    difficulty: 'Medium',
    prompt: 'What causes the seasons on Earth?',
    options: [
      { id: 'a', text: "The tilt of Earth's axis relative to its orbit" },
      { id: 'b', text: "Earth's distance from the sun changing dramatically" },
      { id: 'c', text: 'The moon blocking sunlight' },
      { id: 'd', text: "Variation in the sun's brightness" },
    ],
    correctOptionId: 'a',
    explanation: "Earth's axial tilt (about 23.5°) changes how directly sunlight hits each hemisphere through the year.",
  },
  {
    id: 'earth-3',
    subject: 'Science',
    topic: 'Earth Science',
    difficulty: 'Hard',
    prompt: 'What is the primary driver of plate tectonic movement?',
    options: [
      { id: 'a', text: 'Convection currents in the mantle' },
      { id: 'b', text: 'Ocean tides' },
      { id: 'c', text: "Earth's magnetic field" },
      { id: 'd', text: 'Wind erosion' },
    ],
    correctOptionId: 'a',
    explanation: 'Heat-driven convection currents in the mantle drag and push tectonic plates over geologic time.',
  },
]

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function byDistanceFrom(target: QuizDifficulty) {
  const order: QuizDifficulty[] = ['Easy', 'Medium', 'Hard']
  const targetIndex = order.indexOf(target)
  return (a: QuizQuestion, b: QuizQuestion) =>
    Math.abs(order.indexOf(a.difficulty) - targetIndex) - Math.abs(order.indexOf(b.difficulty) - targetIndex)
}

export async function generateQuiz(config: QuizConfig): Promise<QuizQuestion[]> {
  // Simulated network delay so the loading state in the UI is meaningful.
  await new Promise((resolve) => setTimeout(resolve, 600))

  const pool = QUESTION_BANK.filter((q) => q.subject === config.subject && q.topic === config.topic)
  const ordered = shuffle(pool).sort(byDistanceFrom(config.difficulty))
  const selected = ordered.slice(0, config.questionCount)

  if (selected.length === 0) {
    throw new Error(`No questions available yet for ${config.subject} · ${config.topic}. Try another topic.`)
  }

  return shuffle(selected)
}

export function scoreQuiz(questions: QuizQuestion[], answers: QuizAnswer[]): QuizResult {
  const answerByQuestionId = new Map(answers.map((a) => [a.questionId, a.selectedOptionId]))

  const reviewed = questions.map((question) => {
    const selectedOptionId = answerByQuestionId.get(question.id) ?? null
    return {
      question,
      selectedOptionId,
      isCorrect: selectedOptionId === question.correctOptionId,
    }
  })

  const correctCount = reviewed.filter((r) => r.isCorrect).length

  return {
    totalQuestions: questions.length,
    correctCount,
    scorePercent: Math.round((correctCount / questions.length) * 100),
    answers: reviewed,
  }
}
