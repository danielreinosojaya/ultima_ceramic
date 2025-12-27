-- Migration: Create auth_events table for audit logging
-- Date: 2025-12-08
-- Purpose: Track all authentication events (login, logout, recovery, failures)

CREATE TABLE IF NOT EXISTS auth_events (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- login_success, login_failed, logout, refresh, recovery_request, recovery_verify
    ip_address VARCHAR(50),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}', -- Additional context (e.g., reason, bookingId, error details)
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_auth_events_email ON auth_events(email);
CREATE INDEX idx_auth_events_event_type ON auth_events(event_type);
CREATE INDEX idx_auth_events_created_at ON auth_events(created_at DESC);
CREATE INDEX idx_auth_events_email_created ON auth_events(email, created_at DESC);

-- Comments
COMMENT ON TABLE auth_events IS 'Audit log for all authentication events';
COMMENT ON COLUMN auth_events.event_type IS 'Type of auth event: login_success, login_failed, logout, refresh, recovery_request, recovery_verify';
COMMENT ON COLUMN auth_events.metadata IS 'Additional context as JSON (e.g., {"reason": "rate_limited", "bookingId": "123"})';
