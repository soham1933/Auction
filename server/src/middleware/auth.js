import jwt from 'jsonwebtoken';
import Captain from '../models/Captain.js';

const jwtSecret = process.env.JWT_SECRET || 'local-dev-jwt-secret-change-me';

const getTokenFromHeader = (authorization = '') => {
  if (!authorization.startsWith('Bearer ')) {
    return null;
  }

  return authorization.split(' ')[1];
};

export const signToken = (payload) =>
  jwt.sign(payload, jwtSecret, {
    expiresIn: '7d'
  });

export const requireAuth = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, jwtSecret);

    if (decoded.role === 'admin') {
      req.user = decoded;
      return next();
    }

    const captain = await Captain.findById(decoded.id).populate('players');

    if (!captain) {
      return res.status(401).json({ message: 'Captain not found' });
    }

    req.user = {
      id: captain._id.toString(),
      name: captain.name,
      role: 'captain',
      budget: captain.budget,
      totalSpent: captain.totalSpent,
      players: captain.players
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  next();
};

export const getSocketUser = async (token) => {
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (decoded.role === 'admin') {
      return decoded;
    }

    const captain = await Captain.findById(decoded.id);

    if (!captain) {
      return null;
    }

    return {
      id: captain._id.toString(),
      name: captain.name,
      role: 'captain',
      budget: captain.budget,
      totalSpent: captain.totalSpent
    };
  } catch (error) {
    return null;
  }
};
