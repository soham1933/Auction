import bcrypt from 'bcryptjs';
import { getPrisma } from '../config/prisma.js';
import { signToken } from '../middleware/auth.js';

const adminEmail = process.env.ADMIN_EMAIL || 'admin@auction.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'supersecurepassword';

const sanitizeCaptain = (captain) => ({
  id: captain.id,
  name: captain.name,
  budget: captain.budget,
  totalSpent: captain.totalSpent,
  players: captain.players || []
});

export const registerCaptain = async (req, res) => {
  const { name, password } = req.body;

  if (!name?.trim() || !password?.trim()) {
    return res.status(400).json({ message: 'Name and password are required' });
  }

  const prisma = getPrisma();
  const existingCaptain = await prisma.captain.findUnique({
    where: { name: name.trim() }
  });

  if (existingCaptain) {
    return res.status(400).json({ message: 'Captain name already exists' });
  }

  const hashedPassword = await bcrypt.hash(password.trim(), 10);

  const captain = await prisma.captain.create({
    data: {
      name: name.trim(),
      password: hashedPassword
    },
    include: { players: true }
  });

  const token = signToken({ id: captain.id, role: 'captain' });

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

  const prisma = getPrisma();
  const captain = await prisma.captain.findUnique({
    where: { name: name.trim() },
    include: { players: true }
  });

  if (!captain) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isValid = await bcrypt.compare(password, captain.password);

  if (!isValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = signToken({ id: captain.id, role: 'captain' });

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

  const prisma = getPrisma();
  const captain = await prisma.captain.findUnique({
    where: { id: req.user.id },
    include: { players: true }
  });

  if (!captain) {
    return res.status(404).json({ message: 'Captain not found' });
  }

  return res.json({
    user: sanitizeCaptain(captain)
  });
};
