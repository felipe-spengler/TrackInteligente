-- Database Schema for Meta Conversions API WhatsApp Attribution

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS leads_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ref_code VARCHAR(10) UNIQUE NOT NULL,
    fbclid TEXT,
    fbp TEXT,
    fbc TEXT,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    phone_number VARCHAR(30),
    status VARCHAR(30) NOT NULL DEFAULT 'initiated',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index ref_code for fast lookup by WhatsApp keyword
CREATE INDEX IF NOT EXISTS idx_leads_tracking_ref_code ON leads_tracking(ref_code);
