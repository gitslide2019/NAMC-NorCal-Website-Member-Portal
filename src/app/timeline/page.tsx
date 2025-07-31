'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { Search, Filter, Share2, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const timelineEvents = [
  {
    id: 1,
    year: 1969,
    title: 'NAMC Founded',
    category: 'founding',
    description: 'The National Association of Minority Contractors was established to support minority-owned construction businesses and promote equal opportunities in the construction industry.',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    featured: true,
  },
  {
    id: 2,
    year: 1972,
    title: 'Northern California Chapter Established',
    category: 'expansion',
    description: 'NAMC Northern California Chapter was formed to serve the unique needs of minority contractors in the Bay Area and surrounding regions.',
    image: 'https://images.unsplash.com/photo-1541976590-713941681591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    featured: true,
  },
  {
    id: 3,
    year: 1975,
    title: 'First Major Project Award',
    category: 'milestone',
    description: 'NAMC NorCal members completed their first major public works project - a $2M community center in Oakland, demonstrating the capability of minority contractors.',
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    featured: false,
  },
  {
    id: 4,
    year: 1980,
    title: 'Training Program Launch',
    category: 'milestone',
    description: 'Launched comprehensive training programs for business development, project management, and technical skills to help members grow their businesses.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    featured: false,
  },
  {
    id: 5,
    year: 1985,
    title: 'Advocacy Victories',
    category: 'policy',
    description: 'Successfully advocated for stronger minority business enterprise (MBE) requirements in state and local government contracts.',
    image: 'https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    featured: false,
  },
  {
    id: 6,
    year: 1990,
    title: 'Membership Milestone',
    category: 'milestone',
    description: 'Reached 500 active members, representing over $100M in annual construction volume across Northern California.',
    image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    featured: false,
  },
  {
    id: 7,
    year: 1995,
    title: 'Technology Initiative',
    category: 'milestone',
    description: 'Launched computer training programs and introduced members to emerging construction technologies and software.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    featured: false,
  },
  {
    id: 8,
    year: 2000,
    title: 'Digital Transformation',
    category: 'milestone',
    description: 'Embraced the digital age with our first website and online member directory, improving communication and networking.',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    featured: true,
  },
  {
    id: 9,
    year: 2005,
    title: 'Sustainability Focus',
    category: 'milestone',
    description: 'Introduced green building and sustainable construction practices training, positioning members for the LEED certification era.',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    featured: false,
  },
  {
    id: 10,
    year: 2010,
    title: 'Economic Recovery Leadership',
    category: 'milestone',
    description: 'Played a crucial role in economic recovery efforts, helping members access federal stimulus funding and infrastructure projects.',
    image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    featured: false,
  },
  {
    id: 11,
    year: 2015,
    title: 'Innovation Hub Launch',
    category: 'milestone',
    description: 'Opened the NAMC Innovation Hub, providing co-working space, advanced training facilities, and business incubation services.',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    featured: false,
  },
  {
    id: 12,
    year: 2020,
    title: 'Pandemic Response',
    category: 'milestone',
    description: 'Rapidly adapted to COVID-19 challenges, providing PPP loan assistance, virtual training, and safety protocols for members.',
    image: 'https://images.unsplash.com/photo-1584744982491-665216d95f8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    featured: false,
  },
  {
    id: 13,
    year: 2024,
    title: 'AI-Powered Platform',
    category: 'milestone',
    description: 'Launched our advanced digital platform with AI-powered project matching, personalized learning paths, and predictive analytics.',
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    featured: true,
  },
]

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'founding', label: 'Founding' },
  { value: 'expansion', label: 'Expansion' },
  { value: 'milestone', label: 'Milestones' },
  { value: 'policy', label: 'Policy' },
  { value: 'project', label: 'Projects' },
]

export default function TimelinePage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDecade, setSelectedDecade] = useState<number | null>(null)

  const filteredEvents = timelineEvents.filter(event => {
    const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDecade = selectedDecade === null || Math.floor(event.year / 10) * 10 === selectedDecade
    
    return matchesCategory && matchesSearch && matchesDecade
  })

  const decades = Array.from(new Set(timelineEvents.map(event => Math.floor(event.year / 10) * 10))).sort()

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
              Our Journey Through Time
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Explore 55 years of milestones, achievements, and growth that shaped 
              NAMC Northern California into the leading advocate for minority contractors.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Controls */}
      <section className="py-8 bg-white shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search timeline events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-namc-yellow focus:ring-2 focus:ring-namc-yellow/20"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex gap-4 items-center">
              <Filter size={20} className="text-gray-500" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:border-namc-yellow focus:ring-2 focus:ring-namc-yellow/20"
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Decade Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedDecade(null)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedDecade === null
                    ? 'bg-namc-yellow text-namc-black'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All
              </button>
              {decades.map(decade => (
                <button
                  key={decade}
                  onClick={() => setSelectedDecade(decade)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedDecade === decade
                      ? 'bg-namc-yellow text-namc-black'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {decade}s
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-namc-yellow hidden md:block" />

            {/* Timeline Events */}
            <div className="space-y-12">
              {filteredEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  {/* Timeline Dot */}
                  <div className="absolute left-6 w-4 h-4 bg-namc-yellow rounded-full border-4 border-white shadow-lg z-10 hidden md:block" />
                  
                  {/* Event Card */}
                  <div className="md:ml-16">
                    <Card className={`${event.featured ? 'border-2 border-namc-yellow' : ''}`}>
                      <div className="grid md:grid-cols-3 gap-6">
                        {/* Image */}
                        <div className="relative">
                          <img
                            src={event.image}
                            alt={event.title}
                            className="w-full h-48 md:h-full object-cover rounded-lg"
                          />
                          {event.featured && (
                            <div className="absolute top-4 left-4 bg-namc-yellow text-namc-black px-3 py-1 rounded-full text-sm font-semibold">
                              Featured
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="md:col-span-2">
                          <CardHeader>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-3xl font-inter font-bold text-namc-yellow">
                                {event.year}
                              </span>
                              <div className="flex gap-2">
                                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                  <Share2 size={18} />
                                </button>
                                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                  <ExternalLink size={18} />
                                </button>
                              </div>
                            </div>
                            <CardTitle className="text-xl md:text-2xl">{event.title}</CardTitle>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                                event.category === 'founding' ? 'bg-blue-100 text-blue-800' :
                                event.category === 'expansion' ? 'bg-green-100 text-green-800' :
                                event.category === 'milestone' ? 'bg-purple-100 text-purple-800' :
                                event.category === 'policy' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {event.category}
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-gray-600 text-lg leading-relaxed">
                              {event.description}
                            </p>
                          </CardContent>
                        </div>
                      </div>
                    </Card>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* No Results */}
          {filteredEvents.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">
                No events found matching your criteria. Try adjusting your filters.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}