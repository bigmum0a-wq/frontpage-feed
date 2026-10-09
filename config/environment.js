// Environment Configuration
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  HOST: process.env.HOST || '127.0.0.1',
  DB_PATH: process.env.DB_PATH || path.join(rootDir, 'database', 'frontpage.db'),
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  CACHE_TTL_MINUTES: parseInt(process.env.CACHE_TTL_MINUTES || '15', 10),
  FEED_FETCH_TIMEOUT_MS: parseInt(process.env.FEED_FETCH_TIMEOUT_MS || '10000', 10),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  SESSION_SECRET: process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'frontpage-dev-secret-change-in-production-2026'),
};

if (env.NODE_ENV === 'production' && !env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is required in production environment.');
}

