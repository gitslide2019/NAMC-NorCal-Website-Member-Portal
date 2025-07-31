'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useHubSpotSync } from '@/hooks/useHubSpot'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const newsletterSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
})

type NewsletterForm = z.infer<typeof newsletterSchema>

interface NewsletterSignupProps {
  className?: string
  variant?: 'light' | 'dark'
}

export default function NewsletterSignup({ className, variant = 'light' }: NewsletterSignupProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<NewsletterForm>({
    resolver: zodResolver(newsletterSchema),
  })

  const { syncContact } = useHubSpotSync({
    onSuccess: () => {
      toast.success('Thank you for subscribing!')
      reset()
    },
    onError: (error) => {
      toast.error('Failed to subscribe. Please try again.')
      console.error('Newsletter subscription error:', error)
    },
  })

  const onSubmit = async (data: NewsletterForm) => {
    setIsSubmitting(true)
    
    try {
      // Sync with HubSpot
      await syncContact({
        userId: `newsletter_${Date.now()}`, // Temporary ID for newsletter subscribers
        properties: {
          firstname: data.firstName || '',
          lastname: data.lastName || '',
          email: data.email,
          membership_status: 'newsletter_subscriber',
          lifecycle_stage: 'subscriber',
        },
      })
    } catch (error) {
      console.error('Newsletter subscription error:', error)
      toast.error('Failed to subscribe. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass = variant === 'dark' 
    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-namc-yellow'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-namc-yellow'

  return (
    <div className={className}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              {...register('email')}
              type="email"
              placeholder="Enter your email address"
              className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-namc-yellow/20 transition-all duration-200 ${inputClass}`}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={isSubmitting}
            className="whitespace-nowrap"
          >
            Subscribe
          </Button>
        </div>

        {/* Optional name fields for more detailed signup */}
        <div className="grid sm:grid-cols-2 gap-4">
          <input
            {...register('firstName')}
            type="text"
            placeholder="First name (optional)"
            className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-namc-yellow/20 transition-all duration-200 ${inputClass}`}
          />
          <input
            {...register('lastName')}
            type="text"
            placeholder="Last name (optional)"
            className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-namc-yellow/20 transition-all duration-200 ${inputClass}`}
          />
        </div>

        <p className={`text-xs ${variant === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          By subscribing, you agree to receive email updates about NAMC events, opportunities, and industry news. 
          You can unsubscribe at any time.
        </p>
      </form>
    </div>
  )
}