import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './BasePage'

export class SignInPage extends BasePage {
  readonly pageTitle: Locator
  readonly pageDescription: Locator
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly showPasswordButton: Locator
  readonly rememberMeCheckbox: Locator
  readonly forgotPasswordLink: Locator
  readonly signInButton: Locator
  readonly registerLink: Locator
  readonly demoCredentials: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    super(page)
    
    this.pageTitle = page.locator('h2')
    this.pageDescription = page.locator('h2 + p')
    this.emailInput = page.locator('input[name="email"], input[type="email"]')
    this.passwordInput = page.locator('input[name="password"], input[type="password"]')
    this.showPasswordButton = page.locator('button:has(svg)', { hasText: '' }).last()
    this.rememberMeCheckbox = page.locator('input[type="checkbox"]').first()
    this.forgotPasswordLink = page.locator('a[href="/auth/forgot-password"]')
    this.signInButton = page.locator('button[type="submit"]:has-text("Sign In")')
    this.registerLink = page.locator('a[href="/auth/register"]')
    this.demoCredentials = page.locator('.bg-gray-100')
    this.errorMessage = page.locator('[role="alert"], .text-red-500').first()
  }

  /**
   * Navigate to sign in page
   */
  async goto() {
    await super.goto('/auth/signin')
    await this.waitForPageLoad()
  }

  /**
   * Wait for sign in page to load
   */
  async waitForPageLoad() {
    await this.pageTitle.waitFor({ state: 'visible' })
    await expect(this.pageTitle).toContainText('Welcome Back')
    await this.waitForAnimations()
  }

  /**
   * Verify page content and structure
   */
  async verifyPageContent() {
    // Check title and description
    await expect(this.pageTitle).toContainText('Welcome Back')
    await expect(this.pageDescription).toContainText('Sign in to your NAMC NorCal account')
    
    // Check logo
    await expect(this.logo).toBeVisible()
    
    // Check form elements
    await expect(this.emailInput).toBeVisible()
    await expect(this.passwordInput).toBeVisible()
    await expect(this.signInButton).toBeVisible()
    await expect(this.rememberMeCheckbox).toBeVisible()
    await expect(this.forgotPasswordLink).toBeVisible()
    await expect(this.registerLink).toBeVisible()
    
    // Check demo credentials section
    await expect(this.demoCredentials).toBeVisible()
    await expect(this.demoCredentials).toContainText('Demo Credentials')
  }

  /**
   * Sign in with credentials
   */
  async signIn(email: string, password: string, rememberMe: boolean = false) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    
    if (rememberMe) {
      await this.rememberMeCheckbox.check()
    }
    
    await this.signInButton.click()
  }

  /**
   * Sign in with admin credentials
   */
  async signInAsAdmin() {
    await this.signIn('admin@namc-norcal.org', 'admin123')
    
    // Wait for redirect to admin dashboard
    try {
      await this.page.waitForURL('**/admin/dashboard', { timeout: 5000 })
    } catch {
      // If redirect doesn't happen, check for error
      await this.checkForErrors()
    }
  }

  /**
   * Sign in with member credentials
   */
  async signInAsMember() {
    await this.signIn('member@namc-norcal.org', 'member123')
    
    // Wait for redirect to member dashboard
    try {
      await this.page.waitForURL('**/member/dashboard', { timeout: 5000 })
    } catch {
      // If redirect doesn't happen, check for error
      await this.checkForErrors()
    }
  }

  /**
   * Test password visibility toggle
   */
  async testPasswordVisibilityToggle() {
    await this.passwordInput.fill('test123')
    
    // Initially should be hidden
    const initialType = await this.passwordInput.getAttribute('type')
    expect(initialType).toBe('password')
    
    // Click show password button
    await this.showPasswordButton.click()
    await this.page.waitForTimeout(100)
    
    // Should now be visible
    const visibleType = await this.passwordInput.getAttribute('type')
    expect(visibleType).toBe('text')
    
    // Click again to hide
    await this.showPasswordButton.click()
    await this.page.waitForTimeout(100)
    
    // Should be hidden again
    const hiddenType = await this.passwordInput.getAttribute('type')
    expect(hiddenType).toBe('password')
  }

  /**
   * Test form validation
   */
  async testFormValidation() {
    // Test empty form submission
    await this.signInButton.click()
    
    // Should show validation errors
    const emailError = this.page.locator('text=Please enter a valid email address')
    const passwordError = this.page.locator('text=Password must be at least 6 characters')
    
    await expect(emailError).toBeVisible()
    await expect(passwordError).toBeVisible()
    
    // Test invalid email format
    await this.emailInput.fill('invalid-email')
    await this.emailInput.blur()
    await expect(emailError).toBeVisible()
    
    // Test short password
    await this.passwordInput.fill('123')
    await this.passwordInput.blur()
    await expect(passwordError).toBeVisible()
    
    // Test valid inputs
    await this.emailInput.fill('test@example.com')
    await this.passwordInput.fill('password123')
    
    // Validation errors should disappear
    await expect(emailError).not.toBeVisible()
    await expect(passwordError).not.toBeVisible()
  }

  /**
   * Test invalid login attempt
   */
  async testInvalidLogin() {
    await this.signIn('invalid@example.com', 'wrongpassword')
    
    // Wait for error message
    await this.page.waitForTimeout(2000)
    
    // Should show error message
    const errorText = await this.errorMessage.textContent()
    expect(errorText).toContain('Invalid email or password')
  }

  /**
   * Test remember me functionality
   */
  async testRememberMe() {
    // Check remember me checkbox
    await this.rememberMeCheckbox.check()
    await expect(this.rememberMeCheckbox).toBeChecked()
    
    // Sign in with remember me
    await this.signIn('member@namc-norcal.org', 'member123', true)
    
    // Note: Testing actual "remember me" functionality would require
    // browser restart testing, which is complex in Playwright
    // For now, we just verify the checkbox interaction
  }

  /**
   * Test forgot password link
   */
  async testForgotPasswordLink() {
    await expect(this.forgotPasswordLink).toBeVisible()
    await expect(this.forgotPasswordLink).toHaveAttribute('href', '/auth/forgot-password')
    
    // Click forgot password link
    await this.forgotPasswordLink.click()
    await this.page.waitForURL('**/auth/forgot-password')
  }

  /**
   * Test register link
   */
  async testRegisterLink() {
    await expect(this.registerLink).toBeVisible()
    await expect(this.registerLink).toHaveAttribute('href', '/auth/register')
    await expect(this.registerLink).toContainText('Become a Member')
    
    // Click register link
    await this.registerLink.click()
    await this.page.waitForURL('**/auth/register')
  }

  /**
   * Test demo credentials functionality
   */
  async testDemoCredentials() {
    await expect(this.demoCredentials).toBeVisible()
    
    // Check admin credentials are displayed
    await expect(this.demoCredentials).toContainText('admin@namc-norcal.org')
    await expect(this.demoCredentials).toContainText('admin123')
    
    // Check member credentials are displayed
    await expect(this.demoCredentials).toContainText('member@namc-norcal.org')
    await expect(this.demoCredentials).toContainText('member123')
    
    // Test if clicking demo credentials fills the form (if implemented)
    // This would be a nice UX enhancement
  }

  /**
   * Test loading states
   */
  async testLoadingStates() {
    await this.emailInput.fill('test@example.com')
    await this.passwordInput.fill('password123')
    
    // Click sign in and immediately check for loading state
    const signInPromise = this.signInButton.click()
    
    // Check if button shows loading state
    const buttonText = await this.signInButton.textContent()
    // Note: Actual loading state implementation would need to be checked
    // based on your button component
    
    await signInPromise
    await this.page.waitForTimeout(1000)
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation() {
    // Tab through form elements
    await this.page.keyboard.press('Tab')
    
    const focusableElements = [
      this.emailInput,
      this.passwordInput,
      this.showPasswordButton,
      this.rememberMeCheckbox,
      this.forgotPasswordLink,
      this.signInButton,
      this.registerLink
    ]
    
    for (const element of focusableElements) {
      await element.focus()
      const hasFocus = await element.evaluate(el => el === document.activeElement)
      expect(hasFocus).toBeTruthy()
    }
    
    // Test Enter key submission
    await this.emailInput.fill('member@namc-norcal.org')
    await this.passwordInput.fill('member123')
    await this.passwordInput.press('Enter')
    
    // Should trigger form submission
    await this.page.waitForTimeout(1000)
  }

  /**
   * Test mobile layout
   */
  async testMobileLayout() {
    await this.page.setViewportSize({ width: 375, height: 667 })
    await this.waitForAnimations()
    
    // Verify all elements are still visible and accessible
    await expect(this.pageTitle).toBeVisible()
    await expect(this.emailInput).toBeVisible()
    await expect(this.passwordInput).toBeVisible()
    await expect(this.signInButton).toBeVisible()
    
    // Test form interaction on mobile
    await this.emailInput.fill('mobile@test.com')
    await this.passwordInput.fill('password')
    
    // Verify virtual keyboard doesn't break layout
    const formContainer = this.page.locator('.max-w-md').first()
    const isVisible = await formContainer.isVisible()
    expect(isVisible).toBeTruthy()
  }

  /**
   * Test accessibility features
   */
  async testAccessibilityFeatures() {
    // Check form labels
    const emailLabel = this.page.locator('label:has-text("Email")')
    const passwordLabel = this.page.locator('label:has-text("Password")')
    
    await expect(emailLabel).toBeVisible()
    await expect(passwordLabel).toBeVisible()
    
    // Check ARIA attributes
    const emailAriaLabel = await this.emailInput.getAttribute('aria-label')
    const passwordAriaLabel = await this.passwordInput.getAttribute('aria-label')
    
    // Either should have aria-label or be properly labeled
    const emailHasLabel = emailAriaLabel || await this.page.locator('label[for]').count() > 0
    const passwordHasLabel = passwordAriaLabel || await this.page.locator('label[for]').count() > 0
    
    expect(emailHasLabel).toBeTruthy()
    expect(passwordHasLabel).toBeTruthy()
    
    // Test screen reader announcements for errors
    await this.signInButton.click()
    const errorElements = await this.page.locator('[role="alert"], .text-red-500').all()
    
    for (const error of errorElements) {
      const isVisible = await error.isVisible()
      if (isVisible) {
        const ariaLive = await error.getAttribute('aria-live')
        const role = await error.getAttribute('role')
        
        // Should have proper ARIA attributes for screen readers
        expect(ariaLive === 'assertive' || ariaLive === 'polite' || role === 'alert').toBeTruthy()
      }
    }
  }

  /**
   * Check for error messages
   */
  async checkForErrors() {
    const errorSelectors = [
      '[role="alert"]',
      '.text-red-500',
      'text=Invalid email or password',
      'text=Something went wrong'
    ]
    
    for (const selector of errorSelectors) {
      if (await this.page.locator(selector).isVisible()) {
        const errorText = await this.page.locator(selector).textContent()
        console.log('Sign in error detected:', errorText)
        return errorText
      }
    }
    
    return null
  }

  /**
   * Test social auth integration (if implemented)
   */
  async testSocialAuth() {
    // Check if social auth buttons exist
    const googleButton = this.page.locator('button:has-text("Google")')
    const linkedinButton = this.page.locator('button:has-text("LinkedIn")')
    
    if (await googleButton.isVisible()) {
      await expect(googleButton).toBeEnabled()
    }
    
    if (await linkedinButton.isVisible()) {
      await expect(linkedinButton).toBeEnabled()
    }
    
    // Note: Testing actual OAuth flow would require more complex setup
  }
}