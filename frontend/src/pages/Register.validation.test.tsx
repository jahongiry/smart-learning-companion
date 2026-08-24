import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as api from '../lib/api'
import Register from './Register'

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>()
  return { ...actual, registerUser: vi.fn(), storeAuth: vi.fn() }
})

function renderRegister() {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  )
}

describe('Register page (client-side validation)', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('blocks submission and shows an error when passwords do not match', async () => {
    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe')
    await user.type(screen.getByLabelText(/^email$/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password456')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument()
    expect(api.registerUser).not.toHaveBeenCalled()
  })

  it('proceeds to call registerUser when passwords match', async () => {
    const user = userEvent.setup()
    vi.mocked(api.registerUser).mockResolvedValueOnce({
      access_token: 't',
      token_type: 'bearer',
      user: { id: 1, name: 'Jane Doe', email: 'jane@example.com', created_at: 'x' },
    })

    renderRegister()
    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe')
    await user.type(screen.getByLabelText(/^email$/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(api.registerUser).toHaveBeenCalledWith('Jane Doe', 'jane@example.com', 'password123')
  })
})
