'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { 
  LayoutDashboard, 
  FolderOpen, 
  GraduationCap, 
  Wrench, 
  Users, 
  Calendar,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const memberNavItems = [
  { href: '/member/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/member/projects', label: 'Projects', icon: FolderOpen },
  { href: '/member/learning', label: 'Learning', icon: GraduationCap },
  { href: '/member/tools', label: 'Tools', icon: Wrench },
  { href: '/member/directory', label: 'Directory', icon: Users },
  { href: '/member/events', label: 'Events', icon: Calendar },
  { href: '/member/messages', label: 'Messages', icon: MessageSquare },
  { href: '/member/settings', label: 'Settings', icon: Settings },
]

export default function MemberNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-namc-yellow rounded-lg flex items-center justify-center">
            <span className="text-namc-black font-bold text-sm">N</span>
          </div>
          <span className="font-inter font-bold">NAMC Portal</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50">
          <div className="bg-white w-64 h-full p-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-namc-yellow rounded-lg flex items-center justify-center">
                  <span className="text-namc-black font-bold">N</span>
                </div>
                <span className="font-inter font-bold">NAMC Portal</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="space-y-2">
              {memberNavItems.map((item) => {
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
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 font-medium text-sm">
                    {session?.user?.name?.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-sm">{session?.user?.name}</p>
                  <p className="text-gray-500 text-xs">{session?.user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg w-full text-sm"
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 z-30">
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-8">
            <div className="w-10 h-10 bg-namc-yellow rounded-lg flex items-center justify-center">
              <span className="text-namc-black font-bold">N</span>
            </div>
            <span className="font-inter font-bold text-lg">NAMC Portal</span>
          </div>

          <nav className="space-y-2">
            {memberNavItems.map((item) => {
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
                      : 'text-gray-700 hover:bg-gray-100'
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
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-gray-600 font-medium">
                {session?.user?.name?.charAt(0)}
              </span>
            </div>
            <div>
              <p className="font-medium text-sm">{session?.user?.name}</p>
              <p className="text-gray-500 text-xs">{session?.user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg w-full text-sm"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}