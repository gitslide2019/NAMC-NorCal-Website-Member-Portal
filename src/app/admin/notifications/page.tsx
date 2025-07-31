'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Bell, Plus, Settings, BarChart3, Send, AlertCircle, CheckCircle, Clock, X } from 'lucide-react'

interface NotificationTemplate {
  id: string
  name: string
  type: string
  channel: string[]
  subject: string
  bodyTemplate: string
  variables: string[]
  enabled: boolean
  priority: 'low' | 'medium' | 'high' | 'critical'
  createdAt: string
  updatedAt: string
}

interface NotificationAnalytics {
  totalSent: number
  deliveryRate: number
  channelPerformance: Record<string, { sent: number; delivered: number }>
  templatePerformance: Record<string, { sent: number; delivered: number }>
  failureReasons: Record<string, number>
}

export default function NotificationsManagement() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [analytics, setAnalytics] = useState<NotificationAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Form state for creating/editing templates
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    subject: '',
    bodyTemplate: '',
    channels: [] as string[],
    priority: 'medium' as const,
    enabled: true
  })

  const notificationTypes = [
    'project_status_change',
    'project_deadline_approaching',
    'project_overdue',
    'member_engagement_high',
    'member_engagement_low',
    'member_at_risk',
    'project_inquiry_received',
    'milestone_completed',
    'assignment_created',
    'hubspot_sync_completed',
    'hubspot_sync_failed',
    'system_alert'
  ]

  const channels = ['email', 'sms', 'in_app', 'push', 'slack']
  const priorities = ['low', 'medium', 'high', 'critical']

  useEffect(() => {
    fetchAnalytics()
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notifications/templates')
      const data = await response.json()
      
      if (data.success) {
        setTemplates(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const now = new Date()
      
      const response = await fetch(
        `/api/notifications?start=${thirtyDaysAgo.toISOString()}&end=${now.toISOString()}`
      )
      const data = await response.json()
      
      if (data.success) {
        setAnalytics(data.data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    }
  }

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      
      const templateData = {
        ...formData,
        channel: formData.channels,
        variables: extractVariables(formData.bodyTemplate)
      }
      
      const response = await fetch('/api/notifications/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setShowCreateForm(false)
        setFormData({
          name: '',
          type: '',
          subject: '',
          bodyTemplate: '',
          channels: [],
          priority: 'medium',
          enabled: true
        })
        fetchTemplates()
      }
    } catch (error) {
      console.error('Error creating template:', error)
    } finally {
      setLoading(false)
    }
  }

  const extractVariables = (template: string): string[] => {
    const matches = template.match(/\{\{(\w+)\}\}/g)
    return matches ? matches.map(match => match.slice(2, -2)) : []
  }

  const testNotification = async (templateId: string) => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          context: {
            customData: {
              recipientName: 'Test User',
              projectTitle: 'Sample Project',
              memberName: 'John Doe',
              memberCompany: 'Test Company'
            }
          }
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`Test notification sent! Created ${data.data.count} notifications.`)
      }
    } catch (error) {
      console.error('Error testing notification:', error)
      alert('Failed to send test notification')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notification Management</h1>
          <p className="text-gray-600 mt-2">Manage notification templates and monitor delivery performance</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Template
        </Button>
      </div>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          {analytics && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
                    <Send className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.totalSent.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.deliveryRate.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">Successfully delivered</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Templates</CardTitle>
                    <Bell className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{templates.filter(t => t.enabled).length}</div>
                    <p className="text-xs text-muted-foreground">Out of {templates.length} total</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Failed Notifications</CardTitle>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Object.values(analytics.failureReasons).reduce((a, b) => a + b, 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">Require attention</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Channel Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(analytics.channelPerformance).map(([channel, stats]) => (
                        <div key={channel} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">{channel}</Badge>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {stats.delivered} / {stats.sent}
                            </div>
                            <div className="text-xs text-gray-500">
                              {stats.sent > 0 ? ((stats.delivered / stats.sent) * 100).toFixed(1) : 0}% delivered
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Common Failure Reasons</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(analytics.failureReasons).map(([reason, count]) => (
                        <div key={reason} className="flex items-center justify-between">
                          <div className="text-sm">{reason}</div>
                          <Badge variant="destructive">{count}</Badge>
                        </div>
                      ))}
                      {Object.keys(analytics.failureReasons).length === 0 && (
                        <p className="text-sm text-gray-500">No failures in the last 30 days</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="grid gap-6">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {template.name}
                        {!template.enabled && <Badge variant="secondary">Disabled</Badge>}
                        <Badge variant="outline" className="capitalize">{template.priority}</Badge>
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">Type: {template.type}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testNotification(template.id)}
                        disabled={loading}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Test
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTemplate(template)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">Subject:</p>
                      <p className="text-sm text-gray-600">{template.subject}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Channels:</p>
                      <div className="flex gap-1 mt-1">
                        {template.channel.map((channel) => (
                          <Badge key={channel} variant="outline" className="capitalize">
                            {channel}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Variables:</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {template.variables.map((variable) => (
                          <Badge key={variable} variant="secondary">
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Provider Settings</CardTitle>
              <p className="text-sm text-gray-600">Configure email delivery providers and settings</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">SendGrid</h4>
                      <Badge variant={process.env.SENDGRID_API_KEY ? "default" : "secondary"}>
                        {process.env.SENDGRID_API_KEY ? "Configured" : "Not Configured"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">Primary email provider</p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">AWS SES</h4>
                      <Badge variant="secondary">Backup</Badge>
                    </div>
                    <p className="text-sm text-gray-600">Fallback email provider</p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">SMTP</h4>
                      <Badge variant="secondary">Local</Badge>
                    </div>
                    <p className="text-sm text-gray-600">Local SMTP server</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delivery Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Default Retry Attempts</Label>
                  <Input type="number" defaultValue="3" className="mt-1" />
                </div>
                <div>
                  <Label>Batch Size for Processing</Label>
                  <Input type="number" defaultValue="50" className="mt-1" />
                </div>
                <div>
                  <Label>Processing Interval (minutes)</Label>
                  <Input type="number" defaultValue="15" className="mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Template Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Create Notification Template</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateForm(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTemplate} className="space-y-4">
                <div>
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="type">Notification Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select notification type" />
                    </SelectTrigger>
                    <SelectContent>
                      {notificationTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Use {{variable}} for dynamic content"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="bodyTemplate">Message Template</Label>
                  <Textarea
                    id="bodyTemplate"
                    value={formData.bodyTemplate}
                    onChange={(e) => setFormData({ ...formData, bodyTemplate: e.target.value })}
                    placeholder="Use {{variable}} for dynamic content"
                    rows={6}
                    required
                  />
                </div>

                <div>
                  <Label>Delivery Channels</Label>
                  <div className="flex gap-2 mt-2">
                    {channels.map((channel) => (
                      <Button
                        key={channel}
                        type="button"
                        variant={formData.channels.includes(channel) ? "primary" : "outline"}
                        size="sm"
                        onClick={() => {
                          const newChannels = formData.channels.includes(channel)
                            ? formData.channels.filter(c => c !== channel)
                            : [...formData.channels, channel]
                          setFormData({ ...formData, channels: newChannels })
                        }}
                      >
                        {channel}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((priority) => (
                        <SelectItem key={priority} value={priority} className="capitalize">{priority}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Template'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}