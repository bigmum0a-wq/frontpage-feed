// Server Entry Point
import app from './app.js';
import { env } from '../config/environment.js';
import { getDatabase } from '../config/database.js';
import { logger } from './utils/logger.js';

import { startFeedScheduler, stopFeedScheduler } from './services/schedulerService.js';

async function startServer() {
  try {
    // 1. Initialize Database connection & schema
    await getDatabase();
    logger.info(`Database connected (${env.DB_PATH})`);

    // 2. Start HTTP Server
    const server = app.listen(env.PORT, env.HOST, () => {
      logger.info(`FrontPage server started on http://${env.HOST}:${env.PORT}`);
    });

    // 3. Start Background Feed Scheduler
    startFeedScheduler(env.CACHE_TTL_MINUTES);

    // Graceful Shutdown
    const shutdown = () => {
      logger.info('Shutting down server...');
      stopFeedScheduler();
      server.close(() => {
        logger.info('Server shut down gracefully.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    logger.error('Critical server startup failure:', error);
    process.exit(1);
  }
}

startServer();