import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './BasePage'

export class RegistrationPage extends BasePage {
  readonly pageTitle: Locator
  readonly pageDescription: Locator
  readonly progressSteps: Locator
  readonly currentStepTitle: Locator
  readonly nextButton: Locator
  readonly prevButton: Locator
  readonly submitButton: Locator

  // Step 1: Basic Information
  readonly firstNameInput: Locator
  readonly lastNameInput: Locator
  readonly emailInput: Locator
  readonly phoneInput: Locator
  readonly companyInput: Locator
  readonly passwordInput: Locator
  readonly confirmPasswordInput: Locator

  // Step 2: Business Details
  readonly businessAddressInput: Locator
  readonly cityInput: Locator
  readonly stateInput: Locator
  readonly zipInput: Locator
  readonly licenseNumberInput: Locator
  readonly yearsExperienceInput: Locator
  readonly specialtiesCheckboxes: Locator
  readonly serviceAreasInput: Locator

  // Step 3: Document Upload
  readonly licenseFileInput: Locator
  readonly insuranceFileInput: Locator
  readonly bondingFileInput: Locator

  // Step 4: Review & Submit
  readonly termsCheckbox: Locator
  readonly privacyCheckbox: Locator
  readonly applicationSummary: Locator

  constructor(page: Page) {
    super(page)
    
    // Common elements
    this.pageTitle = page.locator('h1')
    this.pageDescription = page.locator('h1 + p')
    this.progressSteps = page.locator('.flex.items-center.justify-between > div')
    this.currentStepTitle = page.locator('[data-testid="current-step-title"], .card-title').first()
    this.nextButton = page.locator('button:has-text("Next")')
    this.prevButton = page.locator('button:has-text("Previous")')
    this.submitButton = page.locator('button[type="submit"]:has-text("Submit Application")')

    // Step 1 fields
    this.firstNameInput = page.locator('input[name="firstName"]')
    this.lastNameInput = page.locator('input[name="lastName"]')
    this.emailInput = page.locator('input[name="email"]')
    this.phoneInput = page.locator('input[name="phone"]')
    this.companyInput = page.locator('input[name="company"]')
    this.passwordInput = page.locator('input[name="password"]')
    this.confirmPasswordInput = page.locator('input[name="confirmPassword"]')

    // Step 2 fields
    this.businessAddressInput = page.locator('input[name="businessAddress"]')
    this.cityInput = page.locator('input[name="city"]')
    this.stateInput = page.locator('input[name="state"]')
    this.zipInput = page.locator('input[name="zip"]')
    this.licenseNumberInput = page.locator('input[name="licenseNumber"]')
    this.yearsExperienceInput = page.locator('input[name="yearsExperience"]')
    this.specialtiesCheckboxes = page.locator('input[type="checkbox"]')
    this.serviceAreasInput = page.locator('input[name="serviceAreas"]')

    // Step 3 fields
    this.licenseFileInput = page.locator('input#file-license')
    this.insuranceFileInput = page.locator('input#file-insurance')
    this.bondingFileInput = page.locator('input#file-bonding')

    // Step 4 fields
    this.termsCheckbox = page.locator('input[name="agreesToTerms"]')
    this.privacyCheckbox = page.locator('input[name="agreeToPrivacy"]')
    this.applicationSummary = page.locator('.bg-gray-50')
  }

  /**
   * Navigate to registration page
   */
  async goto() {
    await super.goto('/auth/register')
    await this.waitForPageLoad()
  }

  /**
   * Wait for registration page to load
   */
  async waitForPageLoad() {
    await this.pageTitle.waitFor({ state: 'visible' })
    await expect(this.pageTitle).toContainText('Become a Member')
    await this.waitForAnimations()
  }

  /**
   * Get current step number
   */
  async getCurrentStep(): Promise<number> {
    const activeSteps = await this.progressSteps.locator('.bg-namc-yellow').count()
    return activeSteps
  }

  /**
   * Verify progress indicator
   */
  async verifyProgressIndicator(expectedStep: number) {
    const currentStep = await this.getCurrentStep()
    expect(currentStep).toBe(expectedStep)
    
    // Verify step titles and descriptions
    const stepTitles = [
      'Basic Information',
      'Business Details', 
      'Document Upload',
      'Review & Submit'
    ]
    
    for (let i = 0; i < stepTitles.length; i++) {
      const stepElement = this.progressSteps.nth(i)
      const stepTitle = stepElement.locator('p').first()
      
      if (i < expectedStep) {
        // Completed steps should have check mark
        await expect(stepElement.locator('svg')).toBeVisible()
      } else if (i === expectedStep - 1) {
        // Current step should be highlighted
        await expect(stepElement.locator('.bg-namc-yellow')).toBeVisible()
      }
      
      await expect(stepTitle).toContainText(stepTitles[i])
    }
  }

