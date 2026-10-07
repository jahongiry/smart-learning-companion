import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Telegram from './Telegram'
import { confirmTelegram, createTelegramLink, disconnectTelegram, getTelegramStatus, saveTelegramPreferences,
  type TelegramStatus } from '../lib/telegramApi'

vi.mock('../lib/telegramApi', () => ({
  confirmTelegram: vi.fn(), createTelegramLink: vi.fn(), disconnectTelegram: vi.fn(),
  getTelegramStatus: vi.fn(), saveTelegramPreferences: vi.fn(),
}))
const base: TelegramStatus = { available: true, connected: false, bot_username: 'TestBot', username: null,
  pending: null, daily_enabled: false, timezone: 'Australia/Sydney', daily_time: '18:00', question_limit: 30 }

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getTelegramStatus).mockResolvedValue(base)
})
const mount = () => render(<MemoryRouter><Telegram /></MemoryRouter>)

it('requires confirmation of the actual Telegram account and separate daily opt-in', async () => {
  vi.mocked(getTelegramStatus).mockResolvedValue({ ...base, pending: { username: 'student', chat_id: '101' } })
  vi.mocked(confirmTelegram).mockResolvedValue({ ...base, connected: true, username: 'student', daily_enabled: true })
  mount()
  const confirm = await screen.findByRole('button', { name: 'Confirm my Telegram account' })
  const daily = screen.getByRole('checkbox')
  expect(daily).not.toBeChecked()
  expect(confirmTelegram).not.toHaveBeenCalled()
  fireEvent.click(daily)
  fireEvent.click(confirm)
  await screen.findByText(/Telegram connected/)
  expect(confirmTelegram).toHaveBeenCalledWith({ daily_enabled: true, timezone: 'Australia/Sydney', daily_time: '18:00' })
})

it('opens a server-issued connection link without auto-linking or sharing history', async () => {
  vi.mocked(createTelegramLink).mockResolvedValue({ url: 'https://t.me/TestBot?start=one-use', expires_in: 600 })
  mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Connect Telegram' }))
  expect(await screen.findByRole('link', { name: 'Open Telegram and press Start' })).toHaveAttribute('href', 'https://t.me/TestBot?start=one-use')
  expect(confirmTelegram).not.toHaveBeenCalled()
})

it('saves changed timezone and delivery preferences and permits disconnect', async () => {
  vi.mocked(getTelegramStatus).mockResolvedValue({ ...base, connected: true, username: 'student', daily_enabled: true })
  vi.mocked(saveTelegramPreferences).mockResolvedValue({ ...base, connected: true, timezone: 'Asia/Tashkent', daily_time: '19:30' })
  vi.mocked(disconnectTelegram).mockResolvedValue(undefined)
  mount()
  fireEvent.change(await screen.findByLabelText('Timezone'), { target: { value: 'Asia/Tashkent' } })
  fireEvent.change(screen.getByLabelText('Daily delivery time'), { target: { value: '19:30' } })
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }))
  await screen.findByText('Preferences saved.')
  expect(saveTelegramPreferences).toHaveBeenCalledWith({ daily_enabled: false, timezone: 'Asia/Tashkent', daily_time: '19:30' })
  vi.mocked(getTelegramStatus).mockResolvedValue(base)
  fireEvent.click(screen.getByRole('button', { name: 'Disconnect Telegram' }))
  await waitFor(() => expect(disconnectTelegram).toHaveBeenCalledOnce())
  await screen.findByRole('button', { name: 'Connect Telegram' })
})

it('does not offer linking before the backend is configured', async () => {
  vi.mocked(getTelegramStatus).mockResolvedValue({ ...base, available: false })
  mount()
  await screen.findByText(/Telegram is not available yet/)
  expect(screen.queryByRole('button', { name: 'Connect Telegram' })).not.toBeInTheDocument()
})
