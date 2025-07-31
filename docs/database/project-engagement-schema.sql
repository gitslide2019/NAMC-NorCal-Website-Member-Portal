-- NAMC Project Engagement Tracking Database Schema Extensions
-- This file extends the existing database schema to support comprehensive project opportunity management
-- and member engagement tracking for the admin system.

-- =====================================================
-- PROJECT ENGAGEMENT TRACKING TABLES
-- =====================================================

-- Track member views and interactions with project opportunities
CREATE TABLE project_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    view_duration INT DEFAULT 0, -- Duration in seconds
    pages_viewed JSONB DEFAULT '[]', -- Array of page sections viewed
    referrer_source VARCHAR(100), -- How they found the project (search, email, etc.)
    device_type VARCHAR(50), -- mobile, desktop, tablet
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track member interest levels and expressions for projects
CREATE TABLE project_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    interest_level VARCHAR(20) DEFAULT 'medium' CHECK (interest_level IN ('high', 'medium', 'low')),
    interest_type VARCHAR(50), -- 'viewing', 'bookmark', 'inquiry', 'bid_intent'
    notes TEXT,
    metadata JSONB DEFAULT '{}', -- Additional tracking data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id, interest_type) -- Prevent duplicate interest records
);

-- Track document downloads and access
CREATE TABLE project_document_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    document_id UUID REFERENCES project_documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    access_type VARCHAR(50) DEFAULT 'download', -- 'view', 'download', 'print'
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track member questions and inquiries about projects
CREATE TABLE project_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    inquiry_type VARCHAR(50), -- 'question', 'clarification', 'site_visit', 'meeting'
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'closed')),
    admin_response TEXT,
    responded_by UUID REFERENCES users(id),
    responded_at TIMESTAMP WITH TIME ZONE,
    priority_level VARCHAR(20) DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PROJECT OPPORTUNITIES ENHANCEMENTS
-- =====================================================

-- Extend the existing projects table with additional columns for opportunities management
ALTER TABLE projects ADD COLUMN IF NOT EXISTS opportunity_type VARCHAR(50) DEFAULT 'open_bid' 
    CHECK (opportunity_type IN ('open_bid', 'invitation_only', 'pre_qualified', 'negotiated'));

ALTER TABLE projects ADD COLUMN IF NOT EXISTS minority_participation_requirement INT DEFAULT 0
    CHECK (minority_participation_requirement >= 0 AND minority_participation_requirement <= 100);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS required_certifications JSONB DEFAULT '[]';

ALTER TABLE projects ADD COLUMN IF NOT EXISTS submission_requirements JSONB DEFAULT '{}';

ALTER TABLE projects ADD COLUMN IF NOT EXISTS evaluation_criteria JSONB DEFAULT '{}';

ALTER TABLE projects ADD COLUMN IF NOT EXISTS visibility_settings VARCHAR(50) DEFAULT 'public'
    CHECK (visibility_settings IN ('public', 'members_only', 'tier_restricted', 'invitation_only'));

ALTER TABLE projects ADD COLUMN IF NOT EXISTS allowed_member_tiers JSONB DEFAULT '["bronze", "silver", "gold", "platinum"]';

ALTER TABLE projects ADD COLUMN IF NOT EXISTS max_bid_amount DECIMAL(15,2);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_duration_days INT;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_priority VARCHAR(20) DEFAULT 'medium'
    CHECK (project_priority IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE projects ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS site_visit_required BOOLEAN DEFAULT FALSE;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS pre_bid_meeting TIMESTAMP WITH TIME ZONE;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS questions_deadline TIMESTAMP WITH TIME ZONE;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS submission_method VARCHAR(50) DEFAULT 'online'
    CHECK (submission_method IN ('online', 'email', 'physical', 'hybrid'));

-- =====================================================
-- MEMBER ENGAGEMENT SCORING AND ANALYTICS
-- =====================================================

-- Track comprehensive member engagement scores
CREATE TABLE member_engagement_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    engagement_score INT DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100),
    view_score INT DEFAULT 0,
    interaction_score INT DEFAULT 0,
    document_score INT DEFAULT 0,
    inquiry_score INT DEFAULT 0,
    bid_history_score INT DEFAULT 0,
    last_activity TIMESTAMP WITH TIME ZONE,
    engagement_trend VARCHAR(20) DEFAULT 'stable' CHECK (engagement_trend IN ('increasing', 'stable', 'decreasing')),
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, project_id)
);

