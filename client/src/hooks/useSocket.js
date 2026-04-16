import { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const defaultSocketUrl = import.meta.env.DEV
  ? 'http://localhost:5000'
  : 'https://auction-bu05.onrender.com';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token } = useAuth();
  const [connected, setConnected] = useState(false);

  const socket = useMemo(
    () =>
      io(import.meta.env.VITE_SOCKET_URL || defaultSocketUrl, {
        autoConnect: true,
        transports: ['websocket', 'polling'],
        auth: token ? { token } : {},
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500,
        reconnectionDelayMax: 4000,
        timeout: 20000
      }),
    [token]
  );

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
    };
  }, [socket]);

  return createElement(SocketContext.Provider, { value: { socket, connected } }, children);
};

export const useSocket = () => {
  const value = useContext(SocketContext);
  if (!value) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return value;
};
