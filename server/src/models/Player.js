import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    basePrice: {
      type: Number,
      required: true
    },
    role: {
      type: String,
      required: true,
      trim: true
    },
    team: {
      type: String,
      default: ''
    },
    country: {
      type: String,
      default: ''
    },
    imageUrl: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['available', 'sold', 'unsold'],
      default: 'available'
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('Player', playerSchema);

