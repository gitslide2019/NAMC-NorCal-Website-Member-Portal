'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Play,
  Settings,
  Database,
  Users,
  DollarSign,
  Search,
  Zap,
  Clock,
  Activity
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import MemberProfileSync from '@/components/hubspot/MemberProfileSync'
import ProjectDealSync from '@/components/hubspot/ProjectDealSync'

interface TestResult {
  name: string
  status: 'success' | 'failure' | 'warning'
  message: string
  data?: any
  duration?: number
}

interface TestSummary {
  success: boolean
  totalTests: number
  passed: number
  failed: number
  warnings: number
  totalDuration: string
  averageDuration: string
  results: TestResult[]
}

export default function HubSpotTestPage() {
  const [testResults, setTestResults] = useState<TestSummary | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null)
  const [customTestData, setCustomTestData] = useState({
    testType: 'sync_member',
    email: 'test@namcnorcal.org',
    firstName: 'John',
    lastName: 'Doe',
    company: 'Test Construction Co',
    phone: '(555) 123-4567'
  })

  const runFullTestSuite = async () => {
    setIsRunning(true)
    try {
      const response = await fetch('/api/hubspot/test')
      const data = await response.json()
      setTestResults(data)
    } catch (error) {
      console.error('Test suite failed:', error)
      setTestResults({
        success: false,
        totalTests: 0,
        passed: 0,
        failed: 1,
        warnings: 0,
        totalDuration: '0ms',
        averageDuration: '0ms',
        results: [{
          name: 'Test Suite Execution',
          status: 'failure',
          message: `Failed to execute test suite: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      })
    } finally {
      setIsRunning(false)
    }
  }

  const runCustomTest = async () => {
    try {
      const response = await fetch('/api/hubspot/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testType: customTestData.testType,
          testData: customTestData.testType === 'search_contacts' 
            ? { email: customTestData.email }
            : customTestData
        })
      })
      
      const result = await response.json()
      console.log('Custom test result:', result)
      // Add result to existing results if available
      if (testResults) {
        const newResult: TestResult = {
          name: `Custom Test: ${customTestData.testType}`,
          status: result.success ? 'success' : 'failure',
          message: result.success ? 'Custom test executed successfully' : `Test failed: ${result.details || result.error}`,
          data: result.result
        }
        setTestResults({
          ...testResults,
          results: [...testResults.results, newResult]
        })
      }
    } catch (error) {
      console.error('Custom test failed:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failure':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  const getTestIcon = (testName: string) => {
    if (testName.includes('Configuration')) return <Settings className="w-4 h-4" />
    if (testName.includes('Connectivity')) return <Zap className="w-4 h-4" />
    if (testName.includes('Contact')) return <Users className="w-4 h-4" />
    if (testName.includes('Deal')) return <DollarSign className="w-4 h-4" />
    if (testName.includes('Search')) return <Search className="w-4 h-4" />
    if (testName.includes('Properties')) return <Database className="w-4 h-4" />
    if (testName.includes('Rate')) return <Activity className="w-4 h-4" />
    return <TestTube className="w-4 h-4" />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">HubSpot MCP Integration Testing</h1>
              <p className="mt-2 text-gray-600">
                Test and validate HubSpot API connectivity, permissions, and integration features
              </p>
            </div>
            <div className="mt-4 lg:mt-0 flex space-x-4">
              <Button
                onClick={runFullTestSuite}
                disabled={isRunning}
                className="flex items-center space-x-2"
              >
                {isRunning ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span>{isRunning ? 'Running Tests...' : 'Run Full Test Suite'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Specialized Testing Components */}
        <div className="space-y-8 mb-8">
          <MemberProfileSync />
          <ProjectDealSync />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Test Results Panel */}
          <div className="lg:col-span-2">
            {testResults && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TestTube className="w-5 h-5" />
                    <span>Test Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{testResults.passed}</div>
                      <div className="text-sm text-gray-500">Passed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{testResults.failed}</div>
                      <div className="text-sm text-gray-500">Failed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{testResults.warnings}</div>
                      <div className="text-sm text-gray-500">Warnings</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{testResults.totalDuration}</div>
                      <div className="text-sm text-gray-500">Total Time</div>
                    </div>
                  </div>

                  {/* Overall Status */}
                  <div className={`p-4 rounded-lg ${
                    testResults.failed === 0 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center space-x-2">
                      {testResults.failed === 0 ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className={`font-medium ${
                        testResults.failed === 0 ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {testResults.failed === 0 
                          ? 'All critical tests passed! HubSpot integration is ready.'
                          : `${testResults.failed} test(s) failed. Please review and fix issues.`
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Test Results List */}
            {testResults?.results && (
              <Card>
                <CardHeader>
                  <CardTitle>Individual Test Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {testResults.results.map((result, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          result.status === 'success' 
                            ? 'border-green-200 bg-green-50 hover:bg-green-100' 
                            : result.status === 'failure'
                            ? 'border-red-200 bg-red-50 hover:bg-red-100'
                            : 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
                        }`}
                        onClick={() => setSelectedTest(result)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            {getTestIcon(result.name)}
                            <div>
                              <h4 className="font-medium text-gray-900">{result.name}</h4>
                              <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {result.duration && (
                              <span className="text-xs text-gray-500">{result.duration}</span>
                            )}
                            {getStatusIcon(result.status)}
                          </div>
                        </div>
                        
                        {result.data && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <details className="text-xs">
                              <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                                View Details
                              </summary>
                              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                                {JSON.stringify(result.data, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {!testResults && !isRunning && (
              <Card>
                <CardContent className="text-center py-12">
                  <TestTube className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Ready to Test HubSpot Integration
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Run the full test suite to validate your HubSpot MCP configuration and API connectivity.
                  </p>
                  <Button onClick={runFullTestSuite} className="flex items-center space-x-2 mx-auto">
                    <Play className="w-4 h-4" />
                    <span>Start Testing</span>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Custom Test Panel */}
          <div>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>Custom Tests</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Type
                  </label>
                  <select
                    value={customTestData.testType}
                    onChange={(e) => setCustomTestData({
                      ...customTestData,
                      testType: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="sync_member">Sync Member Profile</option>
                    <option value="create_deal">Create Deal</option>
                    <option value="search_contacts">Search Contacts</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={customTestData.email}
                    onChange={(e) => setCustomTestData({
                      ...customTestData,
                      email: e.target.value
                    })}
                    placeholder="test@namcnorcal.org"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <Input
                      value={customTestData.firstName}
                      onChange={(e) => setCustomTestData({
                        ...customTestData,
                        firstName: e.target.value
                      })}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <Input
                      value={customTestData.lastName}
                      onChange={(e) => setCustomTestData({
                        ...customTestData,
                        lastName: e.target.value
                      })}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company
                  </label>
                  <Input
                    value={customTestData.company}
                    onChange={(e) => setCustomTestData({
                      ...customTestData,
                      company: e.target.value
                    })}
                    placeholder="Test Construction Co"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <Input
                    value={customTestData.phone}
                    onChange={(e) => setCustomTestData({
                      ...customTestData,
                      phone: e.target.value
                    })}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <Button
                  onClick={runCustomTest}
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Run Custom Test</span>
                </Button>
              </CardContent>
            </Card>

            {/* Environment Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="w-5 h-5" />
                  <span>Environment Info</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">HubSpot API Key</span>
                  <span className="text-sm font-mono text-green-600">
                    {process.env.NEXT_PUBLIC_HUBSPOT_ACCESS_TOKEN ? 'Configured' : 'Not Set'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Portal ID</span>
                  <span className="text-sm font-mono text-green-600">
                    {process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID || 'Not Set'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Environment</span>
                  <span className="text-sm font-mono text-blue-600">Development</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}