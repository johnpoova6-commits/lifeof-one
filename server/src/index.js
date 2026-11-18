import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';

const { MONGODB_URI, JWT_SECRET } = process.env;
const port = process.env.PORT || 5000;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is required. Set it in the server environment or local .env file.');
}
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters. Set it in the server environment or local .env file.');
}

try {
  await mongoose.connect(MONGODB_URI);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Lifeof Hub API listening on port ${port}`);
  });
} catch (error) {
  console.error('Unable to connect to MongoDB:', error);
  process.exitCode = 1;
}
