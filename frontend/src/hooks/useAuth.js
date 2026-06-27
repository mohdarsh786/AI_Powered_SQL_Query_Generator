import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const checkAuth = async () => {
      try {
        const res = await api.get('/api/auth/me')
        if (!cancelled) {
          setUser(res.data.user)
        }
      } catch {
        if (!cancelled) {
          setUser(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    checkAuth()

    return () => {
      cancelled = true
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout')
    } catch {
      // ignore logout errors
    } finally {
      setUser(null)
      window.location.href = '/login'
    }
  }, [])

  return { user, loading, logout }
}
