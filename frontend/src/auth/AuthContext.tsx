/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ApiError,
  AuthenticationService,
  OpenAPI,
  type AuthResponse,
  type CurrentUser,
  type DeviceSession,
  type LoginRequest,
  type ProblemDetail,
  type RegisterRequest,
  type UpdateProfileRequest,
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
  listSessions: () => Promise<DeviceSession[]>
  revokeSession: (session: DeviceSession) => Promise<void>
  logoutEverywhere: () => Promise<void>
  validateSession: () => Promise<boolean>
  updateProfile: (request: UpdateProfileRequest) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
let pendingRestoration: Promise<AuthResponse | ProblemDetail> | null = null

function restoreAuthentication() {
  if (pendingRestoration) return pendingRestoration
  const request = Promise.resolve(AuthenticationService.refresh())
  const shared = request.finally(() => {
    if (pendingRestoration === shared) pendingRestoration = null
  })
  pendingRestoration = shared
  return shared
}

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
  const [accessExpiresAt, setAccessExpiresAt] = useState<number | null>(null)

  const becomeAnonymous = useCallback(() => {
    OpenAPI.TOKEN = undefined
    setAccessExpiresAt(null)
    setState({ kind: 'anonymous' })
  }, [])

  const accept = useCallback(async (response: AuthResponse) => {
    OpenAPI.TOKEN = response.accessToken
    const current = await AuthenticationService.getCurrentUser()
    if (!('id' in current)) throw new Error(current.detail)
    setAccessExpiresAt(Date.now() + response.expiresIn * 1000)
    setState({ kind: 'authenticated', user: current })
  }, [])

  useEffect(() => {
    let active = true
    restoreAuthentication()
      .then(async (response) => {
        if (!active) return
        if (isAuthResponse(response)) await accept(response)
        else becomeAnonymous()
      })
      .catch(() => {
        if (active) becomeAnonymous()
      })
    return () => { active = false }
  }, [accept, becomeAnonymous])

  useEffect(() => {
    if (state.kind !== 'authenticated' || accessExpiresAt === null) return
    const delay = Math.max(1_000, accessExpiresAt - Date.now() - 30_000)
    const timer = window.setTimeout(() => {
      AuthenticationService.refresh()
        .then(async (response) => {
          if (isAuthResponse(response)) await accept(response)
          else becomeAnonymous()
        })
        .catch(becomeAnonymous)
    }, delay)
    return () => window.clearTimeout(timer)
  }, [state.kind, accessExpiresAt, accept, becomeAnonymous])

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
      becomeAnonymous()
    }
  }, [becomeAnonymous])

  const listSessions = useCallback(async () => {
    try {
      const response = await AuthenticationService.listSessions()
      if (!('sessions' in response)) throw new Error(response.detail)
      return response.sessions
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) becomeAnonymous()
      throw error
    }
  }, [becomeAnonymous])

  const revokeSession = useCallback(async (session: DeviceSession) => {
    try {
      await AuthenticationService.revokeSession({ sessionId: session.id })
      if (session.current) becomeAnonymous()
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) becomeAnonymous()
      throw error
    }
  }, [becomeAnonymous])

  const validateSession = useCallback(async () => {
    try {
      const current = await AuthenticationService.getCurrentUser()
      if (!('id' in current)) {
        becomeAnonymous()
        return false
      }
      return true
    } catch {
      becomeAnonymous()
      return false
    }
  }, [becomeAnonymous])

  const updateProfile = useCallback(async (request: UpdateProfileRequest) => {
    const response = await AuthenticationService.updateProfile({ requestBody: request })
    if (!('id' in response)) throw new Error(response.detail)
    setState({ kind: 'authenticated', user: response })
  }, [])

  const logoutEverywhere = useCallback(async () => {
    try {
      await AuthenticationService.logoutEverywhere()
    } finally {
      becomeAnonymous()
    }
  }, [becomeAnonymous])

  const value = useMemo(
    () => ({ state, login, register, logout, listSessions, revokeSession, logoutEverywhere, validateSession, updateProfile }),
    [state, login, register, logout, listSessions, revokeSession, logoutEverywhere, validateSession, updateProfile],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
