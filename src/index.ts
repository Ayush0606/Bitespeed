/**
 * Application Entry Point
 * 
 * Loads environment variables and starts the server
 */

import 'dotenv/config';
import { startServer } from './server';

const PORT = parseInt(process.env.PORT || '3000', 10);

/**
 * Bootstrap application
 */
(async () => {
  try {
    // Validate required environment variables
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Start the server
    await startServer(PORT);
  } catch (error) {
    console.error('[Fatal Error]', error);
    process.exit(1);
  }
})();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SIGTERM] Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[SIGINT] Shutting down gracefully...');
  process.exit(0);
});
