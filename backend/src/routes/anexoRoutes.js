import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getAnexosByAnimal, uploadAnexo, deleteAnexo, downloadAnexo } from '../controllers/anexoController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();
const uploadsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');
const anexosDirectory = path.join(uploadsRoot, 'anexos');
fs.mkdirSync(anexosDirectory, { recursive: true });

// Configuração do Multer para armazenamento local
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, anexosDirectory);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extensionByMime = {
      'application/pdf': '.pdf',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp'
    };
    cb(null, uniqueSuffix + extensionByMime[file.mimetype]);
  }
});

const allowedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      const error = new Error('Envie um PDF ou uma imagem JPG, PNG ou WebP.');
      error.status = 400;
      return cb(error);
    }
    cb(null, true);
  }
});

router.use(authMiddleware);

router.get('/animal/:animalId', getAnexosByAnimal);
router.get('/download/:id', downloadAnexo);
router.post('/upload', upload.single('arquivo'), uploadAnexo);
router.delete('/:id', deleteAnexo);

export default router;
