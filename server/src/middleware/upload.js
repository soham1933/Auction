import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.join(__dirname, '../../uploads');
const captainUploads = path.join(uploadsRoot, 'captain-images');
const playerUploads = path.join(uploadsRoot, 'player-images');

fs.mkdirSync(captainUploads, { recursive: true });
fs.mkdirSync(playerUploads, { recursive: true });

const createUpload = (uploadPath) => multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadPath),
    filename: (_req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '-');
      cb(null, `${Date.now()}-${safeName}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    cb(null, allowedTypes.includes(file.mimetype));
  }
});

export const uploadCaptainAvatar = createUpload(captainUploads);
export const uploadPlayerAvatar = createUpload(playerUploads);
