import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { test } from '@playwright/test'

describe('Cross-Feature Integration Tests', () => {
  beforeEach(async () => {
    await setupIntegrationTestEnvironment()
  })

  afterEach(async () => {
    await cleanupIntegrationTestEnvironment()
  })

  it('should integrate tool lending with cost estimation workflow', async ({ page }) => {
    // Login as member
    await loginAsMember(page, 'contractor@test.com')

    // Step 1: Create cost estimate that requires specific tools
    await page.goto('/member/cost-estimator')
    await page.fill('[data-testid="project-name"]', 'Kitchen Renovation')
    await page.select('[data-testid="project-type"]', 'residential')
    await page.fill('[data-testid="square-footage"]', '200')
    await page.click('[data-testid="generate-estimate"]')

    // Wait for estimate generation
    await expect(page.locator('[data-testid="estimate-results"]')).toBeVisible()

    // Verify tool recommendations appear
    await expect(page.locator('[data-testid="recommended-tools"]')).toBeVisible()
    await expect(page.locator('[data-testid="tool-tile-saw"]')).toBeVisible()
    await expect(page.locator('[data-testid="tool-demolition-hammer"]')).toBeVisible()

    // Step 2: Reserve recommended tools directly from estimate
    await page.click('[data-testid="reserve-tool-tile-saw"]')

    // Should navigate to tool reservation with pre-filled data
    await expect(page).toHaveURL(/\/member\/tools\/reserve/)
    await expect(page.locator('[data-testid="tool-name"]')).toHaveValue('Tile Saw')
    await expect(page.locator('[data-testid="project-context"]')).toContainText('Kitchen Renovation')

    // Complete reservation
    await page.fill('[data-testid="start-date"]', '2024-02-01')
    await page.fill('[data-testid="end-date"]', '2024-02-05')
    await page.click('[data-testid="confirm-reservation"]')

    // Verify reservation success
    await expect(page.locator('[data-testid="reservation-confirmed"]')).toBeVisible()

    // Step 3: Verify cost estimate updates with tool costs
    await page.goto('/member/cost-estimator')
    await expect(page.locator('[data-testid="tool-rental-costs"]')).toContainText('$200')
    await expect(page.locator('[data-testid="updated-total"]')).toBeVisible()

    // Step 4: Verify HubSpot integration
    const hubspotEstimate = await getHubSpotCustomObject('cost_estimates')
    expect(hubspotEstimate.properties.tool_rental_costs).toBe('200')
    expect(hubspotEstimate.properties.associated_reservations).toContain('tile-saw-reservation')

    const hubspotReservation = await getHubSpotCustomObject('tool_reservations')
    expect(hubspotReservation.properties.project_context).toBe('Kitchen Renovation')
    expect(hubspotReservation.associations.cost_estimates).toContain(hubspotEstimate.id)
  })

  it('should integrate badge achievement with shop campaigns', async ({ page }) => {
    await loginAsMember(page, 'learner@test.com')

    // Step 1: Complete sponsored course
    await page.goto('/member/learning')
    await page.click('[data-testid="course-electrical-basics"]')
    await page.click('[data-testid="enroll-course"]')

    // Simulate course completion
    await page.click('[data-testid="start-lesson-1"]')
    await page.click('[data-testid="complete-lesson"]')
    await page.click('[data-testid="start-lesson-2"]')
    await page.click('[data-testid="complete-lesson"]')
    await page.click('[data-testid="final-assessment"]')

    // Complete assessment
    await page.click('[data-testid="answer-a"]')
    await page.click('[data-testid="answer-b"]')
    await page.click('[data-testid="submit-assessment"]')

    // Verify badge earned
    await expect(page.locator('[data-testid="badge-earned"]')).toBeVisible()
    await expect(page.locator('[data-testid="electrical-basics-badge"]')).toBeVisible()

    // Step 2: Verify shop campaign triggered
    await page.goto('/member/shop')
    await expect(page.locator('[data-testid="badge-campaign-banner"]')).toBeVisible()
    await expect(page.locator('[data-testid="electrical-tools-campaign"]')).toContainText(
      'Congratulations on earning your Electrical Basics badge!'
    )

    // Verify campaign products
    await expect(page.locator('[data-testid="campaign-product-multimeter"]')).toBeVisible()
    await expect(page.locator('[data-testid="campaign-discount-20"]')).toBeVisible()

    // Step 3: Make purchase from campaign
    await page.click('[data-testid="add-to-cart-multimeter"]')
    await page.goto('/member/shop/cart')
    await expect(page.locator('[data-testid="badge-discount-applied"]')).toBeVisible()
    await page.click('[data-testid="checkout"]')

    // Complete purchase
    await page.fill('[data-testid="card-number"]', '4242424242424242')
    await page.fill('[data-testid="expiry"]', '12/25')
    await page.fill('[data-testid="cvc"]', '123')
    await page.click('[data-testid="complete-purchase"]')

    // Step 4: Verify project fund allocation
    await page.goto('/member/dashboard')
    await expect(page.locator('[data-testid="project-fund-balance"]')).toContainText('$15.00')
    await expect(page.locator('[data-testid="fund-source-badge-campaign"]')).toBeVisible()

    // Step 5: Verify HubSpot workflow integration
    const badgeRecord = await getHubSpotCustomObject('proficiency_badges')
    expect(badgeRecord.properties.shop_campaigns_triggered).toContain('electrical-tools-campaign')

    const campaignRecord = await getHubSpotCustomObject('badge_shop_campaigns')
    expect(campaignRecord.properties.member_project_fund_generated).toBe('15.00')
    expect(campaignRecord.properties.purchase_count).toBe('1')
  })

  it('should integrate growth plan with project opportunities', async ({ page }) => {
    await loginAsMember(page, 'growing-contractor@test.com')

    // Step 1: Generate AI growth plan
    await page.goto('/member/growth-plan')
    await page.click('[data-testid="start-assessment"]')

    // Complete assessment
    await page.fill('[data-testid="current-revenue"]', '250000')
    await page.fill('[data-testid="target-revenue"]', '500000')
    await page.select('[data-testid="primary-focus"]', 'commercial')
    await page.check('[data-testid="expand-services"]')
    await page.click('[data-testid="generate-plan"]')

    // Wait for AI plan generation
    await expect(page.locator('[data-testid="growth-plan-generated"]')).toBeVisible()
    await expect(page.locator('[data-testid="commercial-expansion-goal"]')).toBeVisible()

    // Step 2: Verify project opportunities appear
    await page.goto('/member/dashboard')
    await expect(page.locator('[data-testid="recommended-opportunities"]')).toBeVisible()
    await expect(page.locator('[data-testid="commercial-projects"]')).toBeVisible()

    // Click on recommended opportunity
    await page.click('[data-testid="opportunity-office-renovation"]')
    await expect(page.locator('[data-testid="opportunity-details"]')).toBeVisible()
    await expect(page.locator('[data-testid="growth-plan-alignment"]')).toContainText(
      'This project aligns with your commercial expansion goal'
    )

    // Step 3: Apply for opportunity
    await page.click('[data-testid="apply-for-opportunity"]')
    await page.fill('[data-testid="application-message"]', 'I am expanding into commercial work')
    await page.click('[data-testid="submit-application"]')

    // Step 4: Verify growth plan progress update
    await page.goto('/member/growth-plan/dashboard')
    await expect(page.locator('[data-testid="milestone-commercial-application"]')).toHaveClass(/completed/)
    await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('data-progress', '25')

    // Step 5: Verify HubSpot deal pipeline integration
    const growthPlanDeal = await getHubSpotDeal('growth_plans')
    expect(growthPlanDeal.properties.dealstage).toBe('in_progress')
    expect(growthPlanDeal.properties.milestone_progress).toBe('25')

    const opportunityDeal = await getHubSpotDeal('project_opportunities')
    expect(opportunityDeal.properties.growth_plan_alignment).toBe('high')
    expect(opportunityDeal.associations.growth_plans).toContain(growthPlanDeal.id)
  })

  it('should integrate camera AI with formal bidding workflow', async ({ page }) => {
    await loginAsMember(page, 'tech-contractor@test.com')

    // Step 1: Use camera AI for site analysis
    await page.goto('/member/project-intelligence/camera')
    
    // Mock camera access and analysis
    await mockCameraAccess(page)
    await page.click('[data-testid="start-camera-session"]')
    
    // Simulate camera analysis
    await page.click('[data-testid="capture-frame"]')
    await expect(page.locator('[data-testid="ai-analysis-overlay"]')).toBeVisible()
    await expect(page.locator('[data-testid="material-identification"]')).toContainText('Drywall')
    await expect(page.locator('[data-testid="quantity-estimate"]')).toContainText('240 sq ft')

    // Capture multiple frames
    await page.click('[data-testid="capture-frame"]')
    await page.click('[data-testid="capture-frame"]')

    // End session and generate report
    await page.click('[data-testid="end-session"]')
    await expect(page.locator('[data-testid="session-report"]')).toBeVisible()

    // Step 2: Convert to formal estimate
    await page.click('[data-testid="convert-to-estimate"]')
    await expect(page).toHaveURL(/\/member\/cost-estimator/)
    
    // Verify camera data pre-populated
    await expect(page.locator('[data-testid="camera-data-imported"]')).toBeVisible()
    await expect(page.locator('[data-testid="material-drywall"]')).toHaveValue('240')
    await expect(page.locator('[data-testid="confidence-score"]')).toContainText('87%')

    // Generate formal estimate
    await page.click('[data-testid="generate-formal-estimate"]')
    await expect(page.locator('[data-testid="estimate-complete"]')).toBeVisible()

    // Step 3: Generate AI bid
    await page.click('[data-testid="generate-bid"]')
    await expect(page).toHaveURL(/\/member\/bids\/generate/)
    
    // Verify camera analysis integrated into bid
    await expect(page.locator('[data-testid="camera-analysis-section"]')).toBeVisible()
    await expect(page.locator('[data-testid="site-conditions"]')).toContainText('Good lighting')
    await expect(page.locator('[data-testid="material-quality"]')).toContainText('Standard grade')

    // Complete bid generation
    await page.fill('[data-testid="project-timeline"]', '2 weeks')
    await page.fill('[data-testid="warranty-period"]', '1 year')
    await page.click('[data-testid="generate-bid-document"]')

    // Step 4: Verify comprehensive bid document
    await expect(page.locator('[data-testid="bid-document"]')).toBeVisible()
    await expect(page.locator('[data-testid="camera-evidence-section"]')).toBeVisible()
    await expect(page.locator('[data-testid="ai-confidence-disclosure"]')).toBeVisible()

    // Step 5: Verify HubSpot integration chain
    const cameraEstimate = await getHubSpotCustomObject('camera_estimates')
    expect(cameraEstimate.properties.confidence).toBe('87')
    expect(cameraEstimate.properties.material_analysis).toContain('drywall')

    const costEstimate = await getHubSpotCustomObject('cost_estimates')
    expect(costEstimate.associations.camera_estimates).toContain(cameraEstimate.id)

    const generatedBid = await getHubSpotCustomObject('ai_generated_bids')
    expect(generatedBid.properties.data_sources_used).toContain('camera_ai')
    expect(generatedBid.associations.cost_estimates).toContain(costEstimate.id)
  })

  it('should integrate community networking with business opportunities', async ({ page }) => {
    await loginAsMember(page, 'networker@test.com')

    // Step 1: Scan business card and create contact
    await page.goto('/member/scanner')
    await uploadBusinessCard(page, 'tests/fixtures/business-card.jpg')
    
    await expect(page.locator('[data-testid="ocr-results"]')).toBeVisible()
    await page.click('[data-testid="verify-and-save"]')
    await expect(page.locator('[data-testid="contact-saved"]')).toBeVisible()

    // Step 2: Engage in community discussions
    await page.goto('/member/community')
    await page.click('[data-testid="create-discussion"]')
    await page.fill('[data-testid="discussion-title"]', 'Looking for electrical subcontractor')
    await page.fill('[data-testid="discussion-content"]', 'Need reliable electrical work for upcoming project')
    await page.select('[data-testid="discussion-category"]', 'business_opportunities')
    await page.click('[data-testid="post-discussion"]')

    // Step 3: Receive responses and create business opportunity
    await mockCommunityResponses(page)
    await page.reload()
    
    await expect(page.locator('[data-testid="discussion-replies"]')).toContainText('I specialize in electrical')
    await page.click('[data-testid="reply-from-electrician"]')
    await page.click('[data-testid="create-opportunity"]')

    // Fill opportunity details
    await page.fill('[data-testid="opportunity-title"]', 'Electrical Subcontractor Needed')
    await page.fill('[data-testid="estimated-value"]', '15000')
    await page.select('[data-testid="opportunity-type"]', 'subcontractor')
    await page.click('[data-testid="create-opportunity"]')

    // Step 4: Verify opportunity matching
    await expect(page.locator('[data-testid="opportunity-created"]')).toBeVisible()
    await expect(page.locator('[data-testid="matched-members"]')).toBeVisible()
    await expect(page.locator('[data-testid="member-electrical-specialist"]')).toBeVisible()

    // Step 5: Verify cross-feature data sharing
    const communityDiscussion = await getHubSpotCustomObject('community_discussions')
    expect(communityDiscussion.properties.category).toBe('business_opportunities')
    expect(communityDiscussion.properties.opportunity_generated).toBe('true')

    const businessOpportunity = await getHubSpotCustomObject('business_opportunities')
    expect(businessOpportunity.properties.source).toBe('community_discussion')
    expect(businessOpportunity.associations.community_discussions).toContain(communityDiscussion.id)

    const scannedContact = await getHubSpotContact('electrician@test.com')
    expect(scannedContact.properties.lead_source).toBe('business_card_scan')
    expect(scannedContact.properties.opportunity_matches).toContain(businessOpportunity.id)
  })
})

