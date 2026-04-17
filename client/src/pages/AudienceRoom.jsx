import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../api/http';
import Leaderboard from '../components/Leaderboard';
import PlayerPopup from '../components/PlayerPopup';
import { useSocket } from '../hooks/useSocket';
import { formatPoints } from '../utils/currency';

const defaultAuction = {
  currentPlayer: null,
  currentBid: 0,
  highestBidder: null,
  status: 'idle',
  timeLeft: 0
};

const AudienceRoom = () => {
  const { socket, connected } = useSocket();
  const [auction, setAuction] = useState(defaultAuction);
  const [leaderboard, setLeaderboard] = useState([]);
  const [popupOpen, setPopupOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [bidHistory, setBidHistory] = useState([]);
  const [soldPopper, setSoldPopper] = useState(false);
  const soldTimerRef = useRef(null);

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
        setBidHistory(auctionResponse.data.bidHistory || []);
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
      setBidHistory(nextAuction?.bidHistory || []);
    };

    const onStartAuction = (nextAuction) => {
      setAuction(nextAuction);
      setPopupOpen(true);
      setMessage(`${nextAuction.currentPlayer.name} is live for bidding`);
      setBidHistory(nextAuction.bidHistory || []);
    };

    const onUpdateBid = (nextAuction) => {
      setAuction(nextAuction);
      setBidHistory(nextAuction.bidHistory || []);
      setMessage(`${nextAuction.highestBidder?.name} leads with ${formatPoints(nextAuction.currentBid)}`);
    };

    const onAuctionAwaitingClose = (nextAuction) => {
      setAuction(nextAuction || defaultAuction);
      setMessage('Timer ended. Waiting for admin decision.');
    };

    const onPlayerSold = ({ player, soldFor, soldTo }) => {
      setMessage(`${player.name} sold to ${soldTo.name} for ${formatPoints(soldFor)}`);
      setSoldPopper(true);
      clearTimeout(soldTimerRef.current);
      soldTimerRef.current = window.setTimeout(() => setSoldPopper(false), 3200);
    };

    const onAuctionClosed = ({ reason }) => {
      setMessage(reason === 'admin-closed' ? 'Auction closed by admin.' : 'Auction closed.');
    };

    const onLeaderboardUpdate = (nextLeaderboard) => setLeaderboard(nextLeaderboard);
    const onTimerUpdate = ({ timeLeft, status }) =>
      setAuction((prev) => ({ ...prev, timeLeft, status: status || prev.status }));
    const onError = (errorMessage) => setMessage(errorMessage);

    socket.on('snapshot', onSnapshot);
    socket.on('startAuction', onStartAuction);
    socket.on('updateBid', onUpdateBid);
    socket.on('auctionAwaitingClose', onAuctionAwaitingClose);
    socket.on('playerSold', onPlayerSold);
    socket.on('auctionClosed', onAuctionClosed);
    socket.on('leaderboardUpdate', onLeaderboardUpdate);
    socket.on('timerUpdate', onTimerUpdate);
    socket.on('auctionError', onError);

    return () => {
      socket.off('snapshot', onSnapshot);
      socket.off('startAuction', onStartAuction);
      socket.off('updateBid', onUpdateBid);
      socket.off('auctionAwaitingClose', onAuctionAwaitingClose);
      socket.off('playerSold', onPlayerSold);
      socket.off('auctionClosed', onAuctionClosed);
      socket.off('leaderboardUpdate', onLeaderboardUpdate);
      socket.off('timerUpdate', onTimerUpdate);
      socket.off('auctionError', onError);
    };
  }, [socket]);

  useEffect(() => {
    return () => {
      clearTimeout(soldTimerRef.current);
    };
  }, []);

  const currentPlayer = auction.currentPlayer || {};
  const playerImageUrl = currentPlayer.bannerUrl || currentPlayer.imageUrl || currentPlayer.avatarUrl || '';
  const recentBids = bidHistory.slice(-4).reverse();

  return (
    <div className="space-y-6 pb-20 xl:pb-0">
      <section className="rounded-[32px] border border-white/10 bg-white/10 p-6 shadow-glow backdrop-blur-md">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan/80">Audience View</p>
            <h2 className="mt-3 text-4xl font-semibold text-white md:text-5xl">
              {auction.currentPlayer?.name || 'Waiting for player'}
            </h2>
            <p className="mt-2 text-sm text-white/60">
              {auction.currentPlayer?.role || 'Live updates appear automatically.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-3xl bg-slate-950/30 p-4">
              <p className="text-sm text-white/50">Status</p>
              <p className="mt-2 text-xl font-semibold text-white">{auction.status}</p>
            </div>
            <motion.div
              animate={{ boxShadow: auction.status === 'live' ? ['0 0 0 rgba(0,0,0,0)', '0 0 28px rgba(106,230,255,0.25)', '0 0 0 rgba(0,0,0,0)'] : '0 0 0 rgba(0,0,0,0)' }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="rounded-3xl bg-slate-950/30 p-4"
            >
              <p className="text-sm text-white/50">Current Bid</p>
              <p className="mt-2 text-xl font-semibold text-white">
                {formatPoints(auction.currentBid)}
              </p>
            </motion.div>
            <div className="rounded-3xl bg-slate-950/30 p-4">
              <p className="text-sm text-white/50">Highest Bidder</p>
              <p className="mt-2 text-xl font-semibold text-white">
                {auction.highestBidder?.name || 'None'}
              </p>
            </div>
            <div className="rounded-3xl bg-slate-950/30 p-4">
              <p className="text-sm text-white/50">Timer</p>
              <p className="mt-2 text-xl font-semibold text-white">{auction.timeLeft || 0}s</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className={`rounded-full px-4 py-2 text-sm font-semibold ${connected ? 'bg-mint/10 text-mint' : 'bg-coral/10 text-coral'}`}>
            {connected ? 'Live connected' : 'Reconnecting'}
          </div>
          {playerImageUrl ? (
            <div className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/70">
              Audience image loaded
            </div>
          ) : (
            <div className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/70">
              No image for this player
            </div>
          )}
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

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[32px] border border-white/10 bg-white/10 p-6 shadow-glow backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gold/70">Now Showing</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">
                {auction.currentPlayer?.name || 'No player yet'}
              </h3>
              <p className="mt-2 text-sm text-white/60">
                Tap to open fullscreen player details.
              </p>
            </div>
            <button
              type="button"
              disabled={!auction.currentPlayer}
              onClick={() => setPopupOpen(true)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                auction.currentPlayer
                  ? 'bg-white text-slate-950'
                  : 'cursor-not-allowed bg-white/5 text-white/30'
              }`}
            >
              Fullscreen
            </button>
          </div>

          {playerImageUrl ? (
            <div className="mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/30">
              <img
                src={playerImageUrl}
                alt={auction.currentPlayer?.name || 'Current player'}
                className="h-72 w-full object-cover md:h-96"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="mt-6 flex h-72 items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-slate-950/10 text-sm text-white/50 md:h-96">
              No player image available
            </div>
          )}

          <AnimatePresence>
            {soldPopper && (
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.85 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="mx-auto mt-5 inline-flex items-center gap-3 rounded-full border border-white/20 bg-gold/10 px-5 py-3 text-sm font-semibold text-gold shadow-[0_0_24px_rgba(255,215,0,0.18)]"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gold/20 text-gold">
                  SOLD
                </span>
                <span>Player sold — check the live update above.</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 rounded-[28px] border border-white/10 bg-slate-950/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">Live Player Feed</p>
              <span className="text-xs uppercase tracking-[0.3em] text-white/50">Live</span>
            </div>
            {recentBids.length ? (
              <div className="mt-4 space-y-3">
                {recentBids.map((bid, index) => (
                  <motion.div
                    key={`${bid.timestamp}-${index}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-3xl border border-white/10 bg-white/5 p-3"
                  >
                    <p className="text-sm text-white/70">{bid.bidderName || bid.bidder?.name || 'Anonymous'} raised</p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-lg font-semibold text-white">{formatPoints(bid.amount || bid.value || bid.bid)}</span>
                      <span className="text-xs uppercase tracking-[0.35em] text-white/40">{new Date(bid.timestamp || bid.time || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-white/60">No bids have been placed yet.</p>
            )}
          </div>
        </section>

        <Leaderboard items={leaderboard} />
      </div>

      <PlayerPopup
        player={auction.currentPlayer}
        auction={auction}
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
        imageVariant="banner"
      />
    </div>
  );
};

export default AudienceRoom;

