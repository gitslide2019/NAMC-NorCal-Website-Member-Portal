'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import AdminNav from '@/components/layout/AdminNav'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    // If user is not admin, redirect to member portal
    if (session.user.role !== 'admin') {
      router.push('/member/dashboard')
      return
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-namc-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-namc-yellow"></div>
      </div>
    )
  }

  if (!session || session.user.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <main className="lg:ml-64 min-h-screen">
        {children}
      </main>
    </div>
  )
}