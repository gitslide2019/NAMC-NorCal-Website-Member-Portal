import { HubSpotBackboneService } from './hubspot-backbone.service';

export interface TechComfortLevel {
  level: 'beginner' | 'intermediate' | 'advanced';
  score: number;
  areas: {
    software: number;
    mobile: number;
    internet: number;
    learning: number;
  };
}

export interface OnboardingProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  skippedSteps: string[];
  strugglingAreas: string[];
  techComfortLevel: TechComfortLevel;
  personalizedBadges: string[];
  aiEncouragementLevel: 'low' | 'medium' | 'high';
}

export interface AIGuidanceResponse {
  message: string;
  tone: 'encouraging' | 'instructional' | 'supportive' | 'celebratory';
  suggestions: string[];
  alternativeApproaches?: string[];
  helpResources?: {
    type: 'video' | 'text' | 'mentor';
    title: string;
    url?: string;
  }[];
}

export interface StruggleDetection {
  isStruggling: boolean;
  strugglingArea: string;
  confidence: number;
  suggestedInterventions: string[];
  alternativePathways: string[];
}

export class AIOnboardingAssistantService {
  private hubspotService: HubSpotBackboneService;
  private anthropicApiKey: string;

  constructor() {
    this.hubspotService = new HubSpotBackboneService({
      accessToken: process.env.HUBSPOT_ACCESS_TOKEN || '',
      portalId: process.env.HUBSPOT_PORTAL_ID
    });
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';
  }

  /**
   * Assess member's technical comfort level through interactive questions
   */
  async assessTechComfortLevel(responses: Record<string, any>): Promise<TechComfortLevel> {
    const softwareScore = this.calculateSoftwareComfort(responses);
    const mobileScore = this.calculateMobileComfort(responses);
    const internetScore = this.calculateInternetComfort(responses);
    const learningScore = this.calculateLearningComfort(responses);

    const averageScore = (softwareScore + mobileScore + internetScore + learningScore) / 4;
    
    let level: 'beginner' | 'intermediate' | 'advanced';
    if (averageScore <= 3) {
      level = 'beginner';
    } else if (averageScore <= 7) {
      level = 'intermediate';
    } else {
      level = 'advanced';
    }

    return {
      level,
      score: averageScore,
      areas: {
        software: softwareScore,
        mobile: mobileScore,
        internet: internetScore,
        learning: learningScore
      }
    };
  }

  /**
   * Generate AI-powered contextual guidance based on member's comfort level and current step
   */
  async generateContextualGuidance(
    memberId: string,
    currentStep: string,
    techComfortLevel: TechComfortLevel,
    context?: Record<string, any>
  ): Promise<AIGuidanceResponse> {
    const memberProfile = await this.hubspotService.getMemberProfile(memberId);
    
    const prompt = this.buildGuidancePrompt(
      currentStep,
      techComfortLevel,
      memberProfile,
      context
    );

    try {
      const response = await this.callAnthropicAPI(prompt);
      return this.parseAIResponse(response, techComfortLevel);
    } catch (error) {
      console.error('Error generating AI guidance:', error);
      return this.getFallbackGuidance(currentStep, techComfortLevel);
    }
  }

  /**
   * Detect if member is struggling and provide intervention suggestions
   */
  async detectStruggle(
    memberId: string,
    stepData: {
      timeSpent: number;
      attempts: number;
      completionRate: number;
      errorCount: number;
      helpRequests: number;
    }
  ): Promise<StruggleDetection> {
    const struggleScore = this.calculateStruggleScore(stepData);
    const isStruggling = struggleScore > 0.6;

    if (!isStruggling) {
      return {
        isStruggling: false,
        strugglingArea: '',
        confidence: 1 - struggleScore,
        suggestedInterventions: [],
        alternativePathways: []
      };
    }

    const strugglingArea = this.identifyStruggleArea(stepData);
    const interventions = await this.generateInterventions(memberId, strugglingArea);
    const alternatives = await this.generateAlternativePathways(strugglingArea);

    return {
      isStruggling: true,
      strugglingArea,
      confidence: struggleScore,
      suggestedInterventions: interventions,
      alternativePathways: alternatives
    };
  }

