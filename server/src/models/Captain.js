import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const captainSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      trim: true,
      minlength: 6
    },
    budget: {
      type: Number,
      default: Number(process.env.DEFAULT_CAPTAIN_BUDGET || 10000)
    },
    team: {
      type: String,
      trim: true,
      default: ''
    },
    avatarUrl: {
      type: String,
      trim: true
    },
    imageUrl: {
      type: String,
      trim: true
    },
    players: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player'
      }
    ],
    totalSpent: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

captainSchema.pre('save', async function savePassword(next) {
  if (!this.isModified('password')) {
    next();
    return;
  }

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

captainSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('Captain', captainSchema);
