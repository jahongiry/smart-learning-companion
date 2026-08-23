import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Register from './Register'

function renderRegister() {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  )
}

describe('Register page (rendering)', () => {
  it('renders the heading and all four fields', () => {
    renderRegister()
    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toBeRequired()
    expect(screen.getByLabelText(/^email$/i)).toBeRequired()
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute('minlength', '8')
    expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute('minlength', '8')
  })

  it('renders a submit button and a link back to the login page', () => {
    renderRegister()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login')
  })
})
