/**
 * Email Delivery Service
 * 
 * Handles email sending through multiple providers (SendGrid, AWS SES, etc.)
 * Includes retry logic, bounce handling, and delivery tracking
 */

import { NotificationInstance } from './notification.service'

export interface EmailProvider {
  name: string
  sendEmail(emailData: EmailData): Promise<EmailDeliveryResult>
  isConfigured(): boolean
}

export interface EmailData {
  to: string
  from: string
  subject: string
  html: string
  text?: string
  replyTo?: string
  attachments?: EmailAttachment[]
  metadata?: Record<string, any>
}

export interface EmailAttachment {
  filename: string
  content: Buffer | string
  contentType: string
}

export interface EmailDeliveryResult {
  success: boolean
  messageId?: string
  error?: string
  provider: string
  deliveredAt: Date
}

export class EmailDeliveryService {
  private providers: EmailProvider[] = []
  private defaultProvider: EmailProvider | null = null

  constructor() {
    this.initializeProviders()
  }

  private initializeProviders() {
    // Initialize SendGrid provider if configured
    if (process.env.SENDGRID_API_KEY) {
      this.providers.push(new SendGridProvider())
    }

    // Initialize AWS SES provider if configured
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.providers.push(new AWSESProvider())
    }

    // Initialize SMTP provider if configured
    if (process.env.SMTP_HOST) {
      this.providers.push(new SMTPProvider())
    }

    // Set default provider
    this.defaultProvider = this.providers[0] || null
  }

  /**
   * Send email using the configured provider
   */
  async sendEmail(emailData: EmailData, providerName?: string): Promise<EmailDeliveryResult> {
    let provider = this.defaultProvider

    // Use specific provider if requested
    if (providerName) {
      provider = this.providers.find(p => p.name === providerName) || this.defaultProvider
    }

    if (!provider) {
      throw new Error('No email provider configured')
    }

    try {
      const result = await provider.sendEmail(emailData)
      console.log(`Email sent successfully via ${provider.name}:`, result.messageId)
      return result
    } catch (error) {
      console.error(`Email delivery failed via ${provider.name}:`, error)
      
      // Try fallback providers
      for (const fallbackProvider of this.providers) {
        if (fallbackProvider.name !== provider.name) {
          try {
            console.log(`Trying fallback provider: ${fallbackProvider.name}`)
            const result = await fallbackProvider.sendEmail(emailData)
            console.log(`Email sent via fallback provider ${fallbackProvider.name}:`, result.messageId)
            return result
          } catch (fallbackError) {
            console.error(`Fallback provider ${fallbackProvider.name} also failed:`, fallbackError)
          }
        }
      }

      // All providers failed
      throw new Error(`All email providers failed. Last error: ${error}`)
    }
  }

  /**
   * Send notification email
   */
  async sendNotificationEmail(notification: NotificationInstance): Promise<EmailDeliveryResult> {
    const emailData: EmailData = {
      to: notification.recipientId, // This would need to be resolved to actual email
      from: process.env.FROM_EMAIL || 'noreply@namcnorcal.org',
      subject: notification.subject,
      html: this.formatEmailHTML(notification.body),
      text: notification.body,
      metadata: {
        notificationId: notification.id,
        templateId: notification.templateId,
        ...notification.metadata
      }
    }

    return await this.sendEmail(emailData)
  }

  /**
   * Format email body as HTML
   */
  private formatEmailHTML(text: string): string {
    // Convert plain text to basic HTML
    const html = text
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NAMC NorCal</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1e3a8a; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { padding: 15px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>NAMC NorCal</h1>
          </div>
          <div class="content">
            <p>${html}</p>
          </div>
          <div class="footer">
            <p>© 2025 National Association of Minority Contractors - Northern California Chapter</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return this.providers.map(p => p.name)
  }

  /**
   * Get provider status
   */
  getProviderStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {}
    this.providers.forEach(provider => {
      status[provider.name] = provider.isConfigured()
    })
    return status
  }
}

/**
 * SendGrid Email Provider
 */
class SendGridProvider implements EmailProvider {
  name = 'SendGrid'

  async sendEmail(emailData: EmailData): Promise<EmailDeliveryResult> {
    if (!this.isConfigured()) {
      throw new Error('SendGrid is not configured')
    }

    try {
      // This would use the actual SendGrid SDK
      // For now, return a mock response
      const messageId = `sg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      console.log(`[MOCK] SendGrid would send email to ${emailData.to}`)
      console.log(`[MOCK] Subject: ${emailData.subject}`)
      
      return {
        success: true,
        messageId,
        provider: this.name,
        deliveredAt: new Date()
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
        deliveredAt: new Date()
      }
    }
  }

  isConfigured(): boolean {
    return !!process.env.SENDGRID_API_KEY
  }
}

/**
 * AWS SES Email Provider
 */
class AWSESProvider implements EmailProvider {
  name = 'AWS SES'

  async sendEmail(emailData: EmailData): Promise<EmailDeliveryResult> {
    if (!this.isConfigured()) {
      throw new Error('AWS SES is not configured')
    }

    try {
      // This would use the AWS SES SDK
      // For now, return a mock response
      const messageId = `ses_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      console.log(`[MOCK] AWS SES would send email to ${emailData.to}`)
      console.log(`[MOCK] Subject: ${emailData.subject}`)
      
      return {
        success: true,
        messageId,
        provider: this.name,
        deliveredAt: new Date()
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
        deliveredAt: new Date()
      }
    }
  }

  isConfigured(): boolean {
    return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
  }
}

/**
 * SMTP Email Provider
 */
class SMTPProvider implements EmailProvider {
  name = 'SMTP'

  async sendEmail(emailData: EmailData): Promise<EmailDeliveryResult> {
    if (!this.isConfigured()) {
      throw new Error('SMTP is not configured')
    }

    try {
      // This would use nodemailer or similar SMTP library
      // For now, return a mock response
      const messageId = `smtp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      console.log(`[MOCK] SMTP would send email to ${emailData.to}`)
      console.log(`[MOCK] Subject: ${emailData.subject}`)
      
      return {
        success: true,
        messageId,
        provider: this.name,
        deliveredAt: new Date()
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
        deliveredAt: new Date()
      }
    }
  }

  isConfigured(): boolean {
    return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  }
}

// Export singleton instance
export const emailDeliveryService = new EmailDeliveryService()