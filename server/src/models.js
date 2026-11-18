import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  avatarUrl: { type: String, maxlength: 2048 },
  passwordHash: { type: String, select: false },
  googleSubject: { type: String, unique: true, sparse: true, select: false },
  passwordResetTokenHash: { type: String, select: false },
  passwordResetExpiresAt: { type: Date, select: false },
}, { timestamps: true });

const sessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenId: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

const workspaceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  notes: { type: [mongoose.Schema.Types.Mixed], default: [] },
  folders: { type: [mongoose.Schema.Types.Mixed], default: [] },
  tasks: { type: [mongoose.Schema.Types.Mixed], default: [] },
  activity: { type: [String], default: [] },
}, { timestamps: true });

const storedFileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, maxlength: 255 },
  contentType: { type: String, required: true, maxlength: 150 },
  size: { type: Number, required: true, min: 0 },
  data: { type: Buffer, select: false },
  gridFsId: { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);
export const Workspace = mongoose.models.Workspace || mongoose.model('Workspace', workspaceSchema);
export const StoredFile = mongoose.models.StoredFile || mongoose.model('StoredFile', storedFileSchema);
