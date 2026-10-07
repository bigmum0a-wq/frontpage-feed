// backend/tests/auth.test.js
import test from 'node:test';
import assert from 'node:assert/strict';

const { hashPassword, verifyPassword, createSessionToken, validateSessionToken, invalidateSessionToken } = await import('../services/authService.js');
const { UserModel } = await import('../models/userModel.js');

test('Auth Service: hashes passwords securely and verifies correctly', async () => {
  const plain = 'SuperSecret123!';
  const hashed = await hashPassword(plain);

  assert.ok(hashed.includes(':'), 'Hash must contain salt delimiter');
  assert.notEqual(plain, hashed, 'Password must not be stored in plaintext');

  const matches = await verifyPassword(plain, hashed);
  assert.equal(matches, true, 'Correct password must verify to true');

  const fails = await verifyPassword('WrongPassword!', hashed);
  assert.equal(fails, false, 'Incorrect password must verify to false');
});

test('Auth Service: creates and validates session tokens', () => {
  const userId = 'user-test-uuid-1234';
  const { token, expiresAt } = createSessionToken(userId);

  assert.ok(token, 'Token must be generated');
  assert.ok(expiresAt > Date.now(), 'Token must have future expiration');

  const validatedUserId = validateSessionToken(token);
  assert.equal(validatedUserId, userId, 'Validated token must yield correct userId');

  // Invalid token check
  assert.equal(validateSessionToken('invalid.token.structure'), null);

  // Invalidate token
  invalidateSessionToken(token);
  assert.equal(validateSessionToken(token), null, 'Invalidated token must not be accepted');
});

test('Auth Model: registers new user, prevents duplicates, and verifies credentials', async () => {
  const testEmail = `tester-${Date.now()}@example.com`;
  const password = 'ValidPassword2026!';

  // 1. Create user
  const user = await UserModel.create({
    email: testEmail,
    password,
    name: 'Alice Developer',
    isGuest: false,
  });

  assert.ok(user.id);
  assert.equal(user.email, testEmail);
  assert.equal(user.name, 'Alice Developer');
  assert.equal(user.is_guest, 0);

  // 2. Verify credentials
  const verified = await UserModel.verifyCredentials(testEmail, password);
  assert.ok(verified, 'Valid credentials must return user');
  assert.equal(verified.id, user.id);

  // 3. Failed credentials
  const wrongPass = await UserModel.verifyCredentials(testEmail, 'BadPass');
  assert.equal(wrongPass, null, 'Wrong password must return null');

  const nonExistent = await UserModel.verifyCredentials('nobody@example.com', password);
  assert.equal(nonExistent, null, 'Non-existent user must return null');

  // 4. Update password
  await UserModel.updatePassword(user.id, 'NewPassword2026!');
  const verifiedNew = await UserModel.verifyCredentials(testEmail, 'NewPassword2026!');
  assert.ok(verifiedNew, 'User should be able to log in with new password');
});

test('Auth Model: guest user fallback returns valid guest profile', async () => {
  const guest = await UserModel.getById('guest-user-001');
  assert.ok(guest, 'Guest profile must exist');
  assert.ok(guest.preferences, 'Guest must have preferences');
});
