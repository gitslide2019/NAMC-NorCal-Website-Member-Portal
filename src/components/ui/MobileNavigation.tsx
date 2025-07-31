import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Menu, 
  X, 
  Home, 
  BarChart3, 
  Upload, 
  FileText, 
  Users,
  Settings 
} from 'lucide-react'

interface MobileNavigationProps {
  className?: string
}

export default function MobileNavigation({ className = '' }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const navigationItems = [
    { href: '/admin', label: 'Dashboard', icon: Home },
    { href: '/admin/projects/dashboard', label: 'Projects', icon: BarChart3 },
    { href: '/admin/projects/opportunities', label: 'Upload', icon: Upload },
    { href: '/admin/members', label: 'Members', icon: Users },
    { href: '/admin/reports', label: 'Reports', icon: FileText },
    { href: '/admin/settings', label: 'Settings', icon: Settings }
  ]

  const handleNavigation = (href: string) => {
    router.push(href)
    setIsOpen(false)
  }

  const isCurrentPath = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <div className={`md:hidden ${className}`}>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-50 p-3 bg-namc-gold text-black rounded-full shadow-lg"
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Slide-out Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.nav
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-80 bg-white shadow-xl z-40 overflow-y-auto"
            role="navigation"
            aria-label="Mobile navigation"
          >
            <div className="p-6 pt-20">
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900">Navigation</h2>
                <p className="text-sm text-gray-600">NAMC Admin Portal</p>
              </div>

              <ul className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon
                  const current = isCurrentPath(item.href)
                  
                  return (
                    <li key={item.href}>
                      <button
                        onClick={() => handleNavigation(item.href)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                          current
                            ? 'bg-namc-gold text-black font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        aria-current={current ? 'page' : undefined}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                        <span>{item.label}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  )
}