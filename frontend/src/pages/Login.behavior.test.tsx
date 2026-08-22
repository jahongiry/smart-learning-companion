import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as api from '../lib/api'
import Login from './Login'

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>()
  return { ...actual, loginUser: vi.fn(), storeAuth: vi.fn() }
})

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<div>Home page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Login page (behavior)', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('logs in successfully and navigates home', async () => {
    const user = userEvent.setup()
    const auth = {
      access_token: 't',
      token_type: 'bearer',
      user: { id: 1, name: 'Jane', email: 'jane@example.com', created_at: 'x' },
    }
    vi.mocked(api.loginUser).mockResolvedValueOnce(auth)

    renderLogin()
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(api.loginUser).toHaveBeenCalledWith('jane@example.com', 'password123')
    await waitFor(() => expect(api.storeAuth).toHaveBeenCalledWith(auth))
    await waitFor(() => expect(screen.getByText('Home page')).toBeInTheDocument())
  })

  it('shows the error message when login fails and does not navigate', async () => {
    const user = userEvent.setup()
    vi.mocked(api.loginUser).mockRejectedValueOnce(new Error('Incorrect email or password'))

    renderLogin()
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(await screen.findByText('Incorrect email or password')).toBeInTheDocument()
    expect(screen.queryByText('Home page')).not.toBeInTheDocument()
  })

  it('disables the submit button and shows a loading label while submitting', async () => {
    const user = userEvent.setup()
    vi.mocked(api.loginUser).mockImplementationOnce(() => new Promise(() => {}))

    renderLogin()
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(screen.getByRole('button', { name: /logging in/i })).toBeDisabled()
  })
})
