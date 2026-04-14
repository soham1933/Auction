import mongoose from 'mongoose';

const auctionSchema = new mongoose.Schema(
  {
    currentPlayer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null
    },
    currentBid: {
      type: Number,
      default: 0
    },
    highestBidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Captain',
      default: null
    },
    status: {
      type: String,
      enum: ['idle', 'live', 'awaiting-close', 'sold', 'closed'],
      default: 'idle'
    },
    soldFor: {
      type: Number,
      default: 0
    },
    soldTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Captain',
      default: null
    },
    startedAt: Date,
    endsAt: Date
  },
  {
    timestamps: true
  }
);

export default mongoose.model('Auction', auctionSchema);
