import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TutorChat from './TutorChat'
import { clearTutorHistory, loadTutorHistory, sendTutorMessage } from '../lib/tutorApi'

vi.mock('../lib/api', () => ({
  getStoredUser: () => ({ id: 1, name: 'Student' }),
  ApiError: class extends Error { status = 500 },
}))
vi.mock('../lib/tutorApi', () => ({ loadTutorHistory: vi.fn(), clearTutorHistory: vi.fn(), sendTutorMessage: vi.fn() }))

function openChat() {
  render(<MemoryRouter><TutorChat /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Open AI tutor chat' }))
}

describe('persistent tutor conversations', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    Element.prototype.scrollTo = vi.fn()
    vi.mocked(loadTutorHistory).mockResolvedValue([])
  })

  it('restores saved messages and displays retrieved evidence', async () => {
    vi.mocked(loadTutorHistory).mockResolvedValue([{ role: 'user', content: 'How was algebra?' },
      { role: 'assistant', content: 'You scored 80%.', sources: [{ id: '1', title: 'Algebra quiz', kind: 'quiz', date: '2026-10-05', excerpt: '4 of 5 correct' }] }])
    openChat()
    expect(await screen.findByText('You scored 80%.')).toBeInTheDocument()
    expect(screen.getByText('4 of 5 correct')).toBeInTheDocument()
  })

  it('does not send until history loads, and lets the student retry a load failure', async () => {
    vi.mocked(loadTutorHistory).mockRejectedValueOnce(new Error('Offline'))
    openChat()
    fireEvent.change(screen.getByPlaceholderText('Ask a question…'), { target: { value: 'Help me' } })
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
    fireEvent.click(await screen.findByText('Retry loading history'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled())
  })

  it('restores failed input and reuses the request id on retry', async () => {
    vi.mocked(sendTutorMessage).mockRejectedValueOnce(new Error('Try again')).mockResolvedValueOnce({ reply: 'Practise fractions.', sources: [] })
    openChat()
    await waitFor(() => expect(screen.queryByText('Loading saved conversations…')).not.toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText('Ask a question…'), { target: { value: 'What next?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await screen.findByText('Try again')
    expect(screen.getByPlaceholderText('Ask a question…')).toHaveValue('What next?')
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await screen.findByText('Practise fractions.')
    expect(vi.mocked(sendTutorMessage).mock.calls[0]).toEqual(vi.mocked(sendTutorMessage).mock.calls[1])
    expect(vi.mocked(sendTutorMessage).mock.calls[0][0]).toBe('What next?')
  })

  it('only deletes after confirmation, then removes messages', async () => {
    vi.mocked(loadTutorHistory).mockResolvedValue([{ role: 'user', content: 'Remember fractions' }])
    vi.mocked(clearTutorHistory).mockResolvedValue()
    openChat()
    await screen.findByText('Remember fractions')
    fireEvent.click(screen.getByText('Clear conversations'))
    expect(clearTutorHistory).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Delete chats'))
    await waitFor(() => expect(screen.queryByText('Remember fractions')).not.toBeInTheDocument())
    expect(clearTutorHistory).toHaveBeenCalledOnce()
  })
})
