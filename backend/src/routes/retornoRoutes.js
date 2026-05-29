// backend/src/routes/retornoRoutes.js
import express from 'express';
import {
  getAllRetornos,
  getRetornoById,
  getRetornosByPet,
  getRetornosByStatus,
  getRetornosByPeriodo,
  createRetorno,
  updateRetorno,
  updateRetornoStatus,
  deleteRetorno
} from '../controllers/retornoController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

// Rotas de retornos
router.get('/', getAllRetornos);
router.get('/:id', getRetornoById);
router.get('/pet/:petNome', getRetornosByPet);
router.get('/status/:status', getRetornosByStatus);
router.get('/periodo/search', getRetornosByPeriodo);
router.post('/', createRetorno);
router.put('/:id', updateRetorno);
router.patch('/:id/status', updateRetornoStatus);
router.delete('/:id', deleteRetorno);

export default router;