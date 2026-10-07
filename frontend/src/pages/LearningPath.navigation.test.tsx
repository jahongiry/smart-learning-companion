import { beforeEach, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LearningPath from './LearningPath'
import QuizSetup from './QuizSetup'
import TopicExplain from './TopicExplain'
import { getLearningPath } from '../lib/learningPathApi'
import { getProfile } from '../lib/profileApi'
import { generateQuiz } from '../lib/quizApi'
import { explainTopic } from '../lib/topicApi'
import type { UserProfileConfig } from '../types/profile'

vi.mock('../lib/learningPathApi', () => ({ getLearningPath: vi.fn() }))
vi.mock('../lib/profileApi', () => ({ getProfile: vi.fn() }))
vi.mock('../lib/topicApi', () => ({ explainTopic: vi.fn() }))
vi.mock('../lib/quizApi', async (original) => ({
  ...await original<typeof import('../lib/quizApi')>(), generateQuiz: vi.fn(),
}))

const profile: UserProfileConfig = {
  subjects: ['Science'], yearLevel: 'Year 11', confidence: 'Very confident', goal: 'Get ahead / go deeper',
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getProfile).mockResolvedValue(profile)
  vi.mocked(getLearningPath).mockResolvedValue({
    summary: 'Study your requested topic.',
    recommendations: [
      { subject: 'Mathematics', topic: 'Pythagorean Theorem', reason: 'Start here.', suggestedAction: 'Read an explanation of right triangles' },
      { subject: 'Mathematics', topic: 'Pythagorean Theorem', reason: 'Then practice.', suggestedAction: 'Practice an Easy quiz on this topic' },
    ],
  })
  vi.mocked(generateQuiz).mockResolvedValue({ quizId: 'test-quiz', questions: [] })
  vi.mocked(explainTopic).mockResolvedValue({ summary: 'A right triangle', keyPoints: [], example: '3, 4, 5', practiceTip: 'Try it' })
})

function mount(entry = '/learning-path') {
  return render(<MemoryRouter initialEntries={[entry]}><Routes>
    <Route path="/learning-path" element={<LearningPath />} />
    <Route path="/quiz" element={<QuizSetup />} />
    <Route path="/topics" element={<TopicExplain />} />
    <Route path="/quiz/play" element={<p>Quiz ready</p>} />
  </Routes></MemoryRouter>)
}

async function generatePath() {
  fireEvent.change(screen.getByPlaceholderText(/Want to focus/), { target: { value: 'pifagr' } })
  fireEvent.click(screen.getByRole('button', { name: 'Generate path' }))
  await screen.findByText('Study your requested topic.')
  expect(getLearningPath).toHaveBeenCalledWith('pifagr')
}

it('carries the recommended custom topic and Easy difficulty through to quiz generation', async () => {
  mount()
  await generatePath()
  fireEvent.click(screen.getByRole('link', { name: 'Practice this' }))
  expect(await screen.findByLabelText('Topic')).toHaveValue('Pythagorean Theorem')
  expect(screen.getByLabelText('Subject')).toHaveValue('Mathematics')
  expect(screen.getByLabelText('Difficulty')).toHaveValue('Easy')
  fireEvent.click(screen.getByRole('button', { name: 'Generate quiz' }))
  await screen.findByText('Quiz ready')
  expect(generateQuiz).toHaveBeenCalledWith({ subject: 'Mathematics', topic: 'Pythagorean Theorem', difficulty: 'Easy', questionCount: 5 })
})

it('opens reading recommendations in Explain and preserves the topic after the profile loads', async () => {
  let resolveProfile!: (value: UserProfileConfig) => void
  vi.mocked(getProfile).mockReturnValue(new Promise((resolve) => { resolveProfile = resolve }))
  mount()
  await generatePath()
  fireEvent.click(screen.getByRole('link', { name: 'Read explanation' }))
  expect(screen.getByLabelText('Topic')).toHaveValue('Pythagorean Theorem')
  await act(async () => resolveProfile(profile))
  expect(screen.getByLabelText('Subject')).toHaveValue('Mathematics')
  expect(screen.getByLabelText('Topic')).toHaveValue('Pythagorean Theorem')
  expect(screen.getByLabelText('Year level')).toHaveValue('Year 11')
  fireEvent.click(screen.getByRole('button', { name: 'Explain this topic' }))
  await screen.findByText('A right triangle')
  expect(explainTopic).toHaveBeenCalledWith({ subject: 'Mathematics', topic: 'Pythagorean Theorem', yearLevel: 'Year 11' })
})

it('restores a bookmarked selection even if the profile request fails', async () => {
  vi.mocked(getProfile).mockRejectedValue(new Error('Offline'))
  mount('/quiz?subject=Science&topic=Atoms+%26+ions&difficulty=Hard')
  expect(await screen.findByLabelText('Topic')).toHaveValue('Atoms & ions')
  expect(screen.getByLabelText('Subject')).toHaveValue('Science')
  expect(screen.getByLabelText('Difficulty')).toHaveValue('Hard')
})

it('uses ordinary defaults for invalid query options', async () => {
  vi.mocked(getProfile).mockResolvedValue(null)
  mount('/quiz?subject=Invalid&difficulty=Impossible')
  await waitFor(() => expect(screen.getByLabelText('Topic')).toHaveValue('Algebra'))
  expect(screen.getByLabelText('Difficulty')).toHaveValue('Medium')
})
