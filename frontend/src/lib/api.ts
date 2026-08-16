const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

export interface AuthUser {
  id: number
  name: string
  email: string
  created_at: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: AuthUser
}

class ApiError extends Error {}

async function request(path: string, body: unknown): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(data?.detail ?? 'Something went wrong. Please try again.')
  }
  return data as AuthResponse
}

export function registerUser(name: string, email: string, password: string) {
  return request('/auth/register', { name, email, password })
}

export function loginUser(email: string, password: string) {
  return request('/auth/login', { email, password })
}

const TOKEN_KEY = 'slc_token'
const USER_KEY = 'slc_user'

export function storeAuth(auth: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, auth.access_token)
  localStorage.setItem(USER_KEY, JSON.stringify(auth.user))
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
