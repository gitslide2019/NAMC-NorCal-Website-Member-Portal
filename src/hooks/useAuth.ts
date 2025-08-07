'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'

interface User {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string
  membershipTier?: string
  company?: string
}

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isMember: boolean
  isAdmin: boolean
}

export function useAuth(): AuthState {
  const { data: session, status } = useSession()
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    isMember: false,
    isAdmin: false
  })

  useEffect(() => {
    const isLoading = status === 'loading'
    const isAuthenticated = status === 'authenticated' && !!session?.user
    const user = session?.user as User | null
    const isMember = isAuthenticated && (user?.role === 'member' || user?.role === 'admin')
    const isAdmin = isAuthenticated && user?.role === 'admin'

    setAuthState({
      user,
      isLoading,
      isAuthenticated,
      isMember,
      isAdmin
    })
  }, [session, status])

  return authState
}

export default useAuth