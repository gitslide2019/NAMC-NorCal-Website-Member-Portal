'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Menu, X, ChevronDown } from 'lucide-react'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { data: session } = useSession()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { href: '/about', label: 'About' },
    { href: '/timeline', label: 'Timeline' },
    { href: '/projects', label: 'Projects' },
    { href: '/shop', label: 'Shop' },
    { href: '/news', label: 'News' },
    { href: '/sponsors', label: 'Sponsors' },
    { href: '/contact', label: 'Contact' },
  ]

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/20'
          : 'bg-transparent'
      )}
    >
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 hover-lift">
            <div className="w-10 h-10 bg-namc-yellow rounded-lg flex items-center justify-center">
              <span className="text-namc-black font-bold text-xl">N</span>
            </div>
            <span className="font-inter font-bold text-xl hidden sm:block">NAMC NorCal</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-700 hover:text-namc-yellow font-medium transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="hidden lg:flex items-center space-x-4">
            {session ? (
              <div className="flex items-center space-x-4">
                <Link href="/member/dashboard">
                  <Button variant="glass" size="sm">
                    Dashboard
                  </Button>
                </Link>
                <Link href="/api/auth/signout">
                  <Button variant="outline" size="sm">
                    Sign Out
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <Link href="/auth/signin">
                  <Button variant="glass" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button variant="primary" size="sm">
                    Become a Member
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-md shadow-lg border-t border-gray-200/20">
            <div className="px-4 py-6 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-2 text-gray-700 hover:text-namc-yellow font-medium transition-colors duration-200"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 space-y-2 border-t border-gray-200">
                {session ? (
                  <>
                    <Link href="/member/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="glass" size="sm" className="w-full">
                        Dashboard
                      </Button>
                    </Link>
                    <Link href="/api/auth/signout" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="outline" size="sm" className="w-full">
                        Sign Out
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/auth/signin" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="glass" size="sm" className="w-full">
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/auth/register" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="primary" size="sm" className="w-full">
                        Become a Member
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}