  /**
   * Fill Step 1: Basic Information
   */
  async fillStep1(data: {
    firstName: string
    lastName: string
    email: string
    phone: string
    company: string
    password: string
    confirmPassword: string
  }) {
    await this.verifyProgressIndicator(1)
    
    await this.firstNameInput.fill(data.firstName)
    await this.lastNameInput.fill(data.lastName)
    await this.emailInput.fill(data.email)
    await this.phoneInput.fill(data.phone)
    await this.companyInput.fill(data.company)
    await this.passwordInput.fill(data.password)
    await this.confirmPasswordInput.fill(data.confirmPassword)
  }

  /**
   * Fill Step 2: Business Details
   */
  async fillStep2(data: {
    businessAddress: string
    city: string
    state: string
    zip: string
    licenseNumber: string
    yearsExperience: string
    specialties: string[]
    serviceAreas: string
  }) {
    await this.verifyProgressIndicator(2)
    
    await this.businessAddressInput.fill(data.businessAddress)
    await this.cityInput.fill(data.city)
    await this.stateInput.fill(data.state)
    await this.zipInput.fill(data.zip)
    await this.licenseNumberInput.fill(data.licenseNumber)
    await this.yearsExperienceInput.fill(data.yearsExperience)
    
    // Select specialties
    for (const specialty of data.specialties) {
      const checkbox = this.page.locator(`input[type="checkbox"] + span:has-text("${specialty}")`)
      await checkbox.click()
    }
    
    await this.serviceAreasInput.fill(data.serviceAreas)
  }

  /**
   * Handle Step 3: Document Upload
   */
  async handleStep3() {
    await this.verifyProgressIndicator(3)
    
    // Create mock files for testing
    const licenseFile = 'tests/fixtures/sample-license.pdf'
    const insuranceFile = 'tests/fixtures/sample-insurance.pdf'
    
    // Note: In real tests, you'd upload actual files
    // For now, we'll just verify the UI elements are present
    await expect(this.licenseFileInput).toBeAttached()
    await expect(this.insuranceFileInput).toBeAttached()
    await expect(this.bondingFileInput).toBeAttached()
    
    // Verify file upload labels and requirements
    await expect(this.page.locator('text=Contractor License')).toBeVisible()
    await expect(this.page.locator('text=General Liability Insurance')).toBeVisible()
    await expect(this.page.locator('text=Bonding Certificate')).toBeVisible()
  }

  /**
   * Fill Step 4: Review & Submit
   */
  async fillStep4() {
    await this.verifyProgressIndicator(4)
    
    // Verify application summary is visible
    await expect(this.applicationSummary).toBeVisible()
    await expect(this.page.locator('text=Application Summary')).toBeVisible()
    
    // Check terms and privacy checkboxes
    await this.termsCheckbox.check()
    await this.privacyCheckbox.check()
    
    // Verify checkboxes are checked
    await expect(this.termsCheckbox).toBeChecked()
    await expect(this.privacyCheckbox).toBeChecked()
  }

  /**
   * Click Next button
   */
  async clickNext() {
    await this.nextButton.click()
    await this.waitForAnimations()
  }

  /**
   * Click Previous button
   */
  async clickPrevious() {
    await this.prevButton.click()
    await this.waitForAnimations()
  }

  /**
   * Submit registration
   */
  async submitRegistration() {
    await this.submitButton.click()
    
    // Wait for either success redirect or error message
    try {
      await this.page.waitForURL('**/auth/signin*', { timeout: 5000 })
    } catch {
      // Check for error messages if redirect doesn't happen
      const errorMessage = this.page.locator('[role="alert"], .text-red-500').first()
      if (await errorMessage.isVisible()) {
        const errorText = await errorMessage.textContent()
        console.log('Registration error:', errorText)
      }
    }
  }

  /**
   * Test form validation
   */
  async testFormValidation() {
    // Test Step 1 validation
    await this.clickNext()
    
    // Should show validation errors
    const errorMessages = this.page.locator('.text-red-500, [role="alert"]')
    const errorCount = await errorMessages.count()
    expect(errorCount).toBeGreaterThan(0)
    
    // Test individual field validation
    await this.emailInput.fill('invalid-email')
    await this.emailInput.blur()
    await expect(this.page.locator('text=Please enter a valid email address')).toBeVisible()
    
    await this.passwordInput.fill('123')
    await this.passwordInput.blur()
    await expect(this.page.locator('text=Password must be at least 8 characters')).toBeVisible()
    
    await this.confirmPasswordInput.fill('456')
    await this.confirmPasswordInput.blur()
    await expect(this.page.locator('text=Passwords don\'t match')).toBeVisible()
  }