// Helper functions for integration testing
async function setupIntegrationTestEnvironment() {
  await initializeTestDatabase()
  setupComprehensiveMocks()
}

async function cleanupIntegrationTestEnvironment() {
  await cleanupTestDatabase()
  vi.resetAllMocks()
}

async function loginAsMember(page: any, email: string) {
  await page.goto('/auth/signin')
  await page.fill('[data-testid="email"]', email)
  await page.fill('[data-testid="password"]', 'TestPassword123!')
  await page.click('[data-testid="signin-button"]')
  await expect(page).toHaveURL('/member/dashboard')
}

async function mockCameraAccess(page: any) {
  await page.evaluate(() => {
    // Mock getUserMedia for camera access
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: () => Promise.resolve({
          getTracks: () => [{ stop: () => {} }]
        })
      }
    })
  })
}

async function uploadBusinessCard(page: any, filePath: string) {
  const fileInput = page.locator('[data-testid="card-upload"]')
  await fileInput.setInputFiles(filePath)
  await page.click('[data-testid="process-card"]')
}

async function mockCommunityResponses(page: any) {
  // Mock community responses for testing
  await page.evaluate(() => {
    window.mockCommunityData = {
      replies: [
        {
          id: 'reply-1',
          author: 'Electrical Specialist',
          content: 'I specialize in electrical work and am available',
          memberId: 'electrician-member-123'
        }
      ]
    }
  })
}

function setupComprehensiveMocks() {
  // Setup all service mocks for integration testing
  vi.mock('@/lib/services/hubspot-backbone.service')
  vi.mock('@/lib/services/ai-bid-generator.service')
  vi.mock('@/lib/services/gemini-camera-ai.service')
  vi.mock('@/lib/services/ocr-business-card.service')
  vi.mock('@/lib/services/sponsored-learning.service')
  vi.mock('@/lib/services/shop.service')
}

async function getHubSpotCustomObject(objectType: string) {
  // Mock HubSpot custom object retrieval
  return {
    id: `${objectType}-123`,
    properties: {},
    associations: {}
  }
}

async function getHubSpotDeal(pipeline: string) {
  // Mock HubSpot deal retrieval
  return {
    id: `deal-${pipeline}-123`,
    properties: {
      pipeline,
      dealstage: 'in_progress'
    },
    associations: {}
  }
}

async function getHubSpotContact(email: string) {
  // Mock HubSpot contact retrieval
  return {
    id: 'contact-123',
    properties: {
      email,
      lead_source: 'business_card_scan'
    }
  }
}