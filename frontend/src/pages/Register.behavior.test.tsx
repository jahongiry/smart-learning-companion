import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as api from '../lib/api'
import Register from './Register'

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>()
  return { ...actual, registerUser: vi.fn(), storeAuth: vi.fn() }
})

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={<div>Home page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/full name/i), 'Jane Doe')
  await user.type(screen.getByLabelText(/^email$/i), 'jane@example.com')
  await user.type(screen.getByLabelText(/^password$/i), 'password123')
  await user.type(screen.getByLabelText(/confirm password/i), 'password123')
}

describe('Register page (behavior)', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('registers successfully and navigates home', async () => {
    const user = userEvent.setup()
    const auth = {
      access_token: 't',
      token_type: 'bearer',
      user: { id: 1, name: 'Jane Doe', email: 'jane@example.com', created_at: 'x' },
    }
    vi.mocked(api.registerUser).mockResolvedValueOnce(auth)

    renderRegister()
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => expect(api.storeAuth).toHaveBeenCalledWith(auth))
    await waitFor(() => expect(screen.getByText('Home page')).toBeInTheDocument())
  })

  it('shows the server error message when registration fails', async () => {
    const user = userEvent.setup()
    vi.mocked(api.registerUser).mockRejectedValueOnce(new Error('Email is already registered'))

    renderRegister()
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText('Email is already registered')).toBeInTheDocument()
    expect(screen.queryByText('Home page')).not.toBeInTheDocument()
  })

  it('disables the submit button and shows a loading label while submitting', async () => {
    const user = userEvent.setup()
    vi.mocked(api.registerUser).mockImplementationOnce(() => new Promise(() => {}))

    renderRegister()
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled()
  })
})
