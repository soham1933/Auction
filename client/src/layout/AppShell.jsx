import { NavLink, Outlet } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Auction Room' },
  { to: '/admin', label: 'Admin Panel' }
];

const AppShell = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-aurora text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-8 px-4 pb-28 pt-6 xl:px-6 xl:pb-8">
        <aside className="hidden w-72 shrink-0 xl:block">
          <div className="sticky top-6 rounded-[32px] border border-white/10 bg-white/10 p-6 shadow-glow backdrop-blur-md">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan/80">Cricket Auction</p>
            <h1 className="mt-4 text-3xl font-semibold">Realtime Control Center</h1>
            <div className="mt-8 space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `block rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      isActive ? 'bg-white text-slate-950' : 'text-white/70 hover:bg-white/10'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>

            <div className="mt-8 rounded-3xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-white/40">Session</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {user ? user.name : 'Guest Viewer'}
              </p>
              <p className="text-sm text-white/55">
                {user ? `${user.role} signed in` : 'Watch auctions live without logging in'}
              </p>
              {user && (
                <button
                  type="button"
                  onClick={logout}
                  className="mt-4 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
};

export default AppShell;
