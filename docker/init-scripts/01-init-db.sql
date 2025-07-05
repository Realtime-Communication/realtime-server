-- ==============================================================================
-- PostgreSQL Database Initialization Script
-- NestJS Realtime Server
-- ==============================================================================

-- Enable required extensions for the application
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Set timezone to UTC
SET timezone = 'UTC';

-- Performance optimizations
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.max = 10000;
ALTER SYSTEM SET pg_stat_statements.track = 'all';

-- Connection and memory settings
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- Work memory for sorts and hashes
ALTER SYSTEM SET work_mem = '4MB';

-- Log settings for debugging and monitoring
ALTER SYSTEM SET log_statement = 'mod';
ALTER SYSTEM SET log_duration = 'on';
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_line_prefix = '%t [%p-%l] %q%u@%d ';
ALTER SYSTEM SET log_checkpoints = 'on';
ALTER SYSTEM SET log_connections = 'on';
ALTER SYSTEM SET log_disconnections = 'on';
ALTER SYSTEM SET log_lock_waits = 'on';

-- Background writer settings
ALTER SYSTEM SET bgwriter_delay = 200;
ALTER SYSTEM SET bgwriter_lru_maxpages = 100;
ALTER SYSTEM SET bgwriter_lru_multiplier = 2.0;

-- Auto vacuum settings
ALTER SYSTEM SET autovacuum = 'on';
ALTER SYSTEM SET autovacuum_max_workers = 3;
ALTER SYSTEM SET autovacuum_naptime = 60;

-- Reload configuration to apply changes
SELECT pg_reload_conf();

-- Create a schema for the application (optional)
-- CREATE SCHEMA IF NOT EXISTS chat_app;

-- Create a dedicated user for the application (optional)
-- This is commented out as we use the main admin user in Docker
-- CREATE USER chat_app_user WITH PASSWORD 'secure_password';
-- GRANT CONNECT ON DATABASE nestjs_chat_db TO chat_app_user;
-- GRANT USAGE ON SCHEMA public TO chat_app_user;
-- GRANT CREATE ON SCHEMA public TO chat_app_user;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO chat_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO chat_app_user;

-- Create indexes for common query patterns (these will be created by Prisma migrations)
-- This is just a placeholder for any custom indexes you might need

-- Example: Create index for user lookups by email
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);

-- Example: Create index for message timestamps
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Example: Create index for conversation participants
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_participants ON conversation_participants(conversation_id, user_id);

-- Vacuum and analyze to update statistics
VACUUM ANALYZE; 