-- Track project-specific analytics and metrics
CREATE TABLE project_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    total_views INT DEFAULT 0,
    unique_viewers INT DEFAULT 0,
    total_document_downloads INT DEFAULT 0,
    total_inquiries INT DEFAULT 0,
    average_engagement_score DECIMAL(5,2) DEFAULT 0,
    high_engagement_members INT DEFAULT 0,
    medium_engagement_members INT DEFAULT 0,
    low_engagement_members INT DEFAULT 0,
    expected_bids INT DEFAULT 0,
    actual_bids INT DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- NOTIFICATION AND COMMUNICATION TRACKING
-- =====================================================

-- Track notifications sent to members about projects
CREATE TABLE project_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- 'new_project', 'deadline_reminder', 'status_update', 'inquiry_response'
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app')),
    subject VARCHAR(255),
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'clicked', 'unsubscribed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track member notification preferences
CREATE TABLE member_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_types JSONB DEFAULT '["residential", "commercial", "industrial", "government"]',
    budget_range_min DECIMAL(15,2),
    budget_range_max DECIMAL(15,2),
    location_preferences JSONB DEFAULT '[]', -- Geographic preferences
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    push_notifications BOOLEAN DEFAULT TRUE,
    frequency VARCHAR(20) DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'daily', 'weekly', 'never')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================

-- Project Views Indexes
CREATE INDEX idx_project_views_project_id ON project_views(project_id);
CREATE INDEX idx_project_views_user_id ON project_views(user_id);
CREATE INDEX idx_project_views_created_at ON project_views(created_at);
CREATE INDEX idx_project_views_user_project ON project_views(user_id, project_id);

-- Project Interests Indexes
CREATE INDEX idx_project_interests_project_id ON project_interests(project_id);
CREATE INDEX idx_project_interests_user_id ON project_interests(user_id);
CREATE INDEX idx_project_interests_level ON project_interests(interest_level);
CREATE INDEX idx_project_interests_type ON project_interests(interest_type);

-- Project Document Access Indexes
CREATE INDEX idx_project_document_access_project_id ON project_document_access(project_id);
CREATE INDEX idx_project_document_access_user_id ON project_document_access(user_id);
CREATE INDEX idx_project_document_access_document_id ON project_document_access(document_id);

-- Project Inquiries Indexes
CREATE INDEX idx_project_inquiries_project_id ON project_inquiries(project_id);
CREATE INDEX idx_project_inquiries_user_id ON project_inquiries(user_id);
CREATE INDEX idx_project_inquiries_status ON project_inquiries(status);
CREATE INDEX idx_project_inquiries_priority ON project_inquiries(priority_level);

-- Member Engagement Scores Indexes
CREATE INDEX idx_engagement_scores_user_id ON member_engagement_scores(user_id);
CREATE INDEX idx_engagement_scores_project_id ON member_engagement_scores(project_id);
CREATE INDEX idx_engagement_scores_score ON member_engagement_scores(engagement_score);
CREATE INDEX idx_engagement_scores_trend ON member_engagement_scores(engagement_trend);

-- Project Analytics Indexes
CREATE INDEX idx_project_analytics_project_id ON project_analytics(project_id);
CREATE INDEX idx_project_analytics_updated ON project_analytics(last_updated);

-- Notification Indexes
CREATE INDEX idx_project_notifications_project_id ON project_notifications(project_id);
CREATE INDEX idx_project_notifications_user_id ON project_notifications(user_id);
CREATE INDEX idx_project_notifications_status ON project_notifications(status);
CREATE INDEX idx_project_notifications_type ON project_notifications(notification_type);

-- Enhanced Projects Indexes
CREATE INDEX idx_projects_opportunity_type ON projects(opportunity_type);
CREATE INDEX idx_projects_visibility ON projects(visibility_settings);
CREATE INDEX idx_projects_priority ON projects(project_priority);
CREATE INDEX idx_projects_minority_req ON projects(minority_participation_requirement);

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for project engagement summary
CREATE OR REPLACE VIEW project_engagement_summary AS
SELECT 
    p.id as project_id,
    p.title,
    p.status,
    pa.total_views,
    pa.unique_viewers,
    pa.total_document_downloads,
    pa.total_inquiries,
    pa.average_engagement_score,
    pa.expected_bids,
    pa.actual_bids,
    pa.conversion_rate,
    COUNT(pb.id) as current_bids,
    p.deadline,
    CASE 
        WHEN p.deadline < NOW() THEN 'expired'
        WHEN p.deadline < NOW() + INTERVAL '7 days' THEN 'closing_soon'
        ELSE 'active'
    END as deadline_status
