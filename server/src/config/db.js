import mongoose from 'mongoose';

export const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI||'mongodb+srv://photosa1632_db_user:qcjLOHbwG9slsf5B@auction.nm7vvb2.mongodb.net/?appName=auction';

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not configured');
  }

  await mongoose.connect(mongoUri);
  console.log('MongoDB connected');
};

