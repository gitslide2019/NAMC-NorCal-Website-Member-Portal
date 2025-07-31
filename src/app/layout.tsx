import type { Metadata } from 'next'
import { Inter, Source_Sans_3 } from 'next/font/google'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { Providers } from './providers'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

const sourceSans = Source_Sans_3({ 
  subsets: ['latin'],
  variable: '--font-source-sans',
})

export const metadata: Metadata = {
  title: 'NAMC NorCal - Building Excellence Since 1969',
  description: 'National Association of Minority Contractors Northern California Chapter. Supporting minority contractors with resources, training, and opportunities.',
  keywords: 'NAMC, minority contractors, construction, Northern California, Oakland, San Francisco, building, contractors',
  openGraph: {
    title: 'NAMC NorCal - Building Excellence Since 1969',
    description: 'Supporting minority contractors throughout Northern California',
    url: 'https://namc-norcal.org',
    siteName: 'NAMC NorCal',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSans.variable}`}>
      <body className="min-h-screen bg-white">
        <Providers>
          <Header />
          <main className="pt-16 lg:pt-20">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}