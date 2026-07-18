/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ApiError,
  AuthenticationService,
  OpenAPI,
  type AuthResponse,
  type CurrentUser,
  type LoginRequest,
  type ProblemDetail,
  type RegisterRequest,
} from '../generated'

type AuthState =
  | { kind: 'restoring' }
  | { kind: 'anonymous' }
  | { kind: 'authenticated'; user: CurrentUser }

type AuthContextValue = {
  state: AuthState
  login: (request: LoginRequest) => Promise<void>
  register: (request: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function isAuthResponse(value: AuthResponse | ProblemDetail): value is AuthResponse {
  return 'accessToken' in value
}

export function problemMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError && typeof error.body === 'object' && error.body && 'detail' in error.body) {
    return String(error.body.detail)
  }
  return fallback
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ kind: 'restoring' })

  const accept = useCallback(async (response: AuthResponse) => {
    OpenAPI.TOKEN = response.accessToken
    const current = await AuthenticationService.getCurrentUser()
    if (!('id' in current)) throw new Error(current.detail)
    setState({ kind: 'authenticated', user: current })
  }, [])

  useEffect(() => {
    let active = true
    AuthenticationService.refresh()
      .then(async (response) => {
        if (!active) return
        if (isAuthResponse(response)) await accept(response)
        else setState({ kind: 'anonymous' })
      })
      .catch(() => {
        OpenAPI.TOKEN = undefined
        if (active) setState({ kind: 'anonymous' })
      })
    return () => { active = false }
  }, [accept])

  const login = useCallback(async (request: LoginRequest) => {
    const response = await AuthenticationService.login({ requestBody: request })
    if (!isAuthResponse(response)) throw new Error(response.detail)
    await accept(response)
  }, [accept])

  const register = useCallback(async (request: RegisterRequest) => {
    const response = await AuthenticationService.register({ requestBody: request })
    if (!isAuthResponse(response)) throw new Error(response.detail)
    await accept(response)
  }, [accept])

  const logout = useCallback(async () => {
    try {
      await AuthenticationService.logout()
    } finally {
      OpenAPI.TOKEN = undefined
      setState({ kind: 'anonymous' })
    }
  }, [])

  const value = useMemo(() => ({ state, login, register, logout }), [state, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
