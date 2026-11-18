import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import mongoose from 'mongoose';
import { createHash, randomBytes } from 'node:crypto';
import nodemailer from 'nodemailer';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { hashPassword, issueSession, requireUser, verifyPassword } from './auth.js';
import { Session, StoredFile, User, Workspace } from './models.js';

const app = express();
const googleAuthClient = new OAuth2Client();
const maxFileSizeMb = Number(process.env.MAX_UPLOAD_SIZE_MB || 100);
if (!Number.isSafeInteger(maxFileSizeMb) || maxFileSizeMb < 1 || maxFileSizeMb > 1024) {
  throw new Error('MAX_UPLOAD_SIZE_MB must be a whole number between 1 and 1024.');
}
const maxFileSize = maxFileSizeMb * 1024 * 1024;

app.use(express.json({ limit: '100kb' }));

const asyncRoute = (handler) => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.post('/api/auth/register', asyncRoute(async (request, response) => {
  const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const password = typeof request.body.password === 'string' ? request.body.password : '';
  const name = typeof request.body.name === 'string' ? request.body.name.trim() : '';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    response.status(400).json({ error: 'Enter a valid email address.' });
    return;
  }
  if (!name || name.length > 80) {
    response.status(400).json({ error: 'Enter your full name using no more than 80 characters.' });
    return;
  }
  if (password.length < 8 || password.length > 128) {
    response.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
    return;
  }

  const existingUser = await User.findOne({ email }).select('_id');
  if (existingUser) {
    response.status(409).json({ error: 'An account with this email already exists. Sign in instead.' });
    return;
  }

  const user = await User.create({ email, name, passwordHash: await hashPassword(password) });
  await Workspace.create({ user: user._id });
  response.status(201).json(await issueSession(user, request.body.remember !== false));
}));

app.post('/api/auth/login', asyncRoute(async (request, response) => {
  const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const password = typeof request.body.password === 'string' ? request.body.password : '';
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    response.status(401).json({ error: 'Email or password is incorrect.' });
    return;
  }
  response.json(await issueSession(user, request.body.remember !== false));
}));

app.get('/api/auth/me', requireUser, (request, response) => {
  response.json({
    user: {
      id: request.user.id,
      email: request.user.email,
      name: request.user.name,
      avatarUrl: request.user.avatarUrl || '',
    },
  });
});

app.post('/api/auth/logout', requireUser, asyncRoute(async (request, response) => {
  await Session.deleteOne({ _id: request.authSessionId, user: request.user._id });
  response.status(204).end();
}));

app.post('/api/auth/forgot-password', asyncRoute(async (request, response) => {
  const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    response.status(400).json({ error: 'Enter a valid email address.' });
    return;
  }

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASSWORD,
    SMTP_FROM,
    CLIENT_URL,
  } = process.env;
  const port = Number(SMTP_PORT);
  if (!SMTP_HOST || !Number.isSafeInteger(port) || port < 1 || port > 65535
    || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM || !CLIENT_URL) {
    response.status(503).json({
      error: 'Password reset email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, and CLIENT_URL in server/.env.',
    });
    return;
  }

  let resetUrl;
  try {
    resetUrl = new URL('/reset-password', CLIENT_URL);
    if (!['http:', 'https:'].includes(resetUrl.protocol)) throw new Error('Unsupported client URL protocol.');
  } catch {
    response.status(503).json({ error: 'CLIENT_URL must be a valid http or https URL in server/.env.' });
    return;
  }

  const user = await User.findOne({ email }).select('_id name email');
  if (user) {
    const resetToken = randomBytes(32).toString('base64url');
    const resetTokenHash = createHash('sha256').update(resetToken).digest('hex');
    const passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await User.updateOne(
      { _id: user._id },
      { $set: { passwordResetTokenHash: resetTokenHash, passwordResetExpiresAt } },
    );

    resetUrl.searchParams.set('token', resetToken);
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    });
    try {
      await transporter.sendMail({
        from: SMTP_FROM,
        to: user.email,
        subject: 'Reset your Lifeof Hub password',
        text: `Hello ${user.name},\n\nUse the link below to reset your password. This link expires in one hour and can only be used once:\n\n${resetUrl.toString()}\n\nIf you did not request this, you can ignore this email.`,
      });
    } catch (error) {
      await User.updateOne(
        { _id: user._id, passwordResetTokenHash: resetTokenHash },
        { $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 } },
      );
      console.error('Unable to send a password reset email:', error.code || error.name || 'smtp_error');
      response.status(503).json({ error: 'The reset email could not be sent. Check the SMTP settings in server/.env and try again.' });
      return;
    }
  }

  response.json({ message: 'If an account exists for this address, a password reset email has been sent.' });
}));

