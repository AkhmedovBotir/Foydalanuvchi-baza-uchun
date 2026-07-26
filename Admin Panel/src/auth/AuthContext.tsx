import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { getProfile, login as loginRequest, logout as logoutRequest } from '../api/auth'
import { ApiError, getToken } from '../api/client'
import type { Admin, LoginPayload } from '../api/types'

type AuthContextValue = {
  admin: Admin | null
  loading: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => void
  refreshProfile: () => Promise<void>
  setAdmin: (admin: Admin | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }

    getProfile()
      .then(setAdmin)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          logoutRequest()
        }
        setAdmin(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (payload: LoginPayload) => {
    const data = await loginRequest(payload)
    setAdmin(data.admin)
  }

  const logout = () => {
    logoutRequest()
    setAdmin(null)
  }

  const refreshProfile = async () => {
    const profile = await getProfile()
    setAdmin(profile)
  }

  return (
    <AuthContext.Provider
      value={{ admin, loading, login, logout, refreshProfile, setAdmin }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth AuthProvider ichida ishlatilishi kerak')
  return ctx
}
