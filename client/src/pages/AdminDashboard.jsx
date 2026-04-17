import { useEffect, useRef, useState } from 'react';
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
  avatarUrl: '',
  bannerUrl: '',
  imageUrl: '',
  avatarFile: null,
  avatarPreview: ''
};

const initialCaptain = {
  name: '',
  password: '',
  team: '',
  avatarFile: null,
  avatarPreview: ''
};

const AdminDashboard = () => {
  const fileInputRef = useRef(null);
  const { user, loginAdmin } = useAuth();
  const { socket, connected } = useSocket();
  const [players, setPlayers] = useState([]);
  const [captains, setCaptains] = useState([]);
  const [teams, setTeams] = useState([]);
  const [auction, setAuction] = useState(null);
  const [duration, setDuration] = useState(300);
  const [message, setMessage] = useState('');
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [playerForm, setPlayerForm] = useState(initialPlayer);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [captainForm, setCaptainForm] = useState(initialCaptain);

  const isAdmin = user?.role === 'admin';

  const loadPlayers = async () => {
    try {
      const { data } = await api.get('/players');
      setPlayers(data);
    } catch (_error) {
      setPlayers([]);
    }
  };

  const downloadCsv = async (endpointPath, fallbackFilename) => {
    try {
      const response = await api.get(endpointPath, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');

      anchor.href = objectUrl;
      anchor.download = fallbackFilename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to export CSV');
    }
  };

  const handleDeletePlayer = async (playerId) => {
    const confirmDelete = window.confirm('Delete this player? This cannot be undone.');
    if (!confirmDelete) return;

    try {
      await api.delete(`/players/${playerId}`);
      await loadPlayers();
      setMessage('Player deleted');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to delete player');
    }
  };

  const loadCaptainsAndTeams = async () => {
    try {
      const [captainsResponse, teamsResponse] = await Promise.all([
        api.get('/captains'),
        api.get('/captains/teams')
      ]);

      setCaptains(captainsResponse.data);
      setTeams(teamsResponse.data);
    } catch (_error) {
      setCaptains([]);
      setTeams([]);
    }
  };

  useEffect(() => {
    loadPlayers();
    if (isAdmin) {
      loadCaptainsAndTeams();
    }
  }, [isAdmin]);

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
      await loadCaptainsAndTeams();
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

  const handlePlayerSubmit = async (event) => {
    event.preventDefault();

    try {
      const formData = new FormData();
      formData.append('name', playerForm.name);
      formData.append('role', playerForm.role);
      formData.append('team', playerForm.team);
      formData.append('country', playerForm.country);
      formData.append('basePrice', String(Number(playerForm.basePrice) || 0));
      formData.append('avatarUrl', playerForm.avatarUrl);
      formData.append('bannerUrl', playerForm.bannerUrl);
      formData.append('imageUrl', playerForm.imageUrl);

      if (playerForm.avatarFile) {
        formData.append('avatar', playerForm.avatarFile);
      }

      if (selectedPlayer) {
        await api.put(`/players/${selectedPlayer.id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        setMessage('Player updated successfully');
      } else {
        await api.post('/players', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        setMessage('Player added to the auction list');
      }

      setPlayerForm(initialPlayer);
      setSelectedPlayer(null);
      await loadPlayers();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to save player');
    }
  };

  const preventDrag = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handlePlayerSelectFile = (file) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setPlayerForm((prev) => ({ ...prev, avatarFile: file, avatarPreview: preview }));
  };

  const handlePlayerFileInput = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      handlePlayerSelectFile(file);
    }
  };

  const handlePlayerDrop = (event) => {
    preventDrag(event);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handlePlayerSelectFile(file);
    }
  };

  const handleCaptainSelectFile = (file) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setCaptainForm((prev) => ({ ...prev, avatarFile: file, avatarPreview: preview }));
  };

  const handleCaptainFileInput = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      handleCaptainSelectFile(file);
    }
  };

  const handleCaptainDrop = (event) => {
    preventDrag(event);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleCaptainSelectFile(file);
    }
  };

  const handleCaptainCreate = async (event) => {
    event.preventDefault();

    try {
      const formData = new FormData();
      formData.append('name', captainForm.name);
      formData.append('password', captainForm.password);
      formData.append('team', captainForm.team);

      if (captainForm.avatarFile) {
        formData.append('avatar', captainForm.avatarFile);
      }

      await api.post('/captains', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setCaptainForm(initialCaptain);
      await loadCaptainsAndTeams();
      setMessage('Captain added successfully');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to add captain');
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
  const soldPlayers = players.filter((player) => player.status === 'sold');
  const availablePlayers = players.filter((player) => player.status === 'available');

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

      <section className="rounded-[32px] border border-white/10 bg-white/10 p-5 shadow-glow backdrop-blur-md">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Exports</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Download CSV</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:justify-end">
            <button
              type="button"
              onClick={() => downloadCsv('/export/players.csv', 'players.csv')}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15"
            >
              Players CSV
            </button>
            <button
              type="button"
              onClick={() => downloadCsv('/export/captains.csv', 'captains.csv')}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15"
            >
              Captains CSV
            </button>
            <button
              type="button"
              onClick={() => downloadCsv('/export/teams.csv', 'teams.csv')}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15"
            >
              Teams CSV
            </button>
            <button
              type="button"
              onClick={() => downloadCsv('/export/auctions.csv', 'auctions.csv')}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15"
            >
              Auctions CSV
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/10 p-5 shadow-glow backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gold/70">Captain Accounts</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Create a new captain</h3>
          </div>
        </div>

        <form onSubmit={handleCaptainCreate} className="mt-6 space-y-4">
          <div className="grid gap-3 lg:grid-cols-3">
            <input
              value={captainForm.name}
              onChange={(event) =>
                setCaptainForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Captain name"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-white outline-none placeholder:text-white/35"
            />
            <input
              type="password"
              value={captainForm.password}
              onChange={(event) =>
                setCaptainForm((prev) => ({ ...prev, password: event.target.value }))
              }
              placeholder="Password"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-white outline-none placeholder:text-white/35"
            />
            <input
              value={captainForm.team}
              onChange={(event) =>
                setCaptainForm((prev) => ({ ...prev, team: event.target.value }))
              }
              placeholder="Team name"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-white outline-none placeholder:text-white/35"
            />
          </div>

          <div
            onDragOver={preventDrag}
            onDragEnter={preventDrag}
            onDrop={handleCaptainDrop}
            onClick={() => fileInputRef.current?.click()}
            className="relative cursor-pointer rounded-[28px] border-2 border-dashed border-white/20 bg-slate-950/20 p-6 text-center text-white/60 transition hover:border-cyan hover:text-white"
          >
            <input
              ref={fileInputRef}
              id="captain-avatar-input"
              type="file"
              accept="image/*"
              onChange={handleCaptainFileInput}
              className="hidden"
            />

            {captainForm.avatarPreview ? (
              <img
                src={captainForm.avatarPreview}
                alt="Captain avatar preview"
                className="mx-auto mb-4 h-32 w-32 rounded-full object-cover"
              />
            ) : null}

            <p className="text-sm font-medium text-white">
              {captainForm.avatarPreview
                ? 'Click or drag a new image to replace the avatar'
                : 'Drag & drop an avatar image here, or click to choose from your files'}
            </p>
            <p className="mt-2 text-xs text-white/40">
              JPG, PNG, WEBP accepted. Max 5MB.
            </p>
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-gradient-to-r from-gold to-cyan px-4 py-3 font-semibold text-slate-950"
          >
            Create Captain
          </button>
        </form>
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
              min="60"
              max="300"
              step="30"
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              className="mt-3 w-full accent-cyan"
            />
            <p className="mt-2 text-lg font-semibold text-white">
              {Math.floor(duration / 60)}m {duration % 60}s
            </p>
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

          <form onSubmit={handlePlayerSubmit} className="mt-6 space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gold/70">Add Player</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Create auction inventory</h3>
            </div>
            <div
              onDrop={handlePlayerDrop}
              onDragOver={preventDrag}
              onDragEnter={preventDrag}
              className="rounded-3xl border border-dashed border-white/25 bg-slate-950/20 p-4 text-white"
            >
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 text-center text-sm text-white/70">
                <span>Add player photo</span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-white/80">
                  Drag & drop or click to choose
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePlayerFileInput}
                  className="hidden"
                />
                {playerForm.avatarPreview && (
                  <img
                    src={playerForm.avatarPreview}
                    alt="Player preview"
                    className="mt-3 h-28 w-28 rounded-2xl object-cover"
                  />
                )}
              </label>
            </div>
            {['name', 'role', 'team', 'country', 'avatarUrl', 'bannerUrl', 'imageUrl', 'basePrice'].map((field) => (
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
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="submit"
                className="w-full rounded-2xl bg-gradient-to-r from-cyan to-mint px-4 py-3 font-semibold text-slate-950"
              >
                {selectedPlayer ? 'Update Player' : 'Save Player'}
              </button>
              {selectedPlayer && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlayer(null);
                    setPlayerForm(initialPlayer);
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 font-semibold text-white"
                >
                  Cancel Edit
                </button>
              )}
            </div>
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
                key={player.id}
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={player.status !== 'available'}
                      onClick={() => startAuction(player.id)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${
                        player.status !== 'available'
                          ? 'cursor-not-allowed bg-white/5 text-white/30'
                          : 'bg-white text-slate-950'
                      }`}
                    >
                      Start
                    </button>
                    <button
                      type="button"
                      disabled={player.status !== 'available'}
                      onClick={() => handleDeletePlayer(player.id)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${
                        player.status !== 'available'
                          ? 'cursor-not-allowed bg-white/5 text-white/30'
                          : 'border border-white/10 bg-white/10 text-white hover:bg-white/15'
                      }`}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlayer(player);
                        setPlayerForm({
                          name: player.name || '',
                          role: player.role || '',
                          basePrice: player.basePrice?.toString() || '',
                          team: player.team || '',
                          country: player.country || '',
                          avatarUrl: player.avatarUrl || '',
                          bannerUrl: player.bannerUrl || '',
                          imageUrl: player.imageUrl || '',
                          avatarFile: null,
                          avatarPreview: player.avatarUrl || ''
                        });
                      }}
                      className="rounded-full px-4 py-2 text-sm font-semibold border border-white/10 bg-white/10 text-white hover:bg-white/15"
                    >
                      Edit
                    </button>
                  </div>
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

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-[32px] border border-white/10 bg-white/10 p-5 shadow-glow backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-mint/70">Captains</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">All captain accounts</h3>
            </div>
            <div className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/70">
              {captains.length}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {captains.map((captain) => (
              <div
                key={captain.id}
                className="rounded-3xl border border-white/10 bg-slate-950/30 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-lg font-semibold text-white">{captain.name}</p>
                  <p className="text-sm text-white/55">
                    {captain.players?.length || 0} players
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-white/60">
                  <div className="rounded-2xl bg-white/5 p-3">
                    Budget
                    <p className="mt-1 text-base font-semibold text-white">
                      {formatPoints(captain.budget)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-3">
                    Spent
                    <p className="mt-1 text-base font-semibold text-white">
                      {formatPoints(captain.totalSpent)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {!captains.length && (
              <div className="rounded-3xl border border-dashed border-white/10 p-4 text-sm text-white/50">
                No captains found yet.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/10 p-5 shadow-glow backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan/80">All Players</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Player inventory</h3>
            </div>
            <div className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/70">
              {players.length}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-white/70">
            <div className="rounded-3xl bg-slate-950/30 p-4">
              <p>Available</p>
              <p className="mt-1 text-2xl font-semibold text-white">{availablePlayers.length}</p>
            </div>
            <div className="rounded-3xl bg-slate-950/30 p-4">
              <p>Sold</p>
              <p className="mt-1 text-2xl font-semibold text-white">{soldPlayers.length}</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {players.map((player) => (
              <div
                key={player.id}
                className="rounded-3xl border border-white/10 bg-slate-950/30 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{player.name}</p>
                    <p className="text-sm text-white/50">
                      {player.role} • {player.team || player.country || 'Auction Pool'}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
                    {player.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/10 p-5 shadow-glow backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gold/70">Teams</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">All team data</h3>
            </div>
            <div className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/70">
              {teams.length}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {teams.map((team) => (
              <div
                key={team.id}
                className="rounded-3xl border border-white/10 bg-slate-950/30 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">{team.name}</p>
                    <p className="text-sm text-white/55">
                      {team.playersBought} bought • Budget {formatPoints(team.budget)}
                    </p>
                  </div>
                  <div className="text-right text-sm text-white/55">
                    <p>Spent</p>
                    <p className="font-semibold text-white">{formatPoints(team.totalSpent)}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-white/70">
                  <div className="rounded-2xl bg-white/5 p-3">
                    <p>Squad Size</p>
                    <p className="mt-1 text-lg font-semibold text-white">{team.playersBought}</p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-3">
                    <p>Budget Left</p>
                    <p className="mt-1 text-lg font-semibold text-white">{formatPoints(team.budget)}</p>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {team.players.map((player) => (
                    <div
                      key={player.id}
                      className="rounded-2xl bg-white/5 px-3 py-3 text-sm text-white/75"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{player.name}</p>
                          <p className="text-white/55">
                            {player.role} • {player.team || player.country || 'Auction Pool'}
                          </p>
                        </div>
                        <div className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
                          {formatPoints(player.basePrice)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {!team.players.length && (
                    <div className="rounded-2xl border border-dashed border-white/10 px-3 py-3 text-sm text-white/45">
                      No players bought yet.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