  /**
   * Generate personalized encouragement based on progress and comfort level
   */
  async generateEncouragement(
    memberId: string,
    progress: OnboardingProgress,
    achievement?: string
  ): Promise<AIGuidanceResponse> {
    const memberProfile = await this.hubspotService.getMemberProfile(memberId);
    
    const prompt = `
    Generate encouraging message for NAMC member onboarding:
    
    Member Context:
    - Name: ${memberProfile.firstName}
    - Tech Comfort: ${progress.techComfortLevel.level}
    - Progress: ${progress.completedSteps.length}/${progress.totalSteps} steps
    - Recent Achievement: ${achievement || 'Continuing progress'}
    - Encouragement Level Needed: ${progress.aiEncouragementLevel}
    
    Create a warm, supportive message that:
    1. Acknowledges their progress
    2. Provides specific encouragement for their comfort level
    3. Motivates them for next steps
    4. Uses construction industry language they understand
    5. Keeps tone professional but friendly
    
    Respond in JSON format with message, tone, and suggestions.
    `;

    try {
      const response = await this.callAnthropicAPI(prompt);
      return this.parseAIResponse(response, progress.techComfortLevel);
    } catch (error) {
      return this.getFallbackEncouragement(progress);
    }
  }

  /**
   * Award personalized badges based on completion and comfort level
   */
  async awardPersonalizedBadge(
    memberId: string,
    stepCompleted: string,
    techComfortLevel: TechComfortLevel
  ): Promise<{ badgeId: string; badgeName: string; message: string }> {
    const badgeData = this.determineBadgeForStep(stepCompleted, techComfortLevel);
    
    // Create badge in HubSpot
    await this.hubspotService.createCustomObject('proficiency_badges', {
      member_id: memberId,
      badge_id: badgeData.badgeId,
      badge_name: badgeData.badgeName,
      category: 'onboarding',
      skill_area: stepCompleted,
      level: techComfortLevel.level,
      earned_date: new Date().toISOString(),
      verification_status: 'verified'
    });

    // Generate personalized congratulations message
    const congratsMessage = await this.generateCongratulationsMessage(
      memberId,
      badgeData,
      techComfortLevel
    );

    return {
      ...badgeData,
      message: congratsMessage
    };
  }

  /**
   * Track onboarding progress in HubSpot
   */
  async updateOnboardingProgress(
    memberId: string,
    progress: OnboardingProgress
  ): Promise<void> {
    await this.hubspotService.updateMemberProfile(memberId, {
      onboarding_current_step: progress.currentStep,
      onboarding_completed_steps: progress.completedSteps.join(','),
      onboarding_skipped_steps: progress.skippedSteps.join(','),
      onboarding_tech_comfort: progress.techComfortLevel.level,
      onboarding_progress_percentage: (progress.completedSteps.length / progress.totalSteps) * 100,
      onboarding_struggling_areas: progress.strugglingAreas.join(','),
      onboarding_badges: progress.personalizedBadges.join(',')
    });

    // Trigger HubSpot workflow for progress milestone
    if (progress.completedSteps.length % 2 === 0) { // Every 2 steps
      await this.hubspotService.triggerWorkflow('onboarding_milestone', memberId);
    }
  }

  // Private helper methods
  private calculateSoftwareComfort(responses: Record<string, any>): number {
    // Calculate based on software usage questions (1-10 scale)
    const softwareQuestions = [
      'computer_daily_use',
      'software_learning_comfort',
      'new_app_comfort',
      'troubleshooting_ability'
    ];
    
    return this.averageResponses(responses, softwareQuestions);
  }

  private calculateMobileComfort(responses: Record<string, any>): number {
    const mobileQuestions = [
      'smartphone_usage',
      'app_downloads',
      'mobile_internet',
      'mobile_photos'
    ];
    
    return this.averageResponses(responses, mobileQuestions);
  }

  private calculateInternetComfort(responses: Record<string, any>): number {
    const internetQuestions = [
      'internet_daily_use',
      'online_forms',
      'email_comfort',
      'online_research'
    ];
    
    return this.averageResponses(responses, internetQuestions);
  }