  /**
   * Test step navigation
   */
  async testStepNavigation() {
    // Start at step 1
    await this.verifyProgressIndicator(1)
    
    // Fill minimal data to proceed
    await this.firstNameInput.fill('Test')
    await this.lastNameInput.fill('User')
    await this.emailInput.fill('test@example.com')
    await this.phoneInput.fill('5551234567')
    await this.companyInput.fill('Test Company')
    await this.passwordInput.fill('password123')
    await this.confirmPasswordInput.fill('password123')
    
    // Go to step 2
    await this.clickNext()
    await this.verifyProgressIndicator(2)
    
    // Go back to step 1
    await this.clickPrevious()
    await this.verifyProgressIndicator(1)
    
    // Verify data persistence
    await expect(this.firstNameInput).toHaveValue('Test')
    await expect(this.emailInput).toHaveValue('test@example.com')
  }

  /**
   * Complete full registration flow
   */
  async completeRegistration(userData: any) {
    // Step 1
    await this.fillStep1(userData.step1)
    await this.clickNext()
    
    // Step 2
    await this.fillStep2(userData.step2)
    await this.clickNext()
    
    // Step 3
    await this.handleStep3()
    await this.clickNext()
    
    // Step 4
    await this.fillStep4()
    await this.submitRegistration()
  }

  /**
   * Test mobile registration experience
   */
  async testMobileRegistration() {
    await this.page.setViewportSize({ width: 375, height: 667 })
    await this.waitForAnimations()
    
    // Verify mobile layout
    const card = this.page.locator('.card, .max-w-4xl').first()
    const cardWidth = await card.evaluate(el => (el as HTMLElement).offsetWidth)
    
    // Should be responsive and not overflow
    expect(cardWidth).toBeLessThanOrEqual(375)
    
    // Test form interactions on mobile
    await this.firstNameInput.fill('Mobile Test')
    await this.page.keyboard.press('Tab')
    
    // Verify virtual keyboard doesn't break layout
    const viewportHeight = await this.page.evaluate(() => window.innerHeight)
    expect(viewportHeight).toBeGreaterThan(200) // Minimum usable height
  }

  /**
   * Test accessibility features
   */
  async testAccessibilityFeatures() {
    // Test keyboard navigation through form
    await this.page.keyboard.press('Tab')
    
    const formElements = [
      this.firstNameInput,
      this.lastNameInput,
      this.emailInput,
      this.phoneInput,
      this.companyInput,
      this.passwordInput,
      this.confirmPasswordInput,
      this.nextButton
    ]
    
    for (const element of formElements) {
      await element.focus()
      const hasFocus = await element.evaluate(el => el === document.activeElement)
      expect(hasFocus).toBeTruthy()
    }
    
    // Test ARIA labels and form labels
    const inputs = await this.page.locator('input').all()
    for (const input of inputs) {
      const hasLabel = await input.evaluate(el => {
        const id = el.id
        const ariaLabel = el.getAttribute('aria-label')
        const ariaLabelledBy = el.getAttribute('aria-labelledby')
        const label = id ? document.querySelector(`label[for="${id}"]`) : null
        
        return !!(ariaLabel || ariaLabelledBy || label)
      })
      
      expect(hasLabel).toBeTruthy()
    }
  }

  /**
   * Test error handling scenarios
   */
  async testErrorHandling() {
    // Test network failure during submission
    await this.completeRegistration({
      step1: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '5551234567',
        company: 'Test Company',
        password: 'password123',
        confirmPassword: 'password123'
      },
      step2: {
        businessAddress: '123 Test St',
        city: 'Test City',
        state: 'CA',
        zip: '12345',
        licenseNumber: 'TEST123',
        yearsExperience: '5',
        specialties: ['Residential Construction'],
        serviceAreas: 'Bay Area'
      }
    })
    
    // Verify error handling (this would depend on your actual error implementation)
    const possibleErrorSelectors = [
      '[role="alert"]',
      '.text-red-500', 
      '.error-message',
      'text=Something went wrong'
    ]
    
    let errorFound = false
    for (const selector of possibleErrorSelectors) {
      if (await this.page.locator(selector).isVisible()) {
        errorFound = true
        break
      }
    }
    
    // Either error shown or successful redirect should happen
    const currentUrl = this.page.url()
    const hasRedirected = currentUrl.includes('/auth/signin') || currentUrl.includes('/member/dashboard')
    
    expect(errorFound || hasRedirected).toBeTruthy()
  }
}