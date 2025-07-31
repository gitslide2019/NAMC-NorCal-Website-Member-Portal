'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Building, ArrowLeft, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import PermitDashboard from '@/components/ui/PermitDashboard'

export default function PermitsPage() {
  const router = useRouter()

  return (
    <div className="p-6">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push('/member/settings/permits')}
            className="flex items-center space-x-2"
          >
            <Settings className="w-4 h-4" />
            <span>Configure API</span>
          </Button>
        </div>

        <div className="flex items-center space-x-4 mb-4">
          <div className="p-3 bg-namc-yellow rounded-full">
            <Building className="w-8 h-8 text-namc-black" />
          </div>
          <div>
            <h1 className="text-3xl font-inter font-bold text-gray-900">
              Construction Permits
            </h1>
            <p className="text-gray-600 mt-1">
              Track permits, building information, and compliance data for your projects
            </p>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <PermitDashboard />
      </motion.div>
    </div>
  )
}