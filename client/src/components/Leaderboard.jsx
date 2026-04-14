import { motion } from 'framer-motion';
import { formatPoints } from '../utils/currency';

const Leaderboard = ({ items = [] }) => {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/10 p-4 shadow-glow backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan/70">Live Table</p>
          <h2 className="text-xl font-semibold text-white">Leaderboard</h2>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((captain, index) => (
          <motion.div
            key={captain.id}
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-white/10 bg-slate-950/30 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">
                  Rank #{index + 1}
                </p>
                <p className="text-lg font-semibold text-white">{captain.name}</p>
              </div>
              <div className="rounded-full bg-cyan/15 px-3 py-1 text-xs font-semibold text-cyan">
                {captain.playersBought} players
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-white/70">
              <div className="rounded-2xl bg-white/5 p-3">
                <p>Budget Left</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {formatPoints(captain.budget)}
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <p>Total Spent</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {formatPoints(captain.totalSpent)}
                </p>
              </div>
            </div>
          </motion.div>
        ))}

        {!items.length && (
          <div className="rounded-3xl border border-dashed border-white/10 p-6 text-sm text-white/50">
            No captains yet. Register to start building the leaderboard.
          </div>
        )}
      </div>
    </section>
  );
};

export default Leaderboard;

