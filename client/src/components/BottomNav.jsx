import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Auction' },
  { to: '/audience', label: 'Audience' },
  { to: '/admin', label: 'Admin' }
];

const BottomNav = () => {
  return (
    <nav className="fixed inset-x-4 bottom-4 z-40 rounded-full border border-white/10 bg-white/10 p-2 shadow-glow backdrop-blur xl:hidden">
      <div className="grid grid-cols-3 gap-2">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to}>
            {({ isActive }) => (
              <motion.div
                whileTap={{ scale: 0.96 }}
                className={`rounded-full px-4 py-3 text-center text-sm font-semibold transition ${
                  isActive
                    ? 'bg-white text-slate-950 shadow-pulse'
                    : 'text-white/70'
                }`}
              >
                {item.label}
              </motion.div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
