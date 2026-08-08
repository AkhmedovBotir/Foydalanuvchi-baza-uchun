import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { getProfile, login as loginRequest, logout as logoutRequest } from '../api/auth'
import { ApiError, getToken } from '../api/client'
import type { LoginPayload, StaffUser } from '../api/types'

type AuthContextValue = {
  user: StaffUser | null
  loading: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => void
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }

    getProfile()
      .then(setUser)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          logoutRequest()
        }
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (payload: LoginPayload) => {
    const data = await loginRequest(payload)
    setUser(data.doctor)
  }

  const logout = () => {
    logoutRequest()
    setUser(null)
  }

  const refreshProfile = async () => {
    const profile = await getProfile()
    setUser(profile)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth AuthProvider ichida ishlatilishi kerak')
  return ctx
}
