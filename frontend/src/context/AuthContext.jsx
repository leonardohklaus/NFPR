import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { STORAGE_KEY } from '../constants/auth'

const INACTIVITY_MS = 15 * 60 * 1000  // 15 minutes
const MOUSEMOVE_THROTTLE_MS = 1000    // throttle mousemove to 1/sec

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  const navigate = useNavigate()
  const timerRef = useRef(null)
  // Ref so resetTimer closure stays stable — avoids re-registering listeners on every auth change
  const authRef = useRef(auth)
  useEffect(() => { authRef.current = auth }, [auth])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setAuth(null)
    clearTimeout(timerRef.current)
    navigate('/login', { replace: true })
  }, [navigate])

  const resetTimer = useCallback(() => {
    clearTimeout(timerRef.current)
    if (authRef.current) {
      timerRef.current = setTimeout(logout, INACTIVITY_MS)
    }
  }, [logout])

  // Register activity listeners once; throttle mousemove to avoid flooding
  useEffect(() => {
    let lastMouseMove = 0
    const onMouseMove = () => {
      const now = Date.now()
      if (now - lastMouseMove < MOUSEMOVE_THROTTLE_MS) return
      lastMouseMove = now
      resetTimer()
    }
    const events = ['keydown', 'click', 'touchstart', 'scroll']
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      events.forEach(e => window.removeEventListener(e, resetTimer))
      clearTimeout(timerRef.current)
    }
  }, [resetTimer])

  // Start timer on login; stop it on logout
  useEffect(() => {
    if (auth) {
      resetTimer()
    } else {
      clearTimeout(timerRef.current)
    }
  }, [auth, resetTimer])

  const login = useCallback((tokenData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokenData))
    setAuth(tokenData)
  }, [])

  const isAdmin = auth?.role === 'admin'
  const isAuthenticated = !!auth

  return (
    <AuthContext.Provider value={{ auth, login, logout, isAdmin, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
