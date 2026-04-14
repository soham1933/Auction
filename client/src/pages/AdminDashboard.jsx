import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../api/http';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { formatPoints } from '../utils/currency';

const initialPlayer = {
  name: '',
  role: '',
  basePrice: '',
  team: '',
  country: '',
  imageUrl: ''
};

const AdminDashboard = () => {
  const { user, token, loginAdmin } = useAuth();
  const { socket, connected } = useSocket(token);
  const [players, setPlayers] = useState([]);
  const [auction, setAuction] = useState(null);
  const [duration, setDuration] = useState(30);
  const [message, setMessage] = useState('');
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [playerForm, setPlayerForm] = useState(initialPlayer);

  const isAdmin = user?.role === 'admin';

  const loadPlayers = async () => {
    const { data } = await api.get('/players');
    setPlayers(data);
  };

  useEffect(() => {
    loadPlayers();
  }, []);

  useEffect(() => {
    const onSnapshot = ({ auction: nextAuction }) => setAuction(nextAuction);
    const onStartAuction = (nextAuction) => setAuction(nextAuction);
    const onUpdateBid = (nextAuction) => {
      setAuction(nextAuction);
      setMessage(
        `${nextAuction.highestBidder?.name || 'Unknown'} pushed the bid to ${formatPoints(nextAuction.currentBid)}`
      );
    };
    const onAuctionAwaitingClose = (nextAuction) => {
      setAuction(nextAuction);
      setMessage('Timer ended. Review the final bid and close or sell manually.');
    };
    const onAuctionClosed = ({ auction: nextAuction }) => setAuction(nextAuction);
    const onPlayerSold = async () => {
      setMessage('Player sold successfully');
      await loadPlayers();
    };
    const onTimerUpdate = ({ timeLeft, status }) =>
      setAuction((prev) => (prev ? { ...prev, timeLeft, status: status || prev.status } : prev));
    const onError = (errorMessage) => setMessage(errorMessage);

    socket.on('snapshot', onSnapshot);
    socket.on('startAuction', onStartAuction);
    socket.on('updateBid', onUpdateBid);
    socket.on('auctionAwaitingClose', onAuctionAwaitingClose);
    socket.on('auctionClosed', onAuctionClosed);
    socket.on('playerSold', onPlayerSold);
    socket.on('timerUpdate', onTimerUpdate);
    socket.on('auctionError', onError);

    return () => {
      socket.off('snapshot', onSnapshot);
      socket.off('startAuction', onStartAuction);
      socket.off('updateBid', onUpdateBid);
      socket.off('auctionAwaitingClose', onAuctionAwaitingClose);
      socket.off('auctionClosed', onAuctionClosed);
      socket.off('playerSold', onPlayerSold);
      socket.off('timerUpdate', onTimerUpdate);
      socket.off('auctionError', onError);
    };
  }, [socket]);

  const handleAdminLogin = async (event) => {
    event.preventDefault();

    try {
      await loginAdmin(credentials);
      setMessage('Admin login successful');
      setCredentials({ email: '', password: '' });
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to login as admin');
    }
  };

  const handlePlayerCreate = async (event) => {
    event.preventDefault();

    try {
      await api.post('/players', {
        ...playerForm,
        basePrice: Number(playerForm.basePrice)
      });
      setPlayerForm(initialPlayer);
      await loadPlayers();
      setMessage('Player added to the auction list');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to add player');
    }
  };

  const startAuction = (playerId) => {
    socket.emit('startAuction', { playerId, duration });
  };

  const sellPlayer = () => socket.emit('playerSold');
  const closeAuction = () => socket.emit('auctionClosed');
  const currentBid = auction?.currentBid || auction?.currentPlayer?.basePrice || 0;
  const isLiveAuction = auction?.status === 'live';
  const isAwaitingClose = auction?.status === 'awaiting-close';
  const bidHistory = auction?.bidHistory || [];

  if (!isAdmin) {
    return (
      <section className="mx-auto max-w-2xl rounded-[32px] border border-white/10 bg-white/10 p-6 shadow-glow backdrop-blur-md">
        <p className="text-xs uppercase tracking-[0.3em] text-gold/70">Admin Access</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Secure auction controls</h2>
        <p className="mt-3 text-white/65">
          Sign in as the auction administrator to start players, close the timer, and mark sales.
        </p>

        <form onSubmit={handleAdminLogin} className="mt-6 space-y-3">
          <input
            value={credentials.email}
            onChange={(event) =>
              setCredentials((prev) => ({ ...prev, email: event.target.value }))
            }
            placeholder="Admin email"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-white outline-none placeholder:text-white/35"
          />
          <input
            type="password"
            value={credentials.password}
            onChange={(event) =>
              setCredentials((prev) => ({ ...prev, password: event.target.value }))
            }
            placeholder="Admin password"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-white outline-none placeholder:text-white/35"
          />
          <button
            type="submit"
            className="w-full rounded-2xl bg-gradient-to-r from-gold to-cyan px-4 py-3 font-semibold text-slate-950"
          >
            Login to Admin Dashboard
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-coral">{message}</p>}
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/10 p-6 shadow-glow backdrop-blur-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan/80">Admin Dashboard</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Auction command center</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-white/10 bg-slate-950/30 px-4 py-2 text-sm text-white/70">
              {connected ? 'Socket connected' : 'Reconnecting'}
            </div>
            <div className="rounded-full border border-white/10 bg-slate-950/30 px-4 py-2 text-sm text-white/70">
              Timer: {auction?.timeLeft || 0}s
            </div>
            <div className="rounded-full border border-white/10 bg-slate-950/30 px-4 py-2 text-sm text-white/70">
              Status: {auction?.status || 'idle'}
            </div>
          </div>
        </div>

        {message && (
          <div className="mt-4 rounded-2xl border border-cyan/20 bg-cyan/10 px-4 py-3 text-sm text-cyan">
            {message}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-[32px] border border-white/10 bg-white/10 p-5 shadow-glow backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-mint/70">Auction Controls</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">
                {auction?.currentPlayer?.name || 'No active player'}
              </h3>
            </div>
          </div>

          <div className="mt-5 rounded-3xl bg-slate-950/30 p-4">
            <label className="text-sm text-white/60">Countdown Duration</label>
            <input
              type="range"
              min="15"
              max="90"
              step="5"
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              className="mt-3 w-full accent-cyan"
            />
            <p className="mt-2 text-lg font-semibold text-white">{duration} seconds</p>
            <p className="mt-2 text-sm text-white/55">
              After the timer ends, bidding freezes and the admin decides whether to sell or close.
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <motion.div
              animate={isLiveAuction ? { scale: [1, 1.02, 1] } : { scale: 1 }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="rounded-3xl bg-slate-950/30 p-4"
            >
              <p className="text-sm text-white/50">Current Bid</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {formatPoints(currentBid)}
              </p>
            </motion.div>
            <div className="rounded-3xl bg-slate-950/30 p-4">
              <p className="text-sm text-white/50">Highest Bidder</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {auction?.highestBidder?.name || 'No bids yet'}
              </p>
            </div>
          </div>

          {auction?.currentPlayer && (
            <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-gold/70">Live Player Feed</p>
              <h4 className="mt-2 text-xl font-semibold text-white">{auction.currentPlayer.name}</h4>
              <p className="mt-1 text-sm text-white/60">
                {auction.currentPlayer.role} • Base {formatPoints(auction.currentPlayer.basePrice)}
              </p>

              <div className="mt-4 space-y-3">
                {bidHistory.map((entry, index) => {
                  const previousAmount = bidHistory[index + 1]?.amount ?? auction.currentPlayer.basePrice;
                  const delta = entry.amount - previousAmount;

                  return (
                    <motion.div
                      key={`${entry.createdAt}-${entry.amount}-${index}`}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3"
                    >
                      <div>
                        <p className="font-semibold text-white">{entry.bidderName}</p>
                        <p className="text-sm text-white/50">
                          {new Date(entry.createdAt).toLocaleTimeString('en-IN')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-white">
                          {formatPoints(entry.amount)}
                        </p>
                        <p className={`text-sm ${delta > 0 ? 'text-mint' : 'text-white/40'}`}>
                          {delta > 0 ? `+${formatPoints(delta)}` : 'Opening'}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}

                {!bidHistory.length && (
                  <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-white/50">
                    Bid updates will appear here live as captains raise the price.
                  </div>
                )}
              </div>
            </div>
          )}

          {isAwaitingClose && (
            <div className="mt-5 rounded-3xl border border-gold/25 bg-gold/10 p-4 text-sm text-gold">
              Timer has ended. Bidding is frozen and this auction now waits for admin action.
            </div>
          )}

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={sellPlayer}
              disabled={!auction?.highestBidder}
              className={`rounded-2xl px-4 py-3 font-semibold ${
                auction?.highestBidder
                  ? 'bg-gradient-to-r from-gold to-mint text-slate-950'
                  : 'cursor-not-allowed bg-white/5 text-white/30'
              }`}
            >
              Mark Sold
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={closeAuction}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 font-semibold text-white"
            >
              Close Auction
            </motion.button>
          </div>

          <form onSubmit={handlePlayerCreate} className="mt-6 space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gold/70">Add Player</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Create auction inventory</h3>
            </div>
            {['name', 'role', 'team', 'country', 'imageUrl', 'basePrice'].map((field) => (
              <input
                key={field}
                type={field === 'basePrice' ? 'number' : 'text'}
                placeholder={field}
                value={playerForm[field]}
                onChange={(event) =>
                  setPlayerForm((prev) => ({ ...prev, [field]: event.target.value }))
                }
                className="w-full rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-white capitalize outline-none placeholder:text-white/35"
              />
            ))}
            <button
              type="submit"
              className="w-full rounded-2xl bg-gradient-to-r from-cyan to-mint px-4 py-3 font-semibold text-slate-950"
            >
              Save Player
            </button>
          </form>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/10 p-5 shadow-glow backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan/80">Player Pool</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Select the next player</h3>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {players.map((player) => (
              <motion.div
                layout
                key={player._id}
                whileHover={{ y: -2 }}
                className="rounded-[28px] border border-white/10 bg-slate-950/30 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">{player.name}</p>
                    <p className="text-sm text-white/55">
                      {player.role}
                      {player.team ? ` • ${player.team}` : ''}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
                    {player.status}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-white/60">
                    Base: <span className="font-semibold text-white">{formatPoints(player.basePrice)}</span>
                  </p>
                  <button
                    type="button"
                    disabled={player.status !== 'available'}
                    onClick={() => startAuction(player._id)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      player.status !== 'available'
                        ? 'cursor-not-allowed bg-white/5 text-white/30'
                        : 'bg-white text-slate-950'
                    }`}
                  >
                    Start
                  </button>
                </div>
              </motion.div>
            ))}

            {!players.length && (
              <div className="rounded-3xl border border-dashed border-white/10 p-6 text-white/55">
                Add players from the panel on the left to begin the auction.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
