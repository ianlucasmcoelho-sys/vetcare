// backend/src/routes/receituarioRoutes.js
import express from 'express';
import {
  getAllReceitas,
  getReceitaById,
  getReceitasByAnimal,
  getReceitasByTutor,
  getReceitasByPeriodo,
  getReceitasStats,
  createReceita,
  updateReceita,
  deleteReceita
} from '../controllers/receituarioController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', getAllReceitas);
router.get('/stats', getReceitasStats);
router.get('/animal/:animalId', getReceitasByAnimal);
router.get('/tutor/:tutorId', getReceitasByTutor);
router.get('/periodo', getReceitasByPeriodo);
router.get('/:id', getReceitaById);
router.post('/', createReceita);
router.put('/:id', updateReceita);
router.delete('/:id', deleteReceita);

export default router;