import { motion } from 'framer-motion';
import { formatPoints } from '../utils/currency';

const TeamView = ({ user }) => {
  if (!user || user.role !== 'captain') {
    return (
      <section className="rounded-[28px] border border-white/10 bg-white/10 p-4 shadow-glow backdrop-blur-md">
        <h2 className="text-xl font-semibold text-white">My Team</h2>
        <p className="mt-3 text-sm text-white/60">
          Login as a captain to track budget, purchases, and your squad in real time.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-white/10 bg-white/10 p-4 shadow-glow backdrop-blur-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-mint/70">Captain Hub</p>
          <h2 className="text-xl font-semibold text-white">{user.name}</h2>
        </div>
        <div className="rounded-2xl bg-mint/10 px-4 py-2 text-right text-sm text-mint">
          <p>Budget</p>
          <p className="text-lg font-semibold text-white">{formatPoints(user.budget)}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-white/70">
        <div className="rounded-2xl bg-white/5 p-3">
          <p>Players Bought</p>
          <p className="mt-1 text-lg font-semibold text-white">{user.players?.length || 0}</p>
        </div>
        <div className="rounded-2xl bg-white/5 p-3">
          <p>Total Spent</p>
          <p className="mt-1 text-lg font-semibold text-white">{formatPoints(user.totalSpent)}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {(user.players || []).map((player) => (
          <motion.div
            layout
            key={player._id}
            className="rounded-2xl border border-white/10 bg-slate-950/30 p-3"
          >
            <p className="font-semibold text-white">{player.name}</p>
            <p className="text-sm text-white/50">
              {player.role} • Base {formatPoints(player.basePrice)}
            </p>
          </motion.div>
        ))}

        {!user.players?.length && (
          <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-white/50">
            Your squad is empty for now.
          </div>
        )}
      </div>
    </section>
  );
};

export default TeamView;
