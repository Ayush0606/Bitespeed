/**
 * Express Server Setup and Configuration
 * 
 * Initializes the Express application with:
 * - Middleware configuration
 * - Route setup
 * - Error handling
 * - Server startup
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import { identifyController } from './controllers/identifyController';
import { errorHandler, notFoundHandler, asyncHandler } from './middleware/errorHandler';

export const createServer = (): Express => {
  const app = express();

  // ==================== Middleware ====================

  // Body parsing middleware - handles JSON requests
  app.use(express.json());

  // Custom middleware to log requests (development only)
  if (process.env.NODE_ENV === 'development') {
    app.use((req: Request, _res: Response, next: NextFunction) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });
  }

  // ==================== Routes ====================

  /**
   * Health check endpoint
   * Useful for load balancers and monitoring
   */
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Identity reconciliation endpoint
   * POST /identify
   * 
   * Request body:
   * {
   *   "email"?: string,
   *   "phoneNumber"?: string
   * }
   * 
   * Response:
   * {
   *   "contact": {
   *     "primaryContactId": number,
   *     "emails": string[],
   *     "phoneNumbers": string[],
   *     "secondaryContactIds": number[]
   *   }
   * }
   */
  app.post('/identify', asyncHandler((req: Request, res: Response) => identifyController.identify(req, res)));

  // ==================== Error Handling ====================

  // 404 handler - must be before error handler
  app.use(notFoundHandler);

  // Error handling middleware - must be last
  app.use(errorHandler);

  return app;
};

/**
 * Start the server
 * 
 * @param port - Port number to listen on
 * @returns Promise that resolves when server is listening
 */
export const startServer = async (port: number): Promise<void> => {
  const app = createServer();

  return new Promise((resolve) => {
    app.listen(port, () => {
      console.log(`[${new Date().toISOString()}] Server started on port ${port}`);
      console.log(`[${new Date().toISOString()}] Environment: ${process.env.NODE_ENV}`);
      console.log(`[${new Date().toISOString()}] POST /identify - Identity reconciliation endpoint`);
      console.log(`[${new Date().toISOString()}] GET /health - Health check endpoint`);
      resolve();
    });
  });
};
