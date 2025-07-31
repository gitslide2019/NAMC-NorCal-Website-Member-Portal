'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

const registrationSchema = z.object({
  // Step 1: Basic Information
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  company: z.string().min(2, 'Company name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  
  // Step 2: Business Details
  businessAddress: z.string().min(5, 'Business address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().length(2, 'Please enter a valid state code'),
  zip: z.string().min(5, 'Please enter a valid ZIP code'),
  licenseNumber: z.string().min(3, 'License number is required'),
  yearsExperience: z.string().min(1, 'Years of experience is required'),
  specialties: z.array(z.string()).min(1, 'Please select at least one specialty'),
  serviceAreas: z.string().min(5, 'Service areas are required'),
  
  // Step 3: Documents
  documents: z.object({
    license: z.boolean(),
    insurance: z.boolean(),
    bonding: z.boolean(),
  }),
  
  // Step 4: Agreement
  agreesToTerms: z.boolean().refine(val => val === true, 'You must agree to the terms'),
  agreeToPrivacy: z.boolean().refine(val => val === true, 'You must agree to the privacy policy'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type RegistrationForm = z.infer<typeof registrationSchema>

const steps = [
  { id: 1, title: 'Basic Information', description: 'Personal and contact details' },
  { id: 2, title: 'Business Details', description: 'Company and licensing information' },
  { id: 3, title: 'Document Upload', description: 'Required business documents' },
  { id: 4, title: 'Review & Submit', description: 'Confirm your application' },
]

const specialtyOptions = [
  'Residential Construction',
  'Commercial Construction',
  'Industrial Construction',
  'Electrical Work',
  'Plumbing',
  'HVAC',
  'Roofing',
  'Flooring',
  'Painting',
  'Landscaping',
]

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      specialties: [],
      documents: {
        license: false,
        insurance: false,
        bonding: false,
      },
      agreesToTerms: false,
      agreeToPrivacy: false,
    },
  })

  const watchedSpecialties = watch('specialties')

  const nextStep = async () => {
    let fieldsToValidate: (keyof RegistrationForm)[] = []
    
    switch (currentStep) {
      case 1:
        fieldsToValidate = ['firstName', 'lastName', 'email', 'phone', 'company', 'password', 'confirmPassword']
        break
      case 2:
        fieldsToValidate = ['businessAddress', 'city', 'state', 'zip', 'licenseNumber', 'yearsExperience', 'specialties', 'serviceAreas']
        break
      case 3:
        // Document validation would go here
        break
    }

    const isValid = await trigger(fieldsToValidate as any)
    if (isValid && currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const onSubmit = async (data: RegistrationForm) => {
    setIsLoading(true)
    
    try {
      // In a real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast.success('Registration submitted successfully!')
      router.push('/auth/signin?message=Please check your email to verify your account')
    } catch (error) {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSpecialty = (specialty: string) => {
    const current = watchedSpecialties || []
    const updated = current.includes(specialty)
      ? current.filter(s => s !== specialty)
      : [...current, specialty]
    setValue('specialties', updated)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-namc-yellow rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-namc-black font-bold text-2xl">N</span>
          </div>
          <h1 className="text-3xl font-inter font-bold text-namc-black">Become a Member</h1>
          <p className="mt-2 text-gray-600">Join NAMC Northern California and grow your business</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.id
                    ? 'bg-namc-yellow border-namc-yellow text-namc-black'
                    : 'border-gray-300 text-gray-400'
                }`}>
                  {currentStep > step.id ? (
                    <Check size={20} />
                  ) : (
                    <span className="font-semibold">{step.id}</span>
                  )}
                </div>
                <div className="ml-3 hidden sm:block">
                  <p className={`text-sm font-medium ${
                    currentStep >= step.id ? 'text-namc-black' : 'text-gray-400'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`hidden sm:block w-20 h-0.5 ml-4 ${
                    currentStep > step.id ? 'bg-namc-yellow' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep - 1].title}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
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
                  <Input
                    label="Email Address"
                    type="email"
                    {...register('email')}
                    error={errors.email?.message}
                  />
                  <div className="grid md:grid-cols-2 gap-6">
                    <Input
                      label="Phone Number"
                      type="tel"
                      {...register('phone')}
                      error={errors.phone?.message}
                    />
                    <Input
                      label="Company Name"
                      {...register('company')}
                      error={errors.company?.message}
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <Input
                      label="Password"
                      type="password"
                      {...register('password')}
                      error={errors.password?.message}
                    />
                    <Input
                      label="Confirm Password"
                      type="password"
                      {...register('confirmPassword')}
                      error={errors.confirmPassword?.message}
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 2: Business Details */}
              {currentStep === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <Input
                    label="Business Address"
                    {...register('businessAddress')}
                    error={errors.businessAddress?.message}
                  />
                  <div className="grid md:grid-cols-3 gap-6">
                    <Input
                      label="City"
                      {...register('city')}
                      error={errors.city?.message}
                    />
                    <Input
                      label="State"
                      {...register('state')}
                      error={errors.state?.message}
                      placeholder="CA"
                    />
                    <Input
                      label="ZIP Code"
                      {...register('zip')}
                      error={errors.zip?.message}
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <Input
                      label="License Number"
                      {...register('licenseNumber')}
                      error={errors.licenseNumber?.message}
                    />
                    <Input
                      label="Years of Experience"
                      type="number"
                      {...register('yearsExperience')}
                      error={errors.yearsExperience?.message}
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Specialties (Select all that apply)</label>
                    <div className="grid md:grid-cols-2 gap-3 mt-2">
                      {specialtyOptions.map(specialty => (
                        <label key={specialty} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={watchedSpecialties?.includes(specialty) || false}
                            onChange={() => toggleSpecialty(specialty)}
                            className="rounded border-gray-300 text-namc-yellow focus:ring-namc-yellow"
                          />
                          <span className="ml-2 text-sm">{specialty}</span>
                        </label>
                      ))}
                    </div>
                    {errors.specialties && (
                      <p className="mt-1 text-sm text-red-500">{errors.specialties.message}</p>
                    )}
                  </div>

                  <Input
                    label="Service Areas"
                    {...register('serviceAreas')}
                    error={errors.serviceAreas?.message}
                    placeholder="e.g., San Francisco Bay Area, Oakland, Berkeley"
                  />
                </motion.div>
              )}

              {/* Step 3: Document Upload */}
              {currentStep === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <p className="text-gray-600 mb-6">
                      Please upload the following required documents to complete your application.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {[
                      { key: 'license', label: 'Contractor License', required: true },
                      { key: 'insurance', label: 'General Liability Insurance', required: true },
                      { key: 'bonding', label: 'Bonding Certificate', required: false },
                    ].map(doc => (
                      <div key={doc.key} className="border border-gray-300 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {doc.label}
                              {doc.required && <span className="text-red-500 ml-1">*</span>}
                            </h4>
                            <p className="text-sm text-gray-500">
                              Upload a clear copy of your {doc.label.toLowerCase()}
                            </p>
                          </div>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            id={`file-${doc.key}`}
                          />
                          <label
                            htmlFor={`file-${doc.key}`}
                            className="btn-glass cursor-pointer"
                          >
                            Choose File
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> All documents will be reviewed by our membership committee. 
                      You will receive an email confirmation once your application is approved.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Review & Submit */}
              {currentStep === 4 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Review Your Application
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Please review your information before submitting your membership application.
                    </p>
                  </div>

                  {/* Summary of information would go here */}
                  <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    <h4 className="font-medium">Application Summary</h4>
                    <p className="text-sm text-gray-600">
                      Your application will be reviewed by our membership committee within 5-7 business days.
                      You will receive an email confirmation once approved.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        {...register('agreesToTerms')}
                        className="mt-1 rounded border-gray-300 text-namc-yellow focus:ring-namc-yellow"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        I agree to the{' '}
                        <Link href="/terms" className="text-namc-yellow hover:text-accent-yellow">
                          Terms of Service
                        </Link>{' '}
                        and membership requirements.
                      </span>
                    </label>
                    {errors.agreesToTerms && (
                      <p className="text-sm text-red-500">{errors.agreesToTerms.message}</p>
                    )}

                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        {...register('agreeToPrivacy')}
                        className="mt-1 rounded border-gray-300 text-namc-yellow focus:ring-namc-yellow"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        I agree to the{' '}
                        <Link href="/privacy" className="text-namc-yellow hover:text-accent-yellow">
                          Privacy Policy
                        </Link>{' '}
                        and consent to data processing.
                      </span>
                    </label>
                    {errors.agreeToPrivacy && (
                      <p className="text-sm text-red-500">{errors.agreeToPrivacy.message}</p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className={currentStep === 1 ? 'invisible' : ''}
                >
                  <ChevronLeft className="mr-2" size={20} />
                  Previous
                </Button>

                {currentStep < 4 ? (
                  <Button type="button" onClick={nextStep}>
                    Next
                    <ChevronRight className="ml-2" size={20} />
                  </Button>
                ) : (
                  <Button type="submit" loading={isLoading}>
                    Submit Application
                  </Button>
                )}
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link
                  href="/auth/signin"
                  className="text-namc-yellow hover:text-accent-yellow font-semibold"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}