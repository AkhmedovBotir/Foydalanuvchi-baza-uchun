import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { getProfile, login as loginRequest, logout as logoutRequest } from '../api/auth'
import { ApiError, getToken } from '../api/client'
import type { Company, LoginPayload } from '../api/types'

type AuthContextValue = {
  company: Company | null
  loading: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => void
  refreshProfile: () => Promise<void>
  setCompany: (company: Company | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }

    getProfile()
      .then(setCompany)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          logoutRequest()
        }
        setCompany(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (payload: LoginPayload) => {
    const data = await loginRequest(payload)
    setCompany(data.company)
  }

  const logout = () => {
    logoutRequest()
    setCompany(null)
  }

  const refreshProfile = async () => {
    const profile = await getProfile()
    setCompany(profile)
  }

  return (
    <AuthContext.Provider
      value={{ company, loading, login, logout, refreshProfile, setCompany }}
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