app.post('/api/auth/reset-password', asyncRoute(async (request, response) => {
  const token = typeof request.body.token === 'string' ? request.body.token : '';
  const password = typeof request.body.password === 'string' ? request.body.password : '';
  if (password.length < 8 || password.length > 128) {
    response.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
    return;
  }
  if (!token) {
    response.status(400).json({ error: 'This password reset link is invalid or expired. Request a new reset email.' });
    return;
  }

  const passwordResetTokenHash = createHash('sha256').update(token).digest('hex');
  const resetUser = await User.findOne({
    passwordResetTokenHash,
    passwordResetExpiresAt: { $gt: new Date() },
  }).select('_id');
  if (!resetUser) {
    response.status(400).json({ error: 'This password reset link is invalid or expired. Request a new reset email.' });
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await User.findOneAndUpdate(
    {
      _id: resetUser._id,
      passwordResetTokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    },
    {
      $set: { passwordHash },
      $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 },
    },
    { new: false },
  ).select('_id');
  if (!user) {
    response.status(400).json({ error: 'This password reset link is invalid or expired. Request a new reset email.' });
    return;
  }
  await Session.deleteMany({ user: resetUser._id });
  response.json({ message: 'Your password has been updated. Sign in with your new password.' });
}));

app.post('/api/auth/google', asyncRoute(async (request, response) => {
  const credential = typeof request.body.credential === 'string' ? request.body.credential : '';
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    response.status(503).json({ error: 'Google sign-in is not configured for this workspace.' });
    return;
  }
  if (!credential) {
    response.status(400).json({ error: 'Google did not return a sign-in credential.' });
    return;
  }

  let identity;
  try {
    const ticket = await googleAuthClient.verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload
      || !['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)
      || !payload.sub
      || !payload.email
      || payload.email_verified !== true) {
      response.status(401).json({ error: 'Google account verification failed. Use a verified Google account and try again.' });
      return;
    }
    identity = payload;
  } catch (error) {
    const errorCode = error.code || error.cause?.code;
    console.warn('Google ID token verification failed:', errorCode || error.name || 'verification_error');
    const verifierUnavailable = ['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN', 'ECONNREFUSED'].includes(errorCode);
    response.status(verifierUnavailable ? 503 : 401).json({
      error: verifierUnavailable
        ? 'Google verification is temporarily unavailable. Please try again.'
        : 'Google could not verify this sign-in. The credential may be invalid or expired.',
    });
    return;
  }

  let user = await User.findOne({ googleSubject: identity.sub });
  if (!user) {
    user = await User.findOne({ email: identity.email.toLowerCase() });
    if (user) {
      user.googleSubject = identity.sub;
      await user.save();
    } else {
      user = await User.create({
        email: identity.email.toLowerCase(),
        name: typeof identity.name === 'string' ? identity.name.slice(0, 80) : identity.email.split('@')[0],
        avatarUrl: typeof identity.picture === 'string' && identity.picture.startsWith('https://') ? identity.picture.slice(0, 2048) : '',
        googleSubject: identity.sub,
      });
      await Workspace.create({ user: user._id });
    }
  }
  if (typeof identity.picture === 'string' && identity.picture.startsWith('https://') && !user.avatarUrl) {
    user.avatarUrl = identity.picture.slice(0, 2048);
    await user.save();
  }
  response.json(await issueSession(user, request.body.remember !== false));
}));

app.get('/api/workspace', requireUser, asyncRoute(async (request, response) => {
  const workspace = await Workspace.findOne({ user: request.user._id }).lean();
  response.json({
    notes: workspace?.notes || [],
    folders: workspace?.folders || [],
    tasks: workspace?.tasks || [],
    activity: workspace?.activity || [],
  });
}));

app.put('/api/workspace', requireUser, asyncRoute(async (request, response) => {
  const { notes, folders, tasks, activity } = request.body || {};
  const validArrays = [notes, folders, tasks, activity].every(Array.isArray);
  if (!validArrays || [notes, folders, tasks, activity].some((items) => items.length > 1000)) {
    response.status(400).json({ error: 'Workspace data must contain valid arrays with no more than 1,000 items each.' });
    return;
  }

  const workspace = await Workspace.findOneAndUpdate(
    { user: request.user._id },
    { $set: { notes, folders, tasks, activity } },
    { new: true, upsert: true, runValidators: true },
  ).lean();
  response.json({
    notes: workspace.notes,
    folders: workspace.folders,
    tasks: workspace.tasks,
    activity: workspace.activity,
  });
}));

