'use client'

import { motion } from 'framer-motion'
import { MapPin, Phone, Mail, Clock } from 'lucide-react'
import ContactForm from '@/components/forms/ContactForm'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-namc-black text-white py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-4xl lg:text-5xl font-inter font-bold mb-4">
              Contact Us
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Have questions about membership, partnerships, or our services? 
              We're here to help and would love to hear from you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center p-6 bg-white rounded-xl shadow-lg"
            >
              <div className="w-16 h-16 bg-namc-yellow rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="text-namc-black" size={24} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Visit Us</h3>
              <p className="text-gray-600 text-sm">
                123 Construction Way<br />
                Oakland, CA 94612
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="text-center p-6 bg-white rounded-xl shadow-lg"
            >
              <div className="w-16 h-16 bg-namc-yellow rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="text-namc-black" size={24} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Call Us</h3>
              <p className="text-gray-600 text-sm">
                (510) 555-0123<br />
                Mon-Fri 9AM-5PM
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-center p-6 bg-white rounded-xl shadow-lg"
            >
              <div className="w-16 h-16 bg-namc-yellow rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="text-namc-black" size={24} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Email Us</h3>
              <p className="text-gray-600 text-sm">
                info@namc-norcal.org<br />
                Response within 24hrs
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="text-center p-6 bg-white rounded-xl shadow-lg"
            >
              <div className="w-16 h-16 bg-namc-yellow rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="text-namc-black" size={24} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Office Hours</h3>
              <p className="text-gray-600 text-sm">
                Monday - Friday<br />
                9:00 AM - 5:00 PM PST
              </p>
            </motion.div>
          </div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <ContactForm />
          </motion.div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-inter font-bold text-gray-900 mb-4">
              Find Our Office
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Located in the heart of Oakland, our office is easily accessible 
              by car or public transportation.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="bg-gray-200 h-96 rounded-xl flex items-center justify-center"
          >
            <div className="text-center">
              <MapPin className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-gray-600">
                Interactive map would be embedded here<br />
                (Google Maps, Mapbox, etc.)
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}