  private calculateLearningComfort(responses: Record<string, any>): number {
    const learningQuestions = [
      'learning_new_tech',
      'video_tutorials',
      'written_instructions',
      'asking_for_help'
    ];
    
    return this.averageResponses(responses, learningQuestions);
  }

  private averageResponses(responses: Record<string, any>, questions: string[]): number {
    const values = questions
      .map(q => responses[q] || 5)
      .filter(v => typeof v === 'number');
    
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 5;
  }

  private buildGuidancePrompt(
    currentStep: string,
    techComfortLevel: TechComfortLevel,
    memberProfile: any,
    context?: Record<string, any>
  ): string {
    return `
    You are an AI assistant helping a NAMC (National Association of Minority Contractors) member through their onboarding process.
    
    Member Context:
    - Name: ${memberProfile.firstName}
    - Tech Comfort Level: ${techComfortLevel.level} (Score: ${techComfortLevel.score}/10)
    - Current Step: ${currentStep}
    - Industry: Construction/Contracting
    
    Tech Comfort Details:
    - Software: ${techComfortLevel.areas.software}/10
    - Mobile: ${techComfortLevel.areas.mobile}/10
    - Internet: ${techComfortLevel.areas.internet}/10
    - Learning: ${techComfortLevel.areas.learning}/10
    
    Additional Context: ${JSON.stringify(context || {})}
    
    Provide guidance that:
    1. Matches their technical comfort level
    2. Uses construction industry terminology they understand
    3. Provides step-by-step instructions appropriate for their skill level
    4. Offers encouragement and builds confidence
    5. Suggests alternative approaches if they might struggle
    
    Respond in JSON format with: message, tone, suggestions, alternativeApproaches, helpResources
    `;
  }

