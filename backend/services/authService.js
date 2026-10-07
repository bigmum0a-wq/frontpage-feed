// backend/services/authService.js
import crypto from 'node:crypto';
import { env } from '../../config/environment.js';

const SCRIPT_KEY_LEN = 64;
const TOKEN_SECRET = env.SESSION_SECRET || 'frontpage-secure-auth-secret-key-2026';

// Set of explicitly revoked tokens
const revokedTokens = new Set();

/**
 * Hashes a plaintext password using crypto.scrypt with a random salt
 * Format: salt:hash
 */
export async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, SCRIPT_KEY_LEN, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verifies a plaintext password against a stored salt:hash string
 */
export async function verifyPassword(password, storedHash) {
  return new Promise((resolve, reject) => {
    if (!storedHash || !storedHash.includes(':')) {
      return resolve(false);
    }
    const [salt, key] = storedHash.split(':');
    crypto.scrypt(password, salt, SCRIPT_KEY_LEN, (err, derivedKey) => {
      if (err) return reject(err);
      const keyBuffer = Buffer.from(key, 'hex');
      const match = crypto.timingSafeEqual(keyBuffer, derivedKey);
      resolve(match);
    });
  });
}

/**
 * Generates a signed session token for a user
 */
export function createSessionToken(userId) {
  const tokenBytes = crypto.randomBytes(24).toString('hex');
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const payload = `${userId}.${tokenBytes}.${expiresAt}`;
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  const fullToken = `${payload}.${signature}`;

  return { token: fullToken, expiresAt };
}

/**
 * Validates a session token and returns userId if valid
 */
export function validateSessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  if (revokedTokens.has(token)) return null;

  const parts = token.split('.');
  if (parts.length !== 4) return null;

  const [userId, tokenBytes, expiresAtStr, signature] = parts;
  const expiresAt = parseInt(expiresAtStr, 10);

  if (Date.now() > expiresAt) {
    revokedTokens.add(token);
    return null;
  }

  const payload = `${userId}.${tokenBytes}.${expiresAtStr}`;
  const expectedSignature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');

  const sigBuffer = Buffer.from(signature, 'hex');
  const expBuffer = Buffer.from(expectedSignature, 'hex');

  if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    return null;
  }

  return userId;
}

/**
 * Invalidates a session token
 */
export function invalidateSessionToken(token) {
  if (token) {
    revokedTokens.add(token);
  }
}
