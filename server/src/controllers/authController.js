import Captain from '../models/Captain.js';
import { signToken } from '../middleware/auth.js';

const adminEmail = process.env.ADMIN_EMAIL || 'admin@auction.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'supersecurepassword';

const sanitizeCaptain = (captain) => ({
  id: captain._id,
  name: captain.name,
  budget: captain.budget,
  totalSpent: captain.totalSpent,
  players: captain.players
});

export const registerCaptain = async (req, res) => {
  const { name, password } = req.body;

  if (!name?.trim() || !password?.trim()) {
    return res.status(400).json({ message: 'Name and password are required' });
  }

  const existingCaptain = await Captain.findOne({ name: name.trim() });

  if (existingCaptain) {
    return res.status(400).json({ message: 'Captain name already exists' });
  }

  const captain = await Captain.create({ name: name.trim(), password: password.trim() });
  const token = signToken({ id: captain._id, role: 'captain' });

  return res.status(201).json({
    token,
    user: sanitizeCaptain(captain)
  });
};

export const loginCaptain = async (req, res) => {
  const { name, password } = req.body;

  if (!name?.trim() || !password?.trim()) {
    return res.status(400).json({ message: 'Name and password are required' });
  }

  const captain = await Captain.findOne({ name: name.trim() }).populate('players');

  if (!captain) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isValid = await captain.comparePassword(password);

  if (!isValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = signToken({ id: captain._id, role: 'captain' });

  return res.json({
    token,
    user: sanitizeCaptain(captain)
  });
};

export const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password?.trim()) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  if (email.trim() !== adminEmail || password.trim() !== adminPassword) {
    return res.status(401).json({ message: 'Invalid admin credentials' });
  }

  const token = signToken({
    id: 'admin',
    role: 'admin',
    name: 'Auction Admin',
    email: email.trim()
  });

  return res.json({
    token,
    user: {
      id: 'admin',
      name: 'Auction Admin',
      role: 'admin',
      email: email.trim()
    }
  });
};

export const getCurrentUser = async (req, res) => {
  if (req.user.role === 'admin') {
    return res.json({ user: req.user });
  }

  const captain = await Captain.findById(req.user.id).populate('players');

  if (!captain) {
    return res.status(404).json({ message: 'Captain not found' });
  }

  return res.json({
    user: sanitizeCaptain(captain)
  });
};