FROM projects p
LEFT JOIN project_analytics pa ON p.id = pa.project_id
LEFT JOIN project_bids pb ON p.id = pb.project_id
GROUP BY p.id, p.title, p.status, pa.total_views, pa.unique_viewers, 
         pa.total_document_downloads, pa.total_inquiries, pa.average_engagement_score,
         pa.expected_bids, pa.actual_bids, pa.conversion_rate, p.deadline;

-- View for member engagement overview
CREATE OR REPLACE VIEW member_engagement_overview AS
SELECT 
    u.id as user_id,
    u.first_name,
    u.last_name,
    u.email,
    mp.company_name,
    COUNT(DISTINCT pv.project_id) as projects_viewed,
    COUNT(DISTINCT pi.project_id) as projects_interested,
    COUNT(DISTINCT pb.project_id) as projects_bid,
    AVG(mes.engagement_score) as average_engagement_score,
    MAX(pv.created_at) as last_project_view,
    COUNT(DISTINCT pda.document_id) as documents_downloaded
FROM users u
LEFT JOIN member_profiles mp ON u.id = mp.user_id
LEFT JOIN project_views pv ON u.id = pv.user_id
LEFT JOIN project_interests pi ON u.id = pi.user_id
LEFT JOIN project_bids pb ON u.id = pb.member_id
LEFT JOIN member_engagement_scores mes ON u.id = mes.user_id
LEFT JOIN project_document_access pda ON u.id = pda.user_id
WHERE EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_name = 'member')
GROUP BY u.id, u.first_name, u.last_name, u.email, mp.company_name;

-- =====================================================
-- FUNCTIONS FOR ENGAGEMENT CALCULATION
-- =====================================================

-- Function to calculate engagement score for a user-project combination
CREATE OR REPLACE FUNCTION calculate_engagement_score(
    p_user_id UUID,
    p_project_id UUID
) RETURNS INT AS $$
DECLARE
    view_score INT := 0;
    interaction_score INT := 0;
    document_score INT := 0;
    inquiry_score INT := 0;
    bid_history_score INT := 0;
    total_score INT := 0;
BEGIN
    -- Calculate view score (0-20 points)
    SELECT LEAST(20, COUNT(*) * 2) INTO view_score
    FROM project_views 
    WHERE user_id = p_user_id AND project_id = p_project_id;
    
    -- Calculate interaction score (0-25 points)
    SELECT LEAST(25, COUNT(*) * 5) INTO interaction_score
    FROM project_interests 
    WHERE user_id = p_user_id AND project_id = p_project_id;
    
    -- Calculate document score (0-20 points)
    SELECT LEAST(20, COUNT(*) * 3) INTO document_score
    FROM project_document_access 
    WHERE user_id = p_user_id AND project_id = p_project_id;
    
    -- Calculate inquiry score (0-25 points)
    SELECT LEAST(25, COUNT(*) * 8) INTO inquiry_score
    FROM project_inquiries 
    WHERE user_id = p_user_id AND project_id = p_project_id;
    
    -- Calculate bid history score (0-10 points based on past bidding behavior)
    SELECT LEAST(10, COUNT(*)) INTO bid_history_score
    FROM project_bids pb
    JOIN projects p ON pb.project_id = p.id
    WHERE pb.member_id = p_user_id 
    AND p.created_at >= NOW() - INTERVAL '1 year';
    
    total_score := view_score + interaction_score + document_score + inquiry_score + bid_history_score;
    
    RETURN LEAST(100, total_score);
END;
$$ LANGUAGE plpgsql;

