import { motion } from 'framer-motion';
import { formatPoints } from '../utils/currency';

const BidControls = ({
  disabled,
  currentBid,
  minIncrement = 100,
  onBid,
  budget,
  connected
}) => {
  const quickBids = [minIncrement, minIncrement * 2, minIncrement * 5];

  return (
    <div className="fixed inset-x-0 bottom-20 z-30 border-t border-white/10 bg-slate-950/80 p-4 backdrop-blur xl:static xl:border-0 xl:bg-transparent xl:p-0">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 rounded-[28px] border border-white/10 bg-white/10 p-4 shadow-glow backdrop-blur-md xl:max-w-none">
        <div className="flex items-center justify-between text-sm text-white/70">
          <p>Next valid bid: {formatPoints(currentBid + minIncrement)}</p>
          <p className={connected ? 'text-mint' : 'text-coral'}>
            {connected ? 'Live' : 'Reconnecting'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {quickBids.map((increment) => {
            const bidValue = currentBid + increment;
            const isBlocked = disabled || bidValue > budget;

            return (
              <motion.button
                key={increment}
                type="button"
                whileHover={{ scale: isBlocked ? 1 : 1.02 }}
                whileTap={{ scale: isBlocked ? 1 : 0.97 }}
                disabled={isBlocked}
                onClick={() => onBid(bidValue)}
                className={`rounded-2xl px-4 py-4 text-sm font-semibold transition ${
                  isBlocked
                    ? 'cursor-not-allowed bg-white/5 text-white/30'
                    : 'bg-gradient-to-r from-cyan to-mint text-slate-950 shadow-pulse'
                }`}
              >
                +{formatPoints(increment)}
              </motion.button>
            );
          })}
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: disabled ? 1 : 1.01 }}
          whileTap={{ scale: disabled ? 1 : 0.985 }}
          disabled={disabled || currentBid + minIncrement > budget}
          onClick={() => onBid(currentBid + minIncrement)}
          className={`w-full rounded-3xl px-5 py-4 text-base font-semibold transition ${
            disabled || currentBid + minIncrement > budget
              ? 'cursor-not-allowed bg-white/5 text-white/30'
              : 'bg-gradient-to-r from-gold via-cyan to-mint text-slate-950'
          }`}
        >
          Place Bid for {formatPoints(currentBid + minIncrement)}
        </motion.button>
      </div>
    </div>
  );
};

export default BidControls;

