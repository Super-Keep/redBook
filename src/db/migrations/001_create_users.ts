/**
 * Migration 001: Create Users Table
 *
 * Creates the users table for storing user account information.
 * Platform credentials are stored as JSONB for flexible platform auth data.
 * All timestamps use UTC timezone.
 */

import type { Migration } from './types.js';

const migration: Migration = {
  name: '001_create_users',

  up: `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      platform_credentials JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_users_email ON users (email);
  `,

  down: `
    DROP TABLE IF EXISTS users CASCADE;
  `,
};

export default migration;
