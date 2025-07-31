import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'dark' | 'yellow'
  hover?: boolean
}

export function Card({ className, variant = 'default', hover = true, children, ...props }: CardProps) {
  const variants = {
    default: 'card',
    dark: 'card-dark',
    yellow: 'glass-yellow rounded-xl p-6 shadow-xl',
  }

  return (
    <div
      className={cn(
        variants[variant],
        hover && 'hover:shadow-2xl transition-all duration-300',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-xl font-bold', className)} {...props} />
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-gray-600 mt-2', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('', className)} {...props} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-4 pt-4 border-t border-gray-200', className)} {...props} />
}