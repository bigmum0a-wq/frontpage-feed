// Centralized API Error Handling Middleware
import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  logger.error(`[${req.method}] ${req.originalUrl} - ${err.message}`);

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      message: err.message || 'Une erreur interne est survenue',
      status: statusCode,
    },
  });
}
