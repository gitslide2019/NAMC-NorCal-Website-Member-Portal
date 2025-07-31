import React from 'react'

export default function SkipNavigation() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-namc-gold text-black px-4 py-2 rounded-md z-50 font-medium"
    >
      Skip to main content
    </a>
  )
}