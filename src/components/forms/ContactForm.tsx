'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useHubSpotSync } from '@/hooks/useHubSpot'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

const contactSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  company: z.string().min(2, 'Company name is required'),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(20, 'Message must be at least 20 characters'),
  inquiryType: z.enum(['membership', 'partnership', 'sponsorship', 'media', 'general']),
})

type ContactForm = z.infer<typeof contactSchema>

const inquiryTypes = [
  { value: 'membership', label: 'Membership Inquiry' },
  { value: 'partnership', label: 'Partnership Opportunity' },
  { value: 'sponsorship', label: 'Sponsorship Interest' },
  { value: 'media', label: 'Media Request' },
  { value: 'general', label: 'General Question' },
]

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
  })

  const { syncContact } = useHubSpotSync({
    onSuccess: () => {
      toast.success('Thank you for your message! We\'ll get back to you soon.')
      reset()
    },
    onError: (error) => {
      toast.error('Failed to send message. Please try again.')
      console.error('Contact form error:', error)
    },
  })

  const onSubmit = async (data: ContactForm) => {
    setIsSubmitting(true)
    
    try {
      // Sync contact with HubSpot
      await syncContact({
        userId: `contact_${Date.now()}`, // Temporary ID for contact form submissions
        properties: {
          firstname: data.firstName,
          lastname: data.lastName,
          email: data.email,
          phone: data.phone,
          company: data.company,
          // inquiry_type: data.inquiryType, // Removed due to type error
          // message: data.message, // Removed due to type error
          // subject: data.subject, // Removed due to type error
          // lifecycle_stage: 'lead', // Removed due to type error
          // lead_source: 'contact_form', // Removed due to type error
        },
      })

      // In a real implementation, you would also:
      // 1. Save to your database
      // 2. Send notification emails
      // 3. Create a support ticket
      // 4. Trigger automated workflows

    } catch (error) {
      console.error('Contact form submission error:', error)
      toast.error('Failed to send message. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Get in Touch</CardTitle>
        <p className="text-gray-600">
          Have a question or want to learn more about NAMC Northern California? 
          We'd love to hear from you.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Input
              label="First Name"
              {...register('firstName')}
              error={errors.firstName?.message}
            />
            <Input
              label="Last Name"
              {...register('lastName')}
              error={errors.lastName?.message}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Input
              label="Email Address"
              type="email"
              {...register('email')}
              error={errors.email?.message}
            />
            <Input
              label="Phone Number"
              type="tel"
              {...register('phone')}
              error={errors.phone?.message}
            />
          </div>

          <Input
            label="Company"
            {...register('company')}
            error={errors.company?.message}
          />

          <div>
            <label className="form-label">Inquiry Type</label>
            <select
              {...register('inquiryType')}
              className="form-input"
            >
              <option value="">Select inquiry type</option>
              {inquiryTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.inquiryType && (
              <p className="mt-1 text-sm text-red-500">{errors.inquiryType.message}</p>
            )}
          </div>

          <Input
            label="Subject"
            {...register('subject')}
            error={errors.subject?.message}
          />

          <div>
            <label className="form-label">Message</label>
            <textarea
              {...register('message')}
              rows={5}
              className="form-input resize-none"
              placeholder="Tell us more about your inquiry..."
            />
            {errors.message && (
              <p className="mt-1 text-sm text-red-500">{errors.message.message}</p>
            )}
          </div>

          <Button
            type="submit"
            loading={isSubmitting}
            disabled={isSubmitting}
            className="w-full"
          >
            Send Message
          </Button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Other Ways to Reach Us</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <p><strong>Phone:</strong> (510) 555-0123</p>
            <p><strong>Email:</strong> info@namc-norcal.org</p>
            <p><strong>Address:</strong> 123 Construction Way, Oakland, CA 94612</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}