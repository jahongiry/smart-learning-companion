import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { getStoredUser } from '../lib/api'

export default function RequireAuth({ children }: { children: ReactNode }) {
  if (!getStoredUser()) {
    return <Navigate to="/login" replace />
  }
  return children
}
