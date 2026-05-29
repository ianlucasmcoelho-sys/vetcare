import express from 'express';
import multer from 'multer';
import path from 'path';
import { getAnexosByAnimal, uploadAnexo, deleteAnexo, downloadAnexo } from '../controllers/anexoController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Configuração do Multer para armazenamento local
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/anexos');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.use(authMiddleware);

router.get('/animal/:animalId', getAnexosByAnimal);
router.get('/download/:id', downloadAnexo);
router.post('/upload', upload.single('arquivo'), uploadAnexo);
router.delete('/:id', deleteAnexo);

export default router;
