import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ThemeToggle from './ThemeToggle'

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

it('switches both ways and restores the saved choice after remounting', () => {
  const view = render(<ThemeToggle />)
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }))
  expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  expect(localStorage.getItem('slc-theme')).toBe('light')
  view.unmount()
  render(<ThemeToggle />)
  fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }))
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  expect(localStorage.getItem('slc-theme')).toBe('dark')
})

it('still switches when browser storage is blocked', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked') })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked') })
  render(<ThemeToggle />)
  fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }))
  expect(document.documentElement).toHaveAttribute('data-theme', 'light')
})

it('syncs a preference changed in another tab', () => {
  render(<ThemeToggle />)
  localStorage.setItem('slc-theme', 'light')
  fireEvent(window, new StorageEvent('storage', { key: 'slc-theme', newValue: 'light' }))
  expect(document.documentElement).toHaveAttribute('data-theme', 'light')
})
