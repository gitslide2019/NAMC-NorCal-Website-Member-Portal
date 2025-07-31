'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { 
  LayoutDashboard, 
  Users, 
  FolderOpen, 
  FileText, 
  BarChart3,
  Settings,
  Shield,
  MessageSquare,
  Calendar,
  TestTube,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/members', label: 'Members', icon: Users },
  { href: '/admin/projects', label: 'Projects', icon: FolderOpen },
  { href: '/admin/content', label: 'Content', icon: FileText },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/events', label: 'Events', icon: Calendar },
  { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { href: '/admin/hubspot-test', label: 'HubSpot Testing', icon: TestTube },
  { href: '/admin/security', label: 'Security', icon: Shield },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden bg-namc-black text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-namc-yellow rounded-lg flex items-center justify-center">
            <span className="text-namc-black font-bold text-sm">N</span>
          </div>
          <span className="font-inter font-bold">NAMC Admin</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-gray-800"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50">
          <div className="bg-namc-black text-white w-64 h-full p-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-namc-yellow rounded-lg flex items-center justify-center">
                  <span className="text-namc-black font-bold">N</span>
                </div>
                <span className="font-inter font-bold">NAMC Admin</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-800"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="space-y-2">
              {adminNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-namc-yellow text-namc-black'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    )}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="mt-8 pt-8 border-t border-gray-800">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-namc-yellow rounded-full flex items-center justify-center">
                  <span className="text-namc-black font-medium text-sm">
                    {session?.user?.name?.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-sm">{session?.user?.name}</p>
                  <p className="text-gray-400 text-xs">{session?.user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-3 px-3 py-2 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg w-full text-sm"
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 bottom-0 w-64 bg-namc-black text-white z-30">
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-8">
            <div className="w-10 h-10 bg-namc-yellow rounded-lg flex items-center justify-center">
              <span className="text-namc-black font-bold">N</span>
            </div>
            <span className="font-inter font-bold text-lg">NAMC Admin</span>
          </div>

          <nav className="space-y-2">
            {adminNavItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-namc-yellow text-namc-black'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  )}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-800">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-namc-yellow rounded-full flex items-center justify-center">
              <span className="text-namc-black font-medium">
                {session?.user?.name?.charAt(0)}
              </span>
            </div>
            <div>
              <p className="font-medium text-sm">{session?.user?.name}</p>
              <p className="text-gray-400 text-xs">{session?.user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center space-x-3 px-3 py-2 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg w-full text-sm"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}