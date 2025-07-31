import Link from 'next/link'
import { Facebook, Twitter, Linkedin, Instagram, Mail, Phone, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-namc-black text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About Section */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-namc-yellow rounded-lg flex items-center justify-center">
                <span className="text-namc-black font-bold text-xl">N</span>
              </div>
              <span className="font-inter font-bold text-xl">NAMC NorCal</span>
            </div>
            <p className="text-gray-400 mb-4">
              Building Excellence Since 1969. Supporting minority contractors throughout Northern California.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-namc-yellow transition-colors">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-namc-yellow transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-namc-yellow transition-colors">
                <Linkedin size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-namc-yellow transition-colors">
                <Instagram size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-inter font-bold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-gray-400 hover:text-namc-yellow transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/membership" className="text-gray-400 hover:text-namc-yellow transition-colors">
                  Membership
                </Link>
              </li>
              <li>
                <Link href="/projects" className="text-gray-400 hover:text-namc-yellow transition-colors">
                  Projects
                </Link>
              </li>
              <li>
                <Link href="/news" className="text-gray-400 hover:text-namc-yellow transition-colors">
                  News & Events
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-namc-yellow transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-inter font-bold text-lg mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/member/portal" className="text-gray-400 hover:text-namc-yellow transition-colors">
                  Member Portal
                </Link>
              </li>
              <li>
                <Link href="/learning" className="text-gray-400 hover:text-namc-yellow transition-colors">
                  Learning Center
                </Link>
              </li>
              <li>
                <Link href="/tools" className="text-gray-400 hover:text-namc-yellow transition-colors">
                  Tool Library
                </Link>
              </li>
              <li>
                <Link href="/resources" className="text-gray-400 hover:text-namc-yellow transition-colors">
                  Resources
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-400 hover:text-namc-yellow transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-inter font-bold text-lg mb-4">Contact Us</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <MapPin size={20} className="text-namc-yellow mt-1 flex-shrink-0" />
                <p className="text-gray-400">
                  123 Construction Way<br />
                  Oakland, CA 94612
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Phone size={20} className="text-namc-yellow flex-shrink-0" />
                <p className="text-gray-400">(510) 555-0123</p>
              </div>
              <div className="flex items-center space-x-3">
                <Mail size={20} className="text-namc-yellow flex-shrink-0" />
                <p className="text-gray-400">info@namc-norcal.org</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              © 2025 NAMC Northern California. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <Link href="/privacy" className="text-gray-400 hover:text-namc-yellow text-sm transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-namc-yellow text-sm transition-colors">
                Terms of Service
              </Link>
              <Link href="/accessibility" className="text-gray-400 hover:text-namc-yellow text-sm transition-colors">
                Accessibility
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}