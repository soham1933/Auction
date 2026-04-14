import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

const defaultSocketUrl = import.meta.env.DEV
  ? 'http://localhost:5000'
  : 'https://auction-bu05.onrender.com';

export const useSocket = (token) => {
  const [connected, setConnected] = useState(false);

  const socket = useMemo(
    () =>
      io(import.meta.env.VITE_SOCKET_URL || defaultSocketUrl, {
        autoConnect: true,
        transports: ['websocket', 'polling'],
        auth: token ? { token } : {}
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

  return { socket, connected };
};
