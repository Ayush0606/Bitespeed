/**
 * Error Handling Middleware
 * 
 * Provides centralized error handling for the Express application
 * Handles validation errors, database errors, and unexpected exceptions
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Custom error class for application-level errors
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Async error wrapper to catch errors in async route handlers
 * Prevents unhandled promise rejections
 * 
 * @param fn - Express route handler function
 * @returns Wrapped function that catches errors
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Main error handling middleware
 * Must be registered as the last middleware in Express
 * 
 * @param error - Error object
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('[Error]', {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    method: req.method,
    path: req.path,
  });

  // Check if it's a custom AppError
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.message,
      statusCode: error.statusCode,
    });
    return;
  }

  // Handle Prisma errors
  if (error.name === 'PrismaClientValidationError') {
    res.status(400).json({
      error: 'Invalid request data',
      statusCode: 400,
    });
    return;
  }

  if (error.name === 'PrismaClientKnownRequestError') {
    res.status(400).json({
      error: 'Database operation failed',
      statusCode: 400,
    });
    return;
  }

  // Default error response
  const statusCode = (error as any).statusCode || 500;
  const message =
    process.env.NODE_ENV === 'development'
      ? error.message
      : 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    statusCode,
  });
};

/**
 * 404 Not Found middleware
 * Should be registered after all route handlers
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
    statusCode: 404,
  });
};
