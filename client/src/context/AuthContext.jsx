import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/http';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('auction_token'));
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('auction_token')));

  const persistSession = (nextToken, nextUser) => {
    localStorage.setItem('auction_token', nextToken);
    setToken(nextToken);
    setUser(nextUser);
  };

  const clearSession = () => {
    localStorage.removeItem('auction_token');
    setToken(null);
    setUser(null);
  };

  const registerCaptain = async (payload) => {
    const { data } = await api.post('/auth/captains/register', payload);
    persistSession(data.token, { ...data.user, role: 'captain' });
    return data;
  };

  const loginCaptain = async (payload) => {
    const { data } = await api.post('/auth/captains/login', payload);
    persistSession(data.token, { ...data.user, role: 'captain' });
    return data;
  };

  const loginAdmin = async (payload) => {
    const { data } = await api.post('/auth/admin/login', payload);
    persistSession(data.token, data.user);
    return data;
  };

  const refreshUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get('/auth/me');
      const role = data.user.role || 'captain';
      setUser({ ...data.user, role });
    } catch (error) {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        registerCaptain,
        loginCaptain,
        loginAdmin,
        refreshUser,
        logout: clearSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
