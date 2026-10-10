import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import AISettings from './AISettings'

function show() { return render(<MemoryRouter><AISettings /></MemoryRouter>) }

it('previews a provider connection without sending requests or storing credentials', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch')
  const storageSpy = vi.spyOn(Storage.prototype, 'setItem')
  show()
  expect(screen.getByLabelText('Demo API key')).toHaveAttribute('readonly')
  fireEvent.change(screen.getByLabelText('AI provider'), { target: { value: 'anthropic' } })
  fireEvent.click(screen.getByRole('button', { name: 'Connect demo provider' }))
  expect(screen.getByText('Anthropic (Claude) connected (demo)')).toBeInTheDocument()
  expect(fetchSpy).not.toHaveBeenCalled()
  expect(storageSpy).not.toHaveBeenCalled()
  fetchSpy.mockRestore()
  storageSpy.mockRestore()
})

it('lets the presenter change Telegram scope and disconnect', () => {
  show()
  fireEvent.click(screen.getByText('Connect demo provider'))
  expect(screen.getByText('Demo scope: website only.')).toBeInTheDocument()
  fireEvent.click(screen.getByLabelText('Include Telegram learning (demo preference)'))
  expect(screen.getByText('Demo scope: website and Telegram tutor.')).toBeInTheDocument()
  fireEvent.click(screen.getByText('Disconnect demo connection'))
  expect(screen.getByText('No demo connection yet')).toBeInTheDocument()
})

it('clearly identifies ChatGPT as a preview and resets on remount', () => {
  const view = show()
  fireEvent.click(screen.getByText('Preview ChatGPT connection'))
  expect(screen.getByText('ChatGPT connected (demo)')).toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('No sign-in occurred')
  view.unmount()
  show()
  expect(screen.getByText('No demo connection yet')).toBeInTheDocument()
})
