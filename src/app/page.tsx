'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Users, Building, Award, Calendar } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import NewsletterSignup from '@/components/forms/NewsletterSignup'

export default function HomePage() {
  const stats = [
    { number: '1,247', label: 'Active Members', icon: Users },
    { number: '450+', label: 'Projects Completed', icon: Building },
    { number: '55', label: 'Years of Excellence', icon: Award },
    { number: '24/7', label: 'Member Support', icon: Calendar },
  ]

  const features = [
    {
      title: 'Interactive Timeline',
      description: 'Explore our 55-year journey from 1969 to present with milestones, achievements, and stories.',
      link: '/timeline',
    },
    {
      title: 'Member Portal',
      description: 'Access exclusive resources, project opportunities, and connect with fellow contractors.',
      link: '/member/dashboard',
    },
    {
      title: 'Learning Center',
      description: 'Enhance your skills with our comprehensive training programs and certifications.',
      link: '/learning',
    },
    {
      title: 'Tool Library',
      description: 'Borrow professional tools and equipment to help complete your projects.',
      link: '/tools',
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Video/Image */}
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full bg-gradient-to-r from-namc-black/80 to-namc-black/60" />
          <img
            src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
            alt="Construction site"
            className="w-full h-full object-cover -z-10"
          />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-inter font-bold text-white mb-6">
              Building Excellence
              <span className="block text-namc-yellow">Since 1969</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 mb-8 max-w-2xl mx-auto">
              Supporting minority contractors throughout Northern California with resources, 
              training, and opportunities to build successful businesses.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Become a Member
                  <ArrowRight className="ml-2" size={20} />
                </Button>
              </Link>
              <Link href="/about">
                <Button variant="glass" size="lg" className="w-full sm:w-auto text-white">
                  Learn More
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1 h-3 bg-white rounded-full mt-2"
            />
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-namc-yellow rounded-full flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="text-namc-black" size={28} />
                </div>
                <div className="text-3xl lg:text-4xl font-inter font-bold text-namc-black mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl lg:text-4xl font-inter font-bold text-namc-black mb-6">
                Empowering Minority Contractors for Over 55 Years
              </h2>
              <p className="text-gray-600 text-lg mb-6">
                The National Association of Minority Contractors (NAMC) Northern California 
                Chapter has been at the forefront of supporting minority-owned construction 
                businesses since 1969. We provide resources, training, networking opportunities, 
                and advocacy to help our members build successful and sustainable businesses.
              </p>
              <p className="text-gray-600 text-lg mb-8">
                From small residential projects to major commercial developments, our members 
                have contributed billions of dollars to the Northern California economy while 
                creating jobs and building communities.
              </p>
              <Link href="/about">
                <Button>
                  Learn More About Us
                  <ArrowRight className="ml-2" size={18} />
                </Button>
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="relative"
            >
              <img
                src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                alt="Construction workers"
                className="rounded-2xl shadow-2xl"
              />
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-namc-yellow rounded-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-namc-black">55+</div>
                  <div className="text-sm text-namc-black font-medium">Years</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-inter font-bold text-namc-black mb-4">
              Discover What NAMC Offers
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Explore our comprehensive platform designed to support and empower 
              minority contractors with cutting-edge tools and resources.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover-lift">
                  <CardHeader>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">{feature.description}</p>
                    <Link href={feature.link}>
                      <Button variant="outline" size="sm" className="w-full">
                        Explore
                        <ArrowRight className="ml-2" size={16} />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Preview */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-inter font-bold text-namc-black mb-4">
              Our Journey Through Time
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Explore 55 years of milestones, achievements, and growth that shaped 
              NAMC Northern California into what it is today.
            </p>
          </motion.div>

          <div className="relative">
            <div className="flex justify-center items-center space-x-8 overflow-x-auto pb-4">
              {[1969, 1980, 2000, 2025].map((year, index) => (
                <motion.div
                  key={year}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  viewport={{ once: true }}
                  className="flex-shrink-0 text-center"
                >
                  <div className="w-20 h-20 bg-namc-yellow rounded-full flex items-center justify-center mb-4 mx-auto">
                    <span className="font-inter font-bold text-namc-black">{year}</span>
                  </div>
                  <div className="text-sm text-gray-600 max-w-24">
                    {year === 1969 && 'Founded'}
                    {year === 1980 && 'Expansion'}
                    {year === 2000 && 'Technology'}
                    {year === 2025 && 'Future'}
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href="/timeline">
                <Button variant="outline">
                  Explore Full Timeline
                  <ArrowRight className="ml-2" size={18} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 bg-namc-black">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl lg:text-4xl font-inter font-bold text-white mb-4">
              Stay Connected
            </h2>
            <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
              Get the latest news, project opportunities, and industry insights 
              delivered directly to your inbox.
            </p>
            <div className="max-w-md mx-auto">
              <NewsletterSignup variant="dark" />
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}