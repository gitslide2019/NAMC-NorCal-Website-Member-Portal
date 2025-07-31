'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'react-hot-toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1A1A1A',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#FFD700',
              secondary: '#1A1A1A',
            },
          },
        }}
      />
    </SessionProvider>
  )
}