  private async callAnthropicAPI(prompt: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  private parseAIResponse(response: string, techComfortLevel: TechComfortLevel): AIGuidanceResponse {
    try {
      const parsed = JSON.parse(response);
      return {
        message: parsed.message || 'Let me help you with this step.',
        tone: parsed.tone || 'supportive',
        suggestions: parsed.suggestions || [],
        alternativeApproaches: parsed.alternativeApproaches || [],
        helpResources: parsed.helpResources || []
      };
    } catch (error) {
      return this.getFallbackGuidance('unknown', techComfortLevel);
    }
  }

  private getFallbackGuidance(step: string, techComfortLevel: TechComfortLevel): AIGuidanceResponse {
    const isBeginnerLevel = techComfortLevel.level === 'beginner';
    
    return {
      message: isBeginnerLevel 
        ? "Don't worry - we'll take this step by step. Every contractor started somewhere, and you're doing great!"
        : "Let's work through this together. You've got the skills to handle this.",
      tone: 'supportive',
      suggestions: [
        isBeginnerLevel ? "Take your time with each field" : "Review the information carefully",
        "Don't hesitate to ask for help if needed",
        "Remember, this will help grow your business"
      ],
      alternativeApproaches: isBeginnerLevel ? [
        "We can walk through this over the phone if preferred",
        "Video tutorial available for visual learners"
      ] : []
    };
  }

  private getFallbackEncouragement(progress: OnboardingProgress): AIGuidanceResponse {
    const completionRate = progress.completedSteps.length / progress.totalSteps;
    
    return {
      message: completionRate > 0.5 
        ? "You're more than halfway there! Your business profile is really taking shape."
        : "Great start! Each step you complete makes your NAMC membership more valuable.",
      tone: 'encouraging',
      suggestions: [
        "Keep up the excellent progress",
        "Your fellow contractors are here to support you",
        "These details will help you connect with more opportunities"
      ]
    };
  }

  private calculateStruggleScore(stepData: {
    timeSpent: number;
    attempts: number;
    completionRate: number;
    errorCount: number;
    helpRequests: number;
  }): number {
    // Normalize factors (0-1 scale where higher = more struggle)
    const timeScore = Math.min(stepData.timeSpent / 1800, 1); // 30 min max
    const attemptScore = Math.min(stepData.attempts / 5, 1); // 5 attempts max
    const completionScore = 1 - stepData.completionRate; // Invert completion rate
    const errorScore = Math.min(stepData.errorCount / 10, 1); // 10 errors max
    const helpScore = Math.min(stepData.helpRequests / 3, 1); // 3 help requests max

    // Weighted average
    return (timeScore * 0.2 + attemptScore * 0.2 + completionScore * 0.3 + 
            errorScore * 0.2 + helpScore * 0.1);
  }

  private identifyStruggleArea(stepData: any): string {
    if (stepData.errorCount > 5) return 'form_completion';
    if (stepData.timeSpent > 1200) return 'understanding_instructions';
    if (stepData.helpRequests > 2) return 'technical_navigation';
    if (stepData.attempts > 3) return 'data_entry';
    return 'general_confusion';
  }

  private async generateInterventions(memberId: string, strugglingArea: string): Promise<string[]> {
    const interventionMap: Record<string, string[]> = {
      'form_completion': [
        'Provide field-by-field guidance',
        'Show example entries',
        'Offer phone assistance'
      ],
      'understanding_instructions': [
        'Break down into smaller steps',
        'Provide video walkthrough',
        'Assign mentor support'
      ],
      'technical_navigation': [
        'Simplify interface temporarily',
        'Add navigation hints',
        'Schedule screen-sharing session'
      ],
      'data_entry': [
        'Pre-populate known information',
        'Add input validation hints',
        'Provide data format examples'
      ],
      'general_confusion': [
        'Pause and provide overview',
        'Connect with member success team',
        'Offer alternative completion method'
      ]
    };

    return interventionMap[strugglingArea] || interventionMap['general_confusion'];
  }

  private async generateAlternativePathways(strugglingArea: string): Promise<string[]> {
    return [
      'Complete over phone with staff assistance',
      'Schedule in-person help at local chapter',
      'Pair with mentor member for guidance',
      'Use simplified mobile interface',
      'Complete in multiple shorter sessions'
    ];
  }

  private determineBadgeForStep(
    stepCompleted: string,
    techComfortLevel: TechComfortLevel
  ): { badgeId: string; badgeName: string } {
    const badgeMap: Record<string, any> = {
      'tech_assessment': {
        beginner: { badgeId: 'tech_brave', badgeName: 'Technology Brave' },
        intermediate: { badgeId: 'tech_ready', badgeName: 'Technology Ready' },
        advanced: { badgeId: 'tech_leader', badgeName: 'Technology Leader' }
      },
      'profile_completion': {
        beginner: { badgeId: 'profile_builder', badgeName: 'Profile Builder' },
        intermediate: { badgeId: 'profile_pro', badgeName: 'Profile Professional' },
        advanced: { badgeId: 'profile_expert', badgeName: 'Profile Expert' }
      },
      'skills_assessment': {
        beginner: { badgeId: 'skills_explorer', badgeName: 'Skills Explorer' },
        intermediate: { badgeId: 'skills_specialist', badgeName: 'Skills Specialist' },
        advanced: { badgeId: 'skills_master', badgeName: 'Skills Master' }
      }
    };

    const stepBadges = badgeMap[stepCompleted];
    if (stepBadges) {
      return stepBadges[techComfortLevel.level];
    }

    return { badgeId: 'onboarding_progress', badgeName: 'Onboarding Progress' };
  }

  private async generateCongratulationsMessage(
    memberId: string,
    badgeData: { badgeId: string; badgeName: string },
    techComfortLevel: TechComfortLevel
  ): Promise<string> {
    const messages = {
      beginner: `Congratulations! You've earned the ${badgeData.badgeName} badge. You're showing real courage in learning new technology - that's the spirit that builds successful contracting businesses!`,
      intermediate: `Well done! The ${badgeData.badgeName} badge is yours. Your balanced approach to technology and construction expertise is exactly what NAMC members need to thrive.`,
      advanced: `Excellent work! You've earned the ${badgeData.badgeName} badge. Your technical skills combined with construction knowledge make you a valuable leader in our community.`
    };

    return messages[techComfortLevel.level];
  }

  /**
   * Generate adaptive dashboard configuration based on tech comfort level
   */
  async generateAdaptiveDashboard(
    memberId: string,
    techComfortLevel: TechComfortLevel,
    completedSteps: string[]
  ): Promise<{
    layout: 'simple' | 'standard' | 'advanced';
    widgets: string[];
    tutorials: string[];
    quickActions: string[];
  }> {
    const memberProfile = await this.hubspotService.getMemberProfile(memberId);
    
    let layout: 'simple' | 'standard' | 'advanced';
    let widgets: string[];
    let tutorials: string[];
    let quickActions: string[];

    switch (techComfortLevel.level) {
      case 'beginner':
        layout = 'simple';
        widgets = [
          'welcome_message',
          'next_steps',
          'help_center',
          'recent_activity',
          'quick_tools'
        ];
        tutorials = [
          'dashboard_navigation',
          'profile_management',
          'finding_help',
          'basic_features'
        ];
        quickActions = [
          'view_profile',
          'contact_support',
          'browse_tools',
          'join_discussion'
        ];
        break;
      
      case 'intermediate':
        layout = 'standard';
        widgets = [
          'project_overview',
          'tool_reservations',
          'member_directory',
          'recent_activity',
          'opportunities',
          'learning_progress'
        ];
        tutorials = [
          'project_management',
          'tool_lending',
          'networking_tips',
          'advanced_features'
        ];
        quickActions = [
          'create_project',
          'reserve_tool',
          'browse_opportunities',
          'update_profile',
          'message_members'
        ];
        break;
      
      case 'advanced':
        layout = 'advanced';
        widgets = [
          'project_analytics',
          'business_metrics',
          'advanced_tools',
          'leadership_opportunities',
          'mentor_dashboard',
          'system_insights'
        ];
        tutorials = [
          'advanced_analytics',
          'mentoring_others',
          'leadership_tools',
          'system_administration'
        ];
        quickActions = [
          'create_advanced_project',
          'mentor_member',
          'analyze_metrics',
          'manage_team',
          'system_settings'
        ];
        break;
    }

    return { layout, widgets, tutorials, quickActions };
  }

  /**
   * Generate AI-powered recommendations for groups, mentors, and learning opportunities
   */
  async generateRecommendations(
    memberId: string,
    profileData: any,
    skillsData: any,
    goalsData: any
  ): Promise<{
    groups: Array<{ id: string; name: string; reason: string; matchScore: number }>;
    mentors: Array<{ id: string; name: string; expertise: string; reason: string }>;
    learningOpportunities: Array<{ id: string; title: string; type: string; reason: string }>;
    projects: Array<{ id: string; title: string; type: string; matchScore: number }>;
  }> {
    const prompt = `
    Generate personalized recommendations for a NAMC member:
    
    Member Profile:
    - Location: ${profileData.location}
    - Company: ${profileData.company}
    - Business Type: ${profileData.businessType}
    - Experience: ${skillsData.experienceYears}
    - Primary Focus: ${skillsData.primaryFocus}
    - Skills: ${JSON.stringify(skillsData.skills)}
    - Goals: ${JSON.stringify(goalsData.goals)}
    - Timeframe: ${goalsData.timeframe}
    
    Provide recommendations in JSON format with:
    1. Groups - relevant member groups/committees
    2. Mentors - experienced members who could provide guidance
    3. Learning Opportunities - courses, certifications, workshops
    4. Projects - potential project opportunities
    
    Each recommendation should include a reason and relevance score.
    `;

    try {
      const response = await this.callAnthropicAPI(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      return {
        groups: [],
        mentors: [],
        learningOpportunities: [],
        projects: []
      };
    }
  }

  /**
   * Create interactive feature tutorials with AI coaching
   */
  async createFeatureTutorial(
    memberId: string,
    featureName: string,
    techComfortLevel: TechComfortLevel
  ): Promise<{
    steps: Array<{
      id: string;
      title: string;
      description: string;
      aiCoaching: string;
      element: string;
      action: string;
    }>;
    completionMessage: string;
  }> {
    const tutorialPrompts = {
      beginner: `Create a very detailed, step-by-step tutorial for ${featureName} that assumes no prior knowledge. Use simple language and provide encouragement at each step.`,
      intermediate: `Create a comprehensive tutorial for ${featureName} that explains the why behind each step. Include helpful tips and best practices.`,
      advanced: `Create an efficient tutorial for ${featureName} that focuses on advanced features and shortcuts. Include power user tips.`
    };

    const prompt = `
    ${tutorialPrompts[techComfortLevel.level]}
    
    The tutorial should be interactive and include:
    1. Clear step titles and descriptions
    2. AI coaching messages for each step
    3. Element selectors for highlighting
    4. Required actions (click, type, etc.)
    5. A completion message
    
    Format as JSON with steps array and completionMessage.
    `;

    try {
      const response = await this.callAnthropicAPI(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to create tutorial:', error);
      return {
        steps: [],
        completionMessage: 'Tutorial completed!'
      };
    }
  }

  /**
   * Assign AI mentor and create ongoing support plan
   */
  async assignAIMentor(
    memberId: string,
    techComfortLevel: TechComfortLevel,
    completedSteps: string[]
  ): Promise<{
    mentorPersonality: string;
    supportPlan: Array<{
      week: number;
      checkIn: string;
      goals: string[];
      resources: string[];
    }>;
    communicationStyle: string;
  }> {
    const memberProfile = await this.hubspotService.getMemberProfile(memberId);
    
    const mentorPersonalities = {
      beginner: 'patient_guide',
      intermediate: 'balanced_coach',
      advanced: 'strategic_advisor'
    };

    const supportPlans = {
      beginner: [
        {
          week: 1,
          checkIn: 'How are you settling in? Any questions about the platform?',
          goals: ['Complete profile setup', 'Explore member directory', 'Join first discussion'],
          resources: ['Platform basics video', 'Member handbook', 'FAQ section']
        },
        {
          week: 2,
          checkIn: 'Ready to explore more features? Let\'s look at tools and opportunities.',
          goals: ['Browse tool library', 'Review project opportunities', 'Connect with local members'],
          resources: ['Tool lending guide', 'Opportunity matching tips', 'Networking best practices']
        },
        {
          week: 4,
          checkIn: 'How\'s your first month going? Let\'s plan your next steps.',
          goals: ['Set business goals', 'Plan first project', 'Consider mentorship'],
          resources: ['Business planning tools', 'Project templates', 'Mentor matching']
        }
      ],
      intermediate: [
        {
          week: 1,
          checkIn: 'Welcome! Let\'s get you connected with the right opportunities.',
          goals: ['Optimize profile', 'Join relevant committees', 'Explore advanced features'],
          resources: ['Profile optimization guide', 'Committee overview', 'Advanced features tour']
        },
        {
          week: 3,
          checkIn: 'How are you leveraging the platform for your business?',
          goals: ['Create first project', 'Use cost estimation tools', 'Network strategically'],
          resources: ['Project management guide', 'Cost estimation tutorial', 'Strategic networking']
        }
      ],
      advanced: [
        {
          week: 1,
          checkIn: 'Ready to maximize your NAMC membership? Let\'s explore leadership opportunities.',
          goals: ['Explore leadership roles', 'Mentor other members', 'Use advanced analytics'],
          resources: ['Leadership opportunities', 'Mentoring guide', 'Analytics dashboard']
        }
      ]
    };

    const communicationStyles = {
      beginner: 'encouraging_detailed',
      intermediate: 'informative_supportive',
      advanced: 'strategic_efficient'
    };

    // Create HubSpot workflow for AI mentor assignment
    await this.hubspotService.updateMemberProfile(memberId, {
      ai_mentor_assigned: 'true',
      ai_mentor_personality: mentorPersonalities[techComfortLevel.level],
      ai_mentor_communication_style: communicationStyles[techComfortLevel.level],
      ai_mentor_start_date: new Date().toISOString()
    });

    // Trigger HubSpot workflow for ongoing support
    await this.hubspotService.triggerWorkflow('ai_mentor_assignment', memberId);

    return {
      mentorPersonality: mentorPersonalities[techComfortLevel.level],
      supportPlan: supportPlans[techComfortLevel.level],
      communicationStyle: communicationStyles[techComfortLevel.level]
    };
  }

  /**
   * Generate milestone celebrations with personalized messages
   */
  async generateMilestoneCelebration(
    memberId: string,
    milestone: string,
    techComfortLevel: TechComfortLevel,
    progress: OnboardingProgress
  ): Promise<{
    celebrationMessage: string;
    badgeAwarded?: { id: string; name: string; description: string };
    nextSteps: string[];
    specialOffers?: string[];
  }> {
    const memberProfile = await this.hubspotService.getMemberProfile(memberId);
    
    const prompt = `
    Create a personalized milestone celebration for a NAMC member:
    
    Member: ${memberProfile.firstName}
    Tech Comfort: ${techComfortLevel.level}
    Milestone: ${milestone}
    Progress: ${progress.completedSteps.length}/${progress.totalSteps} steps completed
    
    Generate a celebration that includes:
    1. Personalized congratulations message
    2. Badge information if applicable
    3. Suggested next steps
    4. Any special offers or opportunities
    
    Match the tone to their tech comfort level:
    - Beginner: Very encouraging, simple language
    - Intermediate: Balanced, informative
    - Advanced: Professional, strategic
    
    Format as JSON.
    `;

    try {
      const response = await this.callAnthropicAPI(prompt);
      const celebration = JSON.parse(response);
      
      // Create milestone record in HubSpot
      await this.hubspotService.createCustomObject('onboarding_milestones', {
        member_id: memberId,
        milestone_name: milestone,
        achieved_date: new Date().toISOString(),
        celebration_message: celebration.celebrationMessage,
        tech_comfort_level: techComfortLevel.level
      });

      return celebration;
    } catch (error) {
      console.error('Failed to generate milestone celebration:', error);
      return {
        celebrationMessage: `Congratulations on reaching the ${milestone} milestone!`,
        nextSteps: ['Continue exploring the platform', 'Connect with other members'],
        specialOffers: []
      };
    }
  }

  /**
   * Complete onboarding and trigger all completion workflows
   */
  async completeOnboarding(
    memberId: string,
    finalProgress: OnboardingProgress
  ): Promise<{
    completionCertificate: { id: string; url: string };
    dashboardConfig: any;
    mentorAssignment: any;
    recommendations: any;
    nextSteps: string[];
  }> {
    // Mark onboarding as completed
    await this.hubspotService.updateMemberProfile(memberId, {
      onboarding_is_completed: true,
      onboarding_completed_at: new Date().toISOString(),
      onboarding_progress_percentage: 100
    });

    // Generate adaptive dashboard
    const dashboardConfig = await this.generateAdaptiveDashboard(
      memberId,
      finalProgress.techComfortLevel,
      finalProgress.completedSteps
    );

    // Assign AI mentor
    const mentorAssignment = await this.assignAIMentor(
      memberId,
      finalProgress.techComfortLevel,
      finalProgress.completedSteps
    );

    // Generate recommendations (placeholder data for now)
    const recommendations = await this.generateRecommendations(
      memberId,
      { location: 'Oakland, CA', company: 'Sample Construction' },
      { experienceYears: '3-5', primaryFocus: 'residential' },
      { goals: ['grow_revenue'], timeframe: '1year' }
    );

    // Create completion certificate
    const completionCertificate = {
      id: `cert_${memberId}_${Date.now()}`,
      url: `/certificates/onboarding/${memberId}`
    };

    // Trigger completion workflows
    await this.hubspotService.triggerWorkflow('onboarding_completed', memberId);
    await this.hubspotService.triggerWorkflow('welcome_sequence', memberId);

    return {
      completionCertificate,
      dashboardConfig,
      mentorAssignment,
      recommendations,
      nextSteps: [
        'Explore your personalized dashboard',
        'Connect with recommended members',
        'Browse available tools and resources',
        'Join relevant committees or groups',
        'Start your first project'
      ]
    };
  }
}