app.get('/api/files/config', requireUser, (_request, response) => {
  response.json({ maxUploadSizeMb });
});

app.post('/api/files', requireUser, asyncRoute(async (request, response) => {
  const encodedName = request.get('x-file-name') || '';
  let name;
  try {
    name = decodeURIComponent(encodedName).trim();
  } catch {
    response.status(400).json({ error: 'The file name is invalid.' });
    return;
  }
  if (!name || name.length > 255 || /[/\\\u0000-\u001f]/.test(name)) {
    response.status(400).json({ error: 'The file name must be 1–255 characters and cannot contain path characters.' });
    return;
  }

  const contentLength = Number(request.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxFileSize) {
    response.status(413).json({ error: `Files must be ${maxFileSizeMb} MB or smaller.` });
    return;
  }

  const contentType = request.get('x-file-type') || 'application/octet-stream';
  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploadedFiles' });
  const uploadStream = bucket.openUploadStream(name, {
    metadata: {
      userId: request.user.id,
      contentType: contentType.slice(0, 150),
    },
  });
  let size = 0;
  let exceedsLimit = false;
  const sizeLimit = new Transform({
    transform(chunk, _encoding, callback) {
      size += chunk.length;
      if (size > maxFileSize) {
        exceedsLimit = true;
        callback();
        return;
      }
      if (exceedsLimit) {
        callback();
        return;
      }
      callback(null, chunk);
    },
  });

  try {
    await pipeline(request, sizeLimit, uploadStream);
  } catch (error) {
    try {
      await uploadStream.abort();
    } catch (abortError) {
      console.error('Unable to clean up an incomplete file upload:', abortError);
    }
    throw error;
  }
  if (exceedsLimit) {
    await bucket.delete(uploadStream.id);
    response.status(413).json({ error: `Files must be ${maxFileSizeMb} MB or smaller.` });
    return;
  }
  if (size === 0) {
    await bucket.delete(uploadStream.id);
    response.status(400).json({ error: 'Choose a non-empty file to upload.' });
    return;
  }

  let storedFile;
  try {
    storedFile = await StoredFile.create({
      user: request.user._id,
      name,
      contentType: contentType.slice(0, 150),
      size,
      gridFsId: uploadStream.id,
    });
  } catch (error) {
    await bucket.delete(uploadStream.id);
    throw error;
  }
  response.status(201).json({
    id: storedFile.id,
    name: storedFile.name,
    size: storedFile.size,
    type: storedFile.contentType,
    savedAt: storedFile.createdAt.toISOString(),
    storage: 'mongodb',
  });
}));

app.get('/api/files/:fileId', requireUser, asyncRoute(async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.fileId)) {
    response.status(400).json({ error: 'The file ID is invalid.' });
    return;
  }

  const storedFile = await StoredFile.findOne({
    _id: request.params.fileId,
    user: request.user._id,
  }).select('+data');
  if (!storedFile || (!storedFile.gridFsId && !storedFile.data)) {
    response.status(404).json({ error: 'The original file could not be found.' });
    return;
  }

  response.set({
    'Content-Type': storedFile.contentType,
    'Content-Length': storedFile.size,
    'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(storedFile.name)}`,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
  });
  if (storedFile.gridFsId) {
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploadedFiles' });
    await pipeline(bucket.openDownloadStream(storedFile.gridFsId), response);
    return;
  }
  response.send(storedFile.data);
}));

app.delete('/api/files/:fileId', requireUser, asyncRoute(async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.fileId)) {
    response.status(400).json({ error: 'The file ID is invalid.' });
    return;
  }
  const storedFile = await StoredFile.findOne({ _id: request.params.fileId, user: request.user._id });
  if (!storedFile) {
    response.status(204).end();
    return;
  }
  if (storedFile.gridFsId) {
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploadedFiles' });
    await bucket.delete(storedFile.gridFsId);
  }
  await StoredFile.deleteOne({ _id: storedFile._id, user: request.user._id });
  response.status(204).end();
}));

app.use((error, _request, response, _next) => {
  console.error('API request failed:', error);
  if (error.code === 11000) {
    response.status(409).json({ error: 'An account with this email already exists. Sign in instead.' });
    return;
  }
  response.status(500).json({ error: 'The request could not be completed. Please try again.' });
});

export default app;
