/**
 * Application Constants
 * Centralized configuration values
 */

export const APP_CONFIG = {
  // Server
  DEFAULT_PORT: 3000,
  REQUEST_TIMEOUT: 30000, // 30 seconds

  // Database
  PRISMA_LOG_LEVEL: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],

  // Response
  SUCCESS_STATUS: 200,
  BAD_REQUEST_STATUS: 400,
  SERVER_ERROR_STATUS: 500,

  // Constants
  CONTACT_PRECEDENCE: {
    PRIMARY: 'primary',
    SECONDARY: 'secondary',
  } as const,

  // Error messages
  ERRORS: {
    MISSING_EMAIL_AND_PHONE: 'Either email or phoneNumber must be provided',
    DATABASE_ERROR: 'Database operation failed',
    INVALID_REQUEST: 'Invalid request data',
    INTERNAL_SERVER_ERROR: 'Internal Server Error',
    ROUTE_NOT_FOUND: (method: string, path: string) =>
      `Route ${method} ${path} not found`,
  },
} as const;

export type ContactPrecedence = typeof APP_CONFIG.CONTACT_PRECEDENCE[keyof typeof APP_CONFIG.CONTACT_PRECEDENCE];
