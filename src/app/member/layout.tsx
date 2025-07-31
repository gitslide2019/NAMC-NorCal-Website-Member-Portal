'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import MemberNav from '@/components/layout/MemberNav'

export default function MemberLayout({
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

    // If user is admin, redirect to admin portal
    if (session.user.role === 'admin') {
      router.push('/admin/dashboard')
      return
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-namc-yellow"></div>
      </div>
    )
  }

  if (!session || session.user.role !== 'member') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MemberNav />
      <main className="lg:ml-64 min-h-screen">
        {children}
      </main>
    </div>
  )
}