import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import QuizPlay from './QuizPlay'
import { submitQuizAttempt } from '../lib/quizApi'

vi.mock('../lib/quizApi', async (importOriginal) => ({ ...await importOriginal<typeof import('../lib/quizApi')>(), submitQuizAttempt: vi.fn() }))
const question = { id: 'q1', subject: 'Mathematics', topic: 'Algebra', difficulty: 'Easy', prompt: 'One plus one?',
  options: [{ id: 'a', text: 'Two' }, { id: 'b', text: 'Three' }], correctOptionId: 'a', explanation: 'Addition' }

beforeEach(() => vi.resetAllMocks())

it('keeps answers and shows a retryable error if persistence fails', async () => {
  vi.mocked(submitQuizAttempt).mockRejectedValueOnce(new Error('Could not save')).mockResolvedValueOnce({ score_percent: 100, correct_count: 1, total_questions: 1 })
  render(<MemoryRouter initialEntries={[{ pathname: '/quiz/play', state: { quizId: 'saved-id', questions: [question] } }]}>
    <Routes><Route path="/quiz/play" element={<QuizPlay />} /><Route path="/quiz/results" element={<p>Saved results</p>} /></Routes>
  </MemoryRouter>)
  fireEvent.click(screen.getByText('Two'))
  fireEvent.click(screen.getByText('Submit quiz'))
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save')
  expect(screen.queryByText('Saved results')).not.toBeInTheDocument()
  fireEvent.click(screen.getByText('Submit quiz'))
  await screen.findByText('Saved results')
  expect(submitQuizAttempt).toHaveBeenCalledWith('saved-id', expect.objectContaining({ correctCount: 1 }))
})
