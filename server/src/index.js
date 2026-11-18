import mongoose from 'mongoose';
import app from './app.js';

const { MONGODB_URI, PORT = 5000, JWT_SECRET } = process.env;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is required. Copy .env.example to .env and configure MongoDB.');
}
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters. Configure it in server/.env.');
}

try {
  await mongoose.connect(MONGODB_URI);
  app.listen(PORT, () => {
    console.log(`Lifeof Hub API listening on http://localhost:${PORT}`);
  });
} catch (error) {
  console.error('Unable to connect to MongoDB:', error);
  process.exitCode = 1;
}
