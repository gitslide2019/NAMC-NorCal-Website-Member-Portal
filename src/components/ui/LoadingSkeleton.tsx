import React from 'react'

interface LoadingSkeletonProps {
  className?: string
  rows?: number
  height?: string
  variant?: 'card' | 'text' | 'circular' | 'rectangular'
  animate?: boolean
}

export default function LoadingSkeleton({ 
  className = '', 
  rows = 1,
  height = 'h-4',
  variant = 'rectangular',
  animate = true
}: LoadingSkeletonProps) {
  const baseClasses = `bg-gray-200 ${animate ? 'animate-pulse' : ''} ${className}`
  
  const variantClasses = {
    card: 'rounded-lg',
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md'
  }

  if (rows === 1) {
    return (
      <div 
        className={`${baseClasses} ${height} ${variantClasses[variant]}`} 
        role="status" 
        aria-label="Loading..."
      />
    )
  }

  return (
    <div className="space-y-3" role="status" aria-label="Loading...">
      {Array.from({ length: rows }, (_, index) => (
        <div 
          key={index}
          className={`${baseClasses} ${height} ${variantClasses[variant]}`}
        />
      ))}
    </div>
  )
}

// Specific skeleton components for common use cases
export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-8">
      {/* Header skeleton */}
      <div className="space-y-2">
        <LoadingSkeleton height="h-8" className="w-1/3" />
        <LoadingSkeleton height="h-4" className="w-1/2" />
      </div>

      {/* Metrics cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }, (_, i) => (
          <LoadingSkeleton key={i} height="h-32" variant="card" />
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <LoadingSkeleton height="h-8" className="w-1/4" />
          {Array.from({ length: 3 }, (_, i) => (
            <LoadingSkeleton key={i} height="h-24" variant="card" />
          ))}
        </div>
        <div className="space-y-4">
          <LoadingSkeleton height="h-8" className="w-1/3" />
          {Array.from({ length: 5 }, (_, i) => (
            <LoadingSkeleton key={i} height="h-16" variant="card" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function ProjectFormSkeleton() {
  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <LoadingSkeleton height="h-8" className="w-1/3" />
        <LoadingSkeleton height="h-4" className="w-1/2" />
      </div>

      {/* Form sections */}
      {Array.from({ length: 4 }, (_, sectionIndex) => (
        <div key={sectionIndex} className="space-y-4">
          <LoadingSkeleton height="h-6" className="w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }, (_, fieldIndex) => (
              <div key={fieldIndex} className="space-y-2">
                <LoadingSkeleton height="h-4" className="w-1/3" />
                <LoadingSkeleton height="h-10" variant="rectangular" />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Action buttons */}
      <div className="flex justify-end space-x-4 pt-6 border-t">
        <LoadingSkeleton height="h-10" className="w-24" variant="rectangular" />
        <LoadingSkeleton height="h-10" className="w-32" variant="rectangular" />
        <LoadingSkeleton height="h-10" className="w-36" variant="rectangular" />
      </div>
    </div>
  )
}