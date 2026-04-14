import { AnimatePresence, motion } from 'framer-motion';
import { formatPoints } from '../utils/currency';

const PlayerPopup = ({ player, auction, open, onClose }) => {
  return (
    <AnimatePresence>
      {open && player && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end bg-slate-950/70 backdrop-blur-sm md:items-center md:justify-center"
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 24 }}
            className="relative h-[88vh] w-full overflow-hidden rounded-t-[32px] border border-white/10 bg-aurora p-5 md:h-auto md:max-w-2xl md:rounded-[32px] md:p-8"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-white"
            >
              Close
            </button>

            <div className="flex h-full flex-col justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan/80">
                  On The Block
                </p>
                <h2 className="mt-3 max-w-xl text-4xl font-semibold text-white md:text-5xl">
                  {player.name}
                </h2>
                <p className="mt-3 text-sm text-white/70">
                  {player.role}
                  {player.team ? ` • ${player.team}` : ''}
                  {player.country ? ` • ${player.country}` : ''}
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
                    <p className="text-sm text-white/60">Base Price</p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {formatPoints(player.basePrice)}
                    </p>
                  </div>
                  <motion.div
                    animate={{
                      boxShadow: [
                        '0 0 0 rgba(0,0,0,0)',
                        '0 0 32px rgba(106,230,255,0.22)',
                        '0 0 0 rgba(0,0,0,0)'
                      ]
                    }}
                    transition={{ duration: 2.2, repeat: Infinity }}
                    className="rounded-3xl border border-cyan/20 bg-cyan/10 p-4"
                  >
                    <p className="text-sm text-cyan/70">Highest Bid</p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {formatPoints(auction?.currentBid || player.basePrice)}
                    </p>
                  </motion.div>
                  <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
                    <p className="text-sm text-white/60">Highest Bidder</p>
                    <p className="mt-2 text-xl font-semibold text-white">
                      {auction?.highestBidder?.name || 'Awaiting bids'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-[28px] border border-white/10 bg-slate-950/25 p-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-gold/70">Live Timer</p>
                    <p className="mt-2 text-3xl font-semibold text-white">
                      {auction?.timeLeft || 0}s
                    </p>
                  </div>
                  <div className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/70">
                    Status: {auction?.status || 'idle'}
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-cyan via-mint to-gold"
                    animate={{ width: `${Math.max(((auction?.timeLeft || 0) / 30) * 100, 4)}%` }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PlayerPopup;

