import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../api/http';
import BidControls from '../components/BidControls';
import Leaderboard from '../components/Leaderboard';
import PlayerPopup from '../components/PlayerPopup';
import TeamView from '../components/TeamView';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { formatPoints } from '../utils/currency';

const defaultAuction = {
  currentPlayer: null,
  currentBid: 0,
  highestBidder: null,
  status: 'idle',
  timeLeft: 0
};

const AuctionRoom = () => {
  const { user, loginCaptain, registerCaptain, refreshUser } = useAuth();
  const { socket, connected } = useSocket();
  const [auction, setAuction] = useState(defaultAuction);
  const [leaderboard, setLeaderboard] = useState([]);
  const [popupOpen, setPopupOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [formData, setFormData] = useState({ name: '', password: '' });

  const isCaptain = user?.role === 'captain';
  const minIncrement = 10;
  const showBidControls = isCaptain && auction.status === 'live' && Boolean(auction.currentPlayer);

  useEffect(() => {
    const loadInitial = async () => {
      const [auctionResponse, leaderboardResponse] = await Promise.all([
        api.get('/auction/state').catch(() => ({ data: null })),
        api.get('/captains/leaderboard').catch(() => ({ data: [] }))
      ]);

      if (auctionResponse.data) {
        setAuction({
          ...auctionResponse.data,
          currentPlayer: auctionResponse.data.currentPlayer,
          highestBidder: auctionResponse.data.highestBidder,
          timeLeft: auctionResponse.data.endsAt
            ? Math.max(
                0,
                Math.ceil((new Date(auctionResponse.data.endsAt).getTime() - Date.now()) / 1000)
              )
            : 0
        });
      }

      setLeaderboard(leaderboardResponse.data);
    };

    loadInitial();
  }, []);

  useEffect(() => {
    const onSnapshot = ({ auction: nextAuction, leaderboard: nextLeaderboard }) => {
      setAuction(nextAuction || defaultAuction);
      setLeaderboard(nextLeaderboard || []);
      setPopupOpen(Boolean(nextAuction?.currentPlayer));
    };

    const onStartAuction = (nextAuction) => {
      setAuction(nextAuction);
      setPopupOpen(true);
      setMessage(`${nextAuction.currentPlayer.name} is live for bidding`);
    };

    const onUpdateBid = (nextAuction) => {
      setAuction(nextAuction);
      setMessage(`${nextAuction.highestBidder?.name} leads with ${formatPoints(nextAuction.currentBid)}`);
    };

    const onPlayerSold = async ({ player, soldFor, soldTo }) => {
      setMessage(`${player.name} sold to ${soldTo.name} for ${formatPoints(soldFor)}`);
      setPopupOpen(true);
      await refreshUser();
    };

    const onAuctionClosed = ({ auction: nextAuction, reason }) => {
      setAuction(nextAuction || defaultAuction);
      setMessage(reason === 'timer-finished' ? 'Timer finished. Auction closed.' : 'Auction closed by admin.');
    };
    const onAuctionAwaitingClose = (nextAuction) => {
      setAuction(nextAuction || defaultAuction);
      setMessage('Timer ended. Bidding is frozen while the admin decides the result.');
    };

    const onLeaderboardUpdate = (nextLeaderboard) => setLeaderboard(nextLeaderboard);
    const onTimerUpdate = ({ timeLeft, status }) =>
      setAuction((prev) => ({ ...prev, timeLeft, status: status || prev.status }));
    const onError = (errorMessage) => setMessage(errorMessage);

    socket.on('snapshot', onSnapshot);
    socket.on('startAuction', onStartAuction);
    socket.on('updateBid', onUpdateBid);
    socket.on('playerSold', onPlayerSold);
    socket.on('auctionAwaitingClose', onAuctionAwaitingClose);
    socket.on('auctionClosed', onAuctionClosed);
    socket.on('leaderboardUpdate', onLeaderboardUpdate);
    socket.on('timerUpdate', onTimerUpdate);
    socket.on('auctionError', onError);

    return () => {
      socket.off('snapshot', onSnapshot);
      socket.off('startAuction', onStartAuction);
      socket.off('updateBid', onUpdateBid);
      socket.off('playerSold', onPlayerSold);
      socket.off('auctionAwaitingClose', onAuctionAwaitingClose);
      socket.off('auctionClosed', onAuctionClosed);
      socket.off('leaderboardUpdate', onLeaderboardUpdate);
      socket.off('timerUpdate', onTimerUpdate);
      socket.off('auctionError', onError);
    };
  }, [refreshUser, socket]);

  const heroLabel = useMemo(() => {
    if (auction.currentPlayer) {
      return auction.currentPlayer.name;
    }

    return 'Awaiting Next Player';
  }, [auction.currentPlayer]);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();

    try {
      if (authMode === 'register') {
        await registerCaptain(formData);
        setMessage('Captain account created successfully');
      } else {
        await loginCaptain(formData);
        setMessage('Captain login successful');
      }

      setFormData({ name: '', password: '' });
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to authenticate');
    }
  };

  const handleBid = (amount) => {
    socket.emit('newBid', { amount });
  };

  return (
    <div className={`space-y-6 ${showBidControls ? 'pb-40 xl:pb-0' : 'pb-28 xl:pb-0'}`}>
      <section className="rounded-[32px] border border-white/10 bg-white/10 p-5 shadow-glow backdrop-blur-md md:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan/80">Live Auction Arena</p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight md:text-6xl">
              {heroLabel}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/70 md:text-base">
              Watch every bid update in real time, jump in from mobile, and track budgets,
              players, and rankings without refreshing the page.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-3xl bg-slate-950/30 p-4">
              <p className="text-sm text-white/50">Status</p>
              <p className="mt-2 text-xl font-semibold text-white">{auction.status}</p>
            </div>
            <div className="rounded-3xl bg-slate-950/30 p-4">
              <p className="text-sm text-white/50">Highest Bid</p>
              <p className="mt-2 text-xl font-semibold text-white">
                {formatPoints(auction.currentBid)}
              </p>
            </div>
            <div className="rounded-3xl bg-slate-950/30 p-4">
              <p className="text-sm text-white/50">Bid Leader</p>
              <p className="mt-2 text-xl font-semibold text-white">
                {auction.highestBidder?.name || 'None'}
              </p>
            </div>
            <motion.div
              animate={{ scale: auction.status === 'live' ? [1, 1.03, 1] : 1 }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="rounded-3xl bg-slate-950/30 p-4"
            >
              <p className="text-sm text-white/50">Countdown</p>
              <p className="mt-2 text-xl font-semibold text-white">{auction.timeLeft || 0}s</p>
            </motion.div>
          </div>
        </div>

        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-5 rounded-3xl border border-cyan/20 bg-cyan/10 px-4 py-3 text-sm text-cyan"
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-6">
          <section className="rounded-[32px] border border-white/10 bg-white/10 p-5 shadow-glow backdrop-blur-md md:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gold/70">Current Player</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  {auction.currentPlayer?.name || 'Waiting for admin'}
                </h3>
              </div>
              {auction.currentPlayer && (
                <button
                  type="button"
                  onClick={() => setPopupOpen(true)}
                  className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white"
                >
                  View Details
                </button>
              )}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl bg-slate-950/30 p-4">
                <p className="text-sm text-white/50">Role</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {auction.currentPlayer?.role || '-'}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-950/30 p-4">
                <p className="text-sm text-white/50">Base Price</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {formatPoints(auction.currentPlayer?.basePrice || 0)}
                </p>
              </div>
              <motion.div
                animate={{
                  boxShadow:
                    auction.status === 'live'
                      ? [
                          '0 0 0 rgba(0,0,0,0)',
                          '0 0 24px rgba(255,219,112,0.20)',
                          '0 0 0 rgba(0,0,0,0)'
                        ]
                      : '0 0 0 rgba(0,0,0,0)'
                }}
                transition={{ duration: 1.8, repeat: Infinity }}
                className="rounded-3xl bg-slate-950/30 p-4"
              >
                <p className="text-sm text-white/50">Live Bid</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {formatPoints(auction.currentBid)}
                </p>
              </motion.div>
            </div>
          </section>

          {!isCaptain && (
            <section className="rounded-[32px] border border-white/10 bg-white/10 p-5 shadow-glow backdrop-blur-md">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-mint/70">Captain Access</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">
                    Login or register to bid
                  </h3>
                </div>
                <div className="flex gap-2 rounded-full border border-white/10 bg-slate-950/30 p-1 text-sm">
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className={`rounded-full px-4 py-2 ${
                      authMode === 'login' ? 'bg-white text-slate-950' : 'text-white/60'
                    }`}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('register')}
                    className={`rounded-full px-4 py-2 ${
                      authMode === 'register' ? 'bg-white text-slate-950' : 'text-white/60'
                    }`}
                  >
                    Register
                  </button>
                </div>
              </div>

              <form onSubmit={handleAuthSubmit} className="mt-5 grid gap-3 md:grid-cols-2">
                <input
                  value={formData.name}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Captain name"
                  className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-white outline-none placeholder:text-white/35"
                />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, password: event.target.value }))
                  }
                  placeholder="Password"
                  className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-white outline-none placeholder:text-white/35"
                />
                <button
                  type="submit"
                  className="rounded-2xl bg-gradient-to-r from-cyan to-mint px-4 py-3 font-semibold text-slate-950 md:col-span-2"
                >
                  {authMode === 'register' ? 'Create Captain Account' : 'Login as Captain'}
                </button>
              </form>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <Leaderboard items={leaderboard} />
          <TeamView user={user} />
        </div>
      </div>

      <PlayerPopup
        player={auction.currentPlayer}
        auction={auction}
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
      />

      {showBidControls ? (
        <BidControls
          connected={connected}
          disabled={false}
          currentBid={auction.currentBid || auction.currentPlayer?.basePrice || 0}
          minIncrement={minIncrement}
          onBid={handleBid}
          budget={user?.budget || 0}
        />
      ) : null}
    </div>
  );
};

export default AuctionRoom;