-- Function to update project analytics
CREATE OR REPLACE FUNCTION update_project_analytics(p_project_id UUID) RETURNS VOID AS $$
BEGIN
    INSERT INTO project_analytics (
        project_id,
        total_views,
        unique_viewers,
        total_document_downloads,
        total_inquiries,
        average_engagement_score,
        high_engagement_members,
        medium_engagement_members,
        low_engagement_members,
        actual_bids
    ) 
    SELECT 
        p_project_id,
        COALESCE(view_stats.total_views, 0),
        COALESCE(view_stats.unique_viewers, 0),
        COALESCE(doc_stats.total_downloads, 0),
        COALESCE(inquiry_stats.total_inquiries, 0),
        COALESCE(engagement_stats.avg_score, 0),
        COALESCE(engagement_stats.high_count, 0),
        COALESCE(engagement_stats.medium_count, 0),
        COALESCE(engagement_stats.low_count, 0),
        COALESCE(bid_stats.bid_count, 0)
    FROM (
        SELECT 
            COUNT(*) as total_views,
            COUNT(DISTINCT user_id) as unique_viewers
        FROM project_views 
        WHERE project_id = p_project_id
    ) view_stats
    CROSS JOIN (
        SELECT COUNT(*) as total_downloads
        FROM project_document_access 
        WHERE project_id = p_project_id
    ) doc_stats
    CROSS JOIN (
        SELECT COUNT(*) as total_inquiries
        FROM project_inquiries 
        WHERE project_id = p_project_id
    ) inquiry_stats
    CROSS JOIN (
        SELECT 
            AVG(engagement_score) as avg_score,
            COUNT(CASE WHEN engagement_score >= 70 THEN 1 END) as high_count,
            COUNT(CASE WHEN engagement_score >= 40 AND engagement_score < 70 THEN 1 END) as medium_count,
            COUNT(CASE WHEN engagement_score < 40 THEN 1 END) as low_count
        FROM member_engagement_scores 
        WHERE project_id = p_project_id
    ) engagement_stats
    CROSS JOIN (
        SELECT COUNT(*) as bid_count
        FROM project_bids 
        WHERE project_id = p_project_id
    ) bid_stats
    
    ON CONFLICT (project_id) DO UPDATE SET
        total_views = EXCLUDED.total_views,
        unique_viewers = EXCLUDED.unique_viewers,
        total_document_downloads = EXCLUDED.total_document_downloads,
        total_inquiries = EXCLUDED.total_inquiries,
        average_engagement_score = EXCLUDED.average_engagement_score,
        high_engagement_members = EXCLUDED.high_engagement_members,
        medium_engagement_members = EXCLUDED.medium_engagement_members,
        low_engagement_members = EXCLUDED.low_engagement_members,
        actual_bids = EXCLUDED.actual_bids,
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Trigger to update engagement scores when activities occur
CREATE OR REPLACE FUNCTION trigger_update_engagement_score() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO member_engagement_scores (user_id, project_id, engagement_score)
    VALUES (
        COALESCE(NEW.user_id, NEW.member_id), 
        NEW.project_id, 
        calculate_engagement_score(COALESCE(NEW.user_id, NEW.member_id), NEW.project_id)
    )
    ON CONFLICT (user_id, project_id) DO UPDATE SET
        engagement_score = calculate_engagement_score(EXCLUDED.user_id, EXCLUDED.project_id),
        updated_at = NOW();
    
    -- Update project analytics
    PERFORM update_project_analytics(NEW.project_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to relevant tables
CREATE TRIGGER trigger_project_views_engagement 
    AFTER INSERT ON project_views 
    FOR EACH ROW EXECUTE FUNCTION trigger_update_engagement_score();

CREATE TRIGGER trigger_project_interests_engagement 
    AFTER INSERT ON project_interests 
    FOR EACH ROW EXECUTE FUNCTION trigger_update_engagement_score();

CREATE TRIGGER trigger_project_document_access_engagement 
    AFTER INSERT ON project_document_access 
    FOR EACH ROW EXECUTE FUNCTION trigger_update_engagement_score();

CREATE TRIGGER trigger_project_inquiries_engagement 
    AFTER INSERT ON project_inquiries 
    FOR EACH ROW EXECUTE FUNCTION trigger_update_engagement_score();

CREATE TRIGGER trigger_project_bids_engagement 
    AFTER INSERT ON project_bids 
    FOR EACH ROW EXECUTE FUNCTION trigger_update_engagement_score();

-- =====================================================
-- SAMPLE DATA FOR TESTING (OPTIONAL)
-- =====================================================

-- Insert some sample notification preferences
-- INSERT INTO member_notification_preferences (user_id, project_types, email_notifications, frequency)
-- SELECT id, '["commercial", "industrial"]', true, 'daily'
-- FROM users 
-- WHERE EXISTS (SELECT 1 FROM user_roles WHERE user_id = users.id AND role_name = 'member')
-- LIMIT 5;

COMMENT ON TABLE project_views IS 'Tracks member views and interactions with project opportunities';
COMMENT ON TABLE project_interests IS 'Tracks member interest levels and expressions for projects';
COMMENT ON TABLE project_document_access IS 'Tracks document downloads and access by members';
COMMENT ON TABLE project_inquiries IS 'Tracks member questions and inquiries about projects';
COMMENT ON TABLE member_engagement_scores IS 'Comprehensive member engagement scores per project';
COMMENT ON TABLE project_analytics IS 'Project-specific analytics and metrics';
COMMENT ON TABLE project_notifications IS 'Notification tracking for project communications';
COMMENT ON TABLE member_notification_preferences IS 'Member preferences for project notifications';

-- =====================================================
-- NOTIFICATION SYSTEM TABLES
-- =====================================================

-- Notification types enum
CREATE TYPE notification_type AS ENUM (
    'project_status_change',
    'project_deadline_approaching', 
    'project_overdue',
    'member_engagement_high',
    'member_engagement_low',
    'member_at_risk',
    'project_inquiry_received',
    'milestone_completed',
    'milestone_overdue',
    'assignment_created',
    'assignment_updated',
    'hubspot_sync_completed',
    'hubspot_sync_failed',
    'system_alert',
    'custom'
);

-- Notification channels enum
CREATE TYPE notification_channel AS ENUM (
    'email',
    'sms', 
    'in_app',
    'push',
    'slack',
    'teams'
);

-- Notification status enum
CREATE TYPE notification_status AS ENUM (
    'pending',
    'sent',
    'delivered',
    'failed',
    'cancelled'
);

-- Notification priority enum
CREATE TYPE notification_priority AS ENUM (
    'low',
    'medium',
    'high', 
    'critical'
);

-- Notification templates table
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    type notification_type NOT NULL,
    channel JSONB NOT NULL DEFAULT '[]',
    subject VARCHAR(500) NOT NULL,
    body_template TEXT NOT NULL,
    variables JSONB NOT NULL DEFAULT '[]',
    enabled BOOLEAN DEFAULT true,
    priority notification_priority DEFAULT 'medium',
    conditions JSONB DEFAULT '[]',
    scheduling JSONB DEFAULT '{"immediate": true}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification recipients table
CREATE TABLE notification_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    name VARCHAR(200) NOT NULL,
    role VARCHAR(100) NOT NULL,
    preferences JSONB DEFAULT '{}',
    subscriptions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification instances table
CREATE TABLE notification_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES notification_templates(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES notification_recipients(id) ON DELETE CASCADE,
    channel notification_channel NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    status notification_status DEFAULT 'pending',
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default notification templates
INSERT INTO notification_templates (name, type, channel, subject, body_template, variables, priority) VALUES
('Project Status Changed', 'project_status_change', '["email", "in_app"]', 
 'Project Status Update: {{projectTitle}}', 
 'Hello {{recipientName}},\n\nProject "{{projectTitle}}" status has been changed from {{fromStatus}} to {{toStatus}}.\n\nReason: {{reason}}\n\nBest regards,\nNAMC NorCal Team',
 '["recipientName", "projectTitle", "fromStatus", "toStatus", "reason"]', 'medium'),

('Project Deadline Approaching', 'project_deadline_approaching', '["email", "in_app"]',
 'Project Deadline Alert: {{projectTitle}}',
 'Hello {{recipientName}},\n\nProject "{{projectTitle}}" deadline is approaching in {{daysUntilDeadline}} days.\n\nPlease ensure all requirements are met before the deadline.\n\nBest regards,\nNAMC NorCal Team', 
 '["recipientName", "projectTitle", "daysUntilDeadline"]', 'high'),

('Member High Engagement', 'member_engagement_high', '["email"]',
 'High Member Engagement Alert',
 'Hello Admin,\n\nMember {{memberName}} ({{memberCompany}}) has shown high engagement with score {{engagementScore}}.\n\nConsider reaching out for potential opportunities.\n\nBest regards,\nSystem',
 '["memberName", "memberCompany", "engagementScore"]', 'medium'),

('Project Inquiry Received', 'project_inquiry_received', '["email", "in_app"]',
 'New Project Inquiry: {{projectTitle}}',
 'Hello Admin,\n\nNew inquiry received for project "{{projectTitle}}" from {{memberName}} ({{memberCompany}}).\n\nInquiry type: {{inquiryType}}\n\nPlease follow up promptly.\n\nBest regards,\nSystem',
 '["projectTitle", "memberName", "memberCompany", "inquiryType"]', 'high'),

('HubSpot Sync Failed', 'hubspot_sync_failed', '["email"]',
 'HubSpot Sync Failed',
 'Hello Admin,\n\nHubSpot sync operation failed for {{syncType}}.\n\nError: {{error}}\n\nPlease check the integration settings.\n\nBest regards,\nSystem',
 '["syncType", "error"]', 'critical');

-- Notification system indexes
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_user ON notification_recipients(user_id);  
CREATE INDEX IF NOT EXISTS idx_notification_instances_status ON notification_instances(status);
CREATE INDEX IF NOT EXISTS idx_notification_instances_scheduled ON notification_instances(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notification_instances_template ON notification_instances(template_id);

-- Schema version tracking
INSERT INTO system_logs (action, entity_type, metadata) 
VALUES ('schema_update', 'database', '{"version": "project_engagement_v1.1", "description": "Added comprehensive project engagement tracking and notification system"}');