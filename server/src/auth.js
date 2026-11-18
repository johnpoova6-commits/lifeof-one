import { createHmac, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Session, User } from './models.js';

const scrypt = promisify(scryptCallback);

function createToken(userId, tokenId, expiresAt) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required to issue authentication tokens.');

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    jti: tokenId,
    exp: Math.floor(expiresAt.getTime() / 1000),
  })).toString('base64url');
  const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required to verify authentication tokens.');

  const [encodedHeader, encodedPayload, signature] = token.split('.');
  if (!encodedHeader || !encodedPayload || !signature) return null;
  const expected = createHmac('sha256', secret).update(`${encodedHeader}.${encodedPayload}`).digest();
  let actual;
  try {
    actual = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'));
    const claims = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (header.alg !== 'HS256'
      || typeof claims.sub !== 'string'
      || typeof claims.jti !== 'string'
      || typeof claims.exp !== 'number'
      || claims.exp <= Date.now() / 1000) return null;
    return claims;
  } catch {
    return null;
  }
}

export async function issueSession(user, remember = true) {
  const tokenId = randomUUID();
  const expiresAt = new Date(Date.now() + (remember ? 30 : 1) * 24 * 60 * 60 * 1000);
  await Session.create({ user: user._id, tokenId, expiresAt });
  return {
    token: createToken(user.id, tokenId, expiresAt),
    expiresAt: expiresAt.toISOString(),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl || '',
    },
  };
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${Buffer.from(derived).toString('base64url')}`;
}

export async function verifyPassword(password, passwordHash) {
  const [salt, stored] = passwordHash.split(':');
  if (!salt || !stored) return false;
  const expected = Buffer.from(stored, 'base64url');
  const derived = Buffer.from(await scrypt(password, salt, expected.length));
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export async function requireUser(request, response, next) {
  const authorization = request.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const claims = token ? verifyToken(token) : null;
  if (!claims) {
    response.status(401).json({ error: 'Your session is missing or expired. Please sign in again.' });
    return;
  }

  try {
    const activeSession = await Session.findOne({
      tokenId: claims.jti,
      user: claims.sub,
      expiresAt: { $gt: new Date() },
    }).select('_id');
    if (!activeSession) {
      response.status(401).json({ error: 'Your session has ended. Please sign in again.' });
      return;
    }

    const user = await User.findById(claims.sub).select('_id email name avatarUrl');
    if (!user) {
      response.status(401).json({ error: 'This account could not be found. Please sign in again.' });
      return;
    }
    request.user = user;
    request.authSessionId = activeSession._id;
    next();
  } catch (error) {
    next(error);
  